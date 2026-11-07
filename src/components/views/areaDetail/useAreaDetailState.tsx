/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Lightbulb, Plug, Thermometer, Drop, SpeakerHigh, Power, SquaresFour } from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import { useEntityPopup } from '../../../contexts/EntityPopupContext';
import { useUserConfig } from '../../../contexts/ConfigContext';
import { useEditMode } from '../../../contexts/EditModeContext';
import { GridColSpan, GridRowSpan } from '../../layout/GridTile';
import { sortTilesForBento, getComputedTileSpans, sortItemsForHybrid, TileLayoutMode, ComputedTileSpan } from '../../../utils/bentoLayout';
import { SectionTabItem } from '../../common/AdaptiveSectionTabs';
import { detectLightCapabilities } from '../../../services/lightClassification';
import { AreaDetailViewProps, DomainTab } from './shared';

/**
 * State, derived data and handlers behind the Devices & Visibility settings page. The section
 * component lays out the tabs; each panel in this folder reads what it needs from this bag.
 */
export function useAreaDetailState(props: AreaDetailViewProps) {
  const {
  area,
  darkMode = true,
  onToggleLights,
  onToggleLocks,
  onToggleEntityLock,
  callHAService,
  updateEntityState
} = props;

  const {
    entities,
    activeLightsCount,
    totalLightsCount,
    activeSwitchesCount,
    unlockedLocksCount
  } = area;

  const { openEntityDetails } = useEntityPopup();
  const [activeMediaDrawerEntity, setActiveMediaDrawerEntity] = useState<ResolvedEntity | null>(null);
  const [activeDomainTab, setActiveDomainTab] = useState<DomainTab>('all');

  // =========================================================================
  // SMART BATTERY SENSOR DEDUPLICATION & PAIRING
  // =========================================================================
  const {
    enrichedLights,
    enrichedSwitches,
    enrichedClimates,
    enrichedFans,
    enrichedLocks,
    enrichedCovers,
    enrichedVacuums,
    contactSensors,
    motionSensors,
    hazardSensors,
    energySensors,
    environmentalSensors,
    unclaimedBatterySensors,
    generalSensors
  } = useMemo(() => {
    const rawSensors = [...(entities.sensors || []), ...(entities.binarySensors || [])];

    // 1. Identify all candidate battery entities in this area
    const rawBatterySensors = rawSensors.filter((ent) => {
      const dc = (ent.attributes?.device_class || '').toLowerCase();
      const id = ent.entity_id.toLowerCase();
      return dc === 'battery' || id.includes('battery');
    });

    const claimedBatteryIds = new Set<string>();

    // Helper: Match and pair companion battery sensor to parent device
    const matchAndAttachBattery = (ent: ResolvedEntity): ResolvedEntity => {
      const existingBat =
        ent.attributes?.battery_level ??
        ent.attributes?.battery ??
        ent.attributes?.battery_percentage;

      if (typeof existingBat === 'number') {
        return ent;
      }

      const hostId = ent.entity_id.toLowerCase();
      const hostObjId = hostId.split('.')[1] || '';
      const hostName = (ent.name || '').toLowerCase().trim();
      const hostDeviceId = ent.attributes?.device_id;

      for (const bs of rawBatterySensors) {
        if (claimedBatteryIds.has(bs.entity_id)) continue;

        const bsId = bs.entity_id.toLowerCase();
        const bsObjId = bsId.split('.')[1] || '';
        const bsName = (bs.name || '').toLowerCase().trim();
        const bsDeviceId = bs.attributes?.device_id;

        let isMatch = false;

        // A. Match by device_id
        if (hostDeviceId && bsDeviceId && hostDeviceId === bsDeviceId) {
          isMatch = true;
        } else {
          // B. Match by object_id similarity
          const strippedBsObjId = bsObjId.replace(/(_battery_level|_battery_state|_battery|_batt)$/i, '');
          const strippedHostObjId = hostObjId.replace(
            /(_contact|_sensor|_door|_window|_motion|_lock|_climate|_switch|_fan|_light|_blind|_cover)$/i,
            ''
          );

          if (
            strippedBsObjId &&
            (hostObjId === strippedBsObjId ||
              strippedHostObjId === strippedBsObjId ||
              hostObjId.startsWith(strippedBsObjId) ||
              strippedBsObjId.startsWith(strippedHostObjId))
          ) {
            isMatch = true;
          } else {
            // C. Match by friendly name prefix/suffix
            const strippedBsName = bsName
              .replace(/\s*(battery\s*level|battery\s*state|battery)\s*$/i, '')
              .trim();
            const strippedHostName = hostName
              .replace(/\s*(contact|sensor|door|window|motion|lock|blind|cover|fan|light)\s*$/i, '')
              .trim();

            if (
              strippedBsName &&
              (hostName === strippedBsName ||
                strippedHostName === strippedBsName ||
                hostName.startsWith(strippedBsName) ||
                strippedBsName.startsWith(strippedHostName))
            ) {
              isMatch = true;
            }
          }
        }

        if (isMatch) {
          const val = parseFloat(bs.state);
          if (!isNaN(val) && val >= 0 && val <= 100) {
            claimedBatteryIds.add(bs.entity_id);
            return {
              ...ent,
              attributes: {
                ...ent.attributes,
                battery_level: Math.round(val)
              }
            };
          }
        }
      }

      return ent;
    };

    // Enrich host domain entities
    const enrichedLights = (entities.lights || []).map(matchAndAttachBattery);
    const enrichedSwitches = (entities.switches || []).map(matchAndAttachBattery);
    const enrichedClimates = (entities.climates || []).map(matchAndAttachBattery);
    const enrichedFans = (entities.fans || []).map(matchAndAttachBattery);
    const enrichedLocks = (entities.locks || []).map(matchAndAttachBattery);
    const enrichedCovers = (entities.covers || []).map(matchAndAttachBattery);
    const enrichedVacuums = (entities.vacuums || []).map(matchAndAttachBattery);

    // Filter non-battery sensors
    const nonBatterySensors = rawSensors.filter((ent) => {
      const dc = (ent.attributes?.device_class || '').toLowerCase();
      const id = ent.entity_id.toLowerCase();
      return dc !== 'battery' && !id.includes('battery');
    });

    // 1. Contact & Entry Sensors
    const contactSensors = nonBatterySensors
      .filter((ent) => {
        const dc = (ent.attributes?.device_class || '').toLowerCase();
        const id = ent.entity_id.toLowerCase();
        return (
          dc === 'door' ||
          dc === 'window' ||
          dc === 'garage_door' ||
          dc === 'opening' ||
          id.includes('contact') ||
          id.includes('door') ||
          id.includes('window')
        );
      })
      .map(matchAndAttachBattery);

    // 2. Motion & Presence Sensors
    const motionSensors = nonBatterySensors
      .filter((ent) => {
        const dc = (ent.attributes?.device_class || '').toLowerCase();
        const id = ent.entity_id.toLowerCase();
        const isContact =
          dc === 'door' ||
          dc === 'window' ||
          dc === 'garage_door' ||
          dc === 'opening' ||
          id.includes('contact');
        if (isContact) return false;
        return (
          dc === 'motion' ||
          dc === 'occupancy' ||
          dc === 'presence' ||
          id.includes('motion') ||
          id.includes('occupancy') ||
          id.includes('presence')
        );
      })
      .map(matchAndAttachBattery);

    // 3. Safety & Hazard Sensors
    const hazardSensors = nonBatterySensors
      .filter((ent) => {
        const dc = (ent.attributes?.device_class || '').toLowerCase();
        const id = ent.entity_id.toLowerCase();
        return (
          dc === 'moisture' ||
          dc === 'smoke' ||
          dc === 'gas' ||
          dc === 'carbon_monoxide' ||
          dc === 'safety' ||
          dc === 'problem' ||
          id.includes('leak') ||
          id.includes('smoke')
        );
      })
      .map(matchAndAttachBattery);

    // 4. Power & Energy Sensors
    const energySensors = nonBatterySensors
      .filter((ent) => {
        const dc = (ent.attributes?.device_class || '').toLowerCase();
        const uom = (ent.attributes?.unit_of_measurement || '').toLowerCase();
        const id = ent.entity_id.toLowerCase();
        return (
          dc === 'power' ||
          dc === 'energy' ||
          dc === 'current' ||
          dc === 'voltage' ||
          uom === 'w' ||
          uom === 'kw' ||
          uom === 'kwh' ||
          uom === 'v' ||
          uom === 'a' ||
          id.includes('power') ||
          id.includes('energy')
        );
      })
      .map(matchAndAttachBattery);

    // 5. Environmental Sensors
    const environmentalSensors = nonBatterySensors
      .filter((ent) => {
        const dc = (ent.attributes?.device_class || '').toLowerCase();
        const uom = (ent.attributes?.unit_of_measurement || '').toLowerCase();
        const id = ent.entity_id.toLowerCase();
        const name = (ent.name || '').toLowerCase();

        const isBattery =
          dc === 'battery' ||
          id.includes('battery') ||
          name.includes('battery') ||
          (uom === '%' && (id.includes('batt') || name.includes('batt')));
        if (isBattery) return false;

        const isContact =
          dc === 'door' ||
          dc === 'window' ||
          dc === 'garage_door' ||
          dc === 'opening' ||
          id.includes('contact');
        if (isContact) return false;
        const isMotion =
          dc === 'motion' ||
          dc === 'occupancy' ||
          dc === 'presence' ||
          id.includes('motion');
        if (isMotion) return false;
        const isHazard =
          dc === 'moisture' ||
          dc === 'smoke' ||
          dc === 'gas' ||
          dc === 'carbon_monoxide' ||
          id.includes('leak') ||
          id.includes('smoke');
        if (isHazard) return false;

        return (
          dc === 'temperature' ||
          dc === 'humidity' ||
          dc === 'illuminance' ||
          dc === 'carbon_dioxide' ||
          dc === 'aqi' ||
          dc === 'pm25' ||
          dc === 'pressure' ||
          uom.includes('°c') ||
          uom.includes('°f') ||
          (uom === '%' && (id.includes('humidity') || id.includes('hygro'))) ||
          uom === 'lx' ||
          uom === 'lux' ||
          uom === 'ppm' ||
          id.endsWith('_temperature') ||
          id.endsWith('_temp') ||
          id.includes('temperature_sensor') ||
          id.includes('humidity') ||
          id.includes('lux') ||
          id.includes('co2')
        );
      })
      .map(matchAndAttachBattery);

    // 6. Unclaimed standalone battery sensors (not paired to any host device)
    const unclaimedBatterySensors = rawBatterySensors.filter(
      (bs) => !claimedBatteryIds.has(bs.entity_id)
    );

    // 7. General Diagnostics
    const classified = new Set<string>();
    [
      ...contactSensors,
      ...motionSensors,
      ...hazardSensors,
      ...energySensors,
      ...environmentalSensors,
      ...rawBatterySensors
    ].forEach((e) => classified.add(e.entity_id));

    const generalSensors = rawSensors
      .filter((ent) => !classified.has(ent.entity_id))
      .map(matchAndAttachBattery);

    return {
      enrichedLights,
      enrichedSwitches,
      enrichedClimates,
      enrichedFans,
      enrichedLocks,
      enrichedCovers,
      enrichedVacuums,
      contactSensors,
      motionSensors,
      hazardSensors,
      energySensors,
      environmentalSensors,
      unclaimedBatterySensors,
      generalSensors
    };
  }, [entities]);

  const { config } = useUserConfig();
  const { isEditMode, activeBreakpoint, activeLayoutOverrides } = useEditMode();
  const layoutOverrides = activeLayoutOverrides;

  const tileLayoutMode: TileLayoutMode = config?.rooms?.tileLayout || (config?.rooms?.fullWidthTiles ? 'full' : 'compact');
  const isFullWidth = tileLayoutMode === 'full';
  const defaultColSpan: GridColSpan = isFullWidth ? 4 : 2;
  const defaultTabletColSpan: GridColSpan = 3;
  const defaultDesktopColSpan: GridColSpan = 3;

  const sortedLights = useMemo(() => {
    const initial = sortTilesForBento({
      items: enrichedLights,
      getId: (l) => l.entity_id,
      layoutOverrides,
      isEditMode
    });
    return tileLayoutMode === 'hybrid'
      ? sortItemsForHybrid({
          items: initial,
          getId: (l) => l.entity_id,
          layoutOverrides,
          isSmall: (l) => !detectLightCapabilities(l).supportsBrightness,
          isLarge: (l) => detectLightCapabilities(l).supportsBrightness || detectLightCapabilities(l).supportsColor
        })
      : initial;
  }, [enrichedLights, layoutOverrides, isEditMode, tileLayoutMode]);

  const sortedClimates = useMemo(() => sortTilesForBento({
    items: enrichedClimates,
    getId: (c) => c.entity_id,
    layoutOverrides,
    isEditMode
  }), [enrichedClimates, layoutOverrides, isEditMode]);

  const sortedFans = useMemo(() => sortTilesForBento({
    items: enrichedFans,
    getId: (f) => f.entity_id,
    layoutOverrides,
    isEditMode
  }), [enrichedFans, layoutOverrides, isEditMode]);

  const sortedSwitches = useMemo(() => sortTilesForBento({
    items: enrichedSwitches,
    getId: (s) => s.entity_id,
    layoutOverrides,
    isEditMode
  }), [enrichedSwitches, layoutOverrides, isEditMode]);

  const sortedLocks = useMemo(() => sortTilesForBento({
    items: enrichedLocks,
    getId: (l) => l.entity_id,
    layoutOverrides,
    isEditMode
  }), [enrichedLocks, layoutOverrides, isEditMode]);

  const sortedCovers = useMemo(() => sortTilesForBento({
    items: enrichedCovers,
    getId: (c) => c.entity_id,
    layoutOverrides,
    isEditMode
  }), [enrichedCovers, layoutOverrides, isEditMode]);

  const sortedMediaPlayers = useMemo(() => sortTilesForBento({
    items: entities.mediaPlayers || [],
    getId: (m) => m.entity_id,
    layoutOverrides,
    isEditMode
  }), [entities.mediaPlayers, layoutOverrides, isEditMode]);

  const sortedVacuums = useMemo(() => sortTilesForBento({
    items: enrichedVacuums || [],
    getId: (v) => v.entity_id,
    layoutOverrides,
    isEditMode
  }), [enrichedVacuums, layoutOverrides, isEditMode]);

  const sortedCameras = useMemo(() => sortTilesForBento({
    items: entities.cameras || [],
    getId: (c) => c.entity_id,
    layoutOverrides,
    isEditMode
  }), [entities.cameras, layoutOverrides, isEditMode]);

  const sortedContactSensors = useMemo(() => sortTilesForBento({
    items: contactSensors,
    getId: (s) => s.entity_id,
    layoutOverrides,
    isEditMode
  }), [contactSensors, layoutOverrides, isEditMode]);

  const sortedMotionSensors = useMemo(() => sortTilesForBento({
    items: motionSensors,
    getId: (s) => s.entity_id,
    layoutOverrides,
    isEditMode
  }), [motionSensors, layoutOverrides, isEditMode]);

  const sortedHazardSensors = useMemo(() => sortTilesForBento({
    items: hazardSensors,
    getId: (s) => s.entity_id,
    layoutOverrides,
    isEditMode
  }), [hazardSensors, layoutOverrides, isEditMode]);

  const sortedEnergySensors = useMemo(() => sortTilesForBento({
    items: energySensors,
    getId: (s) => s.entity_id,
    layoutOverrides,
    isEditMode
  }), [energySensors, layoutOverrides, isEditMode]);

  const sortedEnvironmentalSensors = useMemo(() => sortTilesForBento({
    items: environmentalSensors,
    getId: (s) => s.entity_id,
    layoutOverrides,
    isEditMode
  }), [environmentalSensors, layoutOverrides, isEditMode]);

  const sortedBatterySensors = useMemo(() => sortTilesForBento({
    items: unclaimedBatterySensors,
    getId: (s) => s.entity_id,
    layoutOverrides,
    isEditMode
  }), [unclaimedBatterySensors, layoutOverrides, isEditMode]);

  const sortedGeneralSensors = useMemo(() => sortTilesForBento({
    items: generalSensors,
    getId: (s) => s.entity_id,
    layoutOverrides,
    isEditMode
  }), [generalSensors, layoutOverrides, isEditMode]);

  // Computed spans per category based on active layout mode (compact, hybrid, full) and active breakpoint
  const lightSpans = useMemo(() => {
    return getComputedTileSpans({
      mode: tileLayoutMode,
      items: sortedLights,
      getId: (l) => l.entity_id,
      layoutOverrides,
      breakpoint: activeBreakpoint,
      isSmall: (l) => !detectLightCapabilities(l).supportsBrightness,
      isLarge: (l) => detectLightCapabilities(l).supportsBrightness || detectLightCapabilities(l).supportsColor
    });
  }, [tileLayoutMode, sortedLights, layoutOverrides, activeBreakpoint]);

  const climateAndFanSpans = useMemo(() => {
    const combined = [
      ...sortedClimates.map(c => ({ id: c.entity_id, item: c, kind: 'climate' as const })),
      ...sortedFans.map(f => ({ id: f.entity_id, item: f, kind: 'fan' as const }))
    ];
    return getComputedTileSpans({
      mode: tileLayoutMode,
      items: combined,
      getId: (x) => x.id,
      layoutOverrides,
      breakpoint: activeBreakpoint,
      isSmall: (x) => x.kind === 'fan',
      isLarge: (x) => x.kind === 'climate',
      naturalRowSpan: (x) => x.kind === 'climate' ? 2 : 1
    });
  }, [tileLayoutMode, sortedClimates, sortedFans, layoutOverrides, activeBreakpoint]);

  const switchLockCoverSpans = useMemo(() => {
    const combined = [
      ...sortedSwitches.map(s => ({ id: s.entity_id, item: s, kind: 'switch' as const })),
      ...sortedLocks.map(l => ({ id: l.entity_id, item: l, kind: 'lock' as const })),
      ...sortedCovers.map(c => ({ id: c.entity_id, item: c, kind: 'cover' as const }))
    ];
    return getComputedTileSpans({
      mode: tileLayoutMode,
      items: combined,
      getId: (x) => x.id,
      layoutOverrides,
      breakpoint: activeBreakpoint,
      isSmall: (x) => x.kind === 'lock' || x.kind === 'cover' || (x.kind === 'switch' && !x.item.attributes?.current_power_w),
      isLarge: (x) => x.kind === 'switch' && Boolean(x.item.attributes?.current_power_w)
    });
  }, [tileLayoutMode, sortedSwitches, sortedLocks, sortedCovers, layoutOverrides, activeBreakpoint]);

  const mediaVacuumSpans = useMemo(() => {
    const combined = [
      ...sortedMediaPlayers.map(m => ({ id: m.entity_id, item: m, kind: 'media' as const })),
      ...sortedVacuums.map(v => ({ id: v.entity_id, item: v, kind: 'vacuum' as const }))
    ];
    return getComputedTileSpans({
      mode: tileLayoutMode,
      items: combined,
      getId: (x) => x.id,
      layoutOverrides,
      breakpoint: activeBreakpoint,
      isSmall: (x) => true
    });
  }, [tileLayoutMode, sortedMediaPlayers, sortedVacuums, layoutOverrides, activeBreakpoint]);

  const contactSpans = useMemo(() => getComputedTileSpans({ mode: tileLayoutMode, items: sortedContactSensors, getId: (s) => s.entity_id, layoutOverrides, breakpoint: activeBreakpoint }), [tileLayoutMode, sortedContactSensors, layoutOverrides, activeBreakpoint]);
  const motionSpans = useMemo(() => getComputedTileSpans({ mode: tileLayoutMode, items: sortedMotionSensors, getId: (s) => s.entity_id, layoutOverrides, breakpoint: activeBreakpoint }), [tileLayoutMode, sortedMotionSensors, layoutOverrides, activeBreakpoint]);
  const environmentalSpans = useMemo(() => getComputedTileSpans({ mode: tileLayoutMode, items: sortedEnvironmentalSensors, getId: (s) => s.entity_id, layoutOverrides, breakpoint: activeBreakpoint }), [tileLayoutMode, sortedEnvironmentalSensors, layoutOverrides, activeBreakpoint]);
  const hazardSpans = useMemo(() => getComputedTileSpans({ mode: tileLayoutMode, items: sortedHazardSensors, getId: (s) => s.entity_id, layoutOverrides, breakpoint: activeBreakpoint }), [tileLayoutMode, sortedHazardSensors, layoutOverrides, activeBreakpoint]);
  const energySpans = useMemo(() => getComputedTileSpans({ mode: tileLayoutMode, items: sortedEnergySensors, getId: (s) => s.entity_id, layoutOverrides, breakpoint: activeBreakpoint }), [tileLayoutMode, sortedEnergySensors, layoutOverrides, activeBreakpoint]);
  const batterySpans = useMemo(() => getComputedTileSpans({ mode: tileLayoutMode, items: sortedBatterySensors, getId: (s) => s.entity_id, layoutOverrides, breakpoint: activeBreakpoint }), [tileLayoutMode, sortedBatterySensors, layoutOverrides, activeBreakpoint]);
  const generalSpans = useMemo(() => getComputedTileSpans({ mode: tileLayoutMode, items: sortedGeneralSensors, getId: (s) => s.entity_id, layoutOverrides, breakpoint: activeBreakpoint }), [tileLayoutMode, sortedGeneralSensors, layoutOverrides, activeBreakpoint]);

  const getTileSpan = (id: string, spansMap?: Map<string, ComputedTileSpan>, defaultRow: GridRowSpan = 1) => {
    const s = spansMap?.get(id);
    const rawDesktopSpan = s?.desktopColSpan ?? defaultDesktopColSpan;
    const desktopColSpan = (rawDesktopSpan < 3 ? 3 : rawDesktopSpan) as GridColSpan;
    return {
      colSpan: s?.colSpan ?? defaultColSpan,
      rowSpan: s?.rowSpan ?? defaultRow,
      tabletColSpan: s?.tabletColSpan ?? defaultTabletColSpan,
      desktopColSpan,
      colStart: s?.colStart,
      tabletColStart: s?.tabletColStart,
      desktopColStart: s?.desktopColStart
    };
  };

  // =========================================================================
  // CONTROL ACTION HANDLERS
  // =========================================================================
  const handleTempAdjust = (climate: ResolvedEntity, delta: number) => {
    const curTarget = climate.attributes?.temperature ?? climate.attributes?.target_temp ?? 21;
    const minTemp = climate.attributes?.min_temp ?? 10;
    const maxTemp = climate.attributes?.max_temp ?? 35;
    const nextTarget = Math.max(minTemp, Math.min(maxTemp, parseFloat((curTarget + delta).toFixed(1))));

    updateEntityState(climate.entity_id, climate.state, {
      ...climate.attributes,
      temperature: nextTarget,
      target_temp: nextTarget
    });

    callHAService('climate', 'set_temperature', { temperature: nextTarget }, { entity_id: climate.entity_id });
  };

  const handleTempSlider = (climate: ResolvedEntity, nextTemp: number) => {
    updateEntityState(climate.entity_id, climate.state, {
      ...climate.attributes,
      temperature: nextTemp,
      target_temp: nextTemp
    });
    callHAService('climate', 'set_temperature', { temperature: nextTemp }, { entity_id: climate.entity_id });
  };

  const handleHvacModeChange = (climate: ResolvedEntity, mode: string) => {
    updateEntityState(climate.entity_id, mode);
    callHAService('climate', 'set_hvac_mode', { hvac_mode: mode }, { entity_id: climate.entity_id });
  };

  const handleToggleClimate = (climate: ResolvedEntity) => {
    const isCurrentlyOff = climate.state === 'off' || climate.attributes?.hvac_action === 'off';
    const hvacModes: string[] = climate.attributes?.hvac_modes || ['heat', 'off'];
    const activeMode = hvacModes.find((m) => m !== 'off') || 'heat';
    const nextMode = isCurrentlyOff ? activeMode : 'off';
    
    updateEntityState(climate.entity_id, nextMode);
    callHAService('climate', 'set_hvac_mode', { hvac_mode: nextMode }, { entity_id: climate.entity_id });
  };

  const handleToggleLock = (lockEntity: ResolvedEntity) => {
    if (onToggleEntityLock) {
      onToggleEntityLock(lockEntity.entity_id);
    } else {
      const isCurrentlyLocked = lockEntity.state === 'locked';
      const service = isCurrentlyLocked ? 'unlock' : 'lock';
      const nextState = isCurrentlyLocked ? 'unlocked' : 'locked';

      updateEntityState(lockEntity.entity_id, nextState);
      callHAService('lock', service, {}, { entity_id: lockEntity.entity_id });
    }
  };

  const handleToggleLight = useCallback((light: ResolvedEntity) => {
    const isCurrentlyOn = light.state === 'on';
    const nextState = isCurrentlyOn ? 'off' : 'on';
    updateEntityState(light.entity_id, nextState);
    callHAService('light', isCurrentlyOn ? 'turn_off' : 'turn_on', {}, { entity_id: light.entity_id });
  }, [updateEntityState, callHAService]);

  const handleBrightnessChange = useCallback((light: ResolvedEntity, nextPct: number) => {
    const brightness255 = Math.round((nextPct / 100) * 255);
    const nextState = nextPct > 0 ? 'on' : 'off';

    updateEntityState(light.entity_id, nextState, {
      ...light.attributes,
      brightness: brightness255
    });

    if (nextPct > 0) {
      callHAService('light', 'turn_on', { brightness: brightness255 }, { entity_id: light.entity_id });
    } else {
      callHAService('light', 'turn_off', {}, { entity_id: light.entity_id });
    }
  }, [updateEntityState, callHAService]);

  const handleToggleSwitch = useCallback((sw: ResolvedEntity) => {
    const isCurrentlyOn = sw.state === 'on';
    const nextState = isCurrentlyOn ? 'off' : 'on';

    updateEntityState(sw.entity_id, nextState);
    callHAService(
      sw.domain === 'outlet' ? 'switch' : sw.domain,
      isCurrentlyOn ? 'turn_off' : 'turn_on',
      {},
      { entity_id: sw.entity_id }
    );
  }, [updateEntityState, callHAService]);

  const handleToggleFan = useCallback((fan: ResolvedEntity) => {
    const isCurrentlyOn = fan.state === 'on';
    const nextState = isCurrentlyOn ? 'off' : 'on';

    updateEntityState(fan.entity_id, nextState);
    callHAService('fan', isCurrentlyOn ? 'turn_off' : 'turn_on', {}, { entity_id: fan.entity_id });
  }, [updateEntityState, callHAService]);

  const handleToggleMediaPlay = (media: ResolvedEntity) => {
    const isPlaying = media.state === 'playing';
    const nextState = isPlaying ? 'paused' : 'playing';
    updateEntityState(media.entity_id, nextState);
    callHAService('media_player', isPlaying ? 'media_pause' : 'media_play', {}, { entity_id: media.entity_id });
  };

  const handleCoverCommand = (cover: ResolvedEntity, service: 'open_cover' | 'close_cover' | 'stop_cover') => {
    const nextState = service === 'open_cover' ? 'open' : service === 'close_cover' ? 'closed' : cover.state;
    updateEntityState(cover.entity_id, nextState);
    callHAService('cover', service, {}, { entity_id: cover.entity_id });
  };

  // Bulk Category Actions
  const handleToggleAllSwitches = () => {
    const shouldTurnOn = activeSwitchesCount === 0;
    const service = shouldTurnOn ? 'turn_on' : 'turn_off';
    const eids = enrichedSwitches.map((s) => s.entity_id);
    for (const eid of eids) updateEntityState(eid, shouldTurnOn ? 'on' : 'off');
    callHAService('switch', service, {}, { entity_id: eids });
  };

  const handleToggleAllFans = () => {
    const anyOn = enrichedFans.some((f) => f.state === 'on');
    const service = anyOn ? 'turn_off' : 'turn_on';
    const eids = enrichedFans.map((f) => f.entity_id);
    for (const eid of eids) updateEntityState(eid, anyOn ? 'off' : 'on');
    callHAService('fan', service, {}, { entity_id: eids });
  };

  const handlePauseAllMedia = () => {
    const eids = entities.mediaPlayers.map((m) => m.entity_id);
    for (const eid of eids) updateEntityState(eid, 'paused');
    callHAService('media_player', 'media_pause', {}, { entity_id: eids });
  };

  // Count items per domain for tabs
  const lightsCount = enrichedLights.length;
  const climateCount = enrichedClimates.length + enrichedFans.length;
  const switchesCount = enrichedSwitches.length + enrichedLocks.length + enrichedCovers.length;
  const mediaCount = entities.mediaPlayers.length + (enrichedVacuums?.length || 0) + (entities.cameras?.length || 0);
  const sensorsCount =
    motionSensors.length +
    hazardSensors.length +
    environmentalSensors.length +
    energySensors.length +
    unclaimedBatterySensors.length +
    contactSensors.length +
    generalSensors.length;

  const totalEntityCount =
    lightsCount +
    switchesCount +
    climateCount +
    mediaCount +
    sensorsCount;

  const domainTabs: SectionTabItem[] = [
    {
      id: 'all',
      label: 'All Devices',
      icon: SquaresFour,
      badge: totalEntityCount,
      color: '#3b82f6'
    },
    ...(lightsCount > 0
      ? [
          {
            id: 'lights',
            label: 'Lights',
            icon: Lightbulb,
            badge: activeLightsCount > 0 ? `${activeLightsCount} on` : lightsCount,
            badgeColor: activeLightsCount > 0 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold' : undefined,
            color: '#f59e0b'
          }
        ]
      : []),
    ...(climateCount > 0
      ? [
          {
            id: 'climate',
            label: 'Climate & Air',
            icon: Thermometer,
            badge: climateCount,
            color: '#06b6d4'
          }
        ]
      : []),
    ...(switchesCount > 0
      ? [
          {
            id: 'switches',
            label: 'Switches & Access',
            icon: Plug,
            badge: switchesCount,
            color: '#8b5cf6'
          }
        ]
      : []),
    ...(mediaCount > 0
      ? [
          {
            id: 'media',
            label: 'Media & Players',
            icon: SpeakerHigh,
            badge: mediaCount,
            color: '#ec4899'
          }
        ]
      : []),
    ...(sensorsCount > 0
      ? [
          {
            id: 'sensors',
            label: 'Sensors & Security',
            icon: Drop,
            badge: sensorsCount,
            color: '#10b981'
          }
        ]
      : [])
  ];
  return {
    activeBreakpoint,
    activeDomainTab,
    activeLayoutOverrides,
    activeLightsCount,
    activeMediaDrawerEntity,
    activeSwitchesCount,
    area,
    batterySpans,
    callHAService,
    climateAndFanSpans,
    climateCount,
    config,
    contactSensors,
    contactSpans,
    darkMode,
    defaultColSpan,
    defaultDesktopColSpan,
    defaultTabletColSpan,
    domainTabs,
    energySensors,
    energySpans,
    enrichedClimates,
    enrichedCovers,
    enrichedFans,
    enrichedLights,
    enrichedLocks,
    enrichedSwitches,
    enrichedVacuums,
    entities,
    environmentalSensors,
    environmentalSpans,
    generalSensors,
    generalSpans,
    getTileSpan,
    handleBrightnessChange,
    handleCoverCommand,
    handleHvacModeChange,
    handlePauseAllMedia,
    handleTempAdjust,
    handleTempSlider,
    handleToggleAllFans,
    handleToggleAllSwitches,
    handleToggleClimate,
    handleToggleFan,
    handleToggleLight,
    handleToggleLock,
    handleToggleMediaPlay,
    handleToggleSwitch,
    hazardSensors,
    hazardSpans,
    isEditMode,
    isFullWidth,
    layoutOverrides,
    lightSpans,
    lightsCount,
    mediaCount,
    mediaVacuumSpans,
    motionSensors,
    motionSpans,
    onToggleEntityLock,
    onToggleLights,
    onToggleLocks,
    openEntityDetails,
    sensorsCount,
    setActiveDomainTab,
    setActiveMediaDrawerEntity,
    sortedBatterySensors,
    sortedCameras,
    sortedClimates,
    sortedContactSensors,
    sortedCovers,
    sortedEnergySensors,
    sortedEnvironmentalSensors,
    sortedFans,
    sortedGeneralSensors,
    sortedHazardSensors,
    sortedLights,
    sortedLocks,
    sortedMediaPlayers,
    sortedMotionSensors,
    sortedSwitches,
    sortedVacuums,
    switchLockCoverSpans,
    switchesCount,
    tileLayoutMode,
    totalEntityCount,
    totalLightsCount,
    unclaimedBatterySensors,
    unlockedLocksCount,
    updateEntityState
  };
}

export type AreaDetailState = ReturnType<typeof useAreaDetailState>;
