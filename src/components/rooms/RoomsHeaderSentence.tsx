/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RoomsHeaderSentence:
 * Renders an expressive, natural-language room telemetry sentence where every automatic
 * entity is uniquely and beautifully stylized with distinct icons, color gradients, and glow borders.
 * Accurately displays counts for open doors and open windows.
 * Fills 100% full width of the container on mobile and desktop.
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
  MusicNotes,
  Sparkle,
  CheckCircle,
  Thermometer,
  Lock,
  LockOpen,
  Drop,
  ArrowArcLeft,
  Pause,
  Stairs,
  ShieldCheck
} from '@phosphor-icons/react';
import { useRoomsData } from '../../hooks/useRoomsData';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { isDoorSensor, isWindowSensor } from '../../lib/entityClassifiers';
import { getClimateModeTheme } from '../../utils/climateTheme';

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
  // 1. ROOM-SPECIFIC ADAPTIVE EXPRESSIVE SUMMARY SENTENCE
  // =========================================================================
  if (selectedRoom) {
    const { floorName, activeLightsCount, totalLightsCount, unlockedLocksCount, totalLocksCount, entities, sensors } = selectedRoom;
    const activeClimates = entities.climates.filter((c) => c.state !== 'off' && c.state !== 'unavailable');
    const activeFans = entities.fans.filter((f) => f.state === 'on');
    const activeMedia = entities.mediaPlayers.filter((m) => m.state === 'playing');

    const doorSensors = (entities.binarySensors || []).filter(isDoorSensor);
    const windowSensors = (entities.binarySensors || []).filter(isWindowSensor);
    const hasContactSensors = doorSensors.length > 0 || windowSensors.length > 0;

    const openDoorsCount = sensors.doorsOpenCount ?? doorSensors.filter((s) => s.state === 'on' || s.state === 'open').length;
    const openWindowsCount = sensors.windowsOpenCount ?? windowSensors.filter((s) => s.state === 'on' || s.state === 'open').length;

    const hasMotion = sensors.motionDetected || sensors.presenceDetected;
    const currentTemp = sensors.temperature;
    const currentHumidity = sensors.humidity;

    const hasAnyActive =
      activeLightsCount > 0 ||
      activeClimates.length > 0 ||
      activeFans.length > 0 ||
      activeMedia.length > 0 ||
      openDoorsCount > 0 ||
      openWindowsCount > 0 ||
      unlockedLocksCount > 0 ||
      hasMotion;

    // Playing media track or speaker
    const playingTrack = activeMedia.length > 0
      ? (activeMedia[0].attributes?.media_title || activeMedia[0].attributes?.app_name || activeMedia[0].name)
      : null;

    return (
      <div
        className={`w-full flex flex-wrap items-center gap-x-2 gap-y-2 text-xs sm:text-sm font-medium leading-relaxed ${
          darkMode ? 'text-slate-300' : 'text-slate-600'
        } ${className}`}
      >
        {/* 1. Floor Location Badge */}
        <span>Located on the</span>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs transition-all ${
            darkMode
              ? 'bg-linear-to-r from-indigo-500/20 to-purple-500/15 border-indigo-500/35 text-indigo-300 shadow-indigo-500/5'
              : 'bg-indigo-50/90 border-indigo-200 text-indigo-800'
          }`}
        >
          <Stairs size={14} weight="duotone" className="text-indigo-400" />
          <span>{floorName || 'Ground Floor'}</span>
        </span>
        <span>,</span>

        {/* 2. Temperature Metric Badge */}
        {currentTemp !== undefined && (
          <>
            <span>the temperature is</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs transition-all ${
                darkMode
                  ? 'bg-linear-to-r from-rose-500/20 to-orange-500/15 border-rose-500/35 text-rose-300 shadow-rose-500/5'
                  : 'bg-rose-50/90 border-rose-200 text-rose-800'
              }`}
            >
              <Thermometer size={14} weight="fill" className="text-rose-400" />
              <span>{currentTemp}°C</span>
            </span>
          </>
        )}

        {/* 3. Humidity Metric Badge */}
        {currentHumidity !== undefined && (
          <>
            <span>with</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs transition-all ${
                darkMode
                  ? 'bg-linear-to-r from-sky-500/20 to-cyan-500/15 border-sky-500/35 text-sky-300 shadow-sky-500/5'
                  : 'bg-sky-50/90 border-sky-200 text-sky-800'
              }`}
            >
              <Drop size={14} weight="fill" className="text-sky-400" />
              <span>{currentHumidity}% humidity</span>
            </span>
            <span>,</span>
          </>
        )}

        {/* 4. Lights Status Badge */}
        {activeLightsCount > 0 ? (
          <>
            <span>there {activeLightsCount === 1 ? 'is' : 'are'}</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs transition-all ${
                darkMode
                  ? 'bg-linear-to-r from-amber-500/20 to-yellow-500/15 border-amber-500/40 text-amber-300 shadow-amber-500/10'
                  : 'bg-amber-50/90 border-amber-300 text-amber-900'
              }`}
            >
              <Lightbulb size={14} weight="fill" className="text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
              <span>{activeLightsCount} {activeLightsCount === 1 ? 'light' : 'lights'} on</span>
            </span>
            <span>,</span>
          </>
        ) : (
          <>
            <span>all lights are</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs ${
                darkMode
                  ? 'bg-slate-800/60 border-slate-700 text-slate-300'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <CheckCircle size={13} weight="fill" className="text-slate-400" />
              <span>off</span>
            </span>
            <span>,</span>
          </>
        )}

        {/* 5. Media Playback Badge (Action verb outside the pill) */}
        {activeMedia.length > 0 && (
          <>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs transition-all ${
                darkMode
                  ? 'bg-linear-to-r from-fuchsia-500/20 to-purple-500/15 border-fuchsia-500/40 text-fuchsia-300 shadow-fuchsia-500/10'
                  : 'bg-fuchsia-50/90 border-fuchsia-300 text-fuchsia-900'
              }`}
            >
              <SpeakerHigh size={14} weight="fill" className="text-fuchsia-400 shrink-0" />
              <span className="truncate max-w-[220px]">
                {playingTrack ? `"${playingTrack}"` : (activeMedia[0].name || 'Music Track')}
              </span>
            </span>
            <span>is playing,</span>
          </>
        )}

        {/* 6. Active Climate / HVAC Badge */}
        {activeClimates.length > 0 && (() => {
          const firstClimate = activeClimates[0];
          const mode = firstClimate.attributes?.mode || firstClimate.state || 'heat';
          const theme = getClimateModeTheme(mode, firstClimate.state);
          const ClimateBadgeIcon = theme.icon;
          return (
            <>
              <span>climate is</span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs transition-all ${
                  darkMode
                    ? `${theme.badgeBgDark} ${theme.badgeBorderDark} ${theme.badgeTextDark}`
                    : `${theme.badgeBgLight} ${theme.badgeBorderLight} ${theme.badgeTextLight}`
                }`}
              >
                <ClimateBadgeIcon size={14} weight={theme.isOff ? 'duotone' : 'fill'} className={theme.iconClass} />
                <span className="capitalize">
                  {theme.name} target {firstClimate.attributes?.temperature ?? firstClimate.attributes?.target_temp ?? 21}°C
                </span>
              </span>
              <span>,</span>
            </>
          );
        })()}

        {/* 7. Active Fan Badge */}
        {activeFans.length > 0 && (
          <>
            <span>fan is</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs transition-all ${
                darkMode
                  ? 'bg-linear-to-r from-teal-500/20 to-emerald-500/15 border-teal-500/40 text-teal-300 shadow-teal-500/5'
                  : 'bg-teal-50/90 border-teal-300 text-teal-900'
              }`}
            >
              <Fan size={14} weight="duotone" className="animate-spin text-teal-400" />
              <span>running at {activeFans[0].attributes?.percentage || 100}%</span>
            </span>
            <span>,</span>
          </>
        )}

        {/* 8. Open Doors & Windows Badges */}
        {(openDoorsCount > 0 || openWindowsCount > 0) ? (
          <>
            <span>with</span>
            {openDoorsCount > 0 && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs transition-all animate-pulse ${
                  darkMode
                    ? 'bg-linear-to-r from-amber-500/25 to-rose-500/20 border-amber-500/45 text-amber-300 shadow-amber-500/10'
                    : 'bg-amber-100/90 border-amber-400 text-amber-950'
                }`}
              >
                <Door size={14} weight="bold" className="text-amber-400" />
                <span>{openDoorsCount} {openDoorsCount === 1 ? 'door' : 'doors'} open</span>
              </span>
            )}
            {openDoorsCount > 0 && openWindowsCount > 0 && <span>and</span>}
            {openWindowsCount > 0 && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs transition-all ${
                  darkMode
                    ? 'bg-linear-to-r from-sky-500/20 to-blue-500/15 border-sky-500/40 text-sky-300 shadow-sky-500/5'
                    : 'bg-sky-50/90 border-sky-300 text-sky-900'
                }`}
              >
                <AppWindow size={14} weight="bold" className="text-sky-400" />
                <span>{openWindowsCount} {openWindowsCount === 1 ? 'window' : 'windows'} open</span>
              </span>
            )}
            <span>,</span>
          </>
        ) : (
          hasContactSensors && (
            <>
              <span>all doors and windows are</span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs ${
                  darkMode
                    ? 'bg-slate-800/60 border-slate-700 text-slate-300'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <CheckCircle size={13} weight="fill" className="text-slate-400" />
                <span>closed</span>
              </span>
              <span>,</span>
            </>
          )
        )}

        {/* 9. Locks Status Badge */}
        {unlockedLocksCount > 0 && (
          <>
            <span>with</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs transition-all animate-pulse ${
                darkMode
                  ? 'bg-linear-to-r from-amber-500/25 to-orange-500/20 border-amber-500/45 text-amber-300'
                  : 'bg-amber-100/90 border-amber-400 text-amber-950'
              }`}
            >
              <LockOpen size={14} weight="bold" className="text-amber-400" />
              <span>{unlockedLocksCount} unlocked</span>
            </span>
            <span>,</span>
          </>
        )}

        {/* 10. Motion Presence Badge */}
        {hasMotion && (
          <>
            <span>and motion is</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs transition-all ${
                darkMode
                  ? 'bg-linear-to-r from-emerald-500/20 to-teal-500/15 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10'
                  : 'bg-emerald-50/90 border-emerald-300 text-emerald-900'
              }`}
            >
              <PersonSimpleWalk size={14} weight="bold" className="text-emerald-400 animate-pulse" />
              <span>detected</span>
            </span>
            <span>.</span>
          </>
        )}

        {/* 11. Idle & Secure Peace of Mind Badge */}
        {!hasAnyActive && (
          <>
            <span>and all devices are</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs ${
                darkMode
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <CheckCircle size={14} weight="fill" className="text-emerald-400" />
              <span>idle and secure</span>
            </span>
            <span>.</span>
          </>
        )}
      </div>
    );
  }

  // =========================================================================
  // 2. GLOBAL HOUSE TELEMETRY SENTENCE (ROOMS OVERVIEW)
  // =========================================================================
  const leakAreas = areasDataList.filter((a) => a.sensors.waterLeakDetected);
  const smokeAreas = areasDataList.filter((a) => a.sensors.smokeDetected);

  if (smokeAreas.length > 0) {
    return (
      <div
        className={`w-full flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium leading-relaxed ${className}`}
      >
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-black border shadow-lg animate-pulse ${
            darkMode
              ? 'bg-rose-500/30 border-rose-500 text-rose-200 shadow-rose-500/20'
              : 'bg-rose-100 border-rose-400 text-rose-950 shadow-rose-300/30'
          }`}
        >
          <Flame size={16} weight="fill" className="text-rose-400" />
          <span>Smoke Hazard Alert</span>
        </span>
        <span className={darkMode ? 'text-slate-200 font-bold' : 'text-slate-800 font-bold'}>
          detected in {smokeAreas.map((a) => a.name).join(', ')} — please verify safety immediately.
        </span>
      </div>
    );
  }

  if (leakAreas.length > 0) {
    return (
      <div
        className={`w-full flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium leading-relaxed ${className}`}
      >
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-black border shadow-lg animate-pulse ${
            darkMode
              ? 'bg-rose-500/30 border-rose-500 text-rose-200 shadow-rose-500/20'
              : 'bg-rose-100 border-rose-400 text-rose-950 shadow-rose-300/30'
          }`}
        >
          <Warning size={16} weight="fill" className="text-rose-400" />
          <span>Water Moisture Detected</span>
        </span>
        <span className={darkMode ? 'text-slate-200 font-bold' : 'text-slate-800 font-bold'}>
          in {leakAreas.map((a) => a.name).join(', ')} — immediate check recommended.
        </span>
      </div>
    );
  }

  return (
    <div
      className={`w-full flex flex-wrap items-center gap-x-2 gap-y-2 text-xs sm:text-sm font-medium leading-relaxed ${
        darkMode ? 'text-slate-300' : 'text-slate-600'
      } ${className}`}
    >
      {/* 1. Lights Active Badge */}
      {totalLightsOn > 0 ? (
        <>
          <span>There {totalLightsOn === 1 ? 'is' : 'are'}</span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs transition-all ${
              darkMode
                ? 'bg-linear-to-r from-amber-500/20 to-yellow-500/15 border-amber-500/40 text-amber-300 shadow-amber-500/10'
                : 'bg-amber-50/90 border-amber-300 text-amber-900'
            }`}
          >
            <Lightbulb size={14} weight="fill" className="text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
            <span>{totalLightsOn} {totalLightsOn === 1 ? 'light' : 'lights'} on</span>
          </span>
          <span>across the house,</span>
        </>
      ) : (
        <>
          <span>All lights are</span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs ${
              darkMode
                ? 'bg-slate-800/60 border-slate-700 text-slate-300'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <CheckCircle size={13} weight="fill" className="text-slate-400" />
            <span>turned off</span>
          </span>
          <span>,</span>
        </>
      )}

      {/* 2. Open Windows / Open Doors Badges */}
      {(totalWindowsOpen > 0 || totalDoorsOpen > 0) ? (
        <>
          <span>with</span>
          {totalDoorsOpen > 0 && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs transition-all animate-pulse ${
                darkMode
                  ? 'bg-linear-to-r from-amber-500/25 to-rose-500/20 border-amber-500/45 text-amber-300'
                  : 'bg-amber-100/90 border-amber-400 text-amber-950'
              }`}
            >
              <Door size={14} weight="bold" className="text-amber-400" />
              <span>{totalDoorsOpen} {totalDoorsOpen === 1 ? 'door' : 'doors'} open</span>
            </span>
          )}
          {totalDoorsOpen > 0 && totalWindowsOpen > 0 && <span>and</span>}
          {totalWindowsOpen > 0 && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs transition-all ${
                darkMode
                  ? 'bg-linear-to-r from-sky-500/20 to-blue-500/15 border-sky-500/40 text-sky-300'
                  : 'bg-sky-50/90 border-sky-300 text-sky-900'
              }`}
            >
              <AppWindow size={14} weight="bold" className="text-sky-400" />
              <span>{totalWindowsOpen} {totalWindowsOpen === 1 ? 'window' : 'windows'} open</span>
            </span>
          )}
          <span>,</span>
        </>
      ) : (
        <>
          <span>all doors and windows are</span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs ${
              darkMode
                ? 'bg-slate-800/60 border-slate-700 text-slate-300'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <CheckCircle size={13} weight="fill" className="text-slate-400" />
            <span>closed</span>
          </span>
          <span>,</span>
        </>
      )}

      {/* 3. Motion Presence Badge */}
      {activeMotionAreasCount > 0 ? (
        <>
          <span>and motion is active in</span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs transition-all ${
              darkMode
                ? 'bg-linear-to-r from-emerald-500/20 to-teal-500/15 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10'
                : 'bg-emerald-50/90 border-emerald-300 text-emerald-900'
            }`}
          >
            <PersonSimpleWalk size={14} weight="bold" className="text-emerald-400 animate-pulse" />
            <span>{activeMotionAreasCount} {activeMotionAreasCount === 1 ? 'room' : 'rooms'}</span>
          </span>
          <span>,</span>
        </>
      ) : (
        <span>with no motion detected,</span>
      )}

      {/* 4. Active Media Badge (Action verb outside pill) */}
      {activeMediaCount > 0 && (
        <>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs transition-all ${
              darkMode
                ? 'bg-linear-to-r from-fuchsia-500/20 to-purple-500/15 border-fuchsia-500/40 text-fuchsia-300 shadow-fuchsia-500/10'
                : 'bg-fuchsia-50/90 border-fuchsia-300 text-fuchsia-900'
            }`}
          >
            <SpeakerHigh size={14} weight="fill" className="text-fuchsia-400" />
            <span>{activeMediaCount} {activeMediaCount === 1 ? 'speaker' : 'speakers'}</span>
          </span>
          <span>playing,</span>
        </>
      )}

      {/* 5. Active Robot Vacuum Badge */}
      {activeVacuum && (
        <>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs transition-all ${
              activeVacuum.status === 'error'
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse'
                : activeVacuum.status === 'returning'
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                  : activeVacuum.status === 'paused'
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-teal-500/20 border-teal-500/40 text-teal-300 animate-pulse'
            }`}
          >
            {activeVacuum.status === 'error' ? (
              <Warning size={14} weight="bold" className="text-rose-400" />
            ) : activeVacuum.status === 'returning' ? (
              <ArrowArcLeft size={14} weight="bold" className="text-cyan-400" />
            ) : activeVacuum.status === 'paused' ? (
              <Pause size={14} weight="bold" className="text-amber-400" />
            ) : (
              <Broom size={14} weight="fill" className="text-teal-400" />
            )}
            <span>{activeVacuum.name}</span>
          </span>
          <span>
            {activeVacuum.status === 'cleaning' || activeVacuum.status === 'on'
              ? 'is cleaning,'
              : activeVacuum.status === 'returning'
                ? 'is returning to dock,'
                : activeVacuum.status === 'paused'
                  ? 'is paused,'
                  : 'needs attention,'}
          </span>
        </>
      )}

      {/* 6. House Peace of Mind Badge */}
      {totalLightsOn === 0 && totalDoorsOpen === 0 && totalWindowsOpen === 0 && activeMotionAreasCount === 0 && (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs ${
            darkMode
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <ShieldCheck size={14} weight="fill" className="text-emerald-400" />
          <span>House is secure & quiet</span>
        </span>
      )}
    </div>
  );
}
