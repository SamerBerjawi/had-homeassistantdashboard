/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Connection & WebSocket Subpage
 * Clean, mobile-optimized, zero-bulk layout matching ThemeCustomizationSection.
 */

import React, { useState } from 'react';
import {
  WifiHigh,
  House,
  Key,
  ArrowsClockwise,
  CheckCircle,
  Warning,
  Eye,
  EyeSlash,
  SignOut,
  SignIn,
  Lightning
} from '@phosphor-icons/react';
import { LogMessage } from '../../types';

interface ConnectionWebSocketSectionProps {
  darkMode: boolean;
  isLiveMode: boolean;
  authType: 'oauth' | 'llat' | 'demo';
  connectionStatus: string;
  serverUrl?: string;
  storeHaToken?: string;
  connectToHA: (url: string, token: string) => void;
  disconnectFromHA: () => void;
  loginWithHA: (url: string) => void;
  logoutHA: () => void;
  haHttpUrlInput: string;
  setHaHttpUrlInput: (url: string) => void;
  wsUrlInput: string;
  setWsUrlInput: (url: string) => void;
  tokenInput: string;
  setTokenInput: (token: string) => void;
  showToken: boolean;
  setShowToken: (show: boolean) => void;
  handleStartOAuthLogin: (e: React.FormEvent) => void;
  handleConnectWs: (e: React.FormEvent) => void;
  isPinging: boolean;
  pingLatency: number | null;
  handleTestLatency: () => void;
  logs: LogMessage[];
  setLogs: React.Dispatch<React.SetStateAction<LogMessage[]>>;
  logFilter: string;
  setLogFilter: (filter: any) => void;
  entitiesCount: number;
  roomsCount: number;
  devicesCount: number;
  addToast?: (toast: any) => void;
}

export default function ConnectionWebSocketSection({
  darkMode,
  isLiveMode,
  authType,
  connectionStatus,
  serverUrl,
  connectToHA,
  disconnectFromHA,
  loginWithHA,
  logoutHA,
  haHttpUrlInput,
  setHaHttpUrlInput,
  wsUrlInput,
  setWsUrlInput,
  tokenInput,
  setTokenInput,
  showToken,
  setShowToken,
  handleStartOAuthLogin,
  handleConnectWs,
  isPinging,
  pingLatency,
  handleTestLatency,
  logs,
  setLogs,
  logFilter,
  setLogFilter,
  addToast
}: ConnectionWebSocketSectionProps) {
  const [authMethodTab, setAuthMethodTab] = useState<'oauth' | 'llat'>(() => {
    return isLiveMode && authType === 'llat' ? 'llat' : 'oauth';
  });

  const isConnected = connectionStatus === 'connected';

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 sm:space-y-5 animate-in fade-in duration-200 px-1 sm:px-0">
      {/* 1. Live Connection Status Floating Pill */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-white/60 dark:bg-black/25 backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
            isConnected
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
          }`}>
            <WifiHigh size={22} weight="duotone" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                {isConnected ? 'Connected to Home Assistant' : 'Connecting / Demo Mode'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                isConnected
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
              }`}>
                {connectionStatus.toUpperCase()}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
              {serverUrl || 'Local Simulation'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {pingLatency !== null && (
            <span className="text-[11px] font-mono font-bold text-sky-600 dark:text-sky-400">
              {pingLatency}ms
            </span>
          )}
          <button
            type="button"
            onClick={handleTestLatency}
            disabled={isPinging}
            className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowsClockwise size={13} className={isPinging ? 'animate-spin' : ''} />
            <span>{isPinging ? 'Pinging...' : 'Ping'}</span>
          </button>
        </div>
      </div>

      {/* 2. Authentication Mode Segmented Pill */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Authentication Method
          </span>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 capitalize">
            {authMethodTab === 'oauth' ? 'OAuth 2.0 Flow' : 'Access Token'}
          </span>
        </div>

        <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/60 dark:bg-black/25 backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-xs gap-1">
          <button
            type="button"
            onClick={() => setAuthMethodTab('oauth')}
            className={`h-9 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
              authMethodTab === 'oauth'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <House size={16} weight="duotone" />
            <span>HA OAuth</span>
          </button>

          <button
            type="button"
            onClick={() => setAuthMethodTab('llat')}
            className={`h-9 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
              authMethodTab === 'llat'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Key size={16} weight="duotone" />
            <span>Long-Lived Token</span>
          </button>
        </div>
      </div>

      {/* 3. Connection Form */}
      {authMethodTab === 'oauth' ? (
        <form onSubmit={handleStartOAuthLogin} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 px-0.5">
              Home Assistant Instance URL
            </label>
            <input
              type="url"
              placeholder="http://homeassistant.local:8123"
              value={haHttpUrlInput}
              onChange={(e) => setHaHttpUrlInput(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-white/60 dark:bg-black/25 backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:border-sky-500 shadow-xs"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-sm shadow-sky-500/20 transition-all cursor-pointer active:scale-98"
            >
              <SignIn size={15} weight="bold" />
              <span>Connect with Home Assistant</span>
            </button>
            {isConnected && (
              <button
                type="button"
                onClick={logoutHA}
                className="h-10 px-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold text-xs transition-all cursor-pointer"
              >
                Disconnect
              </button>
            )}
          </div>
        </form>
      ) : (
        <form onSubmit={handleConnectWs} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 px-0.5">
              WebSocket URL
            </label>
            <input
              type="text"
              placeholder="ws://homeassistant.local:8123/api/websocket"
              value={wsUrlInput}
              onChange={(e) => setWsUrlInput(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-white/60 dark:bg-black/25 backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:border-sky-500 shadow-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 px-0.5">
              Long-Lived Access Token
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                placeholder="Bearer eyJhbGci..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="w-full h-10 px-3 pr-10 rounded-xl bg-white/60 dark:bg-black/25 backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white text-xs font-mono focus:outline-hidden focus:border-sky-500 shadow-xs"
                required
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                {showToken ? <EyeSlash size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-sm shadow-sky-500/20 transition-all cursor-pointer active:scale-98"
            >
              <WifiHigh size={15} weight="bold" />
              <span>Connect WebSocket</span>
            </button>
            {isConnected && (
              <button
                type="button"
                onClick={disconnectFromHA}
                className="h-10 px-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold text-xs transition-all cursor-pointer"
              >
                Disconnect
              </button>
            )}
          </div>
        </form>
      )}

      {/* 4. WebSocket Diagnostic Activity */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Event Log ({logs.length})
          </span>
          <button
            type="button"
            onClick={() => setLogs([])}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            Clear
          </button>
        </div>

        <div className="p-2.5 rounded-2xl bg-white/60 dark:bg-black/25 backdrop-blur-md border border-slate-200/80 dark:border-white/10 max-h-40 overflow-y-auto font-mono text-[10px] space-y-1 touch-scroll-container">
          {logs.length === 0 ? (
            <div className="text-slate-400 text-center py-3">No connection events recorded yet.</div>
          ) : (
            logs.slice(0, 15).map((log, idx) => (
              <div key={idx} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                <span className="text-slate-400 shrink-0">{log.timestamp.split('T')[1]?.split('.')[0] || log.timestamp}</span>
                <span className={`px-1 rounded-sm text-[9px] uppercase font-bold shrink-0 ${
                  log.type === 'error' ? 'bg-rose-500/20 text-rose-400' : (log.type as string) === 'warning' || (log.type as string) === 'warn' ? 'bg-amber-500/20 text-amber-400' : 'bg-sky-500/20 text-sky-400'
                }`}>{log.type}</span>
                <span className="truncate">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
