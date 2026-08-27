import React, { useState, useMemo } from 'react';
import { 
  PersonSimpleWalk, 
  Drop, 
  Flame, 
  ShieldCheck, 
  ShieldWarning, 
  BatteryCharging, 
  BatteryHigh, 
  BatteryLow, 
  BatteryWarning, 
  Clock, 
  Warning, 
  Waves,
  Stairs,
  HouseLine
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import DetailsRightDrawer from '../DetailsRightDrawer';
import { groupEntitiesByFloorAndArea } from '../../../lib/grouping';
import DynamicPhosphorIcon from '../../ui/DynamicPhosphorIcon';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { isMotionSensor, isLeakSensor, isSmokeSensor } from '../../../lib/entityClassifiers';

interface SensorsOverviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  motionSensors: ResolvedEntity[];
  leakSensors: ResolvedEntity[];
  smokeSensors: ResolvedEntity[];
  initialTab?: 'all' | 'motion' | 'leak' | 'smoke';
  darkMode?: boolean;
}

export default function SensorsOverviewDrawer({
  isOpen,
  onClose,
  motionSensors,
  leakSensors,
  smokeSensors,
  initialTab = 'all',
  darkMode = true
}: SensorsOverviewDrawerProps) {
  const customFloors = useAutoLayoutStore(s => s.floors);
  const customAreas = useAutoLayoutStore(s => s.areas);
  const [activeTab, setActiveTab] = useState<'all' | 'motion' | 'leak' | 'smoke'>(initialTab);

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const { allSensors, activeMotion, activeLeaks, activeSmoke, totalAlerts, grouped } = useMemo(() => {
    if (!isOpen) {
      return {
        allSensors: [],
        activeMotion: [],
        activeLeaks: [],
        activeSmoke: [],
        totalAlerts: 0,
        grouped: { hasFloors: false, hasAreas: false, groups: [], totalEntities: 0 }
      };
    }
    const all = [...motionSensors, ...leakSensors, ...smokeSensors];
    const aM = motionSensors.filter(m => m.state === 'on');
    const aL = leakSensors.filter(l => l.state === 'on' || l.state === 'wet' || l.state === 'detected');
    const aS = smokeSensors.filter(s => s.state === 'on' || s.state === 'detected' || s.state === 'smoke');
    const currentDisplayList = 
      activeTab === 'motion' ? motionSensors :
      activeTab === 'leak' ? leakSensors :
      activeTab === 'smoke' ? smokeSensors :
      all;

    return {
      allSensors: all,
      activeMotion: aM,
      activeLeaks: aL,
      activeSmoke: aS,
      totalAlerts: aL.length + aS.length,
      grouped: groupEntitiesByFloorAndArea(currentDisplayList, customFloors, customAreas)
    };
  }, [isOpen, motionSensors, leakSensors, smokeSensors, activeTab, customFloors, customAreas]);


  return (
    <DetailsRightDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Security & Hazard Sensors"
      subtitle={`${totalAlerts > 0 ? `${totalAlerts} Alert(s)` : 'All systems clear'} • ${allSensors.length} sensors active`}
      icon={<ShieldCheck size={22} weight="duotone" className="text-emerald-500" />}
      darkMode={darkMode}
    >
      <div className="space-y-6">
        {/* Status Summary Banner */}
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
            totalAlerts > 0
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-800 dark:text-rose-300 shadow-lg shadow-rose-500/10'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {totalAlerts > 0 ? (
              <ShieldWarning size={28} weight="duotone" className="text-rose-500 shrink-0 animate-bounce" />
            ) : (
              <ShieldCheck size={28} weight="duotone" className="text-emerald-500 shrink-0" />
            )}
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {totalAlerts > 0 ? `${totalAlerts} Hazard Alert Detected!` : 'Environmental & Presence Normal'}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300">
                {totalAlerts > 0
                  ? `${activeLeaks.length} Water Leak • ${activeSmoke.length} Smoke/Fire Hazard`
                  : `${activeMotion.length} motion zones active • ${allSensors.length} telemetry sensors`}
              </div>
            </div>
          </div>
        </div>

        {/* 1. HIGHLIGHTED ACTIVE DETECTIONS & LIVE ALERTS SECTION (Motion, Leaks, Smoke) */}
        {(activeLeaks.length > 0 || activeSmoke.length > 0 || activeMotion.length > 0) && (
          <div className={`space-y-3 p-4 rounded-3xl border shadow-xs ${
            activeLeaks.length > 0 || activeSmoke.length > 0
              ? 'bg-rose-500/10 dark:bg-rose-500/10 border-rose-500/30'
              : 'bg-amber-500/10 dark:bg-amber-500/10 border-amber-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full animate-ping ${
                  activeLeaks.length > 0 || activeSmoke.length > 0 ? 'bg-rose-500' : 'bg-amber-500'
                }`} />
                <h3 className={`text-xs font-black uppercase tracking-wider ${
                  activeLeaks.length > 0 || activeSmoke.length > 0
                    ? 'text-rose-800 dark:text-rose-300'
                    : 'text-amber-800 dark:text-amber-300'
                }`}>
                  Live Detections & Alerts ({activeLeaks.length + activeSmoke.length + activeMotion.length})
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                Real-Time
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Leaks first */}
              {activeLeaks.map((sensor) => (
                <div
                  key={`act_leak_${sensor.entity_id}`}
                  className="p-3 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-rose-500/40 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0">
                      <Drop size={20} weight="duotone" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{sensor.name}</h4>
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold truncate">
                        {sensor.area?.name || 'Water Hazard Detected'}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-extrabold uppercase border border-rose-500/30 shrink-0 animate-pulse">
                    LEAK ALERT
                  </span>
                </div>
              ))}

              {/* Smoke second */}
              {activeSmoke.map((sensor) => (
                <div
                  key={`act_smoke_${sensor.entity_id}`}
                  className="p-3 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-rose-500/40 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0">
                      <Flame size={20} weight="duotone" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{sensor.name}</h4>
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold truncate">
                        {sensor.area?.name || 'Smoke Detected'}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-extrabold uppercase border border-rose-500/30 shrink-0 animate-pulse">
                    SMOKE ALERT
                  </span>
                </div>
              ))}

              {/* Motion third */}
              {activeMotion.map((sensor) => (
                <div
                  key={`act_motion_${sensor.entity_id}`}
                  className="p-3 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-amber-500/40 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
                      <PersonSimpleWalk size={20} weight="duotone" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{sensor.name}</h4>
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold truncate">
                        {sensor.area?.name || sensor.device?.name || 'Motion Detected'}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold uppercase border border-amber-500/30 shrink-0">
                    MOTION
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
            All ({allSensors.length})
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('motion')}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer truncate flex items-center justify-center gap-1 ${
              activeTab === 'motion'
                ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <PersonSimpleWalk size={14} weight="duotone" />
            <span>Motion ({motionSensors.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leak')}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer truncate flex items-center justify-center gap-1 ${
              activeTab === 'leak'
                ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Drop size={14} weight="duotone" />
            <span>Leak ({leakSensors.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('smoke')}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer truncate flex items-center justify-center gap-1 ${
              activeTab === 'smoke'
                ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Flame size={14} weight="duotone" />
            <span>Smoke/Fire ({smokeSensors.length})</span>
          </button>
        </div>

        {/* Grouped Sensors: Floor -> Area -> Entity */}
        <div className="space-y-6">
          {grouped.groups.map((floorGroup) => (
            <div key={floorGroup.floorId || 'no-floor'} className="space-y-4">
              
              {/* Floor Header */}
              {grouped.hasFloors && (
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-white/10">
                  <div 
                    className="w-7 h-7 rounded-xl flex items-center justify-center border shadow-2xs shrink-0"
                    style={{
                      backgroundColor: `${floorGroup.color || '#10b981'}1a`,
                      borderColor: `${floorGroup.color || '#10b981'}40`,
                      color: floorGroup.color || '#10b981'
                    }}
                  >
                    <DynamicPhosphorIcon 
                      name={floorGroup.icon} 
                      fallback={Stairs} 
                      size={15} 
                      weight="duotone" 
                      style={{ color: floorGroup.color || '#10b981' }}
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
                              backgroundColor: `${areaGroup.color || '#10b981'}1a`,
                              borderColor: `${areaGroup.color || '#10b981'}40`,
                              color: areaGroup.color || '#10b981'
                            }}
                          >
                            <DynamicPhosphorIcon 
                              name={areaGroup.icon} 
                              fallback={HouseLine} 
                              size={12} 
                              weight="duotone" 
                              style={{ color: areaGroup.color || '#10b981' }}
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
                          {areaGroup.entities.length} sensor{areaGroup.entities.length === 1 ? '' : 's'}
                        </span>
                      </div>
                    )}

                    {/* Sensor List */}
                    <div className="space-y-2.5">
                      {areaGroup.entities.map((sensor) => {
                        const devClass = sensor.attributes?.device_class || '';
                        const isMotion = isMotionSensor(sensor);
                        const isLeak = isLeakSensor(sensor);
                        const isSmoke = isSmokeSensor(sensor);

                        const isAlert = isLeak || isSmoke ? (sensor.state === 'on' || sensor.state === 'wet' || sensor.state === 'detected') : false;
                        const isActiveMotion = isMotion && sensor.state === 'on';

                        const battery = sensor.batteryPct ?? (
                          typeof sensor.attributes?.battery === 'number' 
                            ? sensor.attributes.battery 
                            : typeof sensor.attributes?.battery_level === 'number' 
                              ? sensor.attributes.battery_level 
                              : undefined
                        );

                        return (
                          <div
                            key={sensor.entity_id}
                            className={`p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-4 ${
                              isAlert
                                ? 'bg-rose-500/15 border-rose-500/40 shadow-xs shadow-rose-500/10'
                                : isActiveMotion
                                  ? 'bg-amber-500/10 border-amber-500/30'
                                  : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                                  isAlert
                                    ? 'bg-rose-500/25 border border-rose-500/50 text-rose-500 animate-pulse'
                                    : isActiveMotion
                                      ? 'bg-amber-500/20 border border-amber-500/40 text-amber-500'
                                      : 'bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/15 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {isSmoke ? (
                                  <Flame size={20} weight="duotone" />
                                ) : isLeak ? (
                                  <Drop size={20} weight="duotone" />
                                ) : (
                                  <PersonSimpleWalk size={20} weight="duotone" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{sensor.name}</h4>

                                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                  <span className="capitalize">{devClass || (isMotion ? 'Motion' : isLeak ? 'Moisture' : 'Smoke')}</span>
                                  {battery !== undefined && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                                        {battery <= 20 ? (
                                          <BatteryWarning size={14} weight="duotone" className="text-rose-500" />
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
                                  isAlert
                                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/40 animate-pulse'
                                    : isActiveMotion
                                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40'
                                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                }`}
                              >
                                {isAlert ? 'HAZARD DETECTED' : isActiveMotion ? 'MOTION DETECTED' : isLeak ? 'DRY' : isSmoke ? 'SAFE' : 'CLEAR'}
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
