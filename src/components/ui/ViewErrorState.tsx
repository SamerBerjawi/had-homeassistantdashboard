/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared error state for views and hooks that cannot load their data (REL-005). Pairs with
 * ViewLoadingState and ViewEmptyState so every page fails the same way.
 */

import React from 'react';
import { ArrowsClockwise, WarningCircle } from '@phosphor-icons/react';

interface ViewErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  darkMode?: boolean;
  /** Compact banner for use above existing content instead of a full-page state */
  inline?: boolean;
}

export default function ViewErrorState({
  title = 'Could not load data',
  message = 'The connection to Home Assistant was interrupted. Check your network and try again.',
  onRetry,
  retryLabel = 'Retry',
  darkMode = true,
  inline = false
}: ViewErrorStateProps) {
  return (
    <div
      role="alert"
      className={`w-full flex ${inline ? 'flex-row items-center gap-3 p-4 mb-4 rounded-2xl' : 'flex-col items-center justify-center min-h-[300px] p-8 text-center'} border backdrop-blur-md ${
        darkMode ? 'bg-rose-500/10 border-rose-500/30 text-white' : 'bg-rose-50/70 border-rose-200 text-slate-900'
      }`}
    >
      <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center justify-center shrink-0 mb-0">
        <WarningCircle size={24} weight="duotone" />
      </div>
      <div className={inline ? 'flex-1 min-w-0' : 'mt-3'}>
        <h3 className="text-sm font-bold tracking-tight">{title}</h3>
        <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={`${inline ? '' : 'mt-4'} shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer active:scale-95 transition-all`}
        >
          <ArrowsClockwise size={14} weight="bold" />
          <span>{retryLabel}</span>
        </button>
      )}
    </div>
  );
}
