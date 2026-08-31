/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface VacuumConsumables {
  mainBrushPercent?: number;       // sensor.*_main_brush_left / filter_life
  sideBrushPercent?: number;       // sensor.*_side_brush_left
  filterPercent?: number;          // sensor.*_filter_left
  sensorCleanPercent?: number;     // sensor.*_sensor_dirty_left
  dustbinStatus?: string;          // binary_sensor.*_dust_bin
  waterBoxStatus?: string;         // binary_sensor.*_water_box
  mopAttached?: boolean;           // binary_sensor.*_mop_attached
}

export interface VacuumMapItem {
  id: string;
  name: string;
  entityId?: string;
  imageUrl?: string;
  isLive?: boolean;
  type: 'camera' | 'image' | 'lidar';
}

export interface VacuumDeviceData {
  entityId: string;                // vacuum.*
  deviceId?: string;
  name: string;
  areaName?: string;
  state: 'cleaning' | 'docked' | 'paused' | 'idle' | 'returning' | 'error';
  batteryLevel: number;            // %
  batteryCharging: boolean;
  statusText: string;              // attributes.status or state

  // Cleaning Session Telemetry
  cleaningTimeMinutes?: number;    // sensor.*_cleaning_time
  cleanedAreaM2?: number;          // sensor.*_cleaning_area
  currentRoom?: string;            // attributes.current_room / sensor.*_current_room
  errorCode?: string;              // attributes.error / fault

  // Configurable Modes & Speeds
  fanSpeed?: string;               // attributes.fan_speed
  fanSpeedList: string[];          // attributes.fan_speed_list (Quiet, Balanced, Turbo, Max)
  waterFlowLevel?: string;         // select.*_water_box_mode / attributes.water_box_mode
  waterFlowList: string[];
  mopMode?: string;                // select.*_mop_mode

  // Live Map & Multi-Floor Maps
  mapEntityId?: string;            // camera.*_map / image.*_map
  mapImageUrl?: string;
  availableMaps: VacuumMapItem[];

  // Consumables & Maintenance
  consumables: VacuumConsumables;

  // Supported Features Bitmask
  supports: {
    pause: boolean;
    stop: boolean;
    returnToBase: boolean;
    fanSpeed: boolean;
    battery: boolean;
    status: boolean;
    locate: boolean;
    cleanSpot: boolean;
    map: boolean;
  };
}

export interface VacuumStateSummary {
  totalVacuumsCount: number;
  activeCleaningCount: number;
  dockedCount: number;
  hasErrors: boolean;
  summarySentence: string;
  detailedSentence: string;
}
