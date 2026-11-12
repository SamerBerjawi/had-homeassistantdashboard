import React from 'react';
import { Sun, Minus, Plus } from '@phosphor-icons/react';
import type { StartDrag } from './lightPresets';

// Brightness label, glass capsule slider and the quick [-] value [+] stepper.
interface BrightnessSectionProps {
  brightnessTrackRef: React.RefObject<HTMLDivElement | null>;
  startDrag: StartDrag;
  handleBrightnessChange: (val: number) => void;
  setIsDraggingBrightness: (dragging: boolean) => void;
  darkMode: boolean;
  isOn: boolean;
  brightness: number;
  lampIlluminationColor: string;
  isDraggingBrightness: boolean;
  handleStepBrightness: (delta: number) => void;
}

export default function BrightnessSection({
  brightnessTrackRef,
  startDrag,
  handleBrightnessChange,
  setIsDraggingBrightness,
  darkMode,
  isOn,
  brightness,
  lampIlluminationColor,
  isDraggingBrightness,
  handleStepBrightness
}: BrightnessSectionProps) {
  return (
    <div className="space-y-3">
      {/* Header: Label & Numerical Value */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Light Brightness
        </span>
        <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
          {isOn ? `${brightness}%` : '0%'}
        </span>
      </div>

      {/* Modern Glass Capsule Slider */}
      <div
        ref={brightnessTrackRef}
        onPointerDown={(e) =>
          startDrag(
            e,
            brightnessTrackRef,
            (ratio) => handleBrightnessChange(Math.round(ratio * 100)),
            setIsDraggingBrightness
          )
        }
        className={`h-12 rounded-2xl relative cursor-pointer flex items-center px-3.5 border transition-all duration-200 select-none shadow-inner ${
          darkMode
            ? 'bg-black/40 hover:bg-black/50 border-white/10'
            : 'bg-slate-100/90 hover:bg-slate-200/80 border-slate-300/80'
        }`}
      >
        {/* Inner track layer with overflow-hidden for fill & tick marks */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          {/* Tick Marks at 25%, 50%, 75% */}
          <div className="absolute inset-0 flex justify-between items-center px-12 opacity-25">
            <span className="w-0.5 h-3.5 rounded-full bg-current" />
            <span className="w-0.5 h-3.5 rounded-full bg-current" />
            <span className="w-0.5 h-3.5 rounded-full bg-current" />
          </div>

          {/* Illuminated Fill Bar with Gradient & Soft Glow */}
          <div
            className="absolute left-1.5 top-1.5 bottom-1.5 rounded-xl transition-all duration-75 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
            style={{
              width: isOn
                ? `calc(18px + (${Math.max(0, Math.min(100, brightness)) / 100} * (100% - 36px)))`
                : '0%',
              background:
                lampIlluminationColor !== 'transparent'
                  ? `linear-gradient(90deg, ${lampIlluminationColor}88 0%, ${lampIlluminationColor} 100%)`
                  : 'linear-gradient(90deg, #f59e0b88 0%, #f59e0b 100%)',
              opacity: 0.9
            }}
          />
        </div>

        {/* Dim Sun Glyph (Left Anchor) */}
        <Sun
          size={16}
          weight="duotone"
          className="text-slate-500 shrink-0 z-10 pointer-events-none"
        />

        {/* Modern Tactile Thumb Handle - Never Clipped, Always On Top */}
        {isOn && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-[0_3px_12px_rgba(0,0,0,0.35)] border-2 border-white/90 flex items-center justify-center pointer-events-none transition-transform duration-100 z-30 ${
              isDraggingBrightness ? 'scale-115 shadow-[0_6px_20px_rgba(0,0,0,0.45)]' : ''
            }`}
            style={{
              left: `calc(18px + (${Math.max(0, Math.min(100, brightness)) / 100} * (100% - 36px)))`
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full transition-colors"
              style={{
                backgroundColor:
                  lampIlluminationColor !== 'transparent' ? lampIlluminationColor : '#f59e0b'
              }}
            />
          </div>
        )}

        {/* Radiant Sun Glyph (Right Anchor) */}
        <Sun
          size={18}
          weight="fill"
          className={`ml-auto shrink-0 z-10 pointer-events-none transition-colors drop-shadow-xs ${
            isOn ? 'text-amber-500' : 'text-slate-400'
          }`}
        />
      </div>

      {/* Quick Stepper Capsule ([-] 60% [+]) */}
      <div className="flex items-center justify-center gap-4 pt-1">
        <button
          type="button"
          onClick={() => handleStepBrightness(-5)}
          disabled={!isOn || brightness <= 0}
          aria-label="Decrease brightness 5%"
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 border ${
            darkMode
              ? 'bg-black/30 hover:bg-black/50 border-white/10 text-slate-200'
              : 'bg-slate-200/90 hover:bg-slate-300 border-slate-300 text-slate-800 shadow-xs'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <Minus size={16} weight="bold" />
        </button>

        <div className="min-w-20 text-center">
          <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
            {isOn ? `${brightness}%` : '0%'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleStepBrightness(+5)}
          disabled={!isOn || brightness >= 100}
          aria-label="Increase brightness 5%"
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-md ${
            darkMode
              ? 'bg-white text-slate-950 hover:bg-slate-100'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <Plus size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
}
