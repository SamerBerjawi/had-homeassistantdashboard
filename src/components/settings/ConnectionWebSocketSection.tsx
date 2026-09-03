/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Connection & WebSocket Subpage
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  WifiHigh,
  House,
  Key,
  ShieldCheck,
  Lock,
  ArrowsClockwise,
  Radio,
  VideoCamera,
  CheckCircle,
  Warning,
  Eye,
  EyeSlash,
  FloppyDisk,
  Info
} from '@phosphor-icons/react';
import { LogMessage } from '../../types';
import CustomDropdown from '../ui/CustomDropdown';

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
  go2RtcUrlInput: string;
  setGo2RtcUrlInput: (url: string) => void;
  go2RtcStatus: {
    tested: boolean;
    loading: boolean;
    success?: boolean;
    streamsCount?: number;
    streamNames?: string[];
    latencyMs?: number | null;
    error?: string;
  };
  handleTestGo2Rtc: () => void;
  handleSaveGo2RtcUrl: () => void;
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
  go2RtcUrlInput,
  setGo2RtcUrlInput,
  go2RtcStatus,
  handleTestGo2Rtc,
  handleSaveGo2RtcUrl,
  logs,
  setLogs,
  logFilter,
  setLogFilter,
  entitiesCount,
  roomsCount,
  devicesCount,
  addToast
}: ConnectionWebSocketSectionProps) {
  const [authMethodTab, setAuthMethodTab] = useState<'oauth' | 'llat'>(() => {
    return isLiveMode && authType === 'llat' ? 'llat' : 'oauth';
  });
  const [switchMethodConfirmTarget, setSwitchMethodConfirmTarget] = useState<'oauth' | 'llat' | null>(null);

  const handleSelectAuthTab = (target: 'oauth' | 'llat') => {
    if (target === authMethodTab) return;
    if (isLiveMode) {
      setSwitchMethodConfirmTarget(target);
    } else {
      setAuthMethodTab(target);
    }
  };

  const handleConfirmSwitchMethod = () => {
    if (switchMethodConfirmTarget) {
      disconnectFromHA();
      setAuthMethodTab(switchMethodConfirmTarget);
      setSwitchMethodConfirmTarget(null);
      addToast?.({
        type: 'info',
        title: 'Session Disconnected',
        message: `Switched sign-in mode to ${switchMethodConfirmTarget === 'oauth' ? 'Home Assistant OAuth' : 'Long-Lived Access Token'}. Previous credentials cleared.`
      });
    }
  };

  const filteredLogs = logs.filter(l => {
    if (logFilter === 'all') return true;
    return l.type === logFilter;
  });

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-300 pb-24 md:pb-6">
      {/* Live Status Header */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white/20 dark:bg-black/20 backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)] flex flex-wrap items-center justify-between gap-4 overflow-hidden isolate">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/15 text-sky-500 flex items-center justify-center shrink-0 border border-sky-500/30">
            <WifiHigh size={26} weight="duotone" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Home Assistant WebSocket Connection
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Direct real-time duplex socket, latency testing, and live event monitoring.
            </p>
          </div>
        </div>

        <div className={`px-4 py-2 rounded-2xl border flex items-center gap-2 text-xs font-bold font-mono uppercase ${
          isLiveMode 
            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' 
            : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
        }`}>
          <span className={`w-2.5 h-2.5 rounded-full ${isLiveMode ? 'bg-emerald-500 dark:bg-emerald-400 animate-ping' : 'bg-amber-500'}`} />
          <span>{connectionStatus || (isLiveMode ? 'Connected' : 'Standalone Demo')}</span>
        </div>
      </div>

      {/* Authentication Method Tabs */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
          <button
            type="button"
            onClick={() => handleSelectAuthTab('oauth')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
              authMethodTab === 'oauth'
                ? 'bg-white dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 shadow-sm border border-slate-200 dark:border-sky-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <House size={16} weight="duotone" />
            <span>Sign In with HA Credentials (OAuth)</span>
            <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-300 font-extrabold">
              Recommended
            </span>
            {isLiveMode && authType === 'oauth' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0 ml-0.5" title="Active Session" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelectAuthTab('llat')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
              authMethodTab === 'llat'
                ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-white/15'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Key size={16} weight="duotone" />
            <span>Long-Lived Access Token (Manual)</span>
            <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-bold">
              Advanced
            </span>
            {isLiveMode && authType === 'llat' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0 ml-0.5" title="Active Session" />
            )}
          </button>
        </div>

        {/* TAB 1: OAUTH */}
        {authMethodTab === 'oauth' && (
          <div className="space-y-4">
            {isLiveMode && authType === 'oauth' ? (
              <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-md">
                    <ShieldCheck size={28} weight="duotone" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Authenticated via Home Assistant OAuth
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase">
                        Active Session
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-600 dark:text-slate-300 mt-0.5 truncate max-w-md">
                      {serverUrl}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => logoutHA()}
                  className="px-5 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-600 dark:text-rose-300 font-bold text-xs transition-all cursor-pointer"
                >
                  Sign Out / Disconnect
                </button>
              </div>
            ) : (
              <form onSubmit={handleStartOAuthLogin} className="p-6 rounded-3xl bg-white/20 dark:bg-black/20 backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)] space-y-4 overflow-hidden isolate">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Home Assistant Instance URL
                  </label>
                  <input
                    type="text"
                    placeholder="http://homeassistant.local:8123 or https://your-ha.duckdns.org"
                    value={haHttpUrlInput}
                    onChange={(e) => setHaHttpUrlInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white font-mono text-xs focus:outline-hidden focus:border-sky-500 shadow-xs"
                    required
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Enter your local IP (e.g. <code className="font-mono text-sky-500">http://192.168.1.100:8123</code>), mDNS (<code className="font-mono text-sky-500">http://homeassistant.local:8123</code>), or external HTTPS domain.
                  </p>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-linear-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all cursor-pointer"
                  >
                    <House size={16} weight="bold" />
                    <span>Sign In with Home Assistant</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: MANUAL LLAT */}
        {authMethodTab === 'llat' && (
          <div className="space-y-4">
            {isLiveMode && authType === 'llat' ? (
              <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-md">
                    <Key size={28} weight="duotone" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Authenticated via Long-Lived Token (LLAT)
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase">
                        Active Session
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-600 dark:text-slate-300 mt-0.5 truncate max-w-md">
                      {serverUrl}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestLatency}
                    disabled={isPinging}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/15 text-slate-800 dark:text-white text-xs font-semibold cursor-pointer transition-all shadow-xs"
                  >
                    <ArrowsClockwise size={14} className={isPinging ? 'animate-spin' : ''} />
                    <span>{isPinging ? 'Pinging...' : pingLatency !== null ? `${pingLatency}ms` : 'Test Ping'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => disconnectFromHA()}
                    className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-600 dark:text-rose-300 font-bold text-xs transition-all cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConnectWs} className="p-6 rounded-3xl bg-white/20 dark:bg-black/20 backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)] space-y-4 overflow-hidden isolate">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Home Assistant WebSocket URL</label>
                  <input
                    type="text"
                    placeholder="wss://your-homeassistant.local:8123/api/websocket"
                    value={wsUrlInput}
                    onChange={(e) => setWsUrlInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white font-mono text-xs focus:outline-hidden focus:border-sky-500 shadow-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Long-Lived Access Token</label>
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="text-[11px] text-sky-500 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      {showToken ? <EyeSlash size={13} /> : <Eye size={13} />}
                      <span>{showToken ? 'Hide Token' : 'Show Token'}</span>
                    </button>
                  </div>
                  <input
                    type={showToken ? 'text' : 'password'}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white font-mono text-xs focus:outline-hidden focus:border-sky-500 shadow-xs"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all cursor-pointer"
                  >
                    <WifiHigh size={16} weight="bold" />
                    <span>Save & Connect Token</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* go2rtc RTSP Streaming Discovery Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white/20 dark:bg-black/20 backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)] space-y-4 overflow-hidden isolate">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
              <VideoCamera size={22} weight="duotone" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>go2rtc RTSP Stream Discovery</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30 uppercase">
                  WebRTC / RTSP
                </span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Auto-detect and relay RTSP camera feeds configured in go2rtc server.
              </p>
            </div>
          </div>

          {go2RtcStatus.tested && (
            <div className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 border ${
              go2RtcStatus.success
                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            }`}>
              {go2RtcStatus.success ? <CheckCircle size={14} weight="bold" /> : <Warning size={14} weight="bold" />}
              <span>
                {go2RtcStatus.success
                  ? `${go2RtcStatus.streamsCount} Stream(s) Online${go2RtcStatus.latencyMs !== null ? ` (${go2RtcStatus.latencyMs}ms)` : ''}`
                  : 'go2rtc Unreachable'}
              </span>
            </div>
          )}
        </div>

        {/* Diagnostic Banner if go2rtc unreachable */}
        {go2RtcStatus.tested && !go2RtcStatus.success && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-300">
            <Info size={18} weight="duotone" className="shrink-0 text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-300">
                go2rtc unreachable at <code className="font-mono text-amber-200">{go2RtcUrlInput || 'configured URL'}</code>
              </p>
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                RTSP camera streams will use degraded MJPEG fallback until go2rtc is reachable. Ensure port 1984 is accessible on your Home Assistant host.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <input
              type="text"
              placeholder="http://homeassistant.local:1984"
              value={go2RtcUrlInput}
              onChange={(e) => setGo2RtcUrlInput(e.target.value)}
              className="w-full sm:flex-1 px-4 py-2 rounded-xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white font-mono text-xs focus:outline-hidden focus:border-amber-500 shadow-xs"
            />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleTestGo2Rtc}
                disabled={go2RtcStatus.loading}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white text-xs font-semibold cursor-pointer transition-all"
              >
                {go2RtcStatus.loading ? 'Probing...' : 'Test Streams'}
              </button>
              <button
                type="button"
                onClick={handleSaveGo2RtcUrl}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Save URL
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            💡 <strong>Multi-Host Deployments:</strong> If this dashboard runs on separate hardware than Home Assistant (e.g. in a standalone Docker container on a NAS), set this to <code className="font-mono text-amber-400 bg-black/40 px-1 py-0.5 rounded">http://&lt;home-assistant-ip&gt;:1984</code>.
          </p>
        </div>
      </div>

      {/* Real-time Telemetry Counter Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/10 text-center">
          <div className="text-xl font-mono font-black text-slate-900 dark:text-white">{entitiesCount}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold mt-0.5">Active Entities</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/10 text-center">
          <div className="text-xl font-mono font-black text-sky-500">{roomsCount}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold mt-0.5">Discovered Areas</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/10 text-center">
          <div className="text-xl font-mono font-black text-indigo-500">{devicesCount}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold mt-0.5">Physical Devices</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/10 text-center">
          <div className="text-xl font-mono font-black text-emerald-500">{logs.length}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold mt-0.5">Events Processed</div>
        </div>
      </div>

      {/* Live WebSocket Event Log Feed */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white/20 dark:bg-black/20 backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)] space-y-3 overflow-hidden isolate">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio size={18} weight="duotone" className="text-emerald-500 animate-pulse" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Live WebSocket Event Log Stream
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-36">
              <CustomDropdown
                value={logFilter}
                onChange={(val) => setLogFilter(val as any)}
                options={[
                  { value: 'all', label: 'All Events' },
                  { value: 'state_changed', label: 'State Changed' },
                  { value: 'service_call', label: 'Service Calls' },
                  { value: 'info', label: 'Info Logs' },
                  { value: 'error', label: 'Errors' }
                ]}
                size="sm"
              />
            </div>
            <button
              type="button"
              onClick={() => setLogs([])}
              className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-56 overflow-y-auto touch-scroll-container font-mono text-[11px] pr-1">
          {filteredLogs.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">No live log events captured yet.</div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/5 flex items-start gap-2.5 shadow-2xs"
              >
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase shrink-0 ${
                  log.type === 'error' ? 'bg-rose-500/15 text-rose-500' :
                  log.type === 'service_call' ? 'bg-indigo-500/15 text-indigo-400' :
                  log.type === 'state_changed' ? 'bg-sky-500/15 text-sky-400' :
                  'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}>
                  {log.type.replace('_', ' ')}
                </span>
                <span className="text-slate-800 dark:text-slate-200 flex-1 break-all">{log.message}</span>
                <span className="text-[10px] text-slate-400 shrink-0">{log.timestamp}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
