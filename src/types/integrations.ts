/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HADevice, ResolvedEntity } from '../types';

export type IntegrationCategory = 'official' | 'hacs' | 'addon';

export type IntegrationState = 
  | 'loaded' 
  | 'running' 
  | 'stopped' 
  | 'setup_error' 
  | 'not_loaded' 
  | 'disabled' 
  | 'unknown';

export type IoTClass = 
  | 'local_push' 
  | 'local_polling' 
  | 'cloud_push' 
  | 'cloud_polling' 
  | 'calculated' 
  | 'assumed_state';

export interface IntegrationItem {
  id: string;
  name: string;
  domain: string;
  category: IntegrationCategory;
  state: IntegrationState;
  iconDomain?: string;
  version?: string;
  latestVersion?: string;
  hasUpdate?: boolean;
  updateEntityId?: string;
  releaseUrl?: string;
  releaseSummary?: string;
  description?: string;
  authors?: string[];
  documentationUrl?: string;
  iotClass?: IoTClass;
  source?: string;
  configEntryId?: string;
  configEntryIds?: string[];
  entriesCount?: number;
  devicesCount: number;
  entitiesCount: number;
  domainBreakdown: Record<string, number>;
  devices: HADevice[];
  entities: ResolvedEntity[];
  isCustom?: boolean;
  disabledBy?: string | null;
}

/** Raw `config_entries/get` item (fields we read; HA sends more). */
export interface HAConfigEntryRaw {
  entry_id: string;
  domain?: string;
  title?: string;
  source?: string;
  state?: string;
  disabled_by?: string | null;
}

/** Raw `hacs/repositories` item (fields we read). */
export interface HacsRepositoryRaw {
  id?: string;
  domain?: string;
  name?: string;
  full_name?: string;
  category?: string;
  installed?: boolean;
  downloaded?: boolean;
  installed_version?: string;
  available_version?: string;
  description?: string;
  documentation?: string;
  authors?: string[];
}

/** Raw Supervisor `/addons` item (fields we read). */
export interface SupervisorAddonRaw {
  slug?: string;
  name?: string;
  installed?: boolean;
  description?: string;
  url?: string;
  update_available?: boolean;
  state?: string;
  version?: string;
  version_latest?: string;
}
