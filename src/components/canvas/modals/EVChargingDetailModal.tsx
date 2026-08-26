import React, { useState } from 'react';
import { Car, Lightning, BatteryCharging, Clock, ShieldCheck, CurrencyDollar, Power } from '@phosphor-icons/react';
import CardModalContainer from './CardModalContainer';

interface EVChargingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AMPERAGE_OPTIONS = [6, 10, 13, 16, 24, 32];

export default function EVChargingDetailModal({
  isOpen,
  onClose
}: EVChargingDetailModalProps) {
  const [isCharging, setIsCharging] = useState(true);
  const [batteryPct, setBatteryPct] = useState(74);
  const [targetLimit, setTargetLimit] = useState(80);
  const [amperage, setAmperage] = useState(16);
  const [scheduledTime, setScheduledTime] = useState('02:00');

  const powerKw = isCharging ? (amperage * 230 * 3 / 1000).toFixed(1) : '0.0';

  return (
    <CardModalContainer
      isOpen={isOpen}
      onClose={onClose}
      title="EV Wall Connector"
      subtitle="Tesla Model 3 Long Range • Dual Motor"
      icon={<Car size={22} weight="duotone" className="text-emerald-400" />}
      maxWidth="max-w-xl"
    >
      <div className="space-y-6">
        {/* Big Charging State Header Card */}
        <div className="p-5 rounded-3xl bg-black/40 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BatteryCharging
              size={40}
              weight="duotone"
              className={`shrink-0 ${isCharging ? 'text-emerald-400 animate-pulse drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 'text-slate-400'}`}
            />
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white font-mono">{batteryPct}%</span>
                <span className="text-xs text-slate-400">Current SoC</span>
              </div>
              <p className="text-xs text-emerald-400 font-semibold">
                {isCharging ? `Charging at ${powerKw} kW (3-Phase)` : 'Plugged In • Ready'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCharging(!isCharging)}
            className={`px-5 py-3 rounded-2xl font-extrabold text-sm transition-all cursor-pointer shadow-md ${
              isCharging
                ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/30'
                : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/30'
            }`}
          >
            {isCharging ? 'Stop Charging' : 'Start Fast Charge'}
          </button>
        </div>

        {/* Target Charge Limit Slider (50% - 100%) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>Target Charge Limit</span>
            <span className="text-amber-400 font-mono text-sm">{targetLimit}%</span>
          </div>
          <input
            type="range"
            min="50"
            max="100"
            step="5"
            value={targetLimit}
            onChange={(e) => setTargetLimit(parseInt(e.target.value))}
            className="w-full h-3 bg-black/40 rounded-lg appearance-none cursor-pointer accent-amber-400 border border-white/10"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>50% Daily</span>
            <span>80% Recommended</span>
            <span>100% Roadtrip</span>
          </div>
        </div>

        {/* Current Amperage Selector */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Lightning size={15} weight="duotone" className="text-amber-400" /> Maximum Charging Current
          </div>
          <div className="grid grid-cols-6 gap-2">
            {AMPERAGE_OPTIONS.map((amp) => (
              <button
                key={amp}
                onClick={() => setAmperage(amp)}
                className={`py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                  amperage === amp
                    ? 'bg-emerald-500 text-black font-extrabold shadow-md'
                    : 'bg-white/5 hover:bg-white/15 text-slate-300 border border-white/10'
                }`}
              >
                {amp}A
              </button>
            ))}
          </div>
        </div>

        {/* Session Stats Grid */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Added Energy</span>
            <span className="text-lg font-black text-white font-mono">+18.4 kWh</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Time to Target</span>
            <span className="text-lg font-black text-white font-mono">1h 12m</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Session Cost</span>
            <span className="text-lg font-black text-emerald-400 font-mono">$2.42</span>
          </div>
        </div>
      </div>
    </CardModalContainer>
  );
}
