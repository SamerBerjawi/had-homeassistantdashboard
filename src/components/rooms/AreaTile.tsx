/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Glassmorphic Room / Area Tile card with dynamic contextual sensor pills,
 * climate telemetry, fan controls, door lock toggles, and clean unboxed header icons.
 */

import React from 'react';
import {
  Lightbulb,
  Plug,
  Thermometer,
  Drop,
  PersonSimpleWalk,
  Door,
  AppWindow,
  Warning,
  Flame,
  SpeakerHigh,
  Play,
  Pause,
  Fan,
  Snowflake,
  Wind,
  Lock,
  LockOpen,
  HouseLine
} from '@phosphor-icons/react';
import { AreaData } from '../../types/rooms';
import DynamicPhosphorIcon from '../ui/DynamicPhosphorIcon';

interface AreaTileProps {
  area: AreaData;
  darkMode?: boolean;
  onSelectArea: (areaId: string) => void;
  onToggleLights: (areaId: string) => void;
  onToggleSwitches: (areaId: string) => void;
  onToggleFans: (areaId: string) => void;
  onToggleMedia: (areaId: string) => void;
  onToggleLocks?: (areaId: string) => void;
}

export default function AreaTile({
  area,
  darkMode = true,
  onSelectArea,
  onToggleLights,
  onToggleSwitches,
  onToggleFans,
  onToggleMedia,
  onToggleLocks
}: AreaTileProps) {
  const {
    sensors,
    entities,
    activeLightsCount,
    totalLightsCount,
    activeSwitchesCount,
    activeFansCount,
    activeMediaPlayersCount,
    unlockedLocksCount,
    totalLocksCount,
    climateState
  } = area;

  const isLightActive = activeLightsCount > 0;
  const isMotionActive = sensors.motionDetected || sensors.presenceDetected;
  const isMediaActive = activeMediaPlayersCount > 0;
  const isHazardActive = sensors.smokeDetected || sensors.waterLeakDetected;
  const isLockUnlocked = unlockedLocksCount > 0;

  // Custom accent styling from Settings if configured
  const customAccentColor = area.color || undefined;

  return (
    <div
      onClick={() => onSelectArea(area.areaId)}
      style={{ clipPath: 'inset(0 round 1.5rem)' }}
      className={`group relative flex flex-col justify-between rounded-3xl p-4 sm:p-4.5 backdrop-blur-md transition-all duration-300 cursor-pointer overflow-hidden isolate ${
        isHazardActive
          ? 'bg-rose-500/15 text-rose-200'
          : darkMode
          ? 'bg-slate-900/60 hover:bg-slate-900/80 text-white'
          : 'bg-white/60 hover:bg-white/80 text-slate-900 shadow-xs'
      }`}
    >
      {/* Background ambient room picture with corner-bleed protection */}
      {area.picture && (
        <div
          className="absolute inset-0 z-0 opacity-10 dark:opacity-15 group-hover:opacity-20 transition-opacity duration-500 overflow-hidden pointer-events-none rounded-3xl"
        >
          <img
            src={area.picture}
            alt={area.name}
            className="w-full h-full object-cover rounded-3xl"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent dark:block hidden rounded-3xl" />
        </div>
      )}

      {/* Top Ambient Highlight Glow with strict containment - Subtle motion/light glow */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
        {isLightActive && (
          <div
            style={{ backgroundColor: customAccentColor ? `${customAccentColor}18` : undefined }}
            className={`absolute -top-8 -right-8 w-24 h-24 rounded-full ${customAccentColor ? '' : 'bg-amber-500/15'} blur-xl pointer-events-none`}
          />
        )}
        {isMotionActive && !isLightActive && (
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-emerald-500/15 blur-xl pointer-events-none" />
        )}
      </div>

      <div className="relative z-10 flex flex-col gap-3">
        {/* Card Header: Clean unboxed icon + Room Name + Active Status Indicator */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <DynamicPhosphorIcon
              name={area.icon || 'HouseLine'}
              fallback={HouseLine}
              size={22}
              weight="duotone"
              style={{ color: customAccentColor || undefined }}
              className={`shrink-0 transition-transform group-hover:scale-110 ${
                customAccentColor
                  ? ''
                  : isHazardActive
                  ? 'text-rose-400'
                  : isLightActive
                  ? 'text-amber-400'
                  : isMotionActive
                  ? 'text-emerald-400'
                  : darkMode
                  ? 'text-slate-300'
                  : 'text-slate-700'
              }`}
            />

            <div className="min-w-0 flex-1">
              <h4
                className={`text-sm sm:text-base font-bold tracking-tight truncate ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                {area.name}
              </h4>
              {area.floorName && (
                <p className="text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
                  {area.floorName}
                </p>
              )}
            </div>
          </div>

          {/* Right Status Indicator Dot/Glow */}
          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
            {isLightActive && (
              <span className="relative flex h-2.5 w-2.5">
                <span
                  style={{ backgroundColor: customAccentColor || undefined }}
                  className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"
                />
                <span
                  style={{ backgroundColor: customAccentColor || undefined }}
                  className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"
                />
              </span>
            )}
            {!isLightActive && isMotionActive && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            )}
          </div>
        </div>

        {/* Contextual Sensor Pills Strip */}
        <div className="flex flex-wrap items-center gap-1.5 min-h-[26px]">
          {/* Temperature & Humidity Pill (only rendered if room has real readings) */}
          {(sensors.temperature !== undefined || sensors.humidity !== undefined) && (
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${
                darkMode
                  ? 'bg-white/5 border-white/10 text-slate-300'
                  : 'bg-slate-100/90 border-slate-200/90 text-slate-700'
              }`}
            >
              {sensors.temperature !== undefined && (
                <span className="flex items-center gap-0.5">
                  <Thermometer size={12} weight="bold" className="text-rose-400" />
                  <span>{sensors.temperature}°C</span>
                </span>
              )}
              {sensors.temperature !== undefined && sensors.humidity !== undefined && (
                <span className="opacity-40">•</span>
              )}
              {sensors.humidity !== undefined && (
                <span className="flex items-center gap-0.5">
                  <Drop size={12} weight="fill" className="text-cyan-400" />
                  <span>{sensors.humidity}%</span>
                </span>
              )}
            </div>
          )}

          {/* Conditionally Visible: Motion Pill */}
          {sensors.motionDetected && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 animate-fadeIn">
              <PersonSimpleWalk size={12} weight="bold" className="animate-pulse" />
              <span>Motion</span>
            </div>
          )}

          {/* Conditionally Visible: Open Windows Pill (number only) */}
          {sensors.windowsOpenCount > 0 && (
            <div
              title={`${sensors.windowsOpenCount} ${sensors.windowsOpenCount === 1 ? 'window' : 'windows'} open`}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 animate-fadeIn"
            >
              <AppWindow size={13} weight="bold" />
              <span>{sensors.windowsOpenCount}</span>
            </div>
          )}

          {/* Conditionally Visible: Open Doors Pill (number only) */}
          {sensors.doorsOpenCount > 0 && (
            <div
              title={`${sensors.doorsOpenCount} ${sensors.doorsOpenCount === 1 ? 'door' : 'doors'} open`}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 animate-fadeIn"
            >
              <Door size={13} weight="bold" />
              <span>{sensors.doorsOpenCount}</span>
            </div>
          )}

          {/* Conditionally Visible: Door Lock Status Pill */}
          {totalLocksCount > 0 && isLockUnlocked && (
            <div
              title={`${unlockedLocksCount} locks unlocked`}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-500/20 border border-amber-500/35 text-amber-300 animate-pulse"
            >
              <LockOpen size={13} weight="bold" />
              <span>{unlockedLocksCount > 1 ? `${unlockedLocksCount} Unlocked` : 'Unlocked'}</span>
            </div>
          )}

          {/* Conditionally Visible: Water Leak Alert */}
          {sensors.waterLeakDetected && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-rose-500/25 border border-rose-500/40 text-rose-400 animate-pulse">
              <Warning size={12} weight="fill" />
              <span>Leak Detected</span>
            </div>
          )}

          {/* Conditionally Visible: Smoke / CO Alert */}
          {sensors.smokeDetected && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-rose-500/30 border border-rose-500/60 text-rose-300 animate-pulse">
              <Flame size={12} weight="fill" />
              <span>Smoke Alert</span>
            </div>
          )}

          {/* Conditionally Visible: Media Playing Pill */}
          {isMediaActive && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 animate-fadeIn">
              <SpeakerHigh size={12} weight="bold" />
              <span>Playing</span>
              <span className="flex items-end gap-[2px] h-2.5 ml-0.5">
                <span className="w-0.5 bg-cyan-400 h-1.5 animate-pulse" />
                <span className="w-0.5 bg-cyan-400 h-2.5 animate-pulse [animation-delay:150ms]" />
                <span className="w-0.5 bg-cyan-400 h-2 animate-pulse [animation-delay:300ms]" />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Button Strip (Bottom of Card) */}
      <div className="relative z-10 mt-3.5 pt-3 border-t border-white/10 dark:border-white/10 border-slate-200/80 flex items-center justify-between gap-1.5 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Lights Button with Counter */}
          {totalLightsCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleLights(area.areaId);
              }}
              title={`${activeLightsCount}/${totalLightsCount} lights on. Click to toggle.`}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 border ${
                isLightActive
                  ? 'bg-amber-500/25 hover:bg-amber-500/35 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/20'
                  : darkMode
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-slate-200'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
              }`}
            >
              <Lightbulb size={15} weight={isLightActive ? 'fill' : 'duotone'} />
              <span>{activeLightsCount > 0 ? activeLightsCount : totalLightsCount}</span>
            </button>
          )}

          {/* Switches / Outlets Button */}
          {entities.switches.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSwitches(area.areaId);
              }}
              title={`${activeSwitchesCount}/${entities.switches.length} switches active. Click to toggle.`}
              className={`p-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 border ${
                activeSwitchesCount > 0
                  ? 'bg-indigo-500/25 hover:bg-indigo-500/35 border-indigo-500/40 text-indigo-300 shadow-sm shadow-indigo-500/20'
                  : darkMode
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-slate-200'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
              }`}
            >
              <Plug size={15} weight={activeSwitchesCount > 0 ? 'fill' : 'duotone'} />
            </button>
          )}

          {/* Fans Button */}
          {entities.fans.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFans(area.areaId);
              }}
              title={`${activeFansCount}/${entities.fans.length} fans active. Click to toggle.`}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 border ${
                activeFansCount > 0
                  ? 'bg-teal-500/25 hover:bg-teal-500/35 border-teal-500/40 text-teal-300 shadow-sm shadow-teal-500/20'
                  : darkMode
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-slate-200'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
              }`}
            >
              <Fan
                size={15}
                weight={activeFansCount > 0 ? 'fill' : 'duotone'}
                className={activeFansCount > 0 ? 'animate-spin [animation-duration:3s]' : ''}
              />
              <span>{activeFansCount > 0 ? activeFansCount : entities.fans.length}</span>
            </button>
          )}

          {/* Door Locks Button */}
          {totalLocksCount > 0 && onToggleLocks && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleLocks(area.areaId);
              }}
              title={isLockUnlocked ? `${unlockedLocksCount} unlocked. Click to lock.` : 'All locked. Click to unlock.'}
              className={`p-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 border ${
                isLockUnlocked
                  ? 'bg-amber-500/25 hover:bg-amber-500/35 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/20'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/35 text-emerald-300'
              }`}
            >
              {isLockUnlocked ? (
                <LockOpen size={15} weight="bold" />
              ) : (
                <Lock size={15} weight="fill" />
              )}
            </button>
          )}

          {/* Media Player Play/Pause Quick Toggle */}
          {entities.mediaPlayers.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleMedia(area.areaId);
              }}
              title={isMediaActive ? 'Pause Music' : 'Play Music'}
              className={`p-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 border ${
                isMediaActive
                  ? 'bg-cyan-500/25 hover:bg-cyan-500/35 border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-500/20'
                  : darkMode
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-slate-200'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
              }`}
            >
              {isMediaActive ? (
                <Pause size={15} weight="fill" />
              ) : (
                <Play size={15} weight="fill" />
              )}
            </button>
          )}
        </div>

        {/* Climate Target Badge */}
        {climateState && climateState.targetTemp !== undefined && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold border shrink-0 ${
              climateState.hvacMode === 'heat' || climateState.hvacMode === 'heating'
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                : climateState.hvacMode === 'cool' || climateState.hvacMode === 'cooling'
                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                : climateState.hvacMode === 'fan_only'
                ? 'bg-teal-500/15 border-teal-500/30 text-teal-400'
                : darkMode
                ? 'bg-white/5 border-white/10 text-slate-400'
                : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}
          >
            {climateState.hvacMode === 'heat' || climateState.hvacMode === 'heating' ? (
              <Flame size={13} weight="fill" />
            ) : climateState.hvacMode === 'cool' || climateState.hvacMode === 'cooling' ? (
              <Snowflake size={13} weight="fill" />
            ) : (
              <Wind size={13} weight="bold" />
            )}
            <span>{climateState.targetTemp}°C</span>
          </div>
        )}
      </div>
    </div>
  );
}
