/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Users, Lightbulb, ToggleRight, Door, ShieldCheck, Power, MusicNotes, Broom, Thermometer, Lightning, SquaresFour, VideoCamera } from '@phosphor-icons/react';
import { MouseSensor, TouchSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useUserConfig } from '../../contexts/ConfigContext';
import { useEditMode } from '../../contexts/EditModeContext';
import { DEFAULT_OVERVIEW_TILE_ORDER, OverviewTileVisibilityMode } from '../../types/userConfig';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { useShallow } from 'zustand/react/shallow';
import { ResolvedEntity } from '../../types';
import { classifyBinarySensors } from '../../lib/entityClassifiers';
import { getConfiguredRtspCameras } from '../../lib/cameraSources';
import { getHAImageUrl } from '../../lib/utils';
import { getWeatherConditionInfo } from '../weather/weatherIcons';
import { getDailyForecast, getHourlyForecast, generateFallbackHourlyForecast } from '../../lib/weatherForecast';
import { useAlbumArtColor } from '../../hooks/useAlbumArtColor';
import { useEnergyData } from '../../hooks/useEnergyData';
import { discoverVacuumDevices } from '../../services/vacuumDiscovery';
import { SectionTabItem } from '../common/AdaptiveSectionTabs';

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
  const [activeCamerasIndex, setActiveCamerasIndex] = useState<number>(0);
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
  } = useMemo(() => {
    const isVisible = (e: ResolvedEntity) => !e.hidden && !e.disabled_by;
    const allBinary: ResolvedEntity[] = (domainGroups['binary_sensor'] || []).filter(isVisible);
    const userEntitiesLocal = [...(domainGroups['person'] || []), ...(domainGroups['device_tracker'] || [])].filter(isVisible);
    const lightEntitiesLocal = (domainGroups['light'] || []).filter(isVisible);
    const switchEntitiesLocal = (domainGroups['switch'] || []).filter(isVisible);
    const fanEntitiesLocal = (domainGroups['fan'] || []).filter(isVisible);
    const mediaEntitiesLocal = (domainGroups['media_player'] || []).filter(isVisible);
    const rawVacuums = (domainGroups['vacuum'] || []).filter((v) => !v.disabled_by);
    const vacuumEntitiesLocal = rawVacuums.length > 0
      ? rawVacuums
      : Object.values(resolvedEntities || {}).filter(
          (e) => (e.entity_id?.startsWith('vacuum.') || e.domain === 'vacuum') && !e.disabled_by
        );
    const weatherEntitiesLocal = (domainGroups['weather'] || []).filter(isVisible);
    const surveillanceCamerasLocal = getConfiguredRtspCameras(
      config.cameras?.sources,
      domainGroups['camera'] || []
    );

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
      surveillanceCameras: surveillanceCamerasLocal,
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
  }, [domainGroups, config.cameras?.sources]);

  // Gesture and navigation helpers for multi-camera swipeable carousel tile
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const pointerStartXRef = useRef<number | null>(null);
  const justSwipedRef = useRef<boolean>(false);

  const handleNextCamera = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (surveillanceCameras.length > 0) {
      setActiveCamerasIndex((prev) => (prev + 1) % surveillanceCameras.length);
    }
  }, [surveillanceCameras.length]);

  const handlePrevCamera = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (surveillanceCameras.length > 0) {
      setActiveCamerasIndex((prev) => (prev - 1 + surveillanceCameras.length) % surveillanceCameras.length);
    }
  }, [surveillanceCameras.length]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (Math.abs(deltaX) > 30 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1) {
      justSwipedRef.current = true;
      setTimeout(() => {
        justSwipedRef.current = false;
      }, 300);

      if (deltaX < 0) {
        handleNextCamera();
      } else {
        handlePrevCamera();
      }
    }
  }, [handleNextCamera, handlePrevCamera]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    pointerStartXRef.current = e.clientX;
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (pointerStartXRef.current === null) return;
    const deltaX = e.clientX - pointerStartXRef.current;
    pointerStartXRef.current = null;

    if (Math.abs(deltaX) > 35) {
      justSwipedRef.current = true;
      setTimeout(() => {
        justSwipedRef.current = false;
      }, 300);

      if (deltaX < 0) {
        handleNextCamera();
      } else {
        handlePrevCamera();
      }
    }
  }, [handleNextCamera, handlePrevCamera]);

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
  const hourlyForecast = useMemo(() => {
    const extracted = getHourlyForecast(activeWeather);
    if (extracted && extracted.length > 0) return extracted;
    return generateFallbackHourlyForecast(currentTemp, weatherCondition);
  }, [activeWeather, currentTemp, weatherCondition]);
  const todayForecast = dailyForecast[0];
  const weatherHigh = typeof todayForecast?.temperature === 'number'
    ? todayForecast.temperature
    : (activeWeather?.attributes?.forecast?.[0]?.temperature ?? Math.round(currentTemp + 3));
  const weatherLow = typeof todayForecast?.templow === 'number'
    ? todayForecast.templow
    : (activeWeather?.attributes?.forecast?.[0]?.templow ?? Math.round(currentTemp - 4));
  const humidity = activeWeather?.attributes?.humidity ?? 55;

  // Armed-like states only; unknown/unavailable is neither armed nor disarmed
  const isAlarmArmed = Boolean(
    alarmEntity?.state &&
      (alarmEntity.state.startsWith('armed_') || ['triggered', 'arming', 'pending'].includes(alarmEntity.state))
  );
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

  const { vacuums: discoveredVacuums } = useMemo(() => {
    return discoverVacuumDevices(
      vacuumEntities,
      resolvedEntities,
      states,
      entityRegistry || [],
      devices || []
    );
  }, [vacuumEntities, resolvedEntities, states, entityRegistry, devices]);

  const activeVacuumDevice = discoveredVacuums[0];
  const firstVacuum = vacuumEntities[0];
  const isVacuumCleaning = discoveredVacuums.some((v) => v.state === 'cleaning');
  const vacuumBattery = activeVacuumDevice?.batteryLevel ?? (firstVacuum?.attributes?.battery_level ?? firstVacuum?.attributes?.battery);
  const isVacuumCharging = activeVacuumDevice?.batteryCharging;

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

  const getAlarmBadgeDetails = () => {
    switch (alarmEntity?.state) {
      case 'armed_home':
        return { label: 'Armed Home', bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-300' };
      case 'armed_away':
        return { label: 'Armed Away', bg: 'bg-rose-500/15', text: 'text-rose-700 dark:text-rose-300' };
      case 'armed_night':
        return { label: 'Armed Night', bg: 'bg-indigo-500/15', text: 'text-indigo-700 dark:text-indigo-300' };
      case 'triggered':
        return { label: 'Triggered', bg: 'bg-rose-600/20', text: 'text-rose-700 dark:text-rose-300' };
      case 'arming':
      case 'pending':
        return { label: 'Arming…', bg: 'bg-sky-500/15', text: 'text-sky-700 dark:text-sky-300' };
      case 'disarmed':
        return { label: 'Disarmed', bg: 'bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400' };
      default:
        // Unknown, unavailable, or no state yet (e.g. before Home Assistant reports it): never
        // claim "Disarmed" without Home Assistant saying so
        return { label: 'Unavailable', bg: 'bg-slate-500/15', text: 'text-slate-600 dark:text-slate-300' };
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

  const { isEditMode, setEditMode } = useEditMode();

  const overviewConfig = config.overview || {};
  const currentTileOrder = useMemo(() => {
    const savedOrder = overviewConfig.tileOrder || [];
    const orderSet = new Set(savedOrder);
    const fullOrder = [...savedOrder];
    DEFAULT_OVERVIEW_TILE_ORDER.forEach((id) => {
      if (!orderSet.has(id)) {
        fullOrder.push(id);
        orderSet.add(id);
      }
    });

    // Automatically add all configured RTSP cameras separately as individual tiles
    surveillanceCameras.forEach((cam) => {
      const camTileId = `camera:${cam.entity_id}`;
      if (!orderSet.has(camTileId)) {
        const camerasIdx = fullOrder.indexOf('cameras');
        if (camerasIdx !== -1) {
          fullOrder.splice(camerasIdx + 1, 0, camTileId);
        } else {
          fullOrder.push(camTileId);
        }
        orderSet.add(camTileId);
      }
    });

    return fullOrder;
  }, [overviewConfig.tileOrder, surveillanceCameras]);

  // Ensure default camera tile size is 1x
  useEffect(() => {
    if (overviewConfig.tileSizes?.cameras === '2x') {
      updateConfig((prev) => ({
        ...prev,
        overview: {
          ...(prev.overview || {}),
          tileSizes: {
            ...(prev.overview?.tileSizes || {}),
            cameras: '1x'
          }
        }
      }));
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
  const OVERVIEW_TAB_TILE_MAP: Record<string, string[]> = useMemo(() => ({
    all: [],
    lights: ['lights'],
    switches: ['switches'],
    energy: ['power_flow', 'power_flow_chart', 'energy_usage', 'energy_usage_chart', 'solar_production', 'solar_production_chart'],
    security: ['alarm', 'doors', 'windows', 'motion', 'leak', 'smoke', 'cameras', ...surveillanceCameras.map(c => `camera:${c.entity_id}`)],
    cameras: ['cameras', ...surveillanceCameras.map(c => `camera:${c.entity_id}`)],
    climate: ['fans', 'weather', 'weather_hourly'],
    openings: ['doors', 'windows'],
    media: ['media'],
    vacuums: ['vacuums']
  }), [surveillanceCameras]);

  // Compute adaptive section tabs with real-time badges
  const overviewTabs: SectionTabItem[] = useMemo(() => {
    const totalOpenings = openDoors.length + openWindows.length;
    const totalSecurityAlerts = totalOpenings + activeMotion.length + activeLeaks.length + activeSmoke.length;

    const tabs: SectionTabItem[] = [
      {
        id: 'all',
        label: 'All',
        icon: SquaresFour,
        color: '#38bdf8'
      },
      {
        id: 'lights',
        label: 'Lights',
        icon: Lightbulb,
        color: '#eab308',
        badge: onLights.length > 0 ? `${onLights.length} on` : undefined,
        badgeColor: onLights.length > 0 ? 'bg-amber-500/20 text-amber-300 font-bold' : undefined
      },
      ...((switchEntities.length > 0 || isEditMode)
        ? [
            {
              id: 'switches',
              label: 'Switches',
              icon: ToggleRight,
              color: '#10b981',
              badge: onSwitches.length > 0 ? `${onSwitches.length} on` : undefined,
              badgeColor: onSwitches.length > 0 ? 'bg-emerald-500/20 text-emerald-300 font-bold' : undefined
            }
          ]
        : []),
      {
        id: 'energy',
        label: 'Energy',
        icon: Lightning,
        color: '#10b981',
        badge: energyTotals?.homeConsumption && energyTotals.homeConsumption > 0
          ? `${Math.min(100, Math.round((((energyTotals.solarToHome || 0) + (energyTotals.batteryToHome || 0)) / energyTotals.homeConsumption) * 100))}%`
          : undefined,
        badgeColor: 'bg-emerald-500/20 text-emerald-300 font-bold'
      },
      {
        id: 'security',
        label: 'Security',
        icon: ShieldCheck,
        color: '#ef4444',
        badge: totalSecurityAlerts > 0 ? `${totalSecurityAlerts}` : undefined,
        badgeColor: totalSecurityAlerts > 0 ? 'bg-rose-500/20 text-rose-300 font-bold' : undefined
      },
      ...(surveillanceCameras.length > 0
        ? [
            {
              id: 'cameras',
              label: 'Cameras',
              icon: VideoCamera,
              color: '#8b5cf6',
              badge: `${surveillanceCameras.length}`
            }
          ]
        : []),
      {
        id: 'climate',
        label: 'Climate',
        icon: Thermometer,
        color: '#06b6d4',
        badge: activeFans.length > 0 ? `${activeFans.length} active` : undefined,
        badgeColor: activeFans.length > 0 ? 'bg-cyan-500/20 text-cyan-300 font-bold' : undefined
      },
      {
        id: 'openings',
        label: 'Windows & Doors',
        icon: Door,
        color: '#8b5cf6',
        badge: totalOpenings > 0 ? `${totalOpenings} open` : undefined,
        badgeColor: totalOpenings > 0 ? 'bg-amber-500/20 text-amber-300 font-bold' : undefined
      },
      {
        id: 'media',
        label: 'Media',
        icon: MusicNotes,
        color: '#ec4899',
        badge: playingMediaEntities.length > 0 ? `${playingMediaEntities.length} active` : undefined,
        badgeColor: 'bg-purple-500/20 text-purple-300 font-bold'
      }
    ];

    if (vacuumEntities.length > 0) {
      tabs.push({
        id: 'vacuums',
        label: 'Vacuums',
        icon: Broom,
        color: '#f97316',
        badge: activeVacuums.length > 0 ? `${activeVacuums.length} active` : undefined,
        badgeColor: 'bg-amber-500/20 text-amber-300 font-bold'
      });
    }

    return tabs;
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
    return currentTileOrder.filter((id) => {
      if (id === 'switches' && switchEntities.length === 0 && !isEditMode) return false;
      if (id === 'vacuums' && vacuumEntities.length === 0 && !isEditMode) return false;
      if (id === 'cameras' && surveillanceCameras.length === 0 && !isEditMode) return false;
      if (id.startsWith('camera:')) {
        const camEntityId = id.replace('camera:', '');
        const exists = surveillanceCameras.some((c) => c.entity_id === camEntityId);
        if (!exists && !isEditMode) return false;
      }
      if (hiddenTilesSet.has(id)) return false;

      if (activeOverviewTab === 'all') {
        // If hidden specifically from 'all' tab, hide unless in edit mode so user can see & toggle it
        if (hiddenFromAllSet.has(id) && !isEditMode) {
          return false;
        }
      } else {
        const allowed = OVERVIEW_TAB_TILE_MAP[activeOverviewTab];
        if (allowed && !allowed.includes(id)) {
          return false;
        }
      }
      return true;
    });
  }, [currentTileOrder, switchEntities.length, vacuumEntities.length, surveillanceCameras.length, isEditMode, hiddenTilesSet, hiddenFromAllSet, activeOverviewTab, OVERVIEW_TAB_TILE_MAP]);

  const currentTileOrderRef = useRef(currentTileOrder);
  currentTileOrderRef.current = currentTileOrder;
  const displayTilesRef = useRef(displayTiles);
  displayTilesRef.current = displayTiles;

  const handleReorder = useCallback((newOrder: string[]) => {
    updateConfig((prev) => {
      const savedOrder = prev.overview?.tileOrder || currentTileOrderRef.current;
      const orderSet = new Set(savedOrder);
      const fullBase = [...savedOrder];
      DEFAULT_OVERVIEW_TILE_ORDER.forEach((id) => {
        if (!orderSet.has(id)) fullBase.push(id);
      });

      const displaySet = new Set(newOrder);
      let newOrderIdx = 0;
      const fullOrder = fullBase.map((id) => {
        if (displaySet.has(id)) {
          return newOrder[newOrderIdx++];
        }
        return id;
      });
      while (newOrderIdx < newOrder.length) {
        fullOrder.push(newOrder[newOrderIdx++]);
      }
      DEFAULT_OVERVIEW_TILE_ORDER.forEach((id) => {
        if (!fullOrder.includes(id)) {
          fullOrder.push(id);
        }
      });
      return {
        ...prev,
        overview: {
          ...(prev.overview || {}),
          tileOrder: fullOrder
        }
      };
    });
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
    const currentSize = tileSizes[tileId] ?? (tileId === 'weather' || tileId === 'weather_hourly' ? '2x' : '1x');
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

  const handleAddWidget = useCallback((widgetId: string) => {
    const nextSet = new Set(hiddenTilesSet);
    nextSet.delete(widgetId);
    const nextOrder = [...currentTileOrder];
    if (!nextOrder.includes(widgetId)) {
      nextOrder.push(widgetId);
    }
    updateConfig((prev) => ({
      ...prev,
      overview: {
        ...(prev.overview || {}),
        tileOrder: nextOrder,
        hiddenTiles: Array.from(nextSet)
      }
    }));
  }, [hiddenTilesSet, currentTileOrder, updateConfig]);

  const handleRemoveWidget = useCallback((widgetId: string) => {
    const nextSet = new Set(hiddenTilesSet);
    nextSet.add(widgetId);
    updateConfig((prev) => ({
      ...prev,
      overview: {
        ...(prev.overview || {}),
        hiddenTiles: Array.from(nextSet)
      }
    }));
  }, [hiddenTilesSet, updateConfig]);

  const handleAddAllWidgets = useCallback(() => {
    updateConfig((prev) => ({
      ...prev,
      overview: {
        ...(prev.overview || {}),
        hiddenTiles: []
      }
    }));
  }, [updateConfig]);

  const handleUnhideAll = useCallback(() => {
    updateConfig((prev) => ({
      ...prev,
      overview: {
        ...(prev.overview || {}),
        hiddenTiles: []
      }
    }));
  }, [updateConfig]);

  const handleToggleBadges = useCallback(() => {
    updateConfig((prev) => {
      const current = Boolean(prev.overview?.hideBadges);
      return {
        ...prev,
        overview: {
          ...(prev.overview || {}),
          hideBadges: !current
        }
      };
    });
  }, [updateConfig]);

  const handleToggleHiddenFromAll = useCallback((tileId: string) => {
    const isHiddenFromAll = hiddenFromAllSet.has(tileId);
    const nextSet = new Set(hiddenFromAllSet);
    if (isHiddenFromAll) {
      nextSet.delete(tileId);
    } else {
      nextSet.add(tileId);
    }
    updateConfig((prev) => ({
      ...prev,
      overview: {
        ...(prev.overview || {}),
        hiddenFromAllTiles: Array.from(nextSet)
      }
    }));
  }, [hiddenFromAllSet, updateConfig]);

  const handleSetTileMode = useCallback((tileId: string, mode: OverviewTileVisibilityMode) => {
    const nextHiddenTiles = new Set(hiddenTilesSet);
    const nextHiddenFromAll = new Set(hiddenFromAllSet);

    if (mode === 'all_on') {
      nextHiddenTiles.delete(tileId);
      nextHiddenFromAll.delete(tileId);
    } else if (mode === 'tab_only') {
      nextHiddenTiles.delete(tileId);
      nextHiddenFromAll.add(tileId);
    } else if (mode === 'all_off') {
      nextHiddenTiles.add(tileId);
      nextHiddenFromAll.delete(tileId);
    }

    const nextOrder = [...currentTileOrder];
    if (mode !== 'all_off' && !nextOrder.includes(tileId)) {
      nextOrder.push(tileId);
    }

    updateConfig((prev) => ({
      ...prev,
      overview: {
        ...(prev.overview || {}),
        tileOrder: nextOrder,
        hiddenTiles: Array.from(nextHiddenTiles),
        hiddenFromAllTiles: Array.from(nextHiddenFromAll)
      }
    }));
  }, [hiddenTilesSet, hiddenFromAllSet, currentTileOrder, updateConfig]);

  const handleResetLayout = useCallback(() => {
    updateConfig((prev) => ({
      ...prev,
      overview: {
        tileOrder: [...DEFAULT_OVERVIEW_TILE_ORDER],
        hiddenTiles: [],
        hiddenFromAllTiles: [],
        hideBadges: false,
        tileSizes: {
          weather: '2x',
          weather_hourly: '2x'
        }
      }
    }));
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
  return {
    OVERVIEW_TAB_TILE_MAP,
    activeCamerasIndex,
    activeFans,
    activeId,
    activeLeaks,
    activeMedia,
    activeMediaArtUrl,
    activeMotion,
    activeOverviewTab,
    activeSmoke,
    activeVacuumDevice,
    activeVacuums,
    activeWeather,
    activeZoneUsers,
    alarmDetails,
    alarmEntities,
    alarmEntity,
    areasMap,
    armAwayCountdown,
    callHAService,
    config,
    countdownTimerRef,
    currentTemp,
    currentTileOrder,
    currentTileOrderRef,
    dailyForecast,
    darkMode,
    devices,
    discoveredVacuums,
    displayTiles,
    displayTilesRef,
    domainGroups,
    doorSensors,
    drawerOpen,
    energyData,
    energyHasBattery,
    energyHasGrid,
    energyHasSolar,
    energyModel,
    energyRealtime,
    energyTotals,
    entityRegistry,
    executeArmAway,
    fanEntities,
    firstVacuum,
    flushPendingSave,
    getAlarmBadgeDetails,
    getPersonZoneDetails,
    getTileClickHandler,
    handleAddAllWidgets,
    handleAddWidget,
    handleCancelCountdown,
    handleConfirmArmAway,
    handleDragCancel,
    handleDragEnd,
    handleDragStart,
    handleMouseDown,
    handleMouseUp,
    handleMoveTile,
    handleNextCamera,
    handleNextTrack,
    handlePrevCamera,
    handlePreviousTrack,
    handleQuickAlarmToggle,
    handleRemoveWidget,
    handleReorder,
    handleResetLayout,
    handleSetAlarmMode,
    handleSetTileMode,
    handleToggleBadges,
    handleToggleFanBatch,
    handleToggleHiddenFromAll,
    handleToggleHide,
    handleToggleLightBatch,
    handleTogglePlayPause,
    handleToggleSingleLight,
    handleToggleSize,
    handleToggleSwitchBatch,
    handleToggleVacuum,
    handleTouchEnd,
    handleTouchStart,
    handleUnhideAll,
    hasAnyActiveBadge,
    hiddenFromAllSet,
    hiddenTilesSet,
    hideBadges,
    homeUsers,
    hourlyForecast,
    humidity,
    isAlarmArmed,
    isArmAwayModalOpen,
    isCameraModalOpen,
    isEditMode,
    isNight,
    isPlayingMedia,
    isVacuumCharging,
    isVacuumCleaning,
    isWidgetDrawerOpen,
    justSwipedRef,
    leakSensors,
    lightEntities,
    mediaEntities,
    mediaPalette,
    motionSensors,
    mouseSensor,
    onLights,
    onSwitches,
    openDoors,
    openDoorsDrawer,
    openSensorsDrawer,
    openUsersDrawer,
    openWindows,
    openWindowsDrawer,
    openedDrawers,
    openingsTab,
    otherContactSensors,
    overviewConfig,
    overviewTabs,
    playingMediaEntities,
    playingSongTitle,
    pointerStartXRef,
    resolvedEntities,
    resolvedZones,
    selectedAlarmEntityId,
    selectedCameraForModal,
    selectedUser,
    selectedWeatherEntityId,
    sensors,
    sensorsTab,
    serverUrl,
    setActiveCamerasIndex,
    setActiveId,
    setActiveOverviewTab,
    setArmAwayCountdown,
    setDragActive,
    setDrawerOpen,
    setEditMode,
    setIsArmAwayModalOpen,
    setIsCameraModalOpen,
    setIsWidgetDrawerOpen,
    setOpenedDrawers,
    setOpeningsTab,
    setSelectedCameraForModal,
    setSelectedUser,
    setSensorsTab,
    singlePlayingMedia,
    smokeSensors,
    states,
    sunState,
    surveillanceCameras,
    switchEntities,
    tempUnit,
    tileBaseClass,
    tileSizes,
    todayForecast,
    touchSensor,
    touchStartXRef,
    touchStartYRef,
    updateConfig,
    updateEntityState,
    userEntities,
    vacuumBattery,
    vacuumEntities,
    weatherCondInfo,
    weatherCondition,
    weatherEntities,
    weatherHigh,
    weatherLow,
    windowSensors
  };
}

export type OverviewHeaderState = ReturnType<typeof useOverviewHeaderState>;
