/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * High-density Perimeter & Access Attention card.
 * Provides instant visibility into any doors/windows left open, unlocked smart locks,
 * or active hazard alerts, with 1-click lock all controls.
 */

import React from 'react';
import {
  ShieldCheck,
  ShieldWarning,
  Lock,
  LockOpen,
  DoorOpen,
  Flame,
  CheckCircle,
  WarningCircle,
  Sparkle
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';

interface PerimeterAttentionCardProps {
  darkMode?: boolean;
  openDoors: ResolvedEntity[];
  openWindows: ResolvedEntity[];
  unlockedLocks: ResolvedEntity[];
  activeHazards: ResolvedEntity[];
  totalLocksCount: number;
  totalContactsCount: number;
}

export default function PerimeterAttentionCard({
  darkMode = true,
  openDoors,
  openWindows,
  unlockedLocks,
  activeHazards,
  totalLocksCount,
  totalContactsCount
}: PerimeterAttentionCardProps) {
  const callHAService = useAutoLayoutStore((s) => s.callHAService);
  const updateEntityState = useAutoLayoutStore((s) => s.updateEntityState);
  const areasMap = useAutoLayoutStore((s) => s.areasMap);

  const totalAttentionCount =
    openDoors.length + openWindows.length + unlockedLocks.length + activeHazards.length;
  const isAllSecure = totalAttentionCount === 0;

  const handleLockSingle = async (lock: ResolvedEntity) => {
    updateEntityState(lock.entity_id, 'locked');
    try {
      await callHAService('lock', 'lock', {}, { entity_id: lock.entity_id });
    } catch (err) {
      console.error('Failed to lock entity:', err);
    }
  };

  const handleLockAll = async () => {
    for (const lock of unlockedLocks) {
      updateEntityState(lock.entity_id, 'locked');
      try {
        await callHAService('lock', 'lock', {}, { entity_id: lock.entity_id });
      } catch (err) {
        console.error('Failed to lock entity:', err);
      }
    }
  };

  const getAreaName = (areaId?: string) => {
    if (!areaId) return 'Perimeter';
    return areasMap[areaId]?.name || areaId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div
      className={`p-5 sm:p-6 rounded-3xl backdrop-blur-md transition-all duration-300 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] flex flex-col justify-between ${
        isAllSecure
          ? darkMode
            ? 'bg-emerald-950/20 text-white'
            : 'bg-emerald-50/80 text-slate-900'
          : darkMode
            ? 'bg-amber-950/20 text-white'
            : 'bg-amber-50/80 text-slate-900'
      }`}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                isAllSecure
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-400 animate-pulse'
              }`}
            >
              {isAllSecure ? (
                <ShieldCheck size={22} weight="duotone" />
              ) : (
                <ShieldWarning size={22} weight="duotone" />
              )}
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                <span>{isAllSecure ? 'Perimeter Fully Secured' : 'Perimeter Attention'}</span>
                {!isAllSecure && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black">
                    {totalAttentionCount} Pending
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {isAllSecure
                  ? 'All exterior openings closed & deadbolts locked'
                  : `${totalAttentionCount} perimeter point(s) require action`}
              </p>
            </div>
          </div>

          {/* 1-Click Lock All Action if multiple locks are unlocked */}
          {unlockedLocks.length > 0 && (
            <button
              type="button"
              onClick={handleLockAll}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Lock size={14} weight="bold" />
              <span>Lock All ({unlockedLocks.length})</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        {isAllSecure ? (
          /* Secure Summary Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            <div
              className={`p-3 rounded-2xl flex items-center gap-2.5 ${
                darkMode ? 'bg-white/[0.04]' : 'bg-white/80 shadow-2xs'
              }`}
            >
              <div className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle size={16} weight="fill" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium truncate">Openings</div>
                <div className="text-xs font-black text-emerald-800 dark:text-emerald-400">
                  {totalContactsCount} Closed
                </div>
              </div>
            </div>

            <div
              className={`p-3 rounded-2xl flex items-center gap-2.5 ${
                darkMode ? 'bg-white/[0.04]' : 'bg-white/80 shadow-2xs'
              }`}
            >
              <div className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Lock size={16} weight="fill" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium truncate">Smart Locks</div>
                <div className="text-xs font-black text-emerald-800 dark:text-emerald-400">
                  {totalLocksCount} Locked
                </div>
              </div>
            </div>

            <div
              className={`p-3 rounded-2xl flex items-center gap-2.5 col-span-2 sm:col-span-1 ${
                darkMode ? 'bg-white/[0.04]' : 'bg-white/80 shadow-2xs'
              }`}
            >
              <div className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Sparkle size={16} weight="fill" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium truncate">Hazards</div>
                <div className="text-xs font-black text-emerald-800 dark:text-emerald-400">Clear</div>
              </div>
            </div>
          </div>
        ) : (
          /* Attention Items List */
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
            {/* Unlocked Locks */}
            {unlockedLocks.map((lock) => (
              <div
                key={lock.entity_id}
                className={`p-2.5 sm:p-3 rounded-2xl flex items-center justify-between gap-3 ${
                  darkMode ? 'bg-white/[0.05]' : 'bg-white/90 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                    <LockOpen size={16} weight="bold" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {lock.name || lock.attributes?.friendly_name || lock.entity_id}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                      {getAreaName(lock.area_id)} • Unlocked
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleLockSingle(lock)}
                  className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-xs cursor-pointer shrink-0"
                >
                  Lock
                </button>
              </div>
            ))}

            {/* Open Doors */}
            {openDoors.map((door) => (
              <div
                key={door.entity_id}
                className={`p-2.5 sm:p-3 rounded-2xl flex items-center justify-between gap-3 ${
                  darkMode ? 'bg-white/[0.05]' : 'bg-white/90 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                    <DoorOpen size={16} weight="bold" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {door.name || door.attributes?.friendly_name || door.entity_id}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                      {getAreaName(door.area_id)}
                    </div>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-300 shrink-0">
                  OPEN
                </span>
              </div>
            ))}

            {/* Open Windows */}
            {openWindows.map((win) => (
              <div
                key={win.entity_id}
                className={`p-2.5 sm:p-3 rounded-2xl flex items-center justify-between gap-3 ${
                  darkMode ? 'bg-white/[0.05]' : 'bg-white/90 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                    <DoorOpen size={16} weight="bold" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {win.name || win.attributes?.friendly_name || win.entity_id}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                      {getAreaName(win.area_id)}
                    </div>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-300 shrink-0">
                  OPEN
                </span>
              </div>
            ))}

            {/* Active Hazards */}
            {activeHazards.map((hazard) => (
              <div
                key={hazard.entity_id}
                className="p-2.5 sm:p-3 rounded-2xl flex items-center justify-between gap-3 bg-rose-500/15 border border-rose-500/30"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 animate-pulse">
                    <Flame size={16} weight="fill" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-rose-300 truncate">
                      {hazard.name || hazard.attributes?.friendly_name || hazard.entity_id}
                    </div>
                    <div className="text-[11px] text-rose-400/80 font-medium">
                      {getAreaName(hazard.area_id)} • Hazard Detected
                    </div>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-rose-500 text-white shrink-0 animate-pulse">
                  CRITICAL
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Status Hint */}
      <div className="pt-3 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-medium">
        <span>Security Zone Guardian</span>
        <span>Local Encrypted Telemetry</span>
      </div>
    </div>
  );
}
