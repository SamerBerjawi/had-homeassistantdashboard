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
  };
  mobility: {
    car: {
      customName?: string;
      brandLogoUrl?: string;
      vehicleImageUrl?: string;
      targetSocDefault: number;
    };
    bike: {
      customName?: string;
      brandLogoUrl?: string;
      bikeImageUrl?: string;
    };
  };
  rooms: {
    hiddenAreas: string[];
    favoriteAreas: string[];
    areaSortOrder: string[];
  };
  network: {
    adguardTimelineDefault: '24H' | '7D' | '30D' | '90D';
    defaultChartMode: 'unified' | 'split';
  };
  energy: {
    defaultPeriod: 'today' | 'yesterday' | '7d' | 'month' | 'year';
    carbonIntensityFactor?: number;
  };
  preferences?: {
    tempUnit?: 'C' | 'F';
    clockFormat?: '24h' | '12h';
    energyTariff?: number;
    currencySymbol?: string;
    glassBlurLevel?: 'subtle' | 'balanced' | 'deep' | 'ultra';
    specularHighlight?: boolean;
    go2rtcUrl?: string;
  };
  profile?: {
    name?: string;
    email?: string;
    role?: string;
    avatar?: string;
  };
  areas?: Record<string, { icon?: string; color?: string; name?: string; picture?: string; order?: number }>;
  floors?: Record<string, { icon?: string; color?: string; name?: string; order?: number; level?: number }>;
  entities?: Record<string, { customName?: string; hidden?: boolean }>;
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
  uploadAsset?(file: File, key: string): Promise<string>;
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
  uploadVehicleAsset: (file: File, key: string) => Promise<string>;
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
    backgroundBlur: 16
  },
  mobility: {
    car: {
      customName: 'Porsche Taycan 4S',
      brandLogoUrl: undefined,
      vehicleImageUrl: undefined,
      targetSocDefault: 80
    },
    bike: {
      customName: 'VanMoof S3',
      brandLogoUrl: undefined,
      bikeImageUrl: undefined
    }
  },
  rooms: {
    hiddenAreas: [],
    favoriteAreas: [],
    areaSortOrder: []
  },
  network: {
    adguardTimelineDefault: '24H',
    defaultChartMode: 'unified'
  },
  energy: {
    defaultPeriod: 'today',
    carbonIntensityFactor: 0.385
  },
  preferences: {
    tempUnit: 'C',
    clockFormat: '24h',
    energyTariff: 0.28,
    currencySymbol: '€',
    glassBlurLevel: 'deep',
    specularHighlight: true,
    go2rtcUrl: ''
  },
  profile: {
    name: 'Samer Berjawi',
    email: 'admin@homz.ai',
    role: 'Home Owner (Admin)',
    avatar: ''
  }
};
