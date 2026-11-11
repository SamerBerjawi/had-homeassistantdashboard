/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Single indicator for the dashboard config sync state (syncing / offline cache / save failed).
 * Renders a polite live region so screen readers hear changes; the text label is visually hidden
 * on narrow screens but never removed. Nothing is shown while synced.
 */

import React from 'react';
import { ArrowsClockwise, Warning, WarningCircle } from '@phosphor-icons/react';
import type { SyncStatus } from '../../services/configSyncRules';

interface SyncStatusBadgeProps {
  status: SyncStatus;
  lastSuccessfulSync?: string | null;
  /** Shown for offline_fallback and error: reload from the server and replay unsynced edits */
  onRetry?: () => void;
}

const BASE =
  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold backdrop-blur-sm';
const LABEL = 'sr-only sm:not-sr-only';

export default function SyncStatusBadge({ status, lastSuccessfulSync, onRetry }: SyncStatusBadgeProps) {
  let content: React.ReactNode = null;

  if (status === 'syncing') {
    content = (
      <div
        className={`${BASE} bg-sky-500/10 dark:bg-sky-500/15 border-sky-500/30 text-sky-600 dark:text-sky-400`}
        title="Synchronizing configuration across devices..."
      >
        <ArrowsClockwise size={14} className="animate-spin" aria-hidden="true" />
        <span className={LABEL}>Syncing…</span>
      </div>
    );
  } else if (status === 'offline_fallback') {
    content = (
      <div
        className={`${BASE} bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400`}
        title={`Storage is unreachable. Showing the cached settings mirror (last synced: ${lastSuccessfulSync || 'recently'}).`}
      >
        <Warning size={14} weight="fill" className="shrink-0" aria-hidden="true" />
        <span className={LABEL}>Offline (Cached)</span>
        {onRetry && (
          <button type="button" onClick={onRetry} className="underline underline-offset-2 cursor-pointer">
            Retry
          </button>
        )}
      </div>
    );
  } else if (status === 'error') {
    content = (
      <div
        className={`${BASE} bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-400`}
        title="Your latest changes could not be saved. They are kept on this device and will be retried."
      >
        <WarningCircle size={14} weight="fill" className="shrink-0" aria-hidden="true" />
        <span className={LABEL}>Changes not saved</span>
        {onRetry && (
          <button type="button" onClick={onRetry} className="underline underline-offset-2 cursor-pointer">
            Retry
          </button>
        )}
      </div>
    );
  }

  // The live region stays mounted so updates are announced
  return (
    <div role="status" aria-live="polite" className="contents">
      {content}
    </div>
  );
}
