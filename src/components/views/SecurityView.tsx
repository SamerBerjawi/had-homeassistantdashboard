/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { 
  ShieldCheck, 
  Lock, 
  Door, 
  PersonSimpleWalk, 
  VideoCamera, 
  Drop, 
  Flame, 
  Warning,
  Rows,
  Columns
} from '@phosphor-icons/react';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { classifyBinarySensors, isSurveillanceCamera } from '../../lib/entityClassifiers';
import { ResolvedEntity } from '../../types';
import { haWebSocketService } from '../../services/haWebSocket';
import { fetchGo2RtcStreams, detectGo2RtcRtspStreams } from '../../services/go2rtcService';

import SecurityBadgesBar, { SecurityFilterTab } from './security/SecurityBadgesBar';
import AlarmPanelSection from './security/AlarmPanelSection';
import FloorAreaSensorsSection from './security/FloorAreaSensorsSection';
import CameraFeedSection from './security/CameraFeedSection';
import AlarmKeypadModal from '../overview/modals/AlarmKeypadModal';
import ViewEmptyState from '../ui/ViewEmptyState';
import ViewLoadingState from '../ui/ViewLoadingState';

interface SecurityViewProps {
  darkMode?: boolean;
}

export default function SecurityView({ darkMode = true }: SecurityViewProps) {
  const isLoading = useAutoLayoutStore((s) => s.isLoading);
  const { 
    domainGroups, 
    selectedAlarmEntityId, 
    updateEntityState,
    resolvedFloors,
    resolvedAreas,
    serverUrl
  } = useAutoLayoutStore(
    useShallow((s) => ({
      domainGroups: s.domainGroups,
      selectedAlarmEntityId: s.selectedAlarmEntityId,
      updateEntityState: s.updateEntityState,
      resolvedFloors: s.resolvedFloors,
      resolvedAreas: s.resolvedAreas,
      serverUrl: s.serverUrl
    }))
  );

  const [activeFilter, setActiveFilter] = useState<SecurityFilterTab>('all');
  const [isKeypadModalOpen, setIsKeypadModalOpen] = useState<boolean>(false);
  const [webRtcCapabilities, setWebRtcCapabilities] = useState<Record<string, boolean>>({});
  const [go2RtcCameras, setGo2RtcCameras] = useState<ResolvedEntity[]>([]);

  // Filter raw cameras to only real surveillance cameras (excluding vacuum floor maps)
  const rawCameras: ResolvedEntity[] = useMemo(() => {
    const all = domainGroups['camera'] || [];
    return all.filter(isSurveillanceCamera);
  }, [domainGroups]);

  // Query go2rtc directly for any configured RTSP streams that lack an explicit HA camera entity
  useEffect(() => {
    let isCancelled = false;

    async function queryGo2Rtc() {
      try {
        const streams = await fetchGo2RtcStreams(serverUrl);
        if (!isCancelled) {
          if (streams && Object.keys(streams).length > 0) {
            const detected = detectGo2RtcRtspStreams(streams, rawCameras, serverUrl);
            setGo2RtcCameras(detected);
          }
        }
      } catch (err) {
        console.warn('[SecurityView] Failed to query go2rtc streams:', err);
      }
    }

    queryGo2Rtc();
    const timer = setInterval(queryGo2Rtc, 20000);

    const handleUpdate = () => queryGo2Rtc();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleUpdate);
      window.addEventListener('go2rtc_updated', handleUpdate);
    }

    return () => {
      isCancelled = true;
      clearInterval(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleUpdate);
        window.removeEventListener('go2rtc_updated', handleUpdate);
      }
    };
  }, [serverUrl, rawCameras]);

  // Strictly limit live surveillance feed cameras to cameras defined in go2rtc
  const allCameras: ResolvedEntity[] = useMemo(() => {
    if (go2RtcCameras.length > 0) {
      return go2RtcCameras;
    }
    // Fallback if go2rtc is offline or during initial boot: only return cameras that are explicitly go2rtc
    return rawCameras.filter(c => c.attributes?.stream_source === 'go2rtc' || c.entity_id.startsWith('go2rtc.'));
  }, [rawCameras, go2RtcCameras]);

  // Query camera capabilities via HA WebSocket signaling (camera/capabilities)
  useEffect(() => {
    if (haWebSocketService.isDemo() || haWebSocketService.getStatus() !== 'connected') {
      return;
    }

    allCameras.forEach((cam) => {
      if (webRtcCapabilities[cam.entity_id] !== undefined) return;

      // go2rtc detected streams are always WebRTC capable
      if (cam.attributes?.stream_source === 'go2rtc' || cam.entity_id.startsWith('go2rtc.')) {
        setWebRtcCapabilities(prev => ({ ...prev, [cam.entity_id]: true }));
        return;
      }

      haWebSocketService.sendRequest<{ frontend_stream_types?: string[] }>('camera/capabilities', {
        entity_id: cam.entity_id
      })
        .then((res) => {
          const supportsWebRtc = Array.isArray(res?.frontend_stream_types) && res.frontend_stream_types.includes('web_rtc');
          setWebRtcCapabilities(prev => ({ ...prev, [cam.entity_id]: supportsWebRtc }));
        })
        .catch(() => {
          const supportsWebRtc =
            cam.attributes?.frontend_stream_types?.includes('web_rtc') ||
            cam.attributes?.stream_type === 'webrtc' ||
            (cam as any).platform === 'go2rtc';
          setWebRtcCapabilities(prev => ({ ...prev, [cam.entity_id]: !!supportsWebRtc }));
        });
    });
  }, [allCameras, webRtcCapabilities]);

  // Classify all sensors, locks, cameras, and alarms
  const {
    alarmEntities,
    activeAlarm,
    lockEntities,
    cameraEntities,
    userEntities,
    doorSensors,
    windowSensors,
    motionSensors,
    leakSensors,
    smokeSensors,
    openDoors,
    openWindows
  } = useMemo(() => {
    const allBinary: ResolvedEntity[] = domainGroups['binary_sensor'] || [];
    const alarms: ResolvedEntity[] = domainGroups['alarm_control_panel'] || [];
    const locks: ResolvedEntity[] = domainGroups['lock'] || [];
    const users: ResolvedEntity[] = [...(domainGroups['person'] || []), ...(domainGroups['device_tracker'] || [])];

    // Include all detected and configured cameras (HA cameras + go2rtc streams)
    const cameraList = allCameras;

    const {
      doorSensors: doors,
      windowSensors: windows,
      motionSensors: motions,
      leakSensors: leaks,
      smokeSensors: smokes
    } = classifyBinarySensors(allBinary);

    const activeAlarmEntity =
      alarms.find((a) => a.entity_id === selectedAlarmEntityId) || alarms[0];

    return {
      alarmEntities: alarms,
      activeAlarm: activeAlarmEntity,
      lockEntities: locks,
      cameraEntities: cameraList,
      userEntities: users,
      doorSensors: doors,
      windowSensors: windows,
      motionSensors: motions,
      leakSensors: leaks,
      smokeSensors: smokes,
      openDoors: doors.filter((d) => d.state === 'on'),
      openWindows: windows.filter((w) => w.state === 'on')
    };
  }, [domainGroups, selectedAlarmEntityId, allCameras, webRtcCapabilities]);

  const totalSecurityEntities = 
    alarmEntities.length + 
    lockEntities.length + 
    cameraEntities.length + 
    doorSensors.length + 
    windowSensors.length + 
    motionSensors.length + 
    leakSensors.length + 
    smokeSensors.length;

  if (isLoading) {
    return <ViewLoadingState title="Loading Security & Protection..." subtitle="Connecting to alarm panels, cameras, perimeter locks, and sensors" darkMode={darkMode} />;
  }

  if (totalSecurityEntities === 0) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center">
        <ViewEmptyState
          icon={ShieldCheck}
          title="No Security Devices Configured"
          badgeText="Security & Protection"
          description="Connect alarm panels, smart door locks, security cameras, contact sensors, motion detectors, and leak alarms in Home Assistant."
          configPath="Settings → Devices & Services → Add Integration"
          darkMode={darkMode}
        />
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col space-y-6 pb-12">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP GLANCEABLE SECURITY STATUS BADGES                      */}
      {/* ------------------------------------------------------------- */}
      <SecurityBadgesBar
        darkMode={darkMode}
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
        alarmEntity={activeAlarm}
        lockEntities={lockEntities}
        doorSensors={doorSensors}
        windowSensors={windowSensors}
        motionSensors={motionSensors}
        leakSensors={leakSensors}
        smokeSensors={smokeSensors}
        cameraEntities={cameraEntities}
        userEntities={userEntities}
        onOpenKeypadModal={() => setIsKeypadModalOpen(true)}
      />

      {/* ------------------------------------------------------------- */}
      {/* 2. DYNAMIC LAYOUT: 2 COLUMNS ON DESKTOP (CAMERAS 1 COLUMN)   */}
      {/* ------------------------------------------------------------- */}
      {activeFilter === 'all' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          
          {/* LEFT 2-COLUMN SIDE (7 COLS): ALARM PANEL + SENSORS BY FLOOR & AREA */}
          <div className="lg:col-span-7 flex flex-col space-y-6">
            {/* Alarm Control Panel */}
            <AlarmPanelSection
              darkMode={darkMode}
              alarmEntities={alarmEntities}
              openDoors={openDoors}
              openWindows={openWindows}
            />

            {/* Perimeter & Sensors by Floor and Area */}
            <FloorAreaSensorsSection
              darkMode={darkMode}
              lockEntities={lockEntities}
              doorSensors={doorSensors}
              windowSensors={windowSensors}
              motionSensors={motionSensors}
              leakSensors={leakSensors}
              smokeSensors={smokeSensors}
              resolvedFloors={resolvedFloors}
              resolvedAreas={resolvedAreas}
              activeCategory="all"
              onSelectCategory={(cat) => setActiveFilter(cat)}
            />
          </div>

          {/* RIGHT 2-COLUMN SIDE (5 COLS): CAMERAS IN 1 COLUMN */}
          <div className="lg:col-span-5 flex flex-col space-y-6 sticky top-2">
            <CameraFeedSection
              darkMode={darkMode}
              cameraEntities={cameraEntities}
              columns={1}
            />
          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. FOCUSED FILTER VIEWS                                       */}
      {/* ------------------------------------------------------------- */}

      {/* Alarm Only View */}
      {activeFilter === 'alarm' && (
        <div className="w-full max-w-4xl mx-auto">
          <AlarmPanelSection
            darkMode={darkMode}
            alarmEntities={alarmEntities}
            openDoors={openDoors}
            openWindows={openWindows}
          />
        </div>
      )}

      {/* Sensors / Locks / Openings / Hazards View by Floor & Area */}
      {(activeFilter === 'locks' ||
        activeFilter === 'openings' ||
        activeFilter === 'motion' ||
        activeFilter === 'hazards') && (
        <FloorAreaSensorsSection
          darkMode={darkMode}
          lockEntities={lockEntities}
          doorSensors={doorSensors}
          windowSensors={windowSensors}
          motionSensors={motionSensors}
          leakSensors={leakSensors}
          smokeSensors={smokeSensors}
          resolvedFloors={resolvedFloors}
          resolvedAreas={resolvedAreas}
          activeCategory={activeFilter}
          onSelectCategory={(cat) => setActiveFilter(cat)}
        />
      )}

      {/* Camera Grid View (4 Columns on Desktop) */}
      {activeFilter === 'cameras' && (
        <CameraFeedSection
          darkMode={darkMode}
          cameraEntities={cameraEntities}
          columns={4}
        />
      )}

      {/* Modal Keypad Slide-Over */}
      <AlarmKeypadModal
        isOpen={isKeypadModalOpen}
        onClose={() => setIsKeypadModalOpen(false)}
        alarmEntity={activeAlarm}
        onUpdateEntity={updateEntityState}
        darkMode={darkMode}
      />
    </div>
  );
}
