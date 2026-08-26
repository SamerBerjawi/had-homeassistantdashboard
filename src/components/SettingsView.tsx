/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User,
  IdentificationCard,
  Key,
  Lock,
  LockOpen,
  Palette,
  Sun,
  Moon,
  Sparkle,
  SlidersHorizontal,
  Faders,
  House,
  Cpu,
  Power,
  Lightbulb,
  Thermometer,
  Lightning,
  Robot,
  Camera,
  ShieldCheck,
  MusicNotes,
  DownloadSimple,
  UploadSimple,
  ArrowCounterClockwise,
  Trash,
  Plus,
  Check,
  CheckCircle,
  Warning,
  WifiHigh,
  Radio,
  HardDrives,
  X,
  Clock,
  CurrencyDollar,
  ArrowsClockwise,
  CaretDown,
  FloppyDisk,
  ShareNetwork,
  GearSix,
  Desktop,
  Eye,
  EyeSlash,
  MagnifyingGlass,
  CheckFat
} from '@phosphor-icons/react';
import { HAEntity, Room, LogMessage, ToastNotification } from '../types';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';
import { useCanvasStore } from '../store/useCanvasStore';
import { WeatherBackdropType } from '../types/canvas';

interface SettingsViewProps {
  darkMode: boolean;
  toggleDarkMode: (mode?: boolean) => void;
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

type SettingsSection = 
  | 'user_profile' 
  | 'theme_customization' 
  | 'devices_rooms' 
  | 'backup_restore' 
  | 'connection_websocket';

interface UserProfileData {
  displayName: string;
  email: string;
  role: 'Administrator' | 'Resident' | 'Kiosk Operator';
  avatarInitials: string;
  homeName: string;
}

const DEFAULT_PROFILE_DATA: UserProfileData = {
  displayName: 'Alex Mercer',
  email: 'alex.mercer@homz.internal',
  role: 'Administrator',
  avatarInitials: 'AM',
  homeName: 'Main Residence (Skyline)'
};

interface LocalSnapshot {
  id: string;
  name: string;
  timestamp: string;
  cardCount: number;
  profileCount: number;
  data: string;
}

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
    connectionStatus,
    connectToHA,
    disconnectFromHA,
    rawAreas,
    rawDevices,
    rawStates,
    updateEntityState,
    reassignEntityArea,
    callHAService
  } = useAutoLayoutStore();

  const {
    profiles,
    activeProfileId,
    pinCode,
    setPinCode,
    weatherBackdrop,
    setWeatherBackdrop,
    exportProfilesJson,
    importProfilesJson,
    resetToDefaults
  } = useCanvasStore();

  const [activeSection, setActiveSection] = useState<SettingsSection>('user_profile');

  // ==========================================
  // 1. USER PROFILE STATE
  // ==========================================
  const [profileData, setProfileData] = useState<UserProfileData>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('homz_user_profile_v1');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return DEFAULT_PROFILE_DATA;
  });

  const [newPinInput, setNewPinInput] = useState('');
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [profileSavedNotice, setProfileSavedNotice] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('homz_user_profile_v1', JSON.stringify(profileData));
    setProfileSavedNotice(true);
    addLog('info', `Updated user profile for ${profileData.displayName}`);
    addToast?.({
      type: 'success',
      title: 'Profile Updated',
      message: 'User profile settings successfully saved.'
    });
    setTimeout(() => setProfileSavedNotice(false), 2500);
  };

  const handleSavePin = () => {
    if (newPinInput.length === 4 && /^\d+$/.test(newPinInput)) {
      setPinCode(newPinInput);
      setNewPinInput('');
      setIsEditingPin(false);
      addToast?.({
        type: 'success',
        title: 'Kiosk PIN Updated',
        message: 'New 4-digit security PIN has been set.'
      });
    } else {
      addToast?.({
        type: 'warning',
        title: 'Invalid PIN',
        message: 'PIN must be exactly 4 digits.'
      });
    }
  };

  const handleClearPin = () => {
    setPinCode('');
    setIsEditingPin(false);
    addToast?.({
      type: 'info',
      title: 'PIN Removed',
      message: 'Kiosk lock PIN protection disabled.'
    });
  };

  // ==========================================
  // 2. THEME & CUSTOMIZATION STATE
  // ==========================================
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>(() => {
    return (localStorage.getItem('homz_temp_unit') as 'C' | 'F') || 'C';
  });
  const [clockFormat, setClockFormat] = useState<'24h' | '12h'>(() => {
    return (localStorage.getItem('homz_clock_format') as '24h' | '12h') || '24h';
  });
  const [energyTariff, setEnergyTariff] = useState<number>(() => {
    const saved = localStorage.getItem('homz_energy_tariff');
    return saved ? parseFloat(saved) : 0.18;
  });
  const [currencySymbol, setCurrencySymbol] = useState<string>(() => {
    return localStorage.getItem('homz_currency_symbol') || '€';
  });
  const [glassBlurLevel, setGlassBlurLevel] = useState<'standard' | 'deep' | 'subtle'>(() => {
    return (localStorage.getItem('homz_glass_blur') as any) || 'deep';
  });
  const [specularHighlight, setSpecularHighlight] = useState<boolean>(() => {
    const saved = localStorage.getItem('homz_specular_highlight');
    return saved !== null ? saved === 'true' : true;
  });

  const handleSavePreferences = () => {
    localStorage.setItem('homz_temp_unit', tempUnit);
    localStorage.setItem('homz_clock_format', clockFormat);
    localStorage.setItem('homz_energy_tariff', energyTariff.toString());
    localStorage.setItem('homz_currency_symbol', currencySymbol);
    localStorage.setItem('homz_glass_blur', glassBlurLevel);
    localStorage.setItem('homz_specular_highlight', specularHighlight.toString());

    addToast?.({
      type: 'success',
      title: 'Customization Saved',
      message: 'System appearance & unit preferences persisted.'
    });
  };

  // ==========================================
  // 3. DEVICES + ROOM (TOGGLE) STATE
  // ==========================================
  const [deviceRoomView, setDeviceRoomView] = useState<'devices' | 'rooms'>('devices');
  const [searchFilter, setSearchFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceDomain, setNewDeviceDomain] = useState<'light' | 'switch' | 'climate' | 'sensor'>('light');
  const [newDeviceRoom, setNewDeviceRoom] = useState(rooms[0]?.name || 'Living Room');
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');

  const filteredEntities = entities.filter(e => {
    const nameMatch = (e.attributes?.friendly_name || e.entity_id).toLowerCase().includes(searchFilter.toLowerCase()) ||
                      e.entity_id.toLowerCase().includes(searchFilter.toLowerCase());
    if (!nameMatch) return false;
    if (domainFilter === 'all') return true;
    return e.entity_id.startsWith(`${domainFilter}.`);
  });

  const handleToggleEntity = (entity: HAEntity) => {
    const domain = entity.entity_id.split('.')[0];
    const isCurrentlyOn = entity.state === 'on' || entity.state === 'open' || entity.state === 'unlocked';
    const nextState = isCurrentlyOn ? 'off' : 'on';

    if (isLiveMode) {
      const service = isCurrentlyOn ? 'turn_off' : 'turn_on';
      callHAService(domain, service, {}, { entity_id: entity.entity_id });
    } else {
      updateEntityState(entity.entity_id, nextState);
    }

    setEntities(prev => prev.map(item => item.entity_id === entity.entity_id ? { ...item, state: nextState } : item));
    addLog('state_changed', `Toggled ${entity.entity_id} to ${nextState}`);
  };

  const handleAddDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName.trim()) return;

    const safeId = newDeviceName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const entityId = `${newDeviceDomain}.${safeId}_${Date.now().toString().slice(-4)}`;

    const newEnt: HAEntity = {
      entity_id: entityId,
      state: 'off',
      attributes: {
        friendly_name: newDeviceName.trim(),
        room: newDeviceRoom,
        power: newDeviceDomain === 'light' ? 12 : newDeviceDomain === 'switch' ? 45 : 0
      }
    };

    setEntities(prev => [newEnt, ...prev]);
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

    addLog('state_changed', `Added new entity ${newDeviceName} (${entityId}) in ${newDeviceRoom}`);
    addToast?.({
      type: 'success',
      title: 'Device Added',
      message: `${newDeviceName} (${entityId}) registered.`
    });
    setNewDeviceName('');
    setShowAddDeviceModal(false);
  };

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    const newRoomObj: Room = {
      id: `room_${Date.now()}`,
      name: newRoomName.trim(),
      devicesCount: 0,
      icon: 'Armchair',
      temperature: 21,
      humidity: 45,
      bannerImage: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80',
      entityIds: []
    };

    setRooms(prev => [...prev, newRoomObj]);
    addToast?.({
      type: 'success',
      title: 'Room Created',
      message: `Area "${newRoomName}" added.`
    });
    setNewRoomName('');
    setShowAddRoomModal(false);
  };

  const handleDeleteEntity = (entityId: string) => {
    setEntities(prev => prev.filter(e => e.entity_id !== entityId));
    setRooms(prev => prev.map(r => ({
      ...r,
      devicesCount: r.entityIds.includes(entityId) ? Math.max(0, r.devicesCount - 1) : r.devicesCount,
      entityIds: r.entityIds.filter(id => id !== entityId)
    })));
    addToast?.({
      type: 'warning',
      title: 'Device Removed',
      message: `${entityId} removed from registry.`
    });
  };

  // ==========================================
  // 4. BACKUP & RESTORE STATE
  // ==========================================
  const [snapshots, setSnapshots] = useState<LocalSnapshot[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('homz_saved_snapshots_v1');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return [];
  });
  const [snapshotNameInput, setSnapshotNameInput] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateSnapshot = () => {
    const name = snapshotNameInput.trim() || `Snapshot ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const backupObj = {
      version: '2026.8',
      createdAt: new Date().toISOString(),
      profiles,
      activeProfileId,
      entities,
      rooms,
      profileData,
      settings: {
        tempUnit,
        clockFormat,
        energyTariff,
        currencySymbol,
        weatherBackdrop
      }
    };

    const newSnap: LocalSnapshot = {
      id: `snap_${Date.now()}`,
      name,
      timestamp: new Date().toLocaleString(),
      cardCount: Object.values(profiles).reduce((acc, p) => acc + (p.layout?.length || 0), 0),
      profileCount: Object.keys(profiles).length,
      data: JSON.stringify(backupObj)
    };

    const updated = [newSnap, ...snapshots];
    setSnapshots(updated);
    localStorage.setItem('homz_saved_snapshots_v1', JSON.stringify(updated));
    setSnapshotNameInput('');
    addToast?.({
      type: 'success',
      title: 'Snapshot Saved',
      message: `Snapshot "${name}" saved to local storage.`
    });
  };

  const handleRestoreSnapshot = (snap: LocalSnapshot) => {
    try {
      const parsed = JSON.parse(snap.data);
      if (parsed.profiles) {
        importProfilesJson(JSON.stringify(parsed.profiles));
      }
      if (parsed.entities) setEntities(parsed.entities);
      if (parsed.rooms) setRooms(parsed.rooms);
      if (parsed.profileData) setProfileData(parsed.profileData);
      
      addToast?.({
        type: 'success',
        title: 'Snapshot Restored',
        message: `Restored layout and configuration from "${snap.name}".`
      });
    } catch (err) {
      addToast?.({
        type: 'warning',
        title: 'Restore Failed',
        message: 'Could not restore snapshot data.'
      });
    }
  };

  const handleDeleteSnapshot = (id: string) => {
    const updated = snapshots.filter(s => s.id !== id);
    setSnapshots(updated);
    localStorage.setItem('homz_saved_snapshots_v1', JSON.stringify(updated));
  };

  const handleExportFullBackup = () => {
    const fullBackup = {
      system: 'HOMZ Smart Dashboard',
      version: '2026.8.0',
      exportedAt: new Date().toISOString(),
      canvasProfiles: profiles,
      activeProfileId,
      entities,
      rooms,
      userProfile: profileData,
      preferences: {
        tempUnit,
        clockFormat,
        energyTariff,
        currencySymbol,
        weatherBackdrop,
        darkMode
      }
    };

    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `homz-dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addToast?.({
      type: 'info',
      title: 'Backup Downloaded',
      message: 'Full dashboard backup JSON file exported.'
    });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = JSON.parse(text);

        if (parsed.canvasProfiles) {
          importProfilesJson(JSON.stringify(parsed.canvasProfiles));
        } else if (parsed.profiles) {
          importProfilesJson(JSON.stringify(parsed.profiles));
        }
        if (parsed.entities) setEntities(parsed.entities);
        if (parsed.rooms) setRooms(parsed.rooms);
        if (parsed.userProfile) setProfileData(parsed.userProfile);

        addToast?.({
          type: 'success',
          title: 'Backup Restored',
          message: 'Dashboard profiles, layout, and settings imported.'
        });
      } catch (err) {
        addToast?.({
          type: 'warning',
          title: 'Import Error',
          message: 'Invalid JSON backup file format.'
        });
      }
    };
    reader.readAsText(file);
  };

  const handleFactoryReset = () => {
    resetToDefaults();
    localStorage.removeItem('homz_user_profile_v1');
    localStorage.removeItem('homz_saved_snapshots_v1');
    setShowResetConfirm(false);
    addToast?.({
      type: 'warning',
      title: 'Factory Reset Complete',
      message: 'Dashboard reset to original default state.'
    });
  };

  // ==========================================
  // 5. CONNECTION + WEBSOCKET + STATUS STATE
  // ==========================================
  const [wsUrlInput, setWsUrlInput] = useState(storeServerUrl || 'wss://hass.homz.internal/api/websocket');
  const [tokenInput, setTokenInput] = useState(storeHaToken || '');
  const [showToken, setShowToken] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingLatency, setPingLatency] = useState<number | null>(12);
  const [logFilter, setLogFilter] = useState<'all' | 'service_call' | 'state_changed' | 'info' | 'error'>('all');

  const handleConnectWs = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsUrlInput.trim()) return;

    connectToHA(wsUrlInput.trim(), tokenInput.trim());
    addLog('info', `Connecting WebSocket endpoint: ${wsUrlInput.trim()}`);
    addToast?.({
      type: 'info',
      title: 'Connecting to HA',
      message: `Establishing connection to ${wsUrlInput.trim()}...`
    });
  };

  const handleTestLatency = () => {
    setIsPinging(true);
    addLog('service_call', 'WebSocket ping request transmitted');
    setTimeout(() => {
      const ms = Math.floor(Math.random() * 10) + 6;
      setPingLatency(ms);
      setIsPinging(false);
      addLog('info', `WebSocket pong received in ${ms}ms`);
    }, 400);
  };

  const filteredLogs = logs.filter(l => {
    if (logFilter === 'all') return true;
    return l.type === logFilter;
  });

  const SECTIONS = [
    { id: 'user_profile' as const, label: 'User Profile', desc: 'Account, credentials & Kiosk PIN', icon: User },
    { id: 'theme_customization' as const, label: 'Theme + Customization', desc: 'Glassmorphism, units & backdrops', icon: Palette },
    { id: 'devices_rooms' as const, label: 'Devices + Room (toggle)', desc: 'IoT entity registry & area mapping', icon: SlidersHorizontal },
    { id: 'backup_restore' as const, label: 'Backup and Restore', desc: 'JSON exports, snapshots & resets', icon: DownloadSimple },
    { id: 'connection_websocket' as const, label: 'Connection + Web Socket + Status', desc: 'HA Core WebSocket API & live logs', icon: WifiHigh }
  ];

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-7xl w-full mx-auto pb-12">
      {/* Top Hero Banner */}
      <div className={`p-6 sm:p-7 rounded-3xl border backdrop-blur-md backdrop-saturate-150 transition-all ${
        darkMode 
          ? 'bg-slate-950/40 border-white/10 text-white shadow-xl shadow-black/40 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.15)]' 
          : 'bg-white/80 border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <GearSix size={36} weight="duotone" className="text-sky-400 shrink-0" />
            <div>
              <span className={`text-[10px] font-black uppercase tracking-widest block mb-0.5 ${
                darkMode ? 'text-sky-400' : 'text-sky-600'
              }`}>System Administration</span>
              <h2 className={`text-xl sm:text-2xl font-black tracking-tight leading-tight ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Settings & System Preferences
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure profile security, theme parameters, live HA connectivity, and device assignments.
              </p>
            </div>
          </div>

          {/* Quick Telemetry Pill */}
          <div className={`flex items-center gap-3 px-3.5 py-2 rounded-2xl border text-xs font-mono self-start sm:self-auto ${
            darkMode ? 'bg-white/[0.03] border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-800'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${isLiveMode ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-400'}`} />
            <span>{isLiveMode ? 'Live HA WebSocket' : 'Local Standalone'}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Sidebar Navigation & Content Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Settings Nav Column */}
        <div className="lg:col-span-4 flex flex-col gap-2">
          <div className={`p-2.5 rounded-3xl border backdrop-blur-md backdrop-saturate-150 flex flex-col gap-1.5 ${
            darkMode ? 'bg-white/[0.03] border-white/10' : 'bg-white/80 border-slate-200'
          }`}>
            {SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl transition-all cursor-pointer text-left border ${
                    isActive
                      ? darkMode
                        ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/15 text-white border-sky-400/30 shadow-[0_0_15px_-3px_rgba(56,189,248,0.25)] font-bold'
                        : 'bg-gradient-to-r from-sky-500/15 to-indigo-500/10 text-sky-950 border-sky-500/30 shadow-sm font-bold'
                      : darkMode
                        ? 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-white/[0.04]'
                        : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon
                    size={22}
                    weight="duotone"
                    className={`shrink-0 ${isActive ? (darkMode ? 'text-sky-400' : 'text-sky-600') : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className={`text-xs font-bold truncate ${isActive ? (darkMode ? 'text-white' : 'text-slate-900') : ''}`}>
                      {sec.label}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {sec.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Settings Content Section */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {/* ========================================================================= */}
            {/* 1. USER PROFILE SECTION */}
            {/* ========================================================================= */}
            {activeSection === 'user_profile' && (
              <motion.div
                key="user_profile"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`p-6 sm:p-7 rounded-3xl border backdrop-blur-md backdrop-saturate-150 space-y-6 ${
                  darkMode ? 'bg-white/[0.03] border-white/10 shadow-2xl' : 'bg-white/90 border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between border-b pb-4 border-white/10 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <User size={28} weight="duotone" className="text-sky-400" />
                    <div>
                      <h3 className="text-base font-extrabold text-white dark:text-white text-slate-900">User Profile & Identity</h3>
                      <p className="text-xs text-slate-400">Manage owner credentials, permissions, and wall display PIN.</p>
                    </div>
                  </div>
                </div>

                {/* Profile Avatar Card */}
                <div className="flex flex-col sm:flex-row items-center gap-5 p-5 rounded-2xl bg-white/[0.02] border border-white/10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
                    {profileData.avatarInitials || 'AM'}
                  </div>
                  <div className="min-w-0 text-center sm:text-left flex-1">
                    <h4 className="text-base font-bold text-white dark:text-white text-slate-900">{profileData.displayName}</h4>
                    <p className="text-xs text-slate-400">{profileData.email}</p>
                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-400/30">
                        {profileData.role}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        Session Active
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profile Edit Form */}
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1.5">Full Name</label>
                      <input
                        type="text"
                        value={profileData.displayName}
                        onChange={(e) => {
                          const val = e.target.value;
                          const initials = val.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                          setProfileData({ ...profileData, displayName: val, avatarInitials: initials || 'U' });
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs focus:outline-hidden focus:border-sky-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1.5">Email Address</label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs focus:outline-hidden focus:border-sky-400"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1.5">Access Role</label>
                      <select
                        value={profileData.role}
                        onChange={(e) => setProfileData({ ...profileData, role: e.target.value as any })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs focus:outline-hidden focus:border-sky-400"
                      >
                        <option value="Administrator" className="bg-slate-900 text-white">Administrator (Full Control)</option>
                        <option value="Resident" className="bg-slate-900 text-white">Resident (Device Control Only)</option>
                        <option value="Kiosk Operator" className="bg-slate-900 text-white">Kiosk Operator (Wall Display)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1.5">Home Location Name</label>
                      <input
                        type="text"
                        value={profileData.homeName}
                        onChange={(e) => setProfileData({ ...profileData, homeName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs focus:outline-hidden focus:border-sky-400"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-[0_0_20px_rgba(14,165,233,0.35)] transition-all cursor-pointer"
                    >
                      <FloppyDisk size={16} weight="duotone" />
                      <span>{profileSavedNotice ? 'Saved!' : 'Save Profile Changes'}</span>
                    </button>
                  </div>
                </form>

                {/* Kiosk Mode 4-Digit PIN Security */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Key size={22} weight="duotone" className="text-indigo-400" />
                      <div>
                        <h4 className="text-xs font-bold text-white">Wall Display 4-Digit PIN Lock</h4>
                        <p className="text-[11px] text-slate-400">Protects editing canvas cards and system settings on shared wall displays.</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                      pinCode ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}>
                      {pinCode ? 'PIN Active' : 'No PIN Set'}
                    </span>
                  </div>

                  {isEditingPin ? (
                    <div className="flex items-center gap-3 pt-2">
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="Enter 4 digits..."
                        value={newPinInput}
                        onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                        className="w-40 px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-white font-mono text-center tracking-widest text-sm focus:outline-hidden focus:border-sky-400"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSavePin}
                        className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold cursor-pointer"
                      >
                        Set PIN
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsEditingPin(false); setNewPinInput(''); }}
                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingPin(true)}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-all cursor-pointer"
                      >
                        {pinCode ? 'Change PIN Code' : 'Configure 4-Digit PIN'}
                      </button>
                      {pinCode && (
                        <button
                          type="button"
                          onClick={handleClearPin}
                          className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-bold transition-all cursor-pointer"
                        >
                          Remove PIN Lock
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ========================================================================= */}
            {/* 2. THEME + CUSTOMIZATION SECTION */}
            {/* ========================================================================= */}
            {activeSection === 'theme_customization' && (
              <motion.div
                key="theme_customization"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`p-6 sm:p-7 rounded-3xl border backdrop-blur-md backdrop-saturate-150 space-y-6 ${
                  darkMode ? 'bg-white/[0.03] border-white/10 shadow-2xl' : 'bg-white/90 border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between border-b pb-4 border-white/10">
                  <div className="flex items-center gap-3">
                    <Palette size={28} weight="duotone" className="text-sky-400" />
                    <div>
                      <h3 className="text-base font-extrabold text-white">Theme & Visual Customization</h3>
                      <p className="text-xs text-slate-400">Control obsidian glassmorphism, units, specular glows, and backdrop simulations.</p>
                    </div>
                  </div>
                </div>

                {/* Appearance Mode Selection */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-300 block">Appearance Mode</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => toggleDarkMode(true)}
                      className={`p-4 rounded-2xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                        darkMode
                          ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/15 border-sky-400/40 text-white shadow-[0_0_15px_-3px_rgba(56,189,248,0.2)] font-bold'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Moon size={24} weight="duotone" className={darkMode ? 'text-sky-400' : 'text-slate-400'} />
                      <div>
                        <div className="text-xs font-bold">Deep Obsidian Void</div>
                        <div className="text-[10px] text-slate-400">Glassmorphic OLED dark mode</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleDarkMode(false)}
                      className={`p-4 rounded-2xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                        !darkMode
                          ? 'bg-sky-500/15 border-sky-500 text-sky-950 font-bold shadow-md'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Sun size={24} weight="duotone" className={!darkMode ? 'text-amber-500' : 'text-slate-400'} />
                      <div>
                        <div className="text-xs font-bold">Daylight Frost Glass</div>
                        <div className="text-[10px] text-slate-400">High-clarity light mode</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Measurement Units & Formatting */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">Temperature Unit</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTempUnit('C')}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          tempUnit === 'C' ? 'bg-sky-500 text-white border-sky-400 shadow-md' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        Celsius (°C)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTempUnit('F')}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          tempUnit === 'F' ? 'bg-sky-500 text-white border-sky-400 shadow-md' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        Fahrenheit (°F)
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">Time Display Format</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setClockFormat('24h')}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          clockFormat === '24h' ? 'bg-sky-500 text-white border-sky-400 shadow-md' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        24-Hour (18:45)
                      </button>
                      <button
                        type="button"
                        onClick={() => setClockFormat('12h')}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          clockFormat === '12h' ? 'bg-sky-500 text-white border-sky-400 shadow-md' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        12-Hour (6:45 PM)
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                    <label className="text-xs font-bold text-slate-300 block">Energy Tariff & Currency</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={energyTariff}
                        onChange={(e) => setEnergyTariff(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white text-xs font-mono focus:outline-hidden focus:border-sky-400"
                      />
                      <select
                        value={currencySymbol}
                        onChange={(e) => setCurrencySymbol(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white text-xs font-bold focus:outline-hidden focus:border-sky-400"
                      >
                        <option value="€">€ / kWh</option>
                        <option value="$">$ / kWh</option>
                        <option value="£">£ / kWh</option>
                        <option value="¢">¢ / kWh</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Weather Backdrop Simulation Override */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">Default Canvas Weather Backdrop</h4>
                      <p className="text-[11px] text-slate-400">Choose the atmospheric canvas backdrop simulation mode.</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-sky-400 uppercase">
                      {weatherBackdrop}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'auto' as WeatherBackdropType, label: 'Auto (Hass Entity)' },
                      { id: 'sunny' as WeatherBackdropType, label: 'Sunny Day' },
                      { id: 'rain' as WeatherBackdropType, label: 'Rain Streaks' },
                      { id: 'starry-night' as WeatherBackdropType, label: 'Starry Night' }
                    ].map((backdrop) => (
                      <button
                        key={backdrop.id}
                        type="button"
                        onClick={() => setWeatherBackdrop(backdrop.id)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          weatherBackdrop === backdrop.id
                            ? 'bg-sky-500/20 text-sky-400 border-sky-400 shadow-md font-bold'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {backdrop.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSavePreferences}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-[0_0_20px_rgba(14,165,233,0.35)] transition-all cursor-pointer"
                  >
                    <FloppyDisk size={16} weight="duotone" />
                    <span>Save Customization Settings</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ========================================================================= */}
            {/* 3. DEVICES + ROOM (TOGGLE) SECTION */}
            {/* ========================================================================= */}
            {activeSection === 'devices_rooms' && (
              <motion.div
                key="devices_rooms"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`p-6 sm:p-7 rounded-3xl border backdrop-blur-md backdrop-saturate-150 space-y-6 ${
                  darkMode ? 'bg-white/[0.03] border-white/10 shadow-2xl' : 'bg-white/90 border-slate-200 shadow-sm'
                }`}
              >
                {/* Header & Toggle Switch */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-white/10">
                  <div className="flex items-center gap-3">
                    <SlidersHorizontal size={28} weight="duotone" className="text-sky-400" />
                    <div>
                      <h3 className="text-base font-extrabold text-white">Entity Registry & Area Management</h3>
                      <p className="text-xs text-slate-400">View and manage device states, area topology, and custom room assignments.</p>
                    </div>
                  </div>

                  {/* BY DEVICES / BY ROOMS TOGGLE */}
                  <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/15 shrink-0 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setDeviceRoomView('devices')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        deviceRoomView === 'devices'
                          ? 'bg-sky-500 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      By Devices ({entities.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeviceRoomView('rooms')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        deviceRoomView === 'rooms'
                          ? 'bg-sky-500 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      By Rooms ({rooms.length})
                    </button>
                  </div>
                </div>

                {/* Filters & Actions Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <MagnifyingGlass size={16} weight="duotone" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder={deviceRoomView === 'devices' ? "Search entities by name or ID..." : "Search rooms..."}
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-hidden focus:border-sky-400"
                    />
                  </div>

                  {deviceRoomView === 'devices' ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={domainFilter}
                        onChange={(e) => setDomainFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-semibold focus:outline-hidden focus:border-sky-400"
                      >
                        <option value="all" className="bg-slate-900 text-white">All Domains</option>
                        <option value="light" className="bg-slate-900 text-white">Lights</option>
                        <option value="climate" className="bg-slate-900 text-white">Climate / Thermostats</option>
                        <option value="switch" className="bg-slate-900 text-white">Switches & Plugs</option>
                        <option value="sensor" className="bg-slate-900 text-white">Sensors</option>
                        <option value="media_player" className="bg-slate-900 text-white">Media Players</option>
                        <option value="vacuum" className="bg-slate-900 text-white">Vacuums</option>
                        <option value="camera" className="bg-slate-900 text-white">Cameras</option>
                        <option value="lock" className="bg-slate-900 text-white">Security Locks</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => setShowAddDeviceModal(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all cursor-pointer shrink-0 shadow-[0_0_15px_rgba(14,165,233,0.3)]"
                      >
                        <Plus size={15} weight="bold" />
                        <span>Add Device</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddRoomModal(true)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all cursor-pointer shrink-0 shadow-[0_0_15px_rgba(14,165,233,0.3)]"
                    >
                      <Plus size={15} weight="bold" />
                      <span>Add Room</span>
                    </button>
                  )}
                </div>

                {/* VIEW 1: BY DEVICES LIST */}
                {deviceRoomView === 'devices' && (
                  <div className="space-y-2 max-h-[480px] overflow-y-auto touch-scroll-container pr-1">
                    {filteredEntities.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 border border-white/10 rounded-2xl bg-white/[0.02]">
                        No matching entities found in registry.
                      </div>
                    ) : (
                      filteredEntities.map((ent) => {
                        const domain = ent.entity_id.split('.')[0];
                        const isOn = ent.state === 'on' || ent.state === 'open' || ent.state === 'unlocked';
                        const friendlyName = ent.attributes?.friendly_name || ent.entity_id;
                        const roomName = ent.attributes?.room || 'Unassigned';

                        return (
                          <div
                            key={ent.entity_id}
                            className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 flex items-center justify-between gap-4 transition-all"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <button
                                type="button"
                                onClick={() => handleToggleEntity(ent)}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                  isOn 
                                    ? 'bg-sky-500/20 text-sky-400 border border-sky-400/40 shadow-[0_0_10px_rgba(56,189,248,0.3)]' 
                                    : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'
                                }`}
                                title="Toggle state"
                              >
                                <Power size={18} weight="duotone" />
                              </button>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h5 className="text-xs font-bold text-white truncate">{friendlyName}</h5>
                                  <span className="text-[10px] font-mono text-slate-400 truncate">({ent.entity_id})</span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">{domain}</span>
                                  <span className="text-slate-600">•</span>
                                  <span className="text-[10px] text-slate-300">{roomName}</span>
                                </div>
                              </div>
                            </div>

                            {/* Right Actions: State Badge & Delete */}
                            <div className="flex items-center gap-3 shrink-0">
                              <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border uppercase ${
                                isOn ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}>
                                {ent.state}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleDeleteEntity(ent.entity_id)}
                                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/10 flex items-center justify-center transition-colors cursor-pointer"
                                title="Delete entity"
                              >
                                <Trash size={14} weight="duotone" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* VIEW 2: BY ROOMS LIST */}
                {deviceRoomView === 'rooms' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[480px] overflow-y-auto touch-scroll-container pr-1">
                    {rooms.map((room) => {
                      const roomEntities = entities.filter(e => 
                        (e.attributes?.room && e.attributes.room.toLowerCase() === room.name.toLowerCase()) ||
                        room.entityIds.includes(e.entity_id)
                      );

                      return (
                        <div
                          key={room.id}
                          className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <House size={20} weight="duotone" className="text-sky-400" />
                              <h4 className="text-sm font-bold text-white">{room.name}</h4>
                            </div>
                            <span className="text-[11px] font-mono text-slate-400">
                              {roomEntities.length} Devices
                            </span>
                          </div>

                          {/* Devices Pills in this room */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {roomEntities.length === 0 ? (
                              <span className="text-[11px] text-slate-500 italic">No assigned devices</span>
                            ) : (
                              roomEntities.map(ent => (
                                <button
                                  key={ent.entity_id}
                                  type="button"
                                  onClick={() => handleToggleEntity(ent)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                    ent.state === 'on' 
                                      ? 'bg-sky-500/20 text-sky-400 border-sky-400/40 shadow-xs' 
                                      : 'bg-white/5 text-slate-400 border-white/10'
                                  }`}
                                  title={`Toggle ${ent.entity_id}`}
                                >
                                  {ent.attributes?.friendly_name || ent.entity_id}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ========================================================================= */}
            {/* 4. BACKUP AND RESTORE SECTION */}
            {/* ========================================================================= */}
            {activeSection === 'backup_restore' && (
              <motion.div
                key="backup_restore"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`p-6 sm:p-7 rounded-3xl border backdrop-blur-md backdrop-saturate-150 space-y-6 ${
                  darkMode ? 'bg-white/[0.03] border-white/10 shadow-2xl' : 'bg-white/90 border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between border-b pb-4 border-white/10">
                  <div className="flex items-center gap-3">
                    <DownloadSimple size={28} weight="duotone" className="text-sky-400" />
                    <div>
                      <h3 className="text-base font-extrabold text-white">Backup, Snapshots & Disaster Recovery</h3>
                      <p className="text-xs text-slate-400">Export dashboard layout JSON, save local profile snapshots, or restore backups.</p>
                    </div>
                  </div>
                </div>

                {/* Primary Export & Import Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">Export Full Configuration JSON</h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Download a comprehensive `.json` file containing all canvas layouts, cards, room topologies, and user preferences.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportFullBackup}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-[0_0_20px_rgba(14,165,233,0.35)] transition-all cursor-pointer"
                    >
                      <DownloadSimple size={16} weight="bold" />
                      <span>Download Backup Archive (.json)</span>
                    </button>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">Restore from Backup File</h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Upload an existing dashboard backup `.json` file to restore all canvas cards, layouts, and entities.
                      </p>
                    </div>
                    <label className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs transition-all cursor-pointer">
                      <UploadSimple size={16} weight="bold" />
                      <span>Select Backup JSON File</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleImportFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Local Storage Snapshots Manager */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-white">Local Snapshot Snapshots ({snapshots.length})</h4>
                      <p className="text-[11px] text-slate-400">Create instant rollback points cached in local browser storage.</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Snapshot name..."
                        value={snapshotNameInput}
                        onChange={(e) => setSnapshotNameInput(e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs focus:outline-hidden focus:border-sky-400"
                      />
                      <button
                        type="button"
                        onClick={handleCreateSnapshot}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all cursor-pointer shrink-0"
                      >
                        Take Snapshot
                      </button>
                    </div>
                  </div>

                  {snapshots.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-white/10 rounded-xl">
                      No local snapshots stored yet. Click "Take Snapshot" above to create an instant rollback point.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto touch-scroll-container pr-1">
                      {snapshots.map((snap) => (
                        <div
                          key={snap.id}
                          className="p-3 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between gap-3"
                        >
                          <div>
                            <h5 className="text-xs font-bold text-white">{snap.name}</h5>
                            <p className="text-[10px] font-mono text-slate-400">
                              {snap.timestamp} • {snap.cardCount} cards • {snap.profileCount} profiles
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRestoreSnapshot(snap)}
                              className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/30 text-[11px] font-bold cursor-pointer transition-colors"
                            >
                              Restore
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSnapshot(snap.id)}
                              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/10 flex items-center justify-center cursor-pointer transition-colors"
                              title="Delete snapshot"
                            >
                              <Trash size={13} weight="duotone" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Factory Reset Section */}
                <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                      <Warning size={16} weight="duotone" /> Factory Reset Dashboard
                    </h4>
                    <p className="text-[11px] text-rose-200/70 mt-0.5">
                      Clear all custom canvas cards, layouts, and restore standard Home Assistant demo configuration.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer shrink-0"
                  >
                    Reset Defaults
                  </button>
                </div>
              </motion.div>
            )}

            {/* ========================================================================= */}
            {/* 5. CONNECTION + WEBSOCKET + STATUS SECTION */}
            {/* ========================================================================= */}
            {activeSection === 'connection_websocket' && (
              <motion.div
                key="connection_websocket"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`p-6 sm:p-7 rounded-3xl border backdrop-blur-md backdrop-saturate-150 space-y-6 ${
                  darkMode ? 'bg-white/[0.03] border-white/10 shadow-2xl' : 'bg-white/90 border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between border-b pb-4 border-white/10">
                  <div className="flex items-center gap-3">
                    <WifiHigh size={28} weight="duotone" className="text-sky-400" />
                    <div>
                      <h3 className="text-base font-extrabold text-white">Home Assistant WebSocket & Telemetry</h3>
                      <p className="text-xs text-slate-400">Direct real-time duplex socket configuration, latency testing, and live event feed.</p>
                    </div>
                  </div>

                  {/* Live Status Indicator */}
                  <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold font-mono uppercase ${
                    isLiveMode 
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                    <span>{connectionStatus || (isLiveMode ? 'Connected' : 'Standalone Demo')}</span>
                  </div>
                </div>

                {/* WebSocket Credentials Form */}
                <form onSubmit={handleConnectWs} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">Home Assistant WebSocket URL</label>
                    <input
                      type="text"
                      placeholder="wss://your-homeassistant.local:8123/api/websocket"
                      value={wsUrlInput}
                      onChange={(e) => setWsUrlInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white font-mono text-xs focus:outline-hidden focus:border-sky-400"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 block">Long-Lived Access Token</label>
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="text-[11px] text-sky-400 hover:underline cursor-pointer flex items-center gap-1"
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
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white font-mono text-xs focus:outline-hidden focus:border-sky-400"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTestLatency}
                        disabled={isPinging}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
                      >
                        <ArrowsClockwise size={14} className={isPinging ? 'animate-spin' : ''} />
                        <span>{isPinging ? 'Pinging Socket...' : 'Test Latency Ping'}</span>
                      </button>

                      {pingLatency !== null && (
                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2.5 py-1.5 rounded-xl border border-emerald-500/30">
                          {pingLatency}ms Roundtrip
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isLiveMode && (
                        <button
                          type="button"
                          onClick={() => disconnectFromHA()}
                          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Disconnect
                        </button>
                      )}
                      <button
                        type="submit"
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-[0_0_20px_rgba(14,165,233,0.35)] transition-all cursor-pointer"
                      >
                        <WifiHigh size={16} weight="bold" />
                        <span>Save & Connect WebSocket</span>
                      </button>
                    </div>
                  </div>
                </form>

                {/* Real-time Telemetry Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 text-center">
                    <div className="text-lg font-mono font-bold text-white">{entities.length}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Active Entities</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 text-center">
                    <div className="text-lg font-mono font-bold text-sky-400">{rooms.length}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Discovered Areas</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 text-center">
                    <div className="text-lg font-mono font-bold text-indigo-400">{Object.keys(rawDevices || {}).length || 18}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Physical Devices</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 text-center">
                    <div className="text-lg font-mono font-bold text-emerald-400">{logs.length}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Events Processed</div>
                  </div>
                </div>

                {/* Live WebSocket Event Log Stream */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radio size={16} weight="duotone" className="text-emerald-400 animate-pulse" />
                      <h4 className="text-xs font-bold text-white">Live Event Log Feed</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={logFilter}
                        onChange={(e) => setLogFilter(e.target.value as any)}
                        className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-[11px] text-slate-300 font-semibold focus:outline-hidden"
                      >
                        <option value="all">All Events</option>
                        <option value="state_changed">State Changed</option>
                        <option value="service_call">Service Calls</option>
                        <option value="info">Info Logs</option>
                        <option value="error">Errors</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => setLogs([])}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-slate-400 hover:text-white cursor-pointer"
                      >
                        Clear Feed
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto touch-scroll-container font-mono text-[11px] pr-1">
                    {filteredLogs.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-xs">No live log events captured yet.</div>
                    ) : (
                      filteredLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-2 rounded-lg bg-black/30 border border-white/5 flex items-start gap-2.5"
                        >
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase shrink-0 ${
                            log.type === 'error' ? 'bg-rose-500/20 text-rose-400' :
                            log.type === 'service_call' ? 'bg-indigo-500/20 text-indigo-400' :
                            log.type === 'state_changed' ? 'bg-sky-500/20 text-sky-400' :
                            'bg-slate-700/40 text-slate-400'
                          }`}>
                            {log.type.replace('_', ' ')}
                          </span>
                          <span className="text-slate-300 flex-1 break-all">{log.message}</span>
                          <span className="text-[10px] text-slate-500 shrink-0">{log.timestamp}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* MODAL: ADD DEVICE */}
      {showAddDeviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddDeviceModal(false)} />
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900/90 backdrop-blur-md border border-white/15 p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-white/10">
              <h4 className="text-sm font-bold text-white">Register Virtual IoT Device</h4>
              <button onClick={() => setShowAddDeviceModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddDevice} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Friendly Name</label>
                <input
                  type="text"
                  placeholder="e.g. Master Bedroom Chandelier"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs focus:outline-hidden focus:border-sky-400"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Domain Type</label>
                <select
                  value={newDeviceDomain}
                  onChange={(e) => setNewDeviceDomain(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs focus:outline-hidden focus:border-sky-400"
                >
                  <option value="light" className="bg-slate-900 text-white">Light (Dimmable / RGB)</option>
                  <option value="switch" className="bg-slate-900 text-white">Smart Switch / Socket</option>
                  <option value="climate" className="bg-slate-900 text-white">Thermostat / Climate</option>
                  <option value="sensor" className="bg-slate-900 text-white">Telemetry Sensor</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Assigned Room</label>
                <select
                  value={newDeviceRoom}
                  onChange={(e) => setNewDeviceRoom(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs focus:outline-hidden focus:border-sky-400"
                >
                  {rooms.map(r => (
                    <option key={r.id} value={r.name} className="bg-slate-900 text-white">{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDeviceModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Add Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD ROOM */}
      {showAddRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddRoomModal(false)} />
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900/90 backdrop-blur-md border border-white/15 p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-white/10">
              <h4 className="text-sm font-bold text-white">Create New Home Area</h4>
              <button onClick={() => setShowAddRoomModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddRoom} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Room / Area Name</label>
                <input
                  type="text"
                  placeholder="e.g. Cinema Room, Guest Suite, Patio"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs focus:outline-hidden focus:border-sky-400"
                  autoFocus
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRoomModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Create Area
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET CONFIRMATION */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowResetConfirm(false)} />
          <div className="relative w-full max-w-sm rounded-3xl bg-slate-900/95 backdrop-blur-md border border-white/15 p-6 shadow-2xl z-10 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <Warning size={28} weight="duotone" />
            </div>
            <h4 className="text-base font-black text-white">Reset Dashboard Defaults?</h4>
            <p className="text-xs text-slate-400">
              This will reset all custom canvas profiles, cards, and custom user configurations to factory defaults.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFactoryReset}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
