import React, { useMemo } from 'react';
import {
  Lock,
  LockOpen,
  Warning,
  Key,
  Door,
  BatteryMedium,
  ShieldCheck,
  ShieldWarning
} from '@phosphor-icons/react';
import { HAEntity } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { formatRelativeTime } from '../../../lib/utils';
import {
  detectLockCapabilities,
  LockCapabilities
} from '../../../services/lockClassification';

interface LockControlViewProps {
  entity: HAEntity;
  darkMode?: boolean;
}

export default function LockControlView({ entity, darkMode = true }: LockControlViewProps) {
  const { callHAService, updateEntityState } = useAutoLayoutStore();

  const caps: LockCapabilities = useMemo(() => {
    return detectLockCapabilities(entity);
  }, [entity]);

  const isLocked = caps.isLocked;
  const isJammed = caps.isJammed;

  const handleToggleLock = () => {
    const nextState = isLocked ? 'unlocked' : 'locked';
    updateEntityState(entity.entity_id, nextState);
    callHAService(
      'lock',
      nextState === 'locked' ? 'lock' : 'unlock',
      {},
      { entity_id: entity.entity_id }
    );
  };

  const handleUnlatchDoor = () => {
    callHAService('lock', 'open', {}, { entity_id: entity.entity_id });
  };

  const lastChangedStr = formatRelativeTime(caps.lastChanged);

  return (
    <div className="space-y-6">
      {/* 1. MASTER LOCK HERO CARD */}
      <div
        className={`p-6 sm:p-7 rounded-3xl border flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-xl transition-all duration-300 ${
          darkMode
            ? 'bg-slate-800/40 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.36)]'
            : 'bg-white/70 border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.06)]'
        }`}
      >
        {/* Dynamic ambient glow aura */}
        <div
          className={`absolute -inset-10 opacity-30 blur-3xl rounded-full transition-all duration-500 pointer-events-none ${
            isJammed
              ? 'bg-amber-500/40'
              : isLocked
              ? 'bg-emerald-500/35'
              : 'bg-rose-500/35'
          }`}
        />

        {/* Large Tactile Lock Button */}
        <button
          type="button"
          onClick={handleToggleLock}
          className={`w-22 h-22 sm:w-26 sm:h-26 rounded-3xl flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 shadow-2xl mb-3 border ${
            isJammed
              ? darkMode
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-4 ring-amber-400/20'
                : 'bg-amber-100 border-amber-400 text-amber-600 ring-4 ring-amber-400/25'
              : isLocked
              ? darkMode
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-4 ring-emerald-400/20 shadow-emerald-500/25'
                : 'bg-emerald-100 border-emerald-400 text-emerald-600 ring-4 ring-emerald-400/25 shadow-emerald-500/15'
              : darkMode
              ? 'bg-rose-500/20 border-rose-400 text-rose-300 ring-4 ring-rose-400/20 shadow-rose-500/25'
              : 'bg-rose-100 border-rose-400 text-rose-600 ring-4 ring-rose-400/25 shadow-rose-500/15'
          }`}
          title={isLocked ? 'Tap to Unlock' : 'Tap to Lock'}
        >
          {isJammed ? (
            <Warning size={46} weight="fill" className="drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]" />
          ) : isLocked ? (
            <Lock size={46} weight="fill" className="drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
          ) : (
            <LockOpen size={46} weight="bold" className="drop-shadow-[0_0_15px_rgba(244,63,94,0.8)]" />
          )}
        </button>

        {/* Status Headline */}
        <h3
          className={`text-xl sm:text-2xl font-black tracking-tight ${
            darkMode ? 'text-white' : 'text-slate-900'
          }`}
        >
          {isJammed
            ? 'Lock Jammed'
            : caps.isLocking
            ? 'Locking...'
            : caps.isUnlocking
            ? 'Unlocking...'
            : isLocked
            ? 'Secured & Locked'
            : 'Unlocked / Disarmed'}
        </h3>

        <p
          className={`text-xs font-medium mt-1 flex items-center gap-1.5 ${
            darkMode ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          <span>{isLocked ? 'Deadbolt Fully Engaged' : 'Access Granted'}</span>
          {lastChangedStr && (
            <>
              <span>•</span>
              <span>{lastChangedStr}</span>
            </>
          )}
        </p>

        {/* 1-Tap Action Button */}
        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            onClick={handleToggleLock}
            className={`h-12 px-6 rounded-2xl text-xs font-extrabold transition-all cursor-pointer active:scale-95 shadow-md flex items-center gap-2 border ${
              isLocked
                ? darkMode
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-400/40'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black border-emerald-400'
            }`}
          >
            {isLocked ? (
              <>
                <LockOpen size={18} weight="bold" />
                <span>Unlock Door</span>
              </>
            ) : (
              <>
                <Lock size={18} weight="bold" />
                <span>Lock Door</span>
              </>
            )}
          </button>

          {/* Motorized Unlatch / Pull Spring Door Button (strictly if supported) */}
          {caps.supportsOpen && (
            <button
              type="button"
              onClick={handleUnlatchDoor}
              className={`h-12 px-5 rounded-2xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 border ${
                darkMode
                  ? 'bg-white/10 hover:bg-white/15 text-slate-200 border-white/10'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title="Pull spring latch to pop door open"
            >
              <Door size={18} weight="duotone" className="text-amber-500" />
              <span>Unlatch</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. ACCESS HEALTH & BATTERY STRIP */}
      <div className="grid grid-cols-2 gap-2.5">
        <div
          className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
            darkMode
              ? 'bg-slate-800/40 border-white/10'
              : 'bg-white/70 border-slate-200/80 shadow-xs'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
              isLocked
                ? darkMode
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                : darkMode
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                : 'bg-rose-100 text-rose-700 border-rose-200'
            }`}
          >
            {isLocked ? <ShieldCheck size={20} weight="duotone" /> : <ShieldWarning size={20} weight="duotone" />}
          </div>
          <div className="min-w-0">
            <div
              className={`text-[10px] uppercase font-bold tracking-wider ${
                darkMode ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Security State
            </div>
            <div
              className={`text-xs font-black mt-0.5 truncate ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              {isLocked ? 'Protected' : 'Disarmed / Open'}
            </div>
          </div>
        </div>

        {caps.batteryPct !== undefined ? (
          <div
            className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
              darkMode
                ? 'bg-slate-800/40 border-white/10'
                : 'bg-white/70 border-slate-200/80 shadow-xs'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                darkMode
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-emerald-100 text-emerald-700 border-emerald-200'
              }`}
            >
              <BatteryMedium size={20} weight="duotone" />
            </div>
            <div className="min-w-0">
              <div
                className={`text-[10px] uppercase font-bold tracking-wider ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Battery Power
              </div>
              <div
                className={`text-xs font-black font-mono mt-0.5 truncate ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                {caps.batteryPct}%
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
              darkMode
                ? 'bg-slate-800/40 border-white/10'
                : 'bg-white/70 border-slate-200/80 shadow-xs'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                darkMode
                  ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                  : 'bg-sky-100 text-sky-700 border-sky-200'
              }`}
            >
              <Key size={20} weight="duotone" />
            </div>
            <div className="min-w-0">
              <div
                className={`text-[10px] uppercase font-bold tracking-wider ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Access Protocol
              </div>
              <div
                className={`text-xs font-black mt-0.5 truncate ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                Direct Relay
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
