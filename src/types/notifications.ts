/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type NotificationCategory = 'update' | 'persistent_notification' | 'repair' | 'hazard' | 'security' | 'battery';

export type NotificationSeverity = 'info' | 'warning' | 'error' | 'critical' | 'update';

export interface HANotificationAction {
  id: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: string;
  onClick: () => Promise<void> | void;
  loading?: boolean;
}

export interface HANotificationItem {
  id: string;
  entity_id?: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  createdAt?: string; // ISO date string or human readable
  timestamp?: number; // epoch ms
  
  // Specific to Software Updates
  installedVersion?: string;
  latestVersion?: string;
  releaseSummary?: string;
  releaseUrl?: string;
  inProgress?: boolean;
  updatePercentage?: number;
  skippedVersion?: string | null;
  autoUpdate?: boolean;

  // Specific to Repairs / Issues
  issueId?: string;
  learnMoreUrl?: string;
  isFixable?: boolean;

  // Specific to Hardware / Sensor alerts
  areaName?: string;
  sensorType?: 'leak' | 'smoke' | 'door' | 'window' | 'battery';
  batteryLevel?: number;

  // Associated actions
  actions?: HANotificationAction[];
  dismissable?: boolean;
  onDismiss?: () => Promise<void> | void;
}

export interface NotificationFilterCounts {
  all: number;
  updates: number;
  alertsAndRepairs: number;
  notifications: number;
  sensors: number;
}

export interface HANativePersistentNotification {
  notification_id: string;
  title?: string;
  message: string;
  created_at?: string;
  status?: string;
}

export interface HANativeRepairIssue {
  issue_id: string;
  domain: string;
  issue_domain?: string;
  severity?: 'critical' | 'error' | 'warning' | string;
  translation_key?: string;
  translation_placeholders?: Record<string, any>;
  learn_more_url?: string;
  is_fixable?: boolean;
  created?: string;
  title?: string;
  message?: string;
}

