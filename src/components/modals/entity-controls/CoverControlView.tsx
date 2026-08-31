import React, { useState, useEffect, useMemo } from 'react';
import {
  AppWindow,
  ArrowUp,
  ArrowDown,
  Stop,
  SlidersHorizontal,
  ArrowsVertical,
  HouseLine,
  Garage,
  Door
} from '@phosphor-icons/react';
import { HAEntity } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { formatRelativeTime } from '../../../lib/utils';
import {
  detectCoverCapabilities,
  CoverCapabilities
} from '../../../services/coverClassification';

interface CoverControlViewProps {
  entity: HAEntity;
}

export default function CoverControlView({ entity }: CoverControlViewProps) {
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
    setPosition(val);
    const nextState = val === 0 ? 'closed' : 'open';
    updateEntityState(entity.entity_id, nextState, {
      ...entity.attributes,
      current_position: val
    });
    callHAService('cover', 'set_cover_position', { position: val }, { entity_id: entity.entity_id });
  };

  const handleTiltChange = (val: number) => {
    setTilt(val);
    updateEntityState(entity.entity_id, entity.state, {
      ...entity.attributes,
      current_tilt_position: val
    });
    callHAService('cover', 'set_cover_tilt_position', { tilt_position: val }, { entity_id: entity.entity_id });
  };

  const lastChangedStr = formatRelativeTime(caps.lastChanged);

  return (
    <div className="space-y-5">
      {/* 1. MASTER HERO COVER CARD WITH VISUAL BLIND PREVIEW */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-800/40 border border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-md">
        {/* Dynamic ambient glow aura */}
        <div
          className={`absolute -inset-10 opacity-30 blur-3xl rounded-full transition-all duration-500 pointer-events-none ${
            position > 0 ? 'bg-sky-500/40' : 'bg-transparent'
          }`}
        />

        {/* Visual Animated Window Blind / Slat Representation */}
        <div className="w-28 h-32 sm:w-32 sm:h-36 rounded-2xl bg-slate-900 border-2 border-white/20 p-2 relative flex flex-col justify-between overflow-hidden shadow-2xl mb-3">
          {/* Window Frame Glass Backdrop */}
          <div className="absolute inset-0 bg-gradient-to-b from-sky-400/20 to-indigo-500/20" />

          {/* Slat Sliders Roll-down effect */}
          <div
            className="w-full bg-slate-800/95 border-b-2 border-sky-400/80 transition-all duration-300 flex flex-col gap-1 p-1 z-10 shadow-lg"
            style={{ height: `${100 - position}%` }}
          >
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="w-full h-1 bg-slate-600/60 rounded-full" />
            ))}
          </div>

          <div className="z-10 w-full text-center py-1 mt-auto">
            <span className="text-[10px] font-mono font-bold text-slate-300">
              {position === 0 ? 'Fully Closed' : position === 100 ? 'Fully Open' : `${position}% Open`}
            </span>
          </div>
        </div>

        {/* Headline */}
        <h3 className="text-xl font-black text-white tracking-tight">
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

        <p className="text-xs text-slate-400 font-medium mt-1">
          {caps.deviceClassLabel}
          {lastChangedStr && ` • ${lastChangedStr}`}
        </p>

        {/* Master Transport Actions (Open, Stop, Close) */}
        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            onClick={handleOpen}
            disabled={position === 100}
            className="px-4 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowUp size={16} weight="bold" />
            <span>Open</span>
          </button>

          {caps.supportsStop && (
            <button
              type="button"
              onClick={handleStop}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-white/10"
              title="Stop Motion"
            >
              <Stop size={16} weight="fill" />
            </button>
          )}

          <button
            type="button"
            onClick={handleClose}
            disabled={position === 0}
            className="px-4 py-2.5 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowDown size={16} weight="bold" />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* 2. POSITION CONTROL SLIDER & PRESETS (Strictly if supportsPosition) */}
      {caps.supportsPosition && (
        <div className="space-y-3 p-4 rounded-2xl bg-slate-800/30 border border-white/10">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400">
              <SlidersHorizontal size={15} weight="duotone" />
              <span>Target Position</span>
            </span>
            <span className="font-mono text-white">{position}%</span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={position}
            onChange={(e) => handlePositionChange(Number(e.target.value))}
            className="w-full h-2.5 bg-slate-700/60 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />

          {/* Quick Position Jump Chips */}
          <div className="flex justify-between gap-1">
            {[0, 25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handlePositionChange(pct)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer active:scale-95 ${
                  position === pct
                    ? 'bg-sky-500 text-slate-950 font-extrabold shadow-sm'
                    : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {pct === 0 ? 'Closed' : pct === 100 ? 'Open' : `${pct}%`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. VENETIAN SLAT TILT SLIDER (Strictly if supportsTilt) */}
      {caps.supportsTilt && (
        <div className="space-y-3 p-4 rounded-2xl bg-slate-800/30 border border-white/10">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400">
              <ArrowsVertical size={15} weight="duotone" className="text-teal-400" />
              <span>Slat Tilt Angle</span>
            </span>
            <span className="font-mono text-white">{tilt}%</span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={tilt}
            onChange={(e) => handleTiltChange(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-400"
          />

          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>0° Flat</span>
            <span>45° Half</span>
            <span>90° Open</span>
          </div>
        </div>
      )}
    </div>
  );
}
