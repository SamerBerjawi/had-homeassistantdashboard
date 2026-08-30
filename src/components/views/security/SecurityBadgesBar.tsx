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
        bg: darkMode ? 'bg-rose-500/20 text-rose-300 border-rose-500/50' : 'bg-rose-500/15 text-rose-800 border-rose-500/35',
        dot: 'bg-rose-500 animate-ping'
      };
    }
    if (alarmState === 'armed_away') {
      return {
        label: 'Armed (Away)',
        icon: ShieldCheck,
        bg: darkMode ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35' : 'bg-emerald-500/10 text-emerald-800 border-emerald-500/30',
        dot: 'bg-emerald-400'
      };
    }
    if (alarmState === 'armed_home') {
      return {
        label: 'Armed (Home)',
        icon: ShieldCheck,
        bg: darkMode ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35' : 'bg-emerald-500/10 text-emerald-800 border-emerald-500/30',
        dot: 'bg-emerald-400'
      };
    }
    if (alarmState === 'armed_night') {
      return {
        label: 'Armed (Night)',
        icon: ShieldCheck,
        bg: darkMode ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/35' : 'bg-indigo-500/10 text-indigo-800 border-indigo-500/30',
        dot: 'bg-indigo-400'
      };
    }
    return {
      label: 'Alarm Disarmed',
      icon: ShieldWarning,
      bg: darkMode ? 'bg-white/5 text-slate-300 border-white/10' : 'bg-slate-900/[0.04] text-slate-700 border-slate-900/[0.08]',
      dot: 'bg-amber-400'
    };
  };

  const alarmBadge = getAlarmBadgeConfig();
  const AlarmIcon = alarmBadge.icon;

  return (
    <div className="w-full flex flex-wrap items-center gap-2 pb-1">
      {/* 1. OCCUPANCY PRESENCE AVATARS (AT BEGINNING) */}
      {userEntities.slice(0, 3).map((user) => {
        const isHome = user.state === 'home';
        const firstName = (user.name || user.attributes?.friendly_name || user.entity_id).split(' ')[0];

        return (
          <div
            key={user.entity_id}
            className={`h-9 pl-1 pr-2.5 rounded-full text-xs font-bold border backdrop-blur-md flex items-center gap-1.5 shadow-xs select-none ${
              isHome
                ? darkMode
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-emerald-50/90 text-emerald-950 border-emerald-200/90 shadow-2xs'
                : darkMode
                  ? 'bg-white/5 text-slate-400 border-white/10 opacity-75'
                  : 'bg-slate-900/[0.04] text-slate-600 border-slate-900/[0.08]'
            }`}
            title={`${user.name || user.entity_id}: ${isHome ? 'At Home' : user.state}`}
          >
            <PersonAvatar
              name={user.name}
              entity_picture={user.attributes?.entity_picture}
              state={user.state}
              isHome={isHome}
              size="sm"
              showPresenceDot={false}
              className="w-6 h-6 shrink-0"
            />
            <span>{firstName}</span>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isHome ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          </div>
        );
      })}

      {/* 2. ALARM STATUS BADGE */}
      <button
        type="button"
        onClick={() => onSelectFilter(activeFilter === 'alarm' ? 'all' : 'alarm')}
        className={`h-9 px-3.5 rounded-full border text-xs font-bold transition-all cursor-pointer backdrop-blur-md hover:scale-105 active:scale-95 flex items-center gap-2 shadow-xs ${
          alarmBadge.bg
        } ${activeFilter === 'alarm' ? 'ring-2 ring-emerald-400/50' : ''}`}
        title={`Alarm Status: ${alarmBadge.label} (Click to toggle view)`}
      >
        <AlarmIcon size={16} weight="duotone" className="shrink-0" />
        <span>{alarmBadge.label}</span>
        <span className={`w-2 h-2 rounded-full shrink-0 ${alarmBadge.dot}`} />
      </button>

      {/* 3. PERIMETER LOCKS BADGE */}
      <button
        type="button"
        onClick={() => onSelectFilter(activeFilter === 'locks' ? 'all' : 'locks')}
        className={`h-9 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer backdrop-blur-md hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs ${
          unlockedLocks.length > 0
            ? darkMode
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/35'
              : 'bg-amber-50/95 text-amber-950 border-amber-200/90 shadow-2xs'
            : darkMode
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
              : 'bg-emerald-50/90 text-emerald-950 border-emerald-200/90 shadow-2xs'
        } ${activeFilter === 'locks' ? 'ring-2 ring-amber-400/50' : ''}`}
        title={unlockedLocks.length > 0 ? `${unlockedLocks.length} locks unlocked` : 'All perimeter locks secure'}
      >
        {unlockedLocks.length > 0 ? (
          <LockOpen size={16} weight="duotone" className="text-amber-600 dark:text-amber-400 shrink-0" />
        ) : (
          <Lock size={16} weight="duotone" className="text-emerald-600 dark:text-emerald-400 shrink-0" />
        )}
        <span>
          {unlockedLocks.length > 0
            ? `${unlockedLocks.length} Unlocked`
            : `${totalLocks || 3} Locks Secure`}
        </span>
      </button>

      {/* 4. DOORS & WINDOWS (OPENINGS) BADGE */}
      <button
        type="button"
        onClick={() => onSelectFilter(activeFilter === 'openings' ? 'all' : 'openings')}
        className={`h-9 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer backdrop-blur-md hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs ${
          totalOpenings > 0
            ? darkMode
              ? 'bg-rose-500/15 text-rose-300 border-rose-500/35'
              : 'bg-rose-50/90 text-rose-950 border-rose-200/90 shadow-2xs'
            : darkMode
              ? 'bg-white/5 text-slate-300 border-white/10'
              : 'bg-slate-900/[0.04] text-slate-700 border-slate-900/[0.08]'
        } ${activeFilter === 'openings' ? 'ring-2 ring-rose-400/50' : ''}`}
        title={totalOpenings > 0 ? `${openDoors.length} doors, ${openWindows.length} windows open` : 'All perimeter openings closed'}
      >
        {totalOpenings > 0 ? (
          <DoorOpen size={16} weight="duotone" className="text-rose-500 dark:text-rose-400 shrink-0" />
        ) : (
          <Door size={16} weight="duotone" className="text-slate-500 dark:text-slate-400 shrink-0" />
        )}
        <span>{totalOpenings > 0 ? `${totalOpenings} Openings Open` : 'Perimeter Closed'}</span>
      </button>

      {/* 5. MOTION & OCCUPANCY BADGE */}
      <button
        type="button"
        onClick={() => onSelectFilter(activeFilter === 'motion' ? 'all' : 'motion')}
        className={`h-9 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer backdrop-blur-md hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs ${
          activeMotion.length > 0
            ? darkMode
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/35'
              : 'bg-amber-50/95 text-amber-950 border-amber-200/90 shadow-2xs'
            : darkMode
              ? 'bg-white/5 text-slate-300 border-white/10'
              : 'bg-slate-900/[0.04] text-slate-700 border-slate-900/[0.08]'
        } ${activeFilter === 'motion' ? 'ring-2 ring-amber-400/50' : ''}`}
        title={activeMotion.length > 0 ? `${activeMotion.length} motion zones active` : 'No active motion detected'}
      >
        <PersonSimpleWalk
          size={16}
          weight="duotone"
          className={activeMotion.length > 0 ? 'text-amber-600 dark:text-amber-400 shrink-0 animate-bounce' : 'text-slate-500 dark:text-slate-400 shrink-0'}
        />
        <span>{activeMotion.length > 0 ? `${activeMotion.length} Motion Active` : 'Motion Clear'}</span>
      </button>

      {/* 6. HAZARD & ENVIRONMENTAL SAFETY BADGE */}
      <button
        type="button"
        onClick={() => onSelectFilter(activeFilter === 'hazards' ? 'all' : 'hazards')}
        className={`h-9 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer backdrop-blur-md hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs ${
          totalHazards > 0
            ? darkMode
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
              : 'bg-rose-50/95 text-rose-950 border-rose-200/90 shadow-2xs animate-pulse'
            : darkMode
              ? 'bg-white/5 text-slate-300 border-white/10'
              : 'bg-slate-900/[0.04] text-slate-700 border-slate-900/[0.08]'
        } ${activeFilter === 'hazards' ? 'ring-2 ring-rose-400/50' : ''}`}
        title={totalHazards > 0 ? 'Hazard Alert Detected' : 'All smoke and water leak detectors normal'}
      >
        {totalHazards > 0 ? (
          <Flame size={16} weight="duotone" className="text-rose-500 dark:text-rose-400 shrink-0" />
        ) : (
          <CheckCircle size={16} weight="duotone" className="text-emerald-600 dark:text-emerald-400 shrink-0" />
        )}
        <span>{totalHazards > 0 ? `${totalHazards} Hazards Detected` : 'Environment Safe'}</span>
      </button>

      {/* 7. CAMERAS QUICK JUMP BADGE */}
      <button
        type="button"
        onClick={() => onSelectFilter(activeFilter === 'cameras' ? 'all' : 'cameras')}
        className={`h-9 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer backdrop-blur-md hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs ${
          darkMode
            ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35'
            : 'bg-cyan-50/90 text-cyan-950 border-cyan-200/90 shadow-2xs'
        } ${activeFilter === 'cameras' ? 'ring-2 ring-cyan-400/50' : ''}`}
      >
        <VideoCamera size={16} weight="duotone" className="text-cyan-600 dark:text-cyan-400 shrink-0" />
        <span>{cameraEntities.length} {cameraEntities.length === 1 ? 'Live Feed' : 'Live Feeds'}</span>
      </button>
    </div>
  );
}
