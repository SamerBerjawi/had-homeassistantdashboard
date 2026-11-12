/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { HouseLine, SquaresFour, Lightbulb, Broom, DoorOpen, Lightning, Armchair, ShieldCheck, MusicNotes, HardDrives, ShareNetwork, Car, Heartbeat, GitFork, PuzzlePiece, GearSix, type Icon as PhosphorIcon } from '@phosphor-icons/react';
import { HAEntity, HAArea, HAFloor, HALabel, HAZone, HADevice, ResolvedEntity, LogMessage, ToastNotification } from '../../../types';


export interface DeviceVisibilitySectionProps {
  darkMode: boolean;
  entities: HAEntity[];
  setEntities: React.Dispatch<React.SetStateAction<HAEntity[]>>;
  floors: HAFloor[];
  areas: HAArea[];
  rawDevices: HADevice[];
  labels: HALabel[];
  resolvedZones: HAZone[];
  resolvedEntities: Record<string, ResolvedEntity>;
  updateFloor: (floorId: string, updates: Partial<HAFloor>) => void;
  updateArea: (areaId: string, updates: Partial<HAArea>) => void;
  reorderFloors: (newFloors: HAFloor[]) => void;
  reorderAreas: (newAreas: HAArea[]) => void;
  callHAService: (domain: string, service: string, serviceData?: Record<string, unknown>, target?: unknown) => Promise<void>;
  updateEntityState: (entityId: string, newState: string, newAttributes?: Record<string, unknown>) => void;
  addToast?: (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => void;
  addLog: (type: LogMessage['type'], message: string, details?: unknown) => void;
}


export const PRESET_COLORS = [
  '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#10b981',
  '#f59e0b', '#f97316', '#f43f5e', '#06b6d4', '#64748b'
];


export const FLOOR_ICON_OPTIONS = [
  'Stairs', 'House', 'Buildings', 'Tree', 'Shield', 'Armchair', 'Sparkle', 'Compass', 'Stack', 'ArrowsVertical'
];


export const AREA_ICON_OPTIONS = [
  'Armchair', 'Bed', 'CookingPot', 'Desktop', 'Bathtub', 'FilmSlate', 'Tree', 'Car', 'Books', 'DoorOpen', 'Lightbulb', 'HouseLine'
];


export interface NavigationPageMeta {
  id: string;
  label: string;
  icon: PhosphorIcon;
  mandatory?: boolean;
  description: string;
  color: string;
}


export const NAVIGATION_PAGES: NavigationPageMeta[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: SquaresFour,
    mandatory: true,
    description: 'Main home dashboard with quick actions, weather, and room cards.',
    color: '#0ea5e9'
  },
  {
    id: 'rooms',
    label: 'Rooms',
    icon: Armchair,
    mandatory: false,
    description: 'Per-room device control, lighting, climate, and environmental breakdown.',
    color: '#8b5cf6'
  },
  {
    id: 'energy',
    label: 'Energy',
    icon: Lightning,
    mandatory: false,
    description: 'Solar production, power grid consumption, battery storage, and energy analytics.',
    color: '#f59e0b'
  },
  {
    id: 'security',
    label: 'Security',
    icon: ShieldCheck,
    mandatory: false,
    description: 'Alarm panels, live camera feeds, door locks, and entry sensors.',
    color: '#ef4444'
  },
  {
    id: 'media',
    label: 'Media',
    icon: MusicNotes,
    mandatory: false,
    description: 'Audio players, smart speakers, media receivers, and playback controls.',
    color: '#ec4899'
  },
  {
    id: 'system',
    label: 'System',
    icon: HardDrives,
    mandatory: false,
    description: 'Host CPU/memory metrics, HA storage, and network latency telemetry.',
    color: '#06b6d4'
  },
  {
    id: 'network',
    label: 'Network',
    icon: ShareNetwork,
    mandatory: false,
    description: 'Connected network clients, router status, and throughput telemetry.',
    color: '#3b82f6'
  },
  {
    id: 'mobility',
    label: 'Mobility',
    icon: Car,
    mandatory: false,
    description: 'Electric vehicle charging, battery range, and car telemetry.',
    color: '#10b981'
  },
  {
    id: 'health',
    label: 'Health',
    icon: Heartbeat,
    mandatory: false,
    description: 'Indoor air quality, CO2, humidity, and home wellness metrics.',
    color: '#14b8a6'
  },
  {
    id: 'vacuums',
    label: 'Vacuums',
    icon: Broom,
    mandatory: false,
    description: 'Robot vacuum cleaners, docking status, and zone cleaning runs.',
    color: '#a855f7'
  },
  {
    id: 'automations',
    label: 'Automations',
    icon: GitFork,
    mandatory: false,
    description: 'Home Assistant automations, scenes, and execution triggers.',
    color: '#f97316'
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: PuzzlePiece,
    mandatory: false,
    description: 'Installed official integrations, HACS community packages, and add-ons.',
    color: '#6366f1'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: GearSix,
    mandatory: true,
    description: 'Dashboard configuration, customization, backups, and connection settings.',
    color: '#64748b'
  }
];


export type { BinarySensorSubcategory, SensorSubcategory } from '../../../services/entitySubcategoryClassification';

export type GroupingMode = 'domain' | 'area' | 'device' | 'flat';
