/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Security Command Center
 * High-density glassmorphic layout with instant alarm status, perimeter controls,
 * camera feeds, and granular floor/area sensor monitoring.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { 
  ShieldCheck, 
  Lock, 
  Door, 
  PersonSimpleWalk, 
  VideoCamera, 
  Flame, 
  SquaresFour,
  Warning
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
import AdaptiveSectionTabs, { SectionTabItem } from '../common/AdaptiveSectionTabs';

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

  // Filter raw cameras to only real surveillance cameras (excluding hidden & disabled)
  const rawCameras: ResolvedEntity[] = useMemo(() => {
    const all = domainGroups['camera'] || [];
    return all.filter((c) => isSurveillanceCamera(c) && !c.hidden && !c.disabled_by);
  }, [domainGroups]);

  // Query go2rtc directly for configured RTSP streams
  useEffect(() => {
    let isCancelled = false;

    async function queryGo2Rtc() {
      try {
        const streams = await fetchGo2RtcStreams(serverUrl);
        if (!isCancelled && streams && Object.keys(streams).length > 0) {
          const detected = detectGo2RtcRtspStreams(streams, rawCameras, serverUrl);
          setGo2RtcCameras(detected);
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

  const allCameras: ResolvedEntity[] = useMemo(() => {
    if (go2RtcCameras.length > 0) return go2RtcCameras;
    return rawCameras.filter(
      (c) => c.attributes?.stream_source === 'go2rtc' || c.entity_id.startsWith('go2rtc.')
    );
  }, [rawCameras, go2RtcCameras]);

  // Query camera capabilities via WebSocket
  useEffect(() => {
    if (haWebSocketService.isDemo() || haWebSocketService.getStatus() !== 'connected') {
      return;
    }

    allCameras.forEach((cam) => {
      if (webRtcCapabilities[cam.entity_id] !== undefined) return;

      if (cam.attributes?.stream_source === 'go2rtc' || cam.entity_id.startsWith('go2rtc.')) {
        setWebRtcCapabilities((prev) => ({ ...prev, [cam.entity_id]: true }));
        return;
      }

      haWebSocketService
        .sendRequest<{ frontend_stream_types?: string[] }>('camera/capabilities', {
          entity_id: cam.entity_id
        })
        .then((res) => {
          const supportsWebRtc =
            Array.isArray(res?.frontend_stream_types) && res.frontend_stream_types.includes('web_rtc');
          setWebRtcCapabilities((prev) => ({ ...prev, [cam.entity_id]: supportsWebRtc }));
        })
        .catch(() => {
          const supportsWebRtc =
            cam.attributes?.frontend_stream_types?.includes('web_rtc') ||
            cam.attributes?.stream_type === 'webrtc' ||
            (cam as any).platform === 'go2rtc';
          setWebRtcCapabilities((prev) => ({ ...prev, [cam.entity_id]: !!supportsWebRtc }));
        });
    });
  }, [allCameras, webRtcCapabilities]);

  // Classify all security domain entities
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
    const isVisible = (e: ResolvedEntity) => !e.hidden && !e.disabled_by;
    const allBinary: ResolvedEntity[] = (domainGroups['binary_sensor'] || []).filter(isVisible);
    const alarms: ResolvedEntity[] = (domainGroups['alarm_control_panel'] || []).filter(isVisible);
    const locks: ResolvedEntity[] = (domainGroups['lock'] || []).filter(isVisible);
    const users: ResolvedEntity[] = [
      ...(domainGroups['person'] || []),
      ...(domainGroups['device_tracker'] || [])
    ].filter(isVisible);

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
      cameraEntities: allCameras,
      userEntities: users,
      doorSensors: doors,
      windowSensors: windows,
      motionSensors: motions,
      leakSensors: leaks,
      smokeSensors: smokes,
      openDoors: doors.filter((d) => d.state === 'on'),
      openWindows: windows.filter((w) => w.state === 'on')
    };
  }, [domainGroups, selectedAlarmEntityId, allCameras]);

  const totalSecurityEntities =
    alarmEntities.length +
    lockEntities.length +
    cameraEntities.length +
    doorSensors.length +
    windowSensors.length +
    motionSensors.length +
    leakSensors.length +
    smokeSensors.length;

  const securityTabs: SectionTabItem[] = useMemo(() => {
    const openCount = openDoors.length + openWindows.length;
    const unlockedCount = lockEntities.filter((l) => l.state === 'unlocked' || l.state === 'open').length;
    const motionCount = motionSensors.filter((m) => m.state === 'on').length;
    const hazardCount = [...leakSensors, ...smokeSensors].filter(
      (h) => h.state === 'on' || h.state === 'detected' || h.state === 'wet'
    ).length;

    return [
      { id: 'all', label: 'All Security', icon: SquaresFour },
      ...(alarmEntities.length > 0 ? [{ id: 'alarm', label: 'Alarm', icon: ShieldCheck }] : []),
      ...(lockEntities.length > 0
        ? [
            {
              id: 'locks',
              label: 'Locks',
              icon: Lock,
              badge: unlockedCount > 0 ? `${unlockedCount} unlocked` : undefined,
              badgeColor: unlockedCount > 0 ? 'bg-amber-500/20 text-amber-300 font-bold' : undefined
            }
          ]
        : []),
      ...(doorSensors.length > 0 || windowSensors.length > 0
        ? [
            {
              id: 'openings',
              label: 'Openings',
              icon: Door,
              badge: openCount > 0 ? `${openCount} open` : undefined,
              badgeColor: openCount > 0 ? 'bg-amber-500/20 text-amber-300 font-bold' : undefined
            }
          ]
        : []),
      ...(motionSensors.length > 0
        ? [
            {
              id: 'motion',
              label: 'Motion',
              icon: PersonSimpleWalk,
              badge: motionCount > 0 ? `${motionCount}` : undefined,
              badgeColor: motionCount > 0 ? 'bg-emerald-500/20 text-emerald-300 font-bold' : undefined
            }
          ]
        : []),
      ...(leakSensors.length > 0 || smokeSensors.length > 0
        ? [
            {
              id: 'hazards',
              label: 'Hazards',
              icon: Flame,
              badge: hazardCount > 0 ? `${hazardCount}` : undefined,
              badgeColor: hazardCount > 0 ? 'bg-rose-500/25 text-rose-300 font-bold animate-pulse' : undefined
            }
          ]
        : []),
      ...(cameraEntities.length > 0
        ? [
            {
              id: 'cameras',
              label: 'Cameras',
              icon: VideoCamera,
              badge: cameraEntities.length
            }
          ]
        : [])
    ];
  }, [alarmEntities, lockEntities, doorSensors, windowSensors, motionSensors, leakSensors, smokeSensors, cameraEntities, openDoors, openWindows]);

  if (isLoading) {
    return (
      <ViewLoadingState
        title="Loading Security..."
        subtitle="Connecting to alarms, cameras, locks, and sensors"
        darkMode={darkMode}
      />
    );
  }

  if (totalSecurityEntities === 0) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center pb-24 md:pb-8">
        <ViewEmptyState
          icon={ShieldCheck}
          title="No Security Devices Configured"
          badgeText="Security Center"
          description="Connect alarm panels, smart door locks, security cameras, contact sensors, motion detectors, and leak alarms in Home Assistant."
          configPath="Settings → Devices & Services → Add Integration"
          darkMode={darkMode}
        />
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col gap-6 animate-fadeIn pb-24 md:pb-8">
      {/* Top Floating Filter Bar */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-1 sm:static sm:mx-0 sm:px-0 sm:py-0 backdrop-blur-md">
        <AdaptiveSectionTabs
          tabs={securityTabs}
          activeTab={activeFilter}
          onChange={(tab) => setActiveFilter(tab as SecurityFilterTab)}
          darkMode={darkMode}
        />
      </div>

      {/* Glanceable Security Status Bar */}
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

      {/* 1. ALL VIEW: 2-Column Responsive Layout */}
      {activeFilter === 'all' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): Alarm Panel + Floor/Area Sensor Breakdown */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <AlarmPanelSection
              darkMode={darkMode}
              alarmEntities={alarmEntities}
              openDoors={openDoors}
              openWindows={openWindows}
            />

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

          {/* Right Column (5 cols): Camera Feeds */}
          <div className="lg:col-span-5 flex flex-col gap-6 sticky top-4">
            <CameraFeedSection
              darkMode={darkMode}
              cameraEntities={cameraEntities}
              columns={1}
            />
          </div>
        </div>
      )}

      {/* 2. ALARM ONLY VIEW */}
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

      {/* 3. SENSORS / LOCKS / OPENINGS / HAZARDS VIEW */}
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

      {/* 4. CAMERAS ONLY VIEW */}
      {activeFilter === 'cameras' && (
        <CameraFeedSection
          darkMode={darkMode}
          cameraEntities={cameraEntities}
          columns={3}
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
