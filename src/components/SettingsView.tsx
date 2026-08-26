/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  Wifi, 
  Shield, 
  Palette, 
  Layers, 
  Bell, 
  Database, 
  Check, 
  RotateCw, 
  Download, 
  Trash2, 
  Plus, 
  Sparkles, 
  Server, 
  Key, 
  Lock, 
  Unlock, 
  Activity, 
  Cpu, 
  HardDrive, 
  Flame, 
  Eye, 
  EyeOff, 
  CheckCircle2,
  AlertTriangle,
  Radio,
  Sliders,
  Moon,
  Sun,
  Volume2,
  Thermometer,
  Zap,
  Info
} from 'lucide-react';
import { HAEntity, Room, LogMessage, ToastNotification } from '../types';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';

interface SettingsViewProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  entities: HAEntity[];
  setEntities: React.Dispatch<React.SetStateAction<HAEntity[]>>;
  rooms: Room[];
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>;
  addLog: (type: LogMessage['type'], message: string, details?: any) => void;
  logs: LogMessage[];
  setLogs: React.Dispatch<React.SetStateAction<LogMessage[]>>;
  setActiveTab: (tab: string) => void;
  addToast?: (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => void;
}

type SettingsSection = 'connectivity' | 'appearance' | 'security' | 'devices' | 'notifications' | 'diagnostics';

export default function SettingsView({
  darkMode,
  toggleDarkMode,
  entities,
  setEntities,
  rooms,
  setRooms,
  addLog,
  logs,
  setLogs,
  setActiveTab,
  addToast
}: SettingsViewProps) {
  const {
    serverUrl: storeServerUrl,
    haToken: storeHaToken,
    isLiveMode,
    connectToHA,
    setLiveMode
  } = useAutoLayoutStore();

  const [activeSection, setActiveSection] = useState<SettingsSection>('connectivity');

  // Connectivity Form State
  const [serverUrl, setServerUrl] = useState(storeServerUrl || 'wss://hass.homz.internal/api/websocket');
  const [haToken, setHaToken] = useState(storeHaToken || '');
  const [showToken, setShowToken] = useState(false);
  const [sslEnabled, setSslEnabled] = useState(true);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [telemetrySync, setTelemetrySync] = useState(true);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ latency: number; status: 'ok' | 'error' } | null>({ latency: 14, status: 'ok' });
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Appearance & Units
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
  const [clockFormat, setClockFormat] = useState<'24h' | '12h'>('24h');
  const [electricityTariff, setElectricityTariff] = useState<number>(0.16);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [ambientGlows, setAmbientGlows] = useState(true);

  // Security & Access
  const [autoLockDelay, setAutoLockDelay] = useState<string>('60');
  const [noiseFilter, setNoiseFilter] = useState(true);
  const [guestPasscode, setGuestPasscode] = useState('4829');
  const [tamperAlerts, setTamperAlerts] = useState(true);
  const [emergencyUnlock, setEmergencyUnlock] = useState(true);

  // Notifications
  const [notifyDoorEvents, setNotifyDoorEvents] = useState(true);
  const [notifyLowBattery, setNotifyLowBattery] = useState(true);
  const [notifyCameraMotion, setNotifyCameraMotion] = useState(true);
  const [dailyEnergySummary, setDailyEnergySummary] = useState(false);
  const [geofencingAutoAway, setGeofencingAutoAway] = useState(true);

  // Entity Modal / Creation State
  const [showNewDeviceModal, setShowNewDeviceModal] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceType, setNewDeviceType] = useState<'light' | 'switch' | 'sensor' | 'fan'>('light');
  const [newDeviceRoom, setNewDeviceRoom] = useState(rooms[0]?.name || 'Living Room');
  const [newDevicePower, setNewDevicePower] = useState(12);

  // Handle Latency Ping Test
  const handleTestPing = () => {
    setIsPinging(true);
    addLog('service_call', 'Testing latency ping to Home Assistant WebSocket backend...');
    
    setTimeout(() => {
      const simulatedLatency = Math.floor(Math.random() * 12) + 8; // 8 - 20ms
      setIsPinging(false);
      setPingResult({ latency: simulatedLatency, status: 'ok' });
      addLog('info', `WebSocket ping returned in ${simulatedLatency}ms. Protocol version Hass WS 2.1.0.`);
    }, 600);
  };

  // Handle Save Connectivity
  const handleSaveConnectivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (serverUrl.trim() && haToken.trim()) {
      connectToHA(serverUrl.trim(), haToken.trim());
    }
    setSaveSuccessNotice(true);
    addLog('info', `Saved Home Assistant WebSocket credentials to browser cache: ${serverUrl}`);
    addToast?.({
      type: 'success',
      title: 'Credentials Saved & Connected',
      message: `WebSocket endpoint set to ${serverUrl} and cached in browser.`
    });
    setTimeout(() => setSaveSuccessNotice(false), 3000);
  };

  // Handle Add Entity
  const handleCreateDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName.trim()) return;

    const safeId = newDeviceName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const entityId = `${newDeviceType}.${safeId}_${Date.now().toString().slice(-4)}`;

    const createdEntity: HAEntity = {
      entity_id: entityId,
      state: 'off',
      attributes: {
        friendly_name: newDeviceName,
        room: newDeviceRoom,
        power: newDevicePower,
        brightness: newDeviceType === 'light' ? 100 : undefined,
        color: newDeviceType === 'light' ? '#ffffff' : undefined
      }
    };

    setEntities(prev => [createdEntity, ...prev]);

    // Update device count in target room
    setRooms(prev => prev.map(r => {
      if (r.name.toLowerCase() === newDeviceRoom.toLowerCase()) {
        return {
          ...r,
          devicesCount: r.devicesCount + 1,
          entityIds: [...r.entityIds, entityId]
        };
      }
      return r;
    }));

    addLog('state_changed', `Registered new virtual IoT device: ${newDeviceName} (${entityId}) in ${newDeviceRoom}`);
    addToast?.({
      type: 'success',
      title: 'Device Registered',
      message: `${newDeviceName} (${entityId}) added to ${newDeviceRoom}.`
    });
    setShowNewDeviceModal(false);
    setNewDeviceName('');
  };

  // Handle Delete Entity
  const handleDeleteDevice = (entityId: string) => {
    setEntities(prev => prev.filter(e => e.entity_id !== entityId));
    setRooms(prev => prev.map(r => ({
      ...r,
      devicesCount: r.entityIds.includes(entityId) ? Math.max(0, r.devicesCount - 1) : r.devicesCount,
      entityIds: r.entityIds.filter(id => id !== entityId)
    })));
    addLog('warning', `Removed registered device ${entityId} from active entity registry.`);
    addToast?.({
      type: 'warning',
      title: 'Device Removed',
      message: `${entityId} removed from registry.`
    });
  };

  // Handle Export Configuration JSON
  const handleExportConfig = () => {
    const configData = {
      homz_version: '2.4.0',
      exported_at: new Date().toISOString(),
      server_url: serverUrl,
      settings: {
        theme: darkMode ? 'deep-space' : 'daylight-glass',
        temperature_unit: tempUnit,
        clock_format: clockFormat,
        electricity_tariff_kwh: electricityTariff,
        auto_lock_delay: autoLockDelay,
        emergency_auto_unlock: emergencyUnlock
      },
      rooms: rooms,
      entities: entities,
      system_logs_count: logs.length
    };

    const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `homz-dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addLog('info', 'Configuration & device snapshot exported successfully as JSON archive.');
    addToast?.({
      type: 'info',
      title: 'Configuration Exported',
      message: 'Snapshot JSON backup generated and saved.'
    });
  };

  // Handle Clear Logs
  const handleClearLogs = () => {
    setLogs([
      {
        id: `clear-${Date.now()}`,
        timestamp: new Date().toTimeString().split(' ')[0],
        type: 'info',
        message: 'Telemetry log history purged by administrator.'
      }
    ]);
  };

  const navItems = [
    { id: 'connectivity', label: 'Connection & Server', icon: Wifi, desc: 'Home Assistant WebSocket & API' },
    { id: 'appearance', label: 'Display & Units', icon: Palette, desc: 'Themes, units & power tariff' },
    { id: 'security', label: 'Security & Access', icon: Shield, desc: 'Smart locks, intercom & guest PIN' },
    { id: 'devices', label: 'Entity Registry', icon: Layers, desc: `${entities.length} IoT devices registered` },
    { id: 'notifications', label: 'Alerts & Routines', icon: Bell, desc: 'Push notifications & triggers' },
    { id: 'diagnostics', label: 'System & Diagnostics', icon: Database, desc: 'Hardware stats & backup' }
  ];

  return (
    <div id="settings-view-root" className="space-y-6">
      
      {/* Settings Top Hero Banner */}
      <div className={`p-6 sm:p-7 rounded-3xl border backdrop-blur-xl transition-all duration-300 ${
        darkMode 
          ? 'bg-slate-900/70 border-white/[0.1] text-white shadow-xl shadow-black/40' 
          : 'bg-white/80 border-black/[0.06] text-slate-800 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-md ${
              darkMode 
                ? 'bg-[#7B61FF]/20 text-[#9D8BFF] border-[#7B61FF]/40' 
                : 'bg-indigo-50 text-[#7B61FF] border-indigo-100'
            }`}>
              <Settings size={26} className="animate-spin-slow" />
            </div>
            <div>
              <span className={`text-[10px] font-black uppercase tracking-widest block mb-0.5 ${
                darkMode ? 'text-[#9D8BFF]' : 'text-indigo-600'
              }`}>System Administration</span>
              <h2 className={`text-xl sm:text-2xl font-black tracking-tight leading-tight ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Smart Environment Settings
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Manage live Home Assistant nodes, room topologies, security policies, and theme modes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button 
              id="btn-back-to-home"
              onClick={() => setActiveTab('home')}
              className={`px-4 py-2.5 rounded-full text-xs font-extrabold transition-all cursor-pointer border ${
                darkMode 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
              }`}
            >
              Back to Home
            </button>
            <button 
              id="btn-quick-export"
              onClick={handleExportConfig}
              className="px-4 py-2.5 rounded-full text-xs font-extrabold bg-[#7B61FF] hover:bg-[#684be3] text-white transition-all cursor-pointer shadow-md shadow-[#7B61FF]/25 flex items-center gap-1.5"
            >
              <Download size={14} />
              <span>Export Backup</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Settings Body with Side Category Navigator and Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Category Nav Selector (4 columns on desktop) */}
        <div className="lg:col-span-4 space-y-2">
          <div className={`p-3.5 rounded-2xl border backdrop-blur-xl transition-all ${
            darkMode ? 'bg-slate-900/50 border-white/[0.1]' : 'bg-white/70 border-black/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
          }`}>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider px-3 py-1.5 block">
              Configuration Modules
            </span>

            <div className="space-y-1 mt-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isSelected = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    id={`btn-settings-tab-${item.id}`}
                    onClick={() => setActiveSection(item.id as SettingsSection)}
                    className={`w-full p-3.5 rounded-2xl flex items-center gap-3.5 transition-all text-left cursor-pointer border ${
                      isSelected
                        ? darkMode
                          ? 'bg-[#7B61FF]/20 border-[#7B61FF]/50 text-white shadow-md'
                          : 'bg-white border-[#7B61FF]/40 text-slate-900 shadow-sm ring-1 ring-[#7B61FF]/20'
                        : darkMode
                          ? 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                          : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/40'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? darkMode ? 'bg-[#7B61FF] text-white' : 'bg-[#7B61FF] text-white'
                        : darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className={`text-xs font-bold truncate ${isSelected ? (darkMode ? 'text-white' : 'text-slate-900') : ''}`}>
                        {item.label}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick System Telemetry Box */}
          <div className={`p-4 rounded-2xl border backdrop-blur-xl transition-all ${
            darkMode ? 'bg-slate-900/40 border-white/[0.08] text-slate-300' : 'bg-white/60 border-black/[0.06] text-slate-600 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
          }`}>
            <div className="flex items-center gap-2 mb-2.5">
              <Server size={14} className={darkMode ? 'text-[#9D8BFF]' : 'text-indigo-600'} />
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Home Assistant Hub</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Core Engine:</span>
                <span className="font-mono font-semibold">2026.8.4</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Host OS:</span>
                <span className="font-mono font-semibold">HassOS 12.1 (aarch64)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Uptime:</span>
                <span className="font-mono font-semibold">14d 8h 22m</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area (8 columns on desktop) */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            
            {/* 1. CONNECTIVITY & WEBSOCKET */}
            {activeSection === 'connectivity' && (
              <motion.div
                key="connectivity"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className={`p-6 rounded-3xl border backdrop-blur-xl space-y-6 ${
                  darkMode ? 'bg-slate-900/60 border-white/[0.1]' : 'bg-white/80 border-black/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`text-base font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      Home Assistant WebSocket Connectivity
                    </h3>
                    <p className="text-xs text-slate-400">
                      Configure your local or remote Home Assistant instance endpoint and credentials.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {pingResult && (
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 border ${
                        pingResult.status === 'ok'
                          ? darkMode 
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Ping: {pingResult.latency}ms</span>
                      </span>
                    )}
                  </div>
                </div>

                {saveSuccessNotice && (
                  <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-400 animate-fade-in">
                    <CheckCircle2 size={16} />
                    <span>Configuration successfully synchronized with runtime!</span>
                  </div>
                )}

                <form onSubmit={handleSaveConnectivity} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      WebSocket Server URL
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input 
                          type="text" 
                          id="input-server-url"
                          value={serverUrl}
                          onChange={(e) => setServerUrl(e.target.value)}
                          placeholder="wss://your-homeassistant.local:8123/api/websocket"
                          className={`w-full px-4 py-3 rounded-2xl text-xs font-mono border outline-none transition-all ${
                            darkMode 
                              ? 'bg-slate-950/70 border-slate-700 text-slate-100 focus:border-[#7B61FF]' 
                              : 'bg-white border-slate-200 text-slate-800 focus:border-[#7B61FF]'
                          }`}
                        />
                      </div>
                      <button 
                        type="button"
                        id="btn-test-ws-ping"
                        onClick={handleTestPing}
                        disabled={isPinging}
                        className={`px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border transition-all ${
                          darkMode 
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                      >
                        <RotateCw size={14} className={isPinging ? 'animate-spin' : ''} />
                        <span>{isPinging ? 'Pinging...' : 'Test Ping'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Long-Lived Access Token
                    </label>
                    <div className="relative">
                      <input 
                        type={showToken ? 'text' : 'password'}
                        id="input-ha-token"
                        value={haToken}
                        onChange={(e) => setHaToken(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        className={`w-full pl-4 pr-11 py-3 rounded-2xl text-xs font-mono border outline-none transition-all ${
                          darkMode 
                            ? 'bg-slate-950/70 border-slate-700 text-slate-100 focus:border-[#7B61FF]' 
                            : 'bg-white border-slate-200 text-slate-800 focus:border-[#7B61FF]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                      >
                        {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Toggle Options */}
                  <div className="pt-2 space-y-3">
                    <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                      darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/70 border-slate-100'
                    }`}>
                      <div>
                        <span className="text-xs font-bold block">Strict TLS/SSL Verification</span>
                        <span className="text-[10px] text-slate-400">Validate SSL certificate chains for secure endpoints</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSslEnabled(!sslEnabled)}
                        className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${
                          sslEnabled ? 'bg-[#7B61FF]' : 'bg-slate-400'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                          sslEnabled ? 'left-5' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                      darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/70 border-slate-100'
                    }`}>
                      <div>
                        <span className="text-xs font-bold block">Auto-Reconnect on Socket Drop</span>
                        <span className="text-[10px] text-slate-400">Exponential backoff reconnection with heartbeat monitor</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAutoReconnect(!autoReconnect)}
                        className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${
                          autoReconnect ? 'bg-[#7B61FF]' : 'bg-slate-400'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                          autoReconnect ? 'left-5' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                      darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/70 border-slate-100'
                    }`}>
                      <div>
                        <span className="text-xs font-bold block">Real-time Telemetry Event Stream</span>
                        <span className="text-[10px] text-slate-400">Pipe state changes immediately to WebSocket terminal</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTelemetrySync(!telemetrySync)}
                        className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${
                          telemetrySync ? 'bg-[#7B61FF]' : 'bg-slate-400'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                          telemetrySync ? 'left-5' : 'left-1'
                        }`} />
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button 
                      type="submit"
                      id="btn-save-connectivity"
                      className="px-6 py-2.5 rounded-full text-xs font-extrabold bg-[#7B61FF] hover:bg-[#684be3] text-white shadow-md transition-all cursor-pointer flex items-center gap-2"
                    >
                      <Check size={14} />
                      <span>Save Connection Settings</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* 2. APPEARANCE & DISPLAY */}
            {activeSection === 'appearance' && (
              <motion.div
                key="appearance"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className={`p-6 rounded-3xl border backdrop-blur-xl space-y-6 ${
                  darkMode ? 'bg-slate-900/60 border-white/[0.1]' : 'bg-white/80 border-black/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
                }`}
              >
                <div>
                  <h3 className={`text-base font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Display & Regional Preferences
                  </h3>
                  <p className="text-xs text-slate-400">
                    Customize visual themes, units of measurement, energy tariffs, and sensory haptics.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Theme Mode Selector */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                      Interface Theme Mode
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        id="btn-set-theme-light"
                        onClick={() => { if (darkMode) toggleDarkMode(); }}
                        className={`p-4 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                          !darkMode
                            ? 'bg-white border-[#7B61FF] ring-2 ring-[#7B61FF]/30 shadow-md text-slate-900'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                          <Sun size={20} />
                        </div>
                        <div>
                          <h5 className="font-extrabold text-xs">Daylight Glass</h5>
                          <p className="text-[10px] text-slate-400">Frosted translucent daytime</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        id="btn-set-theme-dark"
                        onClick={() => { if (!darkMode) toggleDarkMode(); }}
                        className={`p-4 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                          darkMode
                            ? 'bg-slate-900 border-[#7B61FF] ring-2 ring-[#7B61FF]/40 shadow-md text-white'
                            : 'bg-slate-100/70 border-slate-200 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-indigo-950 text-indigo-400 flex items-center justify-center border border-indigo-800/50">
                          <Moon size={20} />
                        </div>
                        <div>
                          <h5 className="font-extrabold text-xs">Deep-Space Dark</h5>
                          <p className="text-[10px] text-slate-400">Cosmic midnight with neon glows</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Temperature Unit */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Temperature Scale
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setTempUnit('C')}
                          className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                            tempUnit === 'C'
                              ? 'bg-[#7B61FF] text-white border-[#7B61FF]'
                              : darkMode ? 'bg-slate-950/40 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          Celsius (°C)
                        </button>
                        <button
                          type="button"
                          onClick={() => setTempUnit('F')}
                          className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                            tempUnit === 'F'
                              ? 'bg-[#7B61FF] text-white border-[#7B61FF]'
                              : darkMode ? 'bg-slate-950/40 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          Fahrenheit (°F)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Time Display Format
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setClockFormat('24h')}
                          className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                            clockFormat === '24h'
                              ? 'bg-[#7B61FF] text-white border-[#7B61FF]'
                              : darkMode ? 'bg-slate-950/40 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          24-Hour (14:30)
                        </button>
                        <button
                          type="button"
                          onClick={() => setClockFormat('12h')}
                          className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                            clockFormat === '12h'
                              ? 'bg-[#7B61FF] text-white border-[#7B61FF]'
                              : darkMode ? 'bg-slate-950/40 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          12-Hour (2:30 PM)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Electricity Tariff */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Electricity Cost Tariff ($ per kWh)
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                        <input 
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="1.50"
                          value={electricityTariff}
                          onChange={(e) => setElectricityTariff(parseFloat(e.target.value) || 0.16)}
                          className={`w-full pl-8 pr-4 py-3 rounded-2xl text-xs font-bold border outline-none ${
                            darkMode ? 'bg-slate-950/70 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        />
                      </div>
                      <span className="text-xs text-slate-400 font-semibold">Used for daily power projections</span>
                    </div>
                  </div>

                  {/* Ambient Glows & Sensory toggles */}
                  <div className="space-y-3 pt-2">
                    <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                      darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/70 border-slate-100'
                    }`}>
                      <div>
                        <span className="text-xs font-bold block">Atmospheric Background Glow Orbs</span>
                        <span className="text-[10px] text-slate-400">Render floating animated gradient blurs</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAmbientGlows(!ambientGlows)}
                        className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${
                          ambientGlows ? 'bg-[#7B61FF]' : 'bg-slate-400'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                          ambientGlows ? 'left-5' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                      darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/70 border-slate-100'
                    }`}>
                      <div>
                        <span className="text-xs font-bold block">Sensory Sound & Haptic Feedback</span>
                        <span className="text-[10px] text-slate-400">Play micro-click sound cues on toggle events</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setHapticsEnabled(!hapticsEnabled)}
                        className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${
                          hapticsEnabled ? 'bg-[#7B61FF]' : 'bg-slate-400'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                          hapticsEnabled ? 'left-5' : 'left-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. SECURITY & ACCESS */}
            {activeSection === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className={`p-6 rounded-3xl border backdrop-blur-xl space-y-6 ${
                  darkMode ? 'bg-slate-900/60 border-white/[0.1]' : 'bg-white/80 border-black/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
                }`}
              >
                <div>
                  <h3 className={`text-base font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Security, Smart Locks & Intercom Policies
                  </h3>
                  <p className="text-xs text-slate-400">
                    Control door lock automation, intercom push-to-talk audio filters, and emergency bypass rules.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Auto Lock Delay */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                      Front Door Auto-Lock Timer
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { val: '30', label: '30 sec' },
                        { val: '60', label: '1 min' },
                        { val: '300', label: '5 min' },
                        { val: '0', label: 'Disabled' }
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => {
                            setAutoLockDelay(item.val);
                            addLog('info', `Front door auto-lock policy set to: ${item.label}`);
                          }}
                          className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer text-center ${
                            autoLockDelay === item.val
                              ? 'bg-[#7B61FF] text-white border-[#7B61FF]'
                              : darkMode ? 'bg-slate-950/40 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Guest PIN Passcode */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Front Gate Guest Keypad PIN
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        maxLength={6}
                        value={guestPasscode}
                        onChange={(e) => setGuestPasscode(e.target.value)}
                        className={`w-40 px-4 py-3 rounded-2xl text-base tracking-widest font-mono font-bold border text-center outline-none ${
                          darkMode ? 'bg-slate-950/70 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          addLog('info', `Generated and updated guest access PIN to ${guestPasscode}`);
                        }}
                        className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                      >
                        Update PIN
                      </button>
                    </div>
                  </div>

                  {/* Security Toggles */}
                  <div className="space-y-3 pt-2">
                    <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                      darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/70 border-slate-100'
                    }`}>
                      <div>
                        <span className="text-xs font-bold block">Intercom Noise Suppression & AGC</span>
                        <span className="text-[10px] text-slate-400">Filters outdoor wind noise during live two-way talk</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNoiseFilter(!noiseFilter)}
                        className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${
                          noiseFilter ? 'bg-[#7B61FF]' : 'bg-slate-400'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                          noiseFilter ? 'left-5' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                      darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/70 border-slate-100'
                    }`}>
                      <div>
                        <span className="text-xs font-bold block">Camera Tamper & Jamming Detection</span>
                        <span className="text-[10px] text-slate-400">Trigger siren and high-priority alert if feed disconnects</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTamperAlerts(!tamperAlerts)}
                        className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${
                          tamperAlerts ? 'bg-[#7B61FF]' : 'bg-slate-400'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                          tamperAlerts ? 'left-5' : 'left-1'
                        }`} />
                      </button>
                    </div>

                    <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                      darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/70 border-slate-100'
                    }`}>
                      <div>
                        <span className="text-xs font-bold block text-rose-500">Emergency Auto-Unlock on Smoke / CO Alarm</span>
                        <span className="text-[10px] text-slate-400">Instantly unlocks all perimeter doors during fire alarms</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEmergencyUnlock(!emergencyUnlock)}
                        className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${
                          emergencyUnlock ? 'bg-rose-500' : 'bg-slate-400'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                          emergencyUnlock ? 'left-5' : 'left-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 4. ENTITY REGISTRY & DEVICE MANAGER */}
            {activeSection === 'devices' && (
              <motion.div
                key="devices"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className={`p-6 rounded-3xl border backdrop-blur-xl space-y-6 ${
                  darkMode ? 'bg-slate-900/60 border-white/[0.1]' : 'bg-white/80 border-black/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
                }`}
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h3 className={`text-base font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      Registered IoT Device Registry
                    </h3>
                    <p className="text-xs text-slate-400">
                      Manage {entities.length} synced entities or spawn virtual IoT hardware prototypes.
                    </p>
                  </div>

                  <button
                    type="button"
                    id="btn-add-device-trigger"
                    onClick={() => setShowNewDeviceModal(true)}
                    className="px-4 py-2.5 rounded-full text-xs font-extrabold bg-[#7B61FF] hover:bg-[#684be3] text-white shadow-md flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                  >
                    <Plus size={14} />
                    <span>Register New Device</span>
                  </button>
                </div>

                {/* Device List Table / Card Grid */}
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {entities.map((entity) => (
                    <div
                      key={entity.entity_id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                        darkMode 
                          ? 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700' 
                          : 'bg-white border-slate-100 hover:border-slate-200 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          entity.state === 'on' || entity.state === 'locked'
                            ? 'bg-[#7B61FF]/15 text-[#7B61FF]'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          <Radio size={16} />
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-extrabold text-xs truncate">
                            {entity.attributes.friendly_name}
                          </h5>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span className="font-mono">{entity.entity_id}</span>
                            <span>•</span>
                            <span>{entity.attributes.room || 'General'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold uppercase ${
                          entity.state === 'on' || entity.state === 'locked'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-500/15 text-slate-400'
                        }`}>
                          {entity.state}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDeleteDevice(entity.entity_id)}
                          title="Remove Device"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 5. ALERTS & NOTIFICATIONS */}
            {activeSection === 'notifications' && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className={`p-6 rounded-3xl border backdrop-blur-xl space-y-6 ${
                  darkMode ? 'bg-slate-900/60 border-white/[0.1]' : 'bg-white/80 border-black/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
                }`}
              >
                <div>
                  <h3 className={`text-base font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Push Notifications & Automated Triggers
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configure high-priority alerts sent to resident phones and Apple Watch / WearOS endpoints.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                    darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/70 border-slate-100'
                  }`}>
                    <div>
                      <span className="text-xs font-bold block">Front Door Opened / Unlocked Alert</span>
                      <span className="text-[10px] text-slate-400">Instant push notification when entry doors cycle state</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifyDoorEvents(!notifyDoorEvents)}
                      className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${
                        notifyDoorEvents ? 'bg-[#7B61FF]' : 'bg-slate-400'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                        notifyDoorEvents ? 'left-5' : 'left-1'
                      }`} />
                    </button>
                  </div>

                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                    darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/70 border-slate-100'
                  }`}>
                    <div>
                      <span className="text-xs font-bold block">Low Battery Warning Notification</span>
                      <span className="text-[10px] text-slate-400">Warns if vacuum, door lock, or sensors drop below 20%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifyLowBattery(!notifyLowBattery)}
                      className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${
                        notifyLowBattery ? 'bg-[#7B61FF]' : 'bg-slate-400'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                        notifyLowBattery ? 'left-5' : 'left-1'
                      }`} />
                    </button>
                  </div>

                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                    darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/70 border-slate-100'
                  }`}>
                    <div>
                      <span className="text-xs font-bold block">AI Security Camera Human Detection Alert</span>
                      <span className="text-[10px] text-slate-400">Sends rich snapshot thumbnail when unknown motion is detected</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifyCameraMotion(!notifyCameraMotion)}
                      className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${
                        notifyCameraMotion ? 'bg-[#7B61FF]' : 'bg-slate-400'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                        notifyCameraMotion ? 'left-5' : 'left-1'
                      }`} />
                    </button>
                  </div>

                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                    darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/70 border-slate-100'
                  }`}>
                    <div>
                      <span className="text-xs font-bold block">Geofence Auto-Away Mode</span>
                      <span className="text-[10px] text-slate-400">Arms motion sensors and activates eco climate when all residents leave</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGeofencingAutoAway(!geofencingAutoAway)}
                      className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${
                        geofencingAutoAway ? 'bg-[#7B61FF]' : 'bg-slate-400'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                        geofencingAutoAway ? 'left-5' : 'left-1'
                      }`} />
                    </button>
                  </div>

                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                    darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/70 border-slate-100'
                  }`}>
                    <div>
                      <span className="text-xs font-bold block">Daily 21:00 Energy Consumption Digest</span>
                      <span className="text-[10px] text-slate-400">Brief summary of today's total kilowatt load and cost</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDailyEnergySummary(!dailyEnergySummary)}
                      className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${
                        dailyEnergySummary ? 'bg-[#7B61FF]' : 'bg-slate-400'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                        dailyEnergySummary ? 'left-5' : 'left-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 6. DIAGNOSTICS & BACKUP */}
            {activeSection === 'diagnostics' && (
              <motion.div
                key="diagnostics"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className={`p-6 rounded-3xl border backdrop-blur-xl space-y-6 ${
                  darkMode ? 'bg-slate-900/60 border-white/[0.1]' : 'bg-white/80 border-black/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
                }`}
              >
                <div>
                  <h3 className={`text-base font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Diagnostics, Telemetry & Backup
                  </h3>
                  <p className="text-xs text-slate-400">
                    Review hardware resource utilization, clear event logs, or export runtime state snapshots.
                  </p>
                </div>

                {/* Hardware Telemetry Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className={`p-4 rounded-2xl border ${
                    darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <div className="flex items-center gap-2 mb-1.5 text-indigo-400">
                      <Cpu size={16} />
                      <span className="text-[11px] font-extrabold uppercase">CPU Utilization</span>
                    </div>
                    <p className="text-xl font-black">12.4%</p>
                    <span className="text-[10px] text-slate-400">Broadcom BCM2712 Quad 2.4GHz</span>
                  </div>

                  <div className={`p-4 rounded-2xl border ${
                    darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <div className="flex items-center gap-2 mb-1.5 text-teal-400">
                      <Activity size={16} />
                      <span className="text-[11px] font-extrabold uppercase">RAM Allocation</span>
                    </div>
                    <p className="text-xl font-black">2.1 / 8.0 GB</p>
                    <span className="text-[10px] text-slate-400">LPDDR4X SDRAM</span>
                  </div>

                  <div className={`p-4 rounded-2xl border ${
                    darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <div className="flex items-center gap-2 mb-1.5 text-amber-400">
                      <HardDrive size={16} />
                      <span className="text-[11px] font-extrabold uppercase">Local Storage</span>
                    </div>
                    <p className="text-xl font-black">7.2 / 10 TB</p>
                    <span className="text-[10px] text-slate-400">NVMe ZFS Mirror NAS</span>
                  </div>
                </div>

                {/* Maintenance Actions */}
                <div className="space-y-3 pt-2">
                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                    darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/70 border-slate-100'
                  }`}>
                    <div>
                      <span className="text-xs font-bold block">Export Complete System Snapshot</span>
                      <span className="text-[10px] text-slate-400">Downloads a timestamped .json archive of your current layout and entities</span>
                    </div>
                    <button
                      type="button"
                      id="btn-export-diagnostics"
                      onClick={handleExportConfig}
                      className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#7B61FF] hover:bg-[#684be3] text-white cursor-pointer shadow-sm flex items-center gap-1.5"
                    >
                      <Download size={14} />
                      <span>Download</span>
                    </button>
                  </div>

                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                    darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/70 border-slate-100'
                  }`}>
                    <div>
                      <span className="text-xs font-bold block">Flush WebSocket Terminal Telemetry Logs</span>
                      <span className="text-[10px] text-slate-400">Purges {logs.length} accumulated event traces from memory</span>
                    </div>
                    <button
                      type="button"
                      id="btn-clear-logs"
                      onClick={handleClearLogs}
                      className="px-4 py-2 rounded-xl text-xs font-extrabold bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 size={14} />
                      <span>Purge Logs</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Register New Device Modal */}
      {showNewDeviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${
              darkMode ? 'bg-[#0d1428] border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-base">Register Virtual IoT Entity</h3>
              <button 
                onClick={() => setShowNewDeviceModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDevice} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Device Friendly Name</label>
                <input 
                  type="text"
                  required
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  placeholder="e.g. Balcony String Lights"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${
                    darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Entity Domain Type</label>
                  <select
                    value={newDeviceType}
                    onChange={(e) => setNewDeviceType(e.target.value as any)}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs border outline-none ${
                      darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="light">Light Bulb</option>
                    <option value="switch">Power Switch</option>
                    <option value="sensor">Air Sensor</option>
                    <option value="fan">Ventilation Fan</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Room Assignment</label>
                  <select
                    value={newDeviceRoom}
                    onChange={(e) => setNewDeviceRoom(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs border outline-none ${
                      darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {rooms.map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Estimated Load (Watts)</label>
                <input 
                  type="number"
                  min="0"
                  max="3000"
                  value={newDevicePower}
                  onChange={(e) => setNewDevicePower(Number(e.target.value) || 0)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${
                    darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewDeviceModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold ${
                    darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#7B61FF] text-white hover:bg-[#684be3] shadow-md"
                >
                  Register Entity
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
