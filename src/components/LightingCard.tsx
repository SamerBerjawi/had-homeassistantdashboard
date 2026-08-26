/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  Lightbulb, 
  Droplets,
  Power,
  Zap
} from 'lucide-react';

interface LightingCardProps {
  state: string;
  brightness: number;
  color: string;
  friendlyName: string;
  power: number;
  onToggle: () => void;
  onBrightnessChange: (val: number) => void;
  onColorChange: (val: string) => void;
  darkMode?: boolean;
}

const PRESET_COLORS = [
  { hex: '#fef3c7', label: 'Warm Amber' },
  { hex: '#FFFFFF', label: 'Soft White' },
  { hex: '#7B61FF', label: 'Cool Indigo' },
  { hex: '#F43F5E', label: 'Sunset Red' },
  { hex: '#10B981', label: 'Forest Green' }
];

export default function LightingCard({
  state,
  brightness,
  color,
  friendlyName,
  power,
  onToggle,
  onBrightnessChange,
  onColorChange,
  darkMode = false
}: LightingCardProps) {
  const isOn = state === 'on';
  const glowFactor = isOn ? Math.max(0.15, brightness / 100) : 0;

  return (
    <motion.div 
      layout
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className={`relative rounded-[32px] p-6 shadow-sm border backdrop-blur-2xl overflow-hidden transition-all duration-300 glass-noise ${
        darkMode ? 'border-white/10 shadow-black/40' : 'border-white/70'
      }`}
      style={{
        background: darkMode
          ? isOn
            ? `radial-gradient(circle at 85% 15%, ${color}35 0%, rgba(123, 97, 255, ${0.28 * glowFactor}) 45%, rgba(14, 21, 42, 0.92) 85%)`
            : 'rgba(15, 23, 44, 0.75)'
          : isOn
            ? `radial-gradient(circle at 85% 15%, ${color}22 0%, rgba(123, 97, 255, ${0.12 * glowFactor}) 45%, rgba(255, 255, 255, 0.78) 90%)`
            : 'rgba(255, 255, 255, 0.65)'
      }}
    >
      {/* Subtle dynamic radial gradient mesh overlay */}
      {isOn && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: glowFactor }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 20% 80%, rgba(123, 97, 255, ${0.22 * glowFactor}) 0%, transparent 60%), radial-gradient(circle at 75% 25%, ${color}30 0%, transparent 50%)`
          }}
        />
      )}

      <div className="flex justify-between items-center mb-4 relative z-10">
        <div>
          <h3 className={`font-bold text-sm ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Lighting</h3>
          <p className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>{friendlyName}</p>
        </div>
        
        {/* State Toggle with Dynamic Reactive Brand-Purple Glow */}
        <div className="relative flex items-center justify-center">
          {isOn && (
            <motion.div 
              animate={{ 
                scale: [1, 1.08, 1],
                opacity: [0.4 * glowFactor, 0.7 * glowFactor, 0.4 * glowFactor]
              }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
              className="absolute -inset-2 bg-[#7B61FF] rounded-full blur-md pointer-events-none"
              style={{
                filter: `blur(${6 + 6 * glowFactor}px)`,
                boxShadow: `0 0 ${16 + 18 * glowFactor}px rgba(123, 97, 255, ${0.5 + 0.4 * glowFactor})`
              }}
            />
          )}
          <button 
            id="btn-lighting-power"
            onClick={onToggle}
            className={`w-12 h-6.5 rounded-full relative transition-all cursor-pointer z-10 ${
              isOn 
                ? 'bg-[#7B61FF] shadow-lg ring-2 ring-[#7B61FF]/40' 
                : darkMode
                  ? 'bg-slate-700 hover:bg-slate-600'
                  : 'bg-slate-200 hover:bg-slate-300'
            }`}
            style={{
              boxShadow: isOn ? `0 4px ${12 + 16 * glowFactor}px rgba(123, 97, 255, ${0.4 + 0.4 * glowFactor})` : undefined
            }}
          >
            <div className={`absolute top-1 w-4.5 h-4.5 bg-white rounded-full transition-all shadow-sm ${
              isOn ? 'right-1' : 'left-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Glossy Visual Bulb container with dynamic multi-tiered glow */}
      <div className="flex justify-center py-4 relative z-10">
        <div 
          className="w-24 h-24 rounded-full flex items-center justify-center relative transition-all duration-500"
          style={{ 
            backgroundColor: isOn ? `${color}25` : darkMode ? '#1e293b' : '#f1f5f9',
            boxShadow: isOn 
              ? `0 0 ${20 + 25 * glowFactor}px -2px rgba(123, 97, 255, ${0.4 * glowFactor}), 0 16px 32px -12px ${color}80, inset 0 2px 8px ${darkMode ? 'rgba(255,255,255,0.2)' : '#ffffff'}` 
              : 'none'
          }}
        >
          {isOn && (
            <>
              <span 
                className="absolute inset-0 rounded-full animate-ping duration-1000 opacity-25 pointer-events-none" 
                style={{ backgroundColor: color }}
              />
              <span 
                className="absolute -inset-2 rounded-full bg-[#7B61FF] blur-lg animate-pulse pointer-events-none"
                style={{ opacity: 0.15 + 0.25 * glowFactor }}
              />
            </>
          )}
          
          <Lightbulb 
            size={36} 
            className="transition-all duration-500 relative z-10"
            style={{ 
              color: isOn ? color : darkMode ? '#64748b' : '#94a3b8',
              filter: isOn 
                ? `drop-shadow(0 0 ${8 + 12 * glowFactor}px #7B61FF) drop-shadow(0 0 ${6 + 6 * glowFactor}px ${color})` 
                : 'none'
            }} 
          />
        </div>
      </div>

      {/* Palette Selector dots */}
      <div className="flex justify-center gap-3.5 mb-4 relative z-10" id="group-lighting-colors">
        {PRESET_COLORS.map((item) => {
          const isSelected = color.toLowerCase() === item.hex.toLowerCase() && isOn;
          return (
            <div key={item.hex} className="relative flex items-center justify-center">
              {isSelected && (
                <span 
                  className="absolute -inset-1.5 rounded-full bg-[#7B61FF] blur-sm animate-pulse pointer-events-none" 
                  style={{ opacity: 0.35 + 0.45 * glowFactor }}
                />
              )}
              <button
                id={`btn-color-${item.label}`}
                disabled={!isOn}
                onClick={() => onColorChange(item.hex)}
                title={item.label}
                className={`w-5.5 h-5.5 rounded-full border transition-all cursor-pointer hover:scale-110 disabled:opacity-30 disabled:hover:scale-100 relative z-10 ${
                  isSelected 
                    ? 'border-white scale-110 shadow-lg ring-2 ring-[#7B61FF]' 
                    : darkMode
                      ? 'border-slate-600 shadow-inner'
                      : 'border-white shadow-inner'
                }`}
                style={{ 
                  backgroundColor: item.hex,
                  boxShadow: isSelected ? `0 0 ${8 + 10 * glowFactor}px rgba(123, 97, 255, 0.7)` : undefined
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Dimmer Percentage bar with Reactive Glow & Dynamic intensity */}
      <div className="flex flex-col gap-1 relative z-10">
        <div className={`flex justify-between items-center text-[10px] font-bold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>
          <span>BRIGHTNESS INTENSITY</span>
          <span className={`font-extrabold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{isOn ? `${brightness}%` : 'Off'}</span>
        </div>
        
        <div className={`relative flex items-center h-9 border rounded-2xl px-3 group overflow-visible ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50/90 border-slate-100/80'
        }`}>
          {/* Dynamic soft purple accent light glow behind active slider - scales with brightness % */}
          {isOn && (
            <motion.div 
              animate={{
                opacity: [0.4 * glowFactor, 0.75 * glowFactor, 0.4 * glowFactor]
              }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="absolute -inset-1 rounded-2xl pointer-events-none transition-all duration-300" 
              style={{
                background: 'linear-gradient(90deg, rgba(123, 97, 255, 0.35) 0%, rgba(158, 138, 255, 0.5) 50%, rgba(123, 97, 255, 0.3) 100%)',
                filter: `blur(${4 + 6 * glowFactor}px)`,
                boxShadow: `0 0 ${10 + 20 * glowFactor}px rgba(123, 97, 255, ${0.35 * glowFactor})`
              }}
            />
          )}

          {/* Slidable input */}
          <input
            id="slider-lighting-brightness"
            type="range"
            min="10"
            max="100"
            value={isOn ? brightness : 0}
            disabled={!isOn}
            onChange={(e) => onBrightnessChange(Number(e.target.value))}
            className="w-full glow-slider-thumb accent-[#7B61FF] bg-transparent disabled:opacity-40 cursor-pointer h-2.5 z-10 relative"
          />
          
          {/* Visual track filling */}
          {isOn && (
            <div 
              className="absolute left-0 top-0 h-full rounded-2xl pointer-events-none transition-all duration-100 overflow-hidden"
              style={{ 
                width: `${brightness}%`, 
                backgroundColor: `rgba(123, 97, 255, ${0.18 + 0.22 * glowFactor})`,
                boxShadow: `inset 0 0 ${8 + 12 * glowFactor}px rgba(123, 97, 255, ${0.3 + 0.3 * glowFactor})`,
                borderRight: `2.5px solid #7B61FF`
              }}
            />
          )}
          
          <div className="absolute right-3.5 pointer-events-none z-10">
            <Droplets 
              size={12} 
              className="transition-all"
              style={{ 
                color: isOn ? '#7B61FF' : darkMode ? '#64748b' : '#94a3b8',
                filter: isOn ? `drop-shadow(0 0 ${4 + 6 * glowFactor}px #7B61FF)` : 'none'
              }} 
            />
          </div>
        </div>
      </div>

      {/* Power stats */}
      <div className={`mt-4 pt-3 border-t flex items-center justify-between text-[11px] font-medium relative z-10 ${
        darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-100/60 text-slate-400'
      }`}>
        <span className="flex items-center gap-1">
          <Zap size={10} className={isOn ? 'text-amber-400' : ''} />
          Usage: {isOn ? `${power} W` : '0 W'}
        </span>
        <span className="text-[10px] font-semibold">
          Spectrum Tunable LED
        </span>
      </div>
    </motion.div>
  );
}
