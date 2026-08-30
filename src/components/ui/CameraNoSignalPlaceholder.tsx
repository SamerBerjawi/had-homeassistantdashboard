/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { VideoCameraSlash, Broadcast } from '@phosphor-icons/react';

interface CameraNoSignalPlaceholderProps {
  title?: string;
  subtitle?: string;
  className?: string;
  iconSize?: number;
  compact?: boolean;
}

export default function CameraNoSignalPlaceholder({
  title,
  subtitle = 'No preview available',
  className = '',
  iconSize = 32,
  compact = false
}: CameraNoSignalPlaceholderProps) {
  return (
    <div 
      className={`relative w-full h-full min-h-[120px] flex flex-col items-center justify-center bg-slate-950 text-slate-400 select-none overflow-hidden ${className}`}
    >
      {/* Subtle background mesh grid */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" 
      />

      {/* Center Icon & Status */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-2 p-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 shadow-inner">
          <VideoCameraSlash size={iconSize} weight="duotone" className="text-slate-400" />
        </div>

        {!compact && (
          <div className="space-y-0.5 max-w-[200px]">
            {title && (
              <p className="text-xs font-bold text-slate-300 truncate">
                {title}
              </p>
            )}
            <p className="text-[11px] font-medium text-slate-500">
              {subtitle}
            </p>
          </div>
        )}
      </div>

      {/* Bottom subtle status indicator */}
      <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/60 border border-white/10 text-[9px] font-mono text-slate-400">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
        <span>NO SIGNAL</span>
      </div>
    </div>
  );
}
