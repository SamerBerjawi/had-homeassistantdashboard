/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  Lightbulb,
  Power,
  Sun,
  Lightning,
  Stairs,
  HouseLine,
  SlidersHorizontal
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import DetailsRightDrawer from '../DetailsRightDrawer';
import { groupEntitiesByFloorAndArea } from '../../../lib/grouping';
import DynamicPhosphorIcon from '../../ui/DynamicPhosphorIcon';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { useEntityPopup } from '../../../contexts/EntityPopupContext';
import { formatRelativeTime } from '../../../lib/utils';
import {
  detectLightCapabilities
} from '../../../services/lightClassification';

interface LightsOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  lights: ResolvedEntity[];
  onUpdateEntity: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
  darkMode?: boolean;
}

export default function LightsOverviewModal({
  isOpen,
  onClose,
  lights,
  onUpdateEntity,
  darkMode = true
}: LightsOverviewModalProps) {
  const customFloors = useAutoLayoutStore((s) => s.floors);
  const customAreas = useAutoLayoutStore((s) => s.areas);
  const callHAService = useAutoLayoutStore((s) => s.callHAService);
  const { openEntityDetails } = useEntityPopup();

  const { onLights, totalWatts, grouped } = useMemo(() => {
    if (!isOpen) {
      return {
        onLights: [],
        totalWatts: 0,
        grouped: { hasFloors: false, hasAreas: false, groups: [], totalEntities: 0 }
      };
    }
    const onL = lights.filter((l) => l.state === 'on');
    const watts = lights.reduce((sum, l) => sum + (l.state === 'on' ? (l.attributes?.power || l.powerWatts || 10) : 0), 0);
    const grp = groupEntitiesByFloorAndArea(lights, customFloors, customAreas);
    return { onLights: onL, totalWatts: watts, grouped: grp };
  }, [isOpen, lights, customFloors, customAreas]);

  const handleToggleLight = async (light: ResolvedEntity) => {
    const caps = detectLightCapabilities(light);
    const isCurrentlyOn = light.state === 'on';
    const nextState = isCurrentlyOn ? 'off' : 'on';
    const haBrightness255 = nextState === 'on' ? (caps.brightness255 || 204) : 0;

    if (caps.supportsBrightness) {
      onUpdateEntity(light.entity_id, nextState, {
        ...light.attributes,
        brightness: haBrightness255
      });
      await callHAService(
        'light',
        nextState === 'on' ? 'turn_on' : 'turn_off',
        nextState === 'on' ? { brightness: haBrightness255 } : {},
        { entity_id: light.entity_id }
      );
    } else {
      onUpdateEntity(light.entity_id, nextState, {
        ...light.attributes
      });
      await callHAService(
        'light',
        nextState === 'on' ? 'turn_on' : 'turn_off',
        {},
        { entity_id: light.entity_id }
      );
    }
  };

  const handleBrightnessChange = async (light: ResolvedEntity, valPct: number) => {
    const haBrightness255 = Math.round((valPct / 100) * 255);
    const nextState = valPct > 0 ? 'on' : 'off';

    onUpdateEntity(light.entity_id, nextState, {
      ...light.attributes,
      brightness: haBrightness255
    });

    if (valPct > 0) {
      await callHAService(
        'light',
        'turn_on',
        { brightness: haBrightness255 },
        { entity_id: light.entity_id }
      );
    } else {
      await callHAService('light', 'turn_off', {}, { entity_id: light.entity_id });
    }
  };

  const handleTurnAllOff = async () => {
    for (const light of lights) {
      if (light.state !== 'off') {
        onUpdateEntity(light.entity_id, 'off');
        await callHAService('light', 'turn_off', {}, { entity_id: light.entity_id });
      }
    }
  };

  const handleTurnAllOn = async () => {
    for (const light of lights) {
      if (light.state !== 'on') {
        const caps = detectLightCapabilities(light);
        if (caps.supportsBrightness) {
          onUpdateEntity(light.entity_id, 'on', { brightness: 204 });
          await callHAService('light', 'turn_on', { brightness: 204 }, { entity_id: light.entity_id });
        } else {
          onUpdateEntity(light.entity_id, 'on');
          await callHAService('light', 'turn_on', {}, { entity_id: light.entity_id });
        }
      }
    }
  };

  return (
    <DetailsRightDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Lighting Controls"
      subtitle={`${onLights.length} of ${lights.length} lights active • ~${Math.round(totalWatts)}W draw`}
      icon={<Lightbulb size={22} weight="duotone" className="text-amber-500" />}
      darkMode={darkMode}
    >
      <div className="space-y-5 pb-24 sm:pb-6">
        {/* Quick Batch Action Bar */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-100/90 dark:bg-white/[0.04]">
          <div className="flex items-center gap-2">
            <Lightning size={16} weight="duotone" className="text-amber-500" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Quick Batch Control</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTurnAllOff}
              disabled={onLights.length === 0}
              className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-300 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            >
              Turn All Off
            </button>
            <button
              type="button"
              onClick={handleTurnAllOn}
              disabled={onLights.length === lights.length}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            >
              Turn All On
            </button>
          </div>
        </div>

        {/* 1. HIGHLIGHTED ACTIVE LIGHTS SECTION */}
        {onLights.length > 0 && (
          <div className="space-y-2.5 p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/10 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Active Lights ({onLights.length})
                </h3>
              </div>
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                ~{Math.round(totalWatts)}W draw
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {onLights.map((light) => {
                const caps = detectLightCapabilities(light);
                const powerWatts = light.attributes?.power || light.powerWatts;
                const hasPower = typeof powerWatts === 'number' && powerWatts > 0;
                const lastChangedStr = formatRelativeTime(light.last_changed || light.last_updated);

                return (
                  <div
                    key={`active_${light.entity_id}`}
                    className="p-3 rounded-2xl bg-white/95 dark:bg-slate-900/80 shadow-xs flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className="flex items-center gap-3 min-w-0 cursor-pointer group"
                        onClick={() => openEntityDetails(light.entity_id)}
                        title="Click to open detailed controls"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleLight(light);
                          }}
                          className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs cursor-pointer active:scale-95 shrink-0"
                          title="Turn off"
                          style={{
                            backgroundColor: caps.supportsColor ? caps.displayColor : undefined
                          }}
                        >
                          <Lightbulb size={18} weight="fill" />
                        </button>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-amber-500 transition-colors">
                            {light.name}
                          </h4>
                          <p className="text-[11px] text-amber-600 dark:text-amber-300 font-semibold truncate">
                            {light.area?.name || (caps.supportsBrightness ? `${caps.brightnessPct}% Brightness` : 'Illuminating')}
                            {lastChangedStr && ` • ${lastChangedStr}`}
                            {hasPower && ` • ${powerWatts}W`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEntityDetails(light.entity_id)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                          title="Open Settings"
                        >
                          <SlidersHorizontal size={14} weight="bold" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleLight(light)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 bg-amber-500 text-slate-950 shadow-xs"
                          title="Turn Off"
                        >
                          <Power size={14} weight="bold" />
                        </button>
                      </div>
                    </div>

                    {/* Brightness Slider (Only if light supports brightness) */}
                    {caps.supportsBrightness && (
                      <div className="flex items-center gap-2.5 pt-1">
                        <Sun size={13} weight="duotone" className="text-amber-500 shrink-0" />
                        <input
                          type="range"
                          min={1}
                          max={100}
                          value={caps.brightnessPct}
                          onChange={(e) => handleBrightnessChange(light, parseInt(e.target.value, 10))}
                          className="w-full h-1.5 rounded-lg appearance-none bg-slate-200 dark:bg-white/20 accent-amber-500 cursor-pointer"
                        />
                        <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 w-7 text-right">
                          {caps.brightnessPct}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Grouped Entities: Floor -> Area -> Entity */}
        <div className="space-y-5">
          {grouped.groups.map((floorGroup) => (
            <div key={floorGroup.floorId || 'no-floor'} className="space-y-3">
              
              {/* Floor Header */}
              {grouped.hasFloors && (
                <div className="flex items-center gap-2 px-1">
                  <div 
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${floorGroup.color || '#6366f1'}1a`,
                      color: floorGroup.color || '#6366f1'
                    }}
                  >
                    <DynamicPhosphorIcon 
                      name={floorGroup.icon} 
                      fallback={Stairs} 
                      size={14} 
                      weight="duotone" 
                      style={{ color: floorGroup.color || '#6366f1' }}
                    />
                  </div>
                  <h4 
                    className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200"
                    style={{ color: floorGroup.color || undefined }}
                  >
                    {floorGroup.floorName}
                  </h4>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                    ({floorGroup.areaGroups.reduce((acc, a) => acc + a.entities.length, 0)})
                  </span>
                </div>
              )}

              {/* Area Groups */}
              <div className="space-y-3">
                {floorGroup.areaGroups.map((areaGroup) => (
                  <div key={areaGroup.areaId || 'no-area'} className="space-y-2">
                    
                    {/* Area Header */}
                    {(grouped.hasAreas || grouped.hasFloors) && (
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5">
                          <div 
                            className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: `${areaGroup.color || '#f59e0b'}1a`,
                              color: areaGroup.color || '#f59e0b'
                            }}
                          >
                            <DynamicPhosphorIcon 
                              name={areaGroup.icon} 
                              fallback={HouseLine} 
                              size={12} 
                              weight="duotone" 
                              style={{ color: areaGroup.color || '#f59e0b' }}
                            />
                          </div>
                          <span 
                            className="text-xs font-bold text-slate-700 dark:text-slate-300"
                            style={{ color: areaGroup.color || undefined }}
                          >
                            {areaGroup.areaName}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                          {areaGroup.entities.filter((e) => e.state === 'on').length}/{areaGroup.entities.length} on
                        </span>
                      </div>
                    )}

                    {/* Lights in Area */}
                    <div className="space-y-2">
                      {areaGroup.entities.map((light) => {
                        const caps = detectLightCapabilities(light);
                        const isOn = caps.isOn;
                        const lastChangedStr = formatRelativeTime(light.last_changed || light.last_updated);

                        return (
                          <div
                            key={light.entity_id}
                            className={`p-3.5 rounded-2xl transition-all duration-200 flex flex-col gap-2.5 ${
                              isOn
                                ? 'bg-amber-500/15 dark:bg-amber-500/10'
                                : 'bg-slate-100/90 dark:bg-white/[0.04] hover:bg-slate-200/80 dark:hover:bg-white/[0.08]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div
                                className="flex items-center gap-3 min-w-0 cursor-pointer group"
                                onClick={() => openEntityDetails(light.entity_id)}
                                title="Click to view details"
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleLight(light);
                                  }}
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-90 shrink-0 ${
                                    isOn
                                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                                      : 'bg-white/80 dark:bg-white/10 text-slate-400'
                                  }`}
                                  style={{
                                    backgroundColor: isOn && caps.supportsColor ? caps.displayColor : undefined
                                  }}
                                >
                                  <Lightbulb size={18} weight={isOn ? 'fill' : 'duotone'} />
                                </button>
                                <div className="min-w-0">
                                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-amber-500 transition-colors">
                                    {light.name}
                                  </h4>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    {isOn
                                      ? caps.supportsBrightness
                                        ? `${caps.brightnessPct}% Brightness`
                                        : 'Illuminating'
                                      : 'Off'}
                                    {lastChangedStr && ` • ${lastChangedStr}`}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openEntityDetails(light.entity_id)}
                                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/80 dark:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer active:scale-95"
                                  title="Open details popup"
                                >
                                  <SlidersHorizontal size={14} weight="bold" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleLight(light)}
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                                    isOn
                                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                                      : 'bg-white/80 dark:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                  }`}
                                  title={isOn ? 'Turn Off' : 'Turn On'}
                                >
                                  <Power size={14} weight="bold" />
                                </button>
                              </div>
                            </div>

                            {/* Brightness Slider (Only if supported and currently on) */}
                            {caps.supportsBrightness && isOn && (
                              <div className="flex items-center gap-2.5 pt-1">
                                <Sun size={13} weight="duotone" className="text-amber-500 shrink-0" />
                                <input
                                  type="range"
                                  min={1}
                                  max={100}
                                  value={caps.brightnessPct}
                                  onChange={(e) => handleBrightnessChange(light, parseInt(e.target.value, 10))}
                                  className="w-full h-1.5 rounded-lg appearance-none bg-slate-200 dark:bg-white/20 accent-amber-500 cursor-pointer"
                                />
                                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 w-7 text-right">
                                  {caps.brightnessPct}%
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>
      </div>
    </DetailsRightDrawer>
  );
}
