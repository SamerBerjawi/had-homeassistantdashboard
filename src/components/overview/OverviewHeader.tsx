/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  Wind,
  HouseLine,
  ShieldWarning,
  Moon,
  Key,
  ArrowUp,
  ArrowDown,
  SkipBack,
  SkipForward,
  SpeakerHigh
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
import { getDailyForecast } from '../../lib/weatherForecast';
import { useAlbumArtColor } from '../../hooks/useAlbumArtColor';
import Toolbar, { ToolbarItem } from '../kokonutui/toolbar';

// Lazy-loaded interactive slide-over drawers (loaded on first open)
const UsersPresenceModal = React.lazy(() => import('./modals/UsersPresenceModal'));
const LightsOverviewModal = React.lazy(() => import('./modals/LightsOverviewModal'));
const SwitchesOverviewModal = React.lazy(() => import('./modals/SwitchesOverviewModal'));
const FansOverviewModal = React.lazy(() => import('./modals/FansOverviewModal'));
const OpeningsOverviewModal = React.lazy(() => import('./modals/OpeningsOverviewModal'));
const AlarmKeypadModal = React.lazy(() => import('./modals/AlarmKeypadModal'));
const ArmAwayConfirmModal = React.lazy(() => import('./modals/ArmAwayConfirmModal'));
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
  const dailyForecast = useMemo(() => {
    return getDailyForecast(activeWeather);
  }, [activeWeather]);
  const todayForecast = dailyForecast[0];
  const weatherHigh = typeof todayForecast?.temperature === 'number'
    ? todayForecast.temperature
    : (activeWeather?.attributes?.forecast?.[0]?.temperature ?? Math.round(currentTemp + 3));
  const weatherLow = typeof todayForecast?.templow === 'number'
    ? todayForecast.templow
    : (activeWeather?.attributes?.forecast?.[0]?.templow ?? Math.round(currentTemp - 4));
  const humidity = activeWeather?.attributes?.humidity ?? 55;

  const isAlarmArmed = alarmEntity?.state && alarmEntity.state !== 'disarmed';
  const isPlayingMedia = playingMediaEntities.length > 0;
  const singlePlayingMedia = playingMediaEntities.length === 1 ? playingMediaEntities[0] : null;
  const playingSongTitle = singlePlayingMedia?.attributes?.media_title || singlePlayingMedia?.attributes?.app_name || singlePlayingMedia?.name;

  const activeMediaArtUrl = useMemo(() => {
    return getHAImageUrl(activeMedia?.attributes?.entity_picture || activeMedia?.attributes?.media_image, serverUrl);
  }, [activeMedia, serverUrl]);

  const mediaPalette = useAlbumArtColor(activeMediaArtUrl, {
    title: activeMedia?.attributes?.media_title,
    artist: activeMedia?.attributes?.media_artist || activeMedia?.name,
    darkMode
  });

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

  const handleNextTrack = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeMedia) return;
    await callHAService('media_player', 'media_next_track', {}, { entity_id: activeMedia.entity_id });
  };

  const handlePreviousTrack = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeMedia) return;
    await callHAService('media_player', 'media_previous_track', {}, { entity_id: activeMedia.entity_id });
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

  const [isArmAwayModalOpen, setIsArmAwayModalOpen] = useState(false);
  const [armAwayCountdown, setArmAwayCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  const handleCancelCountdown = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setArmAwayCountdown(null);
  }, []);

  const executeArmAway = useCallback(async () => {
    if (!alarmEntity) return;
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setArmAwayCountdown(null);
    try {
      updateEntityState(alarmEntity.entity_id, 'armed_away');
      await callHAService('alarm_control_panel', 'alarm_arm_away', {}, { entity_id: alarmEntity.entity_id });
    } catch (err) {
      console.error('Failed to arm away:', err);
    }
  }, [alarmEntity, callHAService, updateEntityState]);

  const handleConfirmArmAway = useCallback((delaySeconds: number) => {
    setIsArmAwayModalOpen(false);
    if (!alarmEntity) return;

    if (delaySeconds <= 0) {
      executeArmAway();
      return;
    }

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    setArmAwayCountdown(delaySeconds);

    countdownTimerRef.current = setInterval(() => {
      setArmAwayCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          executeArmAway();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [alarmEntity, executeArmAway]);

  const handleSetAlarmMode = async (
    mode: 'disarmed' | 'armed_home' | 'armed_away' | 'armed_night',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (!alarmEntity) return;

    if (armAwayCountdown !== null) {
      handleCancelCountdown();
      if (mode === 'disarmed') return;
    }

    if (mode === 'armed_away') {
      if (alarmEntity.state === 'armed_away') {
        setDrawerOpen('alarm');
        return;
      }
      setIsArmAwayModalOpen(true);
      return;
    }

    if (mode === 'disarmed') {
      const isCurrentlyArmed = alarmEntity.state && alarmEntity.state !== 'disarmed';
      const requiresCode = Boolean(alarmEntity.attributes?.code_format);
      if (isCurrentlyArmed && requiresCode) {
        setDrawerOpen('alarm');
        return;
      }
      try {
        updateEntityState(alarmEntity.entity_id, 'disarmed');
        await callHAService('alarm_control_panel', 'alarm_disarm', {}, { entity_id: alarmEntity.entity_id });
      } catch {
        setDrawerOpen('alarm');
      }
      return;
    }

    const serviceName =
      mode === 'armed_home' ? 'alarm_arm_home' : 'alarm_arm_night';

    try {
      updateEntityState(alarmEntity.entity_id, mode);
      await callHAService('alarm_control_panel', serviceName, {}, { entity_id: alarmEntity.entity_id });
    } catch (err) {
      console.error('Failed to set alarm mode:', err);
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
        return { label: 'Disarmed', bg: 'bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400' };
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

          {/* 1.6 ALARM BADGE (ONLY WHEN ARMED) */}
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

          {/* 1.7 DOORS BADGE (ONLY WHEN OPEN) */}
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

          {/* 1.8 WINDOWS BADGE (ONLY WHEN OPEN) */}
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

          {/* 1.9 MOTION BADGE (ONLY WHEN DETECTED) */}
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

          {/* 1.10 LEAKAGE BADGE (ONLY WHEN DETECTED) */}
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

          {/* 1.11 SMOKE BADGE (ONLY WHEN DETECTED) */}
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

          {/* 1.12 AUDIO / MEDIA BADGE (ALWAYS AT THE END - CAN BE LONG & OCCUPY FULL ROW) */}
          {isPlayingMedia && (
            <button
              type="button"
              onClick={() => setDrawerOpen('media')}
              className={`h-8.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs max-w-full shrink-0 ${
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
              <span className="truncate max-w-[260px] sm:max-w-xs md:max-w-md">
                {playingMediaEntities.length === 1
                  ? (playingSongTitle || 'Playing Audio')
                  : `${playingMediaEntities.length} Playing`}
              </span>
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
      ) : null}

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
                        const friendlyName = activeWeather?.name || activeWeather?.attributes?.friendly_name || 'Weather';

                        if (is2x) {
                          return (
                            <div className={tileBaseClass(false, '', false, true)}>
                              <AnimatedWeatherBackdrop condition={weatherCondition} isNight={isNight} darkMode={darkMode} />
                              <div className={`absolute inset-0 pointer-events-none rounded-3xl ${darkMode ? 'bg-black/25' : 'bg-white/10'}`} />

                              <div className="relative z-10 flex items-stretch h-full gap-2.5 sm:gap-3.5">
                                {/* Left Column: Current Weather Hero */}
                                <div className="flex-1 flex flex-col justify-between min-w-0 pr-1">
                                  {/* Top: Icon + Location/Title + Condition Badge */}
                                  <div className="flex items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-8 h-8 rounded-xl bg-white/70 dark:bg-black/30 backdrop-blur-md border border-white/80 dark:border-white/10 flex items-center justify-center shadow-xs shrink-0">
                                        {weatherCondInfo.icon}
                                      </div>
                                      <div className="min-w-0">
                                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                          {friendlyName}
                                        </h4>
                                        <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium capitalize truncate">
                                          {weatherCondition.replace(/_/g, ' ')}
                                        </p>
                                      </div>
                                    </div>
                                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full backdrop-blur-md border shadow-xs shrink-0 ${weatherCondInfo.badgeBg}`}>
                                      {weatherCondInfo.name}
                                    </span>
                                  </div>

                                  {/* Middle: Big Temp + High / Low */}
                                  <div className="flex items-baseline gap-2.5 my-auto">
                                    <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono tracking-tight leading-none">
                                      {Math.round(currentTemp)}{tempUnit}
                                    </span>
                                    <div className="flex flex-col text-[10px] font-mono font-bold leading-tight">
                                      <span className="text-amber-500 flex items-center gap-0.5">
                                        <ArrowUp size={10} weight="bold" />{Math.round(weatherHigh)}°
                                      </span>
                                      <span className="text-sky-500 flex items-center gap-0.5">
                                        <ArrowDown size={10} weight="bold" />{Math.round(weatherLow)}°
                                      </span>
                                    </div>
                                  </div>

                                  {/* Bottom: Live Telemetry Row */}
                                  <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] font-bold text-slate-700 dark:text-slate-200">
                                    <span className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-xs border border-white/30 dark:border-white/10 shrink-0">
                                      <Drop size={11} weight="fill" className="text-sky-400 shrink-0" />
                                      <span>{humidity}%</span>
                                    </span>
                                    {typeof windSpeed === 'number' && (
                                      <span className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-xs border border-white/30 dark:border-white/10 truncate">
                                        <Wind size={11} weight="bold" className="text-teal-400 shrink-0" />
                                        <span className="truncate">{Math.round(windSpeed)} {windUnit}</span>
                                      </span>
                                    )}
                                    {typeof precip === 'number' && precip > 0 && (
                                      <span className="hidden sm:flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-xs border border-white/30 dark:border-white/10 shrink-0">
                                        <span>{precip}mm</span>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Vertical Divider */}
                                <div className="w-px bg-black/5 dark:bg-white/10 my-0.5 shrink-0" />

                                {/* Right Column: 3-Day Forecast Strip */}
                                <div className="flex-[1.1] sm:flex-[1.2] flex flex-col justify-between min-w-0 pl-1">
                                  {/* Header: Forecast label + CaretRight */}
                                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider">
                                      3-Day Forecast
                                    </span>
                                    <div className="flex items-center gap-0.5 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                      <CaretRight size={13} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                  </div>

                                  {/* 3 mini forecast cards (Next 3 Days: Tomorrow onwards) */}
                                  <div className="flex items-center gap-1 sm:gap-1.5 w-full my-auto">
                                    {dailyForecast.slice(1, 4).map((f, i) => {
                                      const dayLabel = i === 0 
                                        ? 'Tomorrow' 
                                        : new Date(f.datetime).toLocaleDateString(undefined, { weekday: 'short' });
                                      const dayIcon = getWeatherConditionInfo(f.condition, false, 18).icon;
                                      const high = Math.round(f.temperature);
                                      const low = Math.round(f.templow);

                                      return (
                                        <div
                                          key={f.datetime || i}
                                          className="flex-1 min-w-0 py-1.5 px-0.5 sm:px-1 rounded-2xl bg-white/40 dark:bg-white/[0.06] hover:bg-white/60 dark:hover:bg-white/[0.1] backdrop-blur-md border border-white/40 dark:border-white/10 flex flex-col items-center justify-between text-center transition-all shadow-2xs group/card"
                                        >
                                          <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-tight truncate w-full">
                                            {i === 0 ? (
                                              <>
                                                <span className="hidden sm:inline">Tomorrow</span>
                                                <span className="sm:hidden">Tmw</span>
                                              </>
                                            ) : (
                                              dayLabel
                                            )}
                                          </span>
                                          <div className="my-1 scale-90 sm:scale-100 flex items-center justify-center">
                                            {dayIcon}
                                          </div>
                                          <div className="flex items-center gap-0.5 sm:gap-1 font-mono text-[10px] sm:text-[11px] leading-tight font-bold">
                                            <span className="text-slate-900 dark:text-white font-black">{high}°</span>
                                            <span className="text-slate-400 dark:text-slate-500 text-[9px] sm:text-[10px]">{low}°</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Mini summary footer */}
                                  <div className="text-[9px] sm:text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate flex items-center justify-between">
                                    <span>{dailyForecast.length > 3 ? '7-day outlook' : 'Daily forecast'}</span>
                                    <span className="text-sky-500 dark:text-sky-400 font-bold">Details →</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // 1x Compact mode
                        return (
                          <div className={tileBaseClass(false, '', false, false)}>
                            <AnimatedWeatherBackdrop condition={weatherCondition} isNight={isNight} darkMode={darkMode} />
                            <div className={`absolute inset-0 pointer-events-none rounded-3xl ${darkMode ? 'bg-black/20' : 'bg-white/10'}`} />

                            {/* Top row: Icon + Condition Badge */}
                            <div className="flex items-center justify-between relative z-10">
                              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/70 dark:bg-black/30 backdrop-blur-md border border-white/80 dark:border-white/10 flex items-center justify-center shadow-xs">
                                {weatherCondInfo.icon}
                              </div>
                              <span className={`text-[9px] sm:text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full backdrop-blur-md border shadow-xs ${weatherCondInfo.badgeBg}`}>
                                {weatherCondInfo.name}
                              </span>
                            </div>

                            {/* Center: Temp + High/Low pill */}
                            <div className="relative z-10 my-0.5 flex items-baseline justify-between">
                              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight leading-none">
                                {Math.round(currentTemp)}{tempUnit}
                              </span>
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm border border-black/5 dark:border-white/10 text-[11px] font-mono font-bold">
                                <span className="text-amber-500 flex items-center gap-0.5">
                                  <ArrowUp size={10} weight="bold" />{Math.round(weatherHigh)}°
                                </span>
                                <span className="opacity-30">|</span>
                                <span className="text-sky-500 flex items-center gap-0.5">
                                  <ArrowDown size={10} weight="bold" />{Math.round(weatherLow)}°
                                </span>
                              </div>
                            </div>

                            {/* Bottom: Location & telemetry summary */}
                            <div className="relative z-10">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {friendlyName}
                              </div>
                              <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate flex items-center justify-between mt-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="flex items-center gap-1">
                                    <Drop size={11} weight="fill" className="text-sky-400 shrink-0" />
                                    {humidity}%
                                  </span>
                                  {typeof windSpeed === 'number' && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center gap-1">
                                        <Wind size={11} weight="bold" className="text-teal-400 shrink-0" />
                                        {Math.round(windSpeed)} {windUnit}
                                      </span>
                                    </>
                                  )}
                                </div>
                                <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-400 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all shrink-0" />
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
                        const mediaArt = getHAImageUrl(activeMedia?.attributes?.entity_picture || activeMedia?.attributes?.media_image, serverUrl);
                        const volumePct = typeof activeMedia?.attributes?.volume_level === 'number'
                          ? Math.round(activeMedia.attributes.volume_level * 100)
                          : undefined;
                        const trackTitle = activeMedia?.attributes?.media_title || (isPlayingMedia ? 'Playing Media' : 'No Media Playing');
                        const trackArtist = activeMedia?.attributes?.media_artist || (activeMedia ? activeMedia.name : 'Audio Idle');
                        const appOrAlbum = activeMedia?.attributes?.app_name || activeMedia?.attributes?.media_album_name || (isPlayingMedia ? 'Active Playback' : 'Tap to open player');

                        const hasActiveMedia = isPlayingMedia || !!mediaArt;
                        const dynamicCardStyle: React.CSSProperties = hasActiveMedia
                          ? {
                              borderColor: mediaPalette.badgeBorder,
                              boxShadow: `0 10px 25px -5px ${mediaPalette.glowSubtle}, 4px 6px 12px rgba(0, 0, 0, 0.15)`,
                              background: mediaArt
                                ? (darkMode ? 'rgba(10, 15, 29, 0.65)' : 'rgba(255, 255, 255, 0.78)')
                                : (darkMode
                                    ? `linear-gradient(135deg, ${mediaPalette.glowSubtle} 0%, rgba(15, 23, 42, 0.85) 100%)`
                                    : `linear-gradient(135deg, ${mediaPalette.glowSubtle} 0%, rgba(255, 255, 255, 0.88) 100%)`),
                            }
                          : {};

                        if (is2x) {
                          return (
                            <div
                              className={tileBaseClass(
                                hasActiveMedia,
                                darkMode ? 'text-white' : 'text-slate-900',
                                false,
                                true
                              )}
                              style={dynamicCardStyle}
                            >
                              {/* Dynamic Blurred Album Artwork Background */}
                              {mediaArt && (
                                <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none z-0">
                                  <img
                                    src={mediaArt}
                                    alt=""
                                    className="w-full h-full object-cover scale-125 filter blur-2xl opacity-40 dark:opacity-45 transition-opacity duration-700"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/55 to-slate-950/35 dark:block hidden" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-white/92 via-white/75 to-white/50 dark:hidden block" />
                                </div>
                              )}

                              {/* Ambient Artwork Glow */}
                              <div
                                className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full blur-3xl opacity-35 dark:opacity-30 pointer-events-none transition-all duration-700"
                                style={{ backgroundColor: mediaPalette.primary }}
                              />

                              {/* Top Bar: Now Playing Equalizer Badge & Caret aligned to the right */}
                              <div className="flex items-center justify-end gap-2 relative z-10 shrink-0">
                                {isPlayingMedia && (
                                  <div
                                    className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider transition-colors"
                                    style={{
                                      backgroundColor: mediaPalette.badgeBg,
                                      borderColor: mediaPalette.badgeBorder,
                                      color: mediaPalette.badgeText,
                                    }}
                                  >
                                    <div className="flex items-end gap-0.5 h-2.5">
                                      <span className="w-0.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: mediaPalette.primary }} />
                                      <span className="w-0.5 h-1.5 rounded-full animate-pulse [animation-delay:150ms]" style={{ backgroundColor: mediaPalette.primary }} />
                                      <span className="w-0.5 h-2 rounded-full animate-pulse [animation-delay:300ms]" style={{ backgroundColor: mediaPalette.primary }} />
                                    </div>
                                    <span>Now Playing</span>
                                  </div>
                                )}

                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center transition-all group-hover:translate-x-0.5 shrink-0"
                                  style={{ color: hasActiveMedia ? (darkMode ? mediaPalette.light : mediaPalette.badgeText) : undefined }}
                                >
                                  <CaretRight size={14} weight="bold" />
                                </div>
                              </div>

                              {/* Center Hero: Artwork, Track Info & Full Transport Controls (brought up to optimize space) */}
                              <div className="relative z-10 flex items-center justify-between gap-3.5 w-full -mt-2 sm:-mt-2.5">
                                {/* Left: Artwork + Track details */}
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div
                                    className="relative w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl overflow-hidden shadow-lg border shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-300"
                                    style={{ borderColor: hasActiveMedia ? mediaPalette.badgeBorder : undefined }}
                                  >
                                    {mediaArt ? (
                                      <img
                                        src={mediaArt}
                                        alt="Album artwork"
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div
                                        className="w-full h-full flex items-center justify-center"
                                        style={{
                                          backgroundColor: hasActiveMedia ? mediaPalette.badgeBg : (darkMode ? 'rgba(147, 51, 234, 0.2)' : 'rgba(243, 232, 255, 1)'),
                                          color: hasActiveMedia ? mediaPalette.primary : (darkMode ? '#d8b4fe' : '#9333ea'),
                                        }}
                                      >
                                        <MusicNotes size={28} weight="duotone" />
                                      </div>
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate leading-tight">
                                      {trackTitle}
                                    </h4>
                                    <p
                                      className="text-xs sm:text-sm font-bold truncate mt-1 transition-colors leading-tight"
                                      style={{ color: hasActiveMedia ? (darkMode ? mediaPalette.light : mediaPalette.badgeText) : undefined }}
                                    >
                                      {trackArtist}
                                    </p>
                                  </div>
                                </div>

                                {/* Right: Transport Control Deck */}
                                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 relative z-20" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={handlePreviousTrack}
                                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-90 border shadow-2xs text-slate-700 dark:text-slate-200"
                                    style={{
                                      backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.7)',
                                      borderColor: hasActiveMedia ? mediaPalette.badgeBorder : undefined,
                                    }}
                                    title="Previous Track"
                                  >
                                    <SkipBack size={15} weight="fill" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={handleTogglePlayPause}
                                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-95 shrink-0 text-white font-black"
                                    style={{
                                      backgroundColor: hasActiveMedia ? mediaPalette.primary : '#9333ea',
                                      boxShadow: hasActiveMedia ? `0 8px 20px -4px ${mediaPalette.glow}` : '0 8px 20px -4px rgba(147, 51, 234, 0.4)',
                                    }}
                                    title={isPlayingMedia ? 'Pause Audio' : 'Play Audio'}
                                  >
                                    {isPlayingMedia ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" className="ml-0.5" />}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={handleNextTrack}
                                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-90 border shadow-2xs text-slate-700 dark:text-slate-200"
                                    style={{
                                      backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.7)',
                                      borderColor: hasActiveMedia ? mediaPalette.badgeBorder : undefined,
                                    }}
                                    title="Next Track"
                                  >
                                    <SkipForward size={15} weight="fill" />
                                  </button>
                                </div>
                              </div>

                              {/* Bottom Row: Active Player Name & Bigger Volume */}
                              <div className="relative z-10 flex items-center justify-between text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-1.5 truncate">
                                  <SpeakerHigh
                                    size={13}
                                    weight="bold"
                                    className="shrink-0"
                                    style={{ color: hasActiveMedia ? mediaPalette.primary : undefined }}
                                  />
                                  <span className="truncate font-semibold text-slate-700 dark:text-slate-300">
                                    {activeMedia?.name || 'Media Player'}
                                  </span>
                                </div>
                                {volumePct !== undefined && (
                                  <div
                                    className="flex items-center gap-1.5 font-mono text-xs sm:text-sm font-black tracking-tight shrink-0 ml-2"
                                    style={{ color: hasActiveMedia ? (darkMode ? mediaPalette.light : mediaPalette.badgeText) : undefined }}
                                  >
                                    <SpeakerHigh size={14} weight="bold" />
                                    <span>{volumePct}%</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // 1x Compact Mode
                        return (
                          <div
                            className={tileBaseClass(
                              hasActiveMedia,
                              darkMode ? 'text-white' : 'text-slate-900',
                              false,
                              false
                            )}
                            style={dynamicCardStyle}
                          >
                            {/* Dynamic Blurred Album Artwork Background */}
                            {mediaArt && (
                              <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none z-0">
                                <img
                                  src={mediaArt}
                                  alt=""
                                  className="w-full h-full object-cover scale-125 filter blur-2xl opacity-40 dark:opacity-45 transition-opacity duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/55 to-slate-950/35 dark:block hidden" />
                                <div className="absolute inset-0 bg-gradient-to-t from-white/92 via-white/75 to-white/50 dark:hidden block" />
                              </div>
                            )}

                            {/* Ambient Artwork Glow */}
                            <div
                              className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full blur-2xl opacity-35 dark:opacity-25 pointer-events-none transition-all duration-700"
                              style={{ backgroundColor: mediaPalette.primary }}
                            />

                            {/* Top Row: Artwork + Play/Pause Button */}
                            <div className="flex items-center justify-between relative z-10">
                              <div
                                className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl overflow-hidden shadow-xs border shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform"
                                style={{ borderColor: hasActiveMedia ? mediaPalette.badgeBorder : undefined }}
                              >
                                {mediaArt ? (
                                  <img
                                    src={mediaArt}
                                    alt="Album artwork"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div
                                    className="w-full h-full flex items-center justify-center"
                                    style={{
                                      backgroundColor: hasActiveMedia ? mediaPalette.badgeBg : (darkMode ? 'rgba(147, 51, 234, 0.2)' : 'rgba(243, 232, 255, 1)'),
                                      color: hasActiveMedia ? mediaPalette.primary : (darkMode ? '#d8b4fe' : '#9333ea'),
                                    }}
                                  >
                                    <MusicNotes size={20} weight="duotone" />
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                {isPlayingMedia && (
                                  <div
                                    className="flex items-end gap-0.5 h-2.5 px-1.5 py-0.5 rounded-full border"
                                    style={{
                                      backgroundColor: mediaPalette.badgeBg,
                                      borderColor: mediaPalette.badgeBorder,
                                    }}
                                  >
                                    <span className="w-0.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: mediaPalette.primary }} />
                                    <span className="w-0.5 h-1.5 rounded-full animate-pulse [animation-delay:150ms]" style={{ backgroundColor: mediaPalette.primary }} />
                                    <span className="w-0.5 h-2 rounded-full animate-pulse [animation-delay:300ms]" style={{ backgroundColor: mediaPalette.primary }} />
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={handleTogglePlayPause}
                                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 text-white font-black"
                                  style={{
                                    backgroundColor: hasActiveMedia ? mediaPalette.primary : '#9333ea',
                                    boxShadow: hasActiveMedia ? `0 6px 16px -3px ${mediaPalette.glow}` : '0 6px 16px -3px rgba(147, 51, 234, 0.35)',
                                  }}
                                  title={isPlayingMedia ? 'Pause Audio' : 'Play Audio'}
                                >
                                  {isPlayingMedia ? <Pause size={15} weight="fill" /> : <Play size={15} weight="fill" className="ml-0.5" />}
                                </button>
                              </div>
                            </div>

                            {/* Middle: Title & Artist */}
                            <div className="relative z-10 my-0.5 min-w-0">
                              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                                {trackTitle}
                              </h4>
                              <p
                                className="text-[11px] sm:text-xs font-bold truncate mt-0.5 transition-colors"
                                style={{ color: hasActiveMedia ? (darkMode ? mediaPalette.light : mediaPalette.badgeText) : undefined }}
                              >
                                {trackArtist}
                              </p>
                            </div>

                            {/* Bottom: Device Name + Caret */}
                            <div className="relative z-10">
                              <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
                                <div className="flex items-center gap-1 truncate">
                                  <SpeakerHigh size={12} weight="bold" className="shrink-0" style={{ color: hasActiveMedia ? mediaPalette.primary : undefined }} />
                                  <span className="truncate">{activeMedia?.name || 'Media Player'}</span>
                                </div>
                                <CaretRight
                                  size={13}
                                  weight="bold"
                                  className="text-slate-400 dark:text-slate-500 group-hover:translate-x-0.5 transition-all shrink-0"
                                  style={{ color: hasActiveMedia ? (darkMode ? mediaPalette.light : mediaPalette.badgeText) : undefined }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      }

                      case 'alarm': {
                        const currentState = alarmEntity?.state || 'disarmed';
                        const isArmed = currentState !== 'disarmed';
                        const alarmColorClass =
                          currentState === 'armed_away'
                            ? (darkMode ? 'bg-rose-500/20 text-white border-rose-500/30' : 'bg-rose-500/15 text-slate-900 border-rose-300/60')
                            : currentState === 'armed_night'
                            ? (darkMode ? 'bg-indigo-500/20 text-white border-indigo-500/30' : 'bg-indigo-500/15 text-slate-900 border-indigo-300/60')
                            : currentState === 'armed_home'
                            ? (darkMode ? 'bg-emerald-500/20 text-white border-emerald-500/30' : 'bg-emerald-500/15 text-slate-900 border-emerald-300/60')
                            : '';

                        if (is2x) {
                          return (
                            <div
                              className={tileBaseClass(
                                isArmed,
                                alarmColorClass,
                                false,
                                true
                              )}
                            >
                              {/* Top row: Security identity + Right Chevron */}
                              <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${alarmDetails.bg} ${alarmDetails.text}`}>
                                    {currentState === 'armed_away' ? (
                                      <ShieldWarning size={18} weight="duotone" />
                                    ) : currentState === 'armed_night' ? (
                                      <Moon size={18} weight="duotone" />
                                    ) : currentState === 'armed_home' ? (
                                      <ShieldCheck size={18} weight="duotone" />
                                    ) : (
                                      <LockOpen size={18} weight="duotone" />
                                    )}
                                  </div>
                                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                    {alarmEntity?.name || alarmEntity?.attributes?.friendly_name || 'Security Guard'}
                                  </span>
                                </div>

                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors shrink-0">
                                  <CaretRight size={16} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
                                </div>
                              </div>

                              {/* Action Row: Exit delay countdown or @kokonutui/toolbar with @kokonutui/hold-button */}
                              {armAwayCountdown !== null && armAwayCountdown > 0 ? (
                                <div className="flex items-center justify-between bg-rose-500/15 border border-rose-500/30 rounded-2xl p-2 sm:p-2.5 my-auto z-10 animate-fadeIn">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-rose-500 text-white font-mono font-black text-sm shadow-md shadow-rose-500/30 shrink-0">
                                      <span className="relative z-10">{armAwayCountdown}s</span>
                                      <span className="absolute inset-0 rounded-xl bg-rose-400 animate-ping opacity-30" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-xs font-bold text-rose-600 dark:text-rose-300 truncate">
                                        Exit Delay • Arming Away
                                      </div>
                                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                        Please exit and close all doors
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        executeArmAway();
                                      }}
                                      className="px-2.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
                                    >
                                      Arm Now
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelCountdown}
                                      className="px-2.5 py-1.5 rounded-xl bg-white/60 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all border border-black/5 dark:border-white/10 cursor-pointer active:scale-95"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative z-10 my-auto pt-1 w-full" onClick={(e) => e.stopPropagation()}>
                                  <Toolbar
                                    items={[
                                      { id: 'disarmed', title: 'Disarm', icon: LockOpen, color: 'amber' },
                                      { id: 'armed_home', title: 'Home', icon: HouseLine, color: 'emerald' },
                                      { id: 'armed_away', title: 'Away', icon: ShieldWarning, color: 'rose', isHold: true, holdDuration: 1000 },
                                      { id: 'armed_night', title: 'Night', icon: Moon, color: 'indigo' },
                                    ]}
                                    selected={currentState}
                                    onSelect={(mode) => {
                                      handleSetAlarmMode(mode as any, { stopPropagation: () => {} } as any);
                                    }}
                                    onHoldComplete={() => {
                                      setIsArmAwayModalOpen(true);
                                    }}
                                    darkMode={darkMode}
                                    className="w-full"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        }

                        // 1x Compact mode
                        return (
                          <div
                            className={tileBaseClass(
                              isArmed,
                              alarmColorClass,
                              false,
                              false
                            )}
                          >
                            {/* Top row: Security identity + Right Chevron */}
                            <div className="flex items-center justify-between relative z-10">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${alarmDetails.bg} ${alarmDetails.text}`}>
                                  {currentState === 'armed_away' ? (
                                    <ShieldWarning size={16} weight="duotone" />
                                  ) : currentState === 'armed_night' ? (
                                    <Moon size={16} weight="duotone" />
                                  ) : currentState === 'armed_home' ? (
                                    <ShieldCheck size={16} weight="duotone" />
                                  ) : (
                                    <LockOpen size={16} weight="duotone" />
                                  )}
                                </div>
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {alarmEntity?.name || alarmEntity?.attributes?.friendly_name || 'Security Guard'}
                                </span>
                              </div>

                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors shrink-0">
                                <CaretRight size={14} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </div>

                            {/* Action Row: Exit delay countdown or Toolbar */}
                            {armAwayCountdown !== null && armAwayCountdown > 0 ? (
                              <div className="flex items-center justify-between bg-rose-500/15 border border-rose-500/30 rounded-2xl p-1.5 my-auto z-10 animate-fadeIn">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-rose-500 text-white font-mono font-black text-xs shadow-md shadow-rose-500/30 shrink-0">
                                    <span className="relative z-10">{armAwayCountdown}s</span>
                                    <span className="absolute inset-0 rounded-lg bg-rose-400 animate-ping opacity-30" />
                                  </div>
                                  <div className="text-[10px] font-bold text-rose-600 dark:text-rose-300 truncate">
                                    Exit Delay
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleCancelCountdown}
                                  className="px-2 py-1 rounded-lg bg-white/60 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 text-[10px] font-bold transition-all border border-black/5 dark:border-white/10 cursor-pointer active:scale-95 shrink-0"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="relative z-10 my-auto w-full" onClick={(e) => e.stopPropagation()}>
                                <Toolbar
                                  items={[
                                    { id: 'disarmed', title: 'Disarm', icon: LockOpen, color: 'amber' },
                                    { id: 'armed_home', title: 'Home', icon: HouseLine, color: 'emerald' },
                                    { id: 'armed_away', title: 'Away', icon: ShieldWarning, color: 'rose', isHold: true, holdDuration: 1000 },
                                    { id: 'armed_night', title: 'Night', icon: Moon, color: 'indigo' },
                                  ]}
                                  selected={currentState}
                                  onSelect={(mode) => {
                                    handleSetAlarmMode(mode as any, { stopPropagation: () => {} } as any);
                                  }}
                                  onHoldComplete={() => {
                                    setIsArmAwayModalOpen(true);
                                  }}
                                  darkMode={darkMode}
                                  compact={true}
                                  className="w-full"
                                />
                              </div>
                            )}
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

        {isArmAwayModalOpen && (
          <ArmAwayConfirmModal
            isOpen={isArmAwayModalOpen}
            onClose={() => setIsArmAwayModalOpen(false)}
            onConfirm={handleConfirmArmAway}
            alarmName={alarmEntity?.name || alarmEntity?.attributes?.friendly_name || 'Security Guard'}
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
