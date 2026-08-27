import React from 'react';
import { Lightbulb, Power, Sun, Lightning, Stairs, HouseLine } from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import DetailsRightDrawer from '../DetailsRightDrawer';
import { groupEntitiesByFloorAndArea } from '../../../lib/grouping';
import DynamicPhosphorIcon from '../../ui/DynamicPhosphorIcon';

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
  const onLights = lights.filter(l => l.state === 'on');
  const totalWatts = lights.reduce((sum, l) => sum + (l.state === 'on' ? (l.attributes?.power || l.powerWatts || 10) : 0), 0);

  const grouped = groupEntitiesByFloorAndArea(lights);

  const handleToggleLight = (light: ResolvedEntity) => {
    const isCurrentlyOn = light.state === 'on';
    const nextState = isCurrentlyOn ? 'off' : 'on';
    onUpdateEntity(light.entity_id, nextState, {
      brightness: nextState === 'on' ? (light.attributes?.brightness || 80) : 0
    });
  };

  const handleBrightnessChange = (light: ResolvedEntity, val: number) => {
    const nextState = val > 0 ? 'on' : 'off';
    onUpdateEntity(light.entity_id, nextState, {
      brightness: val
    });
  };

  const handleTurnAllOff = () => {
    lights.forEach(light => {
      if (light.state !== 'off') {
        onUpdateEntity(light.entity_id, 'off');
      }
    });
  };

  const handleTurnAllOn = () => {
    lights.forEach(light => {
      if (light.state !== 'on') {
        onUpdateEntity(light.entity_id, 'on', { brightness: 80 });
      }
    });
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
      <div className="space-y-6">
        {/* Quick Batch Action Bar */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Lightning size={16} weight="duotone" className="text-amber-500" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Quick Batch Control</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTurnAllOff}
              disabled={onLights.length === 0}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            >
              Turn All Off
            </button>
            <button
              type="button"
              onClick={handleTurnAllOn}
              disabled={onLights.length === lights.length}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            >
              Turn All On
            </button>
          </div>
        </div>

        {/* Grouped Entities: Floor -> Area -> Entity */}
        <div className="space-y-6">
          {grouped.groups.map((floorGroup) => (
            <div key={floorGroup.floorId || 'no-floor'} className="space-y-4">
              
              {/* Floor Header */}
              {grouped.hasFloors && (
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200 dark:border-white/10">
                  <DynamicPhosphorIcon 
                    name={floorGroup.icon} 
                    fallback={Stairs} 
                    size={16} 
                    weight="duotone" 
                    style={{ color: floorGroup.color || '#6366f1' }}
                  />
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
                    
                    {/* Area Header */}
                    {(grouped.hasAreas || grouped.hasFloors) && (
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5">
                          <DynamicPhosphorIcon 
                            name={areaGroup.icon} 
                            fallback={HouseLine} 
                            size={14} 
                            weight="duotone" 
                            style={{ color: areaGroup.color || '#f59e0b' }}
                          />
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
                    <div className="space-y-2.5">
                      {areaGroup.entities.map((light) => {
                        const isOn = light.state === 'on';
                        const brightness = typeof light.attributes?.brightness === 'number' ? light.attributes.brightness : isOn ? 100 : 0;

                        return (
                          <div
                            key={light.entity_id}
                            className={`p-4 rounded-2xl border transition-all duration-200 ${
                              isOn
                                ? 'bg-amber-500/10 border-amber-500/30 shadow-xs'
                                : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'
                            }`}
                          >
                            {/* Main Row */}
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3.5 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleLight(light)}
                                  className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-all cursor-pointer shrink-0 active:scale-95 ${
                                    isOn
                                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                                      : 'bg-slate-200 dark:bg-white/10 border-slate-300 dark:border-white/15 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                  }`}
                                  title={isOn ? 'Turn off' : 'Turn on'}
                                >
                                  <Lightbulb size={20} weight={isOn ? "fill" : "duotone"} />
                                </button>

                                <div className="min-w-0">
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{light.name}</h4>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {isOn ? `${Math.round(brightness)}% Brightness` : 'Inactive'}
                                  </p>
                                </div>
                              </div>

                              {/* Single Power State Badge (No duplicate state display) */}
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                                  isOn
                                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                                    : 'bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-white/10'
                                }`}>
                                  {isOn ? 'ON' : 'OFF'}
                                </span>
                              </div>
                            </div>

                            {/* Brightness Slider */}
                            {isOn && (
                              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 flex items-center gap-3">
                                <Sun size={15} weight="duotone" className="text-amber-500 shrink-0" />
                                <input
                                  type="range"
                                  min={1}
                                  max={100}
                                  value={brightness}
                                  onChange={(e) => handleBrightnessChange(light, parseInt(e.target.value, 10))}
                                  className="w-full h-1.5 rounded-lg appearance-none bg-slate-300 dark:bg-white/20 accent-amber-500 cursor-pointer"
                                />
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
