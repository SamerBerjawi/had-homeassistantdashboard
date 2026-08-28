/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  LockOpen, 
  Door, 
  DoorOpen, 
  PersonSimpleWalk, 
  Drop, 
  Flame, 
  BatteryCharging, 
  BatteryHigh, 
  BatteryLow, 
  BatteryWarning, 
  MagnifyingGlass, 
  CheckCircle,
  WarningCircle,
  SlidersHorizontal,
  ArrowsClockwise
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';

interface SensorsSectionProps {
  darkMode?: boolean;
  lockEntities: ResolvedEntity[];
  doorSensors: ResolvedEntity[];
  windowSensors: ResolvedEntity[];
  motionSensors: ResolvedEntity[];
  leakSensors: ResolvedEntity[];
  smokeSensors: ResolvedEntity[];
  initialCategory?: 'all' | 'openings' | 'locks' | 'motion' | 'hazards';
}

export default function SensorsSection({
  darkMode = true,
  lockEntities,
  doorSensors,
  windowSensors,
  motionSensors,
  leakSensors,
  smokeSensors,
  initialCategory = 'all'
}: SensorsSectionProps) {
  const [activeCategory, setActiveCategory] = useState<'all' | 'openings' | 'locks' | 'motion' | 'hazards'>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingLockId, setTogglingLockId] = useState<string | null>(null);

  const callHAService = useAutoLayoutStore(s => s.callHAService);
  const updateEntityState = useAutoLayoutStore(s => s.updateEntityState);

  // Filter lists
  const openingsList = [...doorSensors, ...windowSensors];
  const unlockedLocks = lockEntities.filter(l => l.state === 'unlocked' || l.state === 'open');

  const handleToggleLock = async (lock: ResolvedEntity) => {
    const isCurrentlyLocked = lock.state === 'locked';
    const nextService = isCurrentlyLocked ? 'unlock' : 'lock';
    const nextState = isCurrentlyLocked ? 'unlocked' : 'locked';

    setTogglingLockId(lock.entity_id);
    try {
      await callHAService('lock', nextService, {}, { entity_id: lock.entity_id });
      updateEntityState(lock.entity_id, nextState, {
        changed_by: 'User Quick Action',
        last_changed: 'Just now'
      });
    } catch (e) {
      console.error('Failed to toggle lock:', e);
    } finally {
      setTimeout(() => setTogglingLockId(null), 400);
    }
  };

  const handleLockAll = async () => {
    unlockedLocks.forEach(async (l) => {
      try {
        await callHAService('lock', 'lock', {}, { entity_id: l.entity_id });
        updateEntityState(l.entity_id, 'locked', {
          changed_by: 'Lock All Perimeter Action',
          last_changed: 'Just now'
        });
      } catch (e) {
        console.error('Failed to lock all:', e);
      }
    });
  };

  const renderBatteryIcon = (battery?: number) => {
    if (battery === undefined || battery === null) return null;
    if (battery <= 20) return <BatteryLow size={14} className="text-rose-400" />;
    if (battery <= 40) return <BatteryWarning size={14} className="text-amber-400" />;
    return <BatteryHigh size={14} className="text-emerald-400" />;
  };

  return (
    <section className="w-full flex flex-col space-y-4">
      {/* Section Header with Category Tabs & Batch Lock */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <Lock size={18} weight="duotone" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight">Perimeter Sensors & Smart Locks</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time contact status, deadbolt locks, motion triggers, and hazard alarms
            </p>
          </div>
        </div>

        {/* Lock All Exterior Button if any unlocked */}
        {unlockedLocks.length > 0 && (
          <button
            type="button"
            onClick={handleLockAll}
            className="px-3.5 py-1.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
          >
            <Lock size={15} weight="bold" />
            <span>Lock All ({unlockedLocks.length})</span>
          </button>
        )}
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Category Pill Tabs */}
        <div className={`flex flex-wrap items-center p-1 rounded-2xl border backdrop-blur-md ${
          darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
        }`}>
          {[
            { id: 'all', label: 'All Sensors' },
            { id: 'locks', label: `Locks (${lockEntities.length})` },
            { id: 'openings', label: `Openings (${openingsList.length})` },
            { id: 'motion', label: `Motion (${motionSensors.length})` },
            { id: 'hazards', label: `Safety (${leakSensors.length + smokeSensors.length})` }
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? darkMode
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                    : 'bg-emerald-600 text-white shadow-xs'
                  : darkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className={`relative flex items-center px-3 py-1.5 rounded-2xl border text-xs ${
          darkMode ? 'bg-black/60 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <MagnifyingGlass size={15} className="text-slate-400 mr-2" />
          <input
            type="text"
            placeholder="Search sensor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none text-xs w-28 sm:w-40"
          />
        </div>
      </div>

      {/* Grid of Sensor Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
        
        {/* 1. SMART LOCK CARDS */}
        {(activeCategory === 'all' || activeCategory === 'locks') &&
          lockEntities
            .filter(l => (l.name || l.entity_id).toLowerCase().includes(searchQuery.toLowerCase()))
            .map((lock) => {
              const isLocked = lock.state === 'locked';
              const isToggling = togglingLockId === lock.entity_id;
              const battery = lock.attributes?.battery_level || lock.attributes?.battery;

              return (
                <div
                  key={lock.entity_id}
                  className={`p-4 rounded-3xl backdrop-blur-xl border transition-all duration-300 flex flex-col justify-between ${
                    isLocked
                      ? darkMode
                        ? 'bg-black/60 border-emerald-500/30 text-white'
                        : 'bg-white/80 border-emerald-200 text-slate-900 shadow-sm'
                      : darkMode
                        ? 'bg-amber-500/10 border-amber-500/40 text-white'
                        : 'bg-amber-50/80 border-amber-300 text-slate-900 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${
                      isLocked
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    }`}>
                      {isLocked ? <Lock size={20} weight="duotone" /> : <LockOpen size={20} weight="duotone" />}
                    </div>

                    <div className="flex items-center gap-2">
                      {battery !== undefined && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                          {renderBatteryIcon(battery)}
                          <span>{battery}%</span>
                        </span>
                      )}

                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                        isLocked
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                      }`}>
                        {isLocked ? 'Locked' : 'Unlocked'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 mb-4">
                    <h4 className="text-sm font-bold tracking-tight">{lock.name || lock.entity_id}</h4>
                    <p className="text-xs text-slate-400">
                      {lock.attributes?.changed_by || 'Auto-Secured'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleLock(lock)}
                    disabled={isToggling}
                    className={`w-full py-2 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 ${
                      isLocked
                        ? darkMode
                          ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                          : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                        : 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20'
                    }`}
                  >
                    {isToggling ? (
                      <ArrowsClockwise size={15} className="animate-spin text-amber-500" />
                    ) : isLocked ? (
                      <LockOpen size={15} weight="bold" />
                    ) : (
                      <Lock size={15} weight="bold" />
                    )}
                    <span>{isToggling ? 'Updating...' : isLocked ? 'Unlock Door' : 'Lock Securely'}</span>
                  </button>
                </div>
              );
            })}

        {/* 2. DOORS & WINDOWS (CONTACT SENSORS) */}
        {(activeCategory === 'all' || activeCategory === 'openings') &&
          openingsList
            .filter(e => (e.name || e.entity_id).toLowerCase().includes(searchQuery.toLowerCase()))
            .map((sensor) => {
              const isOpen = sensor.state === 'on';
              const isDoor = sensor.attributes?.device_class === 'door' || sensor.entity_id.includes('door');
              const battery = sensor.attributes?.battery;

              return (
                <div
                  key={sensor.entity_id}
                  className={`p-4 rounded-3xl backdrop-blur-xl border transition-all duration-300 flex flex-col justify-between ${
                    isOpen
                      ? darkMode
                        ? 'bg-rose-500/10 border-rose-500/40 text-white'
                        : 'bg-rose-50/80 border-rose-300 text-slate-900 shadow-sm'
                      : darkMode
                        ? 'bg-black/60 border-white/10 text-white'
                        : 'bg-white/80 border-slate-200 text-slate-900 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${
                      isOpen
                        ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                        : 'bg-white/10 border-white/15 text-slate-400'
                    }`}>
                      {isDoor ? (
                        isOpen ? <DoorOpen size={20} weight="duotone" /> : <Door size={20} weight="duotone" />
                      ) : (
                        <CheckCircle size={20} weight="duotone" />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {battery !== undefined && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                          {renderBatteryIcon(battery)}
                          <span>{battery}%</span>
                        </span>
                      )}

                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                        isOpen
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25 animate-pulse'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                      }`}>
                        {isOpen ? 'Open' : 'Closed'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-bold tracking-tight">{sensor.name || sensor.entity_id}</h4>
                    <p className="text-xs text-slate-400">
                      {isOpen ? 'Perimeter Open' : `Last opened: ${sensor.attributes?.last_opened || 'Yesterday'}`}
                    </p>
                  </div>
                </div>
              );
            })}

        {/* 3. MOTION & OCCUPANCY DETECTORS */}
        {(activeCategory === 'all' || activeCategory === 'motion') &&
          motionSensors
            .filter(m => (m.name || m.entity_id).toLowerCase().includes(searchQuery.toLowerCase()))
            .map((motion) => {
              const isActive = motion.state === 'on';
              const battery = motion.attributes?.battery;

              return (
                <div
                  key={motion.entity_id}
                  className={`p-4 rounded-3xl backdrop-blur-xl border transition-all duration-300 flex flex-col justify-between ${
                    isActive
                      ? darkMode
                        ? 'bg-amber-500/10 border-amber-500/40 text-white'
                        : 'bg-amber-50/80 border-amber-300 text-slate-900 shadow-sm'
                      : darkMode
                        ? 'bg-black/60 border-white/10 text-white'
                        : 'bg-white/80 border-slate-200 text-slate-900 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${
                      isActive
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 animate-bounce'
                        : 'bg-white/10 border-white/15 text-slate-400'
                    }`}>
                      <PersonSimpleWalk size={20} weight="duotone" />
                    </div>

                    <div className="flex items-center gap-2">
                      {battery !== undefined && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                          {renderBatteryIcon(battery)}
                          <span>{battery}%</span>
                        </span>
                      )}

                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                        isActive
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25 animate-pulse'
                          : 'bg-white/10 text-slate-400 border border-white/10'
                      }`}>
                        {isActive ? 'Motion Active' : 'Clear'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-bold tracking-tight">{motion.name || motion.entity_id}</h4>
                    <p className="text-xs text-slate-400">
                      {isActive ? 'Movement in zone' : `Triggered: ${motion.attributes?.last_triggered || 'Idle'}`}
                    </p>
                  </div>
                </div>
              );
            })}

        {/* 4. HAZARD & ENVIRONMENTAL DETECTORS (SMOKE & WATER LEAKS) */}
        {(activeCategory === 'all' || activeCategory === 'hazards') &&
          [...smokeSensors, ...leakSensors]
            .filter(h => (h.name || h.entity_id).toLowerCase().includes(searchQuery.toLowerCase()))
            .map((hazard) => {
              const isAlert = hazard.state === 'on' || hazard.state === 'detected' || hazard.state === 'wet';
              const isSmoke = hazard.attributes?.device_class === 'smoke' || hazard.entity_id.includes('smoke');
              const battery = hazard.attributes?.battery;

              return (
                <div
                  key={hazard.entity_id}
                  className={`p-4 rounded-3xl backdrop-blur-xl border transition-all duration-300 flex flex-col justify-between ${
                    isAlert
                      ? darkMode
                        ? 'bg-rose-500/20 border-rose-500/50 text-white animate-pulse'
                        : 'bg-rose-100 border-rose-400 text-slate-900 animate-pulse'
                      : darkMode
                        ? 'bg-black/60 border-white/10 text-white'
                        : 'bg-white/80 border-slate-200 text-slate-900 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${
                      isAlert
                        ? 'bg-rose-500/25 border-rose-500/40 text-rose-400'
                        : 'bg-white/10 border-white/15 text-slate-400'
                    }`}>
                      {isSmoke ? (
                        <Flame size={20} weight="duotone" className={isAlert ? 'text-rose-500' : 'text-slate-400'} />
                      ) : (
                        <Drop size={20} weight="duotone" className={isAlert ? 'text-cyan-400' : 'text-slate-400'} />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {battery !== undefined && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                          {renderBatteryIcon(battery)}
                          <span>{battery}%</span>
                        </span>
                      )}

                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                        isAlert
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                      }`}>
                        {isAlert ? 'Alert Active' : 'Normal'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-bold tracking-tight">{hazard.name || hazard.entity_id}</h4>
                    <p className="text-xs text-slate-400">
                      {isAlert
                        ? isSmoke ? 'Smoke detected in area!' : 'Water moisture detected!'
                        : 'Safety self-test passed'}
                    </p>
                  </div>
                </div>
              );
            })}
      </div>
    </section>
  );
}
