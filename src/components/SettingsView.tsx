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
  CheckFat,
  ArrowUp,
  ArrowDown,
  PencilSimple,
  Stairs,
  HouseLine,
  Bed,
  CookingPot,
  Bathtub,
  FilmSlate,
  Car,
  Books,
  DoorOpen,
  Armchair,
  Buildings,
  Tree,
  Shield,
  Stack,
  ArrowsVertical,
  PaintBrush,
  Compass,
  Tag,
  MapPin,
  Briefcase,
  GraduationCap,
  Barbell,
  Info
} from '@phosphor-icons/react';
import { HAEntity, Room, LogMessage, ToastNotification, HAArea, HAFloor, HALabel, HAZone } from '../types';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore } from '../store/useCanvasStore';
import { WeatherBackdropType } from '../types/canvas';
import CustomDropdown from './ui/CustomDropdown';
import { PwaStatusCard } from './pwa/PwaStatusCard';

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
    authType,
    connectionStatus,
    connectToHA,
    disconnectFromHA,
    loginWithHA,
    logoutHA,
    rawAreas,
    rawDevices,
    rawStates,
    floors,
    areas,
    labels,
    resolvedZones,
    resolvedEntities,
    updateFloor,
    updateArea,
    reorderFloors,
    reorderAreas,
    updateEntityState,
    reassignEntityArea,
    callHAService
  } = useAutoLayoutStore(useShallow(s => ({
    serverUrl: s.serverUrl,
    haToken: s.haToken,
    isLiveMode: s.isLiveMode,
    authType: s.authType,
    connectionStatus: s.connectionStatus,
    connectToHA: s.connectToHA,
    disconnectFromHA: s.disconnectFromHA,
    loginWithHA: s.loginWithHA,
    logoutHA: s.logoutHA,
    rawAreas: s.rawAreas,
    rawDevices: s.rawDevices,
    rawStates: s.rawStates,
    floors: s.floors,
    areas: s.areas,
    labels: s.labels,
    resolvedZones: s.resolvedZones,
    resolvedEntities: s.resolvedEntities,
    updateFloor: s.updateFloor,
    updateArea: s.updateArea,
    reorderFloors: s.reorderFloors,
    reorderAreas: s.reorderAreas,
    updateEntityState: s.updateEntityState,
    reassignEntityArea: s.reassignEntityArea,
    callHAService: s.callHAService
  })));

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
  const PRESET_COLORS = [
    '#0ea5e9', // Sky
    '#6366f1', // Indigo
    '#a855f7', // Purple
    '#ec4899', // Pink
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#f97316', // Orange
    '#f43f5e', // Rose
    '#06b6d4', // Cyan
    '#64748b'  // Slate
  ];

  const FLOOR_ICON_OPTIONS = [
    'Stairs', 'House', 'Buildings', 'Tree', 'Shield', 'Armchair', 'Sparkle', 'Compass', 'Stack', 'ArrowsVertical'
  ];

  const AREA_ICON_OPTIONS = [
    'Armchair', 'Bed', 'CookingPot', 'Desktop', 'Bathtub', 'FilmSlate', 'Tree', 'Car', 'Books', 'DoorOpen', 'Lightbulb', 'HouseLine'
  ];

  const renderIconByName = (iconName?: string | null, size = 18, colorClass = '') => {
    switch (iconName) {
      case 'Stairs': return <Stairs size={size} weight="duotone" className={colorClass} />;
      case 'House': return <House size={size} weight="duotone" className={colorClass} />;
      case 'Buildings': return <Buildings size={size} weight="duotone" className={colorClass} />;
      case 'Tree': return <Tree size={size} weight="duotone" className={colorClass} />;
      case 'Shield': return <Shield size={size} weight="duotone" className={colorClass} />;
      case 'Armchair': return <Armchair size={size} weight="duotone" className={colorClass} />;
      case 'Bed': return <Bed size={size} weight="duotone" className={colorClass} />;
      case 'CookingPot': return <CookingPot size={size} weight="duotone" className={colorClass} />;
      case 'Desktop': return <Desktop size={size} weight="duotone" className={colorClass} />;
      case 'Bathtub': return <Bathtub size={size} weight="duotone" className={colorClass} />;
      case 'FilmSlate': return <FilmSlate size={size} weight="duotone" className={colorClass} />;
      case 'Car': return <Car size={size} weight="duotone" className={colorClass} />;
      case 'Books': return <Books size={size} weight="duotone" className={colorClass} />;
      case 'DoorOpen': return <DoorOpen size={size} weight="duotone" className={colorClass} />;
      case 'Lightbulb': return <Lightbulb size={size} weight="duotone" className={colorClass} />;
      case 'HouseLine': return <HouseLine size={size} weight="duotone" className={colorClass} />;
      case 'Compass': return <Compass size={size} weight="duotone" className={colorClass} />;
      case 'Sparkle': return <Sparkle size={size} weight="duotone" className={colorClass} />;
      case 'Stack': return <Stack size={size} weight="duotone" className={colorClass} />;
      case 'ArrowsVertical': return <ArrowsVertical size={size} weight="duotone" className={colorClass} />;
      default: return <Armchair size={size} weight="duotone" className={colorClass} />;
    }
  };

  const [deviceRoomView, setDeviceRoomView] = useState<'floors_areas' | 'labels' | 'zones' | 'devices'>('floors_areas');
  const [searchFilter, setSearchFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [selectedLabelFilter, setSelectedLabelFilter] = useState<string>('all');
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceDomain, setNewDeviceDomain] = useState<'light' | 'switch' | 'climate' | 'sensor'>('light');
  const [newDeviceRoom, setNewDeviceRoom] = useState(areas[0]?.name || 'Living Room');
  
  // Floor & Area Customization State (Icons & Colors only; names/hierarchy are read-only from HA)
  const [editingFloor, setEditingFloor] = useState<HAFloor | null>(null);
  const [editingArea, setEditingArea] = useState<HAArea | null>(null);

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
    addLog('state_changed', `Added new entity ${newDeviceName} (${entityId}) in ${newDeviceRoom}`);
    addToast?.({
      type: 'success',
      title: 'Device Added',
      message: `${newDeviceName} (${entityId}) registered.`
    });
    setNewDeviceName('');
    setShowAddDeviceModal(false);
  };

  const handleDeleteEntity = (entityId: string) => {
    setEntities(prev => prev.filter(e => e.entity_id !== entityId));
    addToast?.({
      type: 'warning',
      title: 'Device Removed',
      message: `${entityId} removed from registry.`
    });
  };

  // --- Floor Ordering & Mutation Handlers ---
  const handleMoveFloor = (floorId: string, direction: 'up' | 'down') => {
    const idx = floors.findIndex(f => f.floor_id === floorId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= floors.length) return;

    const newFloors = [...floors];
    const [moved] = newFloors.splice(idx, 1);
    newFloors.splice(targetIdx, 0, moved);
    reorderFloors(newFloors);
    addToast?.({
      type: 'info',
      title: 'Floor Order Updated',
      message: `Moved ${moved.name} ${direction}.`
    });
  };

  const handleMoveAreaWithinFloor = (areaId: string, floorId: string | null, direction: 'up' | 'down') => {
    const floorAreas = areas.filter(a => (a.floor_id || null) === (floorId || null));
    const idx = floorAreas.findIndex(a => a.area_id === areaId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= floorAreas.length) return;

    const targetAreaId = floorAreas[targetIdx].area_id;
    const mainIdx1 = areas.findIndex(a => a.area_id === areaId);
    const mainIdx2 = areas.findIndex(a => a.area_id === targetAreaId);
    if (mainIdx1 === -1 || mainIdx2 === -1) return;

    const newAreas = [...areas];
    const temp = newAreas[mainIdx1];
    newAreas[mainIdx1] = newAreas[mainIdx2];
    newAreas[mainIdx2] = temp;
    reorderAreas(newAreas);
    addToast?.({
      type: 'info',
      title: 'Area Order Updated',
      message: `Moved ${areas[mainIdx1].name} ${direction}.`
    });
  };

  const handleSaveFloorEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFloor) return;
    updateFloor(editingFloor.floor_id, {
      icon: editingFloor.icon || 'Stairs',
      color: editingFloor.color || '#0ea5e9'
    });
    addToast?.({
      type: 'success',
      title: 'Floor Customization Saved',
      message: `Updated icon and accent color for "${editingFloor.name}".`
    });
    setEditingFloor(null);
  };

  const handleSaveAreaEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArea) return;
    updateArea(editingArea.area_id, {
      icon: editingArea.icon || 'Armchair',
      color: editingArea.color || '#6366f1'
    });
    addToast?.({
      type: 'success',
      title: 'Area Customization Saved',
      message: `Updated icon and accent color for "${editingArea.name}".`
    });
    setEditingArea(null);
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
  const [authMethodTab, setAuthMethodTab] = useState<'oauth' | 'llat'>(() => {
    return isLiveMode && authType === 'llat' ? 'llat' : 'oauth';
  });
  const [switchMethodConfirmTarget, setSwitchMethodConfirmTarget] = useState<'oauth' | 'llat' | null>(null);

  // Automatically sync tab with active live connection
  useEffect(() => {
    if (isLiveMode && (authType === 'oauth' || authType === 'llat')) {
      setAuthMethodTab(authType);
    }
  }, [isLiveMode, authType]);

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

  const [haHttpUrlInput, setHaHttpUrlInput] = useState(() => {
    if (storeServerUrl && !storeServerUrl.includes('hass.homz.internal')) {
      return storeServerUrl.replace('wss://', 'https://').replace('ws://', 'http://').replace('/api/websocket', '');
    }
    return 'http://homeassistant.local:8123';
  });
  const [wsUrlInput, setWsUrlInput] = useState(() => {
    if (storeServerUrl && !storeServerUrl.includes('hass.homz.internal')) {
      return storeServerUrl;
    }
    return 'ws://homeassistant.local:8123/api/websocket';
  });
  const [tokenInput, setTokenInput] = useState(storeHaToken || '');
  const [showToken, setShowToken] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingLatency, setPingLatency] = useState<number | null>(12);
  const [logFilter, setLogFilter] = useState<'all' | 'service_call' | 'state_changed' | 'info' | 'error'>('all');

  // Keep input fields in sync if store updates externally
  useEffect(() => {
    if (storeServerUrl && !storeServerUrl.includes('hass.homz.internal')) {
      setWsUrlInput(storeServerUrl);
      setHaHttpUrlInput(
        storeServerUrl
          .replace('wss://', 'https://')
          .replace('ws://', 'http://')
          .replace('/api/websocket', '')
      );
    }
  }, [storeServerUrl]);

  useEffect(() => {
    if (storeHaToken) {
      setTokenInput(storeHaToken);
    }
  }, [storeHaToken]);

  const handleStartOAuthLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!haHttpUrlInput.trim()) return;

    addLog('info', `Initiating Home Assistant OAuth login at: ${haHttpUrlInput.trim()}`);
    addToast?.({
      type: 'info',
      title: 'Redirecting to Home Assistant',
      message: 'Opening official Home Assistant login screen...'
    });
    loginWithHA(haHttpUrlInput.trim());
  };

  const handleConnectWs = (e: React.FormEvent) => {
    e.preventDefault();
    const targetWsUrl = wsUrlInput.trim();
    const targetToken = tokenInput.trim();

    if (!targetWsUrl) return;
    if (!targetToken) {
      addToast?.({
        type: 'warning',
        title: 'Token Required',
        message: 'Please paste your Long-Lived Access Token to connect.'
      });
      return;
    }

    connectToHA(targetWsUrl, targetToken);
    addLog('info', `Connecting WebSocket endpoint: ${targetWsUrl}`);
    addToast?.({
      type: 'info',
      title: 'Connecting to HA',
      message: `Establishing connection to ${targetWsUrl}...`
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
          ? 'bg-slate-950/40 border-white/10 text-white shadow-xl shadow-black/40' 
          : 'bg-white/80 border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <GearSix size={36} weight="duotone" className="text-sky-500 dark:text-sky-400 shrink-0" />
            <div>
              <span className={`text-[10px] font-black uppercase tracking-widest block mb-0.5 ${
                darkMode ? 'text-sky-400' : 'text-sky-600'
              }`}>System Administration</span>
              <h2 className={`text-xl sm:text-2xl font-black tracking-tight leading-tight ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Settings & System Preferences
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure profile security, theme parameters, live HA connectivity, and device assignments.
              </p>
            </div>
          </div>

          {/* Quick Telemetry Pill */}
          <div className={`flex items-center gap-3 px-3.5 py-2 rounded-2xl border text-xs font-mono self-start sm:self-auto ${
            darkMode ? 'bg-white/3 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-800'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${isLiveMode ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-500'}`} />
            <span>{isLiveMode ? 'Live HA WebSocket' : 'Local Standalone'}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Sidebar Navigation & Content Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Settings Nav Column */}
        <div className="lg:col-span-4 flex flex-col gap-2">
          <div className={`p-2.5 rounded-3xl border backdrop-blur-md backdrop-saturate-150 flex flex-col gap-1.5 ${
            darkMode ? 'bg-white/3 border-white/10' : 'bg-white/80 border-slate-200 shadow-sm'
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
                        ? 'bg-linear-to-r from-sky-500/20 to-indigo-500/15 text-white border-sky-400/30 shadow-[0_0_15px_-3px_rgba(56,189,248,0.25)] font-bold'
                        : 'bg-linear-to-r from-sky-500/15 to-indigo-500/10 text-sky-950 border-sky-500/30 shadow-sm font-bold'
                      : darkMode
                        ? 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-white/4'
                        : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon
                    size={22}
                    weight="duotone"
                    className={`shrink-0 ${isActive ? (darkMode ? 'text-sky-400' : 'text-sky-600') : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className={`text-xs font-bold truncate ${isActive ? (darkMode ? 'text-white' : 'text-slate-900') : 'text-slate-700 dark:text-slate-300'}`}>
                      {sec.label}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
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
                  darkMode ? 'bg-white/3 border-white/10 shadow-2xl' : 'bg-white/90 border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <User size={28} weight="duotone" className="text-sky-500 dark:text-sky-400" />
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">User Profile & Identity</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Manage owner credentials, permissions, and wall display PIN.</p>
                    </div>
                  </div>
                </div>

                {/* Profile Avatar Card */}
                <div className="flex flex-col sm:flex-row items-center gap-5 p-5 rounded-2xl bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/10">
                  <div className="w-16 h-16 rounded-2xl bg-linear-to-tr from-sky-500 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
                    {profileData.avatarInitials || 'AM'}
                  </div>
                  <div className="min-w-0 text-center sm:text-left flex-1">
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">{profileData.displayName}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{profileData.email}</p>
                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30">
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
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Full Name</label>
                      <input
                        type="text"
                        value={profileData.displayName}
                        onChange={(e) => {
                          const val = e.target.value;
                          const initials = val.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                          setProfileData({ ...profileData, displayName: val, avatarInitials: initials || 'U' });
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:border-sky-500 shadow-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Email Address</label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:border-sky-500 shadow-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <CustomDropdown
                        label="Access Role"
                        value={profileData.role}
                        onChange={(val) => setProfileData({ ...profileData, role: val as any })}
                        options={[
                          { value: 'Administrator', label: 'Administrator (Full Control)' },
                          { value: 'Resident', label: 'Resident (Device Control Only)' },
                          { value: 'Kiosk Operator', label: 'Kiosk Operator (Wall Display)' }
                        ]}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Home Location Name</label>
                      <input
                        type="text"
                        value={profileData.homeName}
                        onChange={(e) => setProfileData({ ...profileData, homeName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:border-sky-500 shadow-xs"
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
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Key size={22} weight="duotone" className="text-indigo-500 dark:text-indigo-400" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">Wall Display 4-Digit PIN Lock</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Protects editing canvas cards and system settings on shared wall displays.</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                      pinCode 
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' 
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
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
                        className="w-40 px-3.5 py-2 rounded-xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white font-mono text-center tracking-widest text-sm focus:outline-hidden focus:border-sky-500 shadow-xs"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSavePin}
                        className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold cursor-pointer shadow-sm"
                      >
                        Set PIN
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsEditingPin(false); setNewPinInput(''); }}
                        className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingPin(true)}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/15 dark:text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                      >
                        {pinCode ? 'Change PIN Code' : 'Configure 4-Digit PIN'}
                      </button>
                      {pinCode && (
                        <button
                          type="button"
                          onClick={handleClearPin}
                          className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer"
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
                  darkMode ? 'bg-white/3 border-white/10 shadow-2xl' : 'bg-white/90 border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <Palette size={28} weight="duotone" className="text-sky-500 dark:text-sky-400" />
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Theme & Visual Customization</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Control obsidian glassmorphism, units, specular glows, and backdrop simulations.</p>
                    </div>
                  </div>
                </div>

                {/* Appearance Mode Selection */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Appearance Mode</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => toggleDarkMode(true)}
                      className={`p-4 rounded-2xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                        darkMode
                          ? 'bg-linear-to-r from-sky-500/20 to-indigo-500/15 border-sky-400/40 text-white shadow-[0_0_15px_-3px_rgba(56,189,248,0.2)] font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
                      }`}
                    >
                      <Moon size={24} weight="duotone" className={darkMode ? 'text-sky-400' : 'text-slate-500 dark:text-slate-400'} />
                      <div>
                        <div className="text-xs font-bold">Deep Obsidian Void</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Glassmorphic OLED dark mode</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleDarkMode(false)}
                      className={`p-4 rounded-2xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                        !darkMode
                          ? 'bg-sky-500/15 border-sky-500 text-sky-950 font-bold shadow-md'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
                      }`}
                    >
                      <Sun size={24} weight="duotone" className={!darkMode ? 'text-amber-500' : 'text-slate-400'} />
                      <div>
                        <div className="text-xs font-bold">Daylight Frost Glass</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">High-clarity light mode</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Measurement Units & Formatting */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/10 space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Temperature Unit</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTempUnit('C')}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          tempUnit === 'C' 
                            ? 'bg-sky-500 text-white border-sky-400 shadow-md' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:text-slate-400 dark:hover:text-white'
                        }`}
                      >
                        Celsius (°C)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTempUnit('F')}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          tempUnit === 'F' 
                            ? 'bg-sky-500 text-white border-sky-400 shadow-md' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:text-slate-400 dark:hover:text-white'
                        }`}
                      >
                        Fahrenheit (°F)
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/10 space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Time Display Format</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setClockFormat('24h')}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          clockFormat === '24h' 
                            ? 'bg-sky-500 text-white border-sky-400 shadow-md' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:text-slate-400 dark:hover:text-white'
                        }`}
                      >
                        24-Hour (18:45)
                      </button>
                      <button
                        type="button"
                        onClick={() => setClockFormat('12h')}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          clockFormat === '12h' 
                            ? 'bg-sky-500 text-white border-sky-400 shadow-md' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:text-slate-400 dark:hover:text-white'
                        }`}
                      >
                        12-Hour (6:45 PM)
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/10 space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Energy Tariff & Currency</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={energyTariff}
                        onChange={(e) => setEnergyTariff(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-xs font-mono focus:outline-hidden focus:border-sky-500 shadow-xs"
                      />
                      <div className="w-32">
                        <CustomDropdown
                          value={currencySymbol}
                          onChange={(val) => setCurrencySymbol(val)}
                          options={[
                            { value: '€', label: '€ / kWh' },
                            { value: '$', label: '$ / kWh' },
                            { value: '£', label: '£ / kWh' },
                            { value: '¢', label: '¢ / kWh' }
                          ]}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Weather Backdrop Simulation Override */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Default Canvas Weather Backdrop</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Choose the atmospheric canvas backdrop simulation mode.</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 uppercase">
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
                        className={`p-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                          weatherBackdrop === backdrop.id
                            ? 'bg-sky-500 text-white border-sky-400 shadow-md'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:text-slate-400 dark:hover:text-white'
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
            {/* 3. FLOORS, AREAS & DEVICES SECTION */}
            {/* ========================================================================= */}
            {activeSection === 'devices_rooms' && (
              <motion.div
                key="devices_rooms"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`p-6 sm:p-7 rounded-3xl border backdrop-blur-md backdrop-saturate-150 space-y-6 ${
                  darkMode ? 'bg-white/3 border-white/10 shadow-2xl' : 'bg-white/90 border-slate-200 shadow-sm'
                }`}
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <SlidersHorizontal size={28} weight="duotone" className="text-sky-500 dark:text-sky-400" />
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Floors, Areas, Labels & Zones</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Customize default icons, accent colors, and display order. Home Assistant topology & names remain read-only.
                      </p>
                    </div>
                  </div>

                  {/* 4-Way Sub-Navigation Tabs */}
                  <div className="p-1 rounded-2xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 flex flex-wrap items-center gap-1 shrink-0 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setDeviceRoomView('floors_areas')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        deviceRoomView === 'floors_areas'
                          ? 'bg-white text-slate-900 dark:bg-sky-500 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <HouseLine size={15} weight="duotone" />
                      <span>Floors & Areas ({floors.length} / {areas.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeviceRoomView('labels')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        deviceRoomView === 'labels'
                          ? 'bg-white text-slate-900 dark:bg-sky-500 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Tag size={15} weight="duotone" />
                      <span>Labels ({labels.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeviceRoomView('zones')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        deviceRoomView === 'zones'
                          ? 'bg-white text-slate-900 dark:bg-sky-500 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <MapPin size={15} weight="duotone" />
                      <span>Zones ({resolvedZones.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeviceRoomView('devices')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        deviceRoomView === 'devices'
                          ? 'bg-white text-slate-900 dark:bg-sky-500 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Cpu size={15} weight="duotone" />
                      <span>Devices ({entities.length})</span>
                    </button>
                  </div>
                </div>

                {/* VIEW 1: FLOORS & AREAS HIERARCHY & CUSTOMIZATION */}
                {deviceRoomView === 'floors_areas' && (
                  <div className="space-y-5">
                    {/* Read-Only Notice from HA */}
                    <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/20 text-sky-700 dark:text-sky-300 text-xs">
                      <Lock size={18} weight="duotone" className="shrink-0 text-sky-500" />
                      <p className="leading-relaxed">
                        <strong className="font-bold">Home Assistant Synchronized Topology:</strong> Floor names, area names, and floor links are read-only from Home Assistant. You can customize the default icon, accent color, and custom vertical display order.
                      </p>
                    </div>

                    {/* Floors & Nested Areas List */}
                    <div className="space-y-4">
                      {floors.map((floor, floorIndex) => {
                        const floorAreas = areas.filter(a => a.floor_id === floor.floor_id);

                        return (
                          <div
                            key={floor.floor_id}
                            className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/2 overflow-hidden shadow-xs"
                          >
                            {/* Floor Header Bar */}
                            <div className="p-4 bg-slate-100/90 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                {/* Floor Icon with Custom Color */}
                                <div
                                  className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs shrink-0"
                                  style={{
                                    backgroundColor: `${floor.color || '#0ea5e9'}1a`,
                                    borderColor: `${floor.color || '#0ea5e9'}40`,
                                    color: floor.color || '#0ea5e9'
                                  }}
                                >
                                  {renderIconByName(floor.icon || 'Stairs', 18)}
                                </div>

                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white">{floor.name}</h4>
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                                      Level {floor.level ?? 0}
                                    </span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center gap-1">
                                      <Lock size={10} weight="bold" /> HA Managed
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {floorAreas.length} Assigned Area{floorAreas.length === 1 ? '' : 's'}
                                  </p>
                                </div>
                              </div>

                              {/* Floor Actions: Reorder & Edit Style */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleMoveFloor(floor.floor_id, 'up')}
                                  disabled={floorIndex === 0}
                                  className="w-8 h-8 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                  title="Move floor up in dashboard layout"
                                >
                                  <ArrowUp size={14} weight="bold" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveFloor(floor.floor_id, 'down')}
                                  disabled={floorIndex === floors.length - 1}
                                  className="w-8 h-8 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                  title="Move floor down in dashboard layout"
                                >
                                  <ArrowDown size={14} weight="bold" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setEditingFloor(floor)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 transition-all cursor-pointer shadow-2xs"
                                  title="Edit floor default icon & accent color"
                                >
                                  <PaintBrush size={13} weight="bold" />
                                  <span>Edit Style</span>
                                </button>
                              </div>
                            </div>

                            {/* Areas within this Floor */}
                            <div className="p-4 space-y-2.5">
                              {floorAreas.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500 italic rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                                  No areas assigned to {floor.name} in Home Assistant.
                                </div>
                              ) : (
                                floorAreas.map((area, areaIndex) => {
                                  const areaEntities = entities.filter(e => 
                                    e.attributes?.room?.toLowerCase() === area.name.toLowerCase() ||
                                    e.entity_id.toLowerCase().includes(area.name.toLowerCase().replace(/ /g, '_'))
                                  );

                                  return (
                                    <div
                                      key={area.area_id}
                                      className="p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 transition-all hover:border-slate-300 dark:hover:border-white/20"
                                    >
                                      {/* Area Identity */}
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div
                                          className="w-8 h-8 rounded-lg flex items-center justify-center border shrink-0"
                                          style={{
                                            backgroundColor: `${area.color || '#6366f1'}1a`,
                                            borderColor: `${area.color || '#6366f1'}40`,
                                            color: area.color || '#6366f1'
                                          }}
                                        >
                                          {renderIconByName(area.icon || 'Armchair', 16)}
                                        </div>

                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2">
                                            <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                              {area.name}
                                            </h5>
                                            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                                              Floor: {floor.name}
                                            </span>
                                          </div>
                                          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block mt-0.5">
                                            {areaEntities.length} assigned device{areaEntities.length === 1 ? '' : 's'}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Controls: Area Reorder & Edit Style */}
                                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                        {/* Area Up / Down within Floor */}
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => handleMoveAreaWithinFloor(area.area_id, floor.floor_id, 'up')}
                                            disabled={areaIndex === 0}
                                            className="w-7 h-7 rounded-md bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                            title="Move area up within floor"
                                          >
                                            <ArrowUp size={12} weight="bold" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleMoveAreaWithinFloor(area.area_id, floor.floor_id, 'down')}
                                            disabled={areaIndex === floorAreas.length - 1}
                                            className="w-7 h-7 rounded-md bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                            title="Move area down within floor"
                                          >
                                            <ArrowDown size={12} weight="bold" />
                                          </button>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => setEditingArea(area)}
                                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 dark:bg-white/10 dark:hover:bg-indigo-500/20 text-slate-700 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400 border border-slate-200 dark:border-white/10 text-xs font-bold transition-all cursor-pointer"
                                          title="Edit area default icon & accent color"
                                        >
                                          <PaintBrush size={12} weight="bold" />
                                          <span>Edit Style</span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Unassigned Areas Section */}
                      {(() => {
                        const unassignedAreas = areas.filter(a => !a.floor_id);
                        if (unassignedAreas.length === 0) return null;

                        return (
                          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/15 bg-slate-50/30 dark:bg-white/1 overflow-hidden">
                            <div className="p-3.5 bg-slate-100/60 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <HouseLine size={16} weight="duotone" className="text-slate-400" />
                                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  General / Unassigned Floor Areas ({unassignedAreas.length})
                                </h4>
                              </div>
                            </div>

                            <div className="p-3.5 space-y-2">
                              {unassignedAreas.map((area, areaIndex) => {
                                const areaEntities = entities.filter(e => 
                                  e.attributes?.room?.toLowerCase() === area.name.toLowerCase() ||
                                  e.entity_id.toLowerCase().includes(area.name.toLowerCase().replace(/ /g, '_'))
                                );

                                return (
                                  <div
                                    key={area.area_id}
                                    className="p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center border shrink-0"
                                        style={{
                                          backgroundColor: `${area.color || '#6366f1'}1a`,
                                          borderColor: `${area.color || '#6366f1'}40`,
                                          color: area.color || '#6366f1'
                                        }}
                                      >
                                        {renderIconByName(area.icon || 'Armchair', 16)}
                                      </div>
                                      <div className="min-w-0">
                                        <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">{area.name}</h5>
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block">
                                          {areaEntities.length} assigned devices • No Floor Linked
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleMoveAreaWithinFloor(area.area_id, null, 'up')}
                                          disabled={areaIndex === 0}
                                          className="w-7 h-7 rounded-md bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                        >
                                          <ArrowUp size={12} weight="bold" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleMoveAreaWithinFloor(area.area_id, null, 'down')}
                                          disabled={areaIndex === unassignedAreas.length - 1}
                                          className="w-7 h-7 rounded-md bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                        >
                                          <ArrowDown size={12} weight="bold" />
                                        </button>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => setEditingArea(area)}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 dark:bg-white/10 dark:hover:bg-indigo-500/20 text-slate-700 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400 border border-slate-200 dark:border-white/10 text-xs font-bold transition-all cursor-pointer"
                                      >
                                        <PaintBrush size={12} weight="bold" />
                                        <span>Edit Style</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* VIEW 2: HOME ASSISTANT LABELS */}
                {deviceRoomView === 'labels' && (
                  <div className="space-y-5">
                    <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs">
                      <Tag size={18} weight="duotone" className="shrink-0 text-indigo-500" />
                      <p className="leading-relaxed">
                        <strong className="font-bold">Home Assistant Label Registry:</strong> Labels organize and tag entities, areas, and devices across your home. Labels and colors are synchronized directly from your Home Assistant configuration.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {labels.map((lbl) => {
                        const matchingEntities = Object.values(resolvedEntities).filter(e => 
                          (e.labels || []).includes(lbl.label_id) || (e.labels || []).includes(lbl.name)
                        );

                        return (
                          <div
                            key={lbl.label_id}
                            className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 space-y-3 shadow-xs hover:border-slate-300 dark:hover:border-white/20 transition-all flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-7 h-7 rounded-lg flex items-center justify-center border shrink-0"
                                    style={{
                                      backgroundColor: `${lbl.color || '#6366f1'}20`,
                                      borderColor: `${lbl.color || '#6366f1'}40`,
                                      color: lbl.color || '#6366f1'
                                    }}
                                  >
                                    <Tag size={15} weight="bold" />
                                  </div>
                                  <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                                    {lbl.name}
                                  </h4>
                                </div>

                                <span
                                  className="w-3 h-3 rounded-full shrink-0 shadow-xs border border-white/40"
                                  style={{ backgroundColor: lbl.color || '#6366f1' }}
                                  title={`Color: ${lbl.color || '#6366f1'}`}
                                />
                              </div>

                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                {lbl.description || 'Custom tag defined in Home Assistant Label Registry.'}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                                {matchingEntities.length} tagged {matchingEntities.length === 1 ? 'entity' : 'entities'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedLabelFilter(lbl.label_id);
                                  setDeviceRoomView('devices');
                                }}
                                className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer flex items-center gap-1"
                              >
                                View Devices →
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* VIEW 3: HOME ASSISTANT ZONES */}
                {deviceRoomView === 'zones' && (
                  <div className="space-y-5">
                    <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs">
                      <MapPin size={18} weight="duotone" className="shrink-0 text-emerald-500" />
                      <p className="leading-relaxed">
                        <strong className="font-bold">Home Assistant Zones & Presence:</strong> Geofenced zones define geographic perimeters for occupant presence, arrival triggers, and presence-based dashboard profiles.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {resolvedZones.map((zone) => {
                        const occupants = zone.personsInZone || [];

                        return (
                          <div
                            key={zone.entity_id}
                            className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 space-y-3 shadow-xs hover:border-slate-300 dark:hover:border-white/20 transition-all flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                                    <MapPin size={18} weight="duotone" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                                      {zone.name}
                                    </h4>
                                    <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
                                      {zone.entity_id}
                                    </span>
                                  </div>
                                </div>

                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                  occupants.length > 0 
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                                    : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10'
                                }`}>
                                  {occupants.length} Occupant{occupants.length === 1 ? '' : 's'}
                                </span>
                              </div>

                              {/* Zone Geofence Coordinates & Radius */}
                              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/5 space-y-1">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-slate-500 dark:text-slate-400">GPS Coordinates</span>
                                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                    {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-slate-500 dark:text-slate-400">Geofence Radius</span>
                                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                    {zone.radius} meters
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Active Occupants List */}
                            <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                                Current Occupants:
                              </span>
                              {occupants.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {occupants.map(name => (
                                    <span
                                      key={name}
                                      className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                      {name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                                  No occupants currently in this zone.
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* VIEW 4: DEVICES & REGISTRY */}
                {deviceRoomView === 'devices' && (
                  <div className="space-y-4">
                    {/* Filter & Search Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="relative w-full sm:w-72">
                        <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search entity name, ID or area..."
                          value={searchFilter}
                          onChange={(e) => setSearchFilter(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/15 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-sky-500"
                        />
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="w-40">
                          <CustomDropdown
                            value={domainFilter}
                            onChange={(val) => setDomainFilter(val)}
                            options={[
                              { value: 'all', label: 'All Domains' },
                              { value: 'light', label: 'Lights' },
                              { value: 'switch', label: 'Switches & Plugs' },
                              { value: 'climate', label: 'Climates & HVAC' },
                              { value: 'sensor', label: 'Sensors' },
                              { value: 'binary_sensor', label: 'Binary Sensors' },
                              { value: 'media_player', label: 'Media Players' }
                            ]}
                            size="sm"
                          />
                        </div>

                        <div className="w-40">
                          <CustomDropdown
                            value={selectedLabelFilter}
                            onChange={(val) => setSelectedLabelFilter(val)}
                            options={[
                              { value: 'all', label: 'All Labels' },
                              ...labels.map(l => ({ value: l.label_id, label: l.name, badge: l.color }))
                            ]}
                            size="sm"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowAddDeviceModal(true)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
                        >
                          <Plus size={14} weight="bold" />
                          <span>Add Device</span>
                        </button>
                      </div>
                    </div>

                    {/* Entities List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredEntities.length === 0 ? (
                        <div className="col-span-full p-8 text-center text-xs text-slate-400 dark:text-slate-500 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                          No devices match the active search or domain filter.
                        </div>
                      ) : (
                        filteredEntities.map((ent) => {
                          const domain = ent.entity_id.split('.')[0];
                          const isOn = ent.state === 'on' || ent.state === 'open' || ent.state === 'unlocked' || ent.state === 'cleaning' || ent.state === 'playing';
                          const friendlyName = ent.attributes?.friendly_name || ent.entity_id;
                          const roomName = ent.attributes?.room || 'Unassigned';

                          return (
                            <div
                              key={ent.entity_id}
                              className="p-3.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 dark:hover:border-white/20 transition-all"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleEntity(ent)}
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                    isOn 
                                      ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-400/40 shadow-[0_0_10px_rgba(56,189,248,0.3)]' 
                                      : 'bg-slate-200 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/10 hover:text-slate-900 dark:hover:text-white'
                                  }`}
                                  title="Toggle state"
                                >
                                  <Power size={18} weight="duotone" />
                                </button>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">{friendlyName}</h5>
                                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">({ent.entity_id})</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">{domain}</span>
                                    <span className="text-slate-400 dark:text-slate-600">•</span>
                                    <span className="text-[10px] text-slate-600 dark:text-slate-300">{roomName}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Right Actions: State Badge & Delete */}
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border uppercase ${
                                  isOn 
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' 
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                                }`}>
                                  {ent.state}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteEntity(ent.entity_id)}
                                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 dark:bg-white/5 dark:hover:bg-rose-500/20 dark:text-slate-400 dark:hover:text-rose-400 border border-slate-200 dark:border-white/10 flex items-center justify-center transition-colors cursor-pointer"
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
                  </div>
                )}
              </motion.div>
            )}

            {/* ========================================================================= */}
            {/* MODALS FOR FLOORS & AREAS CUSTOMIZATION (ICONS & COLORS ONLY) */}
            {/* ========================================================================= */}

            {/* EDIT FLOOR MODAL */}
            {editingFloor && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-5 ${
                    darkMode ? 'bg-slate-900 border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <Stairs size={20} weight="duotone" className="text-sky-500" />
                      <h3 className="text-sm font-black">Customize Floor Style</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingFloor(null)}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    >
                      <X size={16} weight="bold" />
                    </button>
                  </div>

                  {/* Read-Only HA Floor Metadata */}
                  <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Floor Name (Home Assistant)</span>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white mt-0.5">{editingFloor.name}</h4>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                      Level {editingFloor.level ?? 0}
                    </span>
                  </div>

                  <form onSubmit={handleSaveFloorEdit} className="space-y-4">
                    {/* Icon Selection */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Choose Floor Icon</label>
                      <div className="grid grid-cols-5 gap-2">
                        {FLOOR_ICON_OPTIONS.map(iconOpt => (
                          <button
                            key={iconOpt}
                            type="button"
                            onClick={() => setEditingFloor({ ...editingFloor, icon: iconOpt })}
                            className={`p-2.5 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                              editingFloor.icon === iconOpt
                                ? 'bg-sky-500/20 border-sky-500 text-sky-500 shadow-xs'
                                : 'bg-slate-100/80 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {renderIconByName(iconOpt, 20)}
                            <span className="text-[9px] font-semibold truncate max-w-full">{iconOpt}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color Swatch Selection */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Floor Theme Accent Color</label>
                      <div className="flex flex-wrap items-center gap-2">
                        {PRESET_COLORS.map(colorHex => (
                          <button
                            key={colorHex}
                            type="button"
                            onClick={() => setEditingFloor({ ...editingFloor, color: colorHex })}
                            className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer relative ${
                              (editingFloor.color || '#0ea5e9') === colorHex
                                ? 'scale-115 border-slate-900 dark:border-white shadow-md'
                                : 'border-transparent hover:scale-105'
                            }`}
                            style={{ backgroundColor: colorHex }}
                          />
                        ))}
                        <input
                          type="color"
                          value={editingFloor.color || '#0ea5e9'}
                          onChange={(e) => setEditingFloor({ ...editingFloor, color: e.target.value })}
                          className="w-7 h-7 rounded-full border-0 cursor-pointer"
                          title="Pick custom color"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => setEditingFloor(null)}
                        className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-white/15 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        Save Style
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}

            {/* EDIT AREA MODAL */}
            {editingArea && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-5 ${
                    darkMode ? 'bg-slate-900 border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <Armchair size={20} weight="duotone" className="text-indigo-500" />
                      <h3 className="text-sm font-black">Customize Area Style</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingArea(null)}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    >
                      <X size={16} weight="bold" />
                    </button>
                  </div>

                  {/* Read-Only HA Area Metadata */}
                  <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Area Name (Home Assistant)</span>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white mt-0.5">{editingArea.name}</h4>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                      Floor: {floors.find(f => f.floor_id === editingArea.floor_id)?.name || 'Unassigned'}
                    </span>
                  </div>

                  <form onSubmit={handleSaveAreaEdit} className="space-y-4">
                    {/* Icon Selection */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Choose Area Icon</label>
                      <div className="grid grid-cols-6 gap-2">
                        {AREA_ICON_OPTIONS.map(iconOpt => (
                          <button
                            key={iconOpt}
                            type="button"
                            onClick={() => setEditingArea({ ...editingArea, icon: iconOpt })}
                            className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                              editingArea.icon === iconOpt
                                ? 'bg-indigo-500/20 border-indigo-500 text-indigo-500 shadow-xs'
                                : 'bg-slate-100/80 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {renderIconByName(iconOpt, 18)}
                            <span className="text-[8px] font-semibold truncate max-w-full">{iconOpt}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Accent Color Selection */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Area Theme Accent Color</label>
                      <div className="flex flex-wrap items-center gap-2">
                        {PRESET_COLORS.map(colorHex => (
                          <button
                            key={colorHex}
                            type="button"
                            onClick={() => setEditingArea({ ...editingArea, color: colorHex })}
                            className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer relative ${
                              (editingArea.color || '#6366f1') === colorHex
                                ? 'scale-115 border-slate-900 dark:border-white shadow-md'
                                : 'border-transparent hover:scale-105'
                            }`}
                            style={{ backgroundColor: colorHex }}
                          />
                        ))}
                        <input
                          type="color"
                          value={editingArea.color || '#6366f1'}
                          onChange={(e) => setEditingArea({ ...editingArea, color: e.target.value })}
                          className="w-7 h-7 rounded-full border-0 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => setEditingArea(null)}
                        className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-white/15 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        Save Style
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 4. BACKUP AND RESTORE SECTION */}
            {activeSection === 'backup_restore' && (
              <motion.div
                key="backup_restore"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`p-6 sm:p-7 rounded-3xl border backdrop-blur-md backdrop-saturate-150 space-y-6 ${
                  darkMode ? 'bg-white/3 border-white/10 shadow-2xl' : 'bg-white/90 border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <DownloadSimple size={28} weight="duotone" className="text-sky-500 dark:text-sky-400" />
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Backup, Snapshots & Disaster Recovery</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Export dashboard layout JSON, save local profile snapshots, or restore backups.</p>
                    </div>
                  </div>
                </div>

                {/* Primary Export & Import Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/10 space-y-3 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Export Full Configuration JSON</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
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

                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/10 space-y-3 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Restore from Backup File</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Upload an existing dashboard backup `.json` file to restore all canvas cards, layouts, and entities.
                      </p>
                    </div>
                    <label className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/15 dark:text-white font-bold text-xs transition-all cursor-pointer">
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
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/10 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Local Snapshots ({snapshots.length})</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Create instant rollback points cached in local browser storage.</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Snapshot name..."
                        value={snapshotNameInput}
                        onChange={(e) => setSnapshotNameInput(e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:border-sky-500 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={handleCreateSnapshot}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all cursor-pointer shrink-0 shadow-sm"
                      >
                        Take Snapshot
                      </button>
                    </div>
                  </div>

                  {snapshots.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-300 dark:border-white/10 rounded-xl">
                      No local snapshots stored yet. Click "Take Snapshot" above to create an instant rollback point.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto touch-scroll-container pr-1">
                      {snapshots.map((snap) => (
                        <div
                          key={snap.id}
                          className="p-3 rounded-xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 shadow-xs"
                        >
                          <div>
                            <h5 className="text-xs font-bold text-slate-900 dark:text-white">{snap.name}</h5>
                            <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                              {snap.timestamp} • {snap.cardCount} cards • {snap.profileCount} profiles
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRestoreSnapshot(snap)}
                              className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-700 dark:text-sky-300 border border-sky-400/30 text-[11px] font-bold cursor-pointer transition-colors"
                            >
                              Restore
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSnapshot(snap.id)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 dark:bg-white/5 dark:hover:bg-rose-500/20 dark:text-slate-400 dark:hover:text-rose-400 border border-slate-200 dark:border-white/10 flex items-center justify-center cursor-pointer transition-colors"
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
                    <h4 className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                      <Warning size={16} weight="duotone" /> Factory Reset Dashboard
                    </h4>
                    <p className="text-[11px] text-rose-800/80 dark:text-rose-200/70 mt-0.5">
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
                  darkMode ? 'bg-white/3 border-white/10 shadow-2xl' : 'bg-white/90 border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <WifiHigh size={28} weight="duotone" className="text-sky-500 dark:text-sky-400" />
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Home Assistant WebSocket & Telemetry</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Direct real-time duplex socket configuration, latency testing, and live event feed.</p>
                    </div>
                  </div>

                  {/* Live Status Indicator */}
                  <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold font-mono uppercase ${
                    isLiveMode 
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' 
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-emerald-500 dark:bg-emerald-400 animate-ping' : 'bg-amber-500'}`} />
                    <span>{connectionStatus || (isLiveMode ? 'Connected' : 'Standalone Demo')}</span>
                  </div>
                </div>

                {/* PWA & Secure Context Status */}
                <PwaStatusCard darkMode={darkMode} />

                {/* Authentication Method Tabs */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => handleSelectAuthTab('oauth')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
                        authMethodTab === 'oauth'
                          ? 'bg-white dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 shadow-sm border border-slate-200 dark:border-sky-500/30'
                          : isLiveMode && authType === 'llat'
                            ? 'text-slate-400 dark:text-slate-500 opacity-60 hover:opacity-80'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <House size={16} weight="duotone" />
                      <span>Sign In with HA Credentials (OAuth)</span>
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-300 font-extrabold">
                        Recommended
                      </span>
                      {isLiveMode && authType === 'oauth' && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0 ml-0.5" title="Active Session" />
                      )}
                      {isLiveMode && authType === 'llat' && (
                        <Lock size={12} className="text-slate-400 dark:text-slate-500 shrink-0 ml-1" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectAuthTab('llat')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
                        authMethodTab === 'llat'
                          ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-white/15'
                          : isLiveMode && authType === 'oauth'
                            ? 'text-slate-400 dark:text-slate-500 opacity-60 hover:opacity-80'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <Key size={16} weight="duotone" />
                      <span>Long-Lived Access Token (Manual)</span>
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-bold">
                        Advanced
                      </span>
                      {isLiveMode && authType === 'llat' && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0 ml-0.5" title="Active Session" />
                      )}
                      {isLiveMode && authType === 'oauth' && (
                        <Lock size={12} className="text-slate-400 dark:text-slate-500 shrink-0 ml-1" />
                      )}
                    </button>
                  </div>

                  {isLiveMode && (
                    <div className="flex items-center gap-1.5 px-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <Lock size={12} className="text-amber-500 shrink-0" />
                      <span>
                        Active session running via {authType === 'oauth' ? 'Home Assistant OAuth' : 'Long-Lived Access Token'}. Select the other tab to disconnect and switch sign-in methods.
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirmation Modal for Switching Auth Method while Connected */}
                <AnimatePresence>
                  {switchMethodConfirmTarget && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
                      onClick={() => setSwitchMethodConfirmTarget(null)}
                    >
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 shadow-2xl space-y-4"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                            <Warning size={22} weight="duotone" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                              Switch Sign-In Method?
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                              Switching to {switchMethodConfirmTarget === 'oauth' ? 'Home Assistant OAuth' : 'Long-Lived Access Token'} will disconnect your current active session and clear previous credentials to prevent conflicts. Continue?
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
                          <button
                            type="button"
                            onClick={() => setSwitchMethodConfirmTarget(null)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleConfirmSwitchMethod}
                            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all cursor-pointer active:scale-95"
                          >
                            Disconnect & Switch
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* TAB 1: HOME ASSISTANT OAUTH LOGIN (Official Credentials) */}
                {authMethodTab === 'oauth' && (
                  <div className="space-y-4">
                    {isLiveMode && authType === 'oauth' ? (
                      <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
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
                              {storeServerUrl}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => logoutHA()}
                            className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-600 dark:text-rose-300 font-bold text-xs transition-all cursor-pointer active:scale-95"
                          >
                            Sign Out / Disconnect
                          </button>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleStartOAuthLogin} className="p-5 rounded-2xl bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/10 space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                            Home Assistant Instance URL
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="http://homeassistant.local:8123 or https://your-ha.duckdns.org"
                              value={haHttpUrlInput}
                              onChange={(e) => setHaHttpUrlInput(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white font-mono text-xs focus:outline-hidden focus:border-sky-500 shadow-xs"
                              required
                            />
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Enter your local IP (e.g. <code className="font-mono text-sky-600 dark:text-sky-400">http://192.168.1.100:8123</code>), mDNS (<code className="font-mono text-sky-600 dark:text-sky-400">http://homeassistant.local:8123</code>), or external HTTPS domain.
                          </p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                          <div className="font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                            <ShieldCheck size={16} weight="duotone" />
                            <span>Official Home Assistant OAuth2 Flow</span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                            Clicking the button below will redirect you to your Home Assistant login page where you can enter your credentials or 2FA. Your tokens are stored exclusively in your browser and are never sent to external servers.
                          </p>
                        </div>

                        <div className="flex items-center justify-end pt-1">
                          <button
                            type="submit"
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-linear-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-sky-500/30 transition-all cursor-pointer active:scale-95"
                          >
                            <House size={16} weight="bold" />
                            <span>Sign In with Home Assistant</span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* TAB 2: MANUAL LONG-LIVED ACCESS TOKEN */}
                {authMethodTab === 'llat' && (
                  <div className="space-y-4">
                    {/* Guidance Explaining when to use LLAT vs OAuth */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
                      <Info size={18} weight="duotone" className="text-sky-500 dark:text-sky-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5 text-[11px] leading-relaxed">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">When to use a Long-Lived Access Token:</p>
                        <p className="text-slate-500 dark:text-slate-400">
                          Use this manual fallback method if OAuth sign-in isn't available for your setup, such as a reverse proxy without OAuth redirect support, an isolated VLAN, or manual headless configurations.
                        </p>
                      </div>
                    </div>

                    {isLiveMode && authType === 'llat' ? (
                      <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
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
                              {storeServerUrl}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={handleTestLatency}
                            disabled={isPinging}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/15 text-slate-800 dark:text-white text-xs font-semibold cursor-pointer transition-all disabled:opacity-50 shadow-xs"
                          >
                            <ArrowsClockwise size={14} className={isPinging ? 'animate-spin' : ''} />
                            <span>{isPinging ? 'Pinging...' : pingLatency !== null ? `${pingLatency}ms` : 'Test Ping'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => disconnectFromHA()}
                            className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-600 dark:text-rose-300 font-bold text-xs transition-all cursor-pointer active:scale-95"
                          >
                            Sign Out / Disconnect
                          </button>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleConnectWs} className="p-5 rounded-2xl bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/10 space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Home Assistant WebSocket URL</label>
                          <input
                            type="text"
                            placeholder="wss://your-homeassistant.local:8123/api/websocket"
                            value={wsUrlInput}
                            onChange={(e) => setWsUrlInput(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white font-mono text-xs focus:outline-hidden focus:border-sky-500 shadow-xs"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Long-Lived Access Token</label>
                            <button
                              type="button"
                              onClick={() => setShowToken(!showToken)}
                              className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline cursor-pointer flex items-center gap-1"
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
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white font-mono text-xs focus:outline-hidden focus:border-sky-500 shadow-xs"
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleTestLatency}
                              disabled={isPinging}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/15 dark:text-white text-xs font-semibold cursor-pointer transition-all disabled:opacity-50 shadow-xs"
                            >
                              <ArrowsClockwise size={14} className={isPinging ? 'animate-spin' : ''} />
                              <span>{isPinging ? 'Pinging Socket...' : 'Test Latency Ping'}</span>
                            </button>

                            {pingLatency !== null && (
                              <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-500/30">
                                {pingLatency}ms Roundtrip
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="submit"
                              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-[0_0_20px_rgba(14,165,233,0.35)] transition-all cursor-pointer"
                            >
                              <WifiHigh size={16} weight="bold" />
                              <span>Save & Connect Token</span>
                            </button>
                          </div>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* Real-time Telemetry Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/10 text-center">
                    <div className="text-lg font-mono font-bold text-slate-900 dark:text-white">{entities.length}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Active Entities</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/10 text-center">
                    <div className="text-lg font-mono font-bold text-sky-600 dark:text-sky-400">{rooms.length}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Discovered Areas</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/10 text-center">
                    <div className="text-lg font-mono font-bold text-indigo-600 dark:text-indigo-400">{Object.keys(rawDevices || {}).length || 18}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Physical Devices</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/10 text-center">
                    <div className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">{logs.length}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Events Processed</div>
                  </div>
                </div>

                {/* Live WebSocket Event Log Stream */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/2 border border-slate-200 dark:border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radio size={16} weight="duotone" className="text-emerald-500 dark:text-emerald-400 animate-pulse" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Live Event Log Feed</h4>
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
                        className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-[11px] font-bold text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-400 dark:hover:text-white cursor-pointer"
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
                          className="p-2 rounded-lg bg-white dark:bg-black/30 border border-slate-200 dark:border-white/5 flex items-start gap-2.5 shadow-xs"
                        >
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase shrink-0 ${
                            log.type === 'error' ? 'bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' :
                            log.type === 'service_call' ? 'bg-indigo-500/15 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' :
                            log.type === 'state_changed' ? 'bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400' :
                            'bg-slate-200 dark:bg-slate-700/40 text-slate-700 dark:text-slate-400'
                          }`}>
                            {log.type.replace('_', ' ')}
                          </span>
                          <span className="text-slate-800 dark:text-slate-300 flex-1 break-all">{log.message}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">{log.timestamp}</span>
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
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-white/15 p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-white/10">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Register Virtual IoT Device</h4>
              <button onClick={() => setShowAddDeviceModal(false)} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddDevice} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Friendly Name</label>
                <input
                  type="text"
                  placeholder="e.g. Master Bedroom Chandelier"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:border-sky-500 shadow-xs"
                  autoFocus
                  required
                />
              </div>
              <div>
                <CustomDropdown
                  label="Domain Type"
                  value={newDeviceDomain}
                  onChange={(val) => setNewDeviceDomain(val as any)}
                  options={[
                    { value: 'light', label: 'Light (Dimmable / RGB)' },
                    { value: 'switch', label: 'Smart Switch / Socket' },
                    { value: 'climate', label: 'Thermostat / Climate' },
                    { value: 'sensor', label: 'Telemetry Sensor' }
                  ]}
                  size="sm"
                />
              </div>
              <div>
                <CustomDropdown
                  label="Assigned Room"
                  value={newDeviceRoom}
                  onChange={(val) => setNewDeviceRoom(val)}
                  options={rooms.map(r => ({ value: r.name, label: r.name }))}
                  size="sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDeviceModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-300 text-xs font-semibold cursor-pointer"
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

      {/* MODAL: RESET CONFIRMATION */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowResetConfirm(false)} />
          <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-white/15 p-6 shadow-2xl z-10 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <Warning size={28} weight="duotone" />
            </div>
            <h4 className="text-base font-black text-slate-900 dark:text-white">Reset Dashboard Defaults?</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              This will reset all custom canvas profiles, cards, and custom user configurations to factory defaults.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-300 text-xs font-semibold cursor-pointer"
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
