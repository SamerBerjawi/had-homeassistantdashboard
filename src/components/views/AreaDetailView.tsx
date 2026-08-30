/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dedicated Area Detail Drill-Down View grouping entities by domain:
 * - Unified "Climate & Air Quality" section with single Thermometer icon
 * - Media Players spanning 2 columns with click-to-open sidebar drawer
 * - Strict Responsive Grid System: 4 cols on desktop, 3 on tablet, 2 on mobile
 */

import React, { useState } from 'react';
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
  BatteryMedium,
  ArrowsClockwise,
  HouseLine,
  Gauge,
  Lightning,
  Clock,
  ShieldWarning
} from '@phosphor-icons/react';
import { AreaData } from '../../types/rooms';
import { ResolvedEntity } from '../../types';
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
    unlockedLocksCount,
    totalLocksCount
  } = area;

  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [activeMediaDrawerEntity, setActiveMediaDrawerEntity] = useState<ResolvedEntity | null>(null);

  // Climate target temp modifier for individual climate entity
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

  // Lock toggle handler
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
      nextState === 'on' ? 'turn_on' : 'turn_off',
      {},
      { entity_id: light.entity_id }
    );
  };

  const handleBrightnessChange = (light: ResolvedEntity, brightnessPct: number) => {
    const byteVal = Math.round((brightnessPct / 100) * 255);
    const nextState = brightnessPct > 0 ? 'on' : 'off';

    updateEntityState(light.entity_id, nextState, {
      ...light.attributes,
      brightness: byteVal
    });

    callHAService(
      'light',
      'turn_on',
      { brightness: byteVal },
      { entity_id: light.entity_id }
    );
  };

  // Switch toggle
  const handleToggleSwitch = (sw: ResolvedEntity) => {
    const isCurrentlyOn = sw.state === 'on';
    const nextState = isCurrentlyOn ? 'off' : 'on';

    updateEntityState(sw.entity_id, nextState);
    callHAService(
      'switch',
      nextState === 'on' ? 'turn_on' : 'turn_off',
      {},
      { entity_id: sw.entity_id }
    );
  };

  // Fan control
  const handleToggleFan = (fan: ResolvedEntity) => {
    const isCurrentlyOn = fan.state === 'on';
    const nextState = isCurrentlyOn ? 'off' : 'on';

    updateEntityState(fan.entity_id, nextState);
    callHAService(
      'fan',
      nextState === 'on' ? 'turn_on' : 'turn_off',
      {},
      { entity_id: fan.entity_id }
    );
  };

  const handleFanPercentage = (fan: ResolvedEntity, percentage: number) => {
    updateEntityState(fan.entity_id, percentage > 0 ? 'on' : 'off', {
      ...fan.attributes,
      percentage
    });

    callHAService(
      'fan',
      'set_percentage',
      { percentage },
      { entity_id: fan.entity_id }
    );
  };

  const handleFanSpeed = (fan: ResolvedEntity, percentage: number) => {
    handleFanPercentage(fan, percentage);
  };

  const handleFanOscillate = (fan: ResolvedEntity) => {
    const isOscillating = Boolean(fan.attributes?.oscillating);
    updateEntityState(fan.entity_id, fan.state, {
      ...fan.attributes,
      oscillating: !isOscillating
    });

    callHAService(
      'fan',
      'oscillate',
      { oscillating: !isOscillating },
      { entity_id: fan.entity_id }
    );
  };

  // Cover control
  const handleCoverCommand = (cover: ResolvedEntity, command: 'open_cover' | 'close_cover' | 'stop_cover') => {
    const nextState = command === 'open_cover' ? 'open' : command === 'close_cover' ? 'closed' : 'stopped';
    updateEntityState(cover.entity_id, nextState, {
      ...cover.attributes,
      current_position: command === 'open_cover' ? 100 : command === 'close_cover' ? 0 : 50
    });

    callHAService('cover', command, {}, { entity_id: cover.entity_id });
  };

  // Scene trigger
  const handleTriggerScene = (scene: ResolvedEntity) => {
    setSelectedScene(scene.entity_id);
    callHAService('scene', 'turn_on', {}, { entity_id: scene.entity_id });
    setTimeout(() => {
      setSelectedScene(null);
    }, 1500);
  };

  // Helper to determine sensor icon
  const getSensorIcon = (sensor: ResolvedEntity) => {
    const dc = (sensor.attributes?.device_class || '').toLowerCase();
    const uom = (sensor.attributes?.unit_of_measurement || '').toLowerCase();
    const id = sensor.entity_id.toLowerCase();

    if (dc === 'temperature' || uom.includes('°c') || uom.includes('°f') || id.includes('temp')) return Thermometer;
    if (dc === 'humidity' || uom === '%' || id.includes('humidity')) return Drop;
    if (dc === 'illuminance' || uom.includes('lx') || uom.includes('lux')) return Sun;
    if (dc === 'power' || dc === 'energy' || uom.includes('w') || uom.includes('kwh')) return Lightning;
    if (dc === 'pressure' || uom.includes('hpa') || uom.includes('bar')) return Gauge;
    if (dc === 'battery' || (uom === '%' && id.includes('battery'))) return BatteryMedium;
    if (dc === 'carbon_dioxide' || dc === 'co2' || dc === 'air_quality') return Wind;
    return Eye;
  };

  const totalClimateFanCount = entities.climates.length + entities.fans.length;
  const totalEntitiesCount = Object.values(entities).reduce(
    (acc, list) => acc + (Array.isArray(list) ? list.length : 0),
    0
  );

  if (totalEntitiesCount === 0) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center">
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

  return (
    <div className="w-full flex-1 flex flex-col gap-6 animate-fadeIn pb-12">
      {/* Master Category Grid Layout:
          - Desktop (lg/xl): 4 Columns
          - Tablet (md): 3 Columns
          - Mobile: 2 Columns
          - Sub-sections span 2 cols on desktop/mobile and 3 on tablet
          - Tiles inside are 1 column wide (with media cards spanning 2 cols)
      */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5 items-start">
        {/* A. Unified Climate & Air Quality Section (Thermostats + ACs + Fans merged) */}
        {totalClimateFanCount > 0 && (
          <div className="col-span-2 md:col-span-3 lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className={`text-base sm:text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                <Thermometer size={22} weight="duotone" className="text-rose-400" />
                <span>Climate & Air Quality ({totalClimateFanCount})</span>
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
                    {/* Header with clean unboxed icon */}
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
                            {climate.name}
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

              {/* Fan & Ventilation Entities */}
              {entities.fans.map((fan) => {
                const isOn = fan.state === 'on';
                const speed = fan.attributes?.percentage || (isOn ? 100 : 0);
                const isOscillating = Boolean(fan.attributes?.oscillating);

                return (
                  <div
                    key={fan.entity_id}
                    className={`col-span-1 p-4.5 rounded-3xl backdrop-blur-xl border transition-all flex flex-col justify-between gap-3.5 ${
                      darkMode
                        ? isOn
                          ? 'bg-teal-950/20 border-teal-500/30 shadow-md'
                          : 'bg-white/[0.04] border-white/10 text-white'
                        : isOn
                        ? 'bg-teal-50/80 border-teal-200 text-slate-900 shadow-sm'
                        : 'bg-white/80 border-slate-200 text-slate-900 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Fan
                          size={24}
                          weight={isOn ? 'fill' : 'duotone'}
                          className={`shrink-0 transition-transform ${
                            isOn
                              ? 'text-teal-400 animate-spin [animation-duration:2.5s] drop-shadow-[0_0_10px_rgba(45,212,191,0.65)]'
                              : 'text-slate-400'
                          }`}
                        />
                        <div className="min-w-0">
                          <h5 className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {fan.name}
                          </h5>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                            {isOn ? `${speed}% Speed` : 'Off'}
                            {isOscillating && ' • Oscillating'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleFanOscillate(fan)}
                          title="Toggle Oscillation"
                          className={`p-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-90 border ${
                            isOscillating
                              ? 'bg-teal-500/25 border-teal-500/40 text-teal-300'
                              : 'bg-white/5 border-white/10 text-slate-400'
                          }`}
                        >
                          <ArrowsClockwise size={15} weight="bold" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleFan(fan)}
                          className={`p-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-90 border ${
                            isOn
                              ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-500/20'
                              : 'bg-white/5 border-white/10 text-slate-400'
                          }`}
                        >
                          <Power size={15} weight="bold" />
                        </button>
                      </div>
                    </div>

                    {/* Speed Slider */}
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

        {/* B. Lighting Section */}
        {entities.lights.length > 0 && (
          <div className="col-span-2 md:col-span-3 lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className={`text-base sm:text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                <Lightbulb size={22} weight="duotone" className="text-amber-400" />
                <span>Lighting ({entities.lights.length})</span>
              </h3>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {activeLightsCount} active
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3 items-start">
              {entities.lights.map((light) => {
                const isOn = light.state === 'on';
                const brightness = light.attributes?.brightness !== undefined ? Math.round((light.attributes.brightness / 255) * 100) : (isOn ? 100 : 0);
                const powerWatts = light.attributes?.power || light.powerWatts;

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
                            {light.name}
                          </h5>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <span>{isOn ? `${brightness}%` : 'Off'}</span>
                            {powerWatts !== undefined && isOn && (
                              <span className="text-amber-400 font-medium">• {powerWatts}W</span>
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

        {/* C. Media Players (2 columns wide in desktop & mobile, 3 in tablet) */}
        {entities.mediaPlayers.length > 0 && (
          <div className="col-span-2 md:col-span-3 lg:col-span-2 flex flex-col gap-3">
            <h3 className={`text-base sm:text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <SpeakerHigh size={22} weight="duotone" className="text-cyan-400" />
              <span>Media Players ({entities.mediaPlayers.length})</span>
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3 items-start">
              {entities.mediaPlayers.map((media) => (
                <AreaMediaCard
                  key={media.entity_id}
                  media={media}
                  darkMode={darkMode}
                  onOpenDrawer={(m) => setActiveMediaDrawerEntity(m)}
                  callHAService={callHAService}
                  updateEntityState={updateEntityState}
                />
              ))}
            </div>
          </div>
        )}

        {/* D. Door Locks & Smart Access Control Section */}
        {entities.locks.length > 0 && (
          <div className="col-span-2 md:col-span-3 lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className={`text-base sm:text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                <Lock size={22} weight="duotone" className="text-emerald-400" />
                <span>Door Locks & Access ({entities.locks.length})</span>
              </h3>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {unlockedLocksCount > 0 ? `${unlockedLocksCount} unlocked` : 'All locked'}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3 items-start">
              {entities.locks.map((lock) => {
                const isLocked = lock.state === 'locked';
                const battery = lock.attributes?.battery_level ?? lock.attributes?.battery;

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
                          {lock.name}
                        </h5>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
                          <span className={`font-semibold capitalize ${isLocked ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {lock.state || 'locked'}
                          </span>
                          {battery !== undefined && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <BatteryMedium size={12} weight="bold" />
                                <span>{battery}%</span>
                              </span>
                            </>
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

        {/* E. Switches & Plugs */}
        {entities.switches.length > 0 && (
          <div className="col-span-2 md:col-span-3 lg:col-span-2 flex flex-col gap-3">
            <h3 className={`text-base sm:text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <Plug size={22} weight="duotone" className="text-indigo-400" />
              <span>Switches & Plugs ({entities.switches.length})</span>
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3 items-start">
              {entities.switches.map((sw) => {
                const isOn = sw.state === 'on';
                const powerWatts = sw.attributes?.current_power_w ?? sw.attributes?.power ?? sw.powerWatts;

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
                          {sw.name}
                        </h5>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
                          <span>{isOn ? 'Active' : 'Off'}</span>
                          {powerWatts !== undefined && isOn && (
                            <span className="text-indigo-400 font-semibold">• {powerWatts}W</span>
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

        {/* F. Sensors & Telemetry (100% Real data from room entities) */}
        {(entities.sensors.length > 0 || entities.binarySensors.length > 0) && (
          <div className="col-span-2 md:col-span-3 lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className={`text-base sm:text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                <Eye size={22} weight="duotone" className="text-indigo-400" />
                <span>Sensors & Telemetry ({entities.sensors.length + entities.binarySensors.length})</span>
              </h3>
              <span className="text-xs text-slate-600 dark:text-slate-400">Live HA Ingestion</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3 items-start">
              {/* Real Numeric Sensors */}
              {entities.sensors.map((sensor) => {
                const SensorIcon = getSensorIcon(sensor);
                const uom = sensor.attributes?.unit_of_measurement || '';
                const stateVal = sensor.state;

                return (
                  <div
                    key={sensor.entity_id}
                    className={`col-span-1 p-3.5 rounded-2xl backdrop-blur-xl border flex items-center gap-2.5 transition-all ${
                      darkMode
                        ? 'bg-white/[0.04] border-white/10 text-white'
                        : 'bg-white/80 border-slate-200 text-slate-900 shadow-sm'
                    }`}
                  >
                    <SensorIcon size={22} weight="duotone" className="text-indigo-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate">
                        {sensor.name}
                      </div>
                      <div className="text-sm font-black truncate mt-0.5">
                        {stateVal} {uom}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Real Binary Contact/Motion/Leak Sensors */}
              {entities.binarySensors.map((bs) => {
                const isActive = bs.state === 'on' || bs.state === 'detected' || bs.state === 'open' || bs.state === 'problem';
                const dc = (bs.attributes?.device_class || '').toLowerCase();
                const isLeak = dc === 'moisture' || bs.entity_id.includes('leak');
                const isSmoke = dc === 'smoke' || dc === 'gas';
                const isDoor = dc === 'door' || dc === 'garage_door';
                const isWindow = dc === 'window';
                const isMotion = dc === 'motion' || dc === 'occupancy' || dc === 'presence';

                return (
                  <div
                    key={bs.entity_id}
                    className={`col-span-1 p-3.5 rounded-2xl backdrop-blur-xl border flex items-center gap-2.5 transition-all ${
                      darkMode
                        ? isActive
                          ? isLeak || isSmoke
                            ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                            : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                          : 'bg-white/[0.04] border-white/10 text-white'
                        : isActive
                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                        : 'bg-white/80 border-slate-200 text-slate-900 shadow-sm'
                    }`}
                  >
                    {isSmoke ? (
                      <Flame size={22} weight="fill" className={`shrink-0 ${isActive ? 'text-rose-400 animate-pulse drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'text-slate-400'}`} />
                    ) : isLeak ? (
                      <Warning size={22} weight="fill" className={`shrink-0 ${isActive ? 'text-rose-400 animate-pulse drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'text-slate-400'}`} />
                    ) : isDoor ? (
                      <Door size={22} weight="bold" className={`shrink-0 ${isActive ? 'text-amber-400 animate-pulse drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'text-slate-400'}`} />
                    ) : isWindow ? (
                      <AppWindow size={22} weight="bold" className={`shrink-0 ${isActive ? 'text-amber-400 animate-pulse drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'text-slate-400'}`} />
                    ) : isMotion ? (
                      <PersonSimpleWalk size={22} weight="bold" className={`shrink-0 ${isActive ? 'text-emerald-400 animate-pulse drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'text-slate-400'}`} />
                    ) : (
                      <Eye size={22} weight="bold" className={`shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate">
                        {bs.name}
                      </div>
                      <div className="text-xs font-bold capitalize mt-0.5 truncate">
                        {bs.state}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* G. Window Covers & Blinds */}
        {entities.covers.length > 0 && (
          <div className="col-span-2 md:col-span-3 lg:col-span-2 flex flex-col gap-3">
            <h3 className={`text-base sm:text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <AppWindow size={22} weight="duotone" className="text-purple-400" />
              <span>Window Covers & Blinds ({entities.covers.length})</span>
            </h3>

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
                      <h5 className="text-sm font-bold truncate">{cover.name}</h5>
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

        {/* H. Automations & Mood Scenes */}
        {entities.scenes && entities.scenes.length > 0 && (
          <div className="col-span-2 md:col-span-3 lg:col-span-2 flex flex-col gap-3">
            <h3 className={`text-base sm:text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <Sparkle size={22} weight="duotone" className="text-amber-400" />
              <span>Mood Presets & Scenes</span>
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3 items-start">
              {entities.scenes.map((scene) => {
                const isSelected = selectedScene === scene.entity_id;

                return (
                  <button
                    key={scene.entity_id}
                    type="button"
                    onClick={() => handleTriggerScene(scene)}
                    className={`col-span-1 p-3.5 rounded-2xl backdrop-blur-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-amber-500/25 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/20 scale-[1.02]'
                        : darkMode
                        ? 'bg-white/[0.04] hover:bg-white/10 border-white/10 text-white'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <Sparkle
                      size={22}
                      weight={isSelected ? 'fill' : 'duotone'}
                      className={isSelected ? 'text-amber-400 animate-spin' : 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]'}
                    />
                    <span className="text-xs font-bold truncate max-w-full">{scene.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Right Sidebar Drawer for Full Media Player Modal */}
      {activeMediaDrawerEntity && (
        <MediaOverviewDrawer
          isOpen={Boolean(activeMediaDrawerEntity)}
          onClose={() => setActiveMediaDrawerEntity(null)}
          mediaPlayers={entities.mediaPlayers}
          activeEntity={activeMediaDrawerEntity}
          onUpdateEntity={updateEntityState}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}
