/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StickVacuumTab Component
 * Panoramic glassmorphism command center for the Samsung Stick Vacuum and
 * Clean Station, featuring real-time presence, charging, empty dustbin action,
 * power & energy metrics, and dust bag maintenance telemetry.
 */

import React, { useState, useRef } from 'react';
import {
  Broom,
  BatteryCharging,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  Lightning,
  Sparkle,
  Trash,
  CheckCircle,
  WarningCircle,
  Clock,
  Leaf,
  Lightbulb,
  ArrowsClockwise,
  ArrowRight,
  ShieldCheck,
  House,
  Fan,
  Camera
} from '@phosphor-icons/react';
import { useStickVacuumData } from '../../../hooks/useStickVacuumData';
import { useUserConfig } from '../../../contexts/ConfigContext';
import { optimizeImageForUpload } from '../../../utils/imageOptimizer';

interface StickVacuumTabProps {
  darkMode?: boolean;
}

export const StickVacuumTab: React.FC<StickVacuumTabProps> = ({ darkMode = true }) => {
  const {
    metrics,
    triggerEmptyDustbin,
    setLampMode,
    openStickEntityModal
  } = useStickVacuumData();

  const { config, updateConfig, uploadVehicleAsset } = useUserConfig();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localImage, setLocalImage] = useState<string | null>(() => {
    return localStorage.getItem('had_stick_vacuum_image') || null;
  });

  const stickImage = localImage || config.vacuums?.stickImageUrl || config.vacuums?.stick?.imageUrl;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const optimized = await optimizeImageForUpload(file, {
        maxDimension: 1200,
        maxSizeBytes: 1.5 * 1024 * 1024
      });
      localStorage.setItem('had_stick_vacuum_image', optimized.dataUrl);
      setLocalImage(optimized.dataUrl);
      await uploadVehicleAsset(optimized.dataUrl, 'stick_vacuum_image');
    } catch (err) {
      console.error('Failed to upload stick vacuum image:', err);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.removeItem('had_stick_vacuum_image');
    setLocalImage(null);
    updateConfig((prev) => ({
      vacuums: {
        ...(prev.vacuums || {}),
        stickImageUrl: undefined,
        stick: { ...(prev.vacuums?.stick || {}), imageUrl: undefined }
      }
    }));
  };

  const getBatteryIcon = (pct: number) => {
    if (pct >= 80) return BatteryFull;
    if (pct >= 40) return BatteryMedium;
    return BatteryLow;
  };

  const BatteryIcon = getBatteryIcon(metrics.batteryPercent);

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start animate-fadeIn">
      {/* ========================================================================= */}
      {/* COLUMN 1: Station & Stick Cleaner Cockpit (Hero, Battery, Actions)        */}
      {/* ========================================================================= */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <div className="relative p-4 sm:p-5 rounded-3xl backdrop-blur-xl bg-white/20 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 flex flex-col gap-4 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] overflow-hidden">
          {/* Ambient Glow with corner containment */}
          <div
            className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none"
            style={{ clipPath: 'inset(0 round 24px)', WebkitClipPath: 'inset(0 round 24px)' }}
          >
            <div
              className={`absolute -top-16 -left-16 w-56 h-56 rounded-full blur-3xl opacity-25 transition-all duration-700 ${
                metrics.isDustBagFull
                  ? 'bg-rose-500'
                  : metrics.isCharging
                  ? 'bg-amber-500'
                  : 'bg-cyan-500'
              }`}
            />
          </div>

          {/* Section Header with Stick Vacuum Image in Top Right Corner */}
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex flex-col gap-2 min-w-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-500 flex items-center justify-center shrink-0">
                  <Broom size={18} weight="duotone" />
                </div>
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900 dark:text-white truncate">
                  Stick Vacuum
                </h2>
              </div>

              {/* Quick Status Pill */}
              <div className="inline-flex items-center">
                <div
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border shadow-xs ${
                    metrics.inStation
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      metrics.inStation ? 'bg-emerald-500' : 'bg-cyan-400 animate-pulse'
                    }`}
                  />
                  <span>{metrics.inStation ? 'In Station' : 'In Use'}</span>
                </div>
              </div>
            </div>

            {/* Top Right Corner Image & Upload Option */}
            <div className="relative group shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              {stickImage ? (
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/30 dark:bg-black/40 border border-slate-200/50 dark:border-white/10 shadow-xs overflow-hidden flex items-center justify-center">
                  <img
                    src={stickImage}
                    alt="Stick Vacuum"
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-xs">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 text-white transition-colors cursor-pointer"
                      title="Change image"
                    >
                      <Camera size={15} weight="bold" />
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="p-1.5 rounded-lg bg-rose-500/30 hover:bg-rose-500/50 text-rose-200 transition-colors cursor-pointer"
                      title="Remove image"
                    >
                      <Trash size={15} weight="bold" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/20 hover:border-sky-500 dark:hover:border-sky-400 bg-white/10 dark:bg-black/20 hover:bg-sky-500/5 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 transition-all cursor-pointer p-1 group"
                  title="Upload Stick Vacuum Image"
                >
                  <Camera size={20} weight="duotone" className="group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold">Upload</span>
                </button>
              )}
            </div>
          </div>

          {/* Hero Visual & Battery Display */}
          <div className="relative z-10 p-4 rounded-2xl bg-white/20 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 backdrop-blur-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs transition-all ${
                  metrics.isCharging
                    ? 'bg-amber-500/20 text-amber-500'
                    : 'bg-cyan-500/20 text-cyan-500'
                }`}
              >
                {metrics.isCharging ? (
                  <BatteryCharging size={26} weight="duotone" className="animate-pulse" />
                ) : (
                  <BatteryIcon size={26} weight="duotone" />
                )}
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                    {metrics.batteryPercent}%
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {metrics.isCharging ? 'Charging' : 'Battery'}
                  </span>
                </div>
              </div>
            </div>

            {/* Battery Level Mini Gauge */}
            <div className="w-16 flex flex-col gap-1 items-end">
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    metrics.batteryPercent > 50
                      ? 'bg-emerald-500'
                      : metrics.batteryPercent > 20
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${metrics.batteryPercent}%` }}
                />
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400">
                {metrics.cleanerState}
              </span>
            </div>
          </div>

          {/* Clean Station Action: Empty Dustbin Button */}
          <div className="relative z-10 flex flex-col gap-2">
            <button
              type="button"
              onClick={triggerEmptyDustbin}
              disabled={metrics.isEmptying || !metrics.inStation}
              className={`w-full py-3 px-4 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                metrics.isEmptying
                  ? 'bg-amber-500 text-slate-950 animate-pulse'
                  : metrics.inStation
                  ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 active:scale-[0.98]'
                  : 'bg-slate-200 dark:bg-white/5 text-slate-400 cursor-not-allowed'
              }`}
            >
              {metrics.isEmptying ? (
                <>
                  <ArrowsClockwise size={16} weight="bold" className="animate-spin" />
                  <span>Auto-Emptying Dustbin in Progress…</span>
                </>
              ) : (
                <>
                  <Trash size={16} weight="bold" />
                  <span>{metrics.inStation ? 'Empty Dustbin via Station' : 'Dock Stick to Empty Dustbin'}</span>
                </>
              )}
            </button>
          </div>

          {/* Clean Station Lamp Controls */}
          <div className="relative z-10 p-3.5 rounded-2xl bg-white/20 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 backdrop-blur-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Lightbulb size={18} weight="duotone" className="text-amber-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Station Lamp
              </span>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/10 dark:bg-white/5 border border-slate-200/40 dark:border-white/10">
              {metrics.lampOptions.map((opt) => {
                const isSelected = metrics.lampMode.toLowerCase() === opt.toLowerCase();
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setLampMode(opt)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Last Emptied Ribbon */}
          <div className="relative z-10 flex items-center justify-between text-xs px-1 text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1 text-[11px]">
              <Clock size={13} weight="bold" />
              <span>Last Emptied:</span>
            </span>
            <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">
              {metrics.lastEmptiedRelative}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COLUMN 2: Clean Station Power & Energy Telemetry                          */}
      {/* ========================================================================= */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <div className="relative p-4 sm:p-5 rounded-3xl backdrop-blur-xl bg-white/20 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 flex flex-col gap-4 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] overflow-hidden">
          {/* Ambient Glow */}
          <div
            className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none"
            style={{ clipPath: 'inset(0 round 24px)', WebkitClipPath: 'inset(0 round 24px)' }}
          >
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
          </div>

          {/* Section Header */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                <Lightning size={18} weight="duotone" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Power &amp; Energy
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openStickEntityModal('power')}
              className="text-xs text-cyan-500 hover:text-cyan-400 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Inspect</span>
              <ArrowRight size={12} weight="bold" />
            </button>
          </div>

          {/* Live Power Draw Hero Card */}
          <div className="relative z-10 p-4 rounded-2xl bg-white/20 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 backdrop-blur-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Current Station Draw
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
                  {metrics.currentPowerWatts}
                </span>
                <span className="text-xs font-bold text-emerald-500">Watts</span>
              </div>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Lightning size={24} weight="fill" className={metrics.isCharging ? 'animate-pulse' : ''} />
            </div>
          </div>

          {/* 2x2 Energy Grid */}
          <div className="relative z-10 grid grid-cols-2 gap-2.5 sm:gap-3">
            {/* Tile 1: Cumulative Energy */}
            <div
              onClick={() => openStickEntityModal('energy')}
              className="p-3.5 rounded-2xl bg-white/20 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 backdrop-blur-sm cursor-pointer hover:bg-white/30 dark:hover:bg-black/30 transition-all flex flex-col justify-between"
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Energy
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                  {metrics.totalEnergyKwh}
                </span>
                <span className="text-[10px] font-bold text-slate-400">kWh</span>
              </div>
            </div>

            {/* Tile 2: Energy Saved */}
            <div
              onClick={() => openStickEntityModal('energySaved')}
              className="p-3.5 rounded-2xl bg-white/20 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 backdrop-blur-sm cursor-pointer hover:bg-white/30 dark:hover:bg-black/30 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Energy Saved
                </span>
                <Leaf size={12} weight="fill" className="text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black font-mono text-emerald-500 dark:text-emerald-400">
                  {metrics.energySavedKwh}
                </span>
                <span className="text-[10px] font-bold text-emerald-500">kWh</span>
              </div>
            </div>

            {/* Tile 3: Energy Difference */}
            <div
              onClick={() => openStickEntityModal('energyDiff')}
              className="p-3.5 rounded-2xl bg-white/20 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 backdrop-blur-sm cursor-pointer hover:bg-white/30 dark:hover:bg-black/30 transition-all flex flex-col justify-between"
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Difference
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                  {metrics.energyDifferenceKwh}
                </span>
                <span className="text-[10px] font-bold text-slate-400">kWh</span>
              </div>
            </div>

            {/* Tile 4: Power Energy */}
            <div
              onClick={() => openStickEntityModal('powerEnergy')}
              className="p-3.5 rounded-2xl bg-white/20 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 backdrop-blur-sm cursor-pointer hover:bg-white/30 dark:hover:bg-black/30 transition-all flex flex-col justify-between"
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Power Energy
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                  {metrics.powerEnergyValue}
                </span>
                <span className="text-[10px] font-bold text-slate-400">W/h</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COLUMN 3: Dust Bag & Maintenance Telemetry                                */}
      {/* ========================================================================= */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <div className="relative p-4 sm:p-5 rounded-3xl backdrop-blur-xl bg-white/20 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 flex flex-col gap-4 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] overflow-hidden">
          {/* Ambient Glow */}
          <div
            className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none"
            style={{ clipPath: 'inset(0 round 24px)', WebkitClipPath: 'inset(0 round 24px)' }}
          >
            <div
              className={`absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl opacity-20 pointer-events-none ${
                metrics.isDustBagFull ? 'bg-rose-500' : 'bg-amber-500'
              }`}
            />
          </div>

          {/* Section Header */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                <ShieldCheck size={18} weight="duotone" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Dust Bag &amp; Health
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openStickEntityModal('dustBagCycles')}
              className="text-xs text-cyan-500 hover:text-cyan-400 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>History</span>
              <ArrowRight size={12} weight="bold" />
            </button>
          </div>

          {/* Dust Bag Status Banner */}
          <div
            className={`relative z-10 p-4 rounded-2xl border backdrop-blur-sm flex items-start gap-3 transition-all ${
              metrics.isDustBagFull
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-900 dark:text-rose-100'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-900 dark:text-emerald-100'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                metrics.isDustBagFull
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-500'
              }`}
            >
              {metrics.isDustBagFull ? (
                <WarningCircle size={22} weight="fill" />
              ) : (
                <CheckCircle size={22} weight="fill" />
              )}
            </div>

            <div>
              <h3 className="text-xs font-extrabold">
                {metrics.isDustBagFull
                  ? 'Clean Station Dust Bag Full'
                  : 'Station Dust Bag Operational'}
              </h3>
            </div>
          </div>

          {/* Cycles Counter Card */}
          <div className="relative z-10 p-4 rounded-2xl bg-white/20 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 backdrop-blur-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Dust Bag Evacuation Cycles
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                  {metrics.dustBagCycles}
                </span>
                <span className="text-xs font-bold text-amber-500">cycles logged</span>
              </div>
            </div>

            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Trash size={20} weight="duotone" />
            </div>
          </div>

          {/* Maintenance Checklist */}
          <div className="relative z-10 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-1">
              Stick Vacuum Checklist
            </span>

            <div className="p-3 rounded-2xl bg-white/20 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 backdrop-blur-sm space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <CheckCircle size={14} weight="fill" className="text-emerald-500" />
                  <span>Micro Clean Filter</span>
                </span>
                <span className="font-mono text-[11px] font-bold text-emerald-500">Clean</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <CheckCircle size={14} weight="fill" className="text-emerald-500" />
                  <span>Dual Jet Brush Roller</span>
                </span>
                <span className="font-mono text-[11px] font-bold text-emerald-500">Inspected</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <CheckCircle size={14} weight="fill" className="text-emerald-500" />
                  <span>Clean Station Suction Tube</span>
                </span>
                <span className="font-mono text-[11px] font-bold text-emerald-500">Clear</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StickVacuumTab;
