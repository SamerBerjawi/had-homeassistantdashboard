/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Lock,
  LockOpen,
  Fan,
  Lightning,
  SpeakerHigh,
  RoadHorizon,
  Thermometer,
  CloudArrowUp,
  Plug,
  BatteryMedium
} from '@phosphor-icons/react';
import { CarEvMetrics } from '../../types/mobility';
import { resolveAssetUrl } from '../../utils/assetUrl';
import { useUserConfig } from '../../contexts/ConfigContext';
import { LiquidWaveBattery } from './LiquidWaveBattery';
import { NumberTicker } from '../ui/NumberTicker';
import { UnlockConfirmModal } from './UnlockConfirmModal';
import { ClimateConfirmModal } from './ClimateConfirmModal';
import { formatDecimal } from '../../utils/numberFormat';

interface VehicleHeroCardProps {
  metrics: CarEvMetrics;
  actions: {
    lockCar: (entityId?: string) => Promise<void>;
    unlockCar: (entityId?: string) => Promise<void>;
    toggleRemoteClimate: (turnOn: boolean, entityId?: string) => Promise<void>;
    flashAndHonk: (entityId?: string) => Promise<void>;
    openChargePort?: () => Promise<void>;
    startCharging?: (entityId?: string) => Promise<void>;
  };
  onOpenCustomizer?: () => void;
  onSelectTab?: (tab: 'charging' | 'telemetry') => void;
  darkMode?: boolean;
}

export function VehicleHeroCard({
  metrics,
  actions,
  onSelectTab,
  darkMode = true
}: VehicleHeroCardProps) {
  const { config } = useUserConfig();
  const [imageError, setImageError] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [climateModalOpen, setClimateModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  React.useEffect(() => {
    setImageError(false);
  }, [metrics.customVehicleImage]);

  React.useEffect(() => {
    setLogoError(false);
  }, [metrics.customBrandLogo]);

  const resolvedCarImage = resolveAssetUrl(metrics.customVehicleImage, config?.updatedAt);
  const resolvedCarLogo = resolveAssetUrl(metrics.customBrandLogo, config?.updatedAt);
  const vehicleName = config.mobility?.car?.customName || 'Electric Vehicle';

  const isCharging = metrics.chargingState.toLowerCase().includes('charge');
  const isDriving = metrics.isMoving || metrics.speed > 0;
  const isPluggedIn = metrics.isPluggedIn;
  const isPortOpen = Boolean(metrics.chargePortOpen);

  const ota = metrics.softwareUpdates;
  const isOtaAvailable =
    ota.firmwareStatus.toLowerCase().includes('available') ||
    ota.firmwareStatus.toLowerCase().includes('pending') ||
    ota.firmwareStatus.toLowerCase().includes('download');

  // Dynamic ambient glow
  const ambientGlow = isCharging
    ? 'from-emerald-500/35 via-teal-500/15 to-transparent'
    : isDriving
    ? 'from-cyan-500/35 via-blue-500/15 to-transparent'
    : 'from-violet-500/25 via-indigo-500/10 to-transparent';

  const groundGlowColor = isCharging
    ? '#059669'
    : isDriving
    ? '#06B6D4'
    : '#8B5CF6';

  const handleAction = async (name: string, fn: () => Promise<void>) => {
    if (pendingAction) return;
    setPendingAction(name);
    try {
      await fn();
    } finally {
      setTimeout(() => setPendingAction(null), 400);
    }
  };

  const handleLockToggleClick = () => {
    if (metrics.doorsLocked) {
      setUnlockModalOpen(true);
    } else {
      handleAction('lock', async () => {
        await actions.lockCar();
      });
    }
  };

  // Plug / Charge Button Styling & Label
  const getPlugStateConfig = () => {
    if (isCharging) {
      return {
        label: 'Charging',
        classes: darkMode
          ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.35)] animate-pulse'
          : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 shadow-sm animate-pulse',
        iconClass: darkMode ? 'text-emerald-400' : 'text-emerald-700'
      };
    }
    if (isPluggedIn) {
      return {
        label: 'Plugged',
        classes: darkMode
          ? 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 shadow-[0_0_15px_rgba(14,165,233,0.25)]'
          : 'bg-sky-100 hover:bg-sky-200 text-sky-900 shadow-sm',
        iconClass: darkMode ? 'text-sky-400' : 'text-sky-700'
      };
    }
    if (isPortOpen) {
      return {
        label: 'Port Open',
        classes: darkMode
          ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
          : 'bg-amber-100 hover:bg-amber-200 text-amber-900 shadow-sm',
        iconClass: darkMode ? 'text-amber-400' : 'text-amber-700'
      };
    }
    return {
      label: 'Port',
      classes: darkMode
        ? 'bg-white/5 hover:bg-white/10 text-slate-300'
        : 'bg-slate-100 hover:bg-slate-200 text-slate-700',
      iconClass: darkMode ? 'text-slate-400' : 'text-slate-500'
    };
  };

  const plugConfig = getPlugStateConfig();

  return (
    <div
      className={`w-full h-full rounded-3xl p-3.5 sm:p-7 overflow-hidden isolate backdrop-blur-xl border border-slate-200/50 dark:border-white/5 transition-all flex flex-col justify-between relative shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
        darkMode ? 'bg-black/20 text-white' : 'bg-white/20 text-slate-900'
      }`}
    >
      {/* Background Ambient Lighting Gradient */}
      <div
        className={`absolute -top-24 -left-20 -right-20 h-72 bg-gradient-to-b ${ambientGlow} blur-3xl pointer-events-none opacity-50 transition-all duration-700`}
      />

      {/* Top Header: Vehicle Title & Status Pill (No Subtitle) */}
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          {resolvedCarLogo && !logoError ? (
            <img
              src={resolvedCarLogo}
              alt="Brand Logo"
              className="h-7 sm:h-8 max-w-[110px] object-contain drop-shadow-sm"
              onError={() => setLogoError(true)}
            />
          ) : null}
          <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
            <span className={darkMode ? 'text-white' : 'text-slate-900'}>{vehicleName}</span>
          </h2>
        </div>

        {/* Dynamic Highlighted Status Pill (Only Parked or Driving, no redundant gear) */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black tracking-wide backdrop-blur-md transition-all shadow-sm ${
              isDriving
                ? darkMode
                  ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                  : 'bg-cyan-100 text-cyan-900'
                : isCharging
                ? darkMode
                  ? 'bg-emerald-500/20 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                  : 'bg-emerald-100 text-emerald-900'
                : darkMode
                ? 'bg-violet-500/15 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.25)]'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isDriving
                  ? 'bg-cyan-400 animate-ping'
                  : isCharging
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-violet-400'
              }`}
            />
            <span>
              {isDriving
                ? 'Driving'
                : isCharging
                ? metrics.chargingPowerKW > 0
                  ? `Charging • ${metrics.chargingPowerKW} kW`
                  : 'Charging'
                : 'Parked'}
            </span>
          </div>
        </div>
      </div>

      {/* Vehicle Stage Canvas: Clearly below the vehicle name and logo */}
      <div className="relative my-3 sm:my-4 flex flex-col items-center justify-center z-10">
        {/* Underbody Ambient Glow */}
        <div
          className="absolute bottom-2 w-3/4 sm:w-2/3 h-12 rounded-full blur-2xl opacity-40 pointer-events-none transition-all duration-700"
          style={{ backgroundColor: groundGlowColor }}
        />

        {/* Vehicle Render */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative max-w-full flex items-center justify-center group"
        >
          {resolvedCarImage && !imageError ? (
            <img
              src={resolvedCarImage}
              alt={vehicleName}
              className="max-h-56 sm:max-h-64 w-auto object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.35)] dark:drop-shadow-[0_25px_35px_rgba(0,0,0,0.7)] select-none transition-transform duration-500 group-hover:scale-[1.02]"
              onError={() => setImageError(true)}
            />
          ) : (
            /* Elegant Automotive Silhouette Fallback SVG */
            <div className="w-[320px] sm:w-[420px] max-w-full h-[150px] sm:h-[185px] flex items-center justify-center">
              <svg
                viewBox="0 0 500 200"
                className="w-full h-full drop-shadow-md"
                fill="none"
              >
                <defs>
                  <linearGradient id="evBodyGradOverlap2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={darkMode ? '#334155' : '#64748B'} />
                    <stop offset="50%" stopColor={darkMode ? '#1E293B' : '#334155'} />
                    <stop offset="100%" stopColor={darkMode ? '#0F172A' : '#1E293B'} />
                  </linearGradient>
                  <linearGradient id="evGlassGradOverlap2" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#0284C7" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
                <ellipse cx="250" cy="178" rx="220" ry="14" fill="#000000" opacity={darkMode ? 0.6 : 0.25} />
                <path
                  d="M 40 135 C 45 125, 75 112, 120 110 C 150 82, 215 54, 300 52 C 370 52, 420 75, 455 118 C 475 128, 480 140, 470 152 C 450 158, 400 158, 390 158 C 378 140, 345 130, 320 142 C 308 152, 300 158, 200 158 C 188 140, 155 130, 130 142 C 118 152, 110 158, 55 158 C 40 152, 35 144, 40 135 Z"
                  fill="url(#evBodyGradOverlap2)"
                />
                <path
                  d="M 160 105 C 185 82, 230 62, 295 60 C 350 60, 395 76, 425 105 Z"
                  fill="url(#evGlassGradOverlap2)"
                />
                <path d="M 65 125 Q 230 115 440 128" stroke="#38BDF8" strokeWidth="1.5" opacity="0.8" />
                <g transform="translate(130, 158)">
                  <circle cx="0" cy="0" r="28" fill={darkMode ? '#0F172A' : '#1E293B'} />
                  <circle cx="0" cy="0" r="18" fill="#06B6D4" opacity="0.3" />
                  <circle cx="0" cy="0" r="7" fill="#38BDF8" />
                </g>
                <g transform="translate(365, 158)">
                  <circle cx="0" cy="0" r="28" fill={darkMode ? '#0F172A' : '#1E293B'} />
                  <circle cx="0" cy="0" r="18" fill="#06B6D4" opacity="0.3" />
                  <circle cx="0" cy="0" r="7" fill="#38BDF8" />
                </g>
              </svg>
            </div>
          )}
        </motion.div>
      </div>

      {/* ========================================================================= */}
      {/* HERO BENTO COCKPIT: Left 40% Battery Card + Right 60% Stack of 3 Tiles     */}
      {/* ========================================================================= */}
      <div className="relative z-20 grid grid-cols-12 gap-2.5 sm:gap-3 mb-4 items-stretch">
        {/* Left Column (40% width / col-span-5): Battery, Range, Charging, 12V */}
        <div
          onClick={() => onSelectTab?.('charging')}
          className={`col-span-5 p-3 sm:p-4 rounded-2xl transition-all cursor-pointer flex flex-col justify-between group backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
            darkMode
              ? 'bg-black/20 hover:bg-black/30 text-white'
              : 'bg-white/20 hover:bg-white/30 text-slate-900'
          }`}
        >
          {/* Top: Liquid Wave in Rounded Rectangle */}
          <div className="flex justify-center my-auto py-1">
            <LiquidWaveBattery
              soc={metrics.soc}
              isCharging={isCharging}
              powerKw={metrics.chargingPowerKW}
              darkMode={darkMode}
            />
          </div>

          {/* Bottom Telemetry Metrics */}
          <div className="space-y-1 sm:space-y-1.5 pt-1 border-t border-white/5">
            {/* Range */}
            <div className="flex items-baseline justify-between">
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Range
              </span>
              <span className={`font-mono text-sm sm:text-base font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {formatDecimal(metrics.range)} {metrics.rangeUnit}
              </span>
            </div>

            {/* 12V Battery Health */}
            <div className="flex items-center justify-between text-[11px]">
              <span className={`text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <BatteryMedium size={12} weight="bold" className="text-emerald-500" />
                12V Aux
              </span>
              <span className={`font-mono text-[10px] font-bold ${
                metrics.battery12V > 12 ? 'text-emerald-500' : 'text-amber-500'
              }`}>
                {formatDecimal(metrics.battery12V)}V
              </span>
            </div>

            {/* Charging State Pill */}
            <div className="flex items-center justify-between text-[11px]">
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Status
              </span>
              <span className={`font-mono text-[10px] font-bold truncate max-w-[85px] ${
                isCharging ? 'text-emerald-400 font-black' : isPluggedIn ? 'text-sky-400' : darkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {isCharging ? 'Active' : isPluggedIn ? 'Plugged' : 'Standby'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (60% width / col-span-7): 3 Vertically Stacked Compact Tiles */}
        <div className="col-span-7 flex flex-col justify-between gap-2 sm:gap-2.5">
          {/* Tile 1: Odometer */}
          <div
            onClick={() => onSelectTab?.('telemetry')}
            className={`flex-1 p-2.5 sm:p-3 rounded-2xl transition-all cursor-pointer flex items-center gap-2 sm:gap-3 group backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
              darkMode
                ? 'bg-black/20 hover:bg-black/30 text-white'
                : 'bg-white/20 hover:bg-white/30 text-slate-900'
            }`}
          >
            <div
              className={`w-7 h-7 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${
                darkMode ? 'bg-white/5 text-cyan-400' : 'bg-cyan-100 text-cyan-800'
              }`}
            >
              <RoadHorizon size={16} weight="duotone" />
            </div>

            <div className="flex flex-col min-w-0">
              <span
                className={`text-xs sm:text-base font-black tracking-tight font-mono truncate ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                {formatDecimal(metrics.odometer)} {metrics.odometerUnit}
              </span>
              <span
                className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider truncate ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Total Distance
              </span>
            </div>
          </div>

          {/* Tile 2: Cabin Temperature */}
          <div
            onClick={() => onSelectTab?.('telemetry')}
            className={`flex-1 p-2.5 sm:p-3 rounded-2xl transition-all cursor-pointer flex items-center gap-2 sm:gap-3 group backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
              darkMode
                ? 'bg-black/20 hover:bg-black/30 text-white'
                : 'bg-white/20 hover:bg-white/30 text-slate-900'
            }`}
          >
            <div
              className={`w-7 h-7 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${
                darkMode ? 'bg-white/5 text-amber-400' : 'bg-amber-100 text-amber-800'
              }`}
            >
              <Thermometer size={16} weight="duotone" />
            </div>

            <div className="flex flex-col min-w-0">
              <span
                className={`text-xs sm:text-base font-black tracking-tight font-mono truncate ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                {metrics.cabinTemp ? `${formatDecimal(metrics.cabinTemp)}°C` : '--'}
              </span>
              <span
                className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider truncate ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Cabin Temp
              </span>
            </div>
          </div>

          {/* Tile 3: Software OTA Update */}
          <div
            onClick={() => onSelectTab?.('telemetry')}
            className={`flex-1 p-2.5 sm:p-3 rounded-2xl transition-all cursor-pointer flex items-center gap-2 sm:gap-3 group backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
              isOtaAvailable
                ? darkMode
                  ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                : darkMode
                ? 'bg-black/20 hover:bg-black/30 text-white'
                : 'bg-white/20 hover:bg-white/30 text-slate-900'
            }`}
          >
            <div
              className={`w-7 h-7 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isOtaAvailable
                  ? 'bg-amber-400/20 text-amber-500 animate-bounce'
                  : darkMode
                  ? 'bg-white/5 text-indigo-400'
                  : 'bg-indigo-100 text-indigo-700'
              }`}
            >
              <CloudArrowUp size={16} weight="duotone" />
            </div>

            <div className="flex flex-col min-w-0">
              <span
                className={`text-xs sm:text-base font-black tracking-tight truncate ${
                  isOtaAvailable
                    ? 'text-amber-500'
                    : darkMode
                    ? 'text-emerald-400'
                    : 'text-emerald-700'
                }`}
              >
                {isOtaAvailable ? 'Update Available' : 'Up to Date'}
              </span>
              <span
                className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider truncate ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                OTA Update
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Quick Action Dock */}
      <div
        className={`relative z-20 pt-2.5 border-t ${
          darkMode ? 'border-white/10' : 'border-slate-200/70'
        }`}
      >
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full max-w-lg mx-auto">
          {/* Colorized Lock / Unlock Tile */}
          <button
            type="button"
            onClick={handleLockToggleClick}
            disabled={pendingAction === 'lock'}
            title={metrics.doorsLocked ? 'Swipe to unlock vehicle' : 'Lock vehicle'}
            className={`w-full h-full min-h-[76px] sm:min-h-[82px] py-2.5 px-1 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
              metrics.doorsLocked
                ? darkMode
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900'
                : darkMode
                ? 'bg-amber-500/25 hover:bg-amber-500/35 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.35)] animate-pulse'
                : 'bg-amber-100 hover:bg-amber-200 text-amber-900 animate-pulse'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner ${
                metrics.doorsLocked
                  ? darkMode
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-emerald-200 text-emerald-800'
                  : darkMode
                  ? 'bg-amber-500/30 text-amber-300'
                  : 'bg-amber-200 text-amber-800'
              }`}
            >
              {metrics.doorsLocked ? (
                <Lock size={20} weight="fill" />
              ) : (
                <LockOpen size={20} weight="fill" />
              )}
            </div>
            <span className="text-[11px] font-bold truncate w-full text-center">
              {metrics.doorsLocked ? 'Locked' : 'Unlocked'}
            </span>
          </button>

          {/* Climate Preconditioning Button */}
          <button
            type="button"
            onClick={() => setClimateModalOpen(true)}
            disabled={pendingAction === 'climate'}
            title={metrics.remoteClimateActive ? 'Stop climate preconditioning' : 'Start climate preconditioning'}
            className={`w-full h-full min-h-[76px] sm:min-h-[82px] py-2.5 px-1 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
              metrics.remoteClimateActive
                ? darkMode
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
                  : 'bg-rose-100 hover:bg-rose-200 text-rose-900'
                : darkMode
                ? 'bg-black/20 hover:bg-black/30 text-slate-200'
                : 'bg-white/20 hover:bg-white/30 text-slate-800'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                darkMode ? 'bg-white/10' : 'bg-white shadow-xs'
              }`}
            >
              <Fan
                size={20}
                weight="duotone"
                className={
                  metrics.remoteClimateActive
                    ? 'text-rose-500 animate-spin'
                    : darkMode
                    ? 'text-cyan-400'
                    : 'text-cyan-600'
                }
              />
            </div>
            <span className="text-[11px] font-bold truncate w-full text-center">
              {metrics.remoteClimateActive
                ? `${metrics.remoteClimateTimeRemaining || 15}m Stop`
                : 'Climate'}
            </span>
          </button>

          {/* Colorized Plug / Charging Tile */}
          <button
            type="button"
            onClick={() =>
              handleAction('charge', async () => {
                if (actions.openChargePort) {
                  await actions.openChargePort();
                } else if (actions.startCharging) {
                  await actions.startCharging();
                }
              })
            }
            disabled={pendingAction === 'charge'}
            title={isCharging ? 'Charging active' : isPluggedIn ? 'Plugged in' : 'Open charge port'}
            className={`w-full h-full min-h-[76px] sm:min-h-[82px] py-2.5 px-1 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${plugConfig.classes}`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                darkMode ? 'bg-white/10' : 'bg-white shadow-xs'
              }`}
            >
              {isCharging ? (
                <Lightning size={20} weight="fill" className={plugConfig.iconClass} />
              ) : isPluggedIn ? (
                <Plug size={20} weight="duotone" className={plugConfig.iconClass} />
              ) : (
                <Lightning size={20} weight="bold" className={plugConfig.iconClass} />
              )}
            </div>
            <span className="text-[11px] font-bold truncate w-full text-center">
              {plugConfig.label}
            </span>
          </button>

          {/* Flash & Horn Button */}
          <button
            type="button"
            onClick={() =>
              handleAction('horn', async () => {
                await actions.flashAndHonk();
              })
            }
            disabled={pendingAction === 'horn'}
            title="Flash hazard lights & chirp horn"
            className={`w-full h-full min-h-[76px] sm:min-h-[82px] py-2.5 px-1 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
              darkMode
                ? 'bg-black/20 hover:bg-black/30 text-slate-200'
                : 'bg-white/20 hover:bg-white/30 text-slate-800'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                darkMode ? 'bg-white/10' : 'bg-white shadow-xs'
              }`}
            >
              <SpeakerHigh
                size={20}
                weight="duotone"
                className={darkMode ? 'text-amber-400' : 'text-amber-600'}
              />
            </div>
            <span className="text-[11px] font-bold truncate w-full text-center">Horn & Flash</span>
          </button>
        </div>
      </div>

      {/* Swipe to Unlock Security Modal */}
      <UnlockConfirmModal
        isOpen={unlockModalOpen}
        onClose={() => setUnlockModalOpen(false)}
        onConfirmUnlock={actions.unlockCar}
        vehicleName={vehicleName}
        darkMode={darkMode}
      />

      {/* Climate Preconditioning Confirmation Modal */}
      <ClimateConfirmModal
        isOpen={climateModalOpen}
        onClose={() => setClimateModalOpen(false)}
        onConfirm={async () => {
          await actions.toggleRemoteClimate(!metrics.remoteClimateActive);
        }}
        isActive={metrics.remoteClimateActive}
        targetTemp={metrics.targetCabinTemp || 21}
        timeRemaining={metrics.remoteClimateTimeRemaining || 15}
        vehicleName={vehicleName}
        darkMode={darkMode}
      />
    </div>
  );
}
