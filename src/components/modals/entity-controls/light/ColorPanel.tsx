import React from 'react';
import { DESIGNER_COLORS } from '../../../../services/lightColor';
import type { StartDrag } from './lightPresets';

// Chromatic colour tab: 360 degree hue slider and designer colour swatches.
interface ColorPanelProps {
  selectedColor: string;
  hueTrackRef: React.RefObject<HTMLDivElement | null>;
  startDrag: StartDrag;
  handleHueChange: (hue: number) => void;
  setIsDraggingHue: (dragging: boolean) => void;
  currentHue: number;
  isDraggingHue: boolean;
  handleSelectColorSwatch: (swatch: (typeof DESIGNER_COLORS)[0]) => void;
}

export default function ColorPanel({
  selectedColor,
  hueTrackRef,
  startDrag,
  handleHueChange,
  setIsDraggingHue,
  currentHue,
  isDraggingHue,
  handleSelectColorSwatch
}: ColorPanelProps) {
  return (
    <div className="space-y-3 pt-1 animate-fadeIn">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Spectrum Palette
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-xs"
            style={{ backgroundColor: selectedColor }}
          />
          <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
            {selectedColor}
          </span>
        </div>
      </div>

      {/* Modern Full Spectrum 360° Rainbow Slider Track */}
      <div
        ref={hueTrackRef}
        onPointerDown={(e) =>
          startDrag(
            e,
            hueTrackRef,
            (ratio) => {
              const hue = Math.round(ratio * 360);
              handleHueChange(hue);
            },
            setIsDraggingHue
          )
        }
        className="h-11 rounded-2xl relative cursor-pointer shadow-inner border border-black/10 select-none flex items-center px-3"
      >
        {/* Background rainbow container with rounded-2xl and overflow-hidden */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
          style={{
            background:
              'linear-gradient(to right, #ff0000 0%, #ff8000 14%, #ffff00 28%, #00ff00 42%, #00ffff 57%, #0000ff 71%, #8000ff 85%, #ff00ff 93%, #ff0000 100%)'
          }}
        />

        {/* Modern Floating Rainbow Core Thumb - Never Clipped, Always On Top */}
        {(() => {
          const ratio = Math.max(0, Math.min(1, currentHue / 360));
          return (
            <div
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-[0_3px_12px_rgba(0,0,0,0.35)] border-2 border-white flex items-center justify-center pointer-events-none transition-transform duration-100 z-30 ${
                isDraggingHue ? 'scale-115' : ''
              }`}
              style={{ left: `calc(18px + (${ratio} * (100% - 36px)))` }}
            >
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/10"
                style={{ backgroundColor: selectedColor }}
              />
            </div>
          );
        })()}
      </div>

      {/* Designer Curated Color Dots */}
      <div className="flex items-center justify-between gap-2 pt-1 px-1">
        {DESIGNER_COLORS.map((swatch) => {
          const isSelected =
            selectedColor.toLowerCase() === swatch.hex.toLowerCase();
          return (
            <button
              key={swatch.name}
              type="button"
              onClick={() => handleSelectColorSwatch(swatch)}
              className={`w-9 h-9 rounded-full transition-all cursor-pointer hover:scale-110 active:scale-95 shadow-md flex items-center justify-center border ${
                isSelected
                  ? 'ring-3 ring-white ring-offset-2 ring-offset-black/40 scale-110 border-white'
                  : 'border-black/15 opacity-90 hover:opacity-100'
              }`}
              style={{ backgroundColor: swatch.hex }}
              title={swatch.name}
            />
          );
        })}
      </div>
    </div>
  );
}
