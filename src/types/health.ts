/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Centralized Apple Health & Vitals Registry
 * Strips device prefixes and maps Home Assistant companion app sensor entities
 * to structured health, activity, vitals, and body composition telemetry.
 */

export const HEALTH_METRIC_SUFFIXES = {
  // Activity & Movement
  healthSteps: 'health_steps', // Fallback to 'steps'
  activeEnergy: 'active_energy',
  restingEnergy: 'resting_energy',
  distance: 'walking_running_distance', // Fallback to 'distance'
  flightsClimbed: 'flights_climbed', // Fallback to 'floors_ascended'
  exerciseTime: 'exercise_time',
  activePace: 'average_active_pace',
  vo2Max: 'vo2_max',

  // Heart & Vitals
  heartRate: 'heart_rate',
  restingHeartRate: 'resting_heart_rate',
  walkingHeartRate: 'walking_heart_rate_average',
  hrv: 'heart_rate_variability',
  respiratoryRate: 'respiratory_rate',
  bloodOxygen: 'blood_oxygen',
  bpSystolic: 'blood_pressure_systolic',
  bpDiastolic: 'blood_pressure_diastolic',
  bloodGlucose: 'blood_glucose',
  bodyTemperature: 'body_temperature',
  basalBodyTemperature: 'basal_body_temperature',

  // Body Composition & Nutrition
  weight: 'weight',
  height: 'height',
  bodyFat: 'body_fat_percentage',
  leanBodyMass: 'lean_body_mass',
  water: 'water',
} as const;

export type HealthMetricKey = keyof typeof HEALTH_METRIC_SUFFIXES;

/** Suffix alternate fallbacks when primary metric suffix is not present */
export const HEALTH_METRIC_FALLBACKS: Partial<Record<HealthMetricKey, string[]>> = {
  healthSteps: ['steps', 'step_count', 'pedometer'],
  distance: ['distance', 'walking_distance', 'running_distance'],
  flightsClimbed: ['floors_ascended', 'stairs_climbed', 'floors'],
  activePace: ['active_pace', 'walking_pace', 'running_pace', 'pace'],
  hrv: ['hrv', 'heart_rate_variability_sdnn'],
  bloodOxygen: ['oxygen_saturation', 'spo2', 'blood_oxygen_saturation'],
  bodyFat: ['body_fat', 'fat_percentage'],
  leanBodyMass: ['lean_mass'],
  water: ['water_intake', 'hydration'],
};

/** Suffixes that represent generic device telemetry and must be ignored */
export const EXCLUDED_TELEMETRY_SUFFIXES = [
  'battery',
  'battery_level',
  'battery_state',
  'battery_power',
  'charger_type',
  'storage',
  'free_storage',
  'internal_storage',
  'wifi',
  'wifi_bssid',
  'wifi_ssid',
  'sim_1',
  'sim_2',
  'connection_type',
  'cellular_provider',
  'kiosk_mode',
  'app_version',
  'location',
  'geocoded_location',
  'display_name',
  'device_name',
  'proximity_sensor',
  'focus',
  'audio_output',
  'bssid',
  'ssid',
  'screen_brightness',
  'network_type',
] as const;

export type HealthCategory = 'activity' | 'vitals' | 'body';

export type HealthTimeRange = 'today' | 'week' | 'month' | 'year';

export interface HealthMetricDefinition {
  key: HealthMetricKey;
  label: string;
  category: HealthCategory;
  defaultUnit: string;
  decimals: number;
  iconName: string;
  accentColor: string;
  chartType: 'bar' | 'line' | 'area';
  statAggregation: 'sum' | 'mean' | 'max' | 'min' | 'latest';
  goal?: number;
  normalRange?: { min: number; max: number };
}

export const HEALTH_METRIC_DEFINITIONS: Record<HealthMetricKey, HealthMetricDefinition> = {
  healthSteps: {
    key: 'healthSteps',
    label: 'Steps',
    category: 'activity',
    defaultUnit: 'steps',
    decimals: 0,
    iconName: 'Footprints',
    accentColor: '#FF2D55', // Apple Activity Coral
    chartType: 'bar',
    statAggregation: 'sum',
    goal: 10000,
  },
  activeEnergy: {
    key: 'activeEnergy',
    label: 'Active Energy',
    category: 'activity',
    defaultUnit: 'kcal',
    decimals: 0,
    iconName: 'Flame',
    accentColor: '#FF5E3A', // Apple Move Orange
    chartType: 'bar',
    statAggregation: 'sum',
    goal: 500,
  },
  restingEnergy: {
    key: 'restingEnergy',
    label: 'Resting Energy',
    category: 'activity',
    defaultUnit: 'kcal',
    decimals: 0,
    iconName: 'Bed',
    accentColor: '#FF9500',
    chartType: 'bar',
    statAggregation: 'sum',
    goal: 1800,
  },
  distance: {
    key: 'distance',
    label: 'Walking + Running Distance',
    category: 'activity',
    defaultUnit: 'km',
    decimals: 2,
    iconName: 'SneakerMove',
    accentColor: '#FF3B30',
    chartType: 'bar',
    statAggregation: 'sum',
    goal: 8,
  },
  flightsClimbed: {
    key: 'flightsClimbed',
    label: 'Flights Climbed',
    category: 'activity',
    defaultUnit: 'flights',
    decimals: 0,
    iconName: 'Stairs',
    accentColor: '#FF9500',
    chartType: 'bar',
    statAggregation: 'sum',
    goal: 12,
  },
  exerciseTime: {
    key: 'exerciseTime',
    label: 'Exercise Time',
    category: 'activity',
    defaultUnit: 'min',
    decimals: 0,
    iconName: 'Timer',
    accentColor: '#A1E833', // Apple Exercise Lime
    chartType: 'bar',
    statAggregation: 'sum',
    goal: 30,
  },
  activePace: {
    key: 'activePace',
    label: 'Active Pace',
    category: 'activity',
    defaultUnit: 'min/km',
    decimals: 2,
    iconName: 'Speedometer',
    accentColor: '#30D158',
    chartType: 'line',
    statAggregation: 'mean',
  },
  vo2Max: {
    key: 'vo2Max',
    label: 'Cardio Fitness (VO2 Max)',
    category: 'activity',
    defaultUnit: 'mL/kg/min',
    decimals: 1,
    iconName: 'HeartHalf',
    accentColor: '#AF52DE',
    chartType: 'line',
    statAggregation: 'latest',
    normalRange: { min: 38, max: 54 },
  },

  // Heart & Vitals
  heartRate: {
    key: 'heartRate',
    label: 'Heart Rate',
    category: 'vitals',
    defaultUnit: 'bpm',
    decimals: 0,
    iconName: 'Heartbeat',
    accentColor: '#FF2D55',
    chartType: 'area',
    statAggregation: 'latest',
    normalRange: { min: 60, max: 100 },
  },
  restingHeartRate: {
    key: 'restingHeartRate',
    label: 'Resting Heart Rate',
    category: 'vitals',
    defaultUnit: 'bpm',
    decimals: 0,
    iconName: 'Heart',
    accentColor: '#FF3B30',
    chartType: 'line',
    statAggregation: 'latest',
    normalRange: { min: 50, max: 75 },
  },
  walkingHeartRate: {
    key: 'walkingHeartRate',
    label: 'Walking Heart Rate Avg',
    category: 'vitals',
    defaultUnit: 'bpm',
    decimals: 0,
    iconName: 'TrendUp',
    accentColor: '#FF6482',
    chartType: 'line',
    statAggregation: 'mean',
    normalRange: { min: 70, max: 115 },
  },
  hrv: {
    key: 'hrv',
    label: 'Heart Rate Variability',
    category: 'vitals',
    defaultUnit: 'ms',
    decimals: 0,
    iconName: 'Waveform',
    accentColor: '#AF52DE', // Purple
    chartType: 'area',
    statAggregation: 'latest',
    normalRange: { min: 35, max: 90 },
  },
  respiratoryRate: {
    key: 'respiratoryRate',
    label: 'Respiratory Rate',
    category: 'vitals',
    defaultUnit: 'brpm',
    decimals: 1,
    iconName: 'Wind',
    accentColor: '#5AC8FA', // Cyan
    chartType: 'line',
    statAggregation: 'latest',
    normalRange: { min: 12, max: 20 },
  },
  bloodOxygen: {
    key: 'bloodOxygen',
    label: 'Blood Oxygen (SpO2)',
    category: 'vitals',
    defaultUnit: '%',
    decimals: 0,
    iconName: 'Drop',
    accentColor: '#007AFF', // Blue
    chartType: 'line',
    statAggregation: 'latest',
    normalRange: { min: 95, max: 100 },
  },
  bpSystolic: {
    key: 'bpSystolic',
    label: 'Blood Pressure (Systolic)',
    category: 'vitals',
    defaultUnit: 'mmHg',
    decimals: 0,
    iconName: 'Gauge',
    accentColor: '#FF453A',
    chartType: 'line',
    statAggregation: 'latest',
    normalRange: { min: 90, max: 120 },
  },
  bpDiastolic: {
    key: 'bpDiastolic',
    label: 'Blood Pressure (Diastolic)',
    category: 'vitals',
    defaultUnit: 'mmHg',
    decimals: 0,
    iconName: 'Gauge',
    accentColor: '#FF9F0A',
    chartType: 'line',
    statAggregation: 'latest',
    normalRange: { min: 60, max: 80 },
  },
  bloodGlucose: {
    key: 'bloodGlucose',
    label: 'Blood Glucose',
    category: 'vitals',
    defaultUnit: 'mg/dL',
    decimals: 0,
    iconName: 'FirstAid',
    accentColor: '#BF5AF2',
    chartType: 'line',
    statAggregation: 'latest',
    normalRange: { min: 70, max: 140 },
  },
  bodyTemperature: {
    key: 'bodyTemperature',
    label: 'Body Temperature',
    category: 'vitals',
    defaultUnit: '°C',
    decimals: 1,
    iconName: 'Thermometer',
    accentColor: '#FF9F0A',
    chartType: 'line',
    statAggregation: 'latest',
    normalRange: { min: 36.1, max: 37.2 },
  },
  basalBodyTemperature: {
    key: 'basalBodyTemperature',
    label: 'Basal Body Temp',
    category: 'vitals',
    defaultUnit: '°C',
    decimals: 2,
    iconName: 'ThermometerSimple',
    accentColor: '#FFD60A',
    chartType: 'line',
    statAggregation: 'latest',
    normalRange: { min: 36.0, max: 36.8 },
  },

  // Body Composition & Nutrition
  weight: {
    key: 'weight',
    label: 'Weight',
    category: 'body',
    defaultUnit: 'kg',
    decimals: 1,
    iconName: 'Scales',
    accentColor: '#5E5CE6', // Indigo
    chartType: 'line',
    statAggregation: 'latest',
  },
  height: {
    key: 'height',
    label: 'Height',
    category: 'body',
    defaultUnit: 'cm',
    decimals: 1,
    iconName: 'Ruler',
    accentColor: '#64D2FF',
    chartType: 'line',
    statAggregation: 'latest',
  },
  bodyFat: {
    key: 'bodyFat',
    label: 'Body Fat',
    category: 'body',
    defaultUnit: '%',
    decimals: 1,
    iconName: 'Percent',
    accentColor: '#FF9F0A',
    chartType: 'line',
    statAggregation: 'latest',
    normalRange: { min: 10, max: 22 },
  },
  leanBodyMass: {
    key: 'leanBodyMass',
    label: 'Lean Body Mass',
    category: 'body',
    defaultUnit: 'kg',
    decimals: 1,
    iconName: 'Barbell',
    accentColor: '#30D158',
    chartType: 'line',
    statAggregation: 'latest',
  },
  water: {
    key: 'water',
    label: 'Water Intake',
    category: 'body',
    defaultUnit: 'L',
    decimals: 2,
    iconName: 'DropHalf',
    accentColor: '#0A84FF',
    chartType: 'bar',
    statAggregation: 'sum',
    goal: 2.5,
  },
};

export interface DiscoveredHealthDevice {
  deviceId: string;
  deviceName: string;
  sensorCount: number;
  matchedMetrics: Partial<Record<HealthMetricKey, string>>; // Key to entity_id
}

export interface HealthTimeseriesPoint {
  date: Date;
  label: string;
  value: number;
  min?: number;
  max?: number;
  mean?: number;
  sum?: number;
}

export interface HealthMetricSummary {
  key: HealthMetricKey;
  entityId?: string;
  currentValue: number | null;
  unit: string;
  friendlyName: string;
  lastUpdated?: string;
  min?: number;
  max?: number;
  average?: number;
  totalSum?: number;
  changePercent?: number;
  history: HealthTimeseriesPoint[];
  status: 'normal' | 'low' | 'elevated' | 'optimal' | 'unknown';
}
