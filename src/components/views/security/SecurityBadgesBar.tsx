/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ShieldCheck, 
  ShieldWarning, 
  Lock, 
  LockOpen, 
  Door, 
  DoorOpen, 
  PersonSimpleWalk, 
  Drop, 
  Flame, 
  VideoCamera, 
  CheckCircle,
  WarningCircle
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import PersonAvatar from '../../ui/PersonAvatar';

export type SecurityFilterTab = 'all' | 'alarm' | 'openings' | 'locks' | 'motion' | 'hazards' | 'cameras';

interface SecurityBadgesBarProps {
  darkMode?: boolean;
  activeFilter: SecurityFilterTab;
  onSelectFilter: (filter: SecurityFilterTab) => void;
  alarmEntity?: ResolvedEntity;
  lockEntities: ResolvedEntity[];
  doorSensors: ResolvedEntity[];
  windowSensors: ResolvedEntity[];
  motionSensors: ResolvedEntity[];
  leakSensors: ResolvedEntity[];
  smokeSensors: ResolvedEntity[];
  cameraEntities: ResolvedEntity[];
  userEntities: ResolvedEntity[];
  onOpenKeypadModal?: () => void;
}

export default function SecurityBadgesBar({
  darkMode = true,
  activeFilter,
  onSelectFilter,
  alarmEntity,
  lockEntities,
  doorSensors,
  windowSensors,
  motionSensors,
  leakSensors,
  smokeSensors,
  cameraEntities,
  userEntities,
  onOpenKeypadModal
}: SecurityBadgesBarProps) {
  // Compute counts & states
  const openDoors = doorSensors.filter(d => d.state === 'on');
  const openWindows = windowSensors.filter(w => w.state === 'on');
  const totalOpenings = openDoors.length + openWindows.length;

  const unlockedLocks = lockEntities.filter(l => l.state === 'unlocked' || l.state === 'open');
  const totalLocks = lockEntities.length;

  const activeMotion = motionSensors.filter(m => m.state === 'on');
  const activeLeaks = leakSensors.filter(l => l.state === 'on' || l.state === 'wet' || l.state === 'detected');
  const activeSmoke = smokeSensors.filter(s => s.state === 'on' || s.state === 'detected' || s.state === 'smoke');
  const totalHazards = activeLeaks.length + activeSmoke.length;

  const alarmState = alarmEntity?.state || 'disarmed';
  const isAlarmTriggered = alarmState === 'triggered';

  const getAlarmBadgeConfig = () => {
    if (isAlarmTriggered) {
      return {
        label: 'ALARM TRIGGERED',
        icon: WarningCircle,
        bg: darkMode ? 'bg-rose-500/20 text-rose-300 border-rose-500/50' : 'bg-rose-100 text-rose-800 border-rose-400',
        dot: 'bg-rose-500 animate-ping'
      };
    }
    if (alarmState === 'armed_away') {
      return {
        label: 'Armed (Away)',
        icon: ShieldCheck,
        bg: darkMode ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35' : 'bg-emerald-50 text-emerald-800 border-emerald-300',
        dot: 'bg-emerald-400'
      };
    }
    if (alarmState === 'armed_home') {
      return {
        label: 'Armed (Home)',
        icon: ShieldCheck,
        bg: darkMode ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35' : 'bg-emerald-50 text-emerald-800 border-emerald-300',
        dot: 'bg-emerald-400'
      };
    }
    if (alarmState === 'armed_night') {
      return {
        label: 'Armed (Night)',
        icon: ShieldCheck,
        bg: darkMode ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/35' : 'bg-indigo-50 text-indigo-800 border-indigo-300',
        dot: 'bg-indigo-400'
      };
    }
    return {
      label: 'Alarm Disarmed',
      icon: ShieldWarning,
      bg: darkMode ? 'bg-white/5 text-slate-300 border-white/10' : 'bg-slate-100 text-slate-700 border-slate-200',
      dot: 'bg-amber-400'
    };
  };

  const alarmBadge = getAlarmBadgeConfig();
  const AlarmIcon = alarmBadge.icon;

  return (
    <div className="w-full flex flex-wrap items-center gap-2 pb-1">
      {/* 1. ALARM STATUS BADGE */}
      <button
        type="button"
        onClick={() => {
          onSelectFilter('alarm');
          onOpenKeypadModal?.();
        }}
        className={`h-9 px-3.5 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-2 shadow-xs ${
          alarmBadge.bg
        } ${activeFilter === 'alarm' ? 'ring-2 ring-emerald-400/50' : ''}`}
        title={`Alarm Status: ${alarmBadge.label} (Click for Keypad)`}
      >
        <AlarmIcon size={16} weight="duotone" className="shrink-0" />
        <span>{alarmBadge.label}</span>
        <span className={`w-2 h-2 rounded-full shrink-0 ${alarmBadge.dot}`} />
      </button>

      {/* 2. PERIMETER LOCKS BADGE */}
      <button
        type="button"
        onClick={() => onSelectFilter(activeFilter === 'locks' ? 'all' : 'locks')}
        className={`h-9 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs ${
          unlockedLocks.length > 0
            ? darkMode
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/35'
              : 'bg-amber-50 text-amber-800 border-amber-300'
            : darkMode
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
        } ${activeFilter === 'locks' ? 'ring-2 ring-amber-400/50' : ''}`}
        title={unlockedLocks.length > 0 ? `${unlockedLocks.length} locks unlocked` : 'All perimeter locks secure'}
      >
        {unlockedLocks.length > 0 ? (
          <LockOpen size={16} weight="duotone" className="text-amber-400 shrink-0" />
        ) : (
          <Lock size={16} weight="duotone" className="text-emerald-400 shrink-0" />
        )}
        <span>
          {unlockedLocks.length > 0
            ? `${unlockedLocks.length} Unlocked`
            : `${totalLocks || 3} Locks Secure`}
        </span>
      </button>

      {/* 3. DOORS & WINDOWS (OPENINGS) BADGE */}
      <button
        type="button"
        onClick={() => onSelectFilter(activeFilter === 'openings' ? 'all' : 'openings')}
        className={`h-9 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs ${
          totalOpenings > 0
            ? darkMode
              ? 'bg-rose-500/15 text-rose-300 border-rose-500/35'
              : 'bg-rose-50 text-rose-800 border-rose-300'
            : darkMode
              ? 'bg-white/5 text-slate-300 border-white/10'
              : 'bg-slate-100 text-slate-700 border-slate-200'
        } ${activeFilter === 'openings' ? 'ring-2 ring-rose-400/50' : ''}`}
        title={totalOpenings > 0 ? `${openDoors.length} doors, ${openWindows.length} windows open` : 'All perimeter openings closed'}
      >
        {totalOpenings > 0 ? (
          <DoorOpen size={16} weight="duotone" className="text-rose-400 shrink-0" />
        ) : (
          <Door size={16} weight="duotone" className="text-slate-400 shrink-0" />
        )}
        <span>{totalOpenings > 0 ? `${totalOpenings} Openings Open` : 'Perimeter Closed'}</span>
      </button>

      {/* 4. MOTION & OCCUPANCY BADGE */}
      <button
        type="button"
        onClick={() => onSelectFilter(activeFilter === 'motion' ? 'all' : 'motion')}
        className={`h-9 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs ${
          activeMotion.length > 0
            ? darkMode
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/35'
              : 'bg-amber-50 text-amber-800 border-amber-300'
            : darkMode
              ? 'bg-white/5 text-slate-300 border-white/10'
              : 'bg-slate-100 text-slate-700 border-slate-200'
        } ${activeFilter === 'motion' ? 'ring-2 ring-amber-400/50' : ''}`}
        title={activeMotion.length > 0 ? `${activeMotion.length} motion zones active` : 'No active motion detected'}
      >
        <PersonSimpleWalk
          size={16}
          weight="duotone"
          className={activeMotion.length > 0 ? 'text-amber-400 shrink-0 animate-bounce' : 'text-slate-400 shrink-0'}
        />
        <span>{activeMotion.length > 0 ? `${activeMotion.length} Motion Active` : 'Motion Clear'}</span>
      </button>

      {/* 5. HAZARD & ENVIRONMENTAL SAFETY BADGE */}
      <button
        type="button"
        onClick={() => onSelectFilter(activeFilter === 'hazards' ? 'all' : 'hazards')}
        className={`h-9 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs ${
          totalHazards > 0
            ? darkMode
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
              : 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
            : darkMode
              ? 'bg-white/5 text-slate-300 border-white/10'
              : 'bg-slate-100 text-slate-700 border-slate-200'
        } ${activeFilter === 'hazards' ? 'ring-2 ring-rose-400/50' : ''}`}
        title={totalHazards > 0 ? 'Hazard Alert Detected' : 'All smoke and water leak detectors normal'}
      >
        {activeSmoke.length > 0 ? (
          <Flame size={16} weight="duotone" className="text-rose-500 shrink-0" />
        ) : activeLeaks.length > 0 ? (
          <Drop size={16} weight="duotone" className="text-cyan-400 shrink-0" />
        ) : (
          <CheckCircle size={16} weight="duotone" className="text-emerald-400 shrink-0" />
        )}
        <span>
          {activeSmoke.length > 0
            ? 'Smoke Detected!'
            : activeLeaks.length > 0
              ? 'Water Leak Detected!'
              : 'Safety Clear'}
        </span>
      </button>

      {/* 6. SURVEILLANCE CAMERAS BADGE */}
      <button
        type="button"
        onClick={() => onSelectFilter(activeFilter === 'cameras' ? 'all' : 'cameras')}
        className={`h-9 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs ${
          darkMode
            ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35'
            : 'bg-cyan-50 text-cyan-800 border-cyan-300'
        } ${activeFilter === 'cameras' ? 'ring-2 ring-cyan-400/50' : ''}`}
        title="Live Surveillance Streams"
      >
        <VideoCamera size={16} weight="duotone" className="text-cyan-400 shrink-0" />
        <span>{cameraEntities.length || 4} Cameras</span>
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping shrink-0" />
      </button>

      {/* 7. FAMILY PRESENCE BADGES */}
      {userEntities.slice(0, 3).map((user) => {
        const isHome = user.state === 'home';
        const firstName = user.name.split(' ')[0];

        return (
          <div
            key={user.entity_id}
            className={`h-9 pl-0.5 pr-2.5 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-xs select-none ${
              isHome
                ? darkMode
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : darkMode
                  ? 'bg-white/5 text-slate-400 border-white/10 opacity-75'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
            title={`${user.name}: ${isHome ? 'At Home' : user.state}`}
          >
            <PersonAvatar
              name={user.name}
              entity_picture={user.attributes?.entity_picture}
              state={user.state}
              isHome={isHome}
              size="sm"
              showPresenceDot={false}
              className="w-7 h-7 shrink-0"
            />
            <span>{firstName}</span>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isHome ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          </div>
        );
      })}
    </div>
  );
}
