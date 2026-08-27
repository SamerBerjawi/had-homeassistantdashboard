import React from 'react';
import { MusicNotes, Television, SpeakerHigh, PlayCircle, Broadcast, SpotifyLogo } from '@phosphor-icons/react';

interface ViewProps {
  darkMode?: boolean;
}

export default function MediaView({ darkMode = true }: ViewProps) {
  return (
    <div className="w-full flex-1 flex flex-col">
      {/* 4-column mobile grid / adaptive desktop grid container */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-3.5 sm:gap-4.5">
        <div className={`col-span-4 sm:col-span-6 md:col-span-8 lg:col-span-12 p-8 sm:p-12 rounded-3xl backdrop-blur-xl border flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[360px] ${
          darkMode 
            ? 'bg-black/60 border-white/10 text-white' 
            : 'bg-white/80 border-slate-200/90 text-slate-900 shadow-sm'
        }`}>
          <div className="w-16 h-16 rounded-3xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-lg shadow-purple-500/10 mb-4">
            <MusicNotes size={32} weight="duotone" />
          </div>

          <h3 className={`text-lg sm:text-xl font-black tracking-tight mb-1.5 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Media & Audio Control
          </h3>
          <p className={`text-xs sm:text-sm max-w-md mb-6 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Control whole-home audio playback, synchronize multi-room speakers, manage smart TV streaming, and navigate Apple TV remotes.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
              darkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100/90 border-slate-200 text-slate-700'
            }`}>
              <SpeakerHigh size={15} weight="duotone" className="text-purple-400" />
              <span>Multi-room Audio</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
              darkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100/90 border-slate-200 text-slate-700'
            }`}>
              <Television size={15} weight="duotone" className="text-sky-400" />
              <span>Smart TVs</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
              darkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100/90 border-slate-200 text-slate-700'
            }`}>
              <PlayCircle size={15} weight="duotone" className="text-emerald-400" />
              <span>Now Playing</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
              darkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100/90 border-slate-200 text-slate-700'
            }`}>
              <Broadcast size={15} weight="duotone" className="text-amber-400" />
              <span>AirPlay & Cast</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
