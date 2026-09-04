/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Fan,
  Thermometer,
  Wind,
  Fire,
  Snowflake,
  SunHorizon,
  Power,
  Clock,
  Car
} from '@phosphor-icons/react';
import { CarEvMetrics } from '../../types/mobility';

interface VehicleClimateCardProps {
  metrics: CarEvMetrics;
  actions: {
    toggleRemoteClimate: (turnOn: boolean, entityId?: string) => Promise<void>;
    setCabinTemperature?: (temp: number) => Promise<void>;
    setClimateHvacMode?: (mode: string) => Promise<void>;
    toggleDefroster?: (mode: 'front' | 'rear') => Promise<void>;
    toggleSeatHeater?: (seat: 'driver' | 'passenger', level: number) => Promise<void>;
  };
  darkMode?: boolean;
}

export function VehicleClimateCard({
  metrics,
  actions,
  darkMode = true
}: VehicleClimateCardProps) {
  const currentTarget = metrics.targetCabinTemp || 21.0;
  const [targetTemp, setTargetTemp] = useState<number>(currentTarget);
  const [driverSeatHeat, setDriverSeatHeat] = useState<number>(metrics.seatHeatingDriver || 0);
  const [passSeatHeat, setPassSeatHeat] = useState<number>(metrics.seatHeatingPassenger || 0);
  const [frontDefrost, setFrontDefrost] = useState<boolean>(metrics.defrostActive || false);
  const [rearDefrost, setRearDefrost] = useState<boolean>(metrics.rearDefrostActive || false);

  React.useEffect(() => {
    if (metrics.targetCabinTemp) {
      setTargetTemp(metrics.targetCabinTemp);
    }
  }, [metrics.targetCabinTemp]);

  const handleTempAdjust = async (delta: number) => {
    const newTemp = Math.round((targetTemp + delta) * 2) / 2;
    if (newTemp >= 16 && newTemp <= 28) {
      setTargetTemp(newTemp);
      if (actions.setCabinTemperature) {
        await actions.setCabinTemperature(newTemp);
      }
    }
  };

  const handleSeatHeatCycle = async (seat: 'driver' | 'passenger') => {
    if (seat === 'driver') {
      const next = (driverSeatHeat + 1) % 4;
      setDriverSeatHeat(next);
      actions.toggleSeatHeater?.('driver', next);
    } else {
      const next = (passSeatHeat + 1) % 4;
      setPassSeatHeat(next);
      actions.toggleSeatHeater?.('passenger', next);
    }
  };

  const handleDefrostToggle = async (mode: 'front' | 'rear') => {
    if (mode === 'front') {
      setFrontDefrost(!frontDefrost);
      actions.toggleDefroster?.('front');
    } else {
      setRearDefrost(!rearDefrost);
      actions.toggleDefroster?.('rear');
    }
  };

  const hvacModes = [
    { id: 'off', label: 'Off', icon: Power },
    { id: 'cool', label: 'Cool', icon: Snowflake },
    { id: 'heat', label: 'Heat', icon: Fire },
    { id: 'auto', label: 'Auto', icon: Fan }
  ];

  const currentMode = metrics.remoteClimateActive ? (metrics.climateHvacMode || 'auto') : 'off';

  return (
    <div
      className={`w-full rounded-3xl p-6 sm:p-7 border backdrop-blur-xl transition-all shadow-[0_20px_50px_rgba(0,0,0,0.4)] relative overflow-hidden flex flex-col justify-between gap-6 ${
        darkMode
          ? 'bg-slate-900/60 border-white/10 text-white'
          : 'bg-white/80 border-slate-200 text-slate-900 shadow-xl'
      }`}
    >
      {/* Background glow when climate active */}
      {metrics.remoteClimateActive && (
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none transition-opacity duration-700 animate-pulse"
          style={{
            backgroundImage: 'radial-gradient(circle 220px at 10% 10%, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
          }}
        />
      )}

      {/* Card Header */}
      <div className="flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Fan
              size={22}
              weight="duotone"
              className={metrics.remoteClimateActive ? 'animate-spin' : ''}
            />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black tracking-tight uppercase">
              Climate & Comfort
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Cabin preconditioning & HVAC
            </p>
          </div>
        </div>

        {/* Interior vs Exterior Temp Comparison */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-mono font-bold flex items-center gap-1.5">
            <span className="text-slate-400 text-[10px]">IN:</span>
            <span className="text-white">{metrics.cabinTemp}°</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400 text-[10px]">OUT:</span>
            <span className="text-slate-300">{metrics.outdoorTemp}°</span>
          </div>
        </div>
      </div>

      {/* Central Temperature Stepper Dial */}
      <div className="relative py-2 flex items-center justify-center gap-8 z-10">
        <button
          type="button"
          onClick={() => handleTempAdjust(-0.5)}
          aria-label="Decrease cabin temperature"
          className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-xl font-bold flex items-center justify-center cursor-pointer transition-all shadow-md"
        >
          –
        </button>

        <div className="text-center space-y-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
            Target Temperature
          </span>
          <div className="text-5xl sm:text-6xl font-black tracking-tight text-white font-mono flex items-baseline justify-center">
            <span>{targetTemp.toFixed(1)}</span>
            <span className="text-2xl text-cyan-400 font-bold ml-1">°C</span>
          </div>
          <span className="text-xs text-slate-400 font-medium block">
            {metrics.remoteClimateActive
              ? `Preconditioning active • ${metrics.remoteClimateTimeRemaining}m remaining`
              : 'Preconditioning standby'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleTempAdjust(0.5)}
          aria-label="Increase cabin temperature"
          className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-xl font-bold flex items-center justify-center cursor-pointer transition-all shadow-md"
        >
          +
        </button>
      </div>

      {/* HVAC Modes Selector */}
      <div className="grid grid-cols-4 gap-2 relative z-10">
        {hvacModes.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode.toLowerCase() === mode.id;

          return (
            <button
              key={mode.id}
              type="button"
              onClick={async () => {
                if (mode.id === 'off') {
                  await actions.toggleRemoteClimate(false);
                } else {
                  if (!metrics.remoteClimateActive) {
                    await actions.toggleRemoteClimate(true);
                  }
                  actions.setClimateHvacMode?.(mode.id);
                }
              }}
              className={`py-2.5 px-2 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer shadow-sm ${
                isActive
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-cyan-500/10'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Icon size={18} weight={isActive ? 'fill' : 'duotone'} />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* Seat Heating & Defrosters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 relative z-10">
        {/* Driver Seat Heater */}
        <button
          type="button"
          onClick={() => handleSeatHeatCycle('driver')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
            driverSeatHeat > 0
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400'
          }`}
        >
          <div className="flex items-center gap-1">
            <Fire size={16} weight={driverSeatHeat > 0 ? 'fill' : 'bold'} />
            <span className="text-[11px] font-bold">Driver Seat</span>
          </div>
          {/* 3 Level indicator dots */}
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((lvl) => (
              <span
                key={lvl}
                className={`w-2 h-2 rounded-full ${
                  driverSeatHeat >= lvl ? 'bg-rose-400' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </button>

        {/* Passenger Seat Heater */}
        <button
          type="button"
          onClick={() => handleSeatHeatCycle('passenger')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
            passSeatHeat > 0
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400'
          }`}
        >
          <div className="flex items-center gap-1">
            <Fire size={16} weight={passSeatHeat > 0 ? 'fill' : 'bold'} />
            <span className="text-[11px] font-bold">Passenger</span>
          </div>
          {/* 3 Level indicator dots */}
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((lvl) => (
              <span
                key={lvl}
                className={`w-2 h-2 rounded-full ${
                  passSeatHeat >= lvl ? 'bg-rose-400' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </button>

        {/* Front Windshield Defrost */}
        <button
          type="button"
          onClick={() => handleDefrostToggle('front')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
            frontDefrost
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm animate-pulse'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400'
          }`}
        >
          <Wind size={16} weight={frontDefrost ? 'fill' : 'bold'} />
          <span className="text-[11px] font-bold">Front Defrost</span>
        </button>

        {/* Rear Defrost */}
        <button
          type="button"
          onClick={() => handleDefrostToggle('rear')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
            rearDefrost
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400'
          }`}
        >
          <SunHorizon size={16} weight={rearDefrost ? 'fill' : 'bold'} />
          <span className="text-[11px] font-bold">Rear Defrost</span>
        </button>
      </div>
    </div>
  );
}
