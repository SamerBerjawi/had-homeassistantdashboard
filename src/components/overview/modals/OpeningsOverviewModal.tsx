import React, { useState, useMemo } from 'react';
import { 
  Door, 
  DoorOpen, 
  ShieldCheck, 
  ShieldWarning, 
  BatteryCharging, 
  BatteryHigh, 
  BatteryLow, 
  BatteryWarning, 
  Clock, 
  FrameCorners, 
  SquaresFour, 
  Lock, 
  LockOpen, 
  Archive, 
  Stack,
  Stairs,
  HouseLine
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import DetailsRightDrawer from '../DetailsRightDrawer';
import { groupEntitiesByFloorAndArea } from '../../../lib/grouping';
import DynamicPhosphorIcon from '../../ui/DynamicPhosphorIcon';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';

interface OpeningsOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  doorSensors: ResolvedEntity[];
  windowSensors: ResolvedEntity[];
  otherContactSensors?: ResolvedEntity[];
  initialTab?: 'all' | 'doors' | 'windows' | 'other';
  darkMode?: boolean;
}

export default function OpeningsOverviewModal({
  isOpen,
  onClose,
  doorSensors,
  windowSensors,
  otherContactSensors = [],
  initialTab = 'all',
  darkMode = true
}: OpeningsOverviewModalProps) {
  const customFloors = useAutoLayoutStore(s => s.floors);
  const customAreas = useAutoLayoutStore(s => s.areas);
  const [activeTab, setActiveTab] = useState<'all' | 'doors' | 'windows' | 'other'>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const { openDoors, openWindows, openOthers, totalOpen, totalSensors, grouped } = useMemo(() => {
    if (!isOpen) {
      return {
        openDoors: [],
        openWindows: [],
        openOthers: [],
        totalOpen: 0,
        totalSensors: 0,
        grouped: { hasFloors: false, hasAreas: false, groups: [], totalEntities: 0 }
      };
    }
    const oD = doorSensors.filter(d => d.state === 'on');
    const oW = windowSensors.filter(w => w.state === 'on');
    const oO = otherContactSensors.filter(o => o.state === 'on');
    const displayed = [
      ...(activeTab === 'all' || activeTab === 'doors' ? doorSensors : []),
      ...(activeTab === 'all' || activeTab === 'windows' ? windowSensors : []),
      ...(activeTab === 'all' || activeTab === 'other' ? otherContactSensors : [])
    ];
    return {
      openDoors: oD,
      openWindows: oW,
      openOthers: oO,
      totalOpen: oD.length + oW.length + oO.length,
      totalSensors: doorSensors.length + windowSensors.length + otherContactSensors.length,
      grouped: groupEntitiesByFloorAndArea(displayed, customFloors, customAreas)
    };
  }, [isOpen, doorSensors, windowSensors, otherContactSensors, activeTab, customFloors, customAreas]);


  const getSensorIcon = (sensor: ResolvedEntity, isOpen: boolean) => {
    const devClass = sensor.attributes?.device_class;
    const eid = sensor.entity_id.toLowerCase();

    if (devClass === 'door' || devClass === 'garage_door' || eid.includes('door') || eid.includes('garage') || eid.includes('gate')) {
      return isOpen 
        ? <DoorOpen size={22} weight="duotone" className="text-amber-500" /> 
        : <Door size={22} weight="duotone" className="text-emerald-500" />;
    }
    if (devClass === 'window' || eid.includes('window')) {
      return <FrameCorners size={22} weight="duotone" className={isOpen ? 'text-amber-500' : 'text-emerald-500'} />;
    }
    if (devClass === 'lock' || eid.includes('lock')) {
      return isOpen
        ? <LockOpen size={22} weight="duotone" className="text-amber-500" />
        : <Lock size={22} weight="duotone" className="text-emerald-500" />;
    }
    if (eid.includes('safe') || eid.includes('cabinet') || eid.includes('mailbox')) {
      return <Archive size={22} weight="duotone" className={isOpen ? 'text-amber-500' : 'text-emerald-500'} />;
    }
    return <Stack size={22} weight="duotone" className={isOpen ? 'text-amber-500' : 'text-emerald-500'} />;
  };

  return (
    <DetailsRightDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Contact Sensors & Perimeter Openings"
      subtitle={`${totalOpen} opening${totalOpen === 1 ? '' : 's'} unsealed • ${totalSensors} total monitored sensors`}
      icon={totalOpen > 0 
        ? <ShieldWarning size={22} weight="duotone" className="text-amber-500" /> 
        : <ShieldCheck size={22} weight="duotone" className="text-emerald-500" />
      }
      darkMode={darkMode}
    >
      <div className="space-y-6">
        {/* Status Summary Banner */}
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
            totalOpen > 0
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {totalOpen > 0 ? (
              <ShieldWarning size={28} weight="duotone" className="text-amber-500 shrink-0 animate-pulse" />
            ) : (
              <ShieldCheck size={28} weight="duotone" className="text-emerald-500 shrink-0" />
            )}
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {totalOpen > 0 ? `${totalOpen} Monitored Opening${totalOpen === 1 ? '' : 's'} Open` : 'All Contact Sensors Sealed & Closed'}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300">
                {totalOpen > 0
                  ? `${openDoors.length} Door(s) • ${openWindows.length} Window(s)${openOthers.length > 0 ? ` • ${openOthers.length} Other(s)` : ''}`
                  : 'Perimeter envelope is fully secure'}
              </div>
            </div>
          </div>
        </div>

        {/* 1. HIGHLIGHTED CURRENTLY OPEN SENSORS (Shown at top if any are open) */}
        {totalOpen > 0 && (
          <div className="space-y-3 p-4 rounded-3xl bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/30 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Currently Open ({totalOpen})
                </h3>
              </div>
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                Action Required
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {[...openDoors, ...openWindows, ...openOthers].map((sensor) => (
                <div
                  key={`open_${sensor.entity_id}`}
                  className="p-3 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-amber-500/40 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
                      {getSensorIcon(sensor, true)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{sensor.name}</h4>
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold truncate">
                        {sensor.area?.name || sensor.device?.name || 'Open'}
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold uppercase border border-amber-500/30 shrink-0">
                    OPEN
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer truncate ${
              activeTab === 'all'
                ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            All ({totalSensors})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('doors')}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer truncate flex items-center justify-center gap-1 ${
              activeTab === 'doors'
                ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Door size={14} weight="duotone" />
            <span>Doors ({doorSensors.length}) {openDoors.length > 0 && `• ${openDoors.length}`}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('windows')}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer truncate flex items-center justify-center gap-1 ${
              activeTab === 'windows'
                ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FrameCorners size={14} weight="duotone" />
            <span>Windows ({windowSensors.length}) {openWindows.length > 0 && `• ${openWindows.length}`}</span>
          </button>
          {otherContactSensors.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('other')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer truncate flex items-center justify-center gap-1 ${
                activeTab === 'other'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Archive size={14} weight="duotone" />
              <span>Other ({otherContactSensors.length}) {openOthers.length > 0 && `• ${openOthers.length}`}</span>
            </button>
          )}
        </div>

        {/* Grouped Openings: Floor -> Area -> Entity */}
        <div className="space-y-6">
          {grouped.groups.map((floorGroup) => (
            <div key={floorGroup.floorId || 'no-floor'} className="space-y-4">
              
              {/* Floor Header */}
              {grouped.hasFloors && (
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-white/10">
                  <div 
                    className="w-7 h-7 rounded-xl flex items-center justify-center border shadow-2xs shrink-0"
                    style={{
                      backgroundColor: `${floorGroup.color || '#f59e0b'}1a`,
                      borderColor: `${floorGroup.color || '#f59e0b'}40`,
                      color: floorGroup.color || '#f59e0b'
                    }}
                  >
                    <DynamicPhosphorIcon 
                      name={floorGroup.icon} 
                      fallback={Stairs} 
                      size={15} 
                      weight="duotone" 
                      style={{ color: floorGroup.color || '#f59e0b' }}
                    />
                  </div>
                  <h4 
                    className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200"
                    style={{ color: floorGroup.color || undefined }}
                  >
                    {floorGroup.floorName}
                  </h4>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                    ({floorGroup.areaGroups.reduce((acc, a) => acc + a.entities.length, 0)})
                  </span>
                </div>
              )}

              {/* Area Groups */}
              <div className="space-y-4">
                {floorGroup.areaGroups.map((areaGroup) => (
                  <div key={areaGroup.areaId || 'no-area'} className="space-y-2.5">
                    
                    {/* Area Header */}
                    {(grouped.hasAreas || grouped.hasFloors) && (
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-5 h-5 rounded-lg flex items-center justify-center border shrink-0"
                            style={{
                              backgroundColor: `${areaGroup.color || '#f59e0b'}1a`,
                              borderColor: `${areaGroup.color || '#f59e0b'}40`,
                              color: areaGroup.color || '#f59e0b'
                            }}
                          >
                            <DynamicPhosphorIcon 
                              name={areaGroup.icon} 
                              fallback={HouseLine} 
                              size={12} 
                              weight="duotone" 
                              style={{ color: areaGroup.color || '#f59e0b' }}
                            />
                          </div>
                          <span 
                            className="text-xs font-bold text-slate-700 dark:text-slate-300"
                            style={{ color: areaGroup.color || undefined }}
                          >
                            {areaGroup.areaName}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                          {areaGroup.entities.filter(e => e.state === 'on').length}/{areaGroup.entities.length} open
                        </span>
                      </div>
                    )}

                    {/* Sensor List */}
                    <div className="space-y-2.5">
                      {areaGroup.entities.map((sensor) => {
                        const isOpen = sensor.state === 'on';
                        const battery = sensor.batteryPct ?? (
                          typeof sensor.attributes?.battery === 'number' 
                            ? sensor.attributes.battery 
                            : typeof sensor.attributes?.battery_level === 'number' 
                              ? sensor.attributes.battery_level 
                              : undefined
                        );
                        const devClass = sensor.attributes?.device_class || 'contact';

                        return (
                          <div
                            key={sensor.entity_id}
                            className={`p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-4 ${
                              isOpen
                                ? 'bg-amber-500/10 border-amber-500/30 shadow-xs'
                                : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                                  isOpen
                                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-500 animate-pulse'
                                    : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-500'
                                }`}
                              >
                                {getSensorIcon(sensor, isOpen)}
                              </div>

                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{sensor.name}</h4>

                                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                  <span className="capitalize">{devClass}</span>
                                  {battery !== undefined && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                                        {battery <= 20 ? (
                                          <BatteryWarning size={14} weight="duotone" className="text-rose-500" />
                                        ) : battery >= 80 ? (
                                          <BatteryCharging size={14} weight="duotone" className="text-emerald-500" />
                                        ) : (
                                          <BatteryHigh size={14} weight="duotone" className="text-slate-400" />
                                        )}
                                        {Math.round(battery)}%
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Single State Badge on the right (No duplicated text) */}
                            <div className="shrink-0 flex items-center">
                              <span
                                className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                                  isOpen
                                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 animate-pulse'
                                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                }`}
                              >
                                {isOpen ? 'OPEN' : 'CLOSED'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>
      </div>
    </DetailsRightDrawer>
  );
}
