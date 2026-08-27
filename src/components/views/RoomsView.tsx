import React from 'react';
import { Armchair, Lightbulb, Thermometer, Fan, Television, Sparkle, House, Couch } from '@phosphor-icons/react';

interface ViewProps {
  darkMode?: boolean;
}

export default function RoomsView({ darkMode = true }: ViewProps) {
  return (
    <div className="w-full flex-1 flex flex-col">
      {/* 4-column mobile grid / adaptive desktop grid container */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-3.5 sm:gap-4.5">
        <div className={`col-span-4 sm:col-span-6 md:col-span-8 lg:col-span-12 p-8 sm:p-12 rounded-3xl backdrop-blur-xl border flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[360px] ${
          darkMode 
            ? 'bg-black/60 border-white/10 text-white' 
            : 'bg-white/80 border-slate-200/90 text-slate-900 shadow-sm'
        }`}>
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/10 mb-4">
            <Armchair size={32} weight="duotone" />
          </div>

          <h3 className={`text-lg sm:text-xl font-black tracking-tight mb-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Rooms & Living Areas
          </h3>
          <p className={`text-xs sm:text-sm max-w-md mb-6 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Manage your smart home room-by-room with dedicated controls for lighting scenes, climate setpoints, media playback, and environment sensors.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
              darkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100/90 border-slate-200 text-slate-700'
            }`}>
              <Couch size={15} weight="duotone" className="text-indigo-400" />
              <span>Living Room</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
              darkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100/90 border-slate-200 text-slate-700'
            }`}>
              <Lightbulb size={15} weight="duotone" className="text-amber-400" />
              <span>Master Bedroom</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
              darkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100/90 border-slate-200 text-slate-700'
            }`}>
              <Thermometer size={15} weight="duotone" className="text-rose-400" />
              <span>Kitchen & Dining</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
              darkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100/90 border-slate-200 text-slate-700'
            }`}>
              <Sparkle size={15} weight="duotone" className="text-emerald-400" />
              <span>Custom Areas</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
