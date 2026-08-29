/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RoomsHeaderSentence:
 * Renders a natural-language room telemetry summary sentence with dynamic inline Phosphor icons
 * and highlighted key badges, styled consistently with WeatherHeaderSentence.
 * Adapts dynamically when viewing the whole house vs drilled-down into a specific room.
 */

import React from 'react';
import {
  Lightbulb,
  Door,
  AppWindow,
  PersonSimpleWalk,
  Broom,
  Warning,
  Flame,
  Snowflake,
  Fan,
  SpeakerHigh,
  Sparkle,
  CheckCircle,
  Thermometer,
  Lock,
  LockOpen
} from '@phosphor-icons/react';
import { useRoomsData } from '../../hooks/useRoomsData';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';

interface RoomsHeaderSentenceProps {
  darkMode?: boolean;
  className?: string;
}

export default function RoomsHeaderSentence({
  darkMode = true,
  className = ''
}: RoomsHeaderSentenceProps) {
  const selectedAreaId = useAutoLayoutStore((s) => s.selectedAreaId);
  const { houseSummary, areasDataList } = useRoomsData();
  const {
    totalLightsOn,
    totalWindowsOpen,
    totalDoorsOpen,
    activeMotionAreasCount,
    activeMediaCount,
    activeVacuum
  } = houseSummary;

  // Selected Room Data if viewing a specific area detail
  const selectedRoom = selectedAreaId ? areasDataList.find((a) => a.areaId === selectedAreaId) : null;

  // =========================================================================
  // 1. ROOM-SPECIFIC ADAPTIVE SUMMARY SENTENCE
  // =========================================================================
  if (selectedRoom) {
    const { floorName, activeLightsCount, unlockedLocksCount, entities, sensors } = selectedRoom;
    const activeClimates = entities.climates.filter((c) => c.state !== 'off' && c.state !== 'unavailable');
    const activeFans = entities.fans.filter((f) => f.state === 'on');
    const activeMedia = entities.mediaPlayers.filter((m) => m.state === 'playing');
    const openDoorsCount = sensors.doorsOpenCount || 0;
    const openWindowsCount = sensors.windowsOpenCount || 0;
    const hasMotion = sensors.motionDetected || sensors.presenceDetected;
    const currentTemp = sensors.temperature;

    const hasAnyActive =
      activeLightsCount > 0 ||
      activeClimates.length > 0 ||
      activeFans.length > 0 ||
      activeMedia.length > 0 ||
      openDoorsCount > 0 ||
      openWindowsCount > 0 ||
      unlockedLocksCount > 0 ||
      hasMotion;

    return (
      <div
        className={`inline-flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-medium leading-relaxed ${
          darkMode ? 'text-slate-300' : 'text-slate-600'
        } ${className}`}
      >
        <span>Located on</span>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors shadow-xs ${
            darkMode
              ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
              : 'bg-indigo-50 border-indigo-200 text-indigo-700'
          }`}
        >
          {floorName || 'Ground Floor'}
        </span>

        {currentTemp !== undefined && (
          <>
            <span>at</span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors shadow-xs ${
                darkMode
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              <Thermometer size={13} weight="fill" className="text-rose-400" />
              <span>{currentTemp}°C</span>
            </span>
          </>
        )}

        <span>—</span>

        {/* Active Lights */}
        {activeLightsCount > 0 ? (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors shadow-xs ${
              darkMode
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <Lightbulb size={13} weight="fill" className="text-amber-400" />
            <span>{activeLightsCount} {activeLightsCount === 1 ? 'light' : 'lights'} on</span>
          </span>
        ) : (
          <span>lights are off,</span>
        )}

        {/* Active Climate / Heating / Cooling */}
        {activeClimates.length > 0 && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors shadow-xs ${
              darkMode
                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                : 'bg-cyan-50 border-cyan-200 text-cyan-800'
            }`}
          >
            {activeClimates[0].state === 'heat' ? (
              <Flame size={13} weight="fill" className="text-rose-400" />
            ) : (
              <Snowflake size={13} weight="fill" className="text-cyan-400" />
            )}
            <span className="capitalize">{activeClimates[0].state} at {activeClimates[0].attributes?.temperature ?? 21}°C</span>
          </span>
        )}

        {/* Active Fans */}
        {activeFans.length > 0 && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors shadow-xs ${
              darkMode
                ? 'bg-teal-500/15 border-teal-500/30 text-teal-300'
                : 'bg-teal-50 border-teal-200 text-teal-800'
            }`}
          >
            <Fan size={13} weight="duotone" className="animate-spin text-teal-400" />
            <span>Fan running ({activeFans[0].attributes?.percentage || 100}%)</span>
          </span>
        )}

        {/* Active Media */}
        {activeMedia.length > 0 && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors shadow-xs ${
              darkMode
                ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                : 'bg-purple-50 border-purple-200 text-purple-800'
            }`}
          >
            <SpeakerHigh size={13} weight="fill" className="text-purple-400" />
            <span className="truncate max-w-[140px]">{activeMedia[0].attributes?.media_title || 'Music playing'}</span>
          </span>
        )}

        {/* Open Windows / Doors */}
        {openDoorsCount > 0 && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors shadow-xs animate-pulse ${
              darkMode
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <Door size={13} weight="bold" className="text-amber-400" />
            <span>{openDoorsCount} {openDoorsCount === 1 ? 'door' : 'doors'} open</span>
          </span>
        )}

        {openWindowsCount > 0 && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors shadow-xs ${
              darkMode
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <AppWindow size={13} weight="bold" className="text-amber-400" />
            <span>{openWindowsCount} {openWindowsCount === 1 ? 'window' : 'windows'} open</span>
          </span>
        )}

        {/* Unlocked Doors */}
        {unlockedLocksCount > 0 && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors shadow-xs ${
              darkMode
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <LockOpen size={13} weight="bold" className="text-amber-400 animate-pulse" />
            <span>{unlockedLocksCount} unlocked</span>
          </span>
        )}

        {/* Motion presence */}
        {hasMotion && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors shadow-xs ${
              darkMode
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <PersonSimpleWalk size={13} weight="bold" className="text-emerald-400" />
            <span>Motion active</span>
          </span>
        )}

        {/* Idle and Secure check if nothing active */}
        {!hasAnyActive && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors shadow-xs ${
              darkMode
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <CheckCircle size={13} weight="fill" className="text-emerald-400" />
            <span>all devices are idle and secure.</span>
          </span>
        )}
      </div>
    );
  }

  // =========================================================================
  // 2. GLOBAL HOUSE TELEMETRY SENTENCE (ROOMS OVERVIEW)
  // =========================================================================
  // Find hazard alerts
  const leakAreas = areasDataList.filter((a) => a.sensors.waterLeakDetected);
  const smokeAreas = areasDataList.filter((a) => a.sensors.smokeDetected);

  if (smokeAreas.length > 0) {
    return (
      <div
        className={`inline-flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-medium leading-relaxed ${className}`}
      >
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg font-bold border transition-colors shadow-xs animate-pulse ${
            darkMode
              ? 'bg-rose-500/25 border-rose-500/50 text-rose-300'
              : 'bg-rose-100 border-rose-300 text-rose-800'
          }`}
        >
          <Flame size={15} weight="fill" className="text-rose-400" />
          <span>Smoke Alert</span>
        </span>
        <span className={darkMode ? 'text-slate-200' : 'text-slate-700'}>
          detected in {smokeAreas.map((a) => a.name).join(', ')} — please verify immediately.
        </span>
      </div>
    );
  }

  if (leakAreas.length > 0) {
    return (
      <div
        className={`inline-flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-medium leading-relaxed ${className}`}
      >
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg font-bold border transition-colors shadow-xs animate-pulse ${
            darkMode
              ? 'bg-rose-500/25 border-rose-500/50 text-rose-300'
              : 'bg-rose-100 border-rose-300 text-rose-800'
          }`}
        >
          <Warning size={15} weight="fill" className="text-rose-400" />
          <span>Water Leak Detected</span>
        </span>
        <span className={darkMode ? 'text-slate-200' : 'text-slate-700'}>
          in {leakAreas.map((a) => a.name).join(', ')} — immediate check recommended.
        </span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-medium leading-relaxed ${
        darkMode ? 'text-slate-300' : 'text-slate-600'
      } ${className}`}
    >
      {/* 1. Introductory prefix */}
      <span>Currently,</span>

      {/* 2. Active Lights Badge */}
      {totalLightsOn > 0 ? (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors shadow-xs ${
            darkMode
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          <Lightbulb size={13} weight="fill" className="text-amber-400" />
          <span>{totalLightsOn} {totalLightsOn === 1 ? 'light' : 'lights'} active</span>
        </span>
      ) : (
        <span>all lights are off,</span>
      )}

      {/* 3. Open Windows / Open Doors */}
      {totalWindowsOpen > 0 || totalDoorsOpen > 0 ? (
        <>
          <span>with</span>
          {totalDoorsOpen > 0 && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors shadow-xs ${
                darkMode
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <Door size={13} weight="bold" className="text-amber-400" />
              <span>{totalDoorsOpen} {totalDoorsOpen === 1 ? 'door' : 'doors'} open</span>
            </span>
          )}
          {totalDoorsOpen > 0 && totalWindowsOpen > 0 && <span>and</span>}
          {totalWindowsOpen > 0 && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors shadow-xs ${
                darkMode
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <AppWindow size={13} weight="bold" className="text-amber-400" />
              <span>{totalWindowsOpen} {totalWindowsOpen === 1 ? 'window' : 'windows'} open</span>
            </span>
          )}
        </>
      ) : (
        <span>all doors and windows are closed,</span>
      )}

      {/* 4. Motion / Presence Status */}
      {activeMotionAreasCount > 0 ? (
        <>
          <span>and motion is detected in</span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors shadow-xs ${
              darkMode
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <PersonSimpleWalk size={13} weight="bold" className="text-emerald-400" />
            <span>{activeMotionAreasCount} {activeMotionAreasCount === 1 ? 'room' : 'rooms'}</span>
          </span>
        </>
      ) : (
        <span>no motion is detected.</span>
      )}

      {/* 5. Active Media */}
      {activeMediaCount > 0 && (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors shadow-xs ${
            darkMode
              ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
              : 'bg-purple-50 border-purple-200 text-purple-800'
          }`}
        >
          <SpeakerHigh size={13} weight="fill" className="text-purple-400" />
          <span>{activeMediaCount} {activeMediaCount === 1 ? 'speaker' : 'speakers'} playing</span>
        </span>
      )}

      {/* 6. Active Vacuum */}
      {activeVacuum && (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors shadow-xs ${
            darkMode
              ? 'bg-teal-500/15 border-teal-500/30 text-teal-300'
              : 'bg-teal-50 border-teal-200 text-teal-800'
          }`}
        >
          <Broom size={13} weight="fill" className="text-teal-400" />
          <span>Cleaning active</span>
        </span>
      )}

      {/* 7. Peace of Mind checkmark if house is quiet */}
      {totalLightsOn === 0 && totalDoorsOpen === 0 && totalWindowsOpen === 0 && activeMotionAreasCount === 0 && (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors shadow-xs ${
            darkMode
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <CheckCircle size={13} weight="fill" className="text-emerald-400" />
          <span>House is secure</span>
        </span>
      )}
    </div>
  );
}
