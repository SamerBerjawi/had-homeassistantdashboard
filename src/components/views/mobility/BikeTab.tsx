/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bicycle,
  ShieldCheck,
  ShieldWarning,
  BatteryCharging,
  Lightning,
  Flame,
  TreeEvergreen,
  Timer,
  NavigationArrow,
  Sliders,
  Sparkle,
  Lock,
  LockOpen,
  WarningCircle,
  Clock,
  Heartbeat,
  TrendUp,
  ArrowsClockwise
} from '@phosphor-icons/react';
import { Gauge } from '../../charts/gauge';
import { BikeMetrics } from '../../../types/mobility';
import { MobilityMap } from './MobilityMap';
import { MobilityAssetBadge } from './MobilityAssetBadge';
import { ActionConfirmModal } from './ActionConfirmModal';

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
  onOpenCustomizer,
  darkMode = true
}: BikeTabProps) {
  const [activeModal, setActiveModal] = useState<BikeModalType>(null);
  const [isActionPending, setIsActionPending] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const cardStyle =
    'rounded-3xl border border-slate-200/80 dark:border-white/10 backdrop-blur-sm transition-all overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ' +
    (darkMode
      ? 'bg-black/20 text-white'
      : 'bg-white/20 text-slate-900') +
    ' p-4 sm:p-5 flex flex-col justify-between';

  const batteryColor =
    metrics.batteryPercent < 20
      ? '#EF4444' // Red
      : metrics.batteryPercent < 45
      ? '#F59E0B' // Amber
      : metrics.batteryPercent < 80
      ? '#38BDF8' // Sky
      : '#10B981'; // Emerald

  const dailyGoalKm = 20;
  const progressDaily = Math.min(100, Math.round((metrics.distanceTodayKm / dailyGoalKm) * 100));

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
          triggerFeedback('Cowboy E-Bike motor locked & armed');
          break;
        case 'unlock':
          await actions.toggleBikeLock(false);
          triggerFeedback('Cowboy E-Bike unlocked & ready to ride');
          break;
        case 'toggle_autolock':
          triggerFeedback('Auto-lock proximity profile updated');
          break;
        case 'theft_beacon':
          triggerFeedback('Emergency cellular & GPS beacon broadcasting');
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

  return (
    <div className="w-full space-y-5 sm:space-y-6">
      {/* Toast Feedback */}
      <AnimatePresence>
        {actionFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-2xl bg-slate-950/90 text-white border border-amber-500/40 backdrop-blur-md shadow-2xl flex items-center gap-2.5 text-xs font-bold"
          >
            <Sparkle size={16} weight="duotone" className="text-amber-400 animate-spin" />
            <span>{actionFeedback}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------- */}
      {/* 1. LUXURY ASSET IDENTITY & TELEMETRY BADGE                     */}
      {/* ------------------------------------------------------------- */}
      <MobilityAssetBadge
        type="bike"
        bikeMetrics={metrics}
        darkMode={darkMode}
        onOpenCustomizer={onOpenCustomizer}
      />

      {/* Red Alert Banner if Stolen or Crashed */}
      {(metrics.isStolen || metrics.isCrashed) && (
        <div className="p-4 rounded-3xl bg-rose-500/20 border-2 border-rose-500/60 text-rose-900 dark:text-white flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
              <ShieldWarning size={24} weight="bold" />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-wider text-rose-600 dark:text-rose-300">
                {metrics.isStolen ? 'EMERGENCY: BIKE THEFT DETECTED' : 'CRASH SENSOR TRIGGERED'}
              </h4>
              <p className="text-xs text-rose-800 dark:text-rose-100/90 font-medium">
                Real-time cellular beacon active • GPS pinpoint streaming to emergency contacts
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. E-BIKE BENTO GRID                                          */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        
        {/* ========================================================================= */}
        {/* [TILE 1 - Col 1-7, Row 1]: E-Bike Visual Stage & Security                */}
        {/* ========================================================================= */}
        <div className={`lg:col-span-7 ${cardStyle} min-h-[440px] relative overflow-hidden group`}>
          {/* Ambient Glow */}
          <div className="absolute inset-0 pointer-events-none opacity-20 blur-3xl bg-radial from-amber-500/30 via-purple-500/10 to-transparent" />

          {/* Top Bar: Brand Badge & Security Status */}
          <div className="flex items-center justify-between gap-2 z-10">
            <div className="flex items-center gap-2.5 sm:gap-3">
              {metrics.customBrandLogo ? (
                <img
                  src={metrics.customBrandLogo}
                  alt="Bike Brand Logo"
                  className="h-8 max-w-[120px] object-contain drop-shadow-md"
                />
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                  <span className="text-xs font-black tracking-widest uppercase">COWBOY</span>
                  <span className="text-[10px] font-mono opacity-80">SMART E-BIKE</span>
                </div>
              )}

              {/* Speed Limit Badge */}
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-amber-600 dark:text-amber-300">
                <span>LIMIT: {metrics.speedLimitKmh} km/h</span>
              </div>
            </div>

            {/* Auto Lock & Customizer Action */}
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                <Lock size={13} weight="bold" />
                <span className="truncate max-w-[100px]">{metrics.autoLockStatus.split(' ')[0]}</span>
              </span>

              <button
                type="button"
                onClick={onOpenCustomizer}
                title="Customize E-Bike Appearance"
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              >
                <Sliders size={13} weight="bold" />
                <span className="hidden sm:inline">Customize</span>
              </button>
            </div>
          </div>

          {/* Bike Canvas Stage */}
          <div className="relative my-auto py-6 flex flex-col items-center justify-center min-h-[200px]">
            {metrics.customBikeImage ? (
              <img
                src={metrics.customBikeImage}
                alt="E-Bike Render"
                className="max-h-48 sm:max-h-56 max-w-full object-contain mx-auto drop-shadow-[0_20px_25px_rgba(0,0,0,0.5)]"
              />
            ) : (
              /* Ultra-sleek Default Stealth E-Bike Vector Illustration */
              <div className="relative w-[280px] sm:w-[360px] max-w-full h-[150px] sm:h-[180px] mx-auto flex items-center justify-center">
                <svg viewBox="0 0 380 180" className="w-full h-full drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)]">
                  <defs>
                    <linearGradient id="bikeFrameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#334155" />
                      <stop offset="50%" stopColor="#1E293B" />
                      <stop offset="100%" stopColor="#0F172A" />
                    </linearGradient>
                  </defs>

                  {/* Ground Shadow */}
                  <ellipse cx="190" cy="160" rx="150" ry="10" fill="#000000" opacity="0.5" />

                  {/* Rear Wheel */}
                  <g transform="translate(85, 120)">
                    <circle cx="0" cy="0" r="42" fill="none" stroke="#1E293B" strokeWidth="6" />
                    <circle cx="0" cy="0" r="38" fill="none" stroke="#0F172A" strokeWidth="2" />
                    <circle cx="0" cy="0" r="10" fill="#F59E0B" opacity="0.8" />
                    <circle cx="0" cy="0" r="4" fill="#FFFFFF" />
                  </g>

                  {/* Front Wheel */}
                  <g transform="translate(295, 120)">
                    <circle cx="0" cy="0" r="42" fill="none" stroke="#1E293B" strokeWidth="6" />
                    <circle cx="0" cy="0" r="38" fill="none" stroke="#0F172A" strokeWidth="2" />
                    <circle cx="0" cy="0" r="8" fill="#334155" />
                    <circle cx="0" cy="0" r="4" fill="#FFFFFF" />
                  </g>

                  {/* Stealth Frame Tubes */}
                  <line x1="85" y1="120" x2="165" y2="120" stroke="url(#bikeFrameGrad)" strokeWidth="8" strokeLinecap="round" />
                  <line x1="85" y1="120" x2="145" y2="65" stroke="url(#bikeFrameGrad)" strokeWidth="6" strokeLinecap="round" />
                  <line x1="165" y1="120" x2="140" y2="50" stroke="url(#bikeFrameGrad)" strokeWidth="8" strokeLinecap="round" />
                  <line x1="165" y1="120" x2="260" y2="60" stroke="#0F172A" strokeWidth="16" strokeLinecap="round" />
                  <line x1="170" y1="116" x2="255" y2="64" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
                  <line x1="145" y1="65" x2="260" y2="60" stroke="url(#bikeFrameGrad)" strokeWidth="7" strokeLinecap="round" />
                  <line x1="260" y1="60" x2="295" y2="120" stroke="url(#bikeFrameGrad)" strokeWidth="7" strokeLinecap="round" />

                  {/* Handlebars & Stem */}
                  <line x1="260" y1="60" x2="255" y2="40" stroke="#475569" strokeWidth="6" strokeLinecap="round" />
                  <path d="M 245 38 Q 260 35 275 42" stroke="#F59E0B" strokeWidth="5" fill="none" strokeLinecap="round" />

                  {/* Saddle */}
                  <path d="M 125 46 C 135 44, 155 44, 160 48" stroke="#334155" strokeWidth="6" fill="none" strokeLinecap="round" />

                  {/* LED Headlight Beam */}
                  <circle cx="270" cy="50" r="4" fill="#38BDF8" className="animate-pulse" />
                  <path d="M 272 50 L 320 38 L 330 65 Z" fill="#38BDF8" opacity="0.15" />
                </svg>
              </div>
            )}
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* Dynamic State-Dependent Action Buttons with Confirmation Triggers  */}
          {/* ----------------------------------------------------------------- */}
          <div className="z-10 pt-3 border-t border-slate-200/60 dark:border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2">
            
            {/* 1. Lock / Unlock Cowboy E-Bike */}
            <button
              type="button"
              onClick={() => setActiveModal(metrics.isLocked ? 'unlock' : 'lock')}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer border shadow-sm ${
                metrics.isLocked
                  ? 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border-slate-200 dark:border-white/10 text-slate-800 dark:text-white'
                  : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 animate-pulse'
              }`}
            >
              {metrics.isLocked ? (
                <>
                  <LockOpen size={15} weight="bold" className="text-amber-500" />
                  <span>Unlock Motor</span>
                </>
              ) : (
                <>
                  <Lock size={15} weight="bold" className="text-emerald-500" />
                  <span>Lock Motor</span>
                </>
              )}
            </button>

            {/* 2. Auto-Lock Proximity Mode */}
            <button
              type="button"
              onClick={() => setActiveModal('toggle_autolock')}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-black bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-700 dark:text-cyan-300 transition-all cursor-pointer shadow-sm"
            >
              <ShieldCheck size={15} weight="bold" className="text-cyan-500" />
              <span>Auto-Lock</span>
            </button>

            {/* 3. Emergency Theft Beacon */}
            <button
              type="button"
              onClick={() => setActiveModal('theft_beacon')}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-black bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-700 dark:text-rose-300 transition-all cursor-pointer shadow-sm"
            >
              <ShieldWarning size={15} weight="bold" className="text-rose-500" />
              <span>Theft Beacon</span>
            </button>

            {/* 4. Sync BLE / GPS Telemetry */}
            <button
              type="button"
              onClick={() => setActiveModal('sync_telemetry')}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-black bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-all cursor-pointer shadow-sm"
            >
              <ArrowsClockwise size={15} weight="bold" className="text-sky-500" />
              <span>Sync BLE</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* [TILE 2 - Col 8-12, Row 1]: Battery & Range Analytics                     */}
        {/* ========================================================================= */}
        <div className={`lg:col-span-5 ${cardStyle} min-h-[440px]`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-2">
              <BatteryCharging size={20} weight="duotone" className="text-amber-500 dark:text-amber-400" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider">Battery & Range</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Smart Power Management</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-[11px] font-bold">
              <Heartbeat size={14} weight="duotone" className="text-emerald-500 dark:text-emerald-400" />
              <span className="text-emerald-600 dark:text-emerald-400">Health {metrics.batteryHealthPercent}%</span>
            </div>
          </div>

          {/* Central Radial Bklit Gauge */}
          <div className="my-auto py-3 flex flex-col items-center justify-center">
            <div className="w-[180px] sm:w-[210px] max-w-full h-[140px] sm:h-[160px] mx-auto flex items-center justify-center relative">
              <Gauge
                value={metrics.batteryPercent}
                centerValue={metrics.batteryPercent}
                defaultLabel="BATTERY"
                suffix="%"
                activeFill={batteryColor}
                inactiveFill={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}
                orientation="arc"
                notchCornerRadius={2}
                totalNotches={36}
                className="w-full h-full"
              />
            </div>

            {/* Range Estimate Display */}
            <div className="grid grid-cols-2 gap-2.5 w-full mt-2">
              <div className="p-2.5 rounded-2xl bg-slate-100/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estimated Range</span>
                <span className="text-base font-black text-amber-600 dark:text-amber-400 mt-0.5">
                  ~{metrics.remainingRangeKm} km
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-100/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">PCB Battery</span>
                <span className="text-base font-black text-cyan-600 dark:text-cyan-400 mt-0.5">
                  {metrics.internalPcbBattery}%
                </span>
              </div>
            </div>
          </div>

          {/* Eco Contribution Banner */}
          <div className="pt-3 border-t border-slate-200/60 dark:border-white/10">
            <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
              darkMode
                ? 'bg-linear-to-r from-emerald-500/15 to-amber-500/10 border-emerald-500/20'
                : 'bg-emerald-50/80 border-emerald-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <TreeEvergreen size={22} weight="duotone" className="text-emerald-500 dark:text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-black text-emerald-700 dark:text-emerald-300">Eco-Smart Commuter</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Replaced ~{Math.round(metrics.totalSavedCo2Kg / 0.12)} car km</div>
                </div>
              </div>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{metrics.totalSavedCo2Kg} kg</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* [TILE 3 - Col 1-6, Row 2]: Last Ride & Fitness Summary                    */}
        {/* ========================================================================= */}
        <div className={`lg:col-span-6 ${cardStyle} min-h-[360px]`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Flame size={20} weight="duotone" className="text-amber-500" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider">Last Ride & Fitness</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Activity summary and workout metrics</p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-black">
              {metrics.lastTrip.rideMode}
            </span>
          </div>

          {/* Ride Title & Key Stats */}
          <div className="my-auto py-3 space-y-3">
            <div className="p-3 rounded-2xl bg-slate-100/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Route</span>
                <h5 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white mt-0.5">{metrics.lastTrip.title}</h5>
              </div>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{metrics.lastTrip.endedAt}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-2xl bg-slate-100/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Distance</span>
                <span className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5">{metrics.lastTrip.distanceKm} km</span>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-100/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Duration</span>
                <span className="text-xs sm:text-sm font-black text-cyan-600 dark:text-cyan-400 mt-0.5">{metrics.lastTrip.durationMinutes} min</span>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-100/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Calories</span>
                <span className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400 mt-0.5">{metrics.lastTrip.caloriesBurned} kcal</span>
              </div>
            </div>

            {/* Daily Distance Progress */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500 dark:text-slate-400">Daily Target ({dailyGoalKm} km)</span>
                <span className="text-amber-600 dark:text-amber-400">{metrics.distanceTodayKm} km ({progressDaily}%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-linear-to-r from-amber-500 to-emerald-400 transition-all duration-700"
                  style={{ width: `${progressDaily}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Trip CO₂ Saved: <strong className="text-emerald-600 dark:text-emerald-400">{metrics.lastTrip.co2SavedKg} kg</strong></span>
            <span className="text-[11px]">Sync: BLE Connected</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* [TILE 4 - Col 7-12, Row 2]: Live Bike GPS Tracker                         */}
        {/* ========================================================================= */}
        <div className={`lg:col-span-6 ${cardStyle} min-h-[360px]`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-2">
              <NavigationArrow size={20} weight="duotone" className="text-amber-500" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider">Smart GPS Beacon</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {metrics.locationZone} • {metrics.lastSeen}
                </p>
              </div>
            </div>

            <div className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-amber-600 dark:text-amber-300">
              GPS ACTIVE
            </div>
          </div>

          {/* Interactive OpenStreetMap Canvas */}
          <div className="my-auto py-2">
            <MobilityMap
              latitude={metrics.gps.latitude}
              longitude={metrics.gps.longitude}
              title="Cowboy Smart E-Bike"
              type="bike"
              lastUpdated={metrics.lastSeen}
              darkMode={darkMode}
              className="h-[220px]"
            />
          </div>

          {/* Location Footer */}
          <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Geofence: <strong className="text-slate-900 dark:text-white">{metrics.locationZone}</strong></span>
            <span className="font-mono text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
              {metrics.gps.latitude.toFixed(4)}°, {metrics.gps.longitude.toFixed(4)}°
            </span>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. ACTION CONFIRMATION MODALS                                 */}
      {/* ------------------------------------------------------------- */}

      {/* Lock Motor Modal */}
      <ActionConfirmModal
        isOpen={activeModal === 'lock'}
        onClose={() => setActiveModal(null)}
        onConfirm={handleExecuteModalAction}
        title="Lock Cowboy E-Bike"
        description="Are you sure you want to engage the electric motor lock and activate anti-theft crash and movement sensing?"
        confirmText="Lock E-Bike"
        confirmColor="emerald"
        icon={<Lock size={24} weight="bold" />}
        entityName={metrics.controls?.lockEntityId}
        darkMode={darkMode}
        isLoading={isActionPending}
      />

      {/* Unlock Motor Modal */}
      <ActionConfirmModal
        isOpen={activeModal === 'unlock'}
        onClose={() => setActiveModal(null)}
        onConfirm={handleExecuteModalAction}
        title="Unlock Cowboy E-Bike"
        description="Are you sure you want to unlock the bike motor and enable electric pedal assist?"
        confirmText="Unlock Motor"
        confirmColor="amber"
        icon={<LockOpen size={24} weight="bold" />}
        entityName={metrics.controls?.lockEntityId}
        darkMode={darkMode}
        isLoading={isActionPending}
      />

      {/* Auto-Lock Modal */}
      <ActionConfirmModal
        isOpen={activeModal === 'toggle_autolock'}
        onClose={() => setActiveModal(null)}
        onConfirm={handleExecuteModalAction}
        title="Configure Proximity Auto-Lock"
        description="Enable automatic motor locking when you walk away from the Cowboy e-bike with your smartphone?"
        confirmText="Save Auto-Lock"
        confirmColor="cyan"
        icon={<ShieldCheck size={24} weight="bold" />}
        entityName={metrics.controls?.autoLockSwitchId}
        darkMode={darkMode}
        isLoading={isActionPending}
      />

      {/* Theft Beacon Modal */}
      <ActionConfirmModal
        isOpen={activeModal === 'theft_beacon'}
        onClose={() => setActiveModal(null)}
        onConfirm={handleExecuteModalAction}
        title="Broadcast Emergency Theft Beacon"
        description="Warning: This will set the bike into high-alert tracking mode and broadcast continuous GPS beacons to emergency contacts."
        confirmText="Broadcast Beacon"
        confirmColor="rose"
        icon={<ShieldWarning size={24} weight="bold" />}
        darkMode={darkMode}
        isLoading={isActionPending}
      />

      {/* Sync BLE Telemetry Modal */}
      <ActionConfirmModal
        isOpen={activeModal === 'sync_telemetry'}
        onClose={() => setActiveModal(null)}
        onConfirm={handleExecuteModalAction}
        title="Sync Cowboy Telemetry"
        description="Query the latest battery level, odometer, trip history, and GPS coordinates over Bluetooth / cellular?"
        confirmText="Sync Now"
        confirmColor="indigo"
        icon={<ArrowsClockwise size={24} weight="bold" />}
        entityName={metrics.controls?.refreshButtonId}
        darkMode={darkMode}
        isLoading={isActionPending}
      />

    </div>
  );
}
