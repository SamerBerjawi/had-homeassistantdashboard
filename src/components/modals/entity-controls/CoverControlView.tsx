import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Stop,
  SlidersHorizontal,
  ArrowsVertical
} from '@phosphor-icons/react';
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
}

export default function CoverControlView({ entity, darkMode = true }: CoverControlViewProps) {
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

  return (
    <div className="space-y-6">
      {/* 1. MASTER HERO COVER CARD WITH VISUAL BLIND PREVIEW */}
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
            position > 0 ? 'bg-sky-500/35' : 'bg-transparent'
          }`}
        />

        {/* Visual Animated Window Blind Graphic */}
        <div
          className={`w-32 h-36 sm:w-36 sm:h-40 rounded-3xl p-2.5 relative flex flex-col justify-between overflow-hidden shadow-2xl mb-3 border-2 ${
            darkMode
              ? 'bg-slate-950 border-white/20'
              : 'bg-slate-900 border-slate-300 shadow-slate-300/50'
          }`}
        >
          {/* Window Frame Glass Backdrop */}
          <div className="absolute inset-0 bg-gradient-to-b from-sky-400/25 to-indigo-600/30" />

          {/* Slat Sliders Roll-down effect */}
          <div
            className="w-full bg-slate-800/95 border-b-2 border-sky-400 transition-all duration-300 flex flex-col gap-1 p-1 z-10 shadow-lg rounded-t-xl"
            style={{ height: `${100 - position}%` }}
          >
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="w-full h-1 bg-slate-600/60 rounded-full" />
            ))}
          </div>

          <div className="z-10 w-full text-center py-1 mt-auto">
            <span className="text-[11px] font-mono font-extrabold text-white drop-shadow-md">
              {position === 0 ? 'Fully Closed' : position === 100 ? 'Fully Open' : `${position}% Open`}
            </span>
          </div>
        </div>

        {/* Headline */}
        <h3
          className={`text-xl sm:text-2xl font-black tracking-tight ${
            darkMode ? 'text-white' : 'text-slate-900'
          }`}
        >
          {caps.isOpening
            ? 'Opening...'
            : caps.isClosing
            ? 'Closing...'
            : position === 0
            ? 'Closed'
            : position === 100
            ? 'Fully Open'
            : `Open (${position}%)`}
        </h3>

        <p
          className={`text-xs font-medium mt-1 flex items-center gap-1.5 ${
            darkMode ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          <span>{caps.deviceClassLabel}</span>
          {lastChangedStr && (
            <>
              <span>•</span>
              <span>{lastChangedStr}</span>
            </>
          )}
        </p>

        {/* Master Transport Actions (Open, Stop, Close) */}
        <div className="flex items-center gap-2.5 sm:gap-3 mt-4 w-full max-w-xs justify-center">
          <button
            type="button"
            onClick={handleOpen}
            disabled={position === 100}
            className="flex-1 h-12 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowUp size={18} weight="bold" />
            <span>Open</span>
          </button>

          {caps.supportsStop && (
            <button
              type="button"
              onClick={handleStop}
              className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-md ${
                darkMode
                  ? 'bg-white/10 hover:bg-white/15 text-slate-200 border-white/10'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title="Stop Motion"
            >
              <Stop size={18} weight="fill" />
            </button>
          )}

          <button
            type="button"
            onClick={handleClose}
            disabled={position === 0}
            className={`flex-1 h-12 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md disabled:opacity-40 disabled:cursor-not-allowed ${
              darkMode
                ? 'bg-slate-700 hover:bg-slate-600 text-white'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            <ArrowDown size={18} weight="bold" />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. POSITION CONTROL CAPSULE SLIDER & PRESETS */}
      {/* ========================================================================= */}
      {caps.supportsPosition && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span
              className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                darkMode ? 'text-sky-400' : 'text-sky-600'
              }`}
            >
              <SlidersHorizontal size={15} weight="duotone" />
              <span>Target Position</span>
            </span>
            <span
              className={`font-mono text-xs font-extrabold ${
                darkMode ? 'text-sky-300' : 'text-sky-700'
              }`}
            >
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
            glowColor="rgba(2, 132, 199, 0.3)"
            darkMode={darkMode}
            heightClass="h-14 sm:h-15"
          />

          {/* Quick Position Jump Chips */}
          <div className="grid grid-cols-5 gap-2">
            {[0, 25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handlePositionChange(pct)}
                className={`h-11 rounded-2xl text-xs font-extrabold transition-all cursor-pointer active:scale-95 flex items-center justify-center border ${
                  position === pct
                    ? 'bg-sky-500 text-slate-950 font-black shadow-md border-sky-400 ring-2 ring-sky-400/30'
                    : darkMode
                    ? 'bg-slate-800/50 hover:bg-slate-800 border-white/10 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                }`}
              >
                {pct === 0 ? 'Closed' : pct === 100 ? 'Open' : `${pct}%`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VENETIAN SLAT TILT SLIDER */}
      {/* ========================================================================= */}
      {caps.supportsTilt && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span
              className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                darkMode ? 'text-teal-400' : 'text-teal-600'
              }`}
            >
              <ArrowsVertical size={15} weight="duotone" />
              <span>Slat Tilt Angle</span>
            </span>
            <span
              className={`font-mono text-xs font-extrabold ${
                darkMode ? 'text-teal-300' : 'text-teal-700'
              }`}
            >
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
            glowColor="rgba(20, 184, 166, 0.3)"
            darkMode={darkMode}
            heightClass="h-14 sm:h-15"
          />

          <div
            className={`flex justify-between text-[11px] font-mono px-1 ${
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
