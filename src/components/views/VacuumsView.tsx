/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vacuums & Robotic Cleaners Subsystem View
 * Magic UI Bento Grid layout with companion entity aggregation and natural language house status
 */

import React, { useMemo, useState } from 'react';
import {
  Broom,
  Play,
  Pause,
  ArrowArcLeft,
  Sparkle,
  CheckCircle,
  Warning,
  HouseLine,
  Wrench,
  Gauge,
  ArrowsClockwise
} from '@phosphor-icons/react';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { discoverVacuumDevices } from '../../services/vacuumDiscovery';
import VacuumCard from '../vacuums/VacuumCard';
import ViewEmptyState from '../ui/ViewEmptyState';
import ViewLoadingState from '../ui/ViewLoadingState';

interface ViewProps {
  darkMode?: boolean;
}

export default function VacuumsView({ darkMode = true }: ViewProps) {
  const isLoading = useAutoLayoutStore((s) => s.isLoading);
  const domainGroups = useAutoLayoutStore((s) => s.domainGroups);
  const resolvedEntities = useAutoLayoutStore((s) => s.resolvedEntities);
  const states = useAutoLayoutStore((s) => s.states);
  const entityRegistry = useAutoLayoutStore((s) => s.entityRegistry);
  const devices = useAutoLayoutStore((s) => s.devices);
  const callHAService = useAutoLayoutStore((s) => s.callHAService);

  const vacuumEntities = domainGroups['vacuum'] || [];

  const [isBatchOperating, setIsBatchOperating] = useState<boolean>(false);

  // Discover and aggregate companion entities
  const { vacuums, summary } = useMemo(() => {
    return discoverVacuumDevices(
      vacuumEntities,
      resolvedEntities,
      states,
      entityRegistry || [],
      devices || []
    );
  }, [vacuumEntities, resolvedEntities, states, entityRegistry, devices]);

  const handleStartAll = async () => {
    setIsBatchOperating(true);
    try {
      await Promise.all(
        vacuums.map((v) => callHAService('vacuum', 'start', {}, { entity_id: v.entityId }))
      );
    } catch (err) {
      console.warn('[VacuumsView] Start all error:', err);
    } finally {
      setTimeout(() => setIsBatchOperating(false), 800);
    }
  };

  const handleDockAll = async () => {
    setIsBatchOperating(true);
    try {
      await Promise.all(
        vacuums.map((v) => callHAService('vacuum', 'return_to_base', {}, { entity_id: v.entityId }))
      );
    } catch (err) {
      console.warn('[VacuumsView] Dock all error:', err);
    } finally {
      setTimeout(() => setIsBatchOperating(false), 800);
    }
  };

  if (isLoading) {
    return (
      <ViewLoadingState
        title="Loading Vacuum Fleet..."
        subtitle="Discovering robotic cleaners, mop stations, LiDAR maps, and dock sensors"
        darkMode={darkMode}
      />
    );
  }

  if (vacuums.length === 0) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center">
        <ViewEmptyState
          icon={Broom}
          title="No Vacuum Cleaners Configured"
          badgeText="Cleaning Subsystem"
          description="Connect robotic vacuums, mop stations, and cordless stick vacuums in Home Assistant to monitor cleaning status, dock telemetry, and battery levels."
          configPath="Settings → Devices & Services → Add Integration"
          darkMode={darkMode}
        />
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col space-y-6 animate-fadeIn pb-24 md:pb-8">
      {/* ------------------------------------------------------------- */}
      {/* 1. NATURAL LANGUAGE HOUSE SUMMARY BANNER                       */}
      {/* ------------------------------------------------------------- */}
      <div
        style={{ boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.25)' }}
        className={`p-5 sm:p-6 rounded-3xl border ${
          summary.activeCleaningCount > 0
            ? 'border-emerald-500/40 bg-emerald-500/10'
            : summary.hasErrors
            ? 'border-rose-500/40 bg-rose-500/10'
            : 'border-slate-200/80 dark:border-white/10 bg-slate-900/60'
        } backdrop-blur-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${
              summary.activeCleaningCount > 0
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 animate-pulse'
                : summary.hasErrors
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-teal-500/20 border-teal-500/40 text-teal-300'
            }`}
          >
            <Broom size={24} weight="duotone" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-white truncate">
                Robot Vacuum Fleet
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  summary.activeCleaningCount > 0
                    ? 'bg-emerald-500/25 text-emerald-300'
                    : 'bg-white/10 text-slate-300'
                }`}
              >
                {summary.activeCleaningCount > 0
                  ? `${summary.activeCleaningCount} Cleaning`
                  : 'All Docked'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-0.5">
              {summary.summarySentence}
            </p>
          </div>
        </div>

        {/* Global Batch Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleStartAll}
            disabled={isBatchOperating || summary.activeCleaningCount === vacuums.length}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl bg-linear-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
          >
            <Play size={15} weight="fill" />
            <span>Start All</span>
          </button>

          <button
            type="button"
            onClick={handleDockAll}
            disabled={isBatchOperating || summary.dockedCount === vacuums.length}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/10 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <ArrowArcLeft size={15} weight="bold" />
            <span>Dock All</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. BENTO GRID OF ROBOT VACUUM CARDS                            */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vacuums.map((vac) => (
          <VacuumCard key={vac.entityId} vacuum={vac} darkMode={darkMode} />
        ))}
      </div>
    </div>
  );
}
