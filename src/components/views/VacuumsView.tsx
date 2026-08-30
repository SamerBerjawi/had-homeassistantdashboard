/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Vacuums & Robotic Cleaners View
 * Accurate live state rendering for docked, charging, cleaning, returning, paused, and error states.
 */

import React, { useState } from 'react';
import {
  Broom,
  Play,
  Pause,
  ArrowArcLeft,
  MapPin,
  BatteryCharging,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  CheckCircle,
  Warning,
  Fan,
  Sparkle,
  HouseLine
} from '@phosphor-icons/react';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import ViewEmptyState from '../ui/ViewEmptyState';
import ViewLoadingState from '../ui/ViewLoadingState';

interface ViewProps {
  darkMode?: boolean;
}

export default function VacuumsView({ darkMode = true }: ViewProps) {
  const isLoading = useAutoLayoutStore((s) => s.isLoading);
  const domainGroups = useAutoLayoutStore((s) => s.domainGroups);
  const callHAService = useAutoLayoutStore((s) => s.callHAService);
  const vacuumEntities = domainGroups['vacuum'] || [];

  const [operatingEntityId, setOperatingEntityId] = useState<string | null>(null);

  const handleVacuumAction = async (entityId: string, action: 'start' | 'pause' | 'stop' | 'return_to_base' | 'locate') => {
    setOperatingEntityId(entityId);
    try {
      if (action === 'start') {
        await callHAService('vacuum', 'start', {}, { entity_id: entityId });
      } else if (action === 'pause') {
        await callHAService('vacuum', 'pause', {}, { entity_id: entityId });
      } else if (action === 'return_to_base') {
        await callHAService('vacuum', 'return_to_base', {}, { entity_id: entityId });
      } else if (action === 'locate') {
        await callHAService('vacuum', 'locate', {}, { entity_id: entityId });
      }
    } catch (err) {
      console.warn('[VacuumsView] Service call error:', err);
    } finally {
      setTimeout(() => setOperatingEntityId(null), 800);
    }
  };

  if (isLoading) {
    return <ViewLoadingState title="Loading Vacuum Cleaners..." subtitle="Querying robotic cleaners, mop stations, and dock sensors" darkMode={darkMode} />;
  }

  if (vacuumEntities.length === 0) {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {vacuumEntities.map((vac) => {
          const rawState = (vac.state || 'docked').toLowerCase();
          const isCleaning = rawState === 'cleaning' || rawState === 'on';
          const isReturning = rawState === 'returning';
          const isPaused = rawState === 'paused';
          const isError = rawState === 'error';
          const isDocked = rawState === 'docked';
          const isIdle = rawState === 'idle' || rawState === 'off';

          const battery = vac.attributes?.battery_level ?? vac.attributes?.battery;
          const fanSpeed = vac.attributes?.fan_speed;
          const isOperating = operatingEntityId === vac.entity_id;

          // State label & color styling
          let stateLabel = 'Docked & Ready';
          let stateColor = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
          let stateIcon = CheckCircle;

          if (isCleaning) {
            stateLabel = 'Actively Cleaning';
            stateColor = 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/40 animate-pulse';
            stateIcon = Broom;
          } else if (isReturning) {
            stateLabel = 'Returning to Dock';
            stateColor = 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30';
            stateIcon = ArrowArcLeft;
          } else if (isPaused) {
            stateLabel = 'Cleaning Paused';
            stateColor = 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
            stateIcon = Pause;
          } else if (isError) {
            stateLabel = 'Attention Needed (Error)';
            stateColor = 'bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/40';
            stateIcon = Warning;
          } else if (isDocked) {
            stateLabel = battery !== undefined && battery < 100 ? 'Docked & Charging' : 'Docked (Standby)';
            stateColor = 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10';
            stateIcon = CheckCircle;
          } else if (isIdle) {
            stateLabel = 'Idle on Standby';
            stateColor = 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10';
            stateIcon = CheckCircle;
          }

          const StateIconComponent = stateIcon;

          return (
            <div
              key={vac.entity_id}
              className={`p-5 sm:p-6 rounded-3xl border flex flex-col justify-between transition-all duration-200 shadow-xs ${
                darkMode
                  ? 'bg-slate-900/70 border-white/10 text-white hover:bg-slate-900/90'
                  : 'bg-white border-slate-200 text-slate-900 hover:shadow-md'
              }`}
            >
              <div className="space-y-4">
                {/* Header: Icon, Name & Live State Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs ${
                        isCleaning
                          ? 'bg-teal-500/20 text-teal-400 border-teal-500/40'
                          : darkMode
                          ? 'bg-white/5 border-white/10 text-slate-300'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <Broom size={24} weight="duotone" className={isCleaning ? 'animate-bounce text-teal-400' : ''} />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                        {vac.name}
                      </h4>
                      <p className="text-xs font-mono text-slate-400 truncate">
                        {vac.entity_id}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 shrink-0 ${stateColor}`}>
                    <StateIconComponent size={13} weight="bold" />
                    <span>{stateLabel}</span>
                  </span>
                </div>

                {/* Telemetry Row: Battery & Fan Speed */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  {/* Battery Metric */}
                  <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-white/3 border border-slate-200/80 dark:border-white/5 flex items-center gap-2.5">
                    <div className="text-emerald-500 dark:text-emerald-400">
                      {battery !== undefined && battery >= 80 ? (
                        <BatteryFull size={20} weight="duotone" />
                      ) : battery !== undefined && battery >= 30 ? (
                        <BatteryMedium size={20} weight="duotone" />
                      ) : (
                        <BatteryLow size={20} weight="duotone" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Battery</div>
                      <div className="text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white">
                        {battery !== undefined ? `${battery}%` : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Fan Speed / Clean Mode */}
                  <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-white/3 border border-slate-200/80 dark:border-white/5 flex items-center gap-2.5">
                    <div className="text-cyan-500 dark:text-cyan-400">
                      <Fan size={20} weight="duotone" className={isCleaning ? 'animate-spin' : ''} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Mode / Fan</div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white capitalize truncate">
                        {fanSpeed || (isCleaning ? 'Standard' : 'Quiet')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-5 mt-4 border-t border-slate-100 dark:border-white/5 flex items-center gap-2">
                {isCleaning ? (
                  <button
                    type="button"
                    disabled={isOperating}
                    onClick={() => handleVacuumAction(vac.entity_id, 'pause')}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
                  >
                    <Pause size={15} weight="bold" />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isOperating}
                    onClick={() => handleVacuumAction(vac.entity_id, 'start')}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/20 transition-all cursor-pointer active:scale-95"
                  >
                    <Play size={15} weight="bold" />
                    <span>Start Cleaning</span>
                  </button>
                )}

                {/* Return to Dock Button */}
                {!isDocked && (
                  <button
                    type="button"
                    disabled={isOperating}
                    onClick={() => handleVacuumAction(vac.entity_id, 'return_to_base')}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 dark:border-white/10 transition-all cursor-pointer active:scale-95"
                    title="Return to Dock"
                  >
                    <ArrowArcLeft size={15} weight="bold" />
                    <span>Dock</span>
                  </button>
                )}

                {/* Locate / Ping Button */}
                <button
                  type="button"
                  disabled={isOperating}
                  onClick={() => handleVacuumAction(vac.entity_id, 'locate')}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 dark:border-white/10 transition-all cursor-pointer active:scale-95"
                  title="Locate Robotic Cleaner"
                >
                  <MapPin size={15} weight="bold" />
                  <span className="hidden sm:inline">Locate</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
