/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Users, 
  Lightbulb, 
  ToggleRight,
  Fan, 
  Door, 
  DoorOpen, 
  FrameCorners, 
  ShieldCheck, 
  LockOpen, 
  Play, 
  Pause, 
  Power, 
  CaretRight, 
  MusicNotes, 
  PersonSimpleWalk,
  Drop,
  Flame,
  Broom,
  ArrowArcLeft,
  CloudSun,
  Thermometer,
  PencilSimpleLine,
  ArrowCounterClockwise,
  CheckCircle,
  Eye,
  Wind
} from '@phosphor-icons/react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable';
import { useUserConfig } from '../../contexts/ConfigContext';
import { useEditMode } from '../../contexts/EditModeContext';
import { DEFAULT_OVERVIEW_TILE_ORDER } from '../../types/userConfig';
import OverviewSortableTile from './OverviewSortableTile';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { useShallow } from 'zustand/react/shallow';
import { ResolvedEntity } from '../../types';
import { classifyBinarySensors } from '../../lib/entityClassifiers';
import { getHAImageUrl } from '../../lib/utils';
import PersonAvatar from '../ui/PersonAvatar';
import { getWeatherConditionInfo } from '../weather/weatherIcons';
import AnimatedWeatherBackdrop from '../weather/AnimatedWeatherBackdrop';

// Lazy-loaded interactive slide-over drawers (loaded on first open)
const UsersPresenceModal = React.lazy(() => import('./modals/UsersPresenceModal'));
const LightsOverviewModal = React.lazy(() => import('./modals/LightsOverviewModal'));
const SwitchesOverviewModal = React.lazy(() => import('./modals/SwitchesOverviewModal'));
const FansOverviewModal = React.lazy(() => import('./modals/FansOverviewModal'));
const OpeningsOverviewModal = React.lazy(() => import('./modals/OpeningsOverviewModal'));
const AlarmKeypadModal = React.lazy(() => import('./modals/AlarmKeypadModal'));
const MediaOverviewDrawer = React.lazy(() => import('./modals/MediaOverviewDrawer'));
const SensorsOverviewDrawer = React.lazy(() => import('./modals/SensorsOverviewDrawer'));
const VacuumsOverviewDrawer = React.lazy(() => import('./modals/VacuumsOverviewDrawer'));
const WeatherOverviewDrawer = React.lazy(() => import('../weather/WeatherOverviewDrawer'));

const TILE_TITLES: Record<string, string> = {
  weather: 'Weather',
  users: 'Family Presence',
  lights: 'Lighting',
  switches: 'Switches',
  vacuums: 'Vacuums',
  fans: 'Fans & Airflow',
  media: 'Audio & Media',
  alarm: 'Security Guard',
  doors: 'Entry Doors',
  windows: 'Windows',
  motion: 'Motion Zones',
  leak: 'Water Leaks',
  smoke: 'Smoke & Fire'
};

interface OverviewHeaderProps {
  darkMode?: boolean;
}

export default function OverviewHeader({ darkMode = true }: OverviewHeaderProps) {
  const { 
    domainGroups, 
    updateEntityState,
    callHAService,
    serverUrl,
    selectedAlarmEntityId,
    selectedWeatherEntityId
  } = useAutoLayoutStore(useShallow((s) => ({
    domainGroups: s.domainGroups,
    updateEntityState: s.updateEntityState,
    callHAService: s.callHAService,
    serverUrl: s.serverUrl,
    selectedAlarmEntityId: s.selectedAlarmEntityId,
    selectedWeatherEntityId: s.selectedWeatherEntityId
  })));

  // Active Right Sidebar State
  const [drawerOpen, setDrawerOpen] = useState<
    'users' | 'lights' | 'switches' | 'fans' | 'doors' | 'windows' | 'alarm' | 'media' | 'sensors' | 'vacuums' | 'weather' | null
  >(null);

  // Track which drawers have been opened at least once to preserve exit animations
  const [openedDrawers, setOpenedDrawers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (drawerOpen) {
      setOpenedDrawers((prev) => (prev[drawerOpen] ? prev : { ...prev, [drawerOpen]: true }));
    }
  }, [drawerOpen]);

  const [selectedUser, setSelectedUser] = useState<ResolvedEntity | null>(null);
  const [openingsTab, setOpeningsTab] = useState<'all' | 'doors' | 'windows' | 'other'>('all');
  const [sensorsTab, setSensorsTab] = useState<'all' | 'motion' | 'leak' | 'smoke'>('all');
  const resolvedZones = useAutoLayoutStore((s) => s.resolvedZones);
  const sunState = useAutoLayoutStore((s) => s.states?.['sun.sun']?.state);

  // alarmEntity for keypad
  const alarmEntities: ResolvedEntity[] = domainGroups['alarm_control_panel'] || [];
  const alarmEntity: ResolvedEntity | undefined =
    alarmEntities.find((a) => a.entity_id === selectedAlarmEntityId) ||
    alarmEntities[0];

  // Classify all binary sensors and devices
  const {
    doorSensors, windowSensors, motionSensors, leakSensors, smokeSensors, otherContactSensors,
    activeMedia, playingMediaEntities,
    userEntities, lightEntities, switchEntities, fanEntities, mediaEntities, vacuumEntities, weatherEntities,
    homeUsers, onLights, onSwitches, activeFans, activeVacuums, openDoors, openWindows, activeMotion, activeLeaks, activeSmoke
  } = useMemo(() => {
    const isVisible = (e: ResolvedEntity) => !e.hidden && !e.disabled_by;
    const allBinary: ResolvedEntity[] = (domainGroups['binary_sensor'] || []).filter(isVisible);
    const userEntitiesLocal = [...(domainGroups['person'] || []), ...(domainGroups['device_tracker'] || [])].filter(isVisible);
    const lightEntitiesLocal = (domainGroups['light'] || []).filter(isVisible);
    const switchEntitiesLocal = (domainGroups['switch'] || []).filter(isVisible);
    const fanEntitiesLocal = (domainGroups['fan'] || []).filter(isVisible);
    const mediaEntitiesLocal = (domainGroups['media_player'] || []).filter(isVisible);
    const vacuumEntitiesLocal = (domainGroups['vacuum'] || []).filter(isVisible);
    const weatherEntitiesLocal = (domainGroups['weather'] || []).filter(isVisible);

    const {
      doorSensors: doors,
      windowSensors: windows,
      motionSensors: motions,
      leakSensors: leaks,
      smokeSensors: smokes,
      otherContactSensors: otherContacts
    } = classifyBinarySensors(allBinary);

    const activeMed = mediaEntitiesLocal.find((m) => m.state === 'playing') || mediaEntitiesLocal[0];
    const playingMediaList = mediaEntitiesLocal.filter((m) => m.state === 'playing');
    const activeVacList = vacuumEntitiesLocal.filter(
      (v) => (v.state || '').toLowerCase() === 'cleaning' || (v.state || '').toLowerCase() === 'on'
    );

    return {
      doorSensors: doors,
      windowSensors: windows,
      motionSensors: motions,
      leakSensors: leaks,
      smokeSensors: smokes,
      otherContactSensors: otherContacts,
      activeMedia: activeMed,
      playingMediaEntities: playingMediaList,
      userEntities: userEntitiesLocal,
      lightEntities: lightEntitiesLocal,
      switchEntities: switchEntitiesLocal,
      fanEntities: fanEntitiesLocal,
      mediaEntities: mediaEntitiesLocal,
      vacuumEntities: vacuumEntitiesLocal,
      weatherEntities: weatherEntitiesLocal,
      homeUsers: userEntitiesLocal.filter((u) => u.state === 'home'),
      onLights: lightEntitiesLocal.filter((l) => l.state === 'on'),
      onSwitches: switchEntitiesLocal.filter((s) => s.state === 'on'),
      activeFans: fanEntitiesLocal.filter((f) => f.state === 'on'),
      activeVacuums: activeVacList,
      openDoors: doors.filter((d) => d.state === 'on'),
      openWindows: windows.filter((w) => w.state === 'on'),
      activeMotion: motions.filter((m) => m.state === 'on'),
      activeLeaks: leaks.filter((l) => l.state === 'on' || l.state === 'wet' || l.state === 'detected'),
      activeSmoke: smokes.filter((s) => s.state === 'on' || s.state === 'detected' || s.state === 'smoke')
    };
  }, [domainGroups]);

  // Helper to resolve person zone presence (Home, named zone, or away)
  const getPersonZoneDetails = useCallback((user: ResolvedEntity) => {
    const rawState = (user.state || '').trim();
    const s = rawState.toLowerCase();
    const isHome = s === 'home';
    const isAway = !s || s === 'not_home' || s === 'away' || s === 'unavailable' || s === 'unknown';

    if (isAway) {
      return { isInKnownZone: false, isHome: false, zoneName: '' };
    }

    if (isHome) {
      return { isInKnownZone: true, isHome: true, zoneName: 'Home' };
    }

    // Match against resolvedZones if available
    const matchedZone = resolvedZones?.find(
      (z) => z.name.toLowerCase() === s ||
             z.entity_id.toLowerCase() === `zone.${s}` ||
             z.entity_id.toLowerCase().replace('zone.', '') === s.replace(/\s+/g, '_')
    );

    const zoneName = matchedZone?.name || rawState;
    return { isInKnownZone: true, isHome: false, zoneName };
  }, [resolvedZones]);

  // Users in a known zone (either Home or a specific known HA zone)
  const activeZoneUsers = useMemo(() => {
    return userEntities.filter((u) => getPersonZoneDetails(u).isInKnownZone);
  }, [userEntities, getPersonZoneDetails]);

  // Active Weather Resolution
  const activeWeather = useMemo(() => {
    return weatherEntities.find((w) => w.entity_id === selectedWeatherEntityId) || weatherEntities[0];
  }, [weatherEntities, selectedWeatherEntityId]);

  const weatherCondition = activeWeather?.state || 'partlycloudy';
  const isNight = weatherCondition.toLowerCase().includes('night') || sunState === 'below_horizon';
  const weatherCondInfo = getWeatherConditionInfo(weatherCondition, isNight, 20);
  const currentTemp = typeof activeWeather?.attributes?.temperature === 'number' ? activeWeather.attributes.temperature : 22;
  const tempUnit = activeWeather?.attributes?.temperature_unit || '°C';
  const weatherHigh = activeWeather?.attributes?.forecast?.[0]?.temperature ?? Math.round(currentTemp + 3);
  const weatherLow = activeWeather?.attributes?.forecast?.[0]?.templow ?? Math.round(currentTemp - 4);
  const humidity = activeWeather?.attributes?.humidity ?? 55;

  const isAlarmArmed = alarmEntity?.state && alarmEntity.state !== 'disarmed';
  const isPlayingMedia = playingMediaEntities.length > 0;
  const singlePlayingMedia = playingMediaEntities.length === 1 ? playingMediaEntities[0] : null;
  const playingSongTitle = singlePlayingMedia?.attributes?.media_title || singlePlayingMedia?.attributes?.app_name || singlePlayingMedia?.name;

  const firstVacuum = vacuumEntities[0];
  const isVacuumCleaning = activeVacuums.length > 0;
  const vacuumBattery = firstVacuum?.attributes?.battery_level ?? firstVacuum?.attributes?.battery;

  // Open Drawer Handlers
  const openUsersDrawer = (user?: ResolvedEntity) => {
    setSelectedUser(user || null);
    setDrawerOpen('users');
  };

  const openDoorsDrawer = () => {
    setOpeningsTab('doors');
    setDrawerOpen('doors');
  };

  const openWindowsDrawer = () => {
    setOpeningsTab('windows');
    setDrawerOpen('windows');
  };

  const openSensorsDrawer = (tab: 'all' | 'motion' | 'leak' | 'smoke') => {
    setSensorsTab(tab);
    setDrawerOpen('sensors');
  };

  // Batch Quick Actions
  const handleToggleLightBatch = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shouldTurnOff = onLights.length > 0;
    const targetState = shouldTurnOff ? 'off' : 'on';
    
    for (const light of lightEntities) {
      if (shouldTurnOff && light.state === 'on') {
        updateEntityState(light.entity_id, 'off');
        await callHAService('light', 'turn_off', {}, { entity_id: light.entity_id });
      } else if (!shouldTurnOff && light.state !== 'on') {
        updateEntityState(light.entity_id, 'on', { brightness: 80 });
        await callHAService('light', 'turn_on', { brightness_pct: 80 }, { entity_id: light.entity_id });
      }
    }
  };

  const handleToggleSwitchBatch = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shouldTurnOff = onSwitches.length > 0;
    const targetState = shouldTurnOff ? 'off' : 'on';
    
    for (const sw of switchEntities) {
      if (shouldTurnOff && sw.state === 'on') {
        updateEntityState(sw.entity_id, 'off');
        await callHAService('switch', 'turn_off', {}, { entity_id: sw.entity_id });
      } else if (!shouldTurnOff && sw.state !== 'on') {
        updateEntityState(sw.entity_id, 'on');
        await callHAService('switch', 'turn_on', {}, { entity_id: sw.entity_id });
      }
    }
  };

  const handleToggleFanBatch = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shouldTurnOff = activeFans.length > 0;
    
    for (const fan of fanEntities) {
      if (shouldTurnOff && fan.state === 'on') {
        updateEntityState(fan.entity_id, 'off');
        await callHAService('fan', 'turn_off', {}, { entity_id: fan.entity_id });
      } else if (!shouldTurnOff && fan.state !== 'on') {
        updateEntityState(fan.entity_id, 'on', { percentage: 66 });
        await callHAService('fan', 'turn_on', { percentage: 66 }, { entity_id: fan.entity_id });
      }
    }
  };

  const handleTogglePlayPause = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeMedia) return;
    const isPlaying = activeMedia.state === 'playing';
    const nextState = isPlaying ? 'paused' : 'playing';
    
    updateEntityState(activeMedia.entity_id, nextState);
    await callHAService('media_player', isPlaying ? 'media_pause' : 'media_play', {}, { entity_id: activeMedia.entity_id });
  };

  const handleToggleVacuum = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!firstVacuum) return;
    if (isVacuumCleaning) {
      updateEntityState(firstVacuum.entity_id, 'returning');
      await callHAService('vacuum', 'return_to_base', {}, { entity_id: firstVacuum.entity_id });
    } else {
      updateEntityState(firstVacuum.entity_id, 'cleaning');
      await callHAService('vacuum', 'start', {}, { entity_id: firstVacuum.entity_id });
    }
  };

  const handleQuickAlarmToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!alarmEntity) return;
    const isArmed = alarmEntity.state && alarmEntity.state !== 'disarmed';
    if (isArmed) {
      setDrawerOpen('alarm');
    } else {
      updateEntityState(alarmEntity.entity_id, 'armed_home');
      await callHAService('alarm_control_panel', 'alarm_arm_home', {}, { entity_id: alarmEntity.entity_id });
    }
  };

  const getAlarmBadgeDetails = () => {
    switch (alarmEntity?.state) {
      case 'armed_home':
        return { label: 'Armed Home', bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-300' };
      case 'armed_away':
        return { label: 'Armed Away', bg: 'bg-rose-500/15', text: 'text-rose-700 dark:text-rose-300' };
      case 'armed_night':
        return { label: 'Armed Night', bg: 'bg-indigo-500/15', text: 'text-indigo-700 dark:text-indigo-300' };
      case 'disarmed':
      default:
        return { label: 'Disarmed', bg: 'bg-slate-200 dark:bg-white/10', text: 'text-slate-600 dark:text-slate-400' };
    }
  };

  const alarmDetails = getAlarmBadgeDetails();

  const hasAnyActiveBadge =
    activeZoneUsers.length > 0 ||
    onLights.length > 0 ||
    onSwitches.length > 0 ||
    activeFans.length > 0 ||
    isVacuumCleaning ||
    isPlayingMedia ||
    isAlarmArmed ||
    openDoors.length > 0 ||
    openWindows.length > 0 ||
    activeMotion.length > 0 ||
    activeLeaks.length > 0 ||
    activeSmoke.length > 0;

  const { config, updateConfig, flushPendingSave } = useUserConfig();
  const { isEditMode, setEditMode } = useEditMode();

  const overviewConfig = config.overview || {};
  const currentTileOrder = useMemo(() => {
    const savedOrder = overviewConfig.tileOrder || [];
    const orderSet = new Set(savedOrder);
    const fullOrder = [...savedOrder];
    DEFAULT_OVERVIEW_TILE_ORDER.forEach((id) => {
      if (!orderSet.has(id)) {
        fullOrder.push(id);
      }
    });
    return fullOrder;
  }, [overviewConfig.tileOrder]);

  const hiddenTilesSet = useMemo(() => {
    return new Set(overviewConfig.hiddenTiles || []);
  }, [overviewConfig.hiddenTiles]);

  const tileSizes = useMemo(() => {
    return overviewConfig.tileSizes || {};
  }, [overviewConfig.tileSizes]);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5
    }
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 150,
      tolerance: 8
    }
  });

  const sensors = useSensors(pointerSensor, touchSensor);

  const displayTiles = useMemo(() => {
    return currentTileOrder.filter((id) => {
      if (id === 'vacuums' && vacuumEntities.length === 0 && !isEditMode) return false;
      if (isEditMode) return true;
      return !hiddenTilesSet.has(id);
    });
  }, [currentTileOrder, vacuumEntities.length, isEditMode, hiddenTilesSet]);

  const handleReorder = useCallback((newOrder: string[]) => {
    const fullOrder = [...newOrder];
    DEFAULT_OVERVIEW_TILE_ORDER.forEach((id) => {
      if (!fullOrder.includes(id)) {
        fullOrder.push(id);
      }
    });
    updateConfig((prev) => ({
      ...prev,
      overview: {
        ...(prev.overview || {}),
        tileOrder: fullOrder
      }
    }));
  }, [updateConfig]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = displayTiles.indexOf(String(active.id));
    const newIndex = displayTiles.indexOf(String(over.id));

    if (oldIndex !== -1 && newIndex !== -1) {
      const newDisplayOrder = arrayMove(displayTiles, oldIndex, newIndex);
      handleReorder(newDisplayOrder);
    }
  }, [displayTiles, handleReorder]);

  const handleMoveTile = useCallback((tileId: string, direction: 'left' | 'right') => {
    const index = displayTiles.indexOf(tileId);
    if (index === -1) return;
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= displayTiles.length) return;
    const newOrder = arrayMove(displayTiles, index, targetIndex);
    handleReorder(newOrder);
  }, [displayTiles, handleReorder]);

  const handleToggleSize = useCallback((tileId: string) => {
    const currentSize = tileSizes[tileId] || '1x';
    const nextSize = currentSize === '2x' ? '1x' : '2x';
    updateConfig((prev) => ({
      ...prev,
      overview: {
        ...(prev.overview || {}),
        tileSizes: {
          ...(prev.overview?.tileSizes || {}),
          [tileId]: nextSize
        }
      }
    }));
  }, [tileSizes, updateConfig]);

  const handleToggleHide = useCallback((tileId: string) => {
    const isHidden = hiddenTilesSet.has(tileId);
    const nextSet = new Set(hiddenTilesSet);
    if (isHidden) {
      nextSet.delete(tileId);
    } else {
      nextSet.add(tileId);
    }
    updateConfig((prev) => ({
      ...prev,
      overview: {
        ...(prev.overview || {}),
        hiddenTiles: Array.from(nextSet)
      }
    }));
  }, [hiddenTilesSet, updateConfig]);

  const handleUnhideAll = useCallback(() => {
    updateConfig((prev) => ({
      ...prev,
      overview: {
        ...(prev.overview || {}),
        hiddenTiles: []
      }
    }));
  }, [updateConfig]);

  const handleResetLayout = useCallback(() => {
    updateConfig((prev) => ({
      ...prev,
      overview: {
        tileOrder: [...DEFAULT_OVERVIEW_TILE_ORDER],
        hiddenTiles: [],
        tileSizes: {}
      }
    }));
  }, [updateConfig]);

  const getTileClickHandler = useCallback((tileId: string) => {
    switch (tileId) {
      case 'weather': return () => setDrawerOpen('weather');
      case 'users': return () => openUsersDrawer();
      case 'lights': return () => setDrawerOpen('lights');
      case 'switches': return () => setDrawerOpen('switches');
      case 'vacuums': return () => setDrawerOpen('vacuums');
      case 'fans': return () => setDrawerOpen('fans');
      case 'media': return () => setDrawerOpen('media');
      case 'alarm': return () => setDrawerOpen('alarm');
      case 'doors': return openDoorsDrawer;
      case 'windows': return openWindowsDrawer;
      case 'motion': return () => openSensorsDrawer('motion');
      case 'leak': return () => openSensorsDrawer('leak');
      case 'smoke': return () => openSensorsDrawer('smoke');
      default: return () => {};
    }
  }, []);

  const tileBaseClass = (
    isActive: boolean,
    activeColorClass: string,
    isAlert: boolean = false,
    _is2x: boolean = false
  ) => {
    return `w-full group relative h-36 rounded-3xl backdrop-blur-xl border transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden isolate transform-gpu p-3.5 sm:p-4 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
      isAlert
        ? darkMode
          ? 'bg-rose-950/60 text-white border-rose-500/30'
          : 'bg-rose-100 text-rose-950 border-rose-200'
        : isActive
        ? activeColorClass
        : darkMode
        ? 'bg-black/20 hover:bg-black/30 text-white border-white/5'
        : 'bg-white/20 hover:bg-white/30 text-slate-900 border-slate-200/50'
    }`;
  };

  return (
    <section aria-label="House Telemetry and Fast Controls" className="space-y-4 mb-6">
      {/* ============================================================= */}
      {/* 1. STATUS PILLS BAR (ONLY ACTIVE BADGES IN EXACT ORDER)      */}
      {/* ============================================================= */}
      {hasAnyActiveBadge && (
        <div className="flex flex-wrap items-center gap-2 animate-fadeIn">
          {/* 1.1 USERS IN KNOWN ZONES (HOME & KNOWN ZONES) */}
          {activeZoneUsers.map((user) => {
            const firstName = user.name.split(' ')[0];
            const { isHome, zoneName } = getPersonZoneDetails(user);

            return (
              <button
                key={user.entity_id}
                type="button"
                onClick={() => openUsersDrawer(user)}
                className={`h-8.5 pl-1 pr-2.5 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs select-none whitespace-nowrap shrink-0 ${
                  isHome
                    ? darkMode
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-emerald-500/15 text-emerald-800'
                    : darkMode
                    ? 'bg-sky-500/15 text-sky-300'
                    : 'bg-sky-500/15 text-sky-800'
                }`}
                title={`${user.name}: ${isHome ? 'At Home' : `In ${zoneName} Zone`}`}
              >
                <PersonAvatar
                  name={user.name}
                  entity_picture={user.attributes?.entity_picture}
                  state={user.state}
                  isHome={isHome}
                  inZone={!isHome}
                  size="sm"
                  showPresenceDot={false}
                  className="w-6 h-6 shrink-0"
                />
                <span className="whitespace-nowrap">
                  {isHome ? firstName : `${firstName} (${zoneName})`}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isHome ? 'bg-emerald-500' : 'bg-sky-500'}`} />
              </button>
            );
          })}

          {/* 1.2 LIGHTS BADGE (ONLY WHEN ACTIVE) */}
          {onLights.length > 0 && (
            <button
              type="button"
              onClick={() => setDrawerOpen('lights')}
              className={`h-8.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
                darkMode
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-amber-500/15 text-amber-900'
              }`}
            >
              <Lightbulb size={16} weight="fill" className="text-amber-500 shrink-0" />
              <span className="whitespace-nowrap">{onLights.length} Lights</span>
            </button>
          )}

          {/* 1.3 SWITCHES BADGE (ONLY WHEN ACTIVE) */}
          {onSwitches.length > 0 && (
            <button
              type="button"
              onClick={() => setDrawerOpen('switches')}
              className={`h-8.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
                darkMode
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-emerald-500/15 text-emerald-900'
              }`}
            >
              <ToggleRight size={16} weight="duotone" className="text-emerald-500 shrink-0" />
              <span className="whitespace-nowrap">{onSwitches.length} Switches</span>
            </button>
          )}

          {/* 1.4 FANS BADGE (ONLY WHEN ACTIVE) */}
          {activeFans.length > 0 && (
            <button
              type="button"
              onClick={() => setDrawerOpen('fans')}
              className={`h-8.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
                darkMode
                  ? 'bg-cyan-500/15 text-cyan-300'
                  : 'bg-cyan-500/15 text-cyan-900'
              }`}
            >
              <Fan size={16} weight="duotone" className="text-cyan-500 shrink-0 animate-spin" style={{ animationDuration: '3s' }} />
              <span className="whitespace-nowrap">{activeFans.length} Fans</span>
            </button>
          )}

          {/* 1.5 VACUUM ROBOTS BADGE (ONLY WHEN CLEANING) */}
          {isVacuumCleaning && (
            <button
              type="button"
              onClick={() => setDrawerOpen('vacuums')}
              className={`h-8.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
                darkMode
                  ? 'bg-teal-500/15 text-teal-300'
                  : 'bg-teal-500/15 text-teal-900'
              }`}
            >
              <Broom size={16} weight="duotone" className="text-teal-500 shrink-0" />
              <span className="whitespace-nowrap">{activeVacuums.length} Cleaning</span>
            </button>
          )}

          {/* 1.6 AUDIO / MEDIA BADGE (ONLY WHEN PLAYING) */}
          {isPlayingMedia && (
            <button
              type="button"
              onClick={() => setDrawerOpen('media')}
              className={`h-8.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
                darkMode
                  ? 'bg-purple-500/15 text-purple-300'
                  : 'bg-purple-500/15 text-purple-900'
              }`}
              title={
                playingMediaEntities.length === 1
                  ? `Playing: ${playingSongTitle || 'Audio'}`
                  : `${playingMediaEntities.length} speakers currently playing`
              }
            >
              <MusicNotes size={16} weight="duotone" className="text-purple-500 shrink-0" />
              <span className="whitespace-nowrap">
                {playingMediaEntities.length === 1
                  ? (playingSongTitle || 'Playing Audio')
                  : `${playingMediaEntities.length} Playing`}
              </span>
            </button>
          )}

          {/* 1.7 ALARM BADGE (ONLY WHEN ARMED) */}
          {isAlarmArmed && (
            <button
              type="button"
              onClick={() => setDrawerOpen('alarm')}
              className={`h-8.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
                alarmDetails.bg
              } ${alarmDetails.text}`}
            >
              <ShieldCheck size={16} weight="duotone" className="shrink-0" />
              <span className="whitespace-nowrap">{alarmDetails.label}</span>
            </button>
          )}

          {/* 1.8 DOORS BADGE (ONLY WHEN OPEN) */}
          {openDoors.length > 0 && (
            <button
              type="button"
              onClick={openDoorsDrawer}
              className={`h-8.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
                darkMode
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-amber-500/15 text-amber-900'
              }`}
            >
              <DoorOpen size={16} weight="duotone" className="text-amber-500 shrink-0" />
              <span className="whitespace-nowrap">{openDoors.length} Doors</span>
            </button>
          )}

          {/* 1.9 WINDOWS BADGE (ONLY WHEN OPEN) */}
          {openWindows.length > 0 && (
            <button
              type="button"
              onClick={openWindowsDrawer}
              className={`h-8.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
                darkMode
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-amber-500/15 text-amber-900'
              }`}
            >
              <FrameCorners size={16} weight="duotone" className="text-amber-500 shrink-0" />
              <span className="whitespace-nowrap">{openWindows.length} Windows</span>
            </button>
          )}

          {/* 1.10 MOTION BADGE (ONLY WHEN DETECTED) */}
          {activeMotion.length > 0 && (
            <button
              type="button"
              onClick={() => openSensorsDrawer('motion')}
              className={`h-8.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
                darkMode
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-amber-500/15 text-amber-900'
              }`}
            >
              <PersonSimpleWalk size={16} weight="duotone" className="text-amber-500 shrink-0" />
              <span className="whitespace-nowrap">{activeMotion.length} Motion</span>
            </button>
          )}

          {/* 1.11 LEAKAGE BADGE (ONLY WHEN DETECTED) */}
          {activeLeaks.length > 0 && (
            <button
              type="button"
              onClick={() => openSensorsDrawer('leak')}
              className={`h-8.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
                darkMode
                  ? 'bg-rose-500/15 text-rose-300'
                  : 'bg-rose-500/15 text-rose-900'
              }`}
            >
              <Drop size={16} weight="duotone" className="text-rose-500 shrink-0 animate-pulse" />
              <span className="whitespace-nowrap">{activeLeaks.length} Leaks</span>
            </button>
          )}

          {/* 1.12 SMOKE BADGE (ONLY WHEN DETECTED) */}
          {activeSmoke.length > 0 && (
            <button
              type="button"
              onClick={() => openSensorsDrawer('smoke')}
              className={`h-8.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
                darkMode
                  ? 'bg-rose-500/15 text-rose-300'
                  : 'bg-rose-500/15 text-rose-900'
              }`}
            >
              <Flame size={16} weight="duotone" className="text-rose-500 shrink-0 animate-pulse" />
              <span className="whitespace-nowrap">{activeSmoke.length} Smoke</span>
            </button>
          )}
        </div>
      )}

      {/* Overview Customization Header / Action Banner */}
      {isEditMode ? (
        <div className="w-full p-3 sm:p-3.5 rounded-2xl bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/30 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <PencilSimpleLine size={18} weight="bold" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Customize Overview Tiles</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-300">
                  Edit Mode
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400">
                Drag or use arrows to reorganize • Toggle 1×/2× width • Tap eye to show or hide
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {hiddenTilesSet.size > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  Hidden:
                </span>
                {Array.from(hiddenTilesSet).map((hiddenId) => (
                  <button
                    key={hiddenId}
                    type="button"
                    onClick={() => handleToggleHide(hiddenId)}
                    className="h-6 px-2 rounded-lg text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1"
                    title={`Click to show ${TILE_TITLES[hiddenId] || hiddenId}`}
                  >
                    <Eye size={11} weight="bold" />
                    <span>+{TILE_TITLES[hiddenId] || hiddenId}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleUnhideAll}
                  className="h-6 px-2 rounded-lg text-[10px] font-extrabold bg-amber-500/25 hover:bg-amber-500/40 text-amber-700 dark:text-amber-300 transition-all cursor-pointer"
                >
                  Show All
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleResetLayout}
              className="h-7 px-2.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 transition-all cursor-pointer flex items-center gap-1.5"
              title="Reset tiles to default order and 1x width"
            >
              <ArrowCounterClockwise size={13} weight="bold" />
              <span>Reset Layout</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                setEditMode(false);
                await flushPendingSave();
              }}
              className="h-7 px-3 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <CheckCircle size={14} weight="bold" />
              <span>Done</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            House Overview
          </span>
          <button
            type="button"
            onClick={() => setEditMode(true)}
            className="h-7 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs border border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300"
            title="Customize Overview Tiles (reorganize, resize, show/hide)"
          >
            <PencilSimpleLine size={13} weight="bold" className="text-sky-500" />
            <span>Customize Tiles</span>
          </button>
        </div>
      )}

      {/* ============================================================= */}
      {/* 2. BENTO TILES GRID (BORDERLESS 4-COLS MOBILE / ADAPTIVE)    */}
      {/* ============================================================= */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={displayTiles} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {displayTiles.map((tileId, index) => {
              const isHidden = hiddenTilesSet.has(tileId);
              const is2x = tileSizes[tileId] === '2x';
              const canMoveLeft = index > 0;
              const canMoveRight = index < displayTiles.length - 1;

              return (
                <OverviewSortableTile
                  key={tileId}
                  id={tileId}
                  isEditMode={isEditMode}
                  isHidden={isHidden}
                  is2x={is2x}
                  canMoveLeft={canMoveLeft}
                  canMoveRight={canMoveRight}
                  onMoveLeft={() => handleMoveTile(tileId, 'left')}
                  onMoveRight={() => handleMoveTile(tileId, 'right')}
                  onToggleHide={() => handleToggleHide(tileId)}
                  onToggleSize={() => handleToggleSize(tileId)}
                  onClick={getTileClickHandler(tileId)}
                >
                  {(() => {
                    switch (tileId) {
                      case 'weather': {
                        const windSpeed = activeWeather?.attributes?.wind_speed;
                        const windUnit = activeWeather?.attributes?.wind_speed_unit || 'km/h';
                        const precip = activeWeather?.attributes?.precipitation;

                        return (
                          <div className={tileBaseClass(false, '', false, is2x)}>
                            <AnimatedWeatherBackdrop condition={weatherCondition} isNight={isNight} darkMode={darkMode} />
                            <div className={`absolute inset-0 pointer-events-none rounded-3xl ${darkMode ? 'bg-black/20' : 'bg-white/10'}`} />

                            <div className="flex items-center justify-between relative z-10">
                              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/70 dark:bg-black/30 backdrop-blur-md border border-white/80 dark:border-white/10 flex items-center justify-center shadow-xs">
                                {weatherCondInfo.icon}
                              </div>
                              <div className="flex items-center gap-1.5">
                                {is2x && typeof windSpeed === 'number' && (
                                  <span className="text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full backdrop-blur-md bg-white/40 dark:bg-black/40 border border-white/20 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                    <Wind size={11} weight="bold" />
                                    <span>{Math.round(windSpeed)} {windUnit}</span>
                                  </span>
                                )}
                                <span className={`text-[9px] sm:text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full backdrop-blur-md border shadow-xs ${weatherCondInfo.badgeBg}`}>
                                  {weatherCondInfo.name}
                                </span>
                              </div>
                            </div>

                            <div className="relative z-10 my-0.5 flex items-baseline justify-between">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                                  {Math.round(currentTemp)}{tempUnit}
                                </span>
                                <span className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300">
                                  H: {Math.round(weatherHigh)}° L: {Math.round(weatherLow)}°
                                </span>
                              </div>
                              {is2x && (
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 capitalize truncate ml-2">
                                  {weatherCondition.replace(/_/g, ' ')}
                                </span>
                              )}
                            </div>

                            <div className="relative z-10">
                              <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">Weather</div>
                              <div className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 font-medium truncate flex items-center justify-between">
                                <span>{humidity}% Humidity{is2x && typeof precip === 'number' ? ` • ${precip}mm rain` : ''}</span>
                                <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-400 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all" />
                              </div>
                            </div>
                          </div>
                        );
                      }

                      case 'users': {
                        return (
                          <div className={tileBaseClass(false, '', false, is2x)}>
                            <div className="flex items-center justify-between relative z-10">
                              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                                <Users size={20} weight="duotone" />
                              </div>
                              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                {homeUsers.length} Home{activeZoneUsers.length > homeUsers.length ? ` • ${activeZoneUsers.length - homeUsers.length} Zone` : ''}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 my-auto py-1 relative z-10 overflow-hidden">
                              {userEntities.slice(0, is2x ? 6 : 3).map((user) => {
                                const { isHome, isInKnownZone } = getPersonZoneDetails(user);
                                return (
                                  <div key={user.entity_id} className="flex items-center gap-1.5 shrink-0">
                                    <PersonAvatar
                                      name={user.name}
                                      entity_picture={user.attributes?.entity_picture}
                                      state={user.state}
                                      isHome={isHome}
                                      inZone={isInKnownZone && !isHome}
                                      size="sm"
                                      className="w-8 h-8 sm:w-9 sm:h-9"
                                    />
                                    {is2x && (
                                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate max-w-[65px] hidden sm:inline">
                                        {user.name.split(' ')[0]}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            <div className="relative z-10">
                              <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">Family Presence</div>
                              <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
                                <span className="truncate">
                                  {activeZoneUsers.map((u) => {
                                    const fn = u.name.split(' ')[0];
                                    const { isHome, zoneName } = getPersonZoneDetails(u);
                                    return isHome ? fn : `${fn} (${zoneName})`;
                                  }).join(', ') || 'No one home or in zone'}
                                </span>
                                <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                              </div>
                            </div>
                          </div>
                        );
                      }

                      case 'lights': {
                        return (
                          <div
                            className={tileBaseClass(
                              onLights.length > 0,
                              darkMode ? 'bg-amber-500/20 text-white border-amber-500/30' : 'bg-amber-500/20 text-slate-900 border-amber-300/60',
                              false,
                              is2x
                            )}
                          >
                            <div className="flex items-center justify-between relative z-10">
                              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center transition-all ${
                                onLights.length > 0
                                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                                  : 'bg-white/80 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                              }`}>
                                <Lightbulb size={20} weight={onLights.length > 0 ? 'fill' : 'duotone'} />
                              </div>

                              <div className="flex items-center gap-2">
                                {is2x && onLights.length > 0 && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-300 hidden sm:inline truncate max-w-[120px]">
                                    {onLights[0].name.replace(/light/gi, '').trim()}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={handleToggleLightBatch}
                                  className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                    onLights.length > 0
                                      ? 'bg-amber-500/25 text-amber-700 dark:text-amber-300 hover:bg-amber-500/40'
                                      : 'bg-white/80 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/15'
                                  }`}
                                  title={onLights.length > 0 ? 'Turn all off' : 'Turn lights on'}
                                >
                                  <Power size={13} weight="bold" />
                                </button>
                              </div>
                            </div>

                            <div className="relative z-10 my-0.5 flex items-baseline justify-between">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{onLights.length}</span>
                                <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">/ {lightEntities.length} On</span>
                              </div>
                              {is2x && onLights.length > 0 && (
                                <span className="text-xs font-medium text-amber-600 dark:text-amber-300 truncate ml-2">
                                  {onLights.length === 1 ? '1 lamp active' : `${onLights.length} lamps active`}
                                </span>
                              )}
                            </div>

                            <div className="relative z-10">
                              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Lighting</div>
                              <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
                                <span>{onLights.length > 0 ? `${onLights.length} active` : 'All lights off'}</span>
                                <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                              </div>
                            </div>
                          </div>
                        );
                      }

                      case 'switches': {
                        return (
                          <div
                            className={tileBaseClass(
                              onSwitches.length > 0,
                              darkMode ? 'bg-emerald-500/20 text-white border-emerald-500/30' : 'bg-emerald-500/20 text-slate-900 border-emerald-300/60',
                              false,
                              is2x
                            )}
                          >
                            <div className="flex items-center justify-between relative z-10">
                              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center transition-all ${
                                onSwitches.length > 0
                                  ? 'bg-emerald-500 text-white shadow-xs'
                                  : 'bg-white/80 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                              }`}>
                                <ToggleRight size={20} weight="duotone" />
                              </div>

                              <div className="flex items-center gap-2">
                                {is2x && onSwitches.length > 0 && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 hidden sm:inline truncate max-w-[120px]">
                                    {onSwitches[0].name.replace(/switch/gi, '').trim()}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={handleToggleSwitchBatch}
                                  className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                    onSwitches.length > 0
                                      ? 'bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/40'
                                      : 'bg-white/80 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/15'
                                  }`}
                                  title={onSwitches.length > 0 ? 'Turn all switches off' : 'Turn switches on'}
                                >
                                  <Power size={13} weight="bold" />
                                </button>
                              </div>
                            </div>

                            <div className="relative z-10 my-0.5 flex items-baseline justify-between">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{onSwitches.length}</span>
                                <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">/ {switchEntities.length} Active</span>
                              </div>
                              {is2x && onSwitches.length > 0 && (
                                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-300 truncate ml-2">
                                  {onSwitches.length === 1 ? '1 active switch' : `${onSwitches.length} active switches`}
                                </span>
                              )}
                            </div>

                            <div className="relative z-10">
                              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Switches</div>
                              <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
                                <span>{onSwitches.length > 0 ? `${onSwitches.length} powered` : 'All off'}</span>
                                <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                              </div>
                            </div>
                          </div>
                        );
                      }

                      case 'vacuums': {
                        return (
                          <div
                            className={tileBaseClass(
                              isVacuumCleaning,
                              darkMode ? 'bg-teal-500/20 text-white border-teal-500/30' : 'bg-teal-500/20 text-slate-900 border-teal-300/60',
                              false,
                              is2x
                            )}
                          >
                            <div className="flex items-center justify-between relative z-10">
                              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center transition-all ${
                                isVacuumCleaning
                                  ? 'bg-teal-500 text-slate-950 shadow-xs'
                                  : 'bg-white/80 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                              }`}>
                                <Broom size={20} weight={isVacuumCleaning ? 'fill' : 'duotone'} />
                              </div>

                              <button
                                type="button"
                                onClick={handleToggleVacuum}
                                className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                  isVacuumCleaning
                                    ? 'bg-amber-500/25 text-amber-700 dark:text-amber-300 hover:bg-amber-500/40'
                                    : 'bg-white/80 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/15'
                                }`}
                                title={isVacuumCleaning ? 'Dock vacuum' : 'Start cleaning'}
                              >
                                {isVacuumCleaning ? <ArrowArcLeft size={13} weight="bold" /> : <Play size={13} weight="fill" />}
                              </button>
                            </div>

                            <div className="relative z-10 my-0.5 flex items-baseline justify-between">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                                  {isVacuumCleaning ? 'Cleaning' : 'Docked'}
                                </span>
                                {vacuumBattery !== undefined && (
                                  <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
                                    • {Math.round(vacuumBattery)}%
                                  </span>
                                )}
                              </div>
                              {is2x && (
                                <span className="text-xs font-semibold text-teal-600 dark:text-teal-300 truncate ml-2">
                                  {firstVacuum?.name || 'Robotic Cleaner'}
                                </span>
                              )}
                            </div>

                            <div className="relative z-10">
                              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Vacuums</div>
                              <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
                                <span>{firstVacuum?.name || 'Robotic Cleaner'}</span>
                                <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all" />
                              </div>
                            </div>
                          </div>
                        );
                      }

                      case 'fans': {
                        return (
                          <div
                            className={tileBaseClass(
                              activeFans.length > 0,
                              darkMode ? 'bg-cyan-500/20 text-white border-cyan-500/30' : 'bg-cyan-500/20 text-slate-900 border-cyan-300/60',
                              false,
                              is2x
                            )}
                          >
                            <div className="flex items-center justify-between relative z-10">
                              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center transition-all ${
                                activeFans.length > 0
                                  ? 'bg-cyan-500 text-slate-950 shadow-xs'
                                  : 'bg-white/80 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                              }`}>
                                <Fan size={20} weight="duotone" className={activeFans.length > 0 ? 'animate-spin' : ''} style={{ animationDuration: '2s' }} />
                              </div>

                              <button
                                type="button"
                                onClick={handleToggleFanBatch}
                                className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                  activeFans.length > 0
                                    ? 'bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/40'
                                    : 'bg-white/80 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/15'
                                }`}
                                title={activeFans.length > 0 ? 'Turn all off' : 'Turn fans on'}
                              >
                                <Power size={13} weight="bold" />
                              </button>
                            </div>

                            <div className="relative z-10 my-0.5 flex items-baseline justify-between">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{activeFans.length}</span>
                                <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">/ {fanEntities.length} Running</span>
                              </div>
                              {is2x && activeFans.length > 0 && (
                                <span className="text-xs font-medium text-cyan-600 dark:text-cyan-300 truncate ml-2">
                                  Circulating fresh air
                                </span>
                              )}
                            </div>

                            <div className="relative z-10">
                              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Fans & Airflow</div>
                              <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
                                <span>{activeFans.length > 0 ? 'Circulating air' : 'All fans idle'}</span>
                                <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-all" />
                              </div>
                            </div>
                          </div>
                        );
                      }

                      case 'media': {
                        return (
                          <div
                            className={tileBaseClass(
                              isPlayingMedia,
                              darkMode ? 'bg-purple-500/20 text-white border-purple-500/30' : 'bg-purple-500/20 text-slate-900 border-purple-300/60',
                              false,
                              is2x
                            )}
                          >
                            <div className="flex items-center justify-between relative z-10">
                              <div className="flex items-center gap-2.5">
                                <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl overflow-hidden shadow-xs shrink-0">
                                  {getHAImageUrl(activeMedia?.attributes?.media_image, serverUrl) ? (
                                    <img
                                      src={getHAImageUrl(activeMedia?.attributes?.media_image, serverUrl)}
                                      alt="Album artwork"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-300">
                                      <MusicNotes size={20} weight="duotone" />
                                    </div>
                                  )}
                                </div>
                                {is2x && (
                                  <div className="min-w-0">
                                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-[160px] sm:max-w-[200px]">
                                      {activeMedia?.attributes?.media_title || (isPlayingMedia ? 'Playing Media' : 'Audio Idle')}
                                    </h4>
                                    <p className="text-[11px] sm:text-xs text-purple-600 dark:text-purple-300 font-medium truncate max-w-[160px] sm:max-w-[200px]">
                                      {activeMedia?.attributes?.media_artist || (activeMedia ? activeMedia.name : 'No active player')}
                                    </p>
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={handleTogglePlayPause}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
                                title={isPlayingMedia ? 'Pause Audio' : 'Play Audio'}
                              >
                                {isPlayingMedia ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" className="ml-0.5" />}
                              </button>
                            </div>

                            {!is2x && (
                              <div className="relative z-10 my-0.5 min-w-0">
                                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                                  {activeMedia?.attributes?.media_title || (isPlayingMedia ? 'Playing Media' : 'Audio Idle')}
                                </h4>
                                <p className="text-[11px] sm:text-xs text-purple-600 dark:text-purple-300 font-medium truncate">
                                  {activeMedia?.attributes?.media_artist || (activeMedia ? activeMedia.name : 'No active player')}
                                </p>
                              </div>
                            )}

                            <div className="relative z-10">
                              <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
                                <span className="truncate">{activeMedia?.name || 'Media Player'}</span>
                                <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                              </div>
                            </div>
                          </div>
                        );
                      }

                      case 'alarm': {
                        return (
                          <div
                            className={tileBaseClass(
                              isAlarmArmed,
                              darkMode ? 'bg-emerald-500/20 text-white border-emerald-500/30' : 'bg-emerald-500/20 text-slate-900 border-emerald-300/60',
                              false,
                              is2x
                            )}
                          >
                            <div className="flex items-center justify-between relative z-10">
                              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center transition-all ${alarmDetails.bg} ${alarmDetails.text}`}>
                                {isAlarmArmed ? <ShieldCheck size={20} weight="duotone" /> : <LockOpen size={20} weight="duotone" />}
                              </div>

                              <button
                                type="button"
                                onClick={handleQuickAlarmToggle}
                                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl text-[9px] sm:text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                                  isAlarmArmed
                                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30'
                                    : 'bg-white/80 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/15'
                                }`}
                                title={isAlarmArmed ? 'Click to disarm' : 'Click to arm'}
                              >
                                {isAlarmArmed ? 'Armed' : 'Disarmed'}
                              </button>
                            </div>

                            <div className="relative z-10 my-0.5 flex items-baseline justify-between">
                              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                                {alarmDetails.label}
                              </div>
                              {is2x && (
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                  {isAlarmArmed ? 'Sensors active' : 'Ready to arm'}
                                </span>
                              )}
                            </div>

                            <div className="relative z-10">
                              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Security Guard</div>
                              <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
                                <span>{isAlarmArmed ? 'Perimeter armed' : 'Ready to arm'}</span>
                                <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                              </div>
                            </div>
                          </div>
                        );
                      }

                      case 'doors': {
                        return (
                          <div
                            className={tileBaseClass(
                              openDoors.length > 0,
                              darkMode ? 'bg-amber-500/20 text-white border-amber-500/30' : 'bg-amber-500/20 text-slate-900 border-amber-300/60',
                              false,
                              is2x
                            )}
                          >
                            <div className="flex items-center justify-between relative z-10">
                              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center transition-all ${
                                openDoors.length > 0
                                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              }`}>
                                {openDoors.length > 0 ? <DoorOpen size={20} weight="duotone" /> : <Door size={20} weight="duotone" />}
                              </div>

                              <span className={`text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                openDoors.length > 0
                                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              }`}>
                                {openDoors.length > 0 ? `${openDoors.length} Open` : 'Secure'}
                              </span>
                            </div>

                            <div className="relative z-10 my-0.5 flex items-baseline justify-between">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                                  {openDoors.length}
                                </span>
                                <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">/ {doorSensors.length} Doors</span>
                              </div>
                              {is2x && openDoors.length > 0 && (
                                <span className="text-xs font-bold text-amber-600 dark:text-amber-300 truncate max-w-[140px]">
                                  {openDoors.map(d => d.name).slice(0, 2).join(', ')}
                                </span>
                              )}
                            </div>

                            <div className="relative z-10">
                              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Entry Doors</div>
                              <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
                                <span>{openDoors.length > 0 ? `${openDoors.length} open` : 'All doors closed'}</span>
                                <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                              </div>
                            </div>
                          </div>
                        );
                      }

                      case 'windows': {
                        return (
                          <div
                            className={tileBaseClass(
                              openWindows.length > 0,
                              darkMode ? 'bg-amber-500/20 text-white border-amber-500/30' : 'bg-amber-500/20 text-slate-900 border-amber-300/60',
                              false,
                              is2x
                            )}
                          >
                            <div className="flex items-center justify-between relative z-10">
                              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center transition-all ${
                                openWindows.length > 0
                                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              }`}>
                                <FrameCorners size={20} weight="duotone" className={openWindows.length > 0 ? 'text-amber-500' : 'text-emerald-500'} />
                              </div>

                              <span className={`text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                openWindows.length > 0
                                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              }`}>
                                {openWindows.length > 0 ? `${openWindows.length} Open` : 'Sealed'}
                              </span>
                            </div>

                            <div className="relative z-10 my-0.5 flex items-baseline justify-between">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                                  {openWindows.length}
                                </span>
                                <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">/ {windowSensors.length} Windows</span>
                              </div>
                              {is2x && openWindows.length > 0 && (
                                <span className="text-xs font-bold text-amber-600 dark:text-amber-300 truncate max-w-[140px]">
                                  {openWindows.map(w => w.name).slice(0, 2).join(', ')}
                                </span>
                              )}
                            </div>

                            <div className="relative z-10">
                              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Windows</div>
                              <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
                                <span>{openWindows.length > 0 ? `${openWindows.length} open` : 'All windows shut'}</span>
                                <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                              </div>
                            </div>
                          </div>
                        );
                      }

                      case 'motion': {
                        return (
                          <div
                            className={tileBaseClass(
                              activeMotion.length > 0,
                              darkMode ? 'bg-amber-500/20 text-white border-amber-500/30' : 'bg-amber-500/20 text-slate-900 border-amber-300/60',
                              false,
                              is2x
                            )}
                          >
                            <div className="flex items-center justify-between relative z-10">
                              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center transition-all ${
                                activeMotion.length > 0
                                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              }`}>
                                <PersonSimpleWalk size={20} weight="duotone" />
                              </div>

                              <span className={`text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                activeMotion.length > 0
                                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              }`}>
                                {activeMotion.length > 0 ? 'Motion' : 'Clear'}
                              </span>
                            </div>

                            <div className="relative z-10 my-0.5 flex items-baseline justify-between">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{activeMotion.length}</span>
                                <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">/ {motionSensors.length} Active</span>
                              </div>
                              {is2x && activeMotion.length > 0 && (
                                <span className="text-xs font-bold text-amber-600 dark:text-amber-300 truncate max-w-[140px]">
                                  {activeMotion.map(m => m.name).slice(0, 2).join(', ')}
                                </span>
                              )}
                            </div>

                            <div className="relative z-10">
                              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Motion Zones</div>
                              <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
                                <span>{activeMotion.length > 0 ? `${activeMotion.length} active` : 'No activity'}</span>
                                <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                              </div>
                            </div>
                          </div>
                        );
                      }

                      case 'leak': {
                        return (
                          <div
                            className={tileBaseClass(
                              activeLeaks.length > 0,
                              darkMode ? 'bg-rose-500/20 text-white border-rose-500/30' : 'bg-rose-500/20 text-rose-950 border-rose-300/60',
                              activeLeaks.length > 0,
                              is2x
                            )}
                          >
                            <div className="flex items-center justify-between relative z-10">
                              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center transition-all ${
                                activeLeaks.length > 0
                                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              }`}>
                                <Drop size={20} weight="duotone" />
                              </div>

                              <span className={`text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                activeLeaks.length > 0
                                  ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              }`}>
                                {activeLeaks.length > 0 ? 'Hazard' : 'Dry'}
                              </span>
                            </div>

                            <div className="relative z-10 my-0.5 flex items-baseline justify-between">
                              <div className="flex items-baseline gap-1.5">
                                <span className={`text-xl sm:text-2xl font-black font-mono ${activeLeaks.length > 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                                  {activeLeaks.length}
                                </span>
                                <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">/ {leakSensors.length} Probes</span>
                              </div>
                              {is2x && (
                                <span className={`text-xs font-bold truncate max-w-[150px] ${activeLeaks.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                  {activeLeaks.length > 0 ? 'Moisture detected!' : 'All zones sealed & dry'}
                                </span>
                              )}
                            </div>

                            <div className="relative z-10">
                              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Water Leaks</div>
                              <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
                                <span>{activeLeaks.length > 0 ? 'Moisture detected!' : 'All zones dry'}</span>
                                <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all" />
                              </div>
                            </div>
                          </div>
                        );
                      }

                      case 'smoke': {
                        return (
                          <div
                            className={tileBaseClass(
                              activeSmoke.length > 0,
                              darkMode ? 'bg-rose-500/20 text-white border-rose-500/30' : 'bg-rose-500/20 text-rose-950 border-rose-300/60',
                              activeSmoke.length > 0,
                              is2x
                            )}
                          >
                            <div className="flex items-center justify-between relative z-10">
                              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center transition-all ${
                                activeSmoke.length > 0
                                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              }`}>
                                <Flame size={20} weight="duotone" />
                              </div>

                              <span className={`text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                activeSmoke.length > 0
                                  ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              }`}>
                                {activeSmoke.length > 0 ? 'Hazard' : 'Safe'}
                              </span>
                            </div>

                            <div className="relative z-10 my-0.5 flex items-baseline justify-between">
                              <div className="flex items-baseline gap-1.5">
                                <span className={`text-xl sm:text-2xl font-black font-mono ${activeSmoke.length > 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                                  {activeSmoke.length}
                                </span>
                                <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">/ {smokeSensors.length} Detectors</span>
                              </div>
                              {is2x && (
                                <span className={`text-xs font-bold truncate max-w-[150px] ${activeSmoke.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                  {activeSmoke.length > 0 ? 'Smoke detected!' : 'All detectors normal'}
                                </span>
                              )}
                            </div>

                            <div className="relative z-10">
                              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Smoke & Fire</div>
                              <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
                                <span>{activeSmoke.length > 0 ? 'Smoke alarm triggered!' : 'All normal'}</span>
                                <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all" />
                              </div>
                            </div>
                          </div>
                        );
                      }

                      default:
                        return null;
                    }
                  })()}
                </OverviewSortableTile>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* ============================================================= */}
      {/* 3. SLIDE-OVER RIGHT SIDEBARS                                  */}
      {/* ============================================================= */}
      <React.Suspense fallback={null}>
        {openedDrawers['weather'] && (
          <WeatherOverviewDrawer
            isOpen={drawerOpen === 'weather'}
            onClose={() => setDrawerOpen(null)}
            darkMode={darkMode}
          />
        )}

        {openedDrawers['vacuums'] && (
          <VacuumsOverviewDrawer
            isOpen={drawerOpen === 'vacuums'}
            onClose={() => setDrawerOpen(null)}
            vacuums={vacuumEntities}
            darkMode={darkMode}
          />
        )}

        {openedDrawers['users'] && (
          <UsersPresenceModal
            isOpen={drawerOpen === 'users'}
            onClose={() => setDrawerOpen(null)}
            users={userEntities}
            selectedUser={selectedUser}
            darkMode={darkMode}
          />
        )}

        {openedDrawers['lights'] && (
          <LightsOverviewModal
            isOpen={drawerOpen === 'lights'}
            onClose={() => setDrawerOpen(null)}
            lights={lightEntities}
            onUpdateEntity={updateEntityState}
            darkMode={darkMode}
          />
        )}

        {openedDrawers['switches'] && (
          <SwitchesOverviewModal
            isOpen={drawerOpen === 'switches'}
            onClose={() => setDrawerOpen(null)}
            switches={switchEntities}
            onUpdateEntity={updateEntityState}
            darkMode={darkMode}
          />
        )}

        {openedDrawers['fans'] && (
          <FansOverviewModal
            isOpen={drawerOpen === 'fans'}
            onClose={() => setDrawerOpen(null)}
            fans={fanEntities}
            onUpdateEntity={updateEntityState}
            darkMode={darkMode}
          />
        )}

        {(openedDrawers['doors'] || openedDrawers['windows']) && (
          <OpeningsOverviewModal
            isOpen={drawerOpen === 'doors' || drawerOpen === 'windows'}
            onClose={() => setDrawerOpen(null)}
            doorSensors={doorSensors}
            windowSensors={windowSensors}
            otherContactSensors={otherContactSensors}
            initialTab={openingsTab}
            darkMode={darkMode}
          />
        )}

        {openedDrawers['sensors'] && (
          <SensorsOverviewDrawer
            isOpen={drawerOpen === 'sensors'}
            onClose={() => setDrawerOpen(null)}
            motionSensors={motionSensors}
            leakSensors={leakSensors}
            smokeSensors={smokeSensors}
            initialTab={sensorsTab}
            darkMode={darkMode}
          />
        )}

        {openedDrawers['alarm'] && (
          <AlarmKeypadModal
            isOpen={drawerOpen === 'alarm'}
            onClose={() => setDrawerOpen(null)}
            alarmEntity={alarmEntity}
            onUpdateEntity={updateEntityState}
            darkMode={darkMode}
          />
        )}

        {openedDrawers['media'] && (
          <MediaOverviewDrawer
            isOpen={drawerOpen === 'media'}
            onClose={() => setDrawerOpen(null)}
            mediaPlayers={mediaEntities}
            activeEntity={activeMedia}
            onUpdateEntity={(entityId, newState, attrs) => {
              updateEntityState(entityId, newState, attrs);
            }}
            darkMode={darkMode}
          />
        )}
      </React.Suspense>
    </section>
  );
}
