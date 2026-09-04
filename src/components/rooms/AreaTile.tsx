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
import { getClimateModeTheme } from '../../utils/climateTheme';
import { useEntityPopup } from '../../contexts/EntityPopupContext';
import { useLongPress } from '../../hooks/useLongPress';

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
  const { openEntityDetails } = useEntityPopup();

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

  // Border color adaptation to tile state/color
  const activeBorderClass = isHazardActive
    ? 'border-rose-500/40'
    : isLightActive
    ? 'border-amber-400/40'
    : isMotionActive
    ? 'border-emerald-400/40'
    : 'border-slate-200/80 dark:border-white/10';

  // Find representative entity IDs for quick popups
  const primaryLightId = entities?.lights?.[0]?.entity_id;
  const primarySwitchId = entities?.switches?.[0]?.entity_id;
  const primaryFanId = entities?.fans?.[0]?.entity_id;
  const primaryMediaId = entities?.mediaPlayers?.[0]?.entity_id;
  const primaryLockId = entities?.locks?.[0]?.entity_id;
  const primaryClimateId = entities?.climates?.[0]?.entity_id;
  const primaryTempId =
    entities?.climates?.[0]?.entity_id ||
    entities?.sensors?.find?.((s) => s.entity_id.includes('temp') || s.attributes?.device_class === 'temperature')?.entity_id ||
    entities?.sensors?.[0]?.entity_id;
  const primaryMotionId =
    entities?.binarySensors?.find?.((s) => s.entity_id.includes('motion') || s.attributes?.device_class === 'motion')?.entity_id ||
    entities?.binarySensors?.[0]?.entity_id;
  const primaryDoorId =
    entities?.binarySensors?.find?.((s) => s.entity_id.includes('door') || s.attributes?.device_class === 'door')?.entity_id;
  const primaryWindowId =
    entities?.binarySensors?.find?.((s) => s.entity_id.includes('window') || s.attributes?.device_class === 'window')?.entity_id;
  const primaryHazardId =
    entities?.binarySensors?.find?.((s) => s.entity_id.includes('smoke') || s.entity_id.includes('leak') || s.attributes?.device_class === 'smoke' || s.attributes?.device_class === 'moisture')?.entity_id;

  // Long press / right-click tile handler
  const tileLongPressHandlers = useLongPress({
    threshold: 500,
    onLongPress: () => {
      const targetId = primaryClimateId || primaryLightId || primaryTempId || primarySwitchId;
      if (targetId) openEntityDetails(targetId);
    },
    onClick: () => {
      onSelectArea(area.areaId);
    }
  });

  return (
    <div
      {...tileLongPressHandlers}
      style={{
        touchAction: 'pan-y',
        ...tileLongPressHandlers.style
      }}
      className={`group relative flex flex-col justify-between rounded-3xl p-4 sm:p-5 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 transition-all duration-300 cursor-pointer overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
        isHazardActive
          ? darkMode
            ? 'bg-rose-950/60 text-white'
            : 'bg-rose-100 text-rose-950'
          : darkMode
          ? 'bg-black/20 hover:bg-black/30 text-white'
          : 'bg-white/20 hover:bg-white/30 text-slate-900'
      }`}
    >
      {/* Background ambient room picture with corner-bleed protection */}
      {area.picture && (
        <div
          className="absolute inset-0 z-0 opacity-10 dark:opacity-15 group-hover:opacity-20 transition-opacity duration-500 overflow-hidden pointer-events-none rounded-3xl"
          style={{ clipPath: 'inset(0 round 24px)', WebkitClipPath: 'inset(0 round 24px)' }}
        >
          <img
            src={area.picture}
            alt={area.name}
            className="w-full h-full object-cover rounded-3xl"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent dark:block hidden rounded-3xl" />
        </div>
      )}

      {/* Top Ambient Highlight Glow with strict containment to eliminate corner bleed */}
      <div
        className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none"
        style={{ clipPath: 'inset(0 round 24px)', WebkitClipPath: 'inset(0 round 24px)' }}
      >
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
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const targetId = primaryClimateId || primaryLightId || primaryTempId;
                if (targetId) openEntityDetails(targetId);
                else onSelectArea(area.areaId);
              }}
              className="shrink-0 transition-transform group-hover:scale-110 cursor-pointer"
              title="Open Entity Details"
            >
              <DynamicPhosphorIcon
                name={area.icon || 'HouseLine'}
                fallback={HouseLine}
                size={22}
                weight="duotone"
                style={{ color: customAccentColor || undefined }}
                className={`${
                  customAccentColor
                    ? ''
                    : isHazardActive
                    ? 'text-rose-400'
                    : isLightActive
                    ? 'text-amber-400'
                    : isMotionActive
                    ? 'text-emerald-400'
                    : 'text-slate-400'
                }`}
              />
            </button>
            <div className="min-w-0">
              <h3 className={`text-base font-bold truncate leading-snug ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {area.name}
              </h3>
            </div>
          </div>

          {/* Active Hazard Alert Pill */}
          {isHazardActive && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 bg-rose-500/25 text-rose-300 animate-pulse shadow-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              ALERT
            </span>
          )}
        </div>

        {/* Environmental & Contextual Sensor Badges (Pills) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Temperature & Humidity (Unboxed) */}
          {(sensors.temperature !== undefined || sensors.humidity !== undefined) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (primaryTempId) openEntityDetails(primaryTempId);
              }}
              title="Click to view temperature & humidity history"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:opacity-80 transition-opacity"
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
            </button>
          )}

          {/* Conditionally Visible: Motion Pill */}
          {sensors.motionDetected && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (primaryMotionId) openEntityDetails(primaryMotionId);
              }}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 animate-fadeIn cursor-pointer hover:scale-105 shadow-xs"
            >
              <PersonSimpleWalk size={12} weight="bold" className="animate-pulse" />
              <span>Motion</span>
            </button>
          )}

          {/* Conditionally Visible: Open Windows Pill */}
          {sensors.windowsOpenCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (primaryWindowId) openEntityDetails(primaryWindowId);
              }}
              title={`${sensors.windowsOpenCount} ${sensors.windowsOpenCount === 1 ? 'window' : 'windows'} open`}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 animate-fadeIn cursor-pointer hover:scale-105 shadow-xs"
            >
              <AppWindow size={13} weight="bold" />
              <span>{sensors.windowsOpenCount}</span>
            </button>
          )}

          {/* Conditionally Visible: Open Doors Pill */}
          {sensors.doorsOpenCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (primaryDoorId) openEntityDetails(primaryDoorId);
              }}
              title={`${sensors.doorsOpenCount} ${sensors.doorsOpenCount === 1 ? 'door' : 'doors'} open`}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 animate-fadeIn cursor-pointer hover:scale-105 shadow-xs"
            >
              <Door size={13} weight="bold" />
              <span>{sensors.doorsOpenCount}</span>
            </button>
          )}

          {/* Conditionally Visible: Door Lock Status Pill */}
          {totalLocksCount > 0 && isLockUnlocked && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (primaryLockId) openEntityDetails(primaryLockId);
              }}
              title={`${unlockedLocksCount} locks unlocked`}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 animate-pulse cursor-pointer hover:scale-105 shadow-xs"
            >
              <LockOpen size={13} weight="bold" />
              <span>{unlockedLocksCount > 1 ? `${unlockedLocksCount} Unlocked` : 'Unlocked'}</span>
            </button>
          )}

          {/* Conditionally Visible: Water Leak Alert */}
          {sensors.waterLeakDetected && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (primaryHazardId) openEntityDetails(primaryHazardId);
              }}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-rose-500/25 text-rose-900 dark:text-rose-300 animate-pulse cursor-pointer hover:scale-105 shadow-xs"
            >
              <Warning size={12} weight="fill" />
              <span>Leak Detected</span>
            </button>
          )}

          {/* Conditionally Visible: Smoke Alert */}
          {sensors.smokeDetected && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (primaryHazardId) openEntityDetails(primaryHazardId);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-rose-500/30 border border-rose-500/60 text-rose-300 animate-pulse cursor-pointer hover:scale-105"
            >
              <Flame size={12} weight="fill" />
              <span>Smoke Alert</span>
            </button>
          )}

          {/* Conditionally Visible: Media Playing Pill */}
          {isMediaActive && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (primaryMediaId) openEntityDetails(primaryMediaId);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 animate-fadeIn cursor-pointer hover:scale-105"
            >
              <SpeakerHigh size={12} weight="bold" />
              <span>Playing</span>
              <span className="flex items-end gap-[2px] h-2.5 ml-0.5">
                <span className="w-0.5 bg-cyan-400 h-1.5 animate-pulse" />
                <span className="w-0.5 bg-cyan-400 h-2.5 animate-pulse [animation-delay:150ms]" />
                <span className="w-0.5 bg-cyan-400 h-2 animate-pulse [animation-delay:300ms]" />
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Action Button Strip (Bottom of Card - only rendered when area has toggleable controls) */}
      {(totalLightsCount > 0 ||
        (entities?.switches?.length || 0) > 0 ||
        (entities?.fans?.length || 0) > 0 ||
        ((totalLocksCount || 0) > 0 && Boolean(onToggleLocks)) ||
        (entities?.mediaPlayers?.length || 0) > 0 ||
        (climateState && climateState.targetTemp !== undefined)) && (
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
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (primaryLightId) openEntityDetails(primaryLightId);
                }}
                title={`${activeLightsCount}/${totalLightsCount} lights on. Click to toggle, right-click/long-press for details.`}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 border ${
                  isLightActive
                    ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-800 dark:bg-amber-500/25 dark:hover:bg-amber-500/35 dark:border-amber-500/40 dark:text-amber-300 shadow-sm shadow-amber-500/10 dark:shadow-amber-500/20'
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
            {(entities?.switches?.length || 0) > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSwitches(area.areaId);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (primarySwitchId) openEntityDetails(primarySwitchId);
                }}
                title={`${activeSwitchesCount}/${entities.switches.length} switches active. Click to toggle, right-click/long-press for details.`}
                className={`p-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 border ${
                  activeSwitchesCount > 0
                    ? 'bg-indigo-500/15 hover:bg-indigo-500/25 border-indigo-500/40 text-indigo-800 dark:bg-indigo-500/25 dark:hover:bg-indigo-500/35 dark:border-indigo-500/40 dark:text-indigo-300 shadow-sm shadow-indigo-500/10 dark:shadow-indigo-500/20'
                    : darkMode
                    ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-slate-200'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                }`}
              >
                <Plug size={15} weight={activeSwitchesCount > 0 ? 'fill' : 'duotone'} />
              </button>
            )}

            {/* Fans Button */}
            {(entities?.fans?.length || 0) > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFans(area.areaId);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (primaryFanId) openEntityDetails(primaryFanId);
                }}
                title={`${activeFansCount}/${entities.fans.length} fans active. Click to toggle, right-click for details.`}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 border ${
                  activeFansCount > 0
                    ? 'bg-teal-500/15 hover:bg-teal-500/25 border-teal-500/40 text-teal-800 dark:bg-teal-500/25 dark:hover:bg-teal-500/35 dark:border-teal-500/40 dark:text-teal-300 shadow-sm shadow-teal-500/10 dark:shadow-teal-500/20'
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
            {(totalLocksCount || 0) > 0 && onToggleLocks && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLocks(area.areaId);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (primaryLockId) openEntityDetails(primaryLockId);
                }}
                title={isLockUnlocked ? `${unlockedLocksCount} unlocked. Click to lock, right-click for details.` : 'All locked. Click to unlock.'}
                className={`p-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 border ${
                  isLockUnlocked
                    ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-800 dark:bg-amber-500/25 dark:hover:bg-amber-500/35 dark:border-amber-500/40 dark:text-amber-300 shadow-sm shadow-amber-500/10 dark:shadow-amber-500/20'
                    : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-800 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:border-emerald-500/35 dark:text-emerald-300'
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
            {(entities?.mediaPlayers?.length || 0) > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMedia(area.areaId);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (primaryMediaId) openEntityDetails(primaryMediaId);
                }}
                title={isMediaActive ? 'Pause Music (Right-click for controls)' : 'Play Music (Right-click for controls)'}
                className={`p-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 border ${
                  isMediaActive
                    ? 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/40 text-cyan-800 dark:bg-cyan-500/25 dark:hover:bg-cyan-500/35 dark:border-cyan-500/40 dark:text-cyan-300 shadow-sm shadow-cyan-500/10 dark:shadow-cyan-500/20'
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
          {climateState && climateState.targetTemp !== undefined && (() => {
            const theme = getClimateModeTheme(climateState.hvacMode);
            const ClimateBadgeIcon = theme.icon;
            return (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (primaryClimateId) openEntityDetails(primaryClimateId);
                }}
                title="Click to view thermostat controls"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shrink-0 transition-all hover:scale-105 cursor-pointer active:scale-95 ${
                  darkMode
                    ? `${theme.badgeBgDark} ${theme.badgeBorderDark} ${theme.badgeTextDark}`
                    : `${theme.badgeBgLight} ${theme.badgeBorderLight} ${theme.badgeTextLight}`
                }`}
              >
                <ClimateBadgeIcon size={13} weight={theme.isOff ? 'duotone' : 'fill'} />
                <span>{climateState.targetTemp}°C</span>
              </button>
            );
          })()}
        </div>
      )}
    </div>
  );
}
