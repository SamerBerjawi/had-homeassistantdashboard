/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Icon, ArrowsClockwise } from '@phosphor-icons/react';

interface ViewEmptyStateProps {
  icon: Icon;
  title: string;
  description: string;
  badgeText?: string;
  configPath?: string;
  onRefresh?: () => void;
  darkMode?: boolean;
  accentColor?: string;
}

export default function ViewEmptyState({
  icon: IconComponent,
  title,
  description,
  badgeText,
  configPath,
  onRefresh,
  darkMode = true,
  accentColor = 'cyan'
}: ViewEmptyStateProps) {
  return (
    <div
      className={`w-full rounded-3xl p-8 sm:p-12 border backdrop-blur-xl text-center flex flex-col items-center justify-center max-w-2xl mx-auto my-8 sm:my-12 transition-all shadow-2xl ${
        darkMode
          ? 'bg-slate-900/80 border-white/10 text-white'
          : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-200/80'
      }`}
    >
      <div className="w-16 h-16 rounded-3xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-5 shadow-lg shadow-cyan-500/10">
        <IconComponent size={32} weight="duotone" />
      </div>

      {badgeText && (
        <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 mb-3">
          {badgeText}
        </span>
      )}

      <h2 className="text-xl sm:text-2xl font-black tracking-tight mb-2">
        {title}
      </h2>

      <p className={`text-xs sm:text-sm max-w-md leading-relaxed mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
        {description}
      </p>

      {configPath && (
        <div
          className={`px-4 py-2 rounded-2xl border font-mono text-xs font-bold mb-6 select-all ${
            darkMode ? 'bg-black/40 border-white/10 text-cyan-300' : 'bg-slate-100 border-slate-200 text-cyan-700'
          }`}
        >
          {configPath}
        </div>
      )}

      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="px-5 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
        >
          <ArrowsClockwise size={16} weight="bold" />
          <span>Check Again / Refresh</span>
        </button>
      )}
    </div>
  );
}
