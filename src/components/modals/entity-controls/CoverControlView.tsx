import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Stop,
  SlidersHorizontal,
  ArrowsVertical
} from '@phosphor-icons/react';
import DynamicPhosphorIcon from '../../ui/DynamicPhosphorIcon';
import { HAEntity } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { formatRelativeTime } from '../../../lib/utils';
import {
  detectCoverCapabilities,
  CoverCapabilities
} from '../../../services/coverClassification';
import TouchCapsuleSlider from '../../ui/TouchCapsuleSlider';

interface CoverControlViewProps {
  entity: HAEntity;
  darkMode?: boolean;
  customIcon?: string | null;
}

export default function CoverControlView({ entity, darkMode = true, customIcon }: CoverControlViewProps) {
  const { callHAService, updateEntityState } = useAutoLayoutStore();

  const caps: CoverCapabilities = useMemo(() => {
    return detectCoverCapabilities(entity);
  }, [entity]);

  const [position, setPosition] = useState<number>(caps.currentPosition ?? 0);
  const [tilt, setTilt] = useState<number>(caps.currentTilt ?? 0);

  useEffect(() => {
    if (caps.currentPosition !== undefined) {
      setPosition(caps.currentPosition);
    }
    if (caps.currentTilt !== undefined) {
      setTilt(caps.currentTilt);
    }
  }, [caps]);

  const handleOpen = () => {
    setPosition(100);
    updateEntityState(entity.entity_id, 'open', {
      ...entity.attributes,
      current_position: 100
    });
    callHAService('cover', 'open_cover', {}, { entity_id: entity.entity_id });
  };

  const handleClose = () => {
    setPosition(0);
    updateEntityState(entity.entity_id, 'closed', {
      ...entity.attributes,
      current_position: 0
    });
    callHAService('cover', 'close_cover', {}, { entity_id: entity.entity_id });
  };

  const handleStop = () => {
    updateEntityState(entity.entity_id, position > 0 ? 'open' : 'closed', {
      ...entity.attributes,
      current_position: position
    });
    callHAService('cover', 'stop_cover', {}, { entity_id: entity.entity_id });
  };

  const handlePositionChange = (val: number) => {
    const safeVal = Math.round(val);
    setPosition(safeVal);
    const nextState = safeVal === 0 ? 'closed' : 'open';
    updateEntityState(entity.entity_id, nextState, {
      ...entity.attributes,
      current_position: safeVal
    });
    callHAService('cover', 'set_cover_position', { position: safeVal }, { entity_id: entity.entity_id });
  };

  const handleTiltChange = (val: number) => {
    const safeVal = Math.round(val);
    setTilt(safeVal);
    updateEntityState(entity.entity_id, entity.state, {
      ...entity.attributes,
      current_tilt_position: safeVal
    });
    callHAService('cover', 'set_cover_tilt_position', { tilt_position: safeVal }, { entity_id: entity.entity_id });
  };

  const lastChangedStr = formatRelativeTime(caps.lastChanged);

  // Health page design tokens for containers and tiles (frosted translucent glass)
  const bentoCardStyle = darkMode
    ? 'bg-black/20 hover:bg-black/30 text-white shadow-[4px_6px_12px_rgba(0,0,0,0.15)] border border-white/5 backdrop-blur-xl'
    : 'bg-white/35 hover:bg-white/45 text-slate-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/40 backdrop-blur-xl';

  const bentoStaticCardStyle = darkMode
    ? 'bg-black/20 text-white shadow-[4px_6px_12px_rgba(0,0,0,0.15)] border border-white/5 backdrop-blur-xl'
    : 'bg-white/35 text-slate-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/40 backdrop-blur-xl';

  const isOpen = position > 0;

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
              backgroundColor: isOpen ? 'rgba(14, 165, 233, 0.15)' : 'rgba(100, 116, 139, 0.12)',
              borderColor: isOpen ? 'rgba(14, 165, 233, 0.35)' : 'rgba(100, 116, 139, 0.25)',
              color: isOpen ? '#0ea5e9' : '#94a3b8'
            }}
          >
            {customIcon ? (
              <DynamicPhosphorIcon name={customIcon} size={18} weight="duotone" />
            ) : (
              <SlidersHorizontal size={18} weight="duotone" />
            )}
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              {entity.attributes.room || entity.attributes.area || 'SHADES & COVERS'}
            </span>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-xs">
              {entity.attributes.friendly_name || 'Window Cover'}
            </h2>
          </div>
        </div>

        {/* Status Pill Badge + Master Stop/Action Button */}
        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
              caps.isOpening || caps.isClosing
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                : isOpen
                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30'
                : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                caps.isOpening || caps.isClosing
                  ? 'bg-amber-500 animate-ping'
                  : isOpen
                  ? 'bg-sky-500'
                  : 'bg-slate-400'
              }`}
            />
            <span>
              {caps.isOpening
                ? 'Opening'
                : caps.isClosing
                ? 'Closing'
                : position === 0
                ? 'Closed'
                : position === 100
                ? 'Open'
                : `${position}%`}
            </span>
          </div>

          {caps.supportsStop && (
            <button
              type="button"
              onClick={handleStop}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 border ${
                darkMode
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
              }`}
              title="Stop Motion"
            >
              <Stop size={15} weight="fill" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MASTER HERO COVER CARD WITH VISUAL BLIND PREVIEW                       */}
      {/* ========================================================================= */}
      <div
        className={`p-6 sm:p-7 rounded-3xl flex flex-col items-center justify-center text-center relative overflow-hidden transition-all ${bentoStaticCardStyle}`}
      >
        {/* Subtle Ambient Glow Aura */}
        <div
          className={`absolute -inset-10 opacity-20 blur-3xl rounded-full transition-all duration-700 pointer-events-none ${
            isOpen ? 'bg-sky-500/30' : 'bg-transparent'
          }`}
        />

        {/* Visual Animated Window Blind Graphic */}
        <div
          className={`w-32 h-36 sm:w-36 sm:h-40 rounded-3xl p-2 relative flex flex-col justify-between overflow-hidden shadow-[4px_6px_12px_rgba(0,0,0,0.15)] mb-3 border ${
            darkMode
              ? 'bg-black/40 border-white/10'
              : 'bg-slate-900/10 border-slate-300/80 shadow-slate-300/30'
          }`}
        >
          {/* Window Frame Glass Backdrop */}
          <div className="absolute inset-0 bg-gradient-to-b from-sky-400/20 to-indigo-600/25" />

          {/* Slat Sliders Roll-down effect */}
          <div
            className="w-full bg-slate-800/90 dark:bg-black/60 border-b-2 border-sky-400 transition-all duration-300 flex flex-col gap-1 p-1 z-10 shadow-lg rounded-t-xl backdrop-blur-md"
            style={{ height: `${100 - position}%` }}
          >
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="w-full h-1 bg-slate-500/40 rounded-full" />
            ))}
          </div>

          <div className="z-10 w-full text-center py-1 mt-auto">
            <span className="text-[10px] font-mono font-black text-slate-800 dark:text-white drop-shadow-xs">
              {position === 0 ? 'Closed' : position === 100 ? 'Fully Open' : `${position}% Open`}
            </span>
          </div>
        </div>

        {/* HealthMetricCard Style Big Values */}
        {caps.supportsPosition ? (
          <div className="flex items-baseline justify-center gap-1 my-1">
            <span className="text-5xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight">
              {position}
            </span>
            <span className="text-xl font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              %
            </span>
          </div>
        ) : (
          <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white my-1">
            {position === 0 ? 'Closed' : 'Open'}
          </h3>
        )}

        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 flex items-center justify-center gap-1.5">
          <span>{caps.deviceClassLabel || 'Cover'}</span>
          {lastChangedStr && (
            <>
              <span>•</span>
              <span>{lastChangedStr}</span>
            </>
          )}
        </p>

        {/* Master Transport Actions (Open, Stop, Close) */}
        <div className="flex items-center gap-2 sm:gap-3 mt-4 w-full max-w-xs justify-center">
          <button
            type="button"
            onClick={handleOpen}
            disabled={position === 100}
            className="flex-1 h-11 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-[4px_6px_12px_rgba(14,165,233,0.25)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowUp size={16} weight="bold" />
            <span>Open</span>
          </button>

          {caps.supportsStop && (
            <button
              type="button"
              onClick={handleStop}
              className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
                darkMode
                  ? 'bg-black/20 hover:bg-black/30 text-slate-200 border-white/5'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
              title="Stop Motion"
            >
              <Stop size={16} weight="fill" />
            </button>
          )}

          <button
            type="button"
            onClick={handleClose}
            disabled={position === 0}
            className={`flex-1 h-11 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] border disabled:opacity-40 disabled:cursor-not-allowed ${
              darkMode
                ? 'bg-black/20 hover:bg-black/30 text-white border-white/5'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
            }`}
          >
            <ArrowDown size={16} weight="bold" />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. POSITION CONTROL CAPSULE SLIDER & PRESETS                              */}
      {/* ========================================================================= */}
      {caps.supportsPosition && (
        <div className={`p-4 sm:p-5 rounded-3xl space-y-3 ${bentoStaticCardStyle}`}>
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <SlidersHorizontal size={14} weight="duotone" className="text-sky-500" />
              <span>Target Position</span>
            </span>
            <span className="font-mono text-xs font-black text-sky-500 dark:text-sky-400">
              {position}%
            </span>
          </div>

          <TouchCapsuleSlider
            value={position}
            min={0}
            max={100}
            step={1}
            onChange={handlePositionChange}
            icon={<SlidersHorizontal size={20} weight="duotone" />}
            label="Position"
            valueFormatter={(val) => `${Math.round(val)}%`}
            fillColor="#0284c7"
            glowColor="rgba(2, 132, 199, 0.25)"
            darkMode={darkMode}
            heightClass="h-14 sm:h-15"
          />

          {/* Quick Position Jump Chips */}
          <div className="grid grid-cols-5 gap-2 pt-1">
            {[0, 25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handlePositionChange(pct)}
                className={`h-11 rounded-2xl text-xs font-black transition-all cursor-pointer active:scale-95 flex items-center justify-center border ${
                  position === pct
                    ? 'bg-sky-500 text-slate-950 font-black shadow-[4px_6px_12px_rgba(14,165,233,0.25)] border-sky-400 ring-2 ring-sky-400/30'
                    : darkMode
                    ? 'bg-black/20 hover:bg-black/30 border-white/5 text-slate-300 shadow-[4px_6px_12px_rgba(0,0,0,0.15)]'
                    : 'bg-white/40 hover:bg-white/60 border-slate-200/50 text-slate-700 shadow-[4px_6px_12px_rgba(0,0,0,0.05)]'
                }`}
              >
                {pct === 0 ? 'Closed' : pct === 100 ? 'Open' : `${pct}%`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VENETIAN SLAT TILT SLIDER                                              */}
      {/* ========================================================================= */}
      {caps.supportsTilt && (
        <div className={`p-4 sm:p-5 rounded-3xl space-y-3 ${bentoStaticCardStyle}`}>
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <ArrowsVertical size={14} weight="duotone" className="text-teal-500" />
              <span>Slat Tilt Angle</span>
            </span>
            <span className="font-mono text-xs font-black text-teal-500 dark:text-teal-400">
              {tilt}%
            </span>
          </div>

          <TouchCapsuleSlider
            value={tilt}
            min={0}
            max={100}
            step={1}
            onChange={handleTiltChange}
            icon={<ArrowsVertical size={20} weight="duotone" />}
            label="Slat Tilt"
            valueFormatter={(val) => `${Math.round(val)}%`}
            fillColor="#14b8a6"
            glowColor="rgba(20, 184, 166, 0.25)"
            darkMode={darkMode}
            heightClass="h-14 sm:h-15"
          />

          <div
            className={`flex justify-between text-[10px] font-mono px-1 ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <span>0° (Flat Closed)</span>
            <span>45° (Half Open)</span>
            <span>90° (Full Slat)</span>
          </div>
        </div>
      )}
    </div>
  );
}
