/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BatteryCharging,
  Lightning,
  Plug,
  Pause,
  Play,
  Sparkle,
  WarningCircle,
  Info
} from '@phosphor-icons/react';
import { CarEvMetrics } from '../../types/mobility';
import { Gauge } from '../charts/gauge';
import { formatDecimal, roundToDecimals } from '../../utils/numberFormat';

interface ChargingControlCardProps {
  metrics: CarEvMetrics;
  actions: {
    startCharging?: (entityId?: string) => Promise<void>;
    toggleChargingState?: (pause: boolean, entityId?: string) => Promise<void>;
    setTargetSoc?: (target: number) => Promise<void>;
    syncVehicleData?: () => Promise<void>;
  };
  darkMode?: boolean;
}

export function ChargingControlCard({
  metrics,
  actions,
  darkMode = true
}: ChargingControlCardProps) {
  const isPluggedIn = metrics.isPluggedIn;
  const rawState = (metrics.chargingState || '').trim();
  const lowerState = rawState.toLowerCase();

  // Normalize Ford Mustang charging states
  const isStationNotDetected =
    lowerState.includes('station_not_detected') ||
    lowerState.includes('not_detected') ||
    (!isPluggedIn && !lowerState.includes('in_progress'));

  const isInProgress =
    lowerState.includes('in_progress') ||
    lowerState === 'charging' ||
    (lowerState.includes('charge') && !lowerState.includes('not') && !lowerState.includes('pause'));

  const isPaused =
    lowerState.includes('paused') || lowerState === 'pause' || lowerState.includes('stopped');

  const isNotReady =
    lowerState.includes('not_ready') ||
    (!isInProgress && !isPaused && !isStationNotDetected && isPluggedIn);

  // Local target SoC slider state
  const currentTargetSoc = metrics.targetSocPercent || 80;
  const [targetSoc, setTargetSoc] = useState<number>(currentTargetSoc);
  const [isSavingSoc, setIsSavingSoc] = useState(false);

  React.useEffect(() => {
    if (metrics.targetSocPercent) {
      setTargetSoc(metrics.targetSocPercent);
    }
  }, [metrics.targetSocPercent]);

  // Color mapping for gauge
  const socColor =
    metrics.soc < 20
      ? '#EF4444'
      : metrics.soc < 40
      ? '#F59E0B'
      : metrics.soc < 80
      ? '#06B6D4'
      : '#10B981';

  // Estimate time remaining to reach target SoC
  const timeRemainingEstimate = React.useMemo(() => {
    if (!isInProgress || metrics.chargingPowerKW <= 0 || metrics.soc >= targetSoc) {
      return null;
    }
    const batteryCapacity = 75;
    const socNeeded = (targetSoc - metrics.soc) / 100;
    const kwhNeeded = socNeeded * batteryCapacity;
    const hours = kwhNeeded / metrics.chargingPowerKW;
    const hrs = Math.floor(hours);
    const mins = Math.round((hours - hrs) * 60);
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${mins}m`;
  }, [isInProgress, metrics.chargingPowerKW, metrics.soc, targetSoc]);

  const handleSliderCommit = async (newVal: number) => {
    setTargetSoc(newVal);
    if (actions.setTargetSoc) {
      setIsSavingSoc(true);
      try {
        await actions.setTargetSoc(newVal);
      } finally {
        setTimeout(() => setIsSavingSoc(false), 500);
      }
    }
  };

  const canStartCharging = isPluggedIn && !isInProgress && !isPaused;
  const canPause = isPluggedIn && isInProgress;
  const canResume = isPluggedIn && isPaused;

  return (
    <div
      className={`w-full h-full rounded-3xl p-3.5 sm:p-7 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 transition-all relative overflow-hidden flex flex-col justify-between gap-5 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
        darkMode ? 'bg-black/20 text-white' : 'bg-white/20 text-slate-900'
      }`}
    >
      {/* Ambient background aura when actively charging */}
      {isInProgress && (
        <div
          className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none"
          style={{ clipPath: 'inset(0 round 24px)', WebkitClipPath: 'inset(0 round 24px)' }}
        >
          <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-emerald-500/15 blur-3xl animate-pulse" />
        </div>
      )}

      {/* Card Header: Title & EV Plug / State Badges */}
      <div className="flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              darkMode ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            <BatteryCharging size={22} weight="duotone" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black tracking-tight uppercase">
              Charging & Energy
            </h3>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              High-voltage EVSE telemetry & controls
            </p>
          </div>
        </div>

        {/* Plugged In Badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md shadow-xs ${
            isPluggedIn
              ? darkMode
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-emerald-100 text-emerald-900'
              : darkMode
              ? 'bg-slate-800/80 text-slate-400'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          <Plug
            size={14}
            weight="duotone"
            className={
              isPluggedIn
                ? darkMode
                  ? 'text-emerald-400'
                  : 'text-emerald-800'
                : 'text-slate-400'
            }
          />
          <span>{isPluggedIn ? 'EV Plug Connected' : 'Plug Disconnected'}</span>
        </div>
      </div>

      {/* Ford Charging State Banner (No harsh borders, high contrast) */}
      <div
        className={`p-3 rounded-2xl flex items-center justify-between text-xs font-bold transition-all shadow-xs ${
          isInProgress
            ? darkMode
              ? 'bg-emerald-500/15 text-emerald-300'
              : 'bg-emerald-100 text-emerald-900'
            : isPaused
            ? darkMode
              ? 'bg-amber-500/15 text-amber-300'
              : 'bg-amber-100 text-amber-900'
            : isNotReady
            ? darkMode
              ? 'bg-sky-500/15 text-sky-300'
              : 'bg-sky-100 text-sky-900'
            : darkMode
            ? 'bg-slate-800/60 text-slate-400'
            : 'bg-slate-100 text-slate-700'
        }`}
      >
        <div className="flex items-center gap-2">
          {isInProgress ? (
            <Lightning size={16} weight="fill" className={darkMode ? 'text-emerald-400 animate-pulse' : 'text-emerald-700 animate-pulse'} />
          ) : isPaused ? (
            <Pause size={16} weight="bold" className={darkMode ? 'text-amber-400' : 'text-amber-700'} />
          ) : isNotReady ? (
            <Info size={16} weight="bold" className={darkMode ? 'text-sky-400' : 'text-sky-700'} />
          ) : (
            <WarningCircle size={16} weight="bold" className="text-slate-400" />
          )}
          <span className="capitalize">
            {isInProgress
              ? 'Charging In Progress'
              : isPaused
              ? 'Charging Session Paused'
              : isNotReady
              ? 'Vehicle / EVSE Preparing (Not Ready)'
              : 'Station Not Detected'}
          </span>
        </div>

        {isInProgress && metrics.chargingPowerKW > 0 && (
          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
            {formatDecimal(metrics.chargingPowerKW)} kW
          </span>
        )}
      </div>

      {/* Central Circular SoC Gauge & Metrics */}
      <div className="relative py-1 flex flex-col items-center justify-center z-10">
        <div className="w-[190px] sm:w-[220px] max-w-full h-[140px] sm:h-[160px] mx-auto flex items-center justify-center relative">
          <Gauge
            value={roundToDecimals(metrics.soc)}
            centerValue={roundToDecimals(metrics.soc)}
            defaultLabel="BATTERY SOC"
            suffix="%"
            activeFill={socColor}
            inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}
            orientation="arc"
            notchCornerRadius={2}
            totalNotches={36}
            className="w-full h-full"
          />
        </div>

        {/* Live Power Rate Pill */}
        <div
          className={`mt-1 flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold font-mono backdrop-blur-sm shadow-xs ${
            darkMode ? 'bg-white/10 text-white' : 'bg-black/5 text-slate-900'
          }`}
        >
          <Lightning
            size={14}
            weight="fill"
            className={
              isInProgress
                ? darkMode
                  ? 'text-emerald-400 animate-pulse'
                  : 'text-emerald-600 animate-pulse'
                : 'text-slate-400'
            }
          />
          <span>{isInProgress ? `${formatDecimal(metrics.chargingPowerKW)} kW Throughput` : '0.0 kW Standby'}</span>
          {timeRemainingEstimate && (
            <>
              <span className="text-slate-400">•</span>
              <span className={darkMode ? 'text-cyan-400 font-bold' : 'text-cyan-700 font-bold'}>
                {timeRemainingEstimate} until {formatDecimal(targetSoc)}%
              </span>
            </>
          )}
        </div>
      </div>

      {/* Interactive Target SoC Slider (No harsh borders) */}
      <div
        className={`p-4 rounded-2xl space-y-3 relative z-10 backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
          darkMode ? 'bg-black/20 text-white' : 'bg-white/20 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between text-xs font-bold">
          <span className={`uppercase tracking-wider text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Target Charge Limit
          </span>
          <div className="flex items-center gap-1.5 font-mono font-bold text-cyan-600 dark:text-cyan-400">
            <span>{targetSoc}%</span>
            {isSavingSoc && <Sparkle size={12} weight="duotone" className="animate-spin text-cyan-400" />}
          </div>
        </div>

        <input
          type="range"
          min={50}
          max={100}
          step={5}
          value={targetSoc}
          onChange={(e) => setTargetSoc(Number(e.target.value))}
          onMouseUp={(e) => handleSliderCommit(Number((e.target as HTMLInputElement).value))}
          onTouchEnd={(e) => handleSliderCommit(Number((e.target as HTMLInputElement).value))}
          className={`w-full h-2 rounded-lg cursor-pointer accent-cyan-500 ${
            darkMode ? 'bg-slate-800' : 'bg-slate-300'
          }`}
        />

        {/* Quick Presets */}
        <div className="flex items-center justify-between gap-2 pt-1">
          {[
            { pct: 80, label: '80% Daily' },
            { pct: 90, label: '90%' },
            { pct: 100, label: '100% Trip' }
          ].map((preset) => (
            <button
              key={preset.pct}
              type="button"
              onClick={() => handleSliderCommit(preset.pct)}
              className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer shadow-xs ${
                targetSoc === preset.pct
                  ? darkMode
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'bg-cyan-600 text-white'
                  : darkMode
                  ? 'bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white'
                  : 'bg-black/5 hover:bg-black/10 text-slate-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conditional Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5 relative z-10">
        {/* Start Charging Button */}
        <button
          type="button"
          onClick={() => actions.startCharging?.()}
          disabled={!canStartCharging}
          className={`py-3 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
            canStartCharging
              ? darkMode
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 cursor-pointer'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md cursor-pointer'
              : isInProgress
              ? darkMode
                ? 'bg-emerald-500/15 text-emerald-400 cursor-default opacity-80'
                : 'bg-emerald-100 text-emerald-800 cursor-default'
              : darkMode
              ? 'bg-black/20 text-slate-500 cursor-not-allowed'
              : 'bg-white/20 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Lightning size={16} weight={isInProgress ? 'fill' : 'bold'} />
          <span className="truncate">
            {isInProgress
              ? 'Charging Active'
              : !isPluggedIn
              ? 'Plug In Cable'
              : isStationNotDetected
              ? 'No Station'
              : 'Start Charging'}
          </span>
        </button>

        {/* Pause / Resume Button */}
        <button
          type="button"
          onClick={() => actions.toggleChargingState?.(isInProgress)}
          disabled={!canPause && !canResume}
          className={`py-3 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
            canPause
              ? darkMode
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 cursor-pointer'
                : 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer'
              : canResume
              ? darkMode
                ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 cursor-pointer'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer'
              : darkMode
              ? 'bg-black/20 text-slate-500 cursor-not-allowed'
              : 'bg-white/20 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isInProgress ? (
            <>
              <Pause size={16} weight="bold" />
              <span>Pause Charge</span>
            </>
          ) : (
            <>
              <Play size={16} weight="bold" />
              <span>{canResume ? 'Resume Charge' : 'Standby'}</span>
            </>
          )}
        </button>
      </div>

      {/* Last Session Log Footer */}
      {metrics.lastChargingLog && (
        <div
          className={`pt-2 flex items-center justify-between text-[11px] border-t ${
            darkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-600'
          }`}
        >
          <span className="font-semibold uppercase tracking-wider text-[10px]">Last Session:</span>
          <span className={`font-mono truncate max-w-[220px] font-bold ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>
            {metrics.lastChargingLog}
          </span>
        </div>
      )}
    </div>
  );
}
