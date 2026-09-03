/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Native Smart E-Bike Companion Dashboard
 * Applied exact automotive cockpit design principles:
 * - 40/60 Bento Hero split with liquid wave battery & 3 stacked telemetry tiles
 * - Borderless elevated glass aesthetic with high-contrast light/dark modes
 * - Equal-height 3-column panoramic desktop & compact-padding mobile sequence
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bicycle,
  ShieldWarning,
  BatteryCharging,
  Flame,
  TreeEvergreen,
  Lock,
  LockOpen,
  Sparkle,
  RoadHorizon,
  ArrowsClockwise,
  Radioactive,
  NavigationArrow,
  Globe,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  CheckCircle,
  Pulse
} from '@phosphor-icons/react';
import { BikeMetrics } from '../../../types/mobility';
import { resolveAssetUrl } from '../../../utils/assetUrl';
import { useUserConfig } from '../../../contexts/ConfigContext';
import { LiquidWaveBattery } from '../../mobility/LiquidWaveBattery';
import { NumberTicker } from '../../ui/NumberTicker';
import { Gauge } from '../../charts/gauge';
import { ActionConfirmModal } from './ActionConfirmModal';
import { formatDecimal } from '../../../utils/numberFormat';

interface BikeTabProps {
  metrics: BikeMetrics;
  actions: {
    toggleBikeLock: (shouldLock: boolean) => Promise<void>;
    requestBikeSync: () => Promise<void>;
  };
  onOpenCustomizer: () => void;
  darkMode?: boolean;
}

type BikeModalType = 'lock' | 'unlock' | 'toggle_autolock' | 'theft_beacon' | 'sync_telemetry' | null;

export function BikeTab({
  metrics,
  actions,
  darkMode = true
}: BikeTabProps) {
  const { config } = useUserConfig();
  const [activeModal, setActiveModal] = useState<BikeModalType>(null);
  const [isActionPending, setIsActionPending] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [zoomDelta, setZoomDelta] = useState<number>(0.007);

  React.useEffect(() => {
    setImageError(false);
  }, [metrics.customBikeImage]);

  React.useEffect(() => {
    setLogoError(false);
  }, [metrics.customBrandLogo]);

  const resolvedBikeImage = resolveAssetUrl(metrics.customBikeImage, config?.updatedAt);
  const resolvedBikeLogo = resolveAssetUrl(metrics.customBrandLogo, config?.updatedAt);
  const bikeName = config.mobility?.bike?.customName || 'Smart E-Bike';

  // Ambient underbody glow
  const ambientGlow = metrics.isLocked
    ? 'from-rose-500/20 via-orange-500/10 to-transparent'
    : 'from-amber-500/30 via-orange-500/15 to-transparent';

  const groundGlowColor = metrics.isLocked ? '#E11D48' : '#D97706';

  const triggerFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 2500);
  };

  const handleExecuteModalAction = async () => {
    if (!activeModal) return;
    setIsActionPending(true);

    try {
      switch (activeModal) {
        case 'lock':
          await actions.toggleBikeLock(true);
          triggerFeedback('E-Bike motor locked & armed');
          break;
        case 'unlock':
          await actions.toggleBikeLock(false);
          triggerFeedback('E-Bike unlocked & ready to ride');
          break;
        case 'toggle_autolock':
          triggerFeedback('Auto-lock proximity profile updated');
          break;
        case 'theft_beacon':
          triggerFeedback('Emergency GPS & cellular beacon broadcasting');
          break;
        case 'sync_telemetry':
          await actions.requestBikeSync();
          triggerFeedback('E-Bike BLE & GPS telemetry synced');
          break;
      }
    } finally {
      setIsActionPending(false);
      setActiveModal(null);
    }
  };

  // Map settings
  const lat = metrics.gps?.latitude || 37.7749;
  const lon = metrics.gps?.longitude || -122.4194;
  const delta = Math.max(0.002, Math.min(0.04, zoomDelta));
  const latMin = lat - delta * 0.7;
  const latMax = lat + delta * 0.7;
  const lonMin = lon - delta;
  const lonMax = lon + delta;

  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lonMin}%2C${latMin}%2C${lonMax}%2C${latMax}&layer=mapnik&marker=${lat}%2C${lon}`;
  const osmDirectUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;

  const handleZoomIn = () => setZoomDelta((prev) => Math.max(0.002, prev * 0.6));
  const handleZoomOut = () => setZoomDelta((prev) => Math.min(0.04, prev * 1.5));

  // Daily goal calculation
  const dailyGoalKm = 20;
  const progressDaily = Math.min(100, Math.round((metrics.distanceTodayKm / dailyGoalKm) * 100));

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* Toast Feedback */}
      <AnimatePresence>
        {actionFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-2xl bg-slate-950/90 text-white shadow-2xl flex items-center gap-2.5 text-xs font-bold"
          >
            <Sparkle size={16} weight="duotone" className="text-amber-400 animate-spin" />
            <span>{actionFeedback}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emergency Theft / Crash Alert Banner */}
      {(metrics.isStolen || metrics.isCrashed) && (
        <div className="p-4 rounded-3xl bg-rose-500/20 text-rose-900 dark:text-white flex items-center justify-between gap-4 shadow-lg animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
              <ShieldWarning size={24} weight="bold" />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-wider text-rose-600 dark:text-rose-300">
                {metrics.isStolen ? 'EMERGENCY: THEFT DETECTED' : 'CRASH SENSOR TRIGGERED'}
              </h4>
              <p className="text-xs text-rose-800 dark:text-rose-100/90 font-medium">
                Cellular beacon active • GPS coordinates streaming live
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3-COLUMN PANORAMIC (DESKTOP) / 3 STACKED SECTIONS (MOBILE)                */}
      {/* ========================================================================= */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
        
        {/* ========================================================================= */}
        {/* COLUMN 1: E-BIKE HERO COCKPIT & ACTIONS                                   */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 h-full flex flex-col">
          <div
            className={`w-full h-full rounded-3xl p-3.5 sm:p-7 overflow-hidden isolate backdrop-blur-2xl transition-all flex flex-col justify-between relative ${
              darkMode
                ? 'bg-slate-900/70 text-white shadow-[0_20px_60px_rgba(0,0,0,0.6)]'
                : 'bg-white/95 text-slate-900 shadow-xl shadow-slate-200/80'
            }`}
          >
            {/* Ambient Background Gradient */}
            <div
              className={`absolute -top-24 -left-20 -right-20 h-72 bg-gradient-to-b ${ambientGlow} blur-3xl pointer-events-none opacity-50 transition-all duration-700`}
            />

            {/* Header: Brand Logo / Bike Name & Dynamic Status Pill */}
            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {resolvedBikeLogo && !logoError ? (
                  <img
                    src={resolvedBikeLogo}
                    alt="Brand Logo"
                    className="h-7 sm:h-8 max-w-[110px] object-contain drop-shadow-sm"
                    onError={() => setLogoError(true)}
                  />
                ) : null}
                <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                  <span className={darkMode ? 'text-white' : 'text-slate-900'}>{bikeName}</span>
                </h2>
              </div>

              {/* Status Pill */}
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black tracking-wide backdrop-blur-md shadow-sm ${
                  metrics.isLocked
                    ? darkMode
                      ? 'bg-rose-500/15 text-rose-300'
                      : 'bg-rose-100 text-rose-900'
                    : darkMode
                    ? 'bg-amber-500/15 text-amber-300'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    metrics.isLocked ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'
                  }`}
                />
                <span>{metrics.isLocked ? 'Locked' : 'Ready to Ride'}</span>
              </div>
            </div>

            {/* Bike Stage Canvas: Clearly below the bike name and logo */}
            <div className="relative my-3 sm:my-4 flex flex-col items-center justify-center z-10">
              {/* Underbody Glow */}
              <div
                className="absolute bottom-2 w-3/4 sm:w-2/3 h-10 rounded-full blur-2xl opacity-40 pointer-events-none transition-all duration-700"
                style={{ backgroundColor: groundGlowColor }}
              />

              {/* Bike Render */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="relative max-w-full flex items-center justify-center group"
              >
                {resolvedBikeImage && !imageError ? (
                  <img
                    src={resolvedBikeImage}
                    alt={bikeName}
                    className="max-h-52 sm:max-h-60 w-auto object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.35)] dark:drop-shadow-[0_25px_35px_rgba(0,0,0,0.7)] select-none transition-transform duration-500 group-hover:scale-[1.02]"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  /* Stealth E-Bike Vector */
                  <div className="w-[300px] sm:w-[380px] max-w-full h-[150px] sm:h-[180px] flex items-center justify-center">
                    <svg viewBox="0 0 380 180" className="w-full h-full drop-shadow-md">
                      <defs>
                        <linearGradient id="bikeFrameGradDark2" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor={darkMode ? '#334155' : '#64748B'} />
                          <stop offset="50%" stopColor={darkMode ? '#1E293B' : '#334155'} />
                          <stop offset="100%" stopColor={darkMode ? '#0F172A' : '#1E293B'} />
                        </linearGradient>
                      </defs>
                      <ellipse cx="190" cy="160" rx="150" ry="10" fill="#000000" opacity={darkMode ? 0.6 : 0.25} />
                      <g transform="translate(85, 120)">
                        <circle cx="0" cy="0" r="42" fill="none" stroke={darkMode ? '#1E293B' : '#334155'} strokeWidth="6" />
                        <circle cx="0" cy="0" r="38" fill="none" stroke={darkMode ? '#0F172A' : '#1E293B'} strokeWidth="2" />
                        <circle cx="0" cy="0" r="10" fill="#F59E0B" opacity="0.8" />
                        <circle cx="0" cy="0" r="4" fill="#FFFFFF" />
                      </g>
                      <g transform="translate(295, 120)">
                        <circle cx="0" cy="0" r="42" fill="none" stroke={darkMode ? '#1E293B' : '#334155'} strokeWidth="6" />
                        <circle cx="0" cy="0" r="38" fill="none" stroke={darkMode ? '#0F172A' : '#1E293B'} strokeWidth="2" />
                        <circle cx="0" cy="0" r="8" fill="#334155" />
                        <circle cx="0" cy="0" r="4" fill="#FFFFFF" />
                      </g>
                      <line x1="85" y1="120" x2="165" y2="120" stroke="url(#bikeFrameGradDark2)" strokeWidth="8" strokeLinecap="round" />
                      <line x1="85" y1="120" x2="145" y2="65" stroke="url(#bikeFrameGradDark2)" strokeWidth="6" strokeLinecap="round" />
                      <line x1="165" y1="120" x2="140" y2="50" stroke="url(#bikeFrameGradDark2)" strokeWidth="8" strokeLinecap="round" />
                      <line x1="165" y1="120" x2="260" y2="60" stroke="#0F172A" strokeWidth="16" strokeLinecap="round" />
                      <line x1="170" y1="116" x2="255" y2="64" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
                      <line x1="145" y1="65" x2="260" y2="60" stroke="url(#bikeFrameGradDark2)" strokeWidth="7" strokeLinecap="round" />
                      <line x1="260" y1="60" x2="295" y2="120" stroke="url(#bikeFrameGradDark2)" strokeWidth="7" strokeLinecap="round" />
                      <line x1="260" y1="60" x2="255" y2="40" stroke="#475569" strokeWidth="6" strokeLinecap="round" />
                      <path d="M 245 38 Q 260 35 275 42" stroke="#F59E0B" strokeWidth="5" fill="none" strokeLinecap="round" />
                      <path d="M 125 46 C 135 44, 155 44, 160 48" stroke="#334155" strokeWidth="6" fill="none" strokeLinecap="round" />
                      <circle cx="270" cy="50" r="4" fill="#38BDF8" className="animate-pulse" />
                    </svg>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Bento Cockpit: Left 40% Battery Card + Right 60% Stack of 3 Tiles */}
            <div className="relative z-20 grid grid-cols-12 gap-2.5 sm:gap-3 mb-4 items-stretch">
              {/* Left Column (40% width / col-span-5) */}
              <div
                className={`col-span-5 p-3 sm:p-4 rounded-2xl transition-all flex flex-col justify-between shadow-sm ${
                  darkMode
                    ? 'bg-slate-900/80 text-white shadow-black/20'
                    : 'bg-slate-100/90 text-slate-900 shadow-slate-200/60'
                }`}
              >
                <div className="flex justify-center my-auto py-1">
                  <LiquidWaveBattery
                    soc={metrics.batteryPercent}
                    isCharging={false}
                    darkMode={darkMode}
                  />
                </div>

                <div className="mt-2 space-y-1 text-center sm:text-left">
                  <div className="flex items-baseline justify-center sm:justify-start gap-1">
                    <span
                      className={`text-xl sm:text-3xl font-black tracking-tight font-mono ${
                        darkMode ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      <NumberTicker value={Math.round(metrics.remainingRangeKm)} />
                    </span>
                    <span
                      className={`text-[10px] sm:text-xs font-bold font-mono ${
                        darkMode ? 'text-emerald-400' : 'text-emerald-600'
                      }`}
                    >
                      km
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] sm:text-[11px] font-mono font-semibold pt-1 border-t border-slate-200/50 dark:border-white/10 gap-0.5">
                    <span
                      className={
                        darkMode
                          ? 'text-emerald-400 font-bold'
                          : 'text-emerald-700 font-bold'
                      }
                    >
                      Health: {formatDecimal(metrics.batteryHealthPercent)}%
                    </span>
                    <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                      PCB: {formatDecimal(metrics.internalPcbBattery)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column (60% width / col-span-7): 3 Vertically Stacked Compact Tiles */}
              <div className="col-span-7 flex flex-col justify-between gap-2 sm:gap-2.5">
                {/* Tile 1: Total Distance / Odometer */}
                <div
                  className={`flex-1 p-2.5 sm:p-3 rounded-2xl transition-all flex items-center gap-2 sm:gap-3 shadow-sm ${
                    darkMode
                      ? 'bg-slate-900/80 text-white shadow-black/20'
                      : 'bg-slate-100/90 text-slate-900 shadow-slate-200/60'
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
                      {formatDecimal(metrics.mileageKm)} km
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

                {/* Tile 2: Today's Ride Activity */}
                <div
                  className={`flex-1 p-2.5 sm:p-3 rounded-2xl transition-all flex items-center gap-2 sm:gap-3 shadow-sm ${
                    darkMode
                      ? 'bg-slate-900/80 text-white shadow-black/20'
                      : 'bg-slate-100/90 text-slate-900 shadow-slate-200/60'
                  }`}
                >
                  <div
                    className={`w-7 h-7 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      darkMode ? 'bg-white/5 text-amber-400' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    <Flame size={16} weight="duotone" />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span
                      className={`text-xs sm:text-base font-black tracking-tight font-mono truncate ${
                        darkMode ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {formatDecimal(metrics.distanceTodayKm)} km
                    </span>
                    <span
                      className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider truncate ${
                        darkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      Today's Ride
                    </span>
                  </div>
                </div>

                {/* Tile 3: Security & Motor State */}
                <div
                  className={`flex-1 p-2.5 sm:p-3 rounded-2xl transition-all flex items-center gap-2 sm:gap-3 shadow-sm ${
                    metrics.isLocked
                      ? darkMode
                        ? 'bg-rose-500/15 text-rose-300'
                        : 'bg-rose-100 text-rose-900'
                      : darkMode
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-emerald-100 text-emerald-900'
                  }`}
                >
                  <div
                    className={`w-7 h-7 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      metrics.isLocked
                        ? darkMode
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-rose-200 text-rose-800'
                        : darkMode
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-emerald-200 text-emerald-800'
                    }`}
                  >
                    {metrics.isLocked ? (
                      <Lock size={16} weight="fill" />
                    ) : (
                      <LockOpen size={16} weight="fill" />
                    )}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="text-xs sm:text-base font-black tracking-tight truncate">
                      {metrics.isLocked ? 'Motor Locked' : 'Ready to Ride'}
                    </span>
                    <span
                      className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider truncate ${
                        darkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      Security Status
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Dock */}
            <div
              className={`relative z-20 pt-2.5 border-t ${
                darkMode ? 'border-white/10' : 'border-slate-200/70'
              }`}
            >
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full max-w-lg mx-auto">
                {/* Lock / Unlock Tile */}
                <button
                  type="button"
                  onClick={() => setActiveModal(metrics.isLocked ? 'unlock' : 'lock')}
                  disabled={isActionPending}
                  className={`w-full h-full min-h-[76px] sm:min-h-[82px] py-2.5 px-1 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                    metrics.isLocked
                      ? darkMode
                        ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300'
                        : 'bg-rose-100 hover:bg-rose-200 text-rose-900'
                      : darkMode
                      ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300'
                      : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900'
                  }`}
                >
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-inner ${
                      metrics.isLocked
                        ? darkMode
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-rose-200 text-rose-800'
                        : darkMode
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-emerald-200 text-emerald-800'
                    }`}
                  >
                    {metrics.isLocked ? <Lock size={18} weight="fill" /> : <LockOpen size={18} weight="fill" />}
                  </div>
                  <span className="text-[11px] font-bold truncate w-full text-center">
                    {metrics.isLocked ? 'Locked' : 'Unlocked'}
                  </span>
                </button>

                {/* Auto-Lock Proximity */}
                <button
                  type="button"
                  onClick={() => setActiveModal('toggle_autolock')}
                  disabled={isActionPending}
                  className={`w-full h-full min-h-[76px] sm:min-h-[82px] py-2.5 px-1 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                    darkMode
                      ? 'bg-white/5 hover:bg-white/10 text-slate-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                      darkMode ? 'bg-white/10' : 'bg-white shadow-xs'
                    }`}
                  >
                    <CheckCircle size={18} weight="duotone" className="text-cyan-500" />
                  </div>
                  <span className="text-[11px] font-bold truncate w-full text-center">Auto-Lock</span>
                </button>

                {/* Emergency Theft Beacon */}
                <button
                  type="button"
                  onClick={() => setActiveModal('theft_beacon')}
                  disabled={isActionPending}
                  className={`w-full h-full min-h-[76px] sm:min-h-[82px] py-2.5 px-1 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                    metrics.isStolen
                      ? 'bg-rose-500/20 text-rose-300 animate-pulse'
                      : darkMode
                      ? 'bg-white/5 hover:bg-white/10 text-slate-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                      darkMode ? 'bg-white/10' : 'bg-white shadow-xs'
                    }`}
                  >
                    <Radioactive size={18} weight="duotone" className="text-rose-500" />
                  </div>
                  <span className="text-[11px] font-bold truncate w-full text-center">Find Beacon</span>
                </button>

                {/* Sync BLE Telemetry */}
                <button
                  type="button"
                  onClick={() => setActiveModal('sync_telemetry')}
                  disabled={isActionPending}
                  className={`w-full h-full min-h-[76px] sm:min-h-[82px] py-2.5 px-1 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                    darkMode
                      ? 'bg-white/5 hover:bg-white/10 text-slate-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                      darkMode ? 'bg-white/10' : 'bg-white shadow-xs'
                    }`}
                  >
                    <ArrowsClockwise size={18} weight="bold" className="text-amber-500" />
                  </div>
                  <span className="text-[11px] font-bold truncate w-full text-center">Sync</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 2: E-BIKE BATTERY & RIDE PERFORMANCE                               */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 h-full flex flex-col">
          <div
            className={`w-full h-full rounded-3xl p-3.5 sm:p-7 backdrop-blur-2xl transition-all relative overflow-hidden flex flex-col justify-between gap-5 ${
              darkMode
                ? 'bg-slate-900/70 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
                : 'bg-white/95 text-slate-900 shadow-xl shadow-slate-200/80'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
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
                    Battery & Motor
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Powertrain health & ride statistics
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md shadow-xs ${
                  darkMode ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-900'
                }`}
              >
                <span>Limit: {formatDecimal(metrics.speedLimitKmh)} km/h</span>
              </div>
            </div>

            {/* Central SoC Gauge */}
            <div className="relative py-1 flex flex-col items-center justify-center z-10">
              <div className="w-[190px] sm:w-[220px] max-w-full h-[140px] sm:h-[160px] mx-auto flex items-center justify-center relative">
                <Gauge
                  value={metrics.batteryPercent}
                  centerValue={metrics.batteryPercent}
                  defaultLabel="E-BIKE BATTERY"
                  suffix="%"
                  activeFill={
                    metrics.batteryPercent < 20
                      ? '#EF4444'
                      : metrics.batteryPercent < 50
                      ? '#F59E0B'
                      : '#10B981'
                  }
                  inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}
                  orientation="arc"
                  notchCornerRadius={2}
                  totalNotches={36}
                  className="w-full h-full"
                />
              </div>

              {/* Live Output Rate Pill */}
              <div
                className={`mt-1 flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold font-mono shadow-xs ${
                  darkMode ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-900'
                }`}
              >
                <span className={darkMode ? 'text-emerald-400 font-bold' : 'text-emerald-700 font-bold'}>
                  {formatDecimal(metrics.remainingRangeKm)} km Remaining Range
                </span>
                <span className="text-slate-400">•</span>
                <span>{formatDecimal(metrics.totalTimeDrivenHours)}h Total Ride</span>
              </div>
            </div>

            {/* Daily Distance Goal Progress */}
            <div
              className={`p-4 rounded-2xl space-y-3 shadow-xs ${
                darkMode ? 'bg-white/5 text-white' : 'bg-slate-100/90 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className={`uppercase tracking-wider text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Daily Ride Goal (20 km)
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {progressDaily}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className={`w-full h-2.5 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-300'}`}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-700"
                  style={{ width: `${progressDaily}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-0.5">
                <span>{formatDecimal(metrics.distanceTodayKm)} km completed</span>
                <span>{formatDecimal(Math.max(0, dailyGoalKm - metrics.distanceTodayKm))} km to goal</span>
              </div>
            </div>

            {/* Eco & Performance Bento Chips */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* CO2 Saved */}
              <div
                className={`p-3 rounded-2xl flex items-center gap-2.5 shadow-xs ${
                  darkMode ? 'bg-white/5 text-white' : 'bg-slate-100/90 text-slate-900'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                  <TreeEvergreen size={18} weight="duotone" />
                </div>
                <div className="min-w-0">
                  <span className="font-mono text-xs font-black block truncate text-emerald-600 dark:text-emerald-400">
                    {formatDecimal(metrics.totalSavedCo2Kg)} kg
                  </span>
                  <span className={`text-[10px] font-semibold truncate block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Total CO₂ Saved
                  </span>
                </div>
              </div>

              {/* Calories Burned */}
              <div
                className={`p-3 rounded-2xl flex items-center gap-2.5 shadow-xs ${
                  darkMode ? 'bg-white/5 text-white' : 'bg-slate-100/90 text-slate-900'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                  <Flame size={18} weight="duotone" />
                </div>
                <div className="min-w-0">
                  <span className="font-mono text-xs font-black block truncate text-amber-600 dark:text-amber-400">
                    {formatDecimal(metrics.lastTrip?.caloriesBurned || 0)} kcal
                  </span>
                  <span className={`text-[10px] font-semibold truncate block ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Last Trip Cal
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMN 3: E-BIKE GPS NAVIGATION & TELEMETRY                               */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 h-full flex flex-col">
          <div
            className={`w-full h-full rounded-3xl p-3.5 sm:p-7 backdrop-blur-2xl transition-all relative overflow-hidden flex flex-col justify-between gap-5 ${
              darkMode
                ? 'bg-slate-900/70 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
                : 'bg-white/95 text-slate-900 shadow-xl shadow-slate-200/80'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    darkMode ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-100 text-sky-800'
                  }`}
                >
                  <NavigationArrow size={22} weight="duotone" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black tracking-tight uppercase">
                    Location & GPS
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Real-time BLE beacon & tracking
                  </p>
                </div>
              </div>

              {/* Zone Badge */}
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold font-mono shadow-xs ${
                  darkMode ? 'bg-white/5 text-cyan-300' : 'bg-cyan-100 text-cyan-900'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                <span>{metrics.locationZone}</span>
              </div>
            </div>

            {/* Interactive Mini-Map Frame with HUD */}
            <div className="relative w-full h-56 sm:h-64 rounded-2xl overflow-hidden shadow-md group">
              <iframe
                title="E-Bike Location Map"
                src={osmEmbedUrl}
                style={
                  darkMode
                    ? {
                        filter: 'invert(90%) hue-rotate(180deg) brightness(88%) contrast(98%)',
                      }
                    : {}
                }
                className="w-full h-full border-0 pointer-events-auto opacity-95 transition-opacity"
                loading="lazy"
              />

              {/* Map Top HUD */}
              <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none gap-2 z-10">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/85 backdrop-blur-md text-white text-[11px] font-bold shadow-lg pointer-events-auto">
                  <Globe size={13} weight="duotone" className="text-emerald-400 shrink-0" />
                  <span className="font-mono text-[10px]">
                    {lat.toFixed(4)}°, {lon.toFixed(4)}°
                  </span>
                </div>

                <div className="flex items-center gap-1 pointer-events-auto">
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    aria-label="Zoom In"
                    className="w-7 h-7 rounded-lg bg-slate-950/85 hover:bg-slate-900 text-white flex items-center justify-center transition-colors cursor-pointer shadow-md"
                  >
                    <MagnifyingGlassPlus size={13} weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    aria-label="Zoom Out"
                    className="w-7 h-7 rounded-lg bg-slate-950/85 hover:bg-slate-900 text-white flex items-center justify-center transition-colors cursor-pointer shadow-md"
                  >
                    <MagnifyingGlassMinus size={13} weight="bold" />
                  </button>
                  <a
                    href={osmDirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-7 px-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase transition-colors shadow-md"
                  >
                    <span>Map</span>
                    <NavigationArrow size={10} weight="bold" />
                  </a>
                </div>
              </div>

              {/* Center Radar Pinpoint */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-12 h-12 rounded-full bg-amber-500/30 animate-ping" />
                  <span className="absolute w-8 h-8 rounded-full bg-amber-500/20 animate-pulse" />
                  <div className="relative w-8 h-8 rounded-full bg-amber-500 border-2 border-white shadow-xl flex items-center justify-center text-slate-950">
                    <Bicycle size={16} weight="bold" />
                  </div>
                </div>
              </div>

              {/* Bottom map footer */}
              <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none">
                <div className="px-2 py-0.5 rounded-lg bg-slate-950/85 backdrop-blur-md text-[9px] font-mono text-slate-300">
                  Last seen: {metrics.lastSeen}
                </div>
              </div>
            </div>

            {/* Hardware Diagnostics */}
            <div
              className={`p-4 rounded-2xl space-y-3 shadow-xs ${
                darkMode ? 'bg-white/5 text-white' : 'bg-slate-100/90 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className={`uppercase tracking-wider text-[10px] flex items-center gap-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  <Pulse size={14} weight="duotone" className="text-emerald-500 animate-pulse" />
                  <span>Hardware & Telemetry</span>
                </span>
                <span className={`font-mono text-[11px] flex items-center gap-1 font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  <CheckCircle size={12} weight="fill" />
                  <span>GPS Connected</span>
                </span>
              </div>

              {/* 4 Status Chips */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className={`p-2.5 rounded-xl flex items-center justify-between ${darkMode ? 'bg-slate-950/50' : 'bg-white'}`}>
                  <span className="text-slate-500 font-bold uppercase text-[9px]">Auto-Lock</span>
                  <span className="font-bold">{metrics.autoLockStatus.split(' ')[0]}</span>
                </div>
                <div className={`p-2.5 rounded-xl flex items-center justify-between ${darkMode ? 'bg-slate-950/50' : 'bg-white'}`}>
                  <span className="text-slate-500 font-bold uppercase text-[9px]">Speed Limit</span>
                  <span className="font-bold">{formatDecimal(metrics.speedLimitKmh)} km/h</span>
                </div>
                <div className={`p-2.5 rounded-xl flex items-center justify-between ${darkMode ? 'bg-slate-950/50' : 'bg-white'}`}>
                  <span className="text-slate-500 font-bold uppercase text-[9px]">Internal PCB</span>
                  <span className="font-bold">{formatDecimal(metrics.internalPcbBattery)}%</span>
                </div>
                <div className={`p-2.5 rounded-xl flex items-center justify-between ${darkMode ? 'bg-slate-950/50' : 'bg-white'}`}>
                  <span className="text-slate-500 font-bold uppercase text-[9px]">Crash Sensor</span>
                  <span className="font-bold text-emerald-500">Armed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ActionConfirmModal
        isOpen={Boolean(activeModal)}
        onClose={() => setActiveModal(null)}
        onConfirm={handleExecuteModalAction}
        isLoading={isActionPending}
        title={
          activeModal === 'lock'
            ? 'Lock E-Bike Motor'
            : activeModal === 'unlock'
            ? 'Unlock E-Bike Motor'
            : activeModal === 'toggle_autolock'
            ? 'Update Auto-Lock Settings'
            : activeModal === 'theft_beacon'
            ? 'Activate Theft Beacon'
            : 'Sync BLE Telemetry'
        }
        description={
          activeModal === 'lock'
            ? 'This will immediately lock the motor and arm the internal anti-theft sensors.'
            : activeModal === 'unlock'
            ? 'Disarm motor lock and enable pedal assist.'
            : activeModal === 'theft_beacon'
            ? 'Broadcast high-frequency GPS pinpoints and cellular alerts to emergency contacts.'
            : 'Request fresh BLE telemetry packet from the bike.'
        }
        confirmText={
          activeModal === 'theft_beacon'
            ? 'Broadcast Beacon'
            : activeModal === 'lock'
            ? 'Lock Motor'
            : activeModal === 'unlock'
            ? 'Unlock'
            : 'Confirm'
        }
        confirmColor={activeModal === 'theft_beacon' ? 'rose' : 'amber'}
        darkMode={darkMode}
      />
    </div>
  );
}
