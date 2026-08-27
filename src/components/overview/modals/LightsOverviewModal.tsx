import React from 'react';
import { Lightbulb, Power, Sun, Lightning, Sparkle } from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import DetailsRightDrawer from '../DetailsRightDrawer';

interface LightsOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  lights: ResolvedEntity[];
  onUpdateEntity: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
}

export default function LightsOverviewModal({
  isOpen,
  onClose,
  lights,
  onUpdateEntity
}: LightsOverviewModalProps) {
  const onLights = lights.filter(l => l.state === 'on');
  const totalWatts = lights.reduce((sum, l) => sum + (l.state === 'on' ? (l.attributes?.power || l.powerWatts || 10) : 0), 0);

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
    onLights.forEach(light => {
      onUpdateEntity(light.entity_id, 'off', { brightness: 0 });
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
      icon={<Lightbulb className="w-5 h-5 text-amber-400" />}
    >
      <div className="space-y-6">
        {/* Quick Batch Action Bar */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2">
            <Lightning size={16} weight="duotone" className="text-amber-400" />
            <span className="text-xs font-bold text-slate-300">Quick Batch Control</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTurnAllOff}
              disabled={onLights.length === 0}
              className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            >
              Turn All Off
            </button>
            <button
              type="button"
              onClick={handleTurnAllOn}
              disabled={onLights.length === lights.length}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            >
              Turn All On
            </button>
          </div>
        </div>

        {/* Lights Grid List */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            All Fixtures ({lights.length})
          </div>

          {lights.map((light) => {
            const isOn = light.state === 'on';
            const brightness = typeof light.attributes?.brightness === 'number' ? light.attributes.brightness : isOn ? 100 : 0;
            const roomName = light.area?.name || 'Home';
            const colorHex = light.attributes?.color || '#ffffff';

            return (
              <div
                key={light.entity_id}
                className={`p-4 rounded-2xl border transition-all duration-200 ${
                  isOn
                    ? 'bg-amber-500/10 border-amber-500/30 shadow-lg shadow-amber-500/5'
                    : 'bg-white/5 border-white/10 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        isOn
                          ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/40'
                          : 'bg-white/10 text-slate-400'
                      }`}
                      style={isOn && colorHex ? { backgroundColor: colorHex, color: '#111827' } : undefined}
                    >
                      <Lightbulb className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{light.name}</h4>
                      <p className="text-xs text-slate-400 font-medium truncate">{roomName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-300">
                      {isOn ? `${brightness}%` : 'Off'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleLight(light)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer active:scale-95 ${
                        isOn
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-md'
                          : 'bg-white/10 hover:bg-white/20 text-slate-300 border-white/10'
                      }`}
                      title={isOn ? 'Turn Off' : 'Turn On'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Brightness Slider */}
                {isOn && (
                  <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                    <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                    <input
                      type="range"
                      min={1}
                      max={100}
                      value={brightness}
                      onChange={(e) => handleBrightnessChange(light, parseInt(e.target.value, 10))}
                      className="w-full h-1.5 rounded-lg appearance-none bg-white/20 accent-amber-400 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DetailsRightDrawer>
  );
}
