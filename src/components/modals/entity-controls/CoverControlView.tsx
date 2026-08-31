import React, { useState, useEffect } from 'react';
import {
  AppWindow,
  ArrowUp,
  ArrowDown,
  Stop,
  SlidersHorizontal,
  ArrowsVertical
} from '@phosphor-icons/react';
import { HAEntity } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';

interface CoverControlViewProps {
  entity: HAEntity;
}

export default function CoverControlView({ entity }: CoverControlViewProps) {
  const { callHAService, updateEntityState } = useAutoLayoutStore();

  const isClosed = entity?.state === 'closed';
  const isOpening = entity?.state === 'opening';
  const isClosing = entity?.state === 'closing';

  const rawPosition = typeof entity?.attributes?.current_position === 'number'
    ? entity.attributes.current_position
    : isClosed
    ? 0
    : 100;
  const rawTilt = typeof entity?.attributes?.current_tilt_position === 'number'
    ? entity.attributes.current_tilt_position
    : 0;

  const [position, setPosition] = useState<number>(rawPosition);
  const [tilt, setTilt] = useState<number>(rawTilt);

  useEffect(() => {
    if (entity) {
      const p = typeof entity.attributes?.current_position === 'number'
        ? entity.attributes.current_position
        : entity.state === 'closed'
        ? 0
        : 100;
      setPosition(p);

      if (typeof entity.attributes?.current_tilt_position === 'number') {
        setTilt(entity.attributes.current_tilt_position);
      }
    }
  }, [entity?.entity_id, entity?.state, entity?.attributes]);

  const supportsTilt =
    typeof entity?.attributes?.current_tilt_position === 'number' ||
    Boolean(entity?.attributes?.supported_features && (entity.attributes.supported_features & 128));

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

  return (
    <div className="space-y-6">
      {/* Cover Position Visual Window */}
      <div className="p-6 rounded-3xl bg-slate-800/40 border border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-md">
        {/* Animated Window Graphic */}
        <div className="w-32 h-40 rounded-2xl border-4 border-slate-700 bg-slate-900/80 relative overflow-hidden flex flex-col justify-end shadow-2xl mb-3">
          {/* Slat Lines Background */}
          <div
            className="w-full bg-linear-to-b from-indigo-500/30 to-purple-600/40 border-b-2 border-indigo-400/80 transition-all duration-300 relative"
            style={{ height: `${100 - position}%` }}
          >
            {/* Blinds texture slats */}
            <div className="absolute inset-0 bg-repeating-linear-to-b from-white/10 via-transparent to-transparent bg-size-[100%_8px]" />
          </div>

          <div className="absolute top-2 inset-x-0 flex justify-center">
            <AppWindow size={20} weight="duotone" className="text-slate-500" />
          </div>
        </div>

        <h3 className="text-xl font-extrabold font-mono text-white tracking-tight">
          {position}% Open
        </h3>
        <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest mt-0.5">
          {isOpening
            ? 'Opening...'
            : isClosing
            ? 'Closing...'
            : isClosed
            ? 'Fully Closed'
            : position === 100
            ? 'Fully Open'
            : 'Partially Open'}
        </p>
      </div>

      {/* Direct Action Control Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={handleOpen}
          className="p-4 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 border border-white/10 text-white flex flex-col items-center gap-1.5 transition-all cursor-pointer active:scale-95 hover:border-indigo-400/40"
        >
          <ArrowUp size={22} weight="bold" className="text-indigo-400" />
          <span className="text-xs font-bold">Open</span>
        </button>

        <button
          type="button"
          onClick={handleStop}
          className="p-4 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 border border-white/10 text-white flex flex-col items-center gap-1.5 transition-all cursor-pointer active:scale-95 hover:border-rose-400/40"
        >
          <Stop size={22} weight="bold" className="text-rose-400" />
          <span className="text-xs font-bold">Stop</span>
        </button>

        <button
          type="button"
          onClick={handleClose}
          className="p-4 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 border border-white/10 text-white flex flex-col items-center gap-1.5 transition-all cursor-pointer active:scale-95 hover:border-indigo-400/40"
        >
          <ArrowDown size={22} weight="bold" className="text-indigo-400" />
          <span className="text-xs font-bold">Close</span>
        </button>
      </div>

      {/* Position Precision Slider */}
      <div className="space-y-2 p-4 rounded-2xl bg-slate-800/30 border border-white/10">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
          <span className="flex items-center gap-1.5 text-indigo-400">
            <SlidersHorizontal size={16} weight="duotone" />
            <span>Blind Position</span>
          </span>
          <span className="font-mono text-indigo-300">{position}%</span>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          value={position}
          onChange={(e) => handlePositionChange(Number(e.target.value))}
          className="w-full h-2.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-indigo-400"
        />

        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>0% (Closed)</span>
          <span>50%</span>
          <span>100% (Open)</span>
        </div>
      </div>

      {/* Slat Tilt Angle Slider (if supported) */}
      {supportsTilt && (
        <div className="space-y-2 p-4 rounded-2xl bg-slate-800/30 border border-white/10">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5 text-purple-400">
              <ArrowsVertical size={16} weight="duotone" />
              <span>Slat Tilt Angle</span>
            </span>
            <span className="font-mono text-purple-300">{tilt}%</span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={tilt}
            onChange={(e) => handleTiltChange(Number(e.target.value))}
            className="w-full h-2.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-purple-400"
          />

          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>0° (Flat)</span>
            <span>45°</span>
            <span>90° (Vertical)</span>
          </div>
        </div>
      )}
    </div>
  );
}
