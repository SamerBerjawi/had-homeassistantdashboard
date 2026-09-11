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
import DynamicPhosphorIcon from '../../ui/DynamicPhosphorIcon';
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
  customIcon?: string | null;
}

export default function LockControlView({ entity, darkMode = true, customIcon }: LockControlViewProps) {
  const { callHAService, updateEntityState } = useAutoLayoutStore();

  const caps: LockCapabilities = useMemo(() => {
    return detectLockCapabilities(entity);
  }, [entity]);

  const isLocked = caps.isLocked;
  const isJammed = caps.isJammed;

  const handleToggleLock = () => {
    const nextService = isLocked ? 'unlock' : 'lock';
    const nextState = isLocked ? 'unlocked' : 'locked';
    updateEntityState(entity.entity_id, nextState);
    callHAService('lock', nextService, {}, { entity_id: entity.entity_id });
  };

  const handleUnlatchDoor = () => {
    callHAService('lock', 'open', {}, { entity_id: entity.entity_id });
  };

  const lastChangedStr = formatRelativeTime(caps.lastChanged);

  // Health page design tokens for containers and tiles (frosted translucent glass)
  const bentoCardStyle = darkMode
    ? 'bg-black/20 hover:bg-black/30 text-white shadow-[4px_6px_12px_rgba(0,0,0,0.15)] border border-white/5 backdrop-blur-xl'
    : 'bg-white/35 hover:bg-white/45 text-slate-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/40 backdrop-blur-xl';

  const bentoStaticCardStyle = darkMode
    ? 'bg-black/20 text-white shadow-[4px_6px_12px_rgba(0,0,0,0.15)] border border-white/5 backdrop-blur-xl'
    : 'bg-white/35 text-slate-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/40 backdrop-blur-xl';

  return (
    <div className="space-y-4 select-none">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER ROW (Health Section Header Pattern)                         */}
      {/* ========================================================================= */}
      <div className={`p-4 rounded-3xl backdrop-blur-xl flex items-center justify-between transition-all ${bentoStaticCardStyle}`}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors"
            style={{
              backgroundColor: isJammed
                ? 'rgba(245, 158, 11, 0.15)'
                : isLocked
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(244, 63, 94, 0.15)',
              borderColor: isJammed
                ? 'rgba(245, 158, 11, 0.35)'
                : isLocked
                ? 'rgba(16, 185, 129, 0.35)'
                : 'rgba(244, 63, 94, 0.35)',
              color: isJammed ? '#f59e0b' : isLocked ? '#10b981' : '#f43f5e'
            }}
          >
            {isJammed ? (
              <Warning size={18} weight="fill" />
            ) : customIcon ? (
              <DynamicPhosphorIcon name={customIcon} size={18} weight={isLocked ? 'fill' : 'duotone'} />
            ) : isLocked ? (
              <Lock size={18} weight="fill" />
            ) : (
              <LockOpen size={18} weight="bold" />
            )}
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              {entity.attributes.room || entity.attributes.area || 'ACCESS & LOCKS'}
            </span>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-xs">
              {entity.attributes.friendly_name || 'Smart Deadbolt'}
            </h2>
          </div>
        </div>

        {/* Status Pill Badge + Master Lock/Unlock Action Button */}
        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
              isJammed
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                : isLocked
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isJammed
                  ? 'bg-amber-500 animate-ping'
                  : isLocked
                  ? 'bg-emerald-500'
                  : 'bg-rose-500 animate-pulse'
              }`}
            />
            <span>{isJammed ? 'Jammed' : isLocked ? 'Locked' : 'Unlocked'}</span>
          </div>

          <button
            type="button"
            onClick={handleToggleLock}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 border ${
              isLocked
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs'
                : 'bg-rose-500 text-white border-rose-400 shadow-xs'
            }`}
            aria-label={isLocked ? 'Unlock Deadbolt' : 'Lock Deadbolt'}
          >
            {isLocked ? <Lock size={16} weight="fill" /> : <LockOpen size={16} weight="bold" />}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MASTER LOCK HERO CARD (Health Metric Card Typography)                  */}
      {/* ========================================================================= */}
      <div
        className={`p-6 sm:p-7 rounded-3xl flex flex-col items-center justify-center text-center relative overflow-hidden transition-all ${bentoStaticCardStyle}`}
      >
        {/* Dynamic Subtle Ambient Glow Aura */}
        <div
          className={`absolute -inset-10 opacity-20 blur-3xl rounded-full transition-all duration-700 pointer-events-none ${
            isJammed
              ? 'bg-amber-500/30'
              : isLocked
              ? 'bg-emerald-500/30'
              : 'bg-rose-500/30'
          }`}
        />

        {/* Large Tactile Lock Button */}
        <button
          type="button"
          onClick={handleToggleLock}
          className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] mb-3 border ${
            isJammed
              ? darkMode
                ? 'bg-amber-500/15 border-amber-400/80 text-amber-300 ring-4 ring-amber-400/20'
                : 'bg-amber-100/80 border-amber-400 text-amber-600 ring-4 ring-amber-400/25'
              : isLocked
              ? darkMode
                ? 'bg-emerald-500/15 border-emerald-400/80 text-emerald-300 ring-4 ring-emerald-400/20'
                : 'bg-emerald-100/80 border-emerald-400 text-emerald-600 ring-4 ring-emerald-400/25'
              : darkMode
              ? 'bg-rose-500/15 border-rose-400/80 text-rose-300 ring-4 ring-rose-400/20'
              : 'bg-rose-100/80 border-rose-400 text-rose-600 ring-4 ring-rose-400/25'
          }`}
          title={isLocked ? 'Tap to Unlock' : 'Tap to Lock'}
        >
          {isJammed ? (
            <Warning size={40} weight="fill" className="drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
          ) : isLocked ? (
            <Lock size={40} weight="fill" className="drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
          ) : (
            <LockOpen size={40} weight="bold" className="drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]" />
          )}
        </button>

        {/* Status Headline */}
        <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white my-1">
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

        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 flex items-center justify-center gap-1.5">
          <span>{isLocked ? 'Deadbolt Fully Engaged' : 'Direct Access Open'}</span>
          {lastChangedStr && (
            <>
              <span>•</span>
              <span>{lastChangedStr}</span>
            </>
          )}
        </p>

        {/* 1-Tap Action Button Deck */}
        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            onClick={handleToggleLock}
            className={`h-11 px-6 rounded-2xl text-xs font-black transition-all cursor-pointer active:scale-95 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] flex items-center gap-2 border ${
              isLocked
                ? darkMode
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-400/40'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black border-emerald-400 shadow-[4px_6px_12px_rgba(16,185,129,0.25)]'
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
              className={`h-11 px-5 rounded-2xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] border ${
                darkMode
                  ? 'bg-black/20 hover:bg-black/30 text-slate-200 border-white/5'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
              title="Pull spring latch to pop door open"
            >
              <Door size={16} weight="duotone" className="text-amber-500" />
              <span>Unlatch</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ACCESS HEALTH & BATTERY BENTO DECK                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className={`p-3.5 rounded-2xl flex items-center gap-3 transition-all ${bentoCardStyle}`}>
          <div
            className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
            style={{
              backgroundColor: isLocked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              borderColor: isLocked ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)',
              color: isLocked ? '#10b981' : '#f43f5e'
            }}
          >
            {isLocked ? <ShieldCheck size={20} weight="duotone" /> : <ShieldWarning size={20} weight="duotone" />}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
              Security State
            </div>
            <div className="text-xs font-black mt-0.5 truncate text-slate-900 dark:text-white">
              {isLocked ? 'Protected' : 'Disarmed / Open'}
            </div>
          </div>
        </div>

        {caps.batteryPct !== undefined ? (
          <div className={`p-3.5 rounded-2xl flex items-center gap-3 transition-all ${bentoCardStyle}`}>
            <div
              className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                borderColor: 'rgba(16, 185, 129, 0.35)',
                color: '#10b981'
              }}
            >
              <BatteryMedium size={20} weight="duotone" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                Battery Power
              </div>
              <div className="text-xs font-black font-mono mt-0.5 truncate text-slate-900 dark:text-white">
                {caps.batteryPct}%
              </div>
            </div>
          </div>
        ) : (
          <div className={`p-3.5 rounded-2xl flex items-center gap-3 transition-all ${bentoCardStyle}`}>
            <div
              className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'rgba(14, 165, 233, 0.15)',
                borderColor: 'rgba(14, 165, 233, 0.35)',
                color: '#0ea5e9'
              }}
            >
              <Key size={20} weight="duotone" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                Access Protocol
              </div>
              <div className="text-xs font-black mt-0.5 truncate text-slate-900 dark:text-white">
                Direct Relay
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
