/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared state for one notification extraction pass. Each collector pushes into `items` and
 * records ids in `seenIds` so the same condition is never reported twice.
 */

import type { HANotificationItem, HANativePersistentNotification, HANativeRepairIssue } from '../../types/notifications';
import type { ResolvedEntity, HAState, HAEntityRegistryEntry } from '../../types';
import type { AlertItem } from '../../store/useAlertStore';

export interface ExtractNotificationsParams {
  domainGroups: Record<string, ResolvedEntity[]>;
  states: Record<string, HAState>;
  entityRegistry?: HAEntityRegistryEntry[];
  nativeNotifications?: HANativePersistentNotification[];
  nativePersistentNotifications?: HANativePersistentNotification[];
  nativeRepairs?: HANativeRepairIssue[];
  dismissedNotificationIds: string[];
  callHAService: (domain: string, service: string, serviceData?: Record<string, any>, target?: any) => Promise<void>;
  dismissNotification: (id: string) => void;
  updateEntityState?: (entityId: string, newState: string, newAttributes?: Record<string, any>) => void;
  installUpdate?: (entityId: string) => Promise<void>;
  skipUpdate?: (entityId: string) => Promise<void>;
  clearSkippedUpdate?: (entityId: string) => Promise<void>;
  storeAlerts?: AlertItem[];
}

export interface NotificationContext extends Required<Pick<ExtractNotificationsParams,
  'entityRegistry' | 'nativeNotifications' | 'nativePersistentNotifications' | 'nativeRepairs' | 'dismissedNotificationIds'>>,
  Omit<ExtractNotificationsParams, 'entityRegistry' | 'nativeNotifications' | 'nativePersistentNotifications' | 'nativeRepairs' | 'dismissedNotificationIds'> {
  items: HANotificationItem[];
  dismissedSet: Set<string>;
  seenIds: Set<string>;
  registryMap: Map<string, HAEntityRegistryEntry>;
}

export function createNotificationContext(params: ExtractNotificationsParams): NotificationContext {
  const entityRegistry = params.entityRegistry || [];
  const dismissedNotificationIds = params.dismissedNotificationIds || [];
  return {
    ...params,
    entityRegistry,
    nativeNotifications: params.nativeNotifications || [],
    nativePersistentNotifications: params.nativePersistentNotifications || [],
    nativeRepairs: params.nativeRepairs || [],
    dismissedNotificationIds,
    items: [],
    dismissedSet: new Set(dismissedNotificationIds),
    seenIds: new Set<string>(),
    registryMap: new Map<string, HAEntityRegistryEntry>(entityRegistry.map((e) => [e.entity_id, e]))
  };
}
