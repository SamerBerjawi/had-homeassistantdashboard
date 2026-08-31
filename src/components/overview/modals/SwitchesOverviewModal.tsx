/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { ToggleRight, Power, Lightning, Stairs, HouseLine, SlidersHorizontal, Plug } from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import DetailsRightDrawer from '../DetailsRightDrawer';
import { groupEntitiesByFloorAndArea } from '../../../lib/grouping';
import DynamicPhosphorIcon from '../../ui/DynamicPhosphorIcon';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { useEntityPopup } from '../../../contexts/EntityPopupContext';
import { formatRelativeTime } from '../../../lib/utils';
import { detectSwitchCapabilities } from '../../../services/switchClassification';

interface SwitchesOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  switches: ResolvedEntity[];
  onUpdateEntity: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
  darkMode?: boolean;
}

export default function SwitchesOverviewModal({
  isOpen,
  onClose,
  switches,
  onUpdateEntity,
  darkMode = true
}: SwitchesOverviewModalProps) {
  const customFloors = useAutoLayoutStore((s) => s.floors);
  const customAreas = useAutoLayoutStore((s) => s.areas);
  const callHAService = useAutoLayoutStore((s) => s.callHAService);
  const { openEntityDetails } = useEntityPopup();

  const { onSwitches, totalWatts, grouped } = useMemo(() => {
    if (!isOpen) {
      return {
        onSwitches: [],
        totalWatts: 0,
        grouped: { hasFloors: false, hasAreas: false, groups: [], totalEntities: 0 }
      };
    }
    const onS = switches.filter((s) => s.state === 'on');
    const watts = switches.reduce((sum, s) => {
      if (s.state !== 'on') return sum;
      const caps = detectSwitchCapabilities(s);
      return sum + (caps.currentPowerWatts || 0);
    }, 0);
    const grp = groupEntitiesByFloorAndArea(switches, customFloors, customAreas);
    return { onSwitches: onS, totalWatts: Math.round(watts * 10) / 10, grouped: grp };
  }, [isOpen, switches, customFloors, customAreas]);

  const handleToggleSwitch = async (sw: ResolvedEntity) => {
    const isCurrentlyOn = sw.state === 'on';
    const nextState = isCurrentlyOn ? 'off' : 'on';
    const rawDomain = sw.entity_id ? sw.entity_id.split('.')[0] : 'switch';
    const domain = rawDomain === 'outlet' ? 'switch' : rawDomain;

    onUpdateEntity(sw.entity_id, nextState);
    await callHAService(
      domain,
      nextState === 'on' ? 'turn_on' : 'turn_off',
      {},
      { entity_id: sw.entity_id }
    );
  };

  const handleTurnAllOff = async () => {
    for (const sw of onSwitches) {
      const rawDomain = sw.entity_id ? sw.entity_id.split('.')[0] : 'switch';
      const domain = rawDomain === 'outlet' ? 'switch' : rawDomain;
      onUpdateEntity(sw.entity_id, 'off');
      await callHAService(domain, 'turn_off', {}, { entity_id: sw.entity_id });
    }
  };

  const handleTurnAllOn = async () => {
    for (const sw of switches) {
      if (sw.state !== 'on') {
        const rawDomain = sw.entity_id ? sw.entity_id.split('.')[0] : 'switch';
        const domain = rawDomain === 'outlet' ? 'switch' : rawDomain;
        onUpdateEntity(sw.entity_id, 'on');
        await callHAService(domain, 'turn_on', {}, { entity_id: sw.entity_id });
      }
    }
  };

  return (
    <DetailsRightDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Switches & Outlets"
      subtitle={`${onSwitches.length} of ${switches.length} active switches${totalWatts > 0 ? ` • ${totalWatts}W draw` : ''}`}
      icon={<ToggleRight size={22} weight="duotone" className="text-emerald-500" />}
      darkMode={darkMode}
    >
      <div className="space-y-5 pb-24 sm:pb-6">
        {/* Top Summary & Bulk Control Card */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-100/90 dark:bg-white/[0.04]">
          <div className="flex items-center gap-2">
            <Lightning size={16} weight="duotone" className="text-emerald-500" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Quick Batch Control</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTurnAllOff}
              disabled={onSwitches.length === 0}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-300 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Turn All Off
            </button>
            <button
              type="button"
              onClick={handleTurnAllOn}
              disabled={onSwitches.length === switches.length}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Turn All On
            </button>
          </div>
        </div>

        {/* 1. HIGHLIGHTED ACTIVE SWITCHES SECTION */}
        {onSwitches.length > 0 && (
          <div className="space-y-2.5 p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/10 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Active Running Switches ({onSwitches.length})
                </h3>
              </div>
              {totalWatts > 0 && (
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                  ~{totalWatts}W load
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2">
              {onSwitches.map((sw) => {
                const caps = detectSwitchCapabilities(sw);
                const hasPower = caps.hasPowerMonitoring && typeof caps.currentPowerWatts === 'number' && caps.currentPowerWatts > 0;
                const lastChangedStr = formatRelativeTime(sw.last_changed || sw.last_updated);

                return (
                  <div
                    key={`active_${sw.entity_id}`}
                    className="p-3 rounded-2xl bg-white/95 dark:bg-slate-900/80 shadow-xs flex items-center justify-between gap-3"
                  >
                    <div
                      className="flex items-center gap-3 min-w-0 cursor-pointer group"
                      onClick={() => openEntityDetails(sw.entity_id)}
                      title="Click to open switch details"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSwitch(sw);
                        }}
                        className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-xs cursor-pointer active:scale-95 shrink-0"
                        title="Turn off"
                      >
                        <Plug size={18} weight="fill" />
                      </button>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-500 transition-colors">
                          {sw.name}
                        </h4>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-300 font-semibold truncate">
                          {sw.area?.name || 'Supplying Power'}
                          {lastChangedStr && ` • ${lastChangedStr}`}
                          {hasPower && ` • ${caps.currentPowerWatts}W`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEntityDetails(sw.entity_id)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                        title="Open Details"
                      >
                        <SlidersHorizontal size={14} weight="bold" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleSwitch(sw)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 bg-emerald-500 text-slate-950 shadow-xs"
                        title="Turn Off"
                      >
                        <Power size={14} weight="bold" />
                      </button>
                    </div>
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
                              backgroundColor: `${areaGroup.color || '#10b981'}1a`,
                              color: areaGroup.color || '#10b981'
                            }}
                          >
                            <DynamicPhosphorIcon 
                              name={areaGroup.icon} 
                              fallback={HouseLine} 
                              size={12} 
                              weight="duotone" 
                              style={{ color: areaGroup.color || '#10b981' }}
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

                    {/* Switches in Area */}
                    <div className="space-y-2">
                      {areaGroup.entities.map((sw) => {
                        const caps = detectSwitchCapabilities(sw);
                        const isOn = caps.isOn;
                        const hasPower = caps.hasPowerMonitoring && typeof caps.currentPowerWatts === 'number' && caps.currentPowerWatts > 0 && isOn;
                        const lastChangedStr = formatRelativeTime(sw.last_changed || sw.last_updated);

                        return (
                          <div
                            key={sw.entity_id}
                            className={`p-3.5 rounded-2xl transition-all duration-200 flex items-center justify-between gap-3 ${
                              isOn
                                ? 'bg-emerald-500/15 dark:bg-emerald-500/10'
                                : 'bg-slate-100/90 dark:bg-white/[0.04] hover:bg-slate-200/80 dark:hover:bg-white/[0.08]'
                            }`}
                          >
                            <div
                              className="flex items-center gap-3 min-w-0 cursor-pointer group"
                              onClick={() => openEntityDetails(sw.entity_id)}
                              title="Click to view details"
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleSwitch(sw);
                                }}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-90 shrink-0 ${
                                  isOn
                                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                                    : 'bg-white/80 dark:bg-white/10 text-slate-400'
                                }`}
                              >
                                <Plug size={18} weight={isOn ? 'fill' : 'duotone'} />
                              </button>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-500 transition-colors">
                                  {sw.name}
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  {isOn ? 'Active' : 'Off'}
                                  {lastChangedStr && ` • ${lastChangedStr}`}
                                  {hasPower && ` • ${caps.currentPowerWatts}W`}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => openEntityDetails(sw.entity_id)}
                                className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/80 dark:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer active:scale-95"
                                title="Open details popup"
                              >
                                <SlidersHorizontal size={14} weight="bold" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleSwitch(sw)}
                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                                  isOn
                                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                                    : 'bg-white/80 dark:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                }`}
                                title={isOn ? 'Turn Off' : 'Turn On'}
                              >
                                <Power size={14} weight="bold" />
                              </button>
                            </div>
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
