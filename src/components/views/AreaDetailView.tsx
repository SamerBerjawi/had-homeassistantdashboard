/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dedicated Area Detail Drill-Down View
 * Categorizes entity sub-types into dedicated, clearly labeled sections:
 * - Lighting with section header toggle controls (All Off / All On)
 * - Climate & Air Quality with temperature sliders & mode selectors
 * - Media Players with click-to-open drawer
 * - Door Locks & Smart Access with section header (Lock All / Unlock All)
 * - Switches & Outlets with section header (All Off / All On)
 * - Window Covers & Blinds with section header (Open All / Close All)
 * - Contact & Entry Sensors (Doors & Windows with accurate battery indicators)
 * - Motion & Presence Sensors (with active radar pulse and battery telemetry)
 * - Battery & Device Health (Dedicated section showing accurate battery % and meters)
 * - Environmental & Air Quality Telemetry (Temp, Humidity, CO2, Lux - without battery confusion)
 * - Power & Energy Telemetry (Watts, kWh)
 * - Safety & Hazard Sensors (Smoke, Water Leaks)
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
  SlidersHorizontal,
  Sparkle,
  Power,
  Flame,
  Snowflake,
  Wind,
  Sun,
  Eye,
  Door,
  Warning,
  PersonSimpleWalk,
  Plus,
  Minus,
  Lock,
  LockOpen,
  BatteryCharging,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
  ArrowsClockwise,
  HouseLine,
  Gauge,
  Lightning,
  Clock,
  ShieldWarning,
  CheckCircle,
  Pause,
  Play
} from '@phosphor-icons/react';
import { AreaData } from '../../types/rooms';
import { ResolvedEntity } from '../../types';
import { formatEntityDisplayName } from '../../lib/utils';
import AreaMediaCard from '../rooms/AreaMediaCard';
import MediaOverviewDrawer from '../overview/modals/MediaOverviewDrawer';
import ViewEmptyState from '../ui/ViewEmptyState';

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

export default function AreaDetailView({
  area,
  darkMode = true,
  onBack,
  onToggleLights,
  onToggleLocks,
  onToggleEntityLock,
  onTurnOffAll,
  callHAService,
  updateEntityState
}: AreaDetailViewProps) {
  const {
    sensors,
    entities,
    activeLightsCount,
    totalLightsCount,
    activeSwitchesCount,
    unlockedLocksCount,
    totalLocksCount
  } = area;

  const [activeMediaDrawerEntity, setActiveMediaDrawerEntity] = useState<ResolvedEntity | null>(null);

  // =========================================================================
  // SUB-TYPE ENTITY CLASSIFICATION
  // =========================================================================
  const allSensors = useMemo(() => {
    return [...(entities.sensors || []), ...(entities.binarySensors || [])];
  }, [entities.sensors, entities.binarySensors]);

  // Helper to extract true battery percentage from direct attributes or paired device sensors
  const getEntityBattery = useMemo(() => {
    return (ent: ResolvedEntity): number | undefined => {
      // 1. Direct attribute on the entity
      const direct = ent.attributes?.battery_level ?? ent.attributes?.battery ?? ent.attributes?.battery_percentage;
      if (typeof direct === 'number' && !isNaN(direct) && direct >= 0 && direct <= 100) {
        return Math.round(direct);
      }
      if (typeof direct === 'string') {
        const p = parseFloat(direct);
        if (!isNaN(p) && p >= 0 && p <= 100) return Math.round(p);
      }

      // 2. Direct state if the entity itself is a battery sensor
      const dc = (ent.attributes?.device_class || '').toLowerCase();
      const id = ent.entity_id.toLowerCase();
      if (dc === 'battery' || id.includes('battery')) {
        const sVal = parseFloat(ent.state);
        if (!isNaN(sVal) && sVal >= 0 && sVal <= 100) return Math.round(sVal);
      }

      // 3. Paired battery sensor in the same room / device
      const baseId = ent.entity_id.split('.')[1] || '';
      const root = baseId.replace(/_(contact|motion|sensor|lock|light|switch|occupancy|opening|temp|humidity|temperature)$/i, '');
      if (root && root.length > 2) {
        const paired = allSensors.find((s) => {
          const sId = s.entity_id.toLowerCase();
          const isBatt = s.attributes?.device_class === 'battery' || sId.includes('battery');
          return isBatt && sId.includes(root.toLowerCase());
        });
        if (paired) {
          const val = parseFloat(paired.state);
          if (!isNaN(val) && val >= 0 && val <= 100) return Math.round(val);
        }
      }

      return undefined;
    };
  }, [allSensors]);

  // 1. Contact & Entry Sensors (Doors, Windows, Garage Doors, Gates)
  const contactSensors = useMemo(() => {
    return allSensors.filter((ent) => {
      const dc = (ent.attributes?.device_class || '').toLowerCase();
      const id = ent.entity_id.toLowerCase();
      if (dc === 'battery' || id.includes('battery')) return false;
      return dc === 'door' || dc === 'window' || dc === 'garage_door' || dc === 'opening' || id.includes('contact') || id.includes('door') || id.includes('window');
    });
  }, [allSensors]);

  // 2. Motion & Presence Sensors
  const motionSensors = useMemo(() => {
    return allSensors.filter((ent) => {
      const dc = (ent.attributes?.device_class || '').toLowerCase();
      const id = ent.entity_id.toLowerCase();
      if (dc === 'battery' || id.includes('battery')) return false;
      const isContact = dc === 'door' || dc === 'window' || dc === 'garage_door' || dc === 'opening' || id.includes('contact');
      if (isContact) return false;
      return dc === 'motion' || dc === 'occupancy' || dc === 'presence' || id.includes('motion') || id.includes('occupancy') || id.includes('presence');
    });
  }, [allSensors]);

  // 3. Safety & Hazard Sensors (Smoke, Water Moisture, Gas, Problem)
  const hazardSensors = useMemo(() => {
    return allSensors.filter((ent) => {
      const dc = (ent.attributes?.device_class || '').toLowerCase();
      const id = ent.entity_id.toLowerCase();
      if (dc === 'battery' || id.includes('battery')) return false;
      return dc === 'moisture' || dc === 'smoke' || dc === 'gas' || dc === 'carbon_monoxide' || dc === 'safety' || dc === 'problem' || id.includes('leak') || id.includes('smoke');
    });
  }, [allSensors]);

  // 4. Dedicated Battery Level & Device Health Sensors
  const batterySensors = useMemo(() => {
    return allSensors.filter((ent) => {
      const dc = (ent.attributes?.device_class || '').toLowerCase();
      const id = ent.entity_id.toLowerCase();
      return dc === 'battery' || id.includes('battery');
    });
  }, [allSensors]);

  // 5. Power & Energy Sensors
  const energySensors = useMemo(() => {
    return allSensors.filter((ent) => {
      const dc = (ent.attributes?.device_class || '').toLowerCase();
      const uom = (ent.attributes?.unit_of_measurement || '').toLowerCase();
      const id = ent.entity_id.toLowerCase();
      if (dc === 'battery' || id.includes('battery')) return false;
      return dc === 'power' || dc === 'energy' || dc === 'current' || dc === 'voltage' || uom === 'w' || uom === 'kw' || uom === 'kwh' || uom === 'v' || uom === 'a' || id.includes('power') || id.includes('energy');
    });
  }, [allSensors]);

  // 6. Environmental & Climate Sensors (Temp, Humidity, Lux, CO2, Air Quality)
  const environmentalSensors = useMemo(() => {
    return allSensors.filter((ent) => {
      const dc = (ent.attributes?.device_class || '').toLowerCase();
      const uom = (ent.attributes?.unit_of_measurement || '').toLowerCase();
      const id = ent.entity_id.toLowerCase();
      
      // Exclude battery, contact, motion, and hazard sensors
      if (dc === 'battery' || id.includes('battery')) return false;
      const isContact = dc === 'door' || dc === 'window' || dc === 'garage_door' || dc === 'opening' || id.includes('contact');
      if (isContact) return false;
      const isMotion = dc === 'motion' || dc === 'occupancy' || dc === 'presence' || id.includes('motion');
      if (isMotion) return false;
      const isHazard = dc === 'moisture' || dc === 'smoke' || dc === 'gas' || dc === 'carbon_monoxide' || id.includes('leak') || id.includes('smoke');
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
        id.includes('temp') ||
        id.includes('humidity') ||
        id.includes('lux') ||
        id.includes('co2')
      );
    });
  }, [allSensors]);

  // 7. Remaining General Diagnostics
  const classifiedIds = useMemo(() => {
    const set = new Set<string>();
    [
      ...contactSensors,
      ...motionSensors,
      ...hazardSensors,
      ...batterySensors,
      ...energySensors,
      ...environmentalSensors
    ].forEach((e) => set.add(e.entity_id));
    return set;
  }, [contactSensors, motionSensors, hazardSensors, batterySensors, energySensors, environmentalSensors]);

  const generalSensors = useMemo(() => {
    return allSensors.filter((ent) => !classifiedIds.has(ent.entity_id));
  }, [allSensors, classifiedIds]);

  // =========================================================================
  // CONTROL ACTION HANDLERS
  // =========================================================================

  // Climate target temp modifier
  const handleTempAdjust = (climate: ResolvedEntity, delta: number) => {
    const curTarget = climate.attributes?.temperature ?? climate.attributes?.target_temp ?? 21;
    const minTemp = climate.attributes?.min_temp ?? 10;
    const maxTemp = climate.attributes?.max_temp ?? 35;

    let nextTarget = parseFloat((curTarget + delta).toFixed(1));
    nextTarget = Math.max(minTemp, Math.min(maxTemp, nextTarget));

    updateEntityState(climate.entity_id, climate.state, {
      ...climate.attributes,
      temperature: nextTarget,
      target_temp: nextTarget
    });

    callHAService(
      'climate',
      'set_temperature',
      { temperature: nextTarget },
      { entity_id: climate.entity_id }
    );
  };

  const handleTempSlider = (climate: ResolvedEntity, nextTemp: number) => {
    updateEntityState(climate.entity_id, climate.state, {
      ...climate.attributes,
      temperature: nextTemp,
      target_temp: nextTemp
    });

    callHAService(
      'climate',
      'set_temperature',
      { temperature: nextTemp },
      { entity_id: climate.entity_id }
    );
  };

  const handleHvacModeChange = (climate: ResolvedEntity, mode: string) => {
    updateEntityState(climate.entity_id, mode);
    callHAService(
      'climate',
      'set_hvac_mode',
      { hvac_mode: mode },
      { entity_id: climate.entity_id }
    );
  };

  // Lock individual toggle
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

  // Master Lock / Unlock All in Room
  const handleBulkToggleLocks = () => {
    if (onToggleLocks) {
      onToggleLocks(area.areaId);
    } else {
      const targetState = unlockedLocksCount > 0 ? 'lock' : 'unlock';
      entities.locks.forEach((l) => {
        updateEntityState(l.entity_id, targetState === 'lock' ? 'locked' : 'unlocked');
        callHAService('lock', targetState, {}, { entity_id: l.entity_id });
      });
    }
  };

  // Light individual toggle & brightness
  const handleToggleLight = (light: ResolvedEntity) => {
    const isCurrentlyOn = light.state === 'on';
    const nextState = isCurrentlyOn ? 'off' : 'on';
    const currentBrightness = light.attributes?.brightness || 200;

    updateEntityState(light.entity_id, nextState, {
      ...light.attributes,
      brightness: nextState === 'on' ? currentBrightness : 0
    });

    callHAService(
      'light',
      isCurrentlyOn ? 'turn_off' : 'turn_on',
      nextState === 'on' ? { brightness: currentBrightness } : {},
      { entity_id: light.entity_id }
    );
  };

  const handleBrightnessChange = (light: ResolvedEntity, nextPct: number) => {
    const brightness255 = Math.round((nextPct / 100) * 255);
    const nextState = nextPct > 0 ? 'on' : 'off';

    updateEntityState(light.entity_id, nextState, {
      ...light.attributes,
      brightness: brightness255
    });

    if (nextPct > 0) {
      callHAService(
        'light',
        'turn_on',
        { brightness: brightness255 },
        { entity_id: light.entity_id }
      );
    } else {
      callHAService('light', 'turn_off', {}, { entity_id: light.entity_id });
    }
  };

  // Switch individual toggle
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

  // Bulk Switches Toggle in Room
  const handleBulkToggleSwitches = (turnOn: boolean) => {
    entities.switches.forEach((sw) => {
      updateEntityState(sw.entity_id, turnOn ? 'on' : 'off');
      callHAService(
        sw.domain === 'outlet' ? 'switch' : sw.domain,
        turnOn ? 'turn_on' : 'turn_off',
        {},
        { entity_id: sw.entity_id }
      );
    });
  };

  // Fan toggle & speed
  const handleToggleFan = (fan: ResolvedEntity) => {
    const isCurrentlyOn = fan.state === 'on';
    const nextState = isCurrentlyOn ? 'off' : 'on';

    updateEntityState(fan.entity_id, nextState);
    callHAService(
      'fan',
      isCurrentlyOn ? 'turn_off' : 'turn_on',
      {},
      { entity_id: fan.entity_id }
    );
  };

  const handleFanSpeed = (fan: ResolvedEntity, percentage: number) => {
    const nextState = percentage > 0 ? 'on' : 'off';
    updateEntityState(fan.entity_id, nextState, {
      ...fan.attributes,
      percentage
    });

    if (percentage > 0) {
      callHAService(
        'fan',
        'set_percentage',
        { percentage },
        { entity_id: fan.entity_id }
      );
    } else {
      callHAService('fan', 'turn_off', {}, { entity_id: fan.entity_id });
    }
  };

  // Window cover command
  const handleCoverCommand = (cover: ResolvedEntity, service: 'open_cover' | 'close_cover' | 'stop_cover') => {
    const nextState = service === 'open_cover' ? 'open' : service === 'close_cover' ? 'closed' : cover.state;
    updateEntityState(cover.entity_id, nextState);
    callHAService('cover', service, {}, { entity_id: cover.entity_id });
  };

  // Bulk Covers in Room
  const handleBulkCovers = (service: 'open_cover' | 'close_cover') => {
    entities.covers.forEach((c) => {
      updateEntityState(c.entity_id, service === 'open_cover' ? 'open' : 'closed');
      callHAService('cover', service, {}, { entity_id: c.entity_id });
    });
  };

  // Bulk Pause Media in Room
  const handleBulkPauseMedia = () => {
    entities.mediaPlayers.forEach((m) => {
      updateEntityState(m.entity_id, 'paused');
      callHAService('media_player', 'media_pause', {}, { entity_id: m.entity_id });
    });
  };

  // Check if room is empty
  const totalEntityCount =
    entities.lights.length +
    entities.switches.length +
    entities.climates.length +
    entities.mediaPlayers.length +
    entities.fans.length +
    entities.covers.length +
    entities.locks.length +
    allSensors.length;

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

  const activeMediaCount = entities.mediaPlayers.filter((m) => m.state === 'playing').length;
  const totalClimateFanCount = entities.climates.length + entities.fans.length;

  return (
    <div className="w-full flex-1 flex flex-col gap-6 animate-fadeIn pb-24 md:pb-8">
      {/* Master Category Grid Layout:
          - Desktop (lg/xl): 4 Columns
          - Tablet (md): 3 Columns
          - Mobile: 2 Columns
      */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5 items-start">
        
        {/* ========================================================================= */}
        {/* 1. LIGHTING SECTION (With Section Header Toggle Button) */}
        {/* ========================================================================= */}
        {entities.lights.length > 0 && (
          <div className="col-span-2 md:col-span-3 lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Lightbulb size={22} weight="duotone" className="text-amber-400 shrink-0" />
                <h3 className={`text-base sm:text-lg font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Lighting ({entities.lights.length})
                </h3>
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                  • {activeLightsCount} on
                </span>
              </div>

              {/* Master Lighting Toggle Button Next to Section Title */}
              <button
                type="button"
                onClick={() => onToggleLights(area.areaId, activeLightsCount === 0)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold backdrop-blur-md transition-all duration-200 cursor-pointer active:scale-95 flex items-center gap-1.5 border ${
                  activeLightsCount > 0
                    ? darkMode
                      ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-300'
                      : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800'
                    : darkMode
                    ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                }`}
              >
                <Power size={13} weight="bold" />
                <span>{activeLightsCount > 0 ? 'All Off' : 'All On'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3 items-start">
              {entities.lights.map((light) => {
                const isOn = light.state === 'on';
                const brightness = light.attributes?.brightness !== undefined ? Math.round((light.attributes.brightness / 255) * 100) : (isOn ? 100 : 0);
                const powerWatts = light.attributes?.power || light.powerWatts;
                const battery = getEntityBattery(light);

                return (
                  <div
                    key={light.entity_id}
                    className={`col-span-1 p-4 rounded-2xl backdrop-blur-xl border transition-all duration-300 flex flex-col justify-between gap-3 ${
                      darkMode
                        ? isOn
                          ? 'bg-slate-900/80 border-amber-500/30 shadow-md shadow-amber-500/5'
                          : 'bg-white/[0.04] border-white/10'
                        : isOn
                        ? 'bg-amber-50/80 border-amber-300 shadow-sm'
                        : 'bg-white/80 border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Lightbulb
                          size={24}
                          weight={isOn ? 'fill' : 'duotone'}
                          className={`shrink-0 transition-all duration-300 ${
                            isOn
                              ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.85)] scale-105'
                              : 'text-slate-400'
                          }`}
                        />
                        <div className="min-w-0">
                          <h5 className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {formatEntityDisplayName(light.name, area.name)}
                          </h5>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                            <span>{isOn ? `${brightness}%` : 'Off'}</span>
                            {powerWatts !== undefined && isOn && (
                              <span className="text-amber-400 font-medium">• {powerWatts}W</span>
                            )}
                            {battery !== undefined && (
                              <span className="flex items-center gap-0.5 text-slate-400">
                                • <BatteryMedium size={12} weight="bold" /> {battery}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleLight(light)}
                        className={`p-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-90 border ${
                          isOn
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                            : darkMode
                            ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400'
                            : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                        }`}
                      >
                        <Power size={15} weight="bold" />
                      </button>
                    </div>

                    {/* Brightness Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Sun size={11} weight="bold" /> Brightness
                        </span>
                        <span>{isOn ? `${brightness}%` : '0%'}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={isOn ? brightness : 0}
                        onChange={(e) => handleBrightnessChange(light, Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-700/40 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-400"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. CONTACT & ENTRY SENSORS (Doors, Windows, Gates with true battery) */}
        {/* ========================================================================= */}
        {contactSensors.length > 0 && (
          <div className="col-span-2 md:col-span-3 lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Door size={22} weight="duotone" className="text-amber-400 shrink-0" />
                <h3 className={`text-base sm:text-lg font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Contact & Entry Sensors ({contactSensors.length})
                </h3>
              </div>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                sensors.doorsOpenCount > 0 || sensors.windowsOpenCount > 0
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
              }`}>
                {sensors.doorsOpenCount + sensors.windowsOpenCount > 0
                  ? `${sensors.doorsOpenCount + sensors.windowsOpenCount} Open`
                  : 'All Closed'}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3 items-start">
              {contactSensors.map((cs) => {
                const isOpen = cs.state === 'on' || cs.state === 'open';
                const dc = (cs.attributes?.device_class || '').toLowerCase();
                const isWindow = dc === 'window' || cs.entity_id.includes('window');
                const battery = getEntityBattery(cs);

                return (
                  <div
                    key={cs.entity_id}
                    className={`col-span-1 p-4 rounded-2xl backdrop-blur-xl border transition-all flex items-center justify-between gap-3 ${
                      darkMode
                        ? isOpen
                          ? 'bg-amber-950/25 border-amber-500/40 text-amber-200 shadow-md shadow-amber-950/20'
                          : 'bg-white/[0.04] border-white/10 text-white'
                        : isOpen
                        ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-sm'
                        : 'bg-white/80 border-slate-200 text-slate-900 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isWindow ? (
                        <AppWindow
                          size={24}
                          weight="bold"
                          className={`shrink-0 ${
                            isOpen
                              ? 'text-amber-400 animate-pulse drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                              : 'text-slate-400'
                          }`}
                        />
                      ) : (
                        <Door
                          size={24}
                          weight="bold"
                          className={`shrink-0 ${
                            isOpen
                              ? 'text-amber-400 animate-pulse drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                              : 'text-slate-400'
                          }`}
                        />
                      )}
                      <div className="min-w-0">
                        <h5 className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {formatEntityDisplayName(cs.name, area.name)}
                        </h5>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate mt-0.5">
                          <span>{isWindow ? 'Window' : 'Door'}</span>
                          {battery !== undefined && (
                            <span className="flex items-center gap-0.5 text-slate-400">
                              • <BatteryMedium size={12} weight="bold" /> {battery}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border shrink-0 ${
                      isOpen
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                        : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10'
                    }`}>
                      {isOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. CLIMATE & AIR QUALITY SECTION */}
        {/* ========================================================================= */}
        {totalClimateFanCount > 0 && (
          <div className="col-span-2 md:col-span-3 lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className={`text-base sm:text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                <Thermometer size={22} weight="duotone" className="text-rose-400" />
                <span>Climate & HVAC ({totalClimateFanCount})</span>
              </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3 items-start">
              {/* Thermostats / AC / Heating Entities */}
              {entities.climates.map((climate) => {
                const currentTemp = climate.attributes?.current_temperature;
                const currentHumidity = climate.attributes?.current_humidity;
                const targetTemp = climate.attributes?.temperature ?? climate.attributes?.target_temp ?? 21;
                const minTemp = climate.attributes?.min_temp ?? 10;
                const maxTemp = climate.attributes?.max_temp ?? 35;
                const hvacModes: string[] = climate.attributes?.hvac_modes || ['heat', 'cool', 'auto', 'fan_only', 'off'];
                const currentHvacMode = climate.state || 'off';
                const isOff = currentHvacMode === 'off';
                const battery = getEntityBattery(climate);

                return (
                  <div
                    key={climate.entity_id}
                    className={`col-span-1 p-4.5 rounded-3xl backdrop-blur-xl border flex flex-col justify-between gap-3.5 transition-all ${
                      darkMode
                        ? !isOff
                          ? 'bg-slate-900/80 border-rose-500/30 shadow-md shadow-rose-950/20'
                          : 'bg-white/[0.04] border-white/10 text-white'
                        : !isOff
                        ? 'bg-rose-50/80 border-rose-200 text-slate-900 shadow-sm'
                        : 'bg-white/80 border-slate-200 text-slate-900 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {currentHvacMode === 'heat' || currentHvacMode === 'heating' ? (
                          <Flame size={24} weight="fill" className="text-rose-400 animate-pulse drop-shadow-[0_0_8px_rgba(244,63,94,0.7)] shrink-0" />
                        ) : currentHvacMode === 'cool' || currentHvacMode === 'cooling' ? (
                          <Snowflake size={24} weight="fill" className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.7)] shrink-0" />
                        ) : currentHvacMode === 'fan_only' ? (
                          <Fan size={24} weight="duotone" className="text-teal-400 animate-spin [animation-duration:2.5s] drop-shadow-[0_0_8px_rgba(45,212,191,0.6)] shrink-0" />
                        ) : (
                          <Thermometer size={24} weight="duotone" className="text-slate-400 shrink-0" />
                        )}

                        <div className="min-w-0">
                          <h4 className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {formatEntityDisplayName(climate.name, area.name)}
                          </h4>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                            {currentTemp !== undefined && (
                              <span className="font-semibold text-rose-400">
                                {currentTemp}°C
                              </span>
                            )}
                            {currentHumidity !== undefined && (
                              <span className="text-cyan-400">• {currentHumidity}%</span>
                            )}
                            <span>• {currentHvacMode}</span>
                            {battery !== undefined && (
                              <span className="flex items-center gap-0.5 text-slate-400">
                                • <BatteryMedium size={12} weight="bold" /> {battery}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stepper Controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTempAdjust(climate, -0.5)}
                          className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 dark:bg-white/5 dark:hover:bg-white/15 border border-white/10 flex items-center justify-center text-xs font-bold cursor-pointer active:scale-90 transition-all"
                        >
                          <Minus size={12} weight="bold" />
                        </button>
                        <div className="px-2 py-0.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-black text-sm min-w-[48px] text-center">
                          {targetTemp}°
                        </div>
                        <button
                          type="button"
                          onClick={() => handleTempAdjust(climate, 0.5)}
                          className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 dark:bg-white/5 dark:hover:bg-white/15 border border-white/10 flex items-center justify-center text-xs font-bold cursor-pointer active:scale-90 transition-all"
                        >
                          <Plus size={12} weight="bold" />
                        </button>
                      </div>
                    </div>

                    {/* Temperature Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                        <span>Target Temperature</span>
                        <span>{targetTemp}°C</span>
                      </div>
                      <input
                        type="range"
                        min={minTemp}
                        max={maxTemp}
                        step="0.5"
                        value={targetTemp}
                        onChange={(e) => handleTempSlider(climate, Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-700/40 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-rose-400"
                      />
                    </div>

                    {/* HVAC Mode Selector */}
                    <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-white/10 dark:border-white/10 border-slate-200/80">
                      {hvacModes.map((mode) => {
                        const isSelected = currentHvacMode === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => handleHvacModeChange(climate, mode)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? darkMode
                                  ? 'bg-white/20 border-white/40 text-white shadow-sm'
                                  : 'bg-slate-900 border-slate-900 text-white shadow-sm'
                                : darkMode
                                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400'
                                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                            }`}
                          >
                            <span className="capitalize">{mode === 'fan_only' ? 'Fan' : mode}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Fan Entities */}
              {entities.fans.map((fan) => {
                const isOn = fan.state === 'on';
                const speed = fan.attributes?.percentage || (isOn ? 100 : 0);

                return (
                  <div
                    key={fan.entity_id}
                    className={`col-span-1 p-4 rounded-2xl backdrop-blur-xl border transition-all flex flex-col justify-between gap-3 ${
                      darkMode
                        ? isOn
                          ? 'bg-teal-950/30 border-teal-500/30 shadow-md'
                          : 'bg-white/[0.04] border-white/10'
                        : isOn
                        ? 'bg-teal-50/80 border-teal-300 shadow-sm'
                        : 'bg-white/80 border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Fan
                          size={24}
                          weight="duotone"
                          className={`shrink-0 transition-transform ${
                            isOn
                              ? 'text-teal-400 animate-spin [animation-duration:1.5s] drop-shadow-[0_0_8px_rgba(45,212,191,0.7)]'
                              : 'text-slate-400'
                          }`}
                        />
                        <div className="min-w-0">
                          <h5 className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {formatEntityDisplayName(fan.name, area.name)}
                          </h5>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">
                            {isOn ? `${speed}% Speed` : 'Off'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleFan(fan)}
                        className={`p-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-90 border ${
                          isOn
                            ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-500/20'
                            : darkMode
                            ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400'
                            : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                        }`}
                      >
                        <Power size={15} weight="bold" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                        <span>Speed</span>
                        <span>{isOn ? `${speed}%` : '0%'}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={isOn ? speed : 0}
                        onChange={(e) => handleFanSpeed(fan, Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-700/40 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-teal-400"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. MEDIA PLAYERS (With Section Header Pause All) */}
        {/* ========================================================================= */}
        {entities.mediaPlayers.length > 0 && (
          <div className="col-span-2 md:col-span-3 lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <SpeakerHigh size={22} weight="duotone" className="text-cyan-400 shrink-0" />
                <h3 className={`text-base sm:text-lg font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Media Players ({entities.mediaPlayers.length})
                </h3>
              </div>

              {activeMediaCount > 0 && (
                <button
                  type="button"
                  onClick={handleBulkPauseMedia}
                  className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <Pause size={13} weight="bold" />
                  <span>Pause All</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3 items-start">
              {entities.mediaPlayers.map((media) => (
                <AreaMediaCard
                  key={media.entity_id}
                  media={media}
                  areaName={area.name}
                  darkMode={darkMode}
                  onOpenDrawer={(m) => setActiveMediaDrawerEntity(m)}
                  callHAService={callHAService}
                  updateEntityState={updateEntityState}
                />
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. DOOR LOCKS & ACCESS (With Section Header Lock All / Unlock All) */}
        {/* ========================================================================= */}
        {entities.locks.length > 0 && (
          <div className="col-span-2 md:col-span-3 lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Lock size={22} weight="duotone" className="text-emerald-400 shrink-0" />
                <h3 className={`text-base sm:text-lg font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Door Locks & Access ({entities.locks.length})
                </h3>
              </div>

              {/* Master Lock/Unlock Button Next to Section Title */}
              <button
                type="button"
                onClick={handleBulkToggleLocks}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold backdrop-blur-md transition-all duration-200 cursor-pointer active:scale-95 flex items-center gap-1.5 border ${
                  unlockedLocksCount > 0
                    ? darkMode
                      ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-300'
                      : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800'
                    : darkMode
                    ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-300'
                    : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
                }`}
              >
                {unlockedLocksCount > 0 ? (
                  <>
                    <Lock size={13} weight="fill" />
                    <span>Lock All</span>
                  </>
                ) : (
                  <>
                    <LockOpen size={13} weight="bold" />
                    <span>Unlock All</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3 items-start">
              {entities.locks.map((lock) => {
                const isLocked = lock.state === 'locked';
                const battery = getEntityBattery(lock);

                return (
                  <div
                    key={lock.entity_id}
                    className={`col-span-1 p-4 rounded-2xl backdrop-blur-xl border transition-all flex items-center justify-between gap-3 ${
                      darkMode
                        ? !isLocked
                          ? 'bg-amber-950/20 border-amber-500/35 shadow-md'
                          : 'bg-white/[0.04] border-white/10'
                        : !isLocked
                        ? 'bg-amber-50/80 border-amber-300 shadow-sm'
                        : 'bg-white/80 border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isLocked ? (
                        <Lock size={24} weight="fill" className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)] shrink-0" />
                      ) : (
                        <LockOpen size={24} weight="bold" className="text-amber-400 animate-pulse drop-shadow-[0_0_10px_rgba(251,191,36,0.8)] shrink-0" />
                      )}
                      <div className="min-w-0">
                        <h5 className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {formatEntityDisplayName(lock.name, area.name)}
                        </h5>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                          <span className={`font-semibold capitalize ${isLocked ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {lock.state || 'locked'}
                          </span>
                          {battery !== undefined && (
                            <span className="flex items-center gap-0.5 text-slate-400">
                              • <BatteryMedium size={12} weight="bold" /> {battery}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleLock(lock)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border flex items-center gap-1 shrink-0 ${
                        isLocked
                          ? darkMode
                            ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
                            : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                          : 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                      }`}
                    >
                      {isLocked ? (
                        <>
                          <LockOpen size={13} weight="bold" />
                          <span>Unlock</span>
                        </>
                      ) : (
                        <>
                          <Lock size={13} weight="fill" />
                          <span>Lock</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. SWITCHES & OUTLETS (With Section Header Toggle Controls) */}
        {/* ========================================================================= */}
        {entities.switches.length > 0 && (
          <div className="col-span-2 md:col-span-3 lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Plug size={22} weight="duotone" className="text-indigo-400 shrink-0" />
                <h3 className={`text-base sm:text-lg font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Switches & Outlets ({entities.switches.length})
                </h3>
              </div>

              {/* Master Switches Toggle */}
              <button
                type="button"
                onClick={() => handleBulkToggleSwitches(activeSwitchesCount === 0)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold backdrop-blur-md transition-all duration-200 cursor-pointer active:scale-95 flex items-center gap-1.5 border ${
                  activeSwitchesCount > 0
                    ? darkMode
                      ? 'bg-indigo-500/15 hover:bg-indigo-500/25 border-indigo-500/30 text-indigo-300'
                      : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-800'
                    : darkMode
                    ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                }`}
              >
                <Power size={13} weight="bold" />
                <span>{activeSwitchesCount > 0 ? 'All Off' : 'All On'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3 items-start">
              {entities.switches.map((sw) => {
                const isOn = sw.state === 'on';
                const powerWatts = sw.attributes?.current_power_w ?? sw.attributes?.power ?? sw.powerWatts;
                const battery = getEntityBattery(sw);

                return (
                  <div
                    key={sw.entity_id}
                    className={`col-span-1 p-4 rounded-2xl backdrop-blur-xl border transition-all flex items-center justify-between gap-3 ${
                      darkMode
                        ? isOn
                          ? 'bg-indigo-950/30 border-indigo-500/30 shadow-md'
                          : 'bg-white/[0.04] border-white/10'
                        : isOn
                        ? 'bg-indigo-50/80 border-indigo-300 shadow-sm'
                        : 'bg-white/80 border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Plug
                        size={24}
                        weight={isOn ? 'fill' : 'duotone'}
                        className={`shrink-0 transition-transform ${
                          isOn
                            ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.75)]'
                            : 'text-slate-400'
                        }`}
                      />
                      <div className="min-w-0">
                        <h5 className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {formatEntityDisplayName(sw.name, area.name)}
                        </h5>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                          <span>{isOn ? 'Active' : 'Off'}</span>
                          {powerWatts !== undefined && isOn && (
                            <span className="text-indigo-400 font-semibold">• {powerWatts}W</span>
                          )}
                          {battery !== undefined && (
                            <span className="flex items-center gap-0.5 text-slate-400">
                              • <BatteryMedium size={12} weight="bold" /> {battery}%
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleSwitch(sw)}
                      className={`p-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-90 border ${
                        isOn
                          ? 'bg-indigo-500 text-white border-indigo-400 shadow-md shadow-indigo-500/20'
                          : darkMode
                          ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400'
                          : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                      }`}
                    >
                      <Power size={15} weight="bold" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. MOTION & PRESENCE SENSORS (Dedicated Section) */}
        {/* ========================================================================= */}
        {motionSensors.length > 0 && (
          <div className="col-span-2 md:col-span-3 lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <PersonSimpleWalk size={22} weight="duotone" className="text-emerald-400 shrink-0" />
                <h3 className={`text-base sm:text-lg font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Motion & Presence ({motionSensors.length})
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3 items-start">
              {motionSensors.map((ms) => {
                const isActive = ms.state === 'on' || ms.state === 'detected';
                const battery = getEntityBattery(ms);

                return (
                  <div
                    key={ms.entity_id}
                    className={`col-span-1 p-3.5 rounded-2xl backdrop-blur-xl border flex items-center justify-between gap-2.5 transition-all ${
                      darkMode
                        ? isActive
                          ? 'bg-emerald-950/25 border-emerald-500/40 text-emerald-200 shadow-md shadow-emerald-950/20'
                          : 'bg-white/[0.04] border-white/10 text-white'
                        : isActive
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-sm'
                        : 'bg-white/80 border-slate-200 text-slate-900 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PersonSimpleWalk
                        size={22}
                        weight="bold"
                        className={`shrink-0 ${
                          isActive
                            ? 'text-emerald-400 animate-pulse drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                            : 'text-slate-400'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">
                          {formatEntityDisplayName(ms.name, area.name)}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate mt-0.5">
                          <span>{isActive ? 'Motion Detected' : 'Clear'}</span>
                          {battery !== undefined && (
                            <span className="flex items-center gap-0.5 text-slate-400">
                              • <BatteryMedium size={12} weight="bold" /> {battery}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border shrink-0 ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-100 dark:bg-white/10 text-slate-500 border-slate-200 dark:border-white/10'
                    }`}>
                      {isActive ? 'Active' : 'Idle'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 8. BATTERY & DEVICE HEALTH (DEDICATED SECTION - Accurate % and Meters) */}
        {/* ========================================================================= */}
        {batterySensors.length > 0 && (
          <div className="col-span-2 md:col-span-3 lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <BatteryFull size={22} weight="duotone" className="text-emerald-400 shrink-0" />
                <h3 className={`text-base sm:text-lg font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Battery & Device Health ({batterySensors.length})
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3 items-start">
              {batterySensors.map((bs) => {
                const val = parseFloat(bs.state);
                const batteryPct = !isNaN(val) ? Math.round(val) : getEntityBattery(bs) ?? 100;
                const isCritical = batteryPct < 20;
                const isLow = batteryPct >= 20 && batteryPct < 40;
                const isGood = batteryPct >= 40 && batteryPct < 80;
                const isFull = batteryPct >= 80;

                return (
                  <div
                    key={bs.entity_id}
                    className={`col-span-1 p-3.5 rounded-2xl backdrop-blur-xl border flex flex-col justify-between gap-2.5 transition-all ${
                      darkMode
                        ? isCritical
                          ? 'bg-rose-950/25 border-rose-500/40 text-rose-200'
                          : isLow
                          ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                          : 'bg-white/[0.04] border-white/10 text-white'
                        : isCritical
                        ? 'bg-rose-50 border-rose-300 text-rose-950 shadow-sm'
                        : isLow
                        ? 'bg-amber-50 border-amber-200 text-amber-900 shadow-sm'
                        : 'bg-white/80 border-slate-200 text-slate-900 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isFull ? (
                          <BatteryFull size={20} weight="fill" className="text-emerald-400 shrink-0" />
                        ) : isGood ? (
                          <BatteryMedium size={20} weight="duotone" className="text-emerald-400 shrink-0" />
                        ) : isLow ? (
                          <BatteryLow size={20} weight="duotone" className="text-amber-400 shrink-0" />
                        ) : (
                          <BatteryWarning size={20} weight="fill" className="text-rose-400 animate-pulse shrink-0" />
                        )}
                        <div className="min-w-0">
                          <h5 className={`text-xs font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {formatEntityDisplayName(bs.name.replace(/ battery$/i, '').replace(/ battery level$/i, '') || bs.name, area.name)}
                          </h5>
                          <p className="text-[10px] text-slate-500 truncate">
                            {isCritical ? 'Critical Low' : isLow ? 'Low Battery' : 'Healthy'}
                          </p>
                        </div>
                      </div>

                      <span className={`text-xs font-black font-mono shrink-0 ${
                        isCritical ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {batteryPct}%
                      </span>
                    </div>

                    {/* Visual Battery Fill Meter */}
                    <div className="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCritical
                            ? 'bg-rose-500'
                            : isLow
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, batteryPct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 9. ENVIRONMENTAL & AIR TELEMETRY (Temp, Humidity, Lux, CO2) */}
        {/* ========================================================================= */}
        {environmentalSensors.length > 0 && (
          <div className="col-span-2 md:col-span-3 lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Drop size={22} weight="duotone" className="text-sky-400 shrink-0" />
                <h3 className={`text-base sm:text-lg font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Environmental & Air Telemetry ({environmentalSensors.length})
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3 items-start">
              {environmentalSensors.map((sensor) => {
                const uom = sensor.attributes?.unit_of_measurement || '';
                const dc = (sensor.attributes?.device_class || '').toLowerCase();
                const isTemp = dc === 'temperature' || uom.includes('°');
                const isHum = dc === 'humidity' || (uom === '%' && (sensor.name.toLowerCase().includes('humidity') || sensor.entity_id.includes('humidity')));
                const isLux = dc === 'illuminance' || uom === 'lx' || uom === 'lux';
                const battery = getEntityBattery(sensor);

                return (
                  <div
                    key={sensor.entity_id}
                    className={`col-span-1 p-3.5 rounded-2xl backdrop-blur-xl border flex items-center justify-between gap-2.5 transition-all ${
                      darkMode ? 'bg-white/[0.04] border-white/10 text-white' : 'bg-white/80 border-slate-200 text-slate-900 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isTemp ? (
                        <Thermometer size={22} weight="duotone" className="text-rose-400 shrink-0" />
                      ) : isHum ? (
                        <Drop size={22} weight="duotone" className="text-sky-400 shrink-0" />
                      ) : isLux ? (
                        <Sun size={22} weight="duotone" className="text-amber-400 shrink-0" />
                      ) : (
                        <Wind size={22} weight="duotone" className="text-teal-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate">
                          {formatEntityDisplayName(sensor.name, area.name)}
                        </div>
                        <div className="text-sm font-black truncate mt-0.5">
                          {sensor.state} {uom}
                        </div>
                      </div>
                    </div>

                    {battery !== undefined && (
                      <span className="flex items-center gap-0.5 text-[11px] font-bold text-slate-400 shrink-0">
                        <BatteryMedium size={12} weight="bold" />
                        <span>{battery}%</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 10. POWER & ENERGY TELEMETRY (Watts, kWh) */}
        {/* ========================================================================= */}
        {energySensors.length > 0 && (
          <div className="col-span-2 md:col-span-3 lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Lightning size={22} weight="duotone" className="text-emerald-400 shrink-0" />
                <h3 className={`text-base sm:text-lg font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Power & Energy Telemetry ({energySensors.length})
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3 items-start">
              {energySensors.map((sensor) => {
                const uom = sensor.attributes?.unit_of_measurement || 'W';
                return (
                  <div
                    key={sensor.entity_id}
                    className={`col-span-1 p-3.5 rounded-2xl backdrop-blur-xl border flex items-center justify-between gap-2.5 transition-all ${
                      darkMode ? 'bg-white/[0.04] border-white/10 text-white' : 'bg-white/80 border-slate-200 text-slate-900 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Lightning size={22} weight="duotone" className="text-emerald-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate">
                          {formatEntityDisplayName(sensor.name, area.name)}
                        </div>
                        <div className="text-sm font-black font-mono truncate mt-0.5">
                          {sensor.state} {uom}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 11. SAFETY & HAZARD SENSORS (Smoke, Moisture, Water Leaks) */}
        {/* ========================================================================= */}
        {hazardSensors.length > 0 && (
          <div className="col-span-2 md:col-span-3 lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldWarning size={22} weight="duotone" className="text-rose-400 shrink-0" />
                <h3 className={`text-base sm:text-lg font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Safety & Hazard Alerts ({hazardSensors.length})
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3 items-start">
              {hazardSensors.map((hs) => {
                const isProblem = hs.state === 'on' || hs.state === 'detected' || hs.state === 'problem';
                const dc = (hs.attributes?.device_class || '').toLowerCase();
                const isSmoke = dc === 'smoke' || dc === 'gas';
                const battery = getEntityBattery(hs);

                return (
                  <div
                    key={hs.entity_id}
                    className={`col-span-1 p-3.5 rounded-2xl backdrop-blur-xl border flex items-center justify-between gap-2.5 transition-all ${
                      darkMode
                        ? isProblem
                          ? 'bg-rose-950/40 border-rose-500 text-rose-200 shadow-md shadow-rose-950/40'
                          : 'bg-white/[0.04] border-white/10 text-white'
                        : isProblem
                        ? 'bg-rose-100 border-rose-400 text-rose-950 shadow-sm'
                        : 'bg-white/80 border-slate-200 text-slate-900 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isSmoke ? (
                        <Flame
                          size={22}
                          weight="fill"
                          className={`shrink-0 ${isProblem ? 'text-rose-400 animate-pulse drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'text-slate-400'}`}
                        />
                      ) : (
                        <Warning
                          size={22}
                          weight="fill"
                          className={`shrink-0 ${isProblem ? 'text-rose-400 animate-pulse drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'text-slate-400'}`}
                        />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">
                          {formatEntityDisplayName(hs.name, area.name)}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 capitalize truncate mt-0.5">
                          <span>{isProblem ? 'Hazard Active' : 'Normal'}</span>
                          {battery !== undefined && (
                            <span className="flex items-center gap-0.5 text-slate-400">
                              • <BatteryMedium size={12} weight="bold" /> {battery}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border shrink-0 ${
                      isProblem
                        ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40 animate-pulse'
                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    }`}>
                      {isProblem ? 'Hazard' : 'Safe'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 12. WINDOW COVERS & BLINDS (With Section Header Open All / Close All) */}
        {/* ========================================================================= */}
        {entities.covers.length > 0 && (
          <div className="col-span-2 md:col-span-3 lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <AppWindow size={22} weight="duotone" className="text-purple-400 shrink-0" />
                <h3 className={`text-base sm:text-lg font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Window Covers & Blinds ({entities.covers.length})
                </h3>
              </div>

              {/* Master Covers Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleBulkCovers('open_cover')}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all cursor-pointer active:scale-95"
                >
                  Open All
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkCovers('close_cover')}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all cursor-pointer active:scale-95"
                >
                  Close All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3 items-start">
              {entities.covers.map((cover) => (
                <div
                  key={cover.entity_id}
                  className={`col-span-1 p-4 rounded-2xl backdrop-blur-xl border transition-all flex items-center justify-between gap-3 ${
                    darkMode ? 'bg-white/[0.04] border-white/10' : 'bg-white/80 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AppWindow size={24} weight="duotone" className="text-purple-400 shrink-0" />
                    <div className="min-w-0">
                      <h5 className="text-sm font-bold truncate">{formatEntityDisplayName(cover.name, area.name)}</h5>
                      <p className="text-xs text-slate-600 dark:text-slate-400 capitalize">{cover.state || 'closed'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCoverCommand(cover, 'open_cover')}
                      className="px-2 py-1 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer active:scale-95"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCoverCommand(cover, 'stop_cover')}
                      className="px-2 py-1 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer active:scale-95"
                    >
                      Stop
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCoverCommand(cover, 'close_cover')}
                      className="px-2 py-1 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer active:scale-95"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 13. GENERAL TELEMETRY & OTHER SENSORS */}
        {/* ========================================================================= */}
        {generalSensors.length > 0 && (
          <div className="col-span-2 md:col-span-3 lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Gauge size={22} weight="duotone" className="text-indigo-400 shrink-0" />
                <h3 className={`text-base sm:text-lg font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  General Diagnostics ({generalSensors.length})
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3 items-start">
              {generalSensors.map((sensor) => {
                const uom = sensor.attributes?.unit_of_measurement || '';
                return (
                  <div
                    key={sensor.entity_id}
                    className={`col-span-1 p-3.5 rounded-2xl backdrop-blur-xl border flex items-center justify-between gap-2.5 transition-all ${
                      darkMode ? 'bg-white/[0.04] border-white/10 text-white' : 'bg-white/80 border-slate-200 text-slate-900 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Eye size={20} weight="duotone" className="text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate">
                          {formatEntityDisplayName(sensor.name, area.name)}
                        </div>
                        <div className="text-xs font-bold truncate mt-0.5">
                          {sensor.state} {uom}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

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
