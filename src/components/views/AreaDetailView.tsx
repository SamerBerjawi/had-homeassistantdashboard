/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dedicated Area Detail Drill-Down View
 * Categorized device sections with category titles, bulk master actions,
 * granular sensor sub-grouping (Entry, Motion, Environmental, Safety, Energy, Battery),
 * automatic companion battery sensor pairing & deduplication, and Phosphor battery icons.
 */

import React, { useState, useMemo } from 'react';
import {
  Lightbulb,
  Plug,
  Thermometer,
  Drop,
  SpeakerHigh,
  Fan,
  AppWindow,
  Power,
  Door,
  PersonSimpleWalk,
  Lock,
  LockOpen,
  BatteryMedium,
  HouseLine,
  Lightning,
  Broom,
  VideoCamera,
  SquaresFour,
  Warning,
  Gear,
  CaretRight
} from '@phosphor-icons/react';
import { AreaData } from '../../types/rooms';
import { ResolvedEntity } from '../../types';
import { formatEntityDisplayName, formatRelativeTime } from '../../lib/utils';
import { useEntityPopup } from '../../contexts/EntityPopupContext';
import MediaOverviewDrawer from '../overview/modals/MediaOverviewDrawer';
import ViewEmptyState from '../ui/ViewEmptyState';
import VirtualGrid from '../layout/VirtualGrid';
import GridTile from '../layout/GridTile';
import AdaptiveSectionTabs, { SectionTabItem } from '../common/AdaptiveSectionTabs';
import { TelemetryLine } from '../common/TelemetryBadge';

// Domain Tiles
import SwitchTile from '../tiles/SwitchTile';
import LightTile from '../tiles/LightTile';
import ClimateTile from '../tiles/ClimateTile';
import MediaPlayerTile from '../tiles/MediaPlayerTile';
import SensorTile from '../tiles/SensorTile';
import CompactTile from '../tiles/CompactTile';
import WideTile from '../tiles/WideTile';

import { detectLightCapabilities } from '../../services/lightClassification';
import { detectLockCapabilities } from '../../services/lockClassification';
import { detectVacuumCapabilities } from '../../services/vacuumClassification';
import { detectSensorCapabilities } from '../../services/sensorClassification';

interface AreaDetailViewProps {
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

type DomainTab = 'all' | 'lights' | 'climate' | 'switches' | 'media' | 'sensors';

export default function AreaDetailView({
  area,
  darkMode = true,
  onToggleLights,
  onToggleLocks,
  onToggleEntityLock,
  callHAService,
  updateEntityState
}: AreaDetailViewProps) {
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

  const handleToggleLight = (light: ResolvedEntity) => {
    const isCurrentlyOn = light.state === 'on';
    const nextState = isCurrentlyOn ? 'off' : 'on';
    updateEntityState(light.entity_id, nextState);
    callHAService('light', isCurrentlyOn ? 'turn_off' : 'turn_on', {}, { entity_id: light.entity_id });
  };

  const handleBrightnessChange = (light: ResolvedEntity, nextPct: number) => {
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
  };

  const handleToggleSwitch = (sw: ResolvedEntity) => {
    const isCurrentlyOn = sw.state === 'on';
    const nextState = isCurrentlyOn ? 'off' : 'on';

    updateEntityState(sw.entity_id, nextState);
    callHAService(
      sw.domain === 'outlet' ? 'switch' : sw.domain,
      isCurrentlyOn ? 'turn_off' : 'turn_on',
      {},
      { entity_id: sw.entity_id }
    );
  };

  const handleToggleFan = (fan: ResolvedEntity) => {
    const isCurrentlyOn = fan.state === 'on';
    const nextState = isCurrentlyOn ? 'off' : 'on';

    updateEntityState(fan.entity_id, nextState);
    callHAService('fan', isCurrentlyOn ? 'turn_off' : 'turn_on', {}, { entity_id: fan.entity_id });
  };

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

  if (totalEntityCount === 0) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center pb-24 md:pb-8">
        <ViewEmptyState
          icon={HouseLine}
          title={`No Devices in ${area.name}`}
          badgeText="Empty Room"
          description={`No smart devices, lights, sensors, or switches are currently assigned to ${area.name}. Assign entities to this area in Home Assistant.`}
          configPath={`Settings → Areas & Zones → Areas → ${area.name}`}
          darkMode={darkMode}
        />
      </div>
    );
  }

  const domainTabs: SectionTabItem[] = [
    {
      id: 'all',
      label: 'All Devices',
      icon: SquaresFour,
      badge: totalEntityCount
    },
    ...(lightsCount > 0
      ? [
          {
            id: 'lights',
            label: 'Lights',
            icon: Lightbulb,
            badge: activeLightsCount > 0 ? `${activeLightsCount} on` : lightsCount,
            badgeColor: activeLightsCount > 0 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold' : undefined
          }
        ]
      : []),
    ...(climateCount > 0
      ? [
          {
            id: 'climate',
            label: 'Climate & Air',
            icon: Thermometer,
            badge: climateCount
          }
        ]
      : []),
    ...(switchesCount > 0
      ? [
          {
            id: 'switches',
            label: 'Switches & Access',
            icon: Plug,
            badge: switchesCount
          }
        ]
      : []),
    ...(mediaCount > 0
      ? [
          {
            id: 'media',
            label: 'Media & Players',
            icon: SpeakerHigh,
            badge: mediaCount
          }
        ]
      : []),
    ...(sensorsCount > 0
      ? [
          {
            id: 'sensors',
            label: 'Sensors & Security',
            icon: Drop,
            badge: sensorsCount
          }
        ]
      : [])
  ];

  return (
    <div className="w-full flex-1 flex flex-col gap-6 animate-fadeIn pb-24 md:pb-8">
      {/* Top Floating Filter Bar (No grey box) */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-1 sm:static sm:mx-0 sm:px-0 sm:py-0 backdrop-blur-md">
        <AdaptiveSectionTabs
          tabs={domainTabs}
          activeTab={activeDomainTab}
          onChange={(tab) => setActiveDomainTab(tab as DomainTab)}
          darkMode={darkMode}
        />
      </div>

      {/* 1. LIGHTING CATEGORY */}
      {(activeDomainTab === 'all' || activeDomainTab === 'lights') && enrichedLights.length > 0 && (
        <section className="flex flex-col gap-3.5">
          {/* Category Title & Bulk Action Button */}
          <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Lightbulb size={20} weight="duotone" className="text-amber-500 dark:text-amber-400" />
              <h3 className={`text-base font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Lighting & Ambience
              </h3>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                ({activeLightsCount > 0 ? `${activeLightsCount}/${totalLightsCount} on` : `${totalLightsCount}`})
              </span>
            </div>

            <button
              type="button"
              onClick={() => onToggleLights(area.areaId, activeLightsCount === 0)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 border ${
                activeLightsCount > 0
                  ? darkMode
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                    : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300 shadow-xs'
                  : darkMode
                  ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
              }`}
            >
              <Power size={14} weight="bold" />
              <span>{activeLightsCount > 0 ? 'All Off' : 'All On'}</span>
            </button>
          </div>

          <VirtualGrid>
            {enrichedLights.map((light) => {
              const isUnavailable = light.state === 'unavailable' || light.state === 'unknown';
              const caps = detectLightCapabilities(light);
              const isDimmable = caps.supportsBrightness;

              return (
                <GridTile
                  key={light.entity_id}
                  id={light.entity_id}
                  colSpan={2}
                  rowSpan={1}
                  tabletColSpan={3}
                  desktopColSpan={3}
                  isUnavailable={isUnavailable}
                  onLongPress={() => openEntityDetails(light.entity_id)}
                >
                  <LightTile
                    entity={light}
                    areaName={area.name}
                    darkMode={darkMode}
                    onToggle={handleToggleLight}
                    onBrightnessChange={handleBrightnessChange}
                    onIconClick={() => openEntityDetails(light.entity_id)}
                    onContextMenu={() => openEntityDetails(light.entity_id)}
                  />
                </GridTile>
              );
            })}
          </VirtualGrid>
        </section>
      )}

      {/* 2. CLIMATE & FANS CATEGORY */}
      {(activeDomainTab === 'all' || activeDomainTab === 'climate') && (enrichedClimates.length > 0 || enrichedFans.length > 0) && (
        <section className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Thermometer size={20} weight="duotone" className="text-rose-500 dark:text-rose-400" />
              <h3 className={`text-base font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Climate & Air Comfort
              </h3>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                ({enrichedClimates.length + enrichedFans.length})
              </span>
            </div>

            {enrichedFans.length > 0 && (
              <button
                type="button"
                onClick={handleToggleAllFans}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 border ${
                  darkMode
                    ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                }`}
              >
                <Fan size={14} weight="bold" />
                <span>Toggle Fans</span>
              </button>
            )}
          </div>

          <VirtualGrid>
            {enrichedClimates.map((climate) => {
              const isUnavailable = climate.state === 'unavailable' || climate.state === 'unknown';
              return (
                <GridTile
                  key={climate.entity_id}
                  id={climate.entity_id}
                  colSpan={2}
                  rowSpan={2}
                  tabletColSpan={3}
                  desktopColSpan={3}
                  isUnavailable={isUnavailable}
                  onLongPress={() => openEntityDetails(climate.entity_id)}
                >
                  <ClimateTile
                    entity={climate}
                    areaName={area.name}
                    darkMode={darkMode}
                    onTempAdjust={handleTempAdjust}
                    onTempSlider={handleTempSlider}
                    onModeChange={handleHvacModeChange}
                    onToggle={handleToggleClimate}
                    onClick={() => openEntityDetails(climate.entity_id)}
                    onContextMenu={() => openEntityDetails(climate.entity_id)}
                  />
                </GridTile>
              );
            })}

            {enrichedFans.map((fan) => {
              const isUnavailable = fan.state === 'unavailable' || fan.state === 'unknown';
              const isOn = fan.state === 'on';
              const speed = fan.attributes?.percentage;
              const rawPower = fan.attributes?.current_power_w ?? fan.attributes?.power;
              const rawBattery = fan.attributes?.battery_level ?? fan.attributes?.battery;
              const lastChanged = formatRelativeTime(fan.last_changed || fan.last_updated);
              
              const subtitle = (
                <TelemetryLine
                  items={[
                    isOn ? (speed ? `${speed}%` : 'Fan Active') : 'Off',
                    rawPower && isOn ? { text: `${Math.round(rawPower)}W`, isPower: true } : null,
                    rawBattery !== undefined ? { isBattery: true, batteryLevel: Math.round(rawBattery) } : null,
                    lastChanged || null
                  ]}
                />
              );

              return (
                <GridTile
                  key={fan.entity_id}
                  id={fan.entity_id}
                  colSpan={2}
                  rowSpan={1}
                  tabletColSpan={3}
                  desktopColSpan={3}
                  isUnavailable={isUnavailable}
                  onLongPress={() => openEntityDetails(fan.entity_id)}
                >
                  <CompactTile
                    darkMode={darkMode}
                    title={formatEntityDisplayName(fan.name, area.name)}
                    subtitle={subtitle}
                    isActive={isOn}
                    accentColor="#14b8a6"
                    activeBorderColor="border-teal-400/50"
                    onIconClick={() => handleToggleFan(fan)}
                    icon={
                      <Fan
                        size={22}
                        weight={isOn ? 'fill' : 'duotone'}
                        className={isOn ? 'text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.85)] animate-spin' : 'text-slate-400'}
                      />
                    }
                    actionButton={
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          openEntityDetails(fan.entity_id);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                        title="Open Device Details"
                      >
                        <CaretRight size={15} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    }
                    onClick={() => openEntityDetails(fan.entity_id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      openEntityDetails(fan.entity_id);
                    }}
                  />
                </GridTile>
              );
            })}
          </VirtualGrid>
        </section>
      )}

      {/* 3. SWITCHES, LOCKS & COVERS CATEGORY */}
      {(activeDomainTab === 'all' || activeDomainTab === 'switches') && (enrichedSwitches.length > 0 || enrichedLocks.length > 0 || enrichedCovers.length > 0) && (
        <section className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Plug size={20} weight="duotone" className="text-indigo-500 dark:text-indigo-400" />
              <h3 className={`text-base font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Switches, Outlets & Access
              </h3>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                ({enrichedSwitches.length + enrichedLocks.length + enrichedCovers.length})
              </span>
            </div>

            <div className="flex items-center gap-2">
              {enrichedSwitches.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleAllSwitches}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 border ${
                    darkMode
                      ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                  }`}
                >
                  <Power size={14} weight="bold" />
                  <span>{activeSwitchesCount > 0 ? 'All Off' : 'All On'}</span>
                </button>
              )}
              {enrichedLocks.length > 0 && onToggleLocks && (
                <button
                  type="button"
                  onClick={() => onToggleLocks(area.areaId)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 border ${
                    unlockedLocksCount > 0
                      ? darkMode
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-amber-100 text-amber-950 border-amber-300 shadow-xs'
                      : darkMode
                      ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                  }`}
                >
                  <Lock size={14} weight="bold" />
                  <span>{unlockedLocksCount > 0 ? 'Lock All' : 'Unlock All'}</span>
                </button>
              )}
            </div>
          </div>

          <VirtualGrid>
            {enrichedSwitches.map((sw) => {
              const isUnavailable = sw.state === 'unavailable' || sw.state === 'unknown';
              return (
                <GridTile
                  key={sw.entity_id}
                  id={sw.entity_id}
                  colSpan={2}
                  rowSpan={1}
                  tabletColSpan={3}
                  desktopColSpan={3}
                  isUnavailable={isUnavailable}
                  onLongPress={() => openEntityDetails(sw.entity_id)}
                >
                  <SwitchTile
                    entity={sw}
                    areaName={area.name}
                    darkMode={darkMode}
                    onToggle={handleToggleSwitch}
                    onIconClick={() => openEntityDetails(sw.entity_id)}
                    onContextMenu={() => openEntityDetails(sw.entity_id)}
                  />
                </GridTile>
              );
            })}

            {enrichedLocks.map((lock) => {
              const isUnavailable = lock.state === 'unavailable' || lock.state === 'unknown';
              const caps = detectLockCapabilities(lock);
              const isLocked = caps.isLocked;
              const rawBattery = lock.attributes?.battery_level ?? lock.attributes?.battery;
              const lastChanged = formatRelativeTime(lock.last_changed || lock.last_updated);
              
              const subtitle = (
                <TelemetryLine
                  items={[
                    isLocked ? 'Locked' : 'Unlocked',
                    rawBattery !== undefined ? { isBattery: true, batteryLevel: Math.round(rawBattery) } : null,
                    lastChanged || null
                  ]}
                />
              );

              return (
                <GridTile
                  key={lock.entity_id}
                  id={lock.entity_id}
                  colSpan={2}
                  rowSpan={1}
                  tabletColSpan={3}
                  desktopColSpan={3}
                  isUnavailable={isUnavailable}
                  onLongPress={() => openEntityDetails(lock.entity_id)}
                >
                  <CompactTile
                    darkMode={darkMode}
                    title={formatEntityDisplayName(lock.name, area.name)}
                    subtitle={subtitle}
                    isActive={!isLocked}
                    accentColor={isLocked ? '#10b981' : '#f59e0b'}
                    activeBorderColor={isLocked ? 'border-emerald-500/40' : 'border-amber-400/50'}
                    onIconClick={() => openEntityDetails(lock.entity_id)}
                    icon={
                      isLocked ? (
                        <Lock size={22} weight="fill" className="text-emerald-500 dark:text-emerald-400" />
                      ) : (
                        <LockOpen size={22} weight="bold" className="text-amber-500 dark:text-amber-400 animate-pulse" />
                      )
                    }
                    actionButton={
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleLock(lock);
                        }}
                        className={`h-9 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1 shrink-0 ${
                          isLocked
                            ? darkMode
                              ? 'bg-white/10 text-slate-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                            : 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        }`}
                      >
                        {isLocked ? 'Unlock' : 'Lock'}
                      </button>
                    }
                    onClick={() => handleToggleLock(lock)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      openEntityDetails(lock.entity_id);
                    }}
                  />
                </GridTile>
              );
            })}

            {enrichedCovers.map((cover) => {
              const isUnavailable = cover.state === 'unavailable' || cover.state === 'unknown';
              const pos = cover.attributes?.current_position;
              const rawBattery = cover.attributes?.battery_level ?? cover.attributes?.battery;
              const lastChanged = formatRelativeTime(cover.last_changed || cover.last_updated);
              
              const subtitle = (
                <TelemetryLine
                  items={[
                    pos !== undefined ? `${pos}% Open` : (cover.state || 'Closed'),
                    rawBattery !== undefined ? { isBattery: true, batteryLevel: Math.round(rawBattery) } : null,
                    lastChanged || null
                  ]}
                />
              );

              return (
                <GridTile
                  key={cover.entity_id}
                  id={cover.entity_id}
                  colSpan={2}
                  rowSpan={1}
                  tabletColSpan={3}
                  desktopColSpan={3}
                  isUnavailable={isUnavailable}
                  onLongPress={() => openEntityDetails(cover.entity_id)}
                >
                  <CompactTile
                    darkMode={darkMode}
                    title={formatEntityDisplayName(cover.name, area.name)}
                    subtitle={subtitle}
                    onIconClick={() => openEntityDetails(cover.entity_id)}
                    icon={<AppWindow size={22} weight="duotone" className="text-purple-500 dark:text-purple-400" />}
                    actionButton={
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleCoverCommand(cover, 'open_cover')}
                          className={`h-8 px-2.5 rounded-lg text-xs font-bold cursor-pointer active:scale-95 ${
                            darkMode ? 'bg-white/10 hover:bg-white/20 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                          }`}
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCoverCommand(cover, 'close_cover')}
                          className={`h-8 px-2.5 rounded-lg text-xs font-bold cursor-pointer active:scale-95 ${
                            darkMode ? 'bg-white/10 hover:bg-white/20 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                          }`}
                        >
                          Close
                        </button>
                      </div>
                    }
                    onContextMenu={(e) => {
                      e.preventDefault();
                      openEntityDetails(cover.entity_id);
                    }}
                  />
                </GridTile>
              );
            })}
          </VirtualGrid>
        </section>
      )}

      {/* 4. MEDIA & PLAYERS CATEGORY */}
      {(activeDomainTab === 'all' || activeDomainTab === 'media') && (entities.mediaPlayers.length > 0 || (enrichedVacuums?.length || 0) > 0 || (entities.cameras?.length || 0) > 0) && (
        <section className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <SpeakerHigh size={20} weight="duotone" className="text-cyan-500 dark:text-cyan-400" />
              <h3 className={`text-base font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Media & Entertainment
              </h3>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                ({entities.mediaPlayers.length + (enrichedVacuums?.length || 0) + (entities.cameras?.length || 0)})
              </span>
            </div>

            {entities.mediaPlayers.length > 0 && (
              <button
                type="button"
                onClick={handlePauseAllMedia}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border ${
                  darkMode
                    ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                }`}
              >
                Pause All
              </button>
            )}
          </div>

          <VirtualGrid>
            {entities.mediaPlayers.map((media) => {
              const isPlaying = media.state === 'playing' || media.state === 'paused';
              const isUnavailable = media.state === 'unavailable' || media.state === 'unknown';

              return (
                <GridTile
                  key={media.entity_id}
                  id={media.entity_id}
                  colSpan={isPlaying ? 4 : 2}
                  rowSpan={isPlaying ? 2 : 1}
                  tabletColSpan={isPlaying ? 6 : 3}
                  desktopColSpan={isPlaying ? 6 : 3}
                  isUnavailable={isUnavailable}
                  onLongPress={() => setActiveMediaDrawerEntity(media)}
                >
                  <MediaPlayerTile
                    entity={media}
                    areaName={area.name}
                    darkMode={darkMode}
                    onPlayPause={handleToggleMediaPlay}
                    onOpenDrawer={(m) => setActiveMediaDrawerEntity(m)}
                    onIconClick={() => setActiveMediaDrawerEntity(media)}
                  />
                </GridTile>
              );
            })}

            {(enrichedVacuums || []).map((vac) => {
              const caps = detectVacuumCapabilities(vac);
              const isUnavailable = vac.state === 'unavailable' || vac.state === 'unknown';
              const bat = vac.attributes?.battery_level;
              const lastChanged = formatRelativeTime(vac.last_changed || vac.last_updated);
              
              const subtitle = (
                <TelemetryLine
                  items={[
                    caps.isCleaning ? 'Cleaning' : 'Docked',
                    bat !== undefined ? { isBattery: true, batteryLevel: Math.round(bat) } : null,
                    lastChanged || null
                  ]}
                />
              );

              return (
                <GridTile
                  key={vac.entity_id}
                  id={vac.entity_id}
                  colSpan={2}
                  rowSpan={1}
                  tabletColSpan={3}
                  desktopColSpan={3}
                  isUnavailable={isUnavailable}
                  onLongPress={() => openEntityDetails(vac.entity_id)}
                >
                  <CompactTile
                    darkMode={darkMode}
                    title={formatEntityDisplayName(vac.name, area.name)}
                    subtitle={subtitle}
                    isActive={caps.isCleaning}
                    accentColor="#0d9488"
                    activeBorderColor="border-teal-400/50"
                    onIconClick={() => openEntityDetails(vac.entity_id)}
                    icon={<Broom size={22} weight={caps.isCleaning ? 'fill' : 'duotone'} className={caps.isCleaning ? 'text-teal-400' : 'text-slate-400'} />}
                    badge={
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                        caps.isCleaning
                          ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300'
                          : darkMode
                          ? 'bg-white/10 text-slate-300'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {caps.isCleaning ? 'Cleaning' : 'Docked'}
                      </span>
                    }
                    onContextMenu={(e) => {
                      e.preventDefault();
                      openEntityDetails(vac.entity_id);
                    }}
                  />
                </GridTile>
              );
            })}

            {(entities.cameras || []).map((cam) => {
              const isUnavailable = cam.state === 'unavailable' || cam.state === 'unknown';
              const lastChanged = formatRelativeTime(cam.last_changed || cam.last_updated);
              const subtitle = (
                <TelemetryLine
                  items={[
                    'Live Video Feed',
                    lastChanged || null
                  ]}
                />
              );

              return (
                <GridTile
                  key={cam.entity_id}
                  id={cam.entity_id}
                  colSpan={4}
                  rowSpan={2}
                  tabletColSpan={6}
                  desktopColSpan={6}
                  isUnavailable={isUnavailable}
                  onLongPress={() => openEntityDetails(cam.entity_id)}
                >
                  <WideTile
                    darkMode={darkMode}
                    title={formatEntityDisplayName(cam.name, area.name)}
                    subtitle={subtitle}
                    icon={<VideoCamera size={24} weight="duotone" className="text-blue-500 dark:text-blue-400" />}
                    headerAction={<span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-500/20 text-blue-700 dark:text-blue-300">Live</span>}
                    onIconClick={() => openEntityDetails(cam.entity_id)}
                  >
                    <div className="w-full h-24 rounded-2xl bg-black/10 dark:bg-black/40 border border-slate-200 dark:border-white/10 flex items-center justify-center text-xs font-mono text-slate-600 dark:text-slate-400">
                      Tap icon to open live stream
                    </div>
                  </WideTile>
                </GridTile>
              );
            })}
          </VirtualGrid>
        </section>
      )}

      {/* 5. GRANULAR SENSORS BY TYPE */}
      {(activeDomainTab === 'all' || activeDomainTab === 'sensors') && sensorsCount > 0 && (
        <div className="flex flex-col gap-6">
          {/* Main Category Header */}
          <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Drop size={20} weight="duotone" className="text-teal-500 dark:text-teal-400" />
              <h3 className={`text-base font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Sensors & Telemetry
              </h3>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                ({sensorsCount} Total)
              </span>
            </div>
          </div>

          {/* 5A. Entry & Perimeter (Doors & Windows) */}
          {contactSensors.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                <Door size={16} weight="duotone" className="text-amber-500" />
                <span>Entry & Openings ({contactSensors.length})</span>
              </div>
              <VirtualGrid>
                {contactSensors.map((cs) => {
                  const isUnavailable = cs.state === 'unavailable' || cs.state === 'unknown';
                  return (
                    <GridTile
                      key={cs.entity_id}
                      id={cs.entity_id}
                      colSpan={2}
                      rowSpan={1}
                      tabletColSpan={3}
                      desktopColSpan={3}
                      isUnavailable={isUnavailable}
                      onLongPress={() => openEntityDetails(cs.entity_id)}
                    >
                      <SensorTile
                        entity={cs}
                        areaName={area.name}
                        darkMode={darkMode}
                        onIconClick={() => openEntityDetails(cs.entity_id)}
                        onContextMenu={() => openEntityDetails(cs.entity_id)}
                      />
                    </GridTile>
                  );
                })}
              </VirtualGrid>
            </div>
          )}

          {/* 5B. Motion & Presence */}
          {motionSensors.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                <PersonSimpleWalk size={16} weight="duotone" className="text-emerald-500" />
                <span>Motion & Occupancy ({motionSensors.length})</span>
              </div>
              <VirtualGrid>
                {motionSensors.map((ms) => {
                  const isUnavailable = ms.state === 'unavailable' || ms.state === 'unknown';
                  return (
                    <GridTile
                      key={ms.entity_id}
                      id={ms.entity_id}
                      colSpan={2}
                      rowSpan={1}
                      tabletColSpan={3}
                      desktopColSpan={3}
                      isUnavailable={isUnavailable}
                      onLongPress={() => openEntityDetails(ms.entity_id)}
                    >
                      <SensorTile
                        entity={ms}
                        areaName={area.name}
                        darkMode={darkMode}
                        onIconClick={() => openEntityDetails(ms.entity_id)}
                        onContextMenu={() => openEntityDetails(ms.entity_id)}
                      />
                    </GridTile>
                  );
                })}
              </VirtualGrid>
            </div>
          )}

          {/* 5C. Environmental & Climate */}
          {environmentalSensors.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                <Thermometer size={16} weight="duotone" className="text-rose-500" />
                <span>Environmental & Air Quality ({environmentalSensors.length})</span>
              </div>
              <VirtualGrid>
                {environmentalSensors.map((sensor) => {
                  const isUnavailable = sensor.state === 'unavailable' || sensor.state === 'unknown';
                  const caps = detectSensorCapabilities(sensor);
                  const isSpark = caps.kind === 'temperature' || caps.kind === 'humidity';

                  return (
                    <GridTile
                      key={sensor.entity_id}
                      id={sensor.entity_id}
                      colSpan={2}
                      rowSpan={1}
                      tabletColSpan={3}
                      desktopColSpan={3}
                      isUnavailable={isUnavailable}
                      onLongPress={() => openEntityDetails(sensor.entity_id)}
                    >
                      <SensorTile
                        entity={sensor}
                        areaName={area.name}
                        darkMode={darkMode}
                        onIconClick={() => openEntityDetails(sensor.entity_id)}
                        onContextMenu={() => openEntityDetails(sensor.entity_id)}
                      />
                    </GridTile>
                  );
                })}
              </VirtualGrid>
            </div>
          )}

          {/* 5D. Safety & Hazard */}
          {hazardSensors.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-500 dark:text-rose-400">
                <Warning size={16} weight="fill" />
                <span>Safety & Hazards ({hazardSensors.length})</span>
              </div>
              <VirtualGrid>
                {hazardSensors.map((hs) => {
                  const isUnavailable = hs.state === 'unavailable' || hs.state === 'unknown';
                  return (
                    <GridTile
                      key={hs.entity_id}
                      id={hs.entity_id}
                      colSpan={2}
                      rowSpan={1}
                      tabletColSpan={3}
                      desktopColSpan={3}
                      isUnavailable={isUnavailable}
                      onLongPress={() => openEntityDetails(hs.entity_id)}
                    >
                      <SensorTile
                        entity={hs}
                        areaName={area.name}
                        darkMode={darkMode}
                        onIconClick={() => openEntityDetails(hs.entity_id)}
                        onContextMenu={() => openEntityDetails(hs.entity_id)}
                      />
                    </GridTile>
                  );
                })}
              </VirtualGrid>
            </div>
          )}

          {/* 5E. Power & Energy */}
          {energySensors.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                <Lightning size={16} weight="duotone" className="text-emerald-500" />
                <span>Power & Energy ({energySensors.length})</span>
              </div>
              <VirtualGrid>
                {energySensors.map((sensor) => {
                  const isUnavailable = sensor.state === 'unavailable' || sensor.state === 'unknown';
                  return (
                    <GridTile
                      key={sensor.entity_id}
                      id={sensor.entity_id}
                      colSpan={2}
                      rowSpan={1}
                      tabletColSpan={3}
                      desktopColSpan={3}
                      isUnavailable={isUnavailable}
                      onLongPress={() => openEntityDetails(sensor.entity_id)}
                    >
                      <SensorTile
                        entity={sensor}
                        areaName={area.name}
                        darkMode={darkMode}
                        onIconClick={() => openEntityDetails(sensor.entity_id)}
                        onContextMenu={() => openEntityDetails(sensor.entity_id)}
                      />
                    </GridTile>
                  );
                })}
              </VirtualGrid>
            </div>
          )}

          {/* 5F. Unclaimed Standalone Battery Sensors (only if any remain unclaimed) */}
          {unclaimedBatterySensors.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                <BatteryMedium size={16} weight="duotone" className="text-amber-500" />
                <span>Standalone Batteries ({unclaimedBatterySensors.length})</span>
              </div>
              <VirtualGrid>
                {unclaimedBatterySensors.map((bs) => {
                  const isUnavailable = bs.state === 'unavailable' || bs.state === 'unknown';
                  return (
                    <GridTile
                      key={bs.entity_id}
                      id={bs.entity_id}
                      colSpan={2}
                      rowSpan={1}
                      tabletColSpan={3}
                      desktopColSpan={3}
                      isUnavailable={isUnavailable}
                      onLongPress={() => openEntityDetails(bs.entity_id)}
                    >
                      <SensorTile
                        entity={bs}
                        areaName={area.name}
                        darkMode={darkMode}
                        onIconClick={() => openEntityDetails(bs.entity_id)}
                        onContextMenu={() => openEntityDetails(bs.entity_id)}
                      />
                    </GridTile>
                  );
                })}
              </VirtualGrid>
            </div>
          )}

          {/* 5G. General Diagnostics */}
          {generalSensors.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                <Gear size={16} weight="duotone" className="text-slate-500" />
                <span>Diagnostics & Status ({generalSensors.length})</span>
              </div>
              <VirtualGrid>
                {generalSensors.map((sensor) => {
                  const isUnavailable = sensor.state === 'unavailable' || sensor.state === 'unknown';
                  return (
                    <GridTile
                      key={sensor.entity_id}
                      id={sensor.entity_id}
                      colSpan={2}
                      rowSpan={1}
                      tabletColSpan={3}
                      desktopColSpan={3}
                      isUnavailable={isUnavailable}
                      onLongPress={() => openEntityDetails(sensor.entity_id)}
                    >
                      <SensorTile
                        entity={sensor}
                        areaName={area.name}
                        darkMode={darkMode}
                        onIconClick={() => openEntityDetails(sensor.entity_id)}
                        onContextMenu={() => openEntityDetails(sensor.entity_id)}
                      />
                    </GridTile>
                  );
                })}
              </VirtualGrid>
            </div>
          )}
        </div>
      )}

      {/* Media Player Sidebar Drawer */}
      {activeMediaDrawerEntity && (
        <MediaOverviewDrawer
          isOpen={Boolean(activeMediaDrawerEntity)}
          onClose={() => setActiveMediaDrawerEntity(null)}
          mediaPlayers={entities.mediaPlayers}
          activeEntity={activeMediaDrawerEntity}
          darkMode={darkMode}
          onUpdateEntity={updateEntityState}
        />
      )}
    </div>
  );
}
