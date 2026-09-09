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
