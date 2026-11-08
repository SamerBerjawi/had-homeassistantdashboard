/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AreaData } from '../../../types/rooms';


export interface AreaDetailViewProps {
  area: AreaData;
  darkMode?: boolean;
  onBack: () => void;
  onToggleLights: (areaId: string, targetState?: boolean) => void;
  onToggleLocks?: (areaId: string) => void;
  onToggleEntityLock?: (entityId: string) => void;
  onTurnOffAll: (areaId: string) => void;
  callHAService: (
    domain: string,
    service: string,
    serviceData?: Record<string, any>,
    target?: any
  ) => Promise<any>;
  updateEntityState: (
    entityId: string,
    newState: string,
    newAttributes?: Record<string, any>
  ) => void;
}


export type DomainTab = 'all' | 'lights' | 'climate' | 'switches' | 'media' | 'sensors';
