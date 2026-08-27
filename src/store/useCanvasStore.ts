/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { CardConfig, DashboardLayoutItem, DashboardProfile, WeatherBackdropType } from '../types/canvas';

const STORAGE_KEY = 'tunet_dashboard_profiles_v3';
const ACTIVE_PROFILE_KEY = 'tunet_active_profile_id_v3';
const PIN_STORAGE_KEY = 'tunet_pin_code_v1';
const BACKDROP_STORAGE_KEY = 'tunet_weather_backdrop_v1';

export const DEFAULT_PROFILES: Record<string, DashboardProfile> = {
  'profile_main': {
    id: 'profile_main',
    name: 'Main Canvas',
    isLocked: false,
    layout: [],
    cards: {}
  }
};

function loadStoredProfiles(): Record<string, DashboardProfile> {
  if (typeof window === 'undefined') return DEFAULT_PROFILES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILES;
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to parse stored canvas profiles:', err);
  }
  return DEFAULT_PROFILES;
}

function loadStoredActiveProfileId(profiles: Record<string, DashboardProfile>): string {
  if (typeof window === 'undefined') return 'profile_main';
  try {
    const id = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (id && profiles[id]) return id;
  } catch {}
  return Object.keys(profiles)[0] || 'profile_main';
}

function loadStoredPinCode(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(PIN_STORAGE_KEY) || '';
  } catch {}
  return '';
}

function loadStoredBackdrop(): WeatherBackdropType {
  if (typeof window === 'undefined') return 'auto';
  try {
    const saved = localStorage.getItem(BACKDROP_STORAGE_KEY) as WeatherBackdropType;
    if (saved) return saved;
  } catch {}
  return 'auto';
}

interface CanvasStoreState {
  profiles: Record<string, DashboardProfile>;
  activeProfileId: string;
  isEditMode: boolean;
  isLocked: boolean;
  pinCode: string;
  weatherBackdrop: WeatherBackdropType;
  activeModalCardId: string | null;
  isCatalogOpen: boolean;
  isPinModalOpen: boolean;
  pinModalMode: 'unlock' | 'set_pin' | 'remove_pin';
  breakpointCols: { lg: number; md: number; sm: number; xs: number };

  // Actions
  setActiveProfileId: (id: string) => void;
  createProfile: (name: string, cloneCurrent?: boolean) => string;
  deleteProfile: (id: string) => void;
  renameProfile: (id: string, name: string) => void;
  resetToDefaults: () => void;
  
  // Layout & Cards
  updateLayout: (newLayout: DashboardLayoutItem[]) => void;
  addCard: (config: CardConfig, layoutItem?: Partial<DashboardLayoutItem>) => void;
  updateCard: (id: string, updates: Partial<CardConfig>) => void;
  removeCard: (id: string) => void;
  duplicateCard: (id: string) => void;

  // Edit / Kiosk Mode & Security
  toggleEditMode: () => void;
  setEditMode: (edit: boolean) => void;
  setPinCode: (pin: string) => void;
  unlockWithPin: (pin: string) => boolean;
  openPinModal: (mode?: 'unlock' | 'set_pin' | 'remove_pin') => void;
  closePinModal: () => void;

  // Weather Backdrop
  setWeatherBackdrop: (backdrop: WeatherBackdropType) => void;

  // Modals & Drawers
  openCardModal: (cardId: string) => void;
  closeCardModal: () => void;
  openCatalog: () => void;
  closeCatalog: () => void;

  // JSON Export/Import
  exportProfilesJson: () => string;
  importProfilesJson: (jsonStr: string) => boolean;
}

export const useCanvasStore = create<CanvasStoreState>((set, get) => {
  const initialProfiles = loadStoredProfiles();
  const initialProfileId = loadStoredActiveProfileId(initialProfiles);
  const initialPin = loadStoredPinCode();
  const initialBackdrop = loadStoredBackdrop();
  const currentProfile = initialProfiles[initialProfileId] || DEFAULT_PROFILES.profile_main;

  const saveToStorage = (profiles: Record<string, DashboardProfile>, activeId: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
      localStorage.setItem(ACTIVE_PROFILE_KEY, activeId);
    } catch (e) {
      console.warn('Storage quota or access error:', e);
    }
  };

  let saveStorageTimer: ReturnType<typeof setTimeout> | null = null;
  const saveToStorageDebounced = (profiles: Record<string, DashboardProfile>, activeId: string) => {
    if (saveStorageTimer) clearTimeout(saveStorageTimer);
    saveStorageTimer = setTimeout(() => {
      saveToStorage(profiles, activeId);
      saveStorageTimer = null;
    }, 300);
  };


  return {
    profiles: initialProfiles,
    activeProfileId: initialProfileId,
    isEditMode: false,
    isLocked: currentProfile.isLocked || false,
    pinCode: initialPin,
    weatherBackdrop: initialBackdrop,
    activeModalCardId: null,
    isCatalogOpen: false,
    isPinModalOpen: false,
    pinModalMode: 'unlock',
    breakpointCols: { lg: 12, md: 8, sm: 4, xs: 2 },

    setActiveProfileId: (id: string) => {
      const { profiles } = get();
      if (!profiles[id]) return;
      const target = profiles[id];
      saveToStorage(profiles, id);
      set({
        activeProfileId: id,
        isLocked: target.isLocked || false,
        isEditMode: false,
        activeModalCardId: null
      });
    },

    createProfile: (name: string, cloneCurrent = false) => {
      const { profiles, activeProfileId } = get();
      const newId = `profile_${Date.now()}`;
      const current = profiles[activeProfileId] || DEFAULT_PROFILES.profile_main;

      const newProfile: DashboardProfile = {
        id: newId,
        name: name.trim() || 'New Dashboard Canvas',
        isLocked: false,
        layout: cloneCurrent ? JSON.parse(JSON.stringify(current.layout)) : [],
        cards: cloneCurrent ? JSON.parse(JSON.stringify(current.cards)) : {}
      };

      const updated = { ...profiles, [newId]: newProfile };
      saveToStorage(updated, newId);
      set({
        profiles: updated,
        activeProfileId: newId,
        isEditMode: true
      });
      return newId;
    },

    deleteProfile: (id: string) => {
      const { profiles, activeProfileId } = get();
      const keys = Object.keys(profiles);
      if (keys.length <= 1) return; // Keep at least one profile
      const updated = { ...profiles };
      delete updated[id];
      const nextActiveId = activeProfileId === id ? Object.keys(updated)[0] : activeProfileId;
      saveToStorage(updated, nextActiveId);
      set({
        profiles: updated,
        activeProfileId: nextActiveId
      });
    },

    renameProfile: (id: string, name: string) => {
      const { profiles } = get();
      if (!profiles[id]) return;
      const updated = {
        ...profiles,
        [id]: { ...profiles[id], name: name.trim() || 'Untitled' }
      };
      saveToStorage(updated, get().activeProfileId);
      set({ profiles: updated });
    },

    resetToDefaults: () => {
      saveToStorage(DEFAULT_PROFILES, 'profile_main');
      set({
        profiles: DEFAULT_PROFILES,
        activeProfileId: 'profile_main',
        isEditMode: false,
        isLocked: false
      });
    },

    updateLayout: (newLayout: DashboardLayoutItem[]) => {
      const { profiles, activeProfileId } = get();
      const current = profiles[activeProfileId];
      if (!current) return;

      const updatedProfile: DashboardProfile = {
        ...current,
        layout: newLayout.map(item => ({
          i: item.i,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
          minW: item.minW || 2,
          minH: item.minH || 2
        }))
      };

      const updatedProfiles = {
        ...profiles,
        [activeProfileId]: updatedProfile
      };

      saveToStorageDebounced(updatedProfiles, activeProfileId);
      set({ profiles: updatedProfiles });
    },


    addCard: (config: CardConfig, layoutItem = {}) => {
      const { profiles, activeProfileId } = get();
      const current = profiles[activeProfileId];
      if (!current) return;

      const cardId = config.id || `card_${config.type}_${Date.now()}`;
      const finalConfig: CardConfig = {
        ...config,
        id: cardId
      };

      // Find lowest y coordinate to place at the bottom or top
      const maxY = current.layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);

      const defaultW = config.type === 'weather' || config.type === 'nordpool' || config.type === 'ev_charging' || config.type === 'media_player' || config.type === 'camera' ? 4 : 2;
      const defaultH = 2;

      const newLayoutItem: DashboardLayoutItem = {
        i: cardId,
        x: 0,
        y: maxY,
        w: layoutItem.w || defaultW,
        h: layoutItem.h || defaultH,
        minW: layoutItem.minW || (defaultW >= 4 ? 3 : 2),
        minH: layoutItem.minH || 2,
        ...layoutItem
      };

      const updatedProfile: DashboardProfile = {
        ...current,
        cards: {
          ...current.cards,
          [cardId]: finalConfig
        },
        layout: [...current.layout, newLayoutItem]
      };

      const updatedProfiles = {
        ...profiles,
        [activeProfileId]: updatedProfile
      };

      saveToStorage(updatedProfiles, activeProfileId);
      set({
        profiles: updatedProfiles,
        isCatalogOpen: false
      });
    },

    updateCard: (id: string, updates: Partial<CardConfig>) => {
      const { profiles, activeProfileId } = get();
      const current = profiles[activeProfileId];
      if (!current || !current.cards[id]) return;

      const updatedProfile: DashboardProfile = {
        ...current,
        cards: {
          ...current.cards,
          [id]: {
            ...current.cards[id],
            ...updates
          }
        }
      };

      const updatedProfiles = {
        ...profiles,
        [activeProfileId]: updatedProfile
      };

      saveToStorage(updatedProfiles, activeProfileId);
      set({ profiles: updatedProfiles });
    },

    removeCard: (id: string) => {
      const { profiles, activeProfileId } = get();
      const current = profiles[activeProfileId];
      if (!current) return;

      const nextCards = { ...current.cards };
      delete nextCards[id];

      const nextLayout = current.layout.filter(item => item.i !== id);

      const updatedProfile: DashboardProfile = {
        ...current,
        cards: nextCards,
        layout: nextLayout
      };

      const updatedProfiles = {
        ...profiles,
        [activeProfileId]: updatedProfile
      };

      saveToStorage(updatedProfiles, activeProfileId);
      set({
        profiles: updatedProfiles,
        activeModalCardId: get().activeModalCardId === id ? null : get().activeModalCardId
      });
    },

    duplicateCard: (id: string) => {
      const { profiles, activeProfileId } = get();
      const current = profiles[activeProfileId];
      if (!current || !current.cards[id]) return;

      const original = current.cards[id];
      const newCardId = `card_${original.type}_${Date.now()}`;
      const originalLayout = current.layout.find(l => l.i === id);

      const newConfig: CardConfig = {
        ...original,
        id: newCardId,
        title: original.title ? `${original.title} (Copy)` : undefined
      };

      const newLayoutItem: DashboardLayoutItem = originalLayout
        ? { ...originalLayout, i: newCardId, y: originalLayout.y + originalLayout.h }
        : { i: newCardId, x: 0, y: 99, w: 2, h: 2, minW: 2, minH: 2 };

      const updatedProfile: DashboardProfile = {
        ...current,
        cards: { ...current.cards, [newCardId]: newConfig },
        layout: [...current.layout, newLayoutItem]
      };

      const updatedProfiles = { ...profiles, [activeProfileId]: updatedProfile };
      saveToStorage(updatedProfiles, activeProfileId);
      set({ profiles: updatedProfiles });
    },

    toggleEditMode: () => {
      const { isEditMode, pinCode, openPinModal } = get();
      if (!isEditMode) {
        // Entering edit mode - check if PIN is configured
        if (pinCode && pinCode.length >= 4) {
          openPinModal('unlock');
          return;
        }
        set({ isEditMode: true });
      } else {
        // Leaving edit mode
        set({ isEditMode: false });
      }
    },

    setEditMode: (edit: boolean) => {
      set({ isEditMode: edit });
    },

    setPinCode: (pin: string) => {
      try {
        localStorage.setItem(PIN_STORAGE_KEY, pin);
      } catch {}
      set({ pinCode: pin, isPinModalOpen: false });
    },

    unlockWithPin: (pin: string) => {
      const { pinCode } = get();
      if (pin === pinCode) {
        set({ isEditMode: true, isPinModalOpen: false });
        return true;
      }
      return false;
    },

    openPinModal: (mode = 'unlock') => {
      set({ isPinModalOpen: true, pinModalMode: mode });
    },

    closePinModal: () => {
      set({ isPinModalOpen: false });
    },

    setWeatherBackdrop: (backdrop: WeatherBackdropType) => {
      try {
        localStorage.setItem(BACKDROP_STORAGE_KEY, backdrop);
      } catch {}
      set({ weatherBackdrop: backdrop });
    },

    openCardModal: (cardId: string) => {
      set({ activeModalCardId: cardId });
    },

    closeCardModal: () => {
      set({ activeModalCardId: null });
    },

    openCatalog: () => {
      set({ isCatalogOpen: true });
    },

    closeCatalog: () => {
      set({ isCatalogOpen: false });
    },

    exportProfilesJson: () => {
      const { profiles } = get();
      return JSON.stringify(profiles, null, 2);
    },

    importProfilesJson: (jsonStr: string) => {
      try {
        const parsed = JSON.parse(jsonStr);
        if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length > 0) {
          const firstId = Object.keys(parsed)[0];
          saveToStorage(parsed, firstId);
          set({
            profiles: parsed,
            activeProfileId: firstId,
            isEditMode: false
          });
          return true;
        }
      } catch (err) {
        console.error('Failed to import profile JSON:', err);
      }
      return false;
    }
  };
});
