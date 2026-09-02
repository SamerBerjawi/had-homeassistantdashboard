/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserDashboardConfig {
  version: number;
  updatedAt: string;
  theme: {
    accentColor: string;
    glassOpacity: number;
    backgroundBlur: number;
    sensorTrendWindowHours: 24 | 72;
    themeMode?: 'auto' | 'dark' | 'light';
    mode?: 'auto' | 'dark' | 'light';
    backgroundStyle?: 'glow' | 'flat';
    weatherBackdrop?: string;
    bentoGridDensity?: 'compact' | 'detailed';
  };
  mobility: {
    car: {
      customName?: string;
      brandLogoUrl?: string;
      vehicleImageUrl?: string;
      targetSocDefault: number;
      batteryCapacityKwh?: number;
    };
    bike: {
      customName?: string;
      brandLogoUrl?: string;
      bikeImageUrl?: string;
    };
  };
  rooms: {
    floorOrder: string[];
    hiddenFloors: string[];
    areaOrder: string[];
    hiddenAreas: string[];
    favoriteAreas: string[];
    areaSortOrder?: string[];
    areaOverrides: Record<string, {
      customName?: string;
      name?: string;
      customIcon?: string;
      icon?: string;
      customColor?: string;
      color?: string;
      backgroundImageUrl?: string;
      picture?: string;
      order?: number;
    }>;
  };
  entities: {
    hiddenEntityIds?: string[];
    nameOverrides?: Record<string, string>;
    iconOverrides?: Record<string, string>;
    customizations?: Record<string, { customName?: string; hidden?: boolean }>;
  };
  cameras: {
    defaultStreamType: 'webrtc' | 'hls' | 'mjpeg';
    mutedByDefault: boolean;
    autoPlayPreferences?: boolean;
    aspectRatio?: '16:9' | '4:3' | '1:1' | 'cover';
    customStreamEntities: Record<string, string>;
  };
  network: {
    adguardTimelineDefault: '24H' | '7D' | '30D' | '90D';
    defaultChartMode: 'unified' | 'split';
  };
  energy: {
    defaultPeriod: 'today' | 'yesterday' | '7d' | 'month' | 'year';
    carbonIntensityFactor?: number;
    energyTariff?: number;
    currencySymbol?: string;
  };
  preferences?: {
    backgroundStyle?: 'glow' | 'flat';
    tempUnit?: 'C' | 'F';
    clockFormat?: '24h' | '12h';
    energyTariff?: number;
    currencySymbol?: string;
    glassBlurLevel?: 'subtle' | 'balanced' | 'deep' | 'ultra';
    specularHighlight?: boolean;
    go2rtcUrl?: string;
    selectedWeatherEntityId?: string | null;
    selectedAlarmEntityId?: string | null;
    dismissedNotificationIds?: string[];
  };
  profile?: {
    name?: string;
    email?: string;
    role?: string;
    avatar?: string;
  };
  areas?: Record<string, {
    icon?: string;
    customIcon?: string;
    color?: string;
    customColor?: string;
    name?: string;
    customName?: string;
    picture?: string;
    backgroundImageUrl?: string;
    order?: number;
  }>;
  floors?: Record<string, { icon?: string; color?: string; name?: string; order?: number; level?: number }>;
  canvas?: {
    profiles?: Record<string, any>;
    activeProfileId?: string;
    pinCode?: string;
    weatherBackdrop?: string;
  };
}

export interface IConfigStorageDriver {
  loadConfig(): Promise<UserDashboardConfig>;
  saveConfig(config: Partial<UserDashboardConfig>): Promise<UserDashboardConfig>;
  uploadAsset?(fileOrDataUrl: File | string, key: string): Promise<string>;
}

export type StorageDriverType = 'remote_ha' | 'remote_nas' | 'local_storage';

export interface ConfigContextType {
  config: UserDashboardConfig;
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: string | null;
  driverType: StorageDriverType;
  driverName: string;
  isSyncingRemote: boolean;
  updateConfig: (
    partialOrUpdater:
      | Partial<UserDashboardConfig>
      | ((prev: UserDashboardConfig) => Partial<UserDashboardConfig>)
  ) => Promise<UserDashboardConfig>;
  uploadVehicleAsset: (fileOrDataUrl: File | string, key: string) => Promise<string>;
  resetConfig: () => Promise<UserDashboardConfig>;
  exportConfigJson: () => string;
  importConfigJson: (jsonStr: string) => Promise<boolean>;
}

export const DEFAULT_USER_CONFIG: UserDashboardConfig = {
  version: 1,
  updatedAt: '1970-01-01T00:00:00.000Z',
  theme: {
    accentColor: '#38bdf8', // sky-400
    glassOpacity: 0.75,
    backgroundBlur: 16,
    sensorTrendWindowHours: 24,
    themeMode: 'auto',
    backgroundStyle: 'glow',
    weatherBackdrop: 'auto',
    bentoGridDensity: 'detailed'
  },
  mobility: {
    car: {
      customName: 'Porsche Taycan 4S',
      brandLogoUrl: undefined,
      vehicleImageUrl: undefined,
      targetSocDefault: 80,
      batteryCapacityKwh: 93.4
    },
    bike: {
      customName: 'VanMoof S3',
      brandLogoUrl: undefined,
      bikeImageUrl: undefined
    }
  },
  rooms: {
    floorOrder: [],
    hiddenFloors: [],
    areaOrder: [],
    hiddenAreas: [],
    favoriteAreas: [],
    areaSortOrder: [],
    areaOverrides: {}
  },
  entities: {
    hiddenEntityIds: [],
    nameOverrides: {},
    iconOverrides: {},
    customizations: {}
  },
  cameras: {
    defaultStreamType: 'webrtc',
    mutedByDefault: true,
    autoPlayPreferences: true,
    aspectRatio: '16:9',
    customStreamEntities: {}
  },
  network: {
    adguardTimelineDefault: '24H',
    defaultChartMode: 'unified'
  },
  energy: {
    defaultPeriod: 'today',
    carbonIntensityFactor: 0.385,
    energyTariff: 0.28,
    currencySymbol: '€'
  },
  preferences: {
    backgroundStyle: 'glow',
    tempUnit: 'C',
    clockFormat: '24h',
    energyTariff: 0.28,
    currencySymbol: '€',
    glassBlurLevel: 'deep',
    specularHighlight: true,
    go2rtcUrl: '',
    selectedWeatherEntityId: null,
    selectedAlarmEntityId: null,
    dismissedNotificationIds: []
  },
  profile: {
    name: 'Samer Berjawi',
    email: 'admin@homz.ai',
    role: 'Home Owner (Admin)',
    avatar: ''
  },
  areas: {},
  floors: {},
  canvas: {
    profiles: {},
    activeProfileId: 'profile_main',
    pinCode: '',
    weatherBackdrop: 'auto'
  }
};
