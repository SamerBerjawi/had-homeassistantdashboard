import React from 'react';
import { Fan, Power, Gauge, ArrowsClockwise } from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import DetailsRightDrawer from '../DetailsRightDrawer';

interface FansOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fans: ResolvedEntity[];
  onUpdateEntity: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
}

export default function FansOverviewModal({
  isOpen,
  onClose,
  fans,
  onUpdateEntity
}: FansOverviewModalProps) {
  const activeFans = fans.filter(f => f.state === 'on');

  const handleToggleFan = (fan: ResolvedEntity) => {
    const isCurrentlyOn = fan.state === 'on';
    const nextState = isCurrentlyOn ? 'off' : 'on';
    onUpdateEntity(fan.entity_id, nextState, {
      percentage: nextState === 'on' ? (fan.attributes?.percentage || 66) : 0,
      speed: nextState === 'on' ? (fan.attributes?.speed || 'medium') : 'off'
    });
  };

  const handleSetSpeed = (fan: ResolvedEntity, pct: number, speedName: string) => {
    if (pct === 0) {
      onUpdateEntity(fan.entity_id, 'off', { percentage: 0, speed: 'off' });
    } else {
      onUpdateEntity(fan.entity_id, 'on', { percentage: pct, speed: speedName });
    }
  };

  const handleToggleOscillation = (fan: ResolvedEntity) => {
    const nextOsc = !fan.attributes?.oscillating;
    onUpdateEntity(fan.entity_id, fan.state, {
      oscillating: nextOsc
    });
  };

  return (
    <DetailsRightDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Fans & Air Circulation"
      subtitle={`${activeFans.length} of ${fans.length} fans actively running`}
      icon={<Fan className="w-5 h-5 text-cyan-400" />}
    >
      <div className="space-y-6">
        {/* Fan Cards */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Connected Fans ({fans.length})
          </div>

          {fans.map((fan) => {
            const isOn = fan.state === 'on';
            const percentage = typeof fan.attributes?.percentage === 'number' ? fan.attributes.percentage : isOn ? 66 : 0;
            const speed = fan.attributes?.speed || (isOn ? 'medium' : 'off');
            const isOscillating = Boolean(fan.attributes?.oscillating);
            const roomName = fan.area?.name || 'Home';

            return (
              <div
                key={fan.entity_id}
                className={`p-4 rounded-2xl border transition-all duration-200 space-y-3.5 ${
                  isOn
                    ? 'bg-cyan-500/10 border-cyan-500/30 shadow-lg shadow-cyan-500/5'
                    : 'bg-white/5 border-white/10 opacity-75'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        isOn
                          ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/40'
                          : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      <Fan
                        className={`w-5 h-5 ${isOn ? 'animate-spin' : ''}`}
                        style={isOn ? { animationDuration: percentage > 70 ? '1s' : percentage > 35 ? '2s' : '3.5s' } : undefined}
                      />
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{fan.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{roomName}</span>
                        <span>•</span>
                        <span className={isOn ? 'text-cyan-300 font-semibold' : ''}>
                          {isOn ? `${percentage}% (${speed})` : 'Stopped'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleFan(fan)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer active:scale-95 ${
                        isOn
                          ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 border-cyan-400 shadow-md'
                          : 'bg-white/10 hover:bg-white/20 text-slate-300 border-white/10'
                      }`}
                      title={isOn ? 'Turn Fan Off' : 'Turn Fan On'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Speed Controls & Oscillation */}
                <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 bg-black/30 p-1 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => handleSetSpeed(fan, 0, 'off')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        !isOn
                          ? 'bg-white/20 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Off
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetSpeed(fan, 33, 'low')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isOn && percentage <= 40
                          ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Low
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetSpeed(fan, 66, 'medium')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isOn && percentage > 40 && percentage <= 75
                          ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Med
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetSpeed(fan, 100, 'high')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isOn && percentage > 75
                          ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-xs'
                          : 'text-slate-400 hover:text-white'
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
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:text-slate-200'
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
    </DetailsRightDrawer>
  );
}
