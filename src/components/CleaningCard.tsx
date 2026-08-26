/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  Leaf, 
  VolumeX,
  Play, 
  Square,
  Home,
  Database,
  Battery,
  Wrench,
  AlertTriangle
} from 'lucide-react';

interface CleaningCardProps {
  state: string;
  mode: string;
  battery: number;
  binStatus: string;
  lastCleaned: string;
  onToggle: () => void;
  onModeChange: (newMode: string) => void;
  onRecallDock: () => void;
  darkMode?: boolean;
  maintenanceDueText?: string;
  onViewHealth?: () => void;
}

export default function CleaningCard({
  state,
  mode,
  battery,
  binStatus,
  lastCleaned,
  onToggle,
  onModeChange,
  onRecallDock,
  darkMode = false,
  maintenanceDueText,
  onViewHealth
}: CleaningCardProps) {
  const isCleaning = state === 'on';
  
  // Calculate dynamic reactive glow intensity based on cleaning mode
  const getModeGlowFactor = () => {
    if (!isCleaning) return 0;
    if (mode === 'Turbo') return 1.0;
    if (mode === 'Eco') return 0.75;
    return 0.55; // Silent
  };
  
  const glowFactor = getModeGlowFactor();

  return (
    <motion.div 
      layout
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className={`relative rounded-[32px] p-6 shadow-sm border backdrop-blur-2xl overflow-hidden transition-all duration-300 glass-noise ${
        darkMode ? 'border-white/10 shadow-black/40' : 'border-white/70'
      }`}
      style={{
        background: darkMode
          ? isCleaning
            ? `radial-gradient(circle at 80% 20%, rgba(123, 97, 255, ${0.28 * glowFactor}) 0%, rgba(16, 185, 129, ${0.22 * glowFactor}) 50%, rgba(14, 21, 42, 0.92) 85%)`
            : 'rgba(15, 23, 44, 0.75)'
          : isCleaning
            ? `radial-gradient(circle at 80% 20%, rgba(123, 97, 255, ${0.16 * glowFactor}) 0%, rgba(16, 185, 129, ${0.12 * glowFactor}) 50%, rgba(255, 255, 255, 0.78) 90%)`
            : 'rgba(255, 255, 255, 0.65)'
      }}
    >
      {/* Subtle dynamic radial gradient mesh overlay */}
      {isCleaning && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: glowFactor }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 15% 85%, rgba(16, 185, 129, ${0.18 * glowFactor}) 0%, transparent 60%), radial-gradient(circle at 85% 15%, rgba(123, 97, 255, ${0.25 * glowFactor}) 0%, transparent 55%)`
          }}
        />
      )}

      <div className="flex justify-between items-center mb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className={`font-bold text-sm ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Vacuum robot</h3>
            {maintenanceDueText && (
              <button
                type="button"
                onClick={onViewHealth}
                title="Click to inspect maintenance status"
                className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 transition-colors cursor-pointer"
              >
                <Wrench size={10} />
                <span>{maintenanceDueText}</span>
              </button>
            )}
          </div>
          <p className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>{lastCleaned}</p>
        </div>
        
        {/* State Toggle with Reactive Brand-Purple Glow */}
        <div className="relative flex items-center justify-center">
          {isCleaning && (
            <motion.div 
              animate={{ 
                scale: [1, 1.08, 1],
                opacity: [0.4 * glowFactor, 0.75 * glowFactor, 0.4 * glowFactor]
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
            id="btn-vacuum-power"
            onClick={onToggle}
            className={`w-12 h-6.5 rounded-full relative transition-all cursor-pointer z-10 ${
              isCleaning 
                ? 'bg-[#7B61FF] shadow-lg ring-2 ring-[#7B61FF]/40' 
                : darkMode
                  ? 'bg-slate-700 hover:bg-slate-600'
                  : 'bg-slate-200 hover:bg-slate-300'
            }`}
            style={{
              boxShadow: isCleaning ? `0 4px ${12 + 16 * glowFactor}px rgba(123, 97, 255, ${0.4 + 0.4 * glowFactor})` : undefined
            }}
          >
            <div className={`absolute top-1 w-4.5 h-4.5 bg-white rounded-full transition-all shadow-sm ${
              isCleaning ? 'right-1' : 'left-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Decorative vacuum container with dynamic soft glow */}
      <div className={`flex items-center justify-center py-4 rounded-2xl relative overflow-hidden group z-10 ${
        darkMode ? 'bg-gradient-to-b from-[#7B61FF]/20 to-slate-900/40' : 'bg-gradient-to-b from-[#7B61FF]/10 to-transparent'
      }`}>
        {/* Soft Dynamic Purple Glow Backdrop */}
        <div className={`absolute inset-0 transition-opacity blur-2xl rounded-full pointer-events-none ${
          isCleaning ? 'bg-[#7B61FF] opacity-100 animate-pulse' : 'bg-[#7B61FF]/5 opacity-0 group-hover:opacity-100'
        }`}
        style={{
          opacity: isCleaning ? 0.2 + 0.25 * glowFactor : undefined
        }}
        />
        
        <div className="relative">
          {isCleaning && (
            <>
              <motion.div 
                animate={{ scale: [1, 1.15, 1], opacity: [0.3 * glowFactor, 0.6 * glowFactor, 0.3 * glowFactor] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="absolute -inset-3 bg-[#7B61FF] rounded-full blur-lg pointer-events-none" 
              />
              <div className="absolute inset-0 bg-[#7B61FF]/20 rounded-full animate-ping duration-1000" />
            </>
          )}
          
          <img 
            src="https://images.unsplash.com/photo-1518063319789-7217e6706b04?q=80&w=300&auto=format&fit=crop" 
            referrerPolicy="no-referrer"
            className={`w-28 h-28 object-cover rounded-full shadow-lg border-4 transition-all duration-700 relative z-10 ${
              darkMode ? (isCleaning ? 'border-[#7B61FF]' : 'border-slate-700') : (isCleaning ? 'rotate-12 scale-105 border-[#9E8AFF]' : 'border-white grayscale-25 opacity-90')
            }`} 
            style={{
              boxShadow: isCleaning ? `0 10px ${20 + 20 * glowFactor}px rgba(123, 97, 255, ${0.35 + 0.35 * glowFactor})` : undefined
            }}
            alt="Homz Smart Vacuum Robot" 
          />
          
          {/* Internal battery overlay */}
          <div className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[9px] font-black tracking-tight flex items-center gap-1 shadow-sm border z-20 ${
            darkMode ? 'bg-slate-900/95 text-slate-300 border-slate-700' : 'bg-white/95 text-slate-500 border-slate-100'
          }`}>
            <Battery size={10} className={battery < 20 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'} />
            <span>{battery}%</span>
          </div>
        </div>
      </div>

      {/* Modes Selection Grid */}
      <div className="flex gap-2 mt-4 relative z-10" id="group-vacuum-modes">
        {[
          { id: 'Silent', icon: VolumeX, label: 'Silent' },
          { id: 'Eco', icon: Leaf, label: 'Eco' },
          { id: 'Turbo', icon: Sparkles, label: 'Turbo' }
        ].map((item) => {
          const Icon = item.icon;
          const isActive = mode === item.id && isCleaning;
          return (
            <div key={item.id} className="relative flex-1 flex">
              {isActive && (
                <span 
                  className="absolute -inset-1 bg-[#7B61FF] rounded-2xl blur-sm animate-pulse pointer-events-none" 
                  style={{ opacity: 0.35 + 0.35 * glowFactor }}
                />
              )}
              <button
                disabled={!isCleaning}
                onClick={() => onModeChange(item.id)}
                className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed relative z-10 ${
                  isActive 
                    ? 'bg-[#7B61FF] border-[#7B61FF] text-white ring-2 ring-[#7B61FF]/40' 
                    : darkMode
                      ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-300'
                      : 'bg-white/80 border-slate-100 hover:bg-white text-slate-600'
                }`}
                style={{
                  boxShadow: isActive ? `0 4px ${10 + 12 * glowFactor}px rgba(123, 97, 255, ${0.4 + 0.3 * glowFactor})` : undefined
                }}
              >
                <Icon size={12} />
                <span>{item.label}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Grid actions: Docking and bins */}
      <div className={`grid grid-cols-2 gap-2 mt-2 pt-2 border-t text-[10px] font-semibold relative z-10 ${
        darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-100/60 text-slate-500'
      }`}>
        <div className="flex items-center gap-1.5 py-1">
          <Database size={12} className="text-slate-400" />
          <span>Bin: <strong className={darkMode ? 'text-slate-200' : 'text-slate-700'}>{binStatus}</strong></span>
        </div>
        
        <button 
          onClick={onRecallDock}
          disabled={!isCleaning}
          className={`flex items-center justify-end gap-1 disabled:opacity-30 transition-colors cursor-pointer text-right ${
            darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-slate-500 hover:text-[#7B61FF]'
          }`}
        >
          <Home size={12} />
          <span>Recall to Dock</span>
        </button>
      </div>
    </motion.div>
  );
}
