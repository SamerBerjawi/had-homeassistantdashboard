/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface HAEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name: string;
    icon?: string;
    brightness?: number; // 0-100
    temperature?: number; // current ambient temp
    target_temp?: number; // target comfort temp
    humidity?: number; // current relative humidity
    target_humidity?: number; // target humidity level
    battery?: number; // 0-100 %
    room?: string; // Room associated
    mode?: string; // vacuum/climate mode
    muted?: boolean; // doorbell or media player status
    power?: number; // power consumption in Watts
    color?: string; // HEX color or description
    media_title?: string; // media title
    media_artist?: string; // media artist
    media_image?: string; // media artwork
    volume_level?: number; // 0-100 volume
    camera_feed?: string; // stream description
    motion_detected?: boolean; // sensor state
    last_triggered?: string; // datetime string
    hvac_action?: string;
    current_temperature?: number;
    supported_features?: number;
    device_class?: string;
    unit_of_measurement?: string;
    [key: string]: any;
  };
}

export type HAConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'auth_failed' | 'error';

// ----------------------------------------------------
// Home Assistant Registry Interfaces (Auto-Layout Model)
// ----------------------------------------------------

export interface HALabel {
  label_id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
}

export interface HAZone {
  entity_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  icon?: string | null;
  passive?: boolean;
  personsInZone?: string[];
  personsCount?: number;
}

export interface HAArea {
  area_id: string;
  name: string;
  picture?: string | null;
  icon?: string | null;
  floor_id?: string | null;
  aliases?: string[];
  color?: string | null;
  order?: number;
  labels?: string[];
}

export interface HADevice {
  id: string;
  name: string;
  name_by_user?: string | null;
  area_id?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  sw_version?: string | null;
  hw_version?: string | null;
  disabled_by?: string | null;
  entry_type?: string | null;
  configuration_url?: string | null;
  via_device_id?: string | null;
  connections?: [string, string][];
  identifiers?: [string, string][];
  labels?: string[];
}

export interface HAEntityRegistryEntry {
  entity_id: string;
  name?: string | null;
  original_name?: string | null;
  area_id?: string | null; // Direct match
  device_id?: string | null; // Inherited match
  platform?: string;
  disabled_by?: string | null;
  entity_category?: 'diagnostic' | 'config' | 'system' | null;
  icon?: string | null;
  unique_id?: string;
  hidden_by?: string | null;
  translation_key?: string | null;
  device_class?: string | null;
  unit_of_measurement?: string | null;
  options?: Record<string, any>;
  labels?: string[];
}

export interface HAFloor {
  floor_id: string;
  name: string;
  level?: number | null;
  icon?: string | null;
  aliases?: string[];
  color?: string | null;
  order?: number;
}

export interface HAState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed?: string;
  last_updated?: string;
  context?: {
    id: string;
    parent_id?: string | null;
    user_id?: string | null;
  };
}

export type ResolutionSource = 'direct_entity_area' | 'inherited_device_area' | 'unassigned';

export interface ResolvedEntity {
  entity_id: string;
  domain: string;
  name: string;
  state: string;
  attributes: Record<string, any>;
  area_id: string | null;
  device_id: string | null;
  floor_id: string | null;
  device?: HADevice | null;
  area?: HAArea | null;
  floor?: HAFloor | null;
  resolutionSource: ResolutionSource;
  entity_category?: 'diagnostic' | 'config' | 'system' | null;
  disabled_by?: string | null;
  hidden: boolean;
  isDiagnostic: boolean;
  powerWatts?: number;
  batteryPct?: number;
  icon?: string;
  labels?: string[];
}

export interface ResolvedAreaSummary {
  totalEntities: number;
  lightsOn: number;
  totalLights: number;
  climatesActive: number;
  totalClimates: number;
  currentTempAvg?: number;
  targetTempAvg?: number;
  currentHumidityAvg?: number;
  activeMediaPlayers: number;
  totalMediaPlayers: number;
  totalPowerWatts: number;
  openContacts: number;
  motionDetected: boolean;
  lowBatteryCount: number;
  activeCleaners: number;
  activeSwitches: number;
}

export interface ResolvedArea {
  area_id: string;
  name: string;
  icon: string;
  picture?: string | null;
  floor_id?: string | null;
  floor?: HAFloor | null;
  color?: string | null;
  order?: number;
  devices: HADevice[];
  entities: ResolvedEntity[];
  entitiesByDomain: Record<string, ResolvedEntity[]>;
  summary: ResolvedAreaSummary;
  bannerImage: string;
  labels?: string[];
}

export interface ResolvedFloor {
  floor_id: string;
  name: string;
  level: number;
  icon: string;
  color?: string | null;
  order?: number;
  areas: ResolvedArea[];
  totalLightsOn: number;
  totalLights: number;
  totalPowerWatts: number;
  averageTemp?: number;
  securityBreaches: number;
}

export interface HassAreaWithEntities extends ResolvedArea {}

export interface SecurityOverviewState {
  alarmPanel?: ResolvedEntity;
  locks: ResolvedEntity[];
  openDoorsWindows: ResolvedEntity[];
  activeMotionSensors: ResolvedEntity[];
  cameras: ResolvedEntity[];
}

export interface OverviewSummaryState {
  peopleHome: number;
  peopleAway: number;
  totalPeople?: number;
  lightsOnCount: number;
  totalLightsCount?: number;
  fansOnCount?: number;
  totalFansCount?: number;
  doorsOpenCount?: number;
  totalDoorsCount?: number;
  windowsOpenCount?: number;
  totalWindowsCount?: number;
  openOpeningsCount: number;
  alarmState?: string;
  activeMediaCount: number;
  totalMediaCount?: number;
  activeClimatesCount: number;
  activeSwitchesCount: number;
  totalPowerWatts: number;
}

export interface AutoLayoutState {
  areas: Record<string, HassAreaWithEntities>;
  domainGroups: Record<string, ResolvedEntity[]>;
  securityOverview: SecurityOverviewState;
  overviewSummary: OverviewSummaryState;
  isLoading: boolean;
  error: string | null;
}

export interface AutoLayoutMetrics {
  totalFloors: number;
  totalAreas: number;
  totalDevices: number;
  totalEntities: number;
  resolvedDirectCount: number;
  resolvedInheritedCount: number;
  unassignedEntitiesCount: number;
  filteredDisabledCount: number;
  diagnosticEntitiesCount: number;
  totalLightsOn: number;
  totalPowerWatts: number;
  criticalBatteryCount: number;
  securityAlertsCount: number;
  lastResolvedAt: string;
}

export interface Room {
  id: string;
  name: string;
  icon: string;
  temperature: number;
  humidity: number;
  devicesCount: number;
  entityIds: string[];
  bannerImage: string;
}

export interface LogMessage {
  id: string;
  timestamp: string;
  type: 'info' | 'service_call' | 'state_changed' | 'warning' | 'error';
  message: string;
  entity_id?: string;
  details?: any;
}

export interface ToastNotification {
  id: string;
  title: string;
  message?: string;
  type?: 'lock' | 'vacuum' | 'light' | 'climate' | 'security' | 'scene' | 'success' | 'warning' | 'info';
  timestamp?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface EnergyDataPoint {
  time: string;
  timestamp?: number;
  solarProduction: number; // kW
  batteryCharge: number; // kW (positive when charging)
  batteryDischarge: number; // kW (positive when discharging)
  batteryLevel: number; // %
  gridImport: number; // kW
  gridExport: number; // kW
  totalConsumption: number; // kW
  livingRoom: number; // kW
  bedroom: number; // kW
  kitchen: number; // kW
  hall: number; // kW
}

export interface EnergySummary {
  todaySolarKwh: number;
  todayConsumedKwh: number;
  todayBatteryChargedKwh: number;
  todayBatteryDischargedKwh: number;
  todayGridImportKwh: number;
  todayGridExportKwh: number;
  selfSufficiency: number; // %
  solarCoverage: number; // %
  estimatedSavings: number; // $
  carbonOffsetKg: number;
}

export type MaintenanceCategory = 'filter' | 'cleaning' | 'battery' | 'calibration' | 'inspection' | 'firmware';
export type MaintenanceStatus = 'healthy' | 'due_soon' | 'overdue';
export type MaintenancePriority = 'low' | 'medium' | 'high' | 'critical';

export interface MaintenanceTask {
  id: string;
  entityId: string;
  deviceName: string;
  roomName: string;
  taskTitle: string; // e.g. "HEPA Filter Replacement"
  category: MaintenanceCategory;
  intervalDays: number; // e.g. 90
  lastServicedDate: string; // "2026-08-12"
  dueDate: string; // "2026-08-26"
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  wearPercentage?: number; // 0-100% wear level
  estimatedCost?: number;
  instructions?: string;
  partNumber?: string;
  runtimeHours?: number;
}

export interface MaintenanceLogEntry {
  id: string;
  taskId: string;
  entityId: string;
  deviceName: string;
  roomName: string;
  taskTitle: string;
  servicedDate: string; // "2026-08-12"
  servicedBy: string; // "Sarah Jenkins"
  notes?: string;
  cost?: number;
  replacedPart?: string;
}

export interface WeatherForecastDay {
  day: string;
  condition: string;
  tempC: number;
  tempF: number;
  highC: number;
  lowC: number;
}

export interface WeatherGroundingSource {
  title: string;
  url: string;
}

export interface WeatherData {
  location: string;
  country?: string;
  temperatureC: number;
  temperatureF: number;
  condition: string; // "Partly Cloudy", "Sunny", "Rain", etc.
  conditionCode: 'sunny' | 'cloudy' | 'partly-cloudy' | 'rain' | 'storm' | 'snow' | 'fog';
  highC: number;
  lowC: number;
  highF: number;
  lowF: number;
  humidity: number; // %
  windSpeedKmh: number;
  windSpeedMph: number;
  uvIndex: number;
  aqi?: number;
  aqiStatus?: string;
  feelsLikeC: number;
  feelsLikeF: number;
  summary: string;
  forecast: WeatherForecastDay[];
  groundingSources?: WeatherGroundingSource[];
  lastUpdated: string;
  isGrounded?: boolean;
}

export * from './types/notifications';

