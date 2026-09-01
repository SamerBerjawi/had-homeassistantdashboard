/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Car,
  BatteryCharging,
  Lightning,
  Lock,
  LockOpen,
  Thermometer,
  Wind,
  ArrowsClockwise,
  SpeakerHigh,
  Fan,
  NavigationArrow,
  ShieldCheck,
  WarningCircle,
  Clock,
  Sliders,
  Sparkle,
  CheckCircle,
  Plug,
  Pause,
  Play,
  ArrowClockwise,
  CloudArrowUp,
  Cpu,
  Info,
  Check,
  CheckFat,
  Pulse,
  GasPump,
  Gauge as GaugeIcon,
  Circle
} from '@phosphor-icons/react';
import { Gauge } from '../../charts/gauge';
import { LineChart } from '../../charts/line-chart';
import { Line } from '../../charts/line';
import { CarEvMetrics } from '../../../types/mobility';
import { MobilityMap } from './MobilityMap';
import { MobilityAssetBadge } from './MobilityAssetBadge';
import { resolveAssetUrl } from '../../../utils/assetUrl';
import { useUserConfig } from '../../../contexts/ConfigContext';
import { ActionConfirmModal } from './ActionConfirmModal';

interface CarEvTabProps {
  metrics: CarEvMetrics;
  actions: {
    lockCar: (entityId?: string) => Promise<void>;
    unlockCar: (entityId?: string) => Promise<void>;
    toggleRemoteClimate: (target: boolean, entityId?: string) => Promise<void>;
    flashAndHonk: (entityId?: string) => Promise<void>;
    syncVehicleData: () => Promise<void>;
    startCharging: (entityId?: string) => Promise<void>;
    toggleChargingState: (pause: boolean, entityId?: string) => Promise<void>;
    toggleAutoSoftwareUpdates: (enable: boolean) => Promise<void>;
  };
  onOpenCustomizer: () => void;
  darkMode?: boolean;
}

type CarModalType =
  | 'lock'
  | 'unlock'
  | 'start_climate'
  | 'stop_climate'
  | 'flash_honk'
  | 'sync_data'
  | 'start_charge'
  | 'pause_charge'
  | 'resume_charge'
  | 'toggle_auto_updates'
  | null;

export function CarEvTab({
  metrics,
  actions,
  onOpenCustomizer,
  darkMode = true
}: CarEvTabProps) {
  const { config } = useUserConfig();
  const [activeModal, setActiveModal] = useState<CarModalType>(null);
  const [isActionPending, setIsActionPending] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  React.useEffect(() => {
    setImageError(false);
  }, [metrics.customVehicleImage]);

  React.useEffect(() => {
    setLogoError(false);
  }, [metrics.customBrandLogo]);

  const resolvedCarImage = resolveAssetUrl(metrics.customVehicleImage, config?.updatedAt);
  const resolvedCarLogo = resolveAssetUrl(metrics.customBrandLogo, config?.updatedAt);

  const cardStyle =
    'rounded-3xl border border-slate-200/80 dark:border-white/10 backdrop-blur-sm transition-all overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ' +
    (darkMode
      ? 'bg-black/20 text-white'
      : 'bg-white/20 text-slate-900') +
    ' p-5 sm:p-6 flex flex-col justify-between';

  const socColor =
    metrics.soc < 20
      ? '#EF4444'
      : metrics.soc < 40
      ? '#F59E0B'
      : metrics.soc < 80
      ? '#06B6D4'
      : '#10B981';

  const isCharging = metrics.chargingState.toLowerCase().includes('charge');

  const triggerFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 2500);
  };

  const handleExecuteModalAction = async () => {
    const modalToExecute = activeModal;
    if (!modalToExecute) return;
    setIsActionPending(true);

    try {
      switch (modalToExecute) {
        case 'lock':
          await actions.lockCar();
          triggerFeedback('Vehicle doors secured & locked');
          break;
        case 'unlock':
          await actions.unlockCar();
          triggerFeedback('Vehicle doors unlocked');
          break;
        case 'start_climate':
          await actions.toggleRemoteClimate(true);
          triggerFeedback('Cabin preconditioning started');
          break;
        case 'stop_climate':
          await actions.toggleRemoteClimate(false);
          triggerFeedback('Cabin climate turned off');
          break;
        case 'flash_honk':
          await actions.flashAndHonk();
          triggerFeedback('Horn chirp & hazard flash sent');
          break;
        case 'sync_data':
          await actions.syncVehicleData();
          triggerFeedback('Telemetry & status synced');
          break;
        case 'start_charge':
          await actions.startCharging();
          triggerFeedback('High-voltage charging initiated');
          break;
        case 'pause_charge':
          await actions.toggleChargingState(true);
          triggerFeedback('Charging session paused');
          break;
        case 'resume_charge':
          await actions.toggleChargingState(false);
          triggerFeedback('Charging session resumed');
          break;
        case 'toggle_auto_updates':
          await actions.toggleAutoSoftwareUpdates(!metrics.softwareUpdates.autoUpdatesEnabled);
          triggerFeedback(`Automatic OTA updates ${!metrics.softwareUpdates.autoUpdatesEnabled ? 'enabled' : 'disabled'}`);
          break;
      }
    } finally {
      setIsActionPending(false);
      setActiveModal(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Toast Feedback */}
      <AnimatePresence>
        {actionFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-2xl bg-slate-950/90 text-white border border-cyan-500/40 backdrop-blur-md shadow-2xl flex items-center gap-2.5 text-xs font-bold"
          >
            <Sparkle size={16} weight="duotone" className="text-cyan-400 animate-spin" />
            <span>{actionFeedback}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------- */}
      {/* 12 LIVE TELEMETRY BADGES CLUSTER (OVERVIEW STYLE)             */}
      {/* ------------------------------------------------------------- */}
      <MobilityAssetBadge
        type="car"
        carMetrics={metrics}
        darkMode={darkMode}
        onOpenCustomizer={onOpenCustomizer}
      />

      {/* ------------------------------------------------------------- */}
      {/* 4 MAIN SECTIONS GRID (ADAPTIVE CONTENT HEIGHT)                */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ========================================================================= */}
        {/* SECTION 1: Car Information and Action Buttons (Col 1-7)                   */}
        {/* ========================================================================= */}
        <div className={`lg:col-span-7 ${cardStyle} relative overflow-hidden group space-y-5`}>
          {/* Ambient Glow */}
          <div
            className="absolute inset-0 pointer-events-none opacity-25 transition-all duration-700 blur-3xl"
            style={{
              background: isCharging
                ? 'radial-gradient(circle at 75% 35%, #10B981 0%, transparent 60%)'
                : metrics.isMoving
                ? 'radial-gradient(circle at 50% 50%, #06B6D4 0%, transparent 70%)'
                : 'radial-gradient(circle at 30% 20%, #6366F1 0%, transparent 50%)'
            }}
          />

          {/* Section Header */}
          <div className="flex items-center justify-between gap-2 z-10">
            <div className="flex items-center gap-3">
              {resolvedCarLogo && !logoError ? (
                <img
                  src={resolvedCarLogo}
                  alt="Logo"
                  className="h-8 max-w-[120px] object-contain drop-shadow-md"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <span className="text-xs font-black tracking-widest uppercase">FORDPASS</span>
                  <span className="text-[10px] font-mono opacity-80">WF0TK1EM3PMA07438</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onOpenCustomizer}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Sliders size={14} weight="bold" className="text-cyan-500" />
              <span>Customize</span>
            </button>
          </div>

          {/* Vehicle Stage Canvas */}
          <div className="relative py-4 flex flex-col items-center justify-center">
            <div className="relative group/car cursor-pointer transition-transform duration-500 hover:scale-[1.02]">
              {isCharging && (
                <div className="absolute -inset-4 rounded-full bg-emerald-500/20 blur-xl animate-pulse pointer-events-none" />
              )}

              {resolvedCarImage && !imageError ? (
                <img
                  src={resolvedCarImage}
                  alt="Vehicle Render"
                  className="max-h-52 max-w-full object-contain mx-auto drop-shadow-[0_20px_25px_rgba(0,0,0,0.5)]"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="relative w-[280px] sm:w-[380px] max-w-full h-[140px] sm:h-[175px] mx-auto flex items-center justify-center">
                  <svg viewBox="0 0 400 180" className="w-full h-full drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)]">
                    <defs>
                      <linearGradient id="sec1BodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#1E293B" />
                        <stop offset="50%" stopColor="#0F172A" />
                        <stop offset="100%" stopColor="#020617" />
                      </linearGradient>
                      <linearGradient id="sec1GlassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#0284C7" stopOpacity="0.2" />
                      </linearGradient>
                    </defs>
                    <ellipse cx="200" cy="155" rx="170" ry="14" fill="#000000" opacity="0.5" />
                    <path
                      d="M30 120 C 35 110, 60 100, 95 98 C 120 75, 170 52, 235 50 C 290 50, 335 70, 365 105 C 380 115, 385 125, 375 135 C 360 140, 320 140, 310 140 C 300 125, 275 115, 255 125 C 245 135, 240 140, 160 140 C 150 125, 125 115, 105 125 C 95 135, 90 140, 45 140 C 30 135, 25 128, 30 120 Z"
                      fill="url(#sec1BodyGrad)"
                      stroke="#475569"
                      strokeWidth="1.5"
                    />
                    <path d="M125 92 C 145 74, 180 58, 230 56 C 275 56, 310 70, 335 92 Z" fill="url(#sec1GlassGrad)" stroke="#0EA5E9" strokeWidth="0.8" />
                    <path d="M 50 110 Q 180 100 350 112" stroke="#06B6D4" strokeWidth="1.5" fill="none" opacity="0.8" />
                    <circle cx="92" cy="104" r="4" fill={isCharging ? '#10B981' : '#06B6D4'} stroke="#FFFFFF" strokeWidth="1.2" className={isCharging ? 'animate-ping' : ''} />
                    <path d="M 360 105 L 375 112 L 365 118 Z" fill="#38BDF8" className="animate-pulse" />
                    <path d="M 35 115 L 30 122 L 38 124 Z" fill="#EF4444" />
                    <g transform="translate(105, 135)">
                      <circle cx="0" cy="0" r="22" fill="#0F172A" stroke="#334155" strokeWidth="3" />
                      <circle cx="0" cy="0" r="14" fill="#1E293B" stroke="#06B6D4" strokeWidth="1.5" />
                      <circle cx="0" cy="0" r="5" fill="#38BDF8" />
                    </g>
                    <g transform="translate(285, 135)">
                      <circle cx="0" cy="0" r="22" fill="#0F172A" stroke="#334155" strokeWidth="3" />
                      <circle cx="0" cy="0" r="14" fill="#1E293B" stroke="#06B6D4" strokeWidth="1.5" />
                      <circle cx="0" cy="0" r="5" fill="#38BDF8" />
                    </g>
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Tire Pressure Monitor (From sensor.fordpass_*_tirepressure) */}
          <div className="p-3.5 rounded-2xl bg-slate-100/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <GaugeIcon size={15} weight="duotone" className="text-sky-500" />
                <span>Tire Pressure Monitor</span>
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {metrics.tirePressure.status}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold uppercase">Front Left</span>
                <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
                  {metrics.tirePressure.frontLeft} {metrics.tirePressure.unit}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold uppercase">Front Right</span>
                <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
                  {metrics.tirePressure.frontRight} {metrics.tirePressure.unit}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold uppercase">Rear Left</span>
                <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
                  {metrics.tirePressure.rearLeft} {metrics.tirePressure.unit}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold uppercase">Rear Right</span>
                <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
                  {metrics.tirePressure.rearRight} {metrics.tirePressure.unit}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1 Action Buttons */}
          <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Lock / Unlock */}
            <button
              type="button"
              onClick={() => setActiveModal(metrics.doorsLocked ? 'unlock' : 'lock')}
              className={`flex items-center justify-center gap-2 px-3.5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer border shadow-sm ${
                metrics.doorsLocked
                  ? 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border-slate-200 dark:border-white/10 text-slate-800 dark:text-white'
                  : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 animate-pulse'
              }`}
            >
              {metrics.doorsLocked ? (
                <>
                  <LockOpen size={16} weight="bold" className="text-amber-500" />
                  <span>Unlock</span>
                </>
              ) : (
                <>
                  <Lock size={16} weight="bold" className="text-emerald-500" />
                  <span>Lock Car</span>
                </>
              )}
            </button>

            {/* Start Climate */}
            <button
              type="button"
              onClick={() => setActiveModal(metrics.remoteClimateActive ? 'stop_climate' : 'start_climate')}
              className={`flex items-center justify-center gap-2 px-3.5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer border shadow-sm ${
                metrics.remoteClimateActive
                  ? 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/40 text-rose-700 dark:text-rose-300'
                  : 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/40 text-cyan-700 dark:text-cyan-300'
              }`}
            >
              <Fan size={16} weight="duotone" className={metrics.remoteClimateActive ? 'text-rose-500 animate-spin' : 'text-cyan-500'} />
              <span>{metrics.remoteClimateActive ? `${metrics.remoteClimateTimeRemaining}m Stop` : 'Start Climate'}</span>
            </button>

            {/* Flash & Honk */}
            <button
              type="button"
              onClick={() => setActiveModal('flash_honk')}
              className="flex items-center justify-center gap-2 px-3.5 py-3 rounded-2xl text-xs font-black bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-all cursor-pointer shadow-sm"
            >
              <SpeakerHigh size={16} weight="duotone" className="text-amber-500" />
              <span>Flash & Honk</span>
            </button>

            {/* Sync Data */}
            <button
              type="button"
              onClick={() => setActiveModal('sync_data')}
              className="flex items-center justify-center gap-2 px-3.5 py-3 rounded-2xl text-xs font-black bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-all cursor-pointer shadow-sm"
            >
              <ArrowsClockwise size={16} weight="bold" className="text-sky-500" />
              <span>Sync Data</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: Charging (Col 8-12)                                            */}
        {/* ========================================================================= */}
        <div className={`lg:col-span-5 ${cardStyle} space-y-4`}>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-2">
              <BatteryCharging size={22} weight="duotone" className="text-emerald-500 dark:text-emerald-400" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider">Section 2: Charging</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Power & High-Voltage Battery Telemetry</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-[11px] font-bold">
              <Plug size={14} weight="duotone" className={metrics.isPluggedIn ? 'text-emerald-500' : 'text-slate-400'} />
              <span className={metrics.isPluggedIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}>
                {metrics.isPluggedIn ? 'Plugged In' : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Bklit Gauge for Battery SOC */}
          <div className="py-2 flex flex-col items-center justify-center">
            <div className="w-[190px] sm:w-[220px] max-w-full h-[140px] sm:h-[160px] mx-auto flex items-center justify-center relative">
              <Gauge
                value={metrics.soc}
                centerValue={metrics.soc}
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
          </div>

          {/* Estimated Range Banner (from sensor.fordpass_*_elveh) */}
          <div className="p-3.5 rounded-2xl bg-slate-100/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Estimated Range (Electric)
              </span>
              <div className="text-xl sm:text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
                {metrics.range} <span className="text-sm font-semibold">{metrics.rangeUnit}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-500">
              <GasPump size={22} weight="duotone" />
            </div>
          </div>

          {/* Side-by-Side: Charging Status & Last Charging Session Log */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Charging Status Tile */}
            <div className="p-3.5 rounded-2xl bg-slate-100/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Charging Status
                </span>
                <Lightning size={16} weight="fill" className={isCharging ? 'text-emerald-500 animate-pulse' : 'text-slate-400'} />
              </div>
              <div className={`text-sm sm:text-base font-black truncate ${isCharging ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                {isCharging && metrics.chargingPowerKW > 0 ? `${metrics.chargingState} (${metrics.chargingPowerKW} kW)` : metrics.chargingState}
              </div>
            </div>

            {/* Last Charging Session Log Tile */}
            <div className="p-3.5 rounded-2xl bg-slate-100/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Last Session
                </span>
                <BatteryCharging size={16} weight="duotone" className="text-emerald-500" />
              </div>
              <div className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 truncate">
                {metrics.lastChargingLog}
              </div>
            </div>
          </div>

          {/* Section 2 Action Buttons */}
          <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setActiveModal('start_charge')}
              className={`px-3 py-2.5 rounded-2xl text-xs font-black border transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm ${
                isCharging
                  ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-100 hover:bg-emerald-500/15 dark:bg-white/5 dark:hover:bg-emerald-500/20 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-emerald-600'
              }`}
            >
              <Lightning size={15} weight="bold" />
              <span>Start Charging</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModal(isCharging ? 'pause_charge' : 'resume_charge')}
              className={`px-3 py-2.5 rounded-2xl text-xs font-black border transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm ${
                isCharging
                  ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-700 dark:text-amber-300'
                  : 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/40 text-cyan-700 dark:text-cyan-300'
              }`}
            >
              {isCharging ? (
                <>
                  <Pause size={15} weight="bold" />
                  <span>Pause Charge</span>
                </>
              ) : (
                <>
                  <Play size={15} weight="bold" />
                  <span>Resume Charge</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3: Live GPS & Telemetry (Switched to Section 3, Col 1-6)          */}
        {/* ========================================================================= */}
        <div className={`lg:col-span-6 ${cardStyle} space-y-4`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-2">
              <NavigationArrow size={22} weight="duotone" className="text-cyan-500" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider">Section 3: Live GPS & Telemetry</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {metrics.locationZone} • Last Trip {metrics.lastTripEnergy} {metrics.lastTripEnergyUnit}
                </p>
              </div>
            </div>

            {/* Gear Position Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-cyan-600 dark:text-cyan-300">
              <span>GEAR: [{metrics.gearPosition}]</span>
            </div>
          </div>

          {/* Location Map */}
          <div className="py-1">
            <MobilityMap
              latitude={metrics.gps.latitude}
              longitude={metrics.gps.longitude}
              title="Ford Mustang Mach-E (WF0TK1EM3PMA07438)"
              type="car"
              speedKmh={metrics.speed}
              lastUpdated={metrics.lastRefreshed}
              isMoving={metrics.isMoving}
              darkMode={darkMode}
              className="h-[180px]"
            />
          </div>

          {/* Speed Telemetry Line Chart */}
          <div className="p-3 rounded-2xl bg-slate-100/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Pulse size={14} weight="bold" className="text-cyan-500" />
                <span>Speed History ({metrics.speedUnit})</span>
              </span>
              <span className="text-cyan-600 dark:text-cyan-400 font-mono">
                Live: {metrics.speed} {metrics.speedUnit}
              </span>
            </div>

            <div className="w-full h-16">
              <LineChart
                data={metrics.speedTimeseries}
                xDataKey="date"
                className="w-full h-full"
              >
                <Line dataKey="speed" stroke="#06B6D4" strokeWidth={2.5} />
              </LineChart>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 4: Software Update (Switched to Section 4, Col 7-12)              */}
        {/* ========================================================================= */}
        <div className={`lg:col-span-6 ${cardStyle} space-y-4`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-2">
              <CloudArrowUp size={22} weight="duotone" className="text-indigo-500 dark:text-indigo-400" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider">Section 4: Software Update</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Ford Power-Up & OTA Firmware</p>
              </div>
            </div>

            {/* Auto-update switch trigger */}
            <button
              type="button"
              onClick={() => setActiveModal('toggle_auto_updates')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                metrics.softwareUpdates.autoUpdatesEnabled
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500'
              }`}
            >
              <CheckCircle size={14} weight="bold" />
              <span>Auto OTA: {metrics.softwareUpdates.autoUpdatesEnabled ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Software Update Stats Grid */}
          <div className="grid grid-cols-2 gap-3 py-1">
            <div className="p-3 rounded-2xl bg-slate-100/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Firmware Status
              </span>
              <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                {metrics.softwareUpdates.firmwareStatus}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-100/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                OTA Readiness
              </span>
              <div className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 truncate">
                {metrics.softwareUpdates.otaReadiness}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-100/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Last Firmware Update
              </span>
              <div className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 truncate">
                {metrics.softwareUpdates.lastFirmwareUpdate}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-100/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Next OTA Schedule
              </span>
              <div className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400 truncate">
                {metrics.softwareUpdates.nextOtaCheck}
              </div>
            </div>
          </div>

          {/* Firmware History */}
          <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="truncate">History: <strong className="text-slate-900 dark:text-white font-semibold">{metrics.softwareUpdates.firmwareHistory}</strong></span>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* ACTION CONFIRMATION MODALS                                    */}
      {/* ------------------------------------------------------------- */}
      <ActionConfirmModal
        isOpen={activeModal === 'lock'}
        onClose={() => setActiveModal(null)}
        onConfirm={handleExecuteModalAction}
        title="Lock Vehicle"
        description="Are you sure you want to secure and lock all doors for VIN WF0TK1EM3PMA07438?"
        confirmText="Lock Doors"
        confirmColor="emerald"
        icon={<Lock size={24} weight="bold" />}
        entityName={metrics.controls.lockDoorButtonId}
        darkMode={darkMode}
        isLoading={isActionPending}
      />

      <ActionConfirmModal
        isOpen={activeModal === 'unlock'}
        onClose={() => setActiveModal(null)}
        onConfirm={handleExecuteModalAction}
        title="Unlock Vehicle"
        description="Are you sure you want to unlock the vehicle doors?"
        confirmText="Unlock Doors"
        confirmColor="amber"
        icon={<LockOpen size={24} weight="bold" />}
        entityName={metrics.controls.unlockDoorLockId}
        darkMode={darkMode}
        isLoading={isActionPending}
      />

      <ActionConfirmModal
        isOpen={activeModal === 'start_climate'}
        onClose={() => setActiveModal(null)}
        onConfirm={handleExecuteModalAction}
        title="Start Cabin Preconditioning"
        description="Initiate remote start & preconditioning to 21.0°C cabin temperature?"
        confirmText="Start Preconditioning"
        confirmColor="cyan"
        icon={<Fan size={24} weight="duotone" />}
        entityName={metrics.controls.startClimateSwitchId}
        darkMode={darkMode}
        isLoading={isActionPending}
      />

      <ActionConfirmModal
        isOpen={activeModal === 'stop_climate'}
        onClose={() => setActiveModal(null)}
        onConfirm={handleExecuteModalAction}
        title="Stop Cabin Preconditioning"
        description="Are you sure you want to turn off remote cabin climate?"
        confirmText="Stop Climate"
        confirmColor="rose"
        icon={<Fan size={24} weight="duotone" />}
        entityName={metrics.controls.startClimateSwitchId}
        darkMode={darkMode}
        isLoading={isActionPending}
      />

      <ActionConfirmModal
        isOpen={activeModal === 'flash_honk'}
        onClose={() => setActiveModal(null)}
        onConfirm={handleExecuteModalAction}
        title="Sound Horn & Flash Lights"
        description="Sound the horn and flash exterior hazard lights for VIN WF0TK1EM3PMA07438?"
        confirmText="Flash & Honk"
        confirmColor="amber"
        icon={<SpeakerHigh size={24} weight="duotone" />}
        entityName={metrics.controls.flashHonkDefaultButtonId}
        darkMode={darkMode}
        isLoading={isActionPending}
      />

      <ActionConfirmModal
        isOpen={activeModal === 'sync_data'}
        onClose={() => setActiveModal(null)}
        onConfirm={handleExecuteModalAction}
        title="Sync FordPass Telemetry"
        description="Request an immediate update and fresh telemetry sync from FordPass cloud?"
        confirmText="Sync Now"
        confirmColor="indigo"
        icon={<ArrowsClockwise size={24} weight="bold" />}
        entityName={metrics.controls.updateDataButtonId}
        darkMode={darkMode}
        isLoading={isActionPending}
      />

      <ActionConfirmModal
        isOpen={activeModal === 'start_charge'}
        onClose={() => setActiveModal(null)}
        onConfirm={handleExecuteModalAction}
        title="Start High-Voltage Charging"
        description="Start charging the vehicle battery up to the target SoC limit?"
        confirmText="Start Charging"
        confirmColor="emerald"
        icon={<Lightning size={24} weight="bold" />}
        entityName={metrics.controls.startChargingButtonId}
        darkMode={darkMode}
        isLoading={isActionPending}
      />

      <ActionConfirmModal
        isOpen={activeModal === 'pause_charge'}
        onClose={() => setActiveModal(null)}
        onConfirm={handleExecuteModalAction}
        title="Pause Charging"
        description="Temporarily pause the active charging session?"
        confirmText="Pause Charge"
        confirmColor="amber"
        icon={<Pause size={24} weight="bold" />}
        entityName={metrics.controls.chargeSwitchId}
        darkMode={darkMode}
        isLoading={isActionPending}
      />

      <ActionConfirmModal
        isOpen={activeModal === 'resume_charge'}
        onClose={() => setActiveModal(null)}
        onConfirm={handleExecuteModalAction}
        title="Resume Charging"
        description="Resume active high-voltage charging session?"
        confirmText="Resume Charge"
        confirmColor="cyan"
        icon={<Play size={24} weight="bold" />}
        entityName={metrics.controls.chargeSwitchId}
        darkMode={darkMode}
        isLoading={isActionPending}
      />

      <ActionConfirmModal
        isOpen={activeModal === 'toggle_auto_updates'}
        onClose={() => setActiveModal(null)}
        onConfirm={handleExecuteModalAction}
        title="Automatic Software Updates"
        description={`Are you sure you want to ${metrics.softwareUpdates.autoUpdatesEnabled ? 'disable' : 'enable'} automatic Ford Power-Up OTA updates?`}
        confirmText={metrics.softwareUpdates.autoUpdatesEnabled ? 'Disable' : 'Enable'}
        confirmColor={metrics.softwareUpdates.autoUpdatesEnabled ? 'amber' : 'emerald'}
        icon={<CloudArrowUp size={24} weight="duotone" />}
        entityName={metrics.controls.autoSoftwareUpdatesSwitchId}
        darkMode={darkMode}
        isLoading={isActionPending}
      />

    </div>
  );
}
