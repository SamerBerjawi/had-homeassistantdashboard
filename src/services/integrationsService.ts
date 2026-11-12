/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Integrations & Add-ons aggregation service.
 * Correlates Official Core Integrations (config entries), HACS repositories,
 * and Supervisor Add-ons with linked Devices, Entities, and live update states.
 * Pure data and aggregation logic lives in ./integrations.
 */

import { HAEntityRegistryEntry, HADevice, HAState } from '../types';
import { IntegrationItem, HAConfigEntryRaw, HacsRepositoryRaw, SupervisorAddonRaw } from '../types/integrations';
import { haWebSocketService } from './haWebSocket';
import { buildIntegrations } from './integrations/buildIntegrations';

export { HELPER_DOMAINS, INTEGRATION_DISPLAY_NAMES } from './integrations/catalog';
export { isHelper, formatIntegrationName } from './integrations/naming';
export { isHacsIntegrationDevice, extractHacsDomain } from './integrations/hacs';

class IntegrationsService {
  private liveConfigEntries: HAConfigEntryRaw[] = [];
  private liveHacsRepos: HacsRepositoryRaw[] = [];
  private liveAddons: SupervisorAddonRaw[] = [];
  private hasQueriedLive = false;

  /**
   * Attempt to query live Home Assistant WebSocket endpoints for config entries,
   * HACS repositories, and Supervisor add-ons.
   */
  public async fetchLiveIntegrationData(): Promise<void> {
    if (haWebSocketService.isDemo()) {
      return;
    }

    try {
      // 1. Fetch live config entries
      const entries = await haWebSocketService.sendRequest<HAConfigEntryRaw[]>('config_entries/get').catch(() => []);
      if (Array.isArray(entries) && entries.length > 0) {
        this.liveConfigEntries = entries;
      }

      // 2. Fetch live HACS repositories if HACS is installed
      const hacs = await haWebSocketService.sendRequest<HacsRepositoryRaw[]>('hacs/repositories').catch(() => []);
      if (Array.isArray(hacs) && hacs.length > 0) {
        this.liveHacsRepos = hacs;
      }

      // 3. Fetch supervisor add-ons if available
      const addons = await haWebSocketService.sendRequest<{ data?: { addons?: SupervisorAddonRaw[] } } | null>('supervisor/api', {
        endpoint: '/addons',
        method: 'get'
      }).catch(() => null);
      if (addons?.data?.addons && Array.isArray(addons.data.addons)) {
        this.liveAddons = addons.data.addons;
      }

      this.hasQueriedLive = true;
    } catch {
      // Fallbacks will automatically operate through entityRegistry & deviceRegistry
    }
  }

  /**
   * Reload an integration config entry via Home Assistant WebSocket
   */
  public async reloadIntegration(entryId: string, allEntryIds?: string[]): Promise<boolean> {
    if (haWebSocketService.isDemo()) {
      return true;
    }
    try {
      const idsToReload = (allEntryIds && allEntryIds.length > 0) ? allEntryIds : [entryId];
      await Promise.all(
        idsToReload.map(id => 
          haWebSocketService.sendRequest('config_entries/reload', { entry_id: id }).catch(() => null)
        )
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Trigger an update install for a component with a linked update entity
   */
  public async installUpdate(updateEntityId: string): Promise<boolean> {
    if (haWebSocketService.isDemo()) {
      return true;
    }
    try {
      await haWebSocketService.sendRequest('call_service', {
        domain: 'update',
        service: 'install',
        service_data: { entity_id: updateEntityId }
      });
      return true;
    } catch {
      return false;
    }
  }

  /** Builds the unified Integrations / HACS / Add-ons list from the registries plus live data. */
  public getIntegrations(
    entityRegistry: HAEntityRegistryEntry[],
    devices: HADevice[],
    states: Record<string, HAState>,
    rawAreas: { area_id: string; name: string }[]
  ): IntegrationItem[] {
    return buildIntegrations(
      { configEntries: this.liveConfigEntries, hacsRepos: this.liveHacsRepos, addons: this.liveAddons },
      entityRegistry,
      devices,
      states,
      rawAreas
    );
  }
}

export const integrationsService = new IntegrationsService();
