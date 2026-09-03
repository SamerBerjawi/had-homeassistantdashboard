/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Apple Health & Vitals Dashboard View
 * Comprehensive health monitoring station integrating Apple Health telemetry
 * via Home Assistant companion app sensors, WebSocket recorder statistics,
 * interactive time-range filtering, and MagicUI interactive primitives.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heartbeat,
  Flame,
  Waveform,
  Scales,
  ArrowClockwise,
  DeviceMobile,
  Sparkle,
  CalendarBlank,
} from '@phosphor-icons/react';
import { useHealthData } from '../../hooks/useHealthData';
import { HealthTimeRange } from '../../types/health';
import AppleActivityCard, { ActivityData } from '../kokonutui/apple-activity-card';
import { HealthTimeseriesChart } from './health/HealthTimeseriesChart';
import { HealthMetricCard } from './health/HealthMetricCard';
import { HealthActivitySection } from './health/HealthActivitySection';
import { HealthVitalsSection } from './health/HealthVitalsSection';
import { HealthBodySection } from './health/HealthBodySection';
import { HealthOnboardingEmptyState } from './health/HealthOnboardingEmptyState';
import AdaptiveSectionTabs, { SectionTabItem } from '../common/AdaptiveSectionTabs';
import { BentoGrid } from '../ui/BentoGrid';
import { BentoCard } from '../ui/BentoCard';
import { AnimatedBadge } from '../ui/AnimatedBadge';
import ViewLoadingState from '../ui/ViewLoadingState';

interface HealthViewProps {
  darkMode?: boolean;
}

type HealthSubTab = 'overview' | 'activity' | 'vitals' | 'body';

export default function HealthView({ darkMode = true }: HealthViewProps) {
  const {
    devices,
    activeDevice,
    selectedDeviceId,
    setSelectedDeviceId,
    timeRange,
    setTimeRange,
    summaries,
    activityRingsData,
    isLoadingHistory,
    totalSensorsFound,
    isPreviewDemo,
    setIsPreviewDemo,
    refreshHistory,
  } = useHealthData();

  const [activeSubTab, setActiveSubTab] = useState<HealthSubTab>('overview');

  const tabs: SectionTabItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Heartbeat,
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: Flame,
    },
    {
      id: 'vitals',
      label: 'Heart & Vitals',
      icon: Waveform,
    },
    {
      id: 'body',
      label: 'Body & Nutrition',
      icon: Scales,
    },
  ];

  const timeRanges: { id: HealthTimeRange; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'year', label: 'This Year' },
  ];

  const kokonutActivities: ActivityData[] = useMemo(() => [
    {
      label: "MOVE",
      value: Math.min(100, Math.round((activityRingsData.move.current / (activityRingsData.move.goal || 1)) * 100)),
      color: "#FF2D55",
      size: 200,
      current: activityRingsData.move.current,
      target: activityRingsData.move.goal,
      unit: activityRingsData.move.unit.toUpperCase(),
    },
    {
      label: "EXERCISE",
      value: Math.min(100, Math.round((activityRingsData.exercise.current / (activityRingsData.exercise.goal || 1)) * 100)),
      color: "#A3F900",
      size: 160,
      current: activityRingsData.exercise.current,
      target: activityRingsData.exercise.goal,
      unit: activityRingsData.exercise.unit.toUpperCase(),
    },
    {
      label: "STAND",
      value: Math.min(100, Math.round((activityRingsData.steps.current / (activityRingsData.steps.goal || 1)) * 100)),
      color: "#04C7DD",
      size: 120,
      current: activityRingsData.steps.current,
      target: activityRingsData.steps.goal,
      unit: activityRingsData.steps.unit.toUpperCase(),
    },
  ], [activityRingsData]);

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
    <div className="w-full flex-1 flex flex-col gap-5 sm:gap-6 animate-fadeIn pb-24 md:pb-8">
      {/* Top Header Command Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        {/* Left: View Identity & Device Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF2D55] to-[#AF52DE] text-white flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(255,45,85,0.35)]">
            <Heartbeat size={22} weight="fill" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Health &amp; Vitals
              </h1>

              {isPreviewDemo ? (
                <button
                  type="button"
                  onClick={() => setIsPreviewDemo(false)}
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 flex items-center gap-1 hover:bg-amber-500/30 transition-all cursor-pointer shadow-xs"
                  title="Click to exit demo mode"
                >
                  <Sparkle size={12} weight="fill" />
                  <span>Demo Mode</span>
                </button>
              ) : (
                <AnimatedBadge variant="coral">
                  {totalSensorsFound} {totalSensorsFound === 1 ? 'Sensor' : 'Sensors'}
                </AnimatedBadge>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Apple Health biometric signals &amp; historical recorder analytics
            </p>
          </div>

          {/* Multi-Device Picker Pill (if >1 device found) */}
          {devices.length > 1 && (
            <div className="relative inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl text-xs font-bold bg-white/20 dark:bg-black/20 text-slate-800 dark:text-slate-200 backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)]">
              <DeviceMobile size={15} weight="duotone" className="text-[#FF2D55]" />
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="bg-transparent border-none outline-none cursor-pointer pr-2 font-bold"
              >
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId} className="bg-slate-900 text-white">
                    {d.deviceName} ({d.sensorCount})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right: Time-Range Filter & Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/20 dark:bg-black/20 backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)]">
            <CalendarBlank size={14} weight="bold" className="text-slate-400 ml-1.5 mr-0.5 hidden sm:inline" />
            {timeRanges.map((range) => {
              const isSelected = timeRange === range.id;
              return (
                <button
                  key={range.id}
                  type="button"
                  onClick={() => setTimeRange(range.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#FF2D55] to-[#FF5E3A] text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {range.label}
                </button>
              );
            })}
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={refreshHistory}
            disabled={isLoadingHistory}
            title="Refresh Health Telemetry"
            className="p-2 rounded-2xl bg-white/20 hover:bg-white/30 dark:bg-black/20 dark:hover:bg-black/30 text-slate-700 dark:text-slate-300 backdrop-blur-sm transition-all cursor-pointer disabled:opacity-50 shadow-[4px_6px_12px_rgba(0,0,0,0.15)]"
          >
            <ArrowClockwise
              size={16}
              weight="bold"
              className={isLoadingHistory ? 'animate-spin text-[#FF2D55]' : ''}
            />
          </button>
        </div>
      </div>

      {/* Sub-Category Navigation Tabs */}
      <AdaptiveSectionTabs
        tabs={tabs}
        activeTab={activeSubTab}
        onChange={(tab) => setActiveSubTab(tab as HealthSubTab)}
        darkMode={darkMode}
      />

      {/* Animated Content per Tab */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Top Row: Activity Concentric Rings Card & Key Cardiac Indicator */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Activity Rings Hero */}
              <BentoCard
                colSpan={6}
                hasBorderBeam={true}
                borderBeamColorFrom="#FF2D55"
                borderBeamColorTo="#A1E833"
                darkMode={darkMode}
                className="lg:col-span-7 flex items-center justify-center p-2 sm:p-4"
              >
                <AppleActivityCard
                  title="Daily Activity Progress"
                  activities={kokonutActivities}
                  className="w-full p-2 sm:p-4 max-w-full"
                />
              </BentoCard>

              {/* Heart Rate & Vitals Snapshot */}
              <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
                {summaries['heartRate'] && (
                  <HealthMetricCard
                    summary={summaries['heartRate']}
                    darkMode={darkMode}
                    highlighted={true}
                  />
                )}
                {summaries['bloodOxygen'] && (
                  <HealthMetricCard
                    summary={summaries['bloodOxygen']}
                    darkMode={darkMode}
                  />
                )}
              </div>
            </div>

            {/* Interactive Trend Chart Hero */}
            <HealthTimeseriesChart
              summaries={summaries}
              timeRange={timeRange}
              darkMode={darkMode}
            />

            {/* Favorites Bento Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Health Favorites
                </h3>
                <span className="text-xs font-bold text-slate-400">
                  Quick Biometrics
                </span>
              </div>

              <BentoGrid cols={4}>
                {summaries['healthSteps'] && (
                  <HealthMetricCard summary={summaries['healthSteps']} darkMode={darkMode} />
                )}
                {summaries['activeEnergy'] && (
                  <HealthMetricCard summary={summaries['activeEnergy']} darkMode={darkMode} />
                )}
                {summaries['restingHeartRate'] && (
                  <HealthMetricCard summary={summaries['restingHeartRate']} darkMode={darkMode} />
                )}
                {summaries['hrv'] && (
                  <HealthMetricCard summary={summaries['hrv']} darkMode={darkMode} />
                )}
                {summaries['distance'] && (
                  <HealthMetricCard summary={summaries['distance']} darkMode={darkMode} />
                )}
                {summaries['flightsClimbed'] && (
                  <HealthMetricCard summary={summaries['flightsClimbed']} darkMode={darkMode} />
                )}
                {summaries['respiratoryRate'] && (
                  <HealthMetricCard summary={summaries['respiratoryRate']} darkMode={darkMode} />
                )}
                {summaries['weight'] && (
                  <HealthMetricCard summary={summaries['weight']} darkMode={darkMode} />
                )}
              </BentoGrid>
            </div>
          </motion.div>
        )}

        {activeSubTab === 'activity' && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <HealthActivitySection summaries={summaries} darkMode={darkMode} />
          </motion.div>
        )}

        {activeSubTab === 'vitals' && (
          <motion.div
            key="vitals"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <HealthVitalsSection summaries={summaries} darkMode={darkMode} />
          </motion.div>
        )}

        {activeSubTab === 'body' && (
          <motion.div
            key="body"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <HealthBodySection summaries={summaries} darkMode={darkMode} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
