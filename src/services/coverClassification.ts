/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HAEntity, ResolvedEntity } from '../types';

export type CoverDeviceClass =
  | 'blind'
  | 'curtain'
  | 'shutter'
  | 'shade'
  | 'garage'
  | 'gate'
  | 'door'
  | 'window'
  | 'awning'
  | 'generic';

// Home Assistant CoverEntityFeature bitmask flags
export const CoverEntityFeature = {
  OPEN: 1,
  CLOSE: 2,
  SET_POSITION: 4,
  STOP: 8,
  OPEN_TILT: 16,
  CLOSE_TILT: 32,
  STOP_TILT: 64,
  SET_TILT_POSITION: 128
};

export interface CoverCapabilities {
  deviceClass: CoverDeviceClass;
  deviceClassLabel: string;
  isOpen: boolean;
  isClosed: boolean;
  isOpening: boolean;
  isClosing: boolean;
  isGarageOrGate: boolean;
  supportsPosition: boolean;
  supportsTilt: boolean;
  supportsStop: boolean;
  supportsOpenClose: boolean;
  currentPosition?: number;
  currentTilt?: number;
  friendlyName: string;
  icon?: string;
  lastChanged?: string;
}

export function detectCoverCapabilities(
  entity: HAEntity | ResolvedEntity | null | undefined
): CoverCapabilities {
  if (!entity) {
    return {
      deviceClass: 'blind',
      deviceClassLabel: 'Shade',
      isOpen: false,
      isClosed: true,
      isOpening: false,
      isClosing: false,
      isGarageOrGate: false,
      supportsPosition: true,
      supportsTilt: false,
      supportsStop: true,
      supportsOpenClose: true,
      currentPosition: 0,
      friendlyName: 'Cover'
    };
  }

  const attrs = entity.attributes || {};
  const stateStr = String(entity.state || 'closed').toLowerCase();
  const isOpen = stateStr === 'open';
  const isClosed = stateStr === 'closed';
  const isOpening = stateStr === 'opening';
  const isClosing = stateStr === 'closing';

  const resolvedName = 'name' in entity ? (entity as any).name : undefined;
  const friendlyName = attrs.friendly_name || resolvedName || entity.entity_id;

  // Device Class
  const rawClass = String(attrs.device_class || '').toLowerCase();
  const eid = entity.entity_id.toLowerCase();
  const fn = friendlyName.toLowerCase();

  let deviceClass: CoverDeviceClass = 'shade';
  let deviceClassLabel = 'Blind / Shade';

  if (rawClass === 'garage' || eid.includes('garage') || fn.includes('garage')) {
    deviceClass = 'garage';
    deviceClassLabel = 'Garage Door';
  } else if (rawClass === 'gate' || eid.includes('gate') || fn.includes('gate')) {
    deviceClass = 'gate';
    deviceClassLabel = 'Motorized Gate';
  } else if (rawClass === 'curtain' || eid.includes('curtain') || fn.includes('curtain') || eid.includes('drape')) {
    deviceClass = 'curtain';
    deviceClassLabel = 'Smart Curtain';
  } else if (rawClass === 'shutter' || eid.includes('shutter') || fn.includes('shutter')) {
    deviceClass = 'shutter';
    deviceClassLabel = 'Roller Shutter';
  } else if (rawClass === 'awning' || eid.includes('awning') || fn.includes('awning')) {
    deviceClass = 'awning';
    deviceClassLabel = 'Awning';
  } else if (rawClass === 'door' || eid.includes('door') || fn.includes('door')) {
    deviceClass = 'door';
    deviceClassLabel = 'Motorized Door';
  } else if (rawClass === 'window' || eid.includes('window') || fn.includes('window')) {
    deviceClass = 'window';
    deviceClassLabel = 'Motorized Window';
  }

  const isGarageOrGate = deviceClass === 'garage' || deviceClass === 'gate';

  // Supported Features
  const sf = typeof attrs.supported_features === 'number' ? attrs.supported_features : 0;
  const hasFeature = (flag: number) => (sf & flag) !== 0 || sf === 0;

  const supportsPosition =
    typeof attrs.current_position === 'number' || hasFeature(CoverEntityFeature.SET_POSITION);
  const supportsTilt =
    typeof attrs.current_tilt_position === 'number' || hasFeature(CoverEntityFeature.SET_TILT_POSITION);
  const supportsStop = hasFeature(CoverEntityFeature.STOP);
  const supportsOpenClose = hasFeature(CoverEntityFeature.OPEN) || hasFeature(CoverEntityFeature.CLOSE);

  // Current values
  const currentPosition =
    typeof attrs.current_position === 'number'
      ? attrs.current_position
      : isOpen
      ? 100
      : isClosed
      ? 0
      : undefined;

  const currentTilt =
    typeof attrs.current_tilt_position === 'number' ? attrs.current_tilt_position : undefined;

  const lastChanged = (entity as any).last_changed || (entity as any).last_updated || attrs.last_changed;

  return {
    deviceClass,
    deviceClassLabel,
    isOpen,
    isClosed,
    isOpening,
    isClosing,
    isGarageOrGate,
    supportsPosition,
    supportsTilt,
    supportsStop,
    supportsOpenClose,
    currentPosition,
    currentTilt,
    friendlyName,
    icon: typeof attrs.icon === 'string' ? attrs.icon : undefined,
    lastChanged
  };
}
