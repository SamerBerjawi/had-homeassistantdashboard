/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { ToggleRight, Power, Lightning, Stairs, HouseLine } from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import DetailsRightDrawer from '../DetailsRightDrawer';
import { groupEntitiesByFloorAndArea } from '../../../lib/grouping';
import DynamicPhosphorIcon from '../../ui/DynamicPhosphorIcon';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';

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
  const customFloors = useAutoLayoutStore(s => s.floors);
  const customAreas = useAutoLayoutStore(s => s.areas);

  const { onSwitches, totalWatts, grouped } = useMemo(() => {
    if (!isOpen) {
      return {
        onSwitches: [],
        totalWatts: 0,
        grouped: { hasFloors: false, hasAreas: false, groups: [], totalEntities: 0 }
      };
    }
    const onS = switches.filter(s => s.state === 'on');
    const watts = switches.reduce((sum, s) => sum + (s.state === 'on' ? (s.attributes?.power || s.powerWatts || 15) : 0), 0);
    const grp = groupEntitiesByFloorAndArea(switches, customFloors, customAreas);
    return { onSwitches: onS, totalWatts: watts, grouped: grp };
  }, [isOpen, switches, customFloors, customAreas]);

  const handleToggleSwitch = (sw: ResolvedEntity) => {
    const isCurrentlyOn = sw.state === 'on';
    const nextState = isCurrentlyOn ? 'off' : 'on';
    onUpdateEntity(sw.entity_id, nextState);
  };

  const handleTurnAllOff = () => {
    onSwitches.forEach(s => {
      onUpdateEntity(s.entity_id, 'off');
    });
  };

  const handleTurnAllOn = () => {
    switches.forEach(s => {
      onUpdateEntity(s.entity_id, 'on');
    });
  };

  return (
    <DetailsRightDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Switches & Outlets"
      subtitle={`${onSwitches.length} of ${switches.length} active switches`}
      icon={<ToggleRight size={22} weight="duotone" className="text-emerald-500" />}
      darkMode={darkMode}
    >
      <div className="space-y-6">
        {/* Top Summary & Bulk Control Card */}
        <div className={`p-4 rounded-2xl border ${
          darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {onSwitches.length} <span className="text-sm font-normal text-slate-500">/ {switches.length} Active</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <Lightning size={14} weight="fill" className="text-amber-500" />
                <span>Est. Load: {totalWatts} W</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTurnAllOn}
                disabled={onSwitches.length === switches.length}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                All On
              </button>
              <button
                type="button"
                onClick={handleTurnAllOff}
                disabled={onSwitches.length === 0}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                  darkMode ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                All Off
              </button>
            </div>
          </div>
        </div>

        {/* Grouped Switches: Floor -> Area -> Entity */}
        <div className="space-y-6">
          {grouped.groups.map((floorGroup) => (
            <div key={floorGroup.floorId || 'no-floor'} className="space-y-4">
              {/* Floor Header */}
              {grouped.hasFloors && (
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-white/10">
                  <div 
                    className="w-7 h-7 rounded-xl flex items-center justify-center border shadow-2xs shrink-0"
                    style={{
                      backgroundColor: `${floorGroup.color || '#6366f1'}1a`,
                      borderColor: `${floorGroup.color || '#6366f1'}40`,
                      color: floorGroup.color || '#6366f1'
                    }}
                  >
                    <DynamicPhosphorIcon 
                      name={floorGroup.icon} 
                      fallback={Stairs} 
                      size={15} 
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
              <div className="space-y-4">
                {floorGroup.areaGroups.map((areaGroup) => (
                  <div key={areaGroup.areaId || 'no-area'} className="space-y-2.5">
                    {(grouped.hasAreas || grouped.hasFloors) && (
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-5 h-5 rounded-lg flex items-center justify-center border shrink-0"
                            style={{
                              backgroundColor: `${areaGroup.color || '#10b981'}1a`,
                              borderColor: `${areaGroup.color || '#10b981'}40`,
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
                          {areaGroup.entities.filter(e => e.state === 'on').length}/{areaGroup.entities.length} on
                        </span>
                      </div>
                    )}

                    {/* Entities List */}
                    <div className="space-y-2">
                      {areaGroup.entities.map((sw) => {
                        const isOn = sw.state === 'on';
                        return (
                          <div
                            key={sw.entity_id}
                            className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                              isOn
                                ? darkMode
                                  ? 'bg-emerald-500/10 border-emerald-500/30'
                                  : 'bg-emerald-50/70 border-emerald-200'
                                : darkMode
                                  ? 'bg-slate-900/40 border-white/5 opacity-80'
                                  : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs transition-colors shrink-0 ${
                                isOn
                                  ? 'bg-emerald-500 text-white border-emerald-400'
                                  : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/10'
                              }`}>
                                <DynamicPhosphorIcon 
                                  name={sw.icon || 'ToggleRight'} 
                                  size={20} 
                                  weight={isOn ? 'fill' : 'regular'} 
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                  {sw.name}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                                  {sw.area?.name || sw.device?.name || (isOn ? 'Power Active' : 'Off')}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleSwitch(sw)}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 ${
                                isOn
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/15'
                              }`}
                              title={isOn ? 'Turn Off' : 'Turn On'}
                            >
                              <Power size={16} weight="bold" />
                            </button>
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
