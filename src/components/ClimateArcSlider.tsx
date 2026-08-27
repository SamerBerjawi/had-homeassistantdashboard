/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Minus, 
  Flame, 
  Snowflake, 
  Wind, 
  Power,
  Thermometer,
  Sparkle
} from '@phosphor-icons/react';

interface ClimateArcSliderProps {
  currentTemp: number;
  targetTemp: number;
  mode: string;
  fanMode: string;
  power: number;
  state: string;
  onTargetChange: (newTarget: number) => void;
  onModeChange: (newMode: string) => void;
  onPowerToggle: () => void;
  darkMode?: boolean;
}

export default function ClimateArcSlider({
  currentTemp,
  targetTemp,
  mode,
  fanMode,
  power,
  state,
  onTargetChange,
  onModeChange,
  onPowerToggle,
  darkMode = false
}: ClimateArcSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Supported settings range
  const minTemp = 16;
  const maxTemp = 32;

  // Manual Adjustments
  const increment = () => {
    if (targetTemp < maxTemp) {
      onTargetChange(targetTemp + 0.5);
    }
  };

  const decrement = () => {
    if (targetTemp > minTemp) {
      onTargetChange(targetTemp - 0.5);
    }
  };

  // Convert a temperature in [minTemp, maxTemp] to an angle from 180 degrees (left) to 0 degrees (right)
  const tempToPercentage = (temp: number) => {
    return (temp - minTemp) / (maxTemp - minTemp);
  };

  const percentage = tempToPercentage(targetTemp);
  
  // Dynamic glow factor based on state & thermal demand
  const tempDiff = Math.abs(targetTemp - currentTemp);
  const glowFactor = state === 'on' ? Math.min(1, 0.45 + (tempDiff / 8) * 0.55) : 0;
  
  const handleInteraction = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left - rect.width / 2;
    const y = clientY - rect.top - (rect.height * 0.75);
    
    let angle = Math.atan2(y, x) * (180 / Math.PI);
    let normalized = angle;
    if (normalized > 0) {
      normalized = x < 0 ? -180 : 0;
    }
    
    const rangePct = (normalized + 180) / 180;
    const finalTemp = Math.round((minTemp + rangePct * (maxTemp - minTemp)) * 2) / 2;
    onTargetChange(Math.max(minTemp, Math.min(maxTemp, finalTemp)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleInteraction(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleInteraction(e.clientX, e.clientY);
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    if (e.touches && e.touches[0]) {
      handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    if (e.touches && e.touches[0]) {
      handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  // Mesh color definition depending on active mode and dark mode
  const getMeshGradient = () => {
    if (darkMode) {
      if (state !== 'on') return 'rgba(15, 23, 44, 0.75)';
      if (mode === 'Cooling') {
        return `radial-gradient(circle at 85% 15%, rgba(56, 189, 248, 0.3) 0%, rgba(123, 97, 255, ${0.25 * glowFactor}) 45%, rgba(14, 21, 42, 0.92) 85%)`;
      }
      if (mode === 'Heating') {
        return `radial-gradient(circle at 85% 15%, rgba(251, 146, 60, 0.3) 0%, rgba(123, 97, 255, ${0.25 * glowFactor}) 45%, rgba(14, 21, 42, 0.92) 85%)`;
      }
      if (mode === 'Eco') {
        return `radial-gradient(circle at 85% 15%, rgba(52, 211, 153, 0.28) 0%, rgba(123, 97, 255, ${0.24 * glowFactor}) 45%, rgba(14, 21, 42, 0.92) 85%)`;
      }
      return `radial-gradient(circle at 85% 15%, rgba(123, 97, 255, 0.3) 0%, rgba(158, 138, 255, ${0.2 * glowFactor}) 45%, rgba(14, 21, 42, 0.92) 85%)`;
    }
    if (state !== 'on') return 'rgba(255, 255, 255, 0.65)';
    if (mode === 'Cooling') {
      return `radial-gradient(circle at 85% 15%, rgba(56, 189, 248, 0.22) 0%, rgba(123, 97, 255, ${0.15 * glowFactor}) 45%, rgba(255, 255, 255, 0.78) 90%)`;
    }
    if (mode === 'Heating') {
      return `radial-gradient(circle at 85% 15%, rgba(251, 146, 60, 0.22) 0%, rgba(123, 97, 255, ${0.15 * glowFactor}) 45%, rgba(255, 255, 255, 0.78) 90%)`;
    }
    if (mode === 'Eco') {
      return `radial-gradient(circle at 85% 15%, rgba(52, 211, 153, 0.2) 0%, rgba(123, 97, 255, ${0.14 * glowFactor}) 45%, rgba(255, 255, 255, 0.78) 90%)`;
    }
    return `radial-gradient(circle at 85% 15%, rgba(123, 97, 255, 0.2) 0%, rgba(158, 138, 255, ${0.12 * glowFactor}) 45%, rgba(255, 255, 255, 0.78) 90%)`;
  };

  return (
    <motion.div 
      layout
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className={`relative rounded-4xl p-6 shadow-sm border backdrop-blur-2xl overflow-hidden transition-all duration-300 glass-noise ${
        darkMode ? 'border-white/10 shadow-black/40' : 'border-white/70'
      }`}
      style={{ background: getMeshGradient() }}
    >
      {/* Subtle dynamic radial gradient mesh overlay */}
      {state === 'on' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: glowFactor }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 15% 85%, rgba(123, 97, 255, ${0.16 * glowFactor}) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(158, 138, 255, 0.2) 0%, transparent 55%)`
          }}
        />
      )}

      <div className="flex justify-between items-center mb-4 relative z-10">
        <div>
          <h3 className={`font-bold text-sm ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Climate control</h3>
          <p className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>Hass Climate Zone A</p>
        </div>
        
        {/* State Toggle with Reactive Brand-Purple Glow */}
        <div className="relative flex items-center justify-center">
          {state === 'on' && (
            <motion.div 
              animate={{ 
                scale: [1, 1.08, 1],
                opacity: [0.4 * glowFactor, 0.75 * glowFactor, 0.4 * glowFactor]
              }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
              className="absolute -inset-2 bg-brand-purple rounded-full blur-md pointer-events-none"
              style={{
                filter: `blur(${6 + 6 * glowFactor}px)`,
                boxShadow: `0 0 ${16 + 18 * glowFactor}px rgba(123, 97, 255, ${0.5 + 0.4 * glowFactor})`
              }}
            />
          )}
          <button 
            id="btn-climate-power"
            onClick={onPowerToggle}
            className={`w-12 h-6.5 rounded-full relative transition-all cursor-pointer z-10 ${
              state === 'on' 
                ? 'bg-brand-purple shadow-lg ring-2 ring-brand-purple/40' 
                : darkMode
                  ? 'bg-slate-700 hover:bg-slate-600'
                  : 'bg-slate-200 hover:bg-slate-300'
            }`}
            style={{
              boxShadow: state === 'on' ? `0 4px ${12 + 16 * glowFactor}px rgba(123, 97, 255, ${0.4 + 0.4 * glowFactor})` : undefined
            }}
          >
            <div className={`absolute top-1 w-4.5 h-4.5 bg-white rounded-full transition-all shadow-sm ${
              state === 'on' ? 'right-1' : 'left-1'
            }`} />
          </button>
        </div>
      </div>

      {/* SVG Container with center interaction and Dynamic Brand-Purple Dial Glow */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        className="relative flex flex-col items-center justify-center py-2 cursor-pointer select-none z-10"
      >
        {/* Soft dynamic ambient glow behind active dial */}
        {state === 'on' && (
          <motion.div 
            animate={{ opacity: [0.3 * glowFactor, 0.6 * glowFactor, 0.3 * glowFactor] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            className="absolute inset-x-8 top-4 h-24 bg-brand-purple blur-2xl rounded-full pointer-events-none" 
            style={{ filter: `blur(${16 + 12 * glowFactor}px)` }}
          />
        )}

        <svg viewBox="0 0 200 120" className="w-full max-w-55 overflow-visible">
          {/* Background Track dashed */}
          <path 
            d="M 30 100 A 70 70 0 0 1 170 100" 
            fill="none" 
            stroke={darkMode ? "#1e293b" : "#F1F5F9"} 
            strokeWidth="8" 
            strokeLinecap="round" 
          />
          <path 
            d="M 30 100 A 70 70 0 0 1 170 100" 
            fill="none" 
            stroke={darkMode ? "#334155" : "#E2E8F0"} 
            strokeWidth="8" 
            strokeDasharray="4 4" 
            strokeLinecap="round" 
          />
          
          {/* Soft Dynamic Glow layer behind progress sweep */}
          {state === 'on' && (
            <path 
              d="M 30 100 A 70 70 0 0 1 170 100" 
              fill="none" 
              stroke="#7B61FF" 
              strokeWidth={14 + 6 * glowFactor} 
              opacity={0.3 + 0.3 * glowFactor}
              strokeDasharray="220" 
              strokeDashoffset={220 - (220 * percentage)}
              strokeLinecap="round"
              filter="url(#purpleGlowFilter)"
              className="transition-all duration-300 ease-out pointer-events-none"
            />
          )}

          {/* Active Progress sweep */}
          <path 
            d="M 30 100 A 70 70 0 0 1 170 100" 
            fill="none" 
            stroke="url(#purpleGrad)" 
            strokeWidth="10" 
            strokeDasharray="220" 
            strokeDashoffset={220 - (220 * percentage)}
            strokeLinecap="round"
            className="transition-all duration-300 ease-out"
          />

          {/* Glowing indicator handle with soft aura */}
          {state === 'on' && (
            <g className="pointer-events-none transition-all duration-300">
              {/* Outer halo */}
              <circle 
                cx={100 + 70 * Math.cos((1 - percentage) * Math.PI)}
                cy={100 - 70 * Math.sin((1 - percentage) * Math.PI)}
                r={12 + 6 * glowFactor}
                fill="#7B61FF"
                opacity={0.25 * glowFactor}
                className="animate-ping duration-1000"
              />
              <circle 
                cx={100 + 70 * Math.cos((1 - percentage) * Math.PI)}
                cy={100 - 70 * Math.sin((1 - percentage) * Math.PI)}
                r="7.5"
                fill={darkMode ? "#0f172a" : "#FFFFFF"}
                stroke="#7B61FF"
                strokeWidth="4"
                filter="url(#handleGlow)"
              />
            </g>
          )}

          {/* Filter & Gradient Definitions */}
          <defs>
            <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7B61FF" />
              <stop offset="100%" stopColor="#9E8AFF" />
            </linearGradient>
            <filter id="purpleGlowFilter" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation={5 + 4 * glowFactor} result="blur" />
            </filter>
            <filter id="handleGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#7B61FF" floodOpacity={0.7 + 0.3 * glowFactor} />
            </filter>
          </defs>
        </svg>

        {/* Central Ambient and Target Temperature readout */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-12 flex flex-col items-center justify-center">
          <div className={`flex items-baseline ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            <span className="text-4xl font-extrabold tracking-tight" id="lbl-climate-target">
              {targetTemp}°
            </span>
            <span className="text-sm font-semibold text-slate-400">C</span>
          </div>
          <div className={`flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-full border shadow-inner ${
            darkMode ? 'bg-slate-900/90 border-slate-700' : 'bg-white/80 border-slate-100/80'
          }`}>
            <Thermometer size={14} weight="duotone" className="text-rose-400" />
            <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>
              Ambient: {currentTemp}°C
            </span>
          </div>
        </div>

        {/* Manual Taper Controls overlay */}
        <div className="flex justify-between items-center w-full px-8 mt-2 z-10">
          <button 
            id="btn-climate-down"
            onClick={(e) => { e.stopPropagation(); decrement(); }}
            disabled={state !== 'on'}
            className={`w-9 h-9 disabled:opacity-40 rounded-full flex items-center justify-center shadow-sm cursor-pointer transition-all border ${
              darkMode 
                ? 'bg-slate-800/90 hover:bg-brand-purple/20 text-slate-200 border-slate-700 hover:text-indigo-300' 
                : 'bg-white/90 hover:bg-brand-purple/10 hover:text-brand-purple text-slate-600 border-slate-100'
            }`}
          >
            <Minus size={15} weight="duotone" />
          </button>
          
          <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">TARGET</span>

          <button 
            id="btn-climate-up"
            onClick={(e) => { e.stopPropagation(); increment(); }}
            disabled={state !== 'on'}
            className={`w-9 h-9 disabled:opacity-40 rounded-full flex items-center justify-center shadow-sm cursor-pointer transition-all border ${
              darkMode 
                ? 'bg-slate-800/90 hover:bg-brand-purple/20 text-slate-200 border-slate-700 hover:text-indigo-300' 
                : 'bg-white/90 hover:bg-brand-purple/10 hover:text-brand-purple text-slate-600 border-slate-100'
            }`}
          >
            <Plus size={15} weight="duotone" />
          </button>
        </div>
      </div>

      {/* Operational Modes Grid */}
      <div className="grid grid-cols-4 gap-2 mt-4 relative z-10" id="grid-climate-modes">
        {[
          { id: 'Cooling', icon: Snowflake, color: darkMode ? 'text-sky-400 bg-sky-950/40 border-sky-800/50 hover:bg-sky-900/50' : 'text-sky-500 bg-sky-50 border-sky-100 hover:bg-sky-100' },
          { id: 'Heating', icon: Flame, color: darkMode ? 'text-orange-400 bg-orange-950/40 border-orange-800/50 hover:bg-orange-900/50' : 'text-orange-500 bg-orange-50 border-orange-100 hover:bg-orange-100' },
          { id: 'Dry', icon: Wind, color: darkMode ? 'text-indigo-400 bg-indigo-950/40 border-indigo-800/50 hover:bg-indigo-900/50' : 'text-indigo-500 bg-indigo-50 border-indigo-100 hover:bg-indigo-100' },
          { id: 'Eco', icon: Sparkle, color: darkMode ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50 hover:bg-emerald-900/50' : 'text-emerald-500 bg-emerald-50 border-emerald-100 hover:bg-emerald-100' }
        ].map((item) => {
          const Icon = item.icon;
          const isActive = mode === item.id && state === 'on';
          return (
            <div key={item.id} className="relative flex flex-col">
              {isActive && (
                <span 
                  className="absolute -inset-1 bg-brand-purple rounded-2xl blur-sm animate-pulse pointer-events-none" 
                  style={{ opacity: 0.35 + 0.35 * glowFactor }}
                />
              )}
              <button
                id={`btn-mode-${item.id}`}
                disabled={state !== 'on'}
                onClick={() => onModeChange(item.id)}
                className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 border transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed relative z-10 ${
                  isActive 
                    ? 'bg-brand-purple border-brand-purple text-white ring-2 ring-brand-purple/40' 
                    : `${item.color}`
                }`}
                style={{
                  boxShadow: isActive ? `0 4px ${10 + 12 * glowFactor}px rgba(123, 97, 255, ${0.4 + 0.3 * glowFactor})` : undefined
                }}
              >
                <Icon size={16} weight="duotone" />
                <span className="text-[9px] font-bold">{item.id}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Auxiliary Statistics Footer */}
      <div className={`mt-4 pt-3 border-t flex justify-between text-[11px] font-medium relative z-10 ${
        darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-100/60 text-slate-400'
      }`}>
        <span className="flex items-center gap-1">
          <Power size={13} weight="duotone" className={state === 'on' ? 'text-emerald-400 animate-pulse' : ''} />
          Est. Load: {state === 'on' ? `${power} W` : '0 W'}
        </span>
        <span>
          Fan Speed: {state === 'on' ? fanMode : 'Off'}
        </span>
      </div>
    </motion.div>
  );
}
