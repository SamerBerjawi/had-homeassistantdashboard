/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Domain types and data models for Home Assistant Rooms / Areas Subsystem.
 */

import { ResolvedEntity } from '../types';

export interface AreaSensorSummary {
  temperature?: number;          // °C
  humidity?: number;             // %
  illuminance?: number;          // lx
  motionDetected: boolean;       // binary_sensor (motion/occupancy)
  presenceDetected: boolean;     // binary_sensor (presence)
  doorsOpenCount: number;        // binary_sensor (door)
  windowsOpenCount: number;      // binary_sensor (window)
  waterLeakDetected: boolean;    // binary_sensor (moisture)
  smokeDetected: boolean;        // binary_sensor (smoke/gas)
  co2Level?: number;             // ppm
}

export interface AreaEntityGroup<T = ResolvedEntity> {
  lights: T[];
  switches: T[];
  climates: T[];
  mediaPlayers: T[];
  fans: T[];
  covers: T[];
  locks: T[];
  sensors: T[];
  binarySensors: T[];
  vacuums: T[];
  scenes?: T[];
}

export interface AreaData {
  areaId: string;
  name: string;
  icon?: string;
  color?: string;
  picture?: string;
  floorId?: string;
  floorName?: string;
  sensors: AreaSensorSummary;
  entities: AreaEntityGroup;
  activeLightsCount: number;
  totalLightsCount: number;
  activeSwitchesCount: number;
  activeFansCount: number;
  activeMediaPlayersCount: number;
  unlockedLocksCount: number;
  totalLocksCount: number;
  climateState?: {
    currentTemp?: number;
    targetTemp?: number;
    hvacMode?: string;
  };
}

export interface FloorData {
  floorId: string;
  name: string;
  level: number;
  icon?: string;
  color?: string;
  areas: AreaData[];
}

export interface HouseStateSummary {
  totalLightsOn: number;
  totalWindowsOpen: number;
  totalDoorsOpen: number;
  activeMotionAreasCount: number;
  activeMediaCount: number;
  unlockedLocksCount: number;
  activeVacuum?: {
    name: string;
    status: string; // "cleaning", "docked", "returning", "error"
  };
  summarySentence: string;
}
