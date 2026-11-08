/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, LockOpen, CaretRight, HouseLine, ShieldWarning, Moon } from '@phosphor-icons/react';
import Toolbar from '../../kokonutui/toolbar';
import type { TileProps } from './types';

export default function AlarmTile({ s, is2x }: TileProps) {
  const {
    alarmDetails,
    alarmEntity,
    armAwayCountdown,
    darkMode,
    executeArmAway,
    handleCancelCountdown,
    handleSetAlarmMode,
    setIsArmAwayModalOpen,
    tileBaseClass
  } = s;

  const currentState = alarmEntity?.state || 'disarmed';
  const isArmed = currentState !== 'disarmed';
  const alarmColorClass =
    currentState === 'armed_away'
      ? (darkMode ? 'bg-rose-500/20 text-white border-rose-500/30' : 'bg-rose-500/15 text-slate-900 border-rose-300/60')
      : currentState === 'armed_night'
      ? (darkMode ? 'bg-indigo-500/20 text-white border-indigo-500/30' : 'bg-indigo-500/15 text-slate-900 border-indigo-300/60')
      : currentState === 'armed_home'
      ? (darkMode ? 'bg-emerald-500/20 text-white border-emerald-500/30' : 'bg-emerald-500/15 text-slate-900 border-emerald-300/60')
      : '';

  if (is2x) {
    return (
      <div
        className={tileBaseClass(
          isArmed,
          alarmColorClass,
          false,
          true
        )}
      >
        {/* Top row: Security identity + Right Chevron */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${alarmDetails.bg} ${alarmDetails.text}`}>
              {currentState === 'armed_away' ? (
                <ShieldWarning size={18} weight="duotone" />
              ) : currentState === 'armed_night' ? (
                <Moon size={18} weight="duotone" />
              ) : currentState === 'armed_home' ? (
                <ShieldCheck size={18} weight="duotone" />
              ) : (
                <LockOpen size={18} weight="duotone" />
              )}
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {alarmEntity?.name || alarmEntity?.attributes?.friendly_name || 'Security Guard'}
            </span>
          </div>

          <div className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors shrink-0">
            <CaretRight size={16} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Action Row: Exit delay countdown or @kokonutui/toolbar with @kokonutui/hold-button */}
        {armAwayCountdown !== null && armAwayCountdown > 0 ? (
          <div className="flex items-center justify-between bg-rose-500/15 border border-rose-500/30 rounded-2xl p-2 sm:p-2.5 mt-auto mb-1.5 sm:mb-2 z-10 animate-fadeIn">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-rose-500 text-white font-mono font-black text-sm shadow-md shadow-rose-500/30 shrink-0">
                <span className="relative z-10">{armAwayCountdown}s</span>
                <span className="absolute inset-0 rounded-xl bg-rose-400 animate-ping opacity-30" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-rose-600 dark:text-rose-300 truncate">
                  Exit Delay • Arming Away
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Please exit and close all doors
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  executeArmAway();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
              >
                Arm Now
              </button>
              <button
                type="button"
                onClick={handleCancelCountdown}
                className="px-2.5 py-1.5 rounded-xl bg-white/60 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all border border-black/5 dark:border-white/10 cursor-pointer active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="relative z-10 mt-auto mb-1.5 sm:mb-2 w-full" onClick={(e) => e.stopPropagation()}>
            <Toolbar
              items={[
                { id: 'disarmed', title: 'Disarm', icon: LockOpen, color: 'amber' },
                { id: 'armed_home', title: 'Home', icon: HouseLine, color: 'emerald' },
                { id: 'armed_away', title: 'Away', icon: ShieldWarning, color: 'rose', isHold: true, holdDuration: 1000 },
                { id: 'armed_night', title: 'Night', icon: Moon, color: 'indigo' },
              ]}
              selected={currentState}
              onSelect={(mode) => {
                handleSetAlarmMode(mode as any, { stopPropagation: () => {} } as any);
              }}
              onHoldComplete={() => {
                setIsArmAwayModalOpen(true);
              }}
              darkMode={darkMode}
              className="w-full"
            />
          </div>
        )}
      </div>
    );
  }

  // 1x Compact mode
  return (
    <div
      className={tileBaseClass(
        isArmed,
        alarmColorClass,
        false,
        false
      )}
    >
      {/* Top row: Security icon on left, status badge on right */}
      <div className="flex items-center justify-between relative z-10">
        <div className={`w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center shrink-0 transition-all ${alarmDetails.bg} ${alarmDetails.text}`}>
          {currentState === 'armed_away' ? (
            <ShieldWarning size={19} weight="duotone" />
          ) : currentState === 'armed_night' ? (
            <Moon size={19} weight="duotone" />
          ) : currentState === 'armed_home' ? (
            <ShieldCheck size={19} weight="duotone" />
          ) : (
            <LockOpen size={19} weight="duotone" />
          )}
        </div>

        <span className={`text-[11px] sm:text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full border shadow-2xs ${alarmDetails.bg} ${alarmDetails.text} border-current/20`}>
          {alarmDetails.label}
        </span>
      </div>

      {/* Action Row: Exit delay countdown or Toolbar */}
      {armAwayCountdown !== null && armAwayCountdown > 0 ? (
        <div className="flex items-center justify-between bg-rose-500/15 border border-rose-500/30 rounded-2xl p-1.5 my-auto z-10 animate-fadeIn">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-rose-500 text-white font-mono font-black text-xs shadow-md shadow-rose-500/30 shrink-0">
              <span className="relative z-10">{armAwayCountdown}s</span>
              <span className="absolute inset-0 rounded-lg bg-rose-400 animate-ping opacity-30" />
            </div>
            <div className="text-[11px] font-bold text-rose-600 dark:text-rose-300 truncate">
              Exit Delay
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancelCountdown}
            className="px-2 py-1 rounded-lg bg-white/60 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-all border border-black/5 dark:border-white/10 cursor-pointer active:scale-95 shrink-0"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="relative z-10 my-auto w-full" onClick={(e) => e.stopPropagation()}>
          <Toolbar
            items={[
              { id: 'disarmed', title: 'Disarm', icon: LockOpen, color: 'amber' },
              { id: 'armed_home', title: 'Home', icon: HouseLine, color: 'emerald' },
              { id: 'armed_away', title: 'Away', icon: ShieldWarning, color: 'rose', isHold: true, holdDuration: 1000 },
              { id: 'armed_night', title: 'Night', icon: Moon, color: 'indigo' },
            ]}
            selected={currentState}
            onSelect={(mode) => {
              handleSetAlarmMode(mode as any, { stopPropagation: () => {} } as any);
            }}
            onHoldComplete={() => {
              setIsArmAwayModalOpen(true);
            }}
            darkMode={darkMode}
            compact={true}
            className="w-full"
          />
        </div>
      )}

      {/* Bottom: Title & Alarm Status with Chevron */}
      <div className="relative z-10">
        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
          {alarmEntity?.name || alarmEntity?.attributes?.friendly_name || 'Security Guard'}
        </div>
        <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
          <span>{isArmed ? 'Perimeter armed' : 'System disarmed'}</span>
          <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
        </div>
      </div>
    </div>
  );
}
