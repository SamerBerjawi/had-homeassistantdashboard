/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PWA Status & HTTPS Installability Card
 * Displays real-time PWA installation status, secure context verification,
 * and actionable guidance for local HTTP vs HTTPS reverse proxy setups.
 */

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Warning, 
  DeviceMobile, 
  Desktop, 
  LockKey, 
  ArrowSquareOut, 
  CheckCircle, 
  Info,
  Sparkle
} from '@phosphor-icons/react';

interface PwaStatusCardProps {
  darkMode?: boolean;
}

export const PwaStatusCard: React.FC<PwaStatusCardProps> = ({ darkMode = true }) => {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isSecure, setIsSecure] = useState(true);
  const [protocol, setProtocol] = useState('https:');
  const [hostname, setHostname] = useState('localhost');
  const [hasSWSupport, setHasSWSupport] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isIosStandalone = (window.navigator as any).standalone === true;
      return isStandaloneMedia || isIosStandalone;
    };

    setIsStandalone(checkStandalone());
    setIsSecure(window.isSecureContext);
    setProtocol(window.location.protocol);
    setHostname(window.location.hostname);
    setHasSWSupport('serviceWorker' in navigator);

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const listener = (e: MediaQueryListEvent) => setIsStandalone(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  return (
    <div className="space-y-3">
      {/* 1. If running as Installed Standalone App */}
      {isStandalone ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-md">
              <CheckCircle size={26} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Running as Native Standalone PWA
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase">
                  Installed
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Full-screen standalone window active with safe-area insets, app-shell caching, and gesture isolation.
              </p>
            </div>
          </div>
        </div>
      ) : !isSecure ? (
        /* 2. Insecure Context Notice (Plain HTTP on LAN IP or mDNS) */
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/30 shadow-sm mt-0.5">
              <Warning size={22} weight="duotone" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-amber-700 dark:text-amber-300">
                  Limited PWA & Install Support (Insecure Context)
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase font-mono">
                  {protocol}//
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                You are accessing HOMZ over plain HTTP (<code className="font-mono text-amber-600 dark:text-amber-400">{hostname}</code>).
                Web standards require a <strong>Secure Context (HTTPS or localhost)</strong> for Service Workers and Chromium's native "Install App" prompt.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/40 border border-amber-500/20 text-xs text-slate-300 space-y-2">
            <div className="font-bold text-amber-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <Info size={14} weight="bold" />
              <span>How to enable full PWA installability</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300/90 leading-relaxed">
              <li>
                <strong>Option A (Recommended):</strong> Put this dashboard behind an HTTPS reverse proxy (e.g. <em>Nginx Proxy Manager</em>, <em>Caddy</em>, or the <em>Home Assistant NGINX SSL Add-on</em>) with a valid or self-signed certificate.
              </li>
              <li>
                <strong>Option B (Cloudflare / Tailscale):</strong> Access your instance via Tailscale HTTPS or Cloudflare Tunnel.
              </li>
              <li>
                <strong>iOS Safari Note:</strong> iOS "Add to Home Screen" works over plain HTTP, but offline precaching remains disabled until served over HTTPS.
              </li>
            </ul>
          </div>
        </div>
      ) : (
        /* 3. Secure Context & Install Ready */
        <div className="p-4 sm:p-5 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30 shadow-sm">
              <ShieldCheck size={24} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  PWA & Service Worker Ready
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-400 text-[10px] font-black uppercase font-mono">
                  {isLocalhost ? 'Localhost' : 'HTTPS Active'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Secure context verified. App-shell caching enabled with live Home Assistant API/WebSocket exclusions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 shrink-0">
            <Desktop size={14} />
            <span>Dual Browser / PWA Mode</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PwaStatusCard;
