import React from 'react';
import {
  Heartbeat,
  Flame,
  Scales,
  Sparkle,
  MoonStars,
  DeviceMobile,
} from '@phosphor-icons/react';
import { useHealthData } from '../../hooks/useHealthData';
import { HealthActivityRingsCompact } from './health/HealthActivityRingsCompact';
import { HealthStatisticChart } from './health/HealthStatisticChart';
import { HealthMetricCard } from './health/HealthMetricCard';
import { HealthSleepDurationCard, HealthSleepStagesCard } from './health/HealthSleepTile';
import { HealthOnboardingEmptyState } from './health/HealthOnboardingEmptyState';

interface HealthViewProps {
  darkMode?: boolean;
}

export default function HealthView({ darkMode = true }: HealthViewProps) {
  const {
    timeRange,
    summaries,
    activityRingsData,
    totalSensorsFound,
    activeDevice,
    isPreviewDemo,
    setIsPreviewDemo,
    refreshHistory,
  } = useHealthData();

  // If no sensors detected and demo mode is not active, render Onboarding state
  if (totalSensorsFound === 0 && !isPreviewDemo) {
    return (
      <HealthOnboardingEmptyState
        onEnableDemo={() => setIsPreviewDemo(true)}
        onRefresh={refreshHistory}
        darkMode={darkMode}
      />
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col gap-4 sm:gap-5 animate-fadeIn pb-16 md:pb-8">
      {/* Top Header Row: Active Companion Device Pill & Demo Mode Exit Banner */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {activeDevice ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/40 dark:bg-black/20 backdrop-blur-md border border-slate-200/60 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs">
            <DeviceMobile size={15} weight="duotone" className="text-rose-500 shrink-0" />
            <span className="truncate">
              Bound to <strong className="text-slate-900 dark:text-white font-bold">{activeDevice.deviceName}</strong>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-white/10 text-slate-500 dark:text-slate-400">
              {activeDevice.sensorCount} sensors
            </span>
          </div>
        ) : (
          <div />
        )}

        {isPreviewDemo && (
          <button
            type="button"
            onClick={() => setIsPreviewDemo(false)}
            className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 dark:bg-amber-500/20 border border-amber-500/30 dark:border-amber-500/40 flex items-center gap-1.5 hover:bg-amber-500/25 dark:hover:bg-amber-500/30 transition-all cursor-pointer shadow-xs"
            title="Click to exit demo mode"
          >
            <Sparkle size={13} weight="fill" />
            <span>Demo Mode Active (Click to Exit)</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3 PANORAMIC SECTIONS: Top-Aligned with no empty space in Desktop View      */}
      {/* ========================================================================= */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* ======================================================================= */}
        {/* SECTION 1: Daily Activity & Concentric Rings Hero                       */}
        {/* ======================================================================= */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="p-4 sm:p-5 rounded-3xl backdrop-blur-xl bg-white/20 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 flex flex-col gap-4 shadow-[4px_6px_12px_rgba(0,0,0,0.15)]">
            {/* Card Section Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FF2D55]/15 text-[#FF2D55] flex items-center justify-center">
                  <Flame size={18} weight="fill" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Daily Activity
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Apple Health concentric rings &amp; movement
                  </p>
                </div>
              </div>
            </div>

            {/* Compact Apple Activity Rings & Statistics Side-by-Side */}
            <HealthActivityRingsCompact
              move={activityRingsData.move}
              exercise={activityRingsData.exercise}
              steps={activityRingsData.steps}
              darkMode={darkMode}
            />

            {/* Steps Interval Trend Chart */}
            {summaries['healthSteps'] && (
              <HealthStatisticChart
                summary={summaries['healthSteps']}
                timeRange={timeRange}
                darkMode={darkMode}
              />
            )}

            {/* Key Activity Biometrics */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {summaries['activeEnergy'] && (
                <HealthMetricCard
                  summary={summaries['activeEnergy']}
                  darkMode={darkMode}
                />
              )}
              {summaries['exerciseTime'] && (
                <HealthMetricCard
                  summary={summaries['exerciseTime']}
                  darkMode={darkMode}
                />
              )}
              {summaries['healthSteps'] && (
                <HealthMetricCard
                  summary={summaries['healthSteps']}
                  darkMode={darkMode}
                />
              )}
              {summaries['flightsClimbed'] && (
                <HealthMetricCard
                  summary={summaries['flightsClimbed']}
                  darkMode={darkMode}
                />
              )}
              {summaries['distance'] && (
                <HealthMetricCard
                  summary={summaries['distance']}
                  darkMode={darkMode}
                />
              )}
              {summaries['activePace'] && (
                <HealthMetricCard
                  summary={summaries['activePace']}
                  darkMode={darkMode}
                />
              )}
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* SECTION 2: Cardiovascular & Vitals Signals                              */}
        {/* ======================================================================= */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="p-4 sm:p-5 rounded-3xl backdrop-blur-xl bg-white/20 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 flex flex-col gap-4 shadow-[4px_6px_12px_rgba(0,0,0,0.15)]">
            {/* Card Section Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center">
                  <Heartbeat size={18} weight="fill" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Cardiovascular &amp; Vitals
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Heart rhythm, oxygenation &amp; vitals
                  </p>
                </div>
              </div>
            </div>

            {/* Heart Rate Interval Trend Chart */}
            {summaries['heartRate'] && (
              <HealthStatisticChart
                summary={summaries['heartRate']}
                timeRange={timeRange}
                darkMode={darkMode}
              />
            )}

            {/* Vitals Biometrics Grid */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {summaries['heartRate'] && (
                <HealthMetricCard
                  summary={summaries['heartRate']}
                  darkMode={darkMode}
                />
              )}
              {summaries['bloodOxygen'] && (
                <HealthMetricCard
                  summary={summaries['bloodOxygen']}
                  darkMode={darkMode}
                />
              )}
              {summaries['restingHeartRate'] && (
                <HealthMetricCard
                  summary={summaries['restingHeartRate']}
                  darkMode={darkMode}
                />
              )}
              {summaries['hrv'] && (
                <HealthMetricCard
                  summary={summaries['hrv']}
                  darkMode={darkMode}
                />
              )}
              {summaries['respiratoryRate'] && (
                <HealthMetricCard
                  summary={summaries['respiratoryRate']}
                  darkMode={darkMode}
                />
              )}
              {summaries['walkingHeartRate'] && (
                <HealthMetricCard
                  summary={summaries['walkingHeartRate']}
                  darkMode={darkMode}
                />
              )}
              {summaries['bodyTemperature'] && (
                <HealthMetricCard
                  summary={summaries['bodyTemperature']}
                  darkMode={darkMode}
                />
              )}
              {summaries['bpSystolic'] && (
                <HealthMetricCard
                  summary={summaries['bpSystolic']}
                  darkMode={darkMode}
                />
              )}
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* SECTION 3: Biometric Trends & Body Analytics                            */}
        {/* ======================================================================= */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="p-4 sm:p-5 rounded-3xl backdrop-blur-xl bg-white/20 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 flex flex-col gap-4 shadow-[4px_6px_12px_rgba(0,0,0,0.15)]">
            {/* Card Section Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                  <MoonStars size={18} weight="fill" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Sleep &amp; Body
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sleep stages, energy &amp; body metrics
                  </p>
                </div>
              </div>
            </div>

            {/* Active Energy Interval Trend Chart */}
            {summaries['activeEnergy'] && (
              <HealthStatisticChart
                summary={summaries['activeEnergy']}
                timeRange={timeRange}
                darkMode={darkMode}
              />
            )}

            {/* Body, Nutrition & Sleep Biometrics Grid */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {/* Square Tile 1: Sleep Duration with Backlit Donut / Pie Chart */}
              {(summaries['sleepDuration']?.entityId ||
                summaries['awake']?.entityId ||
                summaries['coreSleep']?.entityId ||
                summaries['deepSleep']?.entityId ||
                summaries['remSleep']?.entityId ||
                isPreviewDemo) && (
                <HealthSleepDurationCard
                  summary={summaries['sleepDuration']}
                  awake={summaries['awake']}
                  coreSleep={summaries['coreSleep']}
                  deepSleep={summaries['deepSleep']}
                  remSleep={summaries['remSleep']}
                  darkMode={darkMode}
                />
              )}

              {/* Square Tile 2: Sleep Stages Breakdown (Awake, REM, Core, Deep) */}
              {(summaries['sleepDuration']?.entityId ||
                summaries['awake']?.entityId ||
                summaries['coreSleep']?.entityId ||
                summaries['deepSleep']?.entityId ||
                summaries['remSleep']?.entityId ||
                isPreviewDemo) && (
                <HealthSleepStagesCard
                  sleepDuration={summaries['sleepDuration']}
                  awake={summaries['awake']}
                  coreSleep={summaries['coreSleep']}
                  deepSleep={summaries['deepSleep']}
                  remSleep={summaries['remSleep']}
                  darkMode={darkMode}
                />
              )}

              {summaries['vo2Max'] && (
                <HealthMetricCard
                  summary={summaries['vo2Max']}
                  darkMode={darkMode}
                />
              )}
              {summaries['weight'] && (
                <HealthMetricCard
                  summary={summaries['weight']}
                  darkMode={darkMode}
                />
              )}
              {summaries['bodyFat'] && (
                <HealthMetricCard
                  summary={summaries['bodyFat']}
                  darkMode={darkMode}
                />
              )}
              {summaries['leanBodyMass'] && (
                <HealthMetricCard
                  summary={summaries['leanBodyMass']}
                  darkMode={darkMode}
                />
              )}
              {summaries['water'] && (
                <HealthMetricCard
                  summary={summaries['water']}
                  darkMode={darkMode}
                />
              )}
              {summaries['restingEnergy'] && (
                <HealthMetricCard
                  summary={summaries['restingEnergy']}
                  darkMode={darkMode}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
