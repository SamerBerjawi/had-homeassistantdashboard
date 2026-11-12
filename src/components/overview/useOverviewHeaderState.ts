/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Lightbulb, ToggleRight, Door, ShieldCheck, MusicNotes, Broom, Thermometer, Lightning, SquaresFour, VideoCamera } from '@phosphor-icons/react';
import { MouseSensor, TouchSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useUserConfig } from '../../contexts/ConfigContext';
import { useEditMode } from '../../contexts/EditModeContext';
import { OverviewTileVisibilityMode } from '../../types/userConfig';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { useShallow } from 'zustand/react/shallow';
import { ResolvedEntity } from '../../types';
import { getHAImageUrl } from '../../lib/utils';
import { getWeatherConditionInfo } from '../weather/weatherIcons';
import { getDailyForecast, getHourlyForecast, generateFallbackHourlyForecast } from '../../lib/weatherForecast';
import { useAlbumArtColor } from '../../hooks/useAlbumArtColor';
import { useEnergyData } from '../../hooks/useEnergyData';
import { discoverVacuumDevices } from '../../services/vacuumDiscovery';
import { SectionTabItem } from '../common/AdaptiveSectionTabs';
import { classifyOverviewEntities, resolvePersonZoneDetails } from '../../services/overview/entityGroups';
import {
  deriveWeatherHighLow, deriveWeatherReadings, getAlarmBadgeDetailsFor, hasAnyActiveOverviewBadge,
  isAlarmArmedState, resolveActiveWeather, summarizePlayingMedia, summarizeVacuums
} from '../../services/overview/headerSummary';
import {
  applyTileReorder, buildCurrentTileOrder, buildOverviewTabTileMap, computeAddWidget, computeTileVisibilityMode,
  filterDisplayTiles, getNextTileSize, toggleInSet, withCamerasTileSize1x, withHiddenFromAllTiles, withHiddenTiles,
  withHideBadgesToggled, withResetLayout, withTileOrderAndHidden, withTileSize, withTileVisibility
} from '../../services/overview/tileLayout';
import { buildOverviewTabs, getTileBaseClass } from '../../services/overview/overviewTabs';
import { useCameraCarousel } from './useCameraCarousel';

const OVERVIEW_TAB_ICONS = {
  all: SquaresFour,
  lights: Lightbulb,
  switches: ToggleRight,
  energy: Lightning,
  security: ShieldCheck,
  cameras: VideoCamera,
  climate: Thermometer,
  openings: Door,
  media: MusicNotes,
  vacuums: Broom
};

/**
 * All state, derived data and handlers behind the Overview header. OverviewHeader renders the
 * layout, and each tile body in ./tiles reads what it needs from this bag.
 */
export function useOverviewHeaderState(darkMode: boolean) {
  const { 
    domainGroups, 
    updateEntityState,
    callHAService,
    serverUrl,
    selectedAlarmEntityId,
    selectedWeatherEntityId,
    resolvedEntities,
    states,
    entityRegistry,
    devices,
    areasMap
  } = useAutoLayoutStore(useShallow((s) => ({
    domainGroups: s.domainGroups,
    updateEntityState: s.updateEntityState,
    callHAService: s.callHAService,
    serverUrl: s.serverUrl,
    selectedAlarmEntityId: s.selectedAlarmEntityId,
    selectedWeatherEntityId: s.selectedWeatherEntityId,
    resolvedEntities: s.resolvedEntities,
    states: s.states,
    entityRegistry: s.entityRegistry,
    devices: s.devices,
    areasMap: s.areasMap
  })));

  const { config, updateConfig, flushPendingSave, setDragActive } = useUserConfig();

  // Camera preview and stream modal state
  const [selectedCameraForModal, setSelectedCameraForModal] = useState<ResolvedEntity | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);

  // Active Right Sidebar State
  const [drawerOpen, setDrawerOpen] = useState<
    'users' | 'lights' | 'switches' | 'fans' | 'doors' | 'windows' | 'alarm' | 'media' | 'sensors' | 'vacuums' | 'weather' | null
  >(null);
  const [isWidgetDrawerOpen, setIsWidgetDrawerOpen] = useState<boolean>(false);

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

  // Live Energy & Power Telemetry
  const energyData = useEnergyData();
  const {
    realtime: energyRealtime,
    totals: energyTotals,
    model: energyModel,
    hasSolar: energyHasSolar,
    hasGrid: energyHasGrid,
    hasBattery: energyHasBattery
  } = energyData;

  // alarmEntity for keypad
  const alarmEntities: ResolvedEntity[] = domainGroups['alarm_control_panel'] || [];
  const alarmEntity: ResolvedEntity | undefined =
    alarmEntities.find((a) => a.entity_id === selectedAlarmEntityId) ||
    alarmEntities[0];

  // Classify all binary sensors and devices
  const {
    doorSensors, windowSensors, motionSensors, leakSensors, smokeSensors, otherContactSensors,
    activeMedia, playingMediaEntities,
    userEntities, lightEntities, switchEntities, fanEntities, mediaEntities, vacuumEntities, weatherEntities, surveillanceCameras,
    homeUsers, onLights, onSwitches, activeFans, activeVacuums, openDoors, openWindows, activeMotion, activeLeaks, activeSmoke
  } = useMemo(
    () => classifyOverviewEntities(domainGroups, resolvedEntities, config.cameras?.sources),
    [domainGroups, config.cameras?.sources]
  );

  // Gesture and navigation helpers for multi-camera swipeable carousel tile
  const {
    activeCamerasIndex, setActiveCamerasIndex, touchStartXRef, touchStartYRef, pointerStartXRef, justSwipedRef,
    handleNextCamera, handlePrevCamera, handleTouchStart, handleTouchEnd, handleMouseDown, handleMouseUp
  } = useCameraCarousel(surveillanceCameras.length);

  // Helper to resolve person zone presence (Home, named zone, or away)
  const getPersonZoneDetails = useCallback(
    (user: ResolvedEntity) => resolvePersonZoneDetails(user, resolvedZones),
    [resolvedZones]
  );

  // Users in a known zone (either Home or a specific known HA zone)
  const activeZoneUsers = useMemo(() => {
    return userEntities.filter((u) => getPersonZoneDetails(u).isInKnownZone);
  }, [userEntities, getPersonZoneDetails]);

  // Active Weather Resolution
  const activeWeather = useMemo(() => {
    return resolveActiveWeather(weatherEntities, selectedWeatherEntityId);
  }, [weatherEntities, selectedWeatherEntityId]);

  const { weatherCondition, isNight, currentTemp, tempUnit, humidity } = deriveWeatherReadings(activeWeather, sunState);
  const weatherCondInfo = getWeatherConditionInfo(weatherCondition, isNight, 20);
  const dailyForecast = useMemo(() => {
    return getDailyForecast(activeWeather);
  }, [activeWeather]);
  const hourlyForecast = useMemo(() => {
    const extracted = getHourlyForecast(activeWeather);
    if (extracted && extracted.length > 0) return extracted;
    return generateFallbackHourlyForecast(currentTemp, weatherCondition);
  }, [activeWeather, currentTemp, weatherCondition]);
  const todayForecast = dailyForecast[0];
  const { weatherHigh, weatherLow } = deriveWeatherHighLow(todayForecast, activeWeather, currentTemp);

  const isAlarmArmed = isAlarmArmedState(alarmEntity);
  const { isPlayingMedia, singlePlayingMedia, playingSongTitle } = summarizePlayingMedia(playingMediaEntities);

  const activeMediaArtUrl = useMemo(() => {
    return getHAImageUrl(activeMedia?.attributes?.entity_picture || activeMedia?.attributes?.media_image, serverUrl);
  }, [activeMedia, serverUrl]);

  const mediaPalette = useAlbumArtColor(activeMediaArtUrl, {
    title: activeMedia?.attributes?.media_title,
    artist: activeMedia?.attributes?.media_artist || activeMedia?.name,
    darkMode
  });

  const { vacuums: discoveredVacuums } = useMemo(() => {
    return discoverVacuumDevices(
      vacuumEntities,
      resolvedEntities,
      states,
      entityRegistry || [],
      devices || []
    );
  }, [vacuumEntities, resolvedEntities, states, entityRegistry, devices]);

  const { activeVacuumDevice, firstVacuum, isVacuumCleaning, vacuumBattery, isVacuumCharging } =
    summarizeVacuums(discoveredVacuums, vacuumEntities);

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

  const handleToggleSingleLight = async (e: React.MouseEvent, light: ResolvedEntity) => {
    e.stopPropagation();
    const isCurrentlyOn = light.state === 'on';
    const nextState = isCurrentlyOn ? 'off' : 'on';
    updateEntityState(light.entity_id, nextState);
    await callHAService(
      'light',
      nextState === 'on' ? 'turn_on' : 'turn_off',
      nextState === 'on' ? { brightness_pct: 80 } : {},
      { entity_id: light.entity_id }
    );
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
    const targetEntityId = activeVacuumDevice?.entityId || firstVacuum?.entity_id;
    if (!targetEntityId) return;

    if (activeVacuumDevice?.state === 'cleaning') {
      updateEntityState(targetEntityId, 'returning');
      await callHAService('vacuum', 'return_to_base', {}, { entity_id: targetEntityId });
    } else if (activeVacuumDevice?.state === 'paused') {
      updateEntityState(targetEntityId, 'cleaning');
      await callHAService('vacuum', 'start', {}, { entity_id: targetEntityId });
    } else {
      updateEntityState(targetEntityId, 'cleaning');
      await callHAService('vacuum', 'start', {}, { entity_id: targetEntityId });
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

  const getAlarmBadgeDetails = () => getAlarmBadgeDetailsFor(alarmEntity);

  const alarmDetails = getAlarmBadgeDetails();

  const hasAnyActiveBadge = hasAnyActiveOverviewBadge({
    activeZoneUsers, onLights, onSwitches, activeFans, isVacuumCleaning, isPlayingMedia, isAlarmArmed,
    openDoors, openWindows, activeMotion, activeLeaks, activeSmoke
  });

  const { isEditMode, setEditMode } = useEditMode();

  const overviewConfig = config.overview || {};
  const currentTileOrder = useMemo(
    () => buildCurrentTileOrder(overviewConfig.tileOrder, surveillanceCameras),
    [overviewConfig.tileOrder, surveillanceCameras]
  );

  // Ensure default camera tile size is 1x
  useEffect(() => {
    if (overviewConfig.tileSizes?.cameras === '2x') {
      updateConfig((prev) => withCamerasTileSize1x(prev));
    }
  }, []);

  const hiddenTilesSet = useMemo(() => {
    return new Set(overviewConfig.hiddenTiles || []);
  }, [overviewConfig.hiddenTiles]);

  const hiddenFromAllSet = useMemo(() => {
    return new Set(overviewConfig.hiddenFromAllTiles || []);
  }, [overviewConfig.hiddenFromAllTiles]);

  const tileSizes = useMemo(() => {
    return overviewConfig.tileSizes || {};
  }, [overviewConfig.tileSizes]);

  const hideBadges = overviewConfig.hideBadges ?? false;

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 5
    }
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 180,
      tolerance: 8
    }
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setDragActive?.(true);
  }, [setDragActive]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setDragActive?.(false);
  }, [setDragActive]);

  // Active Overview Category Filter Tab
  const [activeOverviewTab, setActiveOverviewTab] = useState<string>('all');

  // When entering edit mode, automatically switch to 'all' so user sees and arranges all tiles
  useEffect(() => {
    if (isEditMode) {
      setActiveOverviewTab('all');
    }
  }, [isEditMode]);

  // Tab to tile ID mapping
  const OVERVIEW_TAB_TILE_MAP: Record<string, string[]> = useMemo(
    () => buildOverviewTabTileMap(surveillanceCameras),
    [surveillanceCameras]
  );

  // Compute adaptive section tabs with real-time badges
  const overviewTabs: SectionTabItem[] = useMemo(() => {
    return buildOverviewTabs({
      icons: OVERVIEW_TAB_ICONS,
      onLights, onSwitches, switchEntities, openDoors, openWindows, activeMotion, activeLeaks, activeSmoke,
      energyTotals, activeFans, playingMediaEntities, vacuumEntities, activeVacuums, surveillanceCameras, isEditMode
    });
  }, [
    onLights.length,
    onSwitches.length,
    switchEntities.length,
    openDoors.length,
    openWindows.length,
    activeMotion.length,
    activeLeaks.length,
    activeSmoke.length,
    energyTotals,
    energyRealtime,
    activeFans.length,
    playingMediaEntities.length,
    vacuumEntities.length,
    activeVacuums.length,
    surveillanceCameras.length,
    isEditMode
  ]);

  const displayTiles = useMemo(() => {
    return filterDisplayTiles({
      currentTileOrder, switchEntities, vacuumEntities, surveillanceCameras, isEditMode,
      hiddenTilesSet, hiddenFromAllSet, activeOverviewTab, OVERVIEW_TAB_TILE_MAP
    });
  }, [currentTileOrder, switchEntities.length, vacuumEntities.length, surveillanceCameras.length, isEditMode, hiddenTilesSet, hiddenFromAllSet, activeOverviewTab, OVERVIEW_TAB_TILE_MAP]);

  const currentTileOrderRef = useRef(currentTileOrder);
  currentTileOrderRef.current = currentTileOrder;
  const displayTilesRef = useRef(displayTiles);
  displayTilesRef.current = displayTiles;

  const handleReorder = useCallback((newOrder: string[]) => {
    updateConfig((prev) => applyTileReorder(prev, currentTileOrderRef.current, newOrder));
  }, [updateConfig]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    setDragActive?.(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentDisplay = displayTilesRef.current;
    const oldIndex = currentDisplay.indexOf(String(active.id));
    const newIndex = currentDisplay.indexOf(String(over.id));

    if (oldIndex !== -1 && newIndex !== -1) {
      const newDisplayOrder = arrayMove(currentDisplay, oldIndex, newIndex);
      handleReorder(newDisplayOrder);
    }
  }, [handleReorder, setDragActive]);

  const handleMoveTile = useCallback((tileId: string, direction: 'left' | 'right') => {
    const currentDisplay = displayTilesRef.current;
    const index = currentDisplay.indexOf(tileId);
    if (index === -1) return;
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentDisplay.length) return;
    const newOrder = arrayMove(currentDisplay, index, targetIndex);
    handleReorder(newOrder);
  }, [handleReorder]);

  const handleToggleSize = useCallback((tileId: string) => {
    const nextSize = getNextTileSize(tileSizes, tileId);
    updateConfig((prev) => withTileSize(prev, tileId, nextSize));
  }, [tileSizes, updateConfig]);

  const handleToggleHide = useCallback((tileId: string) => {
    const nextSet = toggleInSet(hiddenTilesSet, tileId);
    updateConfig((prev) => withHiddenTiles(prev, Array.from(nextSet)));
  }, [hiddenTilesSet, updateConfig]);

  const handleAddWidget = useCallback((widgetId: string) => {
    const { nextSet, nextOrder } = computeAddWidget(hiddenTilesSet, currentTileOrder, widgetId);
    updateConfig((prev) => withTileOrderAndHidden(prev, nextOrder, nextSet));
  }, [hiddenTilesSet, currentTileOrder, updateConfig]);

  const handleRemoveWidget = useCallback((widgetId: string) => {
    const nextSet = new Set(hiddenTilesSet);
    nextSet.add(widgetId);
    updateConfig((prev) => withHiddenTiles(prev, Array.from(nextSet)));
  }, [hiddenTilesSet, updateConfig]);

  const handleAddAllWidgets = useCallback(() => {
    updateConfig((prev) => withHiddenTiles(prev, []));
  }, [updateConfig]);

  const handleUnhideAll = useCallback(() => {
    updateConfig((prev) => withHiddenTiles(prev, []));
  }, [updateConfig]);

  const handleToggleBadges = useCallback(() => {
    updateConfig((prev) => withHideBadgesToggled(prev));
  }, [updateConfig]);

  const handleToggleHiddenFromAll = useCallback((tileId: string) => {
    const nextSet = toggleInSet(hiddenFromAllSet, tileId);
    updateConfig((prev) => withHiddenFromAllTiles(prev, Array.from(nextSet)));
  }, [hiddenFromAllSet, updateConfig]);

  const handleSetTileMode = useCallback((tileId: string, mode: OverviewTileVisibilityMode) => {
    const { nextOrder, nextHiddenTiles, nextHiddenFromAll } =
      computeTileVisibilityMode(hiddenTilesSet, hiddenFromAllSet, currentTileOrder, tileId, mode);
    updateConfig((prev) => withTileVisibility(prev, nextOrder, nextHiddenTiles, nextHiddenFromAll));
  }, [hiddenTilesSet, hiddenFromAllSet, currentTileOrder, updateConfig]);

  const handleResetLayout = useCallback(() => {
    updateConfig((prev) => withResetLayout(prev));
  }, [updateConfig]);

  const getTileClickHandler = useCallback((tileId: string) => {
    switch (tileId) {
      case 'weather':
      case 'weather_hourly':
        return () => setDrawerOpen('weather');
      case 'users': return () => openUsersDrawer();
      case 'lights': return () => setDrawerOpen('lights');
      case 'switches': return () => setDrawerOpen('switches');
      case 'vacuums': return () => setDrawerOpen('vacuums');
      case 'fans': return () => setDrawerOpen('fans');
      case 'media': return () => setDrawerOpen('media');
      case 'alarm': return () => setDrawerOpen('alarm');
      case 'cameras':
        return () => {
          if (justSwipedRef.current) return;
          if (surveillanceCameras.length > 0) {
            const cur = surveillanceCameras[activeCamerasIndex % surveillanceCameras.length] || surveillanceCameras[0];
            setSelectedCameraForModal(cur);
            setIsCameraModalOpen(true);
          } else {
            window.history.pushState({ tab: 'security' }, '', '/security');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        };
      case 'power_flow':
      case 'power_flow_chart':
      case 'energy_usage':
      case 'energy_usage_chart':
      case 'solar_production':
      case 'solar_production_chart':
        return () => {
          window.history.pushState({ tab: 'energy' }, '', '/energy');
          window.dispatchEvent(new PopStateEvent('popstate'));
        };
      case 'doors': return openDoorsDrawer;
      case 'windows': return openWindowsDrawer;
      case 'motion': return () => openSensorsDrawer('motion');
      case 'leak': return () => openSensorsDrawer('leak');
      case 'smoke': return () => openSensorsDrawer('smoke');
      default: {
        if (tileId.startsWith('camera:')) {
          const eid = tileId.replace('camera:', '');
          const cam = surveillanceCameras.find((c) => c.entity_id === eid);
          if (cam) {
            return () => {
              if (justSwipedRef.current) return;
              setSelectedCameraForModal(cam);
              setIsCameraModalOpen(true);
            };
          }
        }
        return () => {};
      }
    }
  }, [openDoorsDrawer, openWindowsDrawer, surveillanceCameras, activeCamerasIndex]);

  const tileBaseClass = (
    isActive: boolean,
    activeColorClass: string,
    isAlert: boolean = false,
    _is2x: boolean = false
  ) => getTileBaseClass(darkMode, isActive, activeColorClass, isAlert, _is2x);
  return {
    OVERVIEW_TAB_TILE_MAP, activeCamerasIndex, activeFans, activeId, activeLeaks, activeMedia,
    activeMediaArtUrl, activeMotion, activeOverviewTab, activeSmoke, activeVacuumDevice, activeVacuums,
    activeWeather, activeZoneUsers, alarmDetails, alarmEntities, alarmEntity, areasMap, armAwayCountdown,
    callHAService, config, countdownTimerRef, currentTemp, currentTileOrder, currentTileOrderRef, dailyForecast,
    darkMode, devices, discoveredVacuums, displayTiles, displayTilesRef, domainGroups, doorSensors, drawerOpen,
    energyData, energyHasBattery, energyHasGrid, energyHasSolar, energyModel, energyRealtime, energyTotals,
    entityRegistry, executeArmAway, fanEntities, firstVacuum, flushPendingSave, getAlarmBadgeDetails,
    getPersonZoneDetails, getTileClickHandler, handleAddAllWidgets, handleAddWidget, handleCancelCountdown,
    handleConfirmArmAway, handleDragCancel, handleDragEnd, handleDragStart, handleMouseDown, handleMouseUp,
    handleMoveTile, handleNextCamera, handleNextTrack, handlePrevCamera, handlePreviousTrack,
    handleQuickAlarmToggle, handleRemoveWidget, handleReorder, handleResetLayout, handleSetAlarmMode,
    handleSetTileMode, handleToggleBadges, handleToggleFanBatch, handleToggleHiddenFromAll, handleToggleHide,
    handleToggleLightBatch, handleTogglePlayPause, handleToggleSingleLight, handleToggleSize,
    handleToggleSwitchBatch, handleToggleVacuum, handleTouchEnd, handleTouchStart, handleUnhideAll,
    hasAnyActiveBadge, hiddenFromAllSet, hiddenTilesSet, hideBadges, homeUsers, hourlyForecast, humidity,
    isAlarmArmed, isArmAwayModalOpen, isCameraModalOpen, isEditMode, isNight, isPlayingMedia, isVacuumCharging,
    isVacuumCleaning, isWidgetDrawerOpen, justSwipedRef, leakSensors, lightEntities, mediaEntities,
    mediaPalette, motionSensors, mouseSensor, onLights, onSwitches, openDoors, openDoorsDrawer,
    openSensorsDrawer, openUsersDrawer, openWindows, openWindowsDrawer, openedDrawers, openingsTab,
    otherContactSensors, overviewConfig, overviewTabs, playingMediaEntities, playingSongTitle, pointerStartXRef,
    resolvedEntities, resolvedZones, selectedAlarmEntityId, selectedCameraForModal, selectedUser,
    selectedWeatherEntityId, sensors, sensorsTab, serverUrl, setActiveCamerasIndex, setActiveId,
    setActiveOverviewTab, setArmAwayCountdown, setDragActive, setDrawerOpen, setEditMode, setIsArmAwayModalOpen,
    setIsCameraModalOpen, setIsWidgetDrawerOpen, setOpenedDrawers, setOpeningsTab, setSelectedCameraForModal,
    setSelectedUser, setSensorsTab, singlePlayingMedia, smokeSensors, states, sunState, surveillanceCameras,
    switchEntities, tempUnit, tileBaseClass, tileSizes, todayForecast, touchSensor, touchStartXRef,
    touchStartYRef, updateConfig, updateEntityState, userEntities, vacuumBattery, vacuumEntities,
    weatherCondInfo, weatherCondition, weatherEntities, weatherHigh, weatherLow, windowSensors
  };
}

export type OverviewHeaderState = ReturnType<typeof useOverviewHeaderState>;
