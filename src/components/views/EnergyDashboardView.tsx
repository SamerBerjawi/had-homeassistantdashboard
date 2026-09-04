/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useEnergyData } from '../../hooks/useEnergyData';
import {
  EnergyPeriodSelector,
  EnergyDistributionCard,
  PowerSourcesLineChartCard,
  EnergyUsageGraphCard,
  SolarProductionGraphCard,
  GasUsageGraphCard,
  WaterUsageGraphCard,
  DevicesEnergyGraphCard,
  EnergySourcesTableCard,
  EnergyHeroCards,
  EnergyUnconfiguredState
} from '../energy';
import { ArrowsClockwise, WarningCircle } from '@phosphor-icons/react';

interface EnergyDashboardViewProps {
  darkMode?: boolean;
}

export default function EnergyDashboardView({ darkMode = true }: EnergyDashboardViewProps) {
  const {
    period,
    setPeriod,
    shiftPeriod,
    isAtFutureLimit,
    dateLabel,
    loadState,
    isFetchingStats,
    error,
    refresh,
    isLive,
    model,
    realtime
  } = useEnergyData();

  // 1. Unconfigured State (Nothing configured in Home Assistant Settings → Dashboards → Energy)
  if (loadState === 'unconfigured') {
    return (
      <div className="w-full flex-1 flex flex-col justify-center pb-12">
        <EnergyUnconfiguredState onRefresh={refresh} darkMode={darkMode} />
      </div>
    );
  }

  // 2. Initial Loading State
  if (loadState === 'loading') {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center py-24 space-y-4">
        <ArrowsClockwise size={32} className="animate-spin text-amber-500" />
        <p className="text-sm font-bold text-slate-400">Loading Home Assistant Energy Statistics…</p>
      </div>
    );
  }

  // 3. Error State with Retry
  if (loadState === 'error' && error) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center py-16 px-4">
        <div
          className={`p-6 rounded-3xl border max-w-md w-full text-center space-y-4 ${
            darkMode ? 'bg-rose-500/10 border-rose-500/30 text-white' : 'bg-rose-50 border-rose-200 text-slate-900'
          }`}
        >
          <WarningCircle size={36} className="text-rose-500 mx-auto" />
          <h3 className="text-base font-extrabold">Failed to Load Energy Statistics</h3>
          <p className="text-xs text-slate-400">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const {
    totals,
    financials,
    buckets,
    devices,
    untrackedKwh,
    untrackedPercentage,
    hasSolar,
    hasGrid,
    hasBattery,
    hasGas,
    hasWater,
    hasDevices
  } = model;

  const hasAuxiliary = hasGas || hasWater;

  return (
    <div className="w-full flex-1 flex flex-col space-y-5 sm:space-y-6 pb-12 animate-fadeIn">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* TOP CONTROL TOOLBAR: Period Navigation & Live Status          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <EnergyPeriodSelector
        period={period}
        setPeriod={setPeriod}
        shiftPeriod={shiftPeriod}
        isAtFutureLimit={isAtFutureLimit}
        dateLabel={dateLabel}
        isFetchingStats={isFetchingStats}
        onRefresh={refresh}
        isLive={isLive}
        darkMode={darkMode}
      />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* HERO METRICS CARD: REDESIGNED AUTARKY & SELF-CONSUMPTION      */}
      {/* + 3 COMPACT HUAWEI FUSION SOLAR IMPACT TILES                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <EnergyHeroCards
        selfSufficiencyPercentage={totals.selfSufficiencyPercentage}
        selfConsumptionPercentage={totals.selfConsumptionPercentage}
        hasSolar={hasSolar}
        hasBattery={hasBattery}
        solarYieldKWh={totals.solar}
        solarConsumedKWh={totals.solarToHome}
        darkMode={darkMode}
      />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ROW 1: ENERGY DISTRIBUTION (1/3) & POWER SOURCES (2/3)         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        {/* Left 1/3 (4 cols): Energy Distribution Card */}
        <div className="lg:col-span-4 flex flex-col h-full">
          <EnergyDistributionCard
            className="h-full flex-1"
            totals={totals}
            realtime={realtime}
            hasSolar={hasSolar}
            hasGrid={hasGrid}
            hasBattery={hasBattery}
            hasGas={hasGas}
            hasWater={hasWater}
            darkMode={darkMode}
          />
        </div>

        {/* Right 2/3 (8 cols): Continuous Power Sources Timeline Chart */}
        <div className="lg:col-span-8 flex flex-col h-full">
          <PowerSourcesLineChartCard
            className="h-full flex-1"
            buckets={model.powerBuckets || model.buckets}
            realtime={realtime}
            hasSolar={hasSolar}
            hasGrid={hasGrid}
            hasBattery={hasBattery}
            darkMode={darkMode}
          />
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ROW 2: PRODUCTION & GRID (1/2) & DEVICES & TARIFF (1/2)        */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        {/* Left Column (Half Width / 6 cols): Production and Grid */}
        <div className="lg:col-span-6 flex flex-col gap-5 sm:gap-6 h-full justify-between">
          {/* Stacked Bar Consumption Graph */}
          <EnergyUsageGraphCard
            className="flex-1 h-full"
            buckets={buckets}
            totalConsumption={totals.homeConsumption}
            hasSolar={hasSolar}
            hasBattery={hasBattery}
            hasGrid={hasGrid}
            darkMode={darkMode}
          />

          {/* Solar Production & Forecast Bar Graph */}
          {hasSolar && (
            <SolarProductionGraphCard
              className="flex-1 h-full"
              buckets={buckets}
              totalSolar={totals.solar}
              forecastTotal={totals.solarForecastTotal}
              darkMode={darkMode}
            />
          )}
        </div>

        {/* Right Column (Half Width / 6 cols): Devices and Tariff */}
        <div className="lg:col-span-6 flex flex-col gap-5 sm:gap-6 h-full justify-between">
          {/* Device Consumption Nested Concentric Rings */}
          {hasDevices && (
            <DevicesEnergyGraphCard
              className="flex-1 h-full"
              devices={devices}
              untrackedKwh={untrackedKwh}
              untrackedPercentage={untrackedPercentage}
              totalHomeConsumption={totals.homeConsumption}
              darkMode={darkMode}
            />
          )}

          {/* Cost & Tariff Summary Table */}
          <EnergySourcesTableCard
            className="flex-1 h-full"
            financials={financials}
            darkMode={darkMode}
          />
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ROW 3: GAS & WATER USAGE (If Configured)                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {hasAuxiliary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {hasGas && (
            <GasUsageGraphCard
              buckets={buckets}
              totalGas={totals.gasUsage}
              gasUnit={totals.gasUnit}
              darkMode={darkMode}
            />
          )}
          {hasWater && (
            <WaterUsageGraphCard
              buckets={buckets}
              totalWater={totals.waterUsage}
              waterUnit={totals.waterUnit}
              darkMode={darkMode}
            />
          )}
        </div>
      )}
    </div>
  );
}

