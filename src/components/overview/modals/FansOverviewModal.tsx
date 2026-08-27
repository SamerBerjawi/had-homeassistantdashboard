import React from 'react';
import { Fan, Power, Gauge, ArrowsClockwise, Stairs, HouseLine } from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import DetailsRightDrawer from '../DetailsRightDrawer';
import { groupEntitiesByFloorAndArea } from '../../../lib/grouping';
import DynamicPhosphorIcon from '../../ui/DynamicPhosphorIcon';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';

interface FansOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fans: ResolvedEntity[];
  onUpdateEntity: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
  darkMode?: boolean;
}

export default function FansOverviewModal({
  isOpen,
  onClose,
  fans,
  onUpdateEntity,
  darkMode = true
}: FansOverviewModalProps) {
  const customFloors = useAutoLayoutStore(s => s.floors);
  const customAreas = useAutoLayoutStore(s => s.areas);
  const activeFans = fans.filter(f => f.state === 'on');
  const grouped = groupEntitiesByFloorAndArea(fans, customFloors, customAreas);

  const handleToggleFan = (fan: ResolvedEntity) => {
    const isCurrentlyOn = fan.state === 'on';
    onUpdateEntity(fan.entity_id, isCurrentlyOn ? 'off' : 'on', {
      percentage: isCurrentlyOn ? 0 : 66
    });
  };

  const handleSetSpeed = (fan: ResolvedEntity, percentage: number, speedName?: string) => {
    if (percentage === 0) {
      onUpdateEntity(fan.entity_id, 'off', { percentage: 0, speed: 'off' });
    } else {
      onUpdateEntity(fan.entity_id, 'on', { percentage, ...(speedName ? { speed: speedName } : {}) });
    }
  };

  const handleToggleOscillation = (fan: ResolvedEntity) => {
    const currentOsc = Boolean(fan.attributes?.oscillating);
    onUpdateEntity(fan.entity_id, fan.state, { oscillating: !currentOsc });
  };

  return (
    <DetailsRightDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Fans & Ventilation"
      subtitle={`${activeFans.length} of ${fans.length} fans actively running`}
      icon={<Fan size={22} weight="duotone" className="text-cyan-500" />}
      darkMode={darkMode}
    >
      <div className="space-y-6">
        
        {/* Grouped Fans: Floor -> Area -> Entity */}
        <div className="space-y-6">
          {grouped.groups.map((floorGroup) => (
            <div key={floorGroup.floorId || 'no-floor'} className="space-y-4">
              
              {/* Floor Header */}
              {grouped.hasFloors && (
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-white/10">
                  <div 
                    className="w-7 h-7 rounded-xl flex items-center justify-center border shadow-2xs shrink-0"
                    style={{
                      backgroundColor: `${floorGroup.color || '#06b6d4'}1a`,
                      borderColor: `${floorGroup.color || '#06b6d4'}40`,
                      color: floorGroup.color || '#06b6d4'
                    }}
                  >
                    <DynamicPhosphorIcon 
                      name={floorGroup.icon} 
                      fallback={Stairs} 
                      size={15} 
                      weight="duotone" 
                      style={{ color: floorGroup.color || '#06b6d4' }}
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
                    
                    {/* Area Header */}
                    {(grouped.hasAreas || grouped.hasFloors) && (
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-5 h-5 rounded-lg flex items-center justify-center border shrink-0"
                            style={{
                              backgroundColor: `${areaGroup.color || '#06b6d4'}1a`,
                              borderColor: `${areaGroup.color || '#06b6d4'}40`,
                              color: areaGroup.color || '#06b6d4'
                            }}
                          >
                            <DynamicPhosphorIcon 
                              name={areaGroup.icon} 
                              fallback={HouseLine} 
                              size={12} 
                              weight="duotone" 
                              style={{ color: areaGroup.color || '#06b6d4' }}
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
                          {areaGroup.entities.filter(e => e.state === 'on').length}/{areaGroup.entities.length} running
                        </span>
                      </div>
                    )}

                    {/* Entities List */}
                    <div className="space-y-2.5">
                      {areaGroup.entities.map((fan) => {
                        const isOn = fan.state === 'on';
                        const pct = fan.attributes?.percentage || (isOn ? 66 : 0);
                        const speed = fan.attributes?.speed || (pct > 66 ? 'high' : pct > 33 ? 'medium' : isOn ? 'low' : 'off');
                        const isOscillating = Boolean(fan.attributes?.oscillating);

                        return (
                          <div
                            key={fan.entity_id}
                            className={`p-4 rounded-2xl border transition-all duration-200 ${
                              isOn
                                ? 'bg-cyan-500/10 border-cyan-500/30 shadow-xs'
                                : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'
                            }`}
                          >
                            {/* Header */}
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <div className="flex items-center gap-3.5 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleFan(fan)}
                                  className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-all cursor-pointer shrink-0 active:scale-95 ${
                                    isOn
                                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                                      : 'bg-slate-200 dark:bg-white/10 border-slate-300 dark:border-white/15 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                  }`}
                                  title={isOn ? 'Turn fan off' : 'Turn fan on'}
                                >
                                  <Fan size={20} weight={isOn ? "fill" : "duotone"} className={isOn ? 'animate-spin' : ''} style={{ animationDuration: '2s' }} />
                                </button>

                                <div className="min-w-0">
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{fan.name}</h4>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {isOn ? `${pct}% Power • ${speed.toUpperCase()}` : 'Standby'}
                                  </p>
                                </div>
                              </div>

                              {/* Single Power State Badge (No duplicate state display) */}
                              <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                                isOn
                                  ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/40'
                                  : 'bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-white/10'
                              }`}>
                                {isOn ? 'RUNNING' : 'OFF'}
                              </span>
                            </div>

                            {/* Speed Controls */}
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                              <div className="flex-1 grid grid-cols-4 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSetSpeed(fan, 0, 'off')}
                                  className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    !isOn
                                      ? 'bg-slate-300 dark:bg-white/20 text-slate-900 dark:text-white shadow-xs'
                                      : 'bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                  }`}
                                >
                                  Off
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetSpeed(fan, 33, 'low')}
                                  className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    isOn && pct <= 33
                                      ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                                      : 'bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                  }`}
                                >
                                  Low
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetSpeed(fan, 66, 'medium')}
                                  className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    isOn && pct > 33 && pct <= 66
                                      ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                                      : 'bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                  }`}
                                >
                                  Med
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetSpeed(fan, 100, 'high')}
                                  className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    isOn && pct > 66
                                      ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                                      : 'bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                  }`}
                                >
                                  High
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggleOscillation(fan)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                  isOscillating
                                    ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/40'
                                    : 'bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-white/10 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                              >
                                <ArrowsClockwise size={14} weight="bold" />
                                <span>Oscillate {isOscillating ? 'On' : 'Off'}</span>
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
