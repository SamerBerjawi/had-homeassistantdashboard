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
}

export default function LockControlView({ entity }: LockControlViewProps) {
  const { callHAService, updateEntityState } = useAutoLayoutStore();

  const caps: LockCapabilities = useMemo(() => {
    return detectLockCapabilities(entity);
  }, [entity]);

  const isLocked = caps.isLocked;
  const isUnlocked = caps.isUnlocked;
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
    <div className="space-y-5">
      {/* 1. MASTER LOCK HERO CARD */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-800/40 border border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-md">
        {/* Dynamic ambient glow aura */}
        <div
          className={`absolute -inset-10 opacity-30 blur-3xl rounded-full transition-all duration-500 pointer-events-none ${
            isJammed
              ? 'bg-amber-500/40'
              : isLocked
              ? 'bg-rose-500/40'
              : 'bg-emerald-500/40'
          }`}
        />

        {/* Large Tactile Lock Button */}
        <button
          type="button"
          onClick={handleToggleLock}
          className={`w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-2xl mb-3 border ${
            isJammed
              ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-4 ring-amber-400/20'
              : isLocked
              ? 'bg-rose-500/20 border-rose-400 text-rose-300 ring-4 ring-rose-400/20'
              : 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-4 ring-emerald-400/20'
          }`}
          title={isLocked ? 'Tap to Unlock' : 'Tap to Lock'}
        >
          {isJammed ? (
            <Warning size={48} weight="fill" className="drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]" />
          ) : isLocked ? (
            <Lock size={48} weight="fill" className="drop-shadow-[0_0_15px_rgba(244,63,94,0.8)]" />
          ) : (
            <LockOpen size={48} weight="bold" className="drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]" />
          )}
        </button>

        {/* Status Headline */}
        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          {isJammed
            ? 'Lock Jammed'
            : caps.isLocking
            ? 'Locking...'
            : caps.isUnlocking
            ? 'Unlocking...'
            : isLocked
            ? 'Locked & Secure'
            : 'Unlocked'}
        </h3>

        <p className="text-xs text-slate-400 font-medium mt-1">
          {isLocked ? 'Deadbolt Engaged' : 'Entry Accessible'}
          {lastChangedStr && ` • ${lastChangedStr}`}
        </p>

        {/* 1-Tap Action Button */}
        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            onClick={handleToggleLock}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-md flex items-center gap-1.5 ${
              isLocked
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
                : 'bg-rose-500 hover:bg-rose-400 text-white'
            }`}
          >
            {isLocked ? (
              <>
                <LockOpen size={16} weight="bold" />
                <span>Unlock Door</span>
              </>
            ) : (
              <>
                <Lock size={16} weight="bold" />
                <span>Lock Door</span>
              </>
            )}
          </button>

          {/* Motorized Unlatch / Pull Spring Door Button (strictly if supported) */}
          {caps.supportsOpen && (
            <button
              type="button"
              onClick={handleUnlatchDoor}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 border border-white/10"
              title="Pull spring latch to pop door open"
            >
              <Door size={16} weight="duotone" className="text-amber-400" />
              <span>Unlatch Door</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. ACCESS HEALTH & BATTERY STRIP */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-slate-800/30 border border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0">
            {isLocked ? <ShieldCheck size={18} weight="duotone" /> : <ShieldWarning size={18} weight="duotone" />}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Security State</div>
            <div className="text-xs font-bold text-white mt-0.5 truncate">
              {isLocked ? 'Protected' : 'Disarmed / Open'}
            </div>
          </div>
        </div>

        {caps.batteryPct !== undefined ? (
          <div className="p-3.5 rounded-2xl bg-slate-800/30 border border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <BatteryMedium size={18} weight="duotone" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Battery Power</div>
              <div className="text-xs font-bold font-mono text-white mt-0.5 truncate">
                {caps.batteryPct}%
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-slate-800/30 border border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center justify-center shrink-0">
              <Key size={18} weight="duotone" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Access Protocol</div>
              <div className="text-xs font-bold text-white mt-0.5 truncate">
                Direct Relay
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
