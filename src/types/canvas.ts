/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CardConfig {
  id: string;
  type: string; // e.g., 'light', 'climate', 'nordpool', 'ev_charging', 'weather', 'media_player', 'vacuum', 'camera', 'sensor', 'switch', 'lock'
  entityId: string;
  title?: string;
  customIcon?: string;
  options?: Record<string, any>;
}

export interface DashboardLayoutItem {
  i: string; // matches CardConfig.id
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface DashboardProfile {
  id: string;
  name: string;
  layout: DashboardLayoutItem[];
  cards: Record<string, CardConfig>;
  isLocked: boolean;
  pinCode?: string;
}

export type WeatherBackdropType = 'auto' | 'sunny' | 'partly-cloudy' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'starry-night';

export interface CanvasState {
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
}
