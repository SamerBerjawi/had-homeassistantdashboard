import React from 'react';
import { kelvinToRgb, LightCapabilities } from '../../../../services/lightClassification';
import { TONE_PRESETS } from '../../../../services/lightColor';
import type { StartDrag } from './lightPresets';

// White temperature tab: kelvin colour-bar slider and tone presets.
interface WarmthPanelProps {
  colorTempKelvin: number;
  kelvinTrackRef: React.RefObject<HTMLDivElement | null>;
  caps: LightCapabilities;
  startDrag: StartDrag;
  handleKelvinChange: (kelvin: number) => void;
  setIsDraggingKelvin: (dragging: boolean) => void;
  isDraggingKelvin: boolean;
  darkMode: boolean;
}

export default function WarmthPanel({
  colorTempKelvin,
  kelvinTrackRef,
  caps,
  startDrag,
  handleKelvinChange,
  setIsDraggingKelvin,
  isDraggingKelvin,
  darkMode
}: WarmthPanelProps) {
  return (
    <div className="space-y-3 pt-1 animate-fadeIn">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          White Temperature
        </span>
        <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
          {colorTempKelvin}K
        </span>
      </div>

      {/* Modern Kelvin Color-Bar Slider */}
      <div
        ref={kelvinTrackRef}
        onPointerDown={(e) => {
          const min = caps.minKelvin || 2000;
          const max = caps.maxKelvin || 6500;
          startDrag(
            e,
            kelvinTrackRef,
            (ratio) => {
              const kelvin = Math.round(min + ratio * (max - min));
              handleKelvinChange(kelvin);
            },
            setIsDraggingKelvin
          );
        }}
        className="h-11 rounded-2xl relative cursor-pointer shadow-inner border border-black/10 select-none flex items-center px-3"
      >
        {/* Background gradient container with rounded-2xl and overflow-hidden */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none flex items-center px-3"
          style={{
            background:
              'linear-gradient(to right, #ff7e1d 0%, #ffa54f 25%, #ffd5a6 50%, #ffffff 75%, #bcdcff 100%)'
          }}
        >
          {/* Embedded Kelvin Range Labels */}
          <span className="text-[11px] font-black uppercase text-amber-950/80 pointer-events-none drop-shadow-xs">
            Warm
          </span>
          <span className="ml-auto text-[11px] font-black uppercase text-sky-950/80 pointer-events-none drop-shadow-xs">
            Cool
          </span>
        </div>

        {/* Modern Floating Color-Core Thumb - Never Clipped, Always On Top */}
        {(() => {
          const min = caps.minKelvin || 2000;
          const max = caps.maxKelvin || 6500;
          const ratio = Math.max(0, Math.min(1, (colorTempKelvin - min) / (max - min)));
          return (
            <div
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-[0_3px_12px_rgba(0,0,0,0.35)] border-2 border-white flex items-center justify-center pointer-events-none transition-transform duration-100 z-30 ${
                isDraggingKelvin ? 'scale-115' : ''
              }`}
              style={{ left: `calc(18px + (${ratio} * (100% - 36px)))` }}
            >
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/10"
                style={{ backgroundColor: kelvinToRgb(colorTempKelvin) }}
              />
            </div>
          );
        })()}
      </div>

      {/* Tone Presets Row */}
      <div className="grid grid-cols-4 gap-2 pt-1">
        {TONE_PRESETS.map((preset) => {
          const isSelected = Math.abs(colorTempKelvin - preset.kelvin) <= 250;
          return (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleKelvinChange(preset.kelvin)}
              className={`h-9 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border flex items-center justify-center gap-1.5 ${
                isSelected
                  ? 'bg-amber-400 text-slate-950 font-black border-amber-300 shadow-xs'
                  : darkMode
                  ? 'bg-black/20 hover:bg-black/40 border-white/5 text-slate-300'
                  : 'bg-white/70 hover:bg-white border-slate-200/80 text-slate-800 font-bold shadow-xs'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full border border-black/20"
                style={{ backgroundColor: kelvinToRgb(preset.kelvin) }}
              />
              <span>{preset.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
