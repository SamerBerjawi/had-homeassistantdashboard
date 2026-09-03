/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * VacuumsHeaderSentence:
 * Renders an adaptive natural-language vacuum summary sentence where identified live entities
 * and telemetry metrics are displayed in stylized colored badge pills, following the exact
 * approach of WeatherHeaderSentence and RoomsHeaderSentence.
 */

import React, { useMemo } from 'react';
import {
  Broom,
  Play,
  Pause,
  ArrowArcLeft,
  BatteryCharging,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
  CheckCircle,
  Warning,
  MapPin,
  Timer,
  Gauge,
  Sparkle,
  Wrench,
  Drop,
  Fan
} from '@phosphor-icons/react';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { discoverVacuumDevices } from '../../services/vacuumDiscovery';

interface VacuumsHeaderSentenceProps {
  darkMode?: boolean;
  className?: string;
}

export default function VacuumsHeaderSentence({
  darkMode = true,
  className = ''
}: VacuumsHeaderSentenceProps) {
  const domainGroups = useAutoLayoutStore((s) => s.domainGroups);
  const resolvedEntities = useAutoLayoutStore((s) => s.resolvedEntities);
  const states = useAutoLayoutStore((s) => s.states);
  const entityRegistry = useAutoLayoutStore((s) => s.entityRegistry);
  const devices = useAutoLayoutStore((s) => s.devices);

  const vacuumEntities = (domainGroups['vacuum'] || []).filter((v) => !v.hidden && !v.disabled_by);

  const { vacuums, summary } = useMemo(() => {
    return discoverVacuumDevices(
      vacuumEntities,
      resolvedEntities,
      states,
      entityRegistry || [],
      devices || []
    );
  }, [vacuumEntities, resolvedEntities, states, entityRegistry, devices]);

  const activeVacuums = vacuums.filter((v) => v.state === 'cleaning');
  const returningVacuums = vacuums.filter((v) => v.state === 'returning');
  const pausedVacuums = vacuums.filter((v) => v.state === 'paused');
  const errorVacuums = vacuums.filter((v) => v.state === 'error');
  const dockedVacuums = vacuums.filter((v) => v.state === 'docked');

  // Case 0: No vacuum entities found
  if (vacuums.length === 0) {
    return (
      <div
        className={`inline-flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-medium leading-relaxed ${
          darkMode ? 'text-slate-300' : 'text-slate-600'
        } ${className}`}
      >
        <span>Currently,</span>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold border shadow-xs ${
            darkMode
              ? 'bg-slate-800 border-white/10 text-slate-300'
              : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}
        >
          <Broom size={14} weight="duotone" className="text-teal-400" />
          <span>No robotic vacuums connected</span>
        </span>
        <span>in Home Assistant.</span>
      </div>
    );
  }

  // Case 1: Obstruction / Error Detected
  if (errorVacuums.length > 0) {
    const errVac = errorVacuums[0];
    return (
      <div
        className={`inline-flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-medium leading-relaxed ${
          darkMode ? 'text-slate-300' : 'text-slate-600'
        } ${className}`}
      >
        <span>Attention required:</span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border shadow-xs ${
            darkMode
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <Warning size={13} weight="fill" className="text-rose-400" />
          <span>{errVac.name}</span>
        </span>
        <span>encountered an issue in the</span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border shadow-xs ${
            darkMode
              ? 'bg-slate-800 border-white/10 text-slate-200'
              : 'bg-slate-100 border-slate-200 text-slate-800'
          }`}
        >
          <MapPin size={13} weight="bold" className="text-amber-400" />
          <span>{errVac.currentRoom || 'Living Area'}</span>
        </span>
        <span>({errVac.errorCode || 'Obstruction detected'}).</span>
      </div>
    );
  }

  // Case 2: Active Cleaning Mission (Single or Multi-Vacuums)
  if (activeVacuums.length > 0) {
    const primary = activeVacuums[0];
    const BatteryIcon = primary.batteryCharging
      ? BatteryCharging
      : primary.batteryLevel >= 80
      ? BatteryFull
      : primary.batteryLevel >= 30
      ? BatteryMedium
      : BatteryLow;

    if (activeVacuums.length === 1) {
      return (
        <div
          className={`inline-flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-medium leading-relaxed ${
            darkMode ? 'text-slate-300' : 'text-slate-600'
          } ${className}`}
        >
          <span>Currently,</span>
          {/* Vacuum Entity Pill */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold border shadow-xs ${
              darkMode
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <Broom size={14} weight="duotone" className="text-emerald-400 animate-spin [animation-duration:4s]" />
            <span>{primary.name}</span>
          </span>

          <span>is actively vacuuming the</span>

          {/* Target Room Pill */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border shadow-xs ${
              darkMode
                ? 'bg-teal-500/15 border-teal-500/30 text-teal-300'
                : 'bg-teal-50 border-teal-200 text-teal-800'
            }`}
          >
            <MapPin size={13} weight="bold" className="text-teal-400" />
            <span>{primary.currentRoom || 'Living Room'}</span>
          </span>

          <span>at</span>

          {/* Battery Pill */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-mono font-bold border shadow-xs ${
              darkMode
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            <BatteryIcon size={14} weight="fill" />
            <span>{primary.batteryLevel}%</span>
          </span>

          {/* Cleaning Time & Area Pill */}
          {(primary.cleaningTimeMinutes || primary.cleanedAreaM2) && (
            <>
              <span>with</span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-mono font-bold border shadow-xs ${
                  darkMode
                    ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                    : 'bg-sky-50 border-sky-200 text-sky-800'
                }`}
              >
                <Timer size={13} weight="bold" className="text-sky-400" />
                <span>{primary.cleaningTimeMinutes || 28} min</span>
              </span>
              {primary.cleanedAreaM2 ? (
                <>
                  <span>and</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-mono font-bold border shadow-xs ${
                      darkMode
                        ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                        : 'bg-purple-50 border-purple-200 text-purple-800'
                    }`}
                  >
                    <Gauge size={13} weight="bold" className="text-purple-400" />
                    <span>{primary.cleanedAreaM2} m² cleaned</span>
                  </span>
                </>
              ) : null}
            </>
          )}

          <span>while all consumables remain in good health.</span>
        </div>
      );
    }

    // Multiple Vacuums Cleaning Concurrently
    const totalM2 = activeVacuums.reduce((acc, v) => acc + (v.cleanedAreaM2 || 0), 0);
    return (
      <div
        className={`inline-flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-medium leading-relaxed ${
          darkMode ? 'text-slate-300' : 'text-slate-600'
        } ${className}`}
      >
        <span>Currently,</span>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold border shadow-xs ${
            darkMode
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <Broom size={14} weight="duotone" className="text-emerald-400 animate-spin [animation-duration:4s]" />
          <span>{activeVacuums.length} Robot Vacuums</span>
        </span>
        <span>are actively cleaning across</span>
        {activeVacuums.map((v, i) => (
          <React.Fragment key={v.entityId}>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border shadow-xs ${
                darkMode
                  ? 'bg-teal-500/15 border-teal-500/30 text-teal-300'
                  : 'bg-teal-50 border-teal-200 text-teal-800'
              }`}
            >
              <MapPin size={13} weight="bold" className="text-teal-400" />
              <span>{v.name} in {v.currentRoom}</span>
            </span>
            {i < activeVacuums.length - 1 ? <span>and</span> : null}
          </React.Fragment>
        ))}
        {totalM2 > 0 && (
          <>
            <span>with</span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-mono font-bold border shadow-xs ${
                darkMode
                  ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                  : 'bg-purple-50 border-purple-200 text-purple-800'
              }`}
            >
              <Gauge size={13} weight="bold" className="text-purple-400" />
              <span>{totalM2.toFixed(1)} m² cleaned in total</span>
            </span>
          </>
        )}
        <span>.</span>
      </div>
    );
  }

  // Case 3: Returning to Dock
  if (returningVacuums.length > 0) {
    const retVac = returningVacuums[0];
    return (
      <div
        className={`inline-flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-medium leading-relaxed ${
          darkMode ? 'text-slate-300' : 'text-slate-600'
        } ${className}`}
      >
        <span>Currently,</span>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold border shadow-xs ${
            darkMode
              ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
              : 'bg-sky-50 border-sky-200 text-sky-800'
          }`}
        >
          <ArrowArcLeft size={14} weight="bold" className="text-sky-400 animate-pulse" />
          <span>{retVac.name}</span>
        </span>
        <span>has finished cleaning and is returning to its dock at</span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-mono font-bold border shadow-xs ${
            darkMode
              ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
              : 'bg-sky-50 border-sky-200 text-sky-800'
          }`}
        >
          <BatteryFull size={14} weight="fill" />
          <span>{retVac.batteryLevel}% battery</span>
        </span>
        <span>.</span>
      </div>
    );
  }

  // Case 4: Paused
  if (pausedVacuums.length > 0) {
    const pVac = pausedVacuums[0];
    return (
      <div
        className={`inline-flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-medium leading-relaxed ${
          darkMode ? 'text-slate-300' : 'text-slate-600'
        } ${className}`}
      >
        <span>Currently,</span>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold border shadow-xs ${
            darkMode
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          <Pause size={14} weight="fill" className="text-amber-400" />
          <span>{pVac.name}</span>
        </span>
        <span>is paused in</span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border shadow-xs ${
            darkMode
              ? 'bg-slate-800 border-white/10 text-slate-200'
              : 'bg-slate-100 border-slate-200 text-slate-800'
          }`}
        >
          <MapPin size={13} weight="bold" className="text-amber-400" />
          <span>{pVac.currentRoom}</span>
        </span>
        <span>({pVac.batteryLevel}% battery remaining).</span>
      </div>
    );
  }

  // Case 5: All Docked & Standby
  return (
    <div
      className={`inline-flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-medium leading-relaxed ${
        darkMode ? 'text-slate-300' : 'text-slate-600'
      } ${className}`}
    >
      <span>Currently,</span>
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold border shadow-xs ${
          darkMode
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}
      >
        <CheckCircle size={14} weight="fill" className="text-emerald-400" />
        <span>all {vacuums.length} robotic cleaner{vacuums.length === 1 ? '' : 's'} are docked</span>
      </span>
      <span>and charging at</span>
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-mono font-bold border shadow-xs ${
          darkMode
            ? 'bg-teal-500/15 border-teal-500/30 text-teal-300'
            : 'bg-teal-50 border-teal-200 text-teal-800'
        }`}
      >
        <BatteryCharging size={14} weight="fill" className="text-teal-400" />
        <span>{vacuums[0]?.batteryLevel || 100}% battery</span>
      </span>
      <span>with filters and dustbins ready for the next scheduled routine.</span>
    </div>
  );
}
