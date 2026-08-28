/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
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
import { classifyBinarySensors } from '../../lib/entityClassifiers';
import { ResolvedEntity } from '../../types';

import SecurityBadgesBar, { SecurityFilterTab } from './security/SecurityBadgesBar';
import AlarmPanelSection from './security/AlarmPanelSection';
import FloorAreaSensorsSection from './security/FloorAreaSensorsSection';
import CameraFeedSection from './security/CameraFeedSection';
import AlarmKeypadModal from '../overview/modals/AlarmKeypadModal';

interface SecurityViewProps {
  darkMode?: boolean;
}

export default function SecurityView({ darkMode = true }: SecurityViewProps) {
  const { 
    domainGroups, 
    selectedAlarmEntityId, 
    updateEntityState,
    resolvedFloors,
    resolvedAreas
  } = useAutoLayoutStore(
    useShallow((s) => ({
      domainGroups: s.domainGroups,
      selectedAlarmEntityId: s.selectedAlarmEntityId,
      updateEntityState: s.updateEntityState,
      resolvedFloors: s.resolvedFloors,
      resolvedAreas: s.resolvedAreas
    }))
  );

  const [activeFilter, setActiveFilter] = useState<SecurityFilterTab>('all');
  const [isKeypadModalOpen, setIsKeypadModalOpen] = useState<boolean>(false);

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
    const cameras: ResolvedEntity[] = domainGroups['camera'] || [];
    const users: ResolvedEntity[] = [...(domainGroups['person'] || []), ...(domainGroups['device_tracker'] || [])];

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
      cameraEntities: cameras,
      userEntities: users,
      doorSensors: doors,
      windowSensors: windows,
      motionSensors: motions,
      leakSensors: leaks,
      smokeSensors: smokes,
      openDoors: doors.filter((d) => d.state === 'on'),
      openWindows: windows.filter((w) => w.state === 'on')
    };
  }, [domainGroups, selectedAlarmEntityId]);

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
              initialCategory="all"
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
          initialCategory={activeFilter}
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
