/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowsClockwise } from '@phosphor-icons/react';

interface ViewLoadingStateProps {
  title?: string;
  subtitle?: string;
  darkMode?: boolean;
}

export default function ViewLoadingState({
  title = 'Loading Subsystem Telemetry...',
  subtitle = 'Connecting and fetching real-time entities from Home Assistant',
  darkMode = true
}: ViewLoadingStateProps) {
  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[300px] p-8 text-center animate-fadeIn">
      <div className="relative w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/10">
        <ArrowsClockwise size={26} weight="bold" className="animate-spin text-cyan-400" />
      </div>
      <h3 className={`text-base sm:text-lg font-black tracking-tight mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
        {title}
      </h3>
      <p className={`text-xs max-w-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
        {subtitle}
      </p>
    </div>
  );
}
