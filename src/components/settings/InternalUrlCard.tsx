/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Optional local-network address for Home Assistant. When it answers, the dashboard uses it;
 * away from home it falls back to the main (external) URL, like the HA Companion app.
 */

import React, { useEffect, useState } from 'react';
import { HouseLine } from '@phosphor-icons/react';
import { validateHaUrl } from '../../services/haAuth';
import {
  getConfiguredInternalUrl,
  setConfiguredInternalUrl,
  refreshHaRoute,
  getCurrentResolution,
  onHaRouteChange,
  isInternalUrlBlockedByMixedContent,
  type HaUrlRoute
} from '../../services/haUrlResolver';

export default function InternalUrlCard() {
  const [value, setValue] = useState(getConfiguredInternalUrl());
  const [route, setRoute] = useState<HaUrlRoute>(getCurrentResolution().route);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => onHaRouteChange(setRoute), []);

  const mixedContent = !!value && isInternalUrlBlockedByMixedContent(value);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateHaUrl(value);
    if (problem && value.trim()) {
      setError(problem);
      return;
    }
    setError(null);
    setConfiguredInternalUrl(value);
    setChecking(true);
    setRoute(await refreshHaRoute());
    setChecking(false);
  };

  return (
    <form
      onSubmit={save}
      className="p-3 sm:p-3.5 rounded-2xl bg-white/60 dark:bg-black/25 backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-xs space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
          <HouseLine size={16} weight="duotone" /> Home network URL
        </span>
        {getConfiguredInternalUrl() && (
          <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400">
            {checking ? 'Checking…' : route === 'internal' ? 'Using home network' : 'Using external URL'}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="http://192.168.1.10:8123 (optional)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 min-w-0 h-10 px-3 rounded-xl bg-white/60 dark:bg-black/25 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:border-sky-500"
        />
        <button
          type="submit"
          className="h-10 px-3 rounded-xl bg-sky-500 text-white text-xs font-bold cursor-pointer"
        >
          Save
        </button>
      </div>
      {error && <p className="text-[11px] text-rose-600 dark:text-rose-400">{error}</p>}
      {mixedContent && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          This page is served over HTTPS, so browsers block a plain http:// home address. Use an https:// address
          or open the dashboard over http on your home network.
        </p>
      )}
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Used when Home Assistant answers at this address (you are on your home network). Otherwise the main URL is used.
      </p>
    </form>
  );
}
