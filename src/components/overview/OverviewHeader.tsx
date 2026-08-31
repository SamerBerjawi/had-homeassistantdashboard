/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
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
  Thermometer
} from '@phosphor-icons/react';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { useShallow } from 'zustand/react/shallow';
import { ResolvedEntity } from '../../types';
import { classifyBinarySensors } from '../../lib/entityClassifiers';
import { getHAImageUrl } from '../../lib/utils';
import PersonAvatar from '../ui/PersonAvatar';
import { getWeatherConditionInfo } from '../weather/weatherIcons';

// Interactive Slide-over Right Drawers
import UsersPresenceModal from './modals/UsersPresenceModal';
import LightsOverviewModal from './modals/LightsOverviewModal';
import SwitchesOverviewModal from './modals/SwitchesOverviewModal';
import FansOverviewModal from './modals/FansOverviewModal';
import OpeningsOverviewModal from './modals/OpeningsOverviewModal';
import AlarmKeypadModal from './modals/AlarmKeypadModal';
import MediaOverviewDrawer from './modals/MediaOverviewDrawer';
import SensorsOverviewDrawer from './modals/SensorsOverviewDrawer';
import VacuumsOverviewDrawer from './modals/VacuumsOverviewDrawer';
import WeatherOverviewDrawer from '../weather/WeatherOverviewDrawer';

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

  const [selectedUser, setSelectedUser] = useState<ResolvedEntity | null>(null);
  const [openingsTab, setOpeningsTab] = useState<'all' | 'doors' | 'windows' | 'other'>('all');
  const [sensorsTab, setSensorsTab] = useState<'all' | 'motion' | 'leak' | 'smoke'>('all');

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
    const allBinary: ResolvedEntity[] = domainGroups['binary_sensor'] || [];
    const userEntitiesLocal = [...(domainGroups['person'] || []), ...(domainGroups['device_tracker'] || [])];
    const lightEntitiesLocal = domainGroups['light'] || [];
    const switchEntitiesLocal = domainGroups['switch'] || [];
    const fanEntitiesLocal = domainGroups['fan'] || [];
    const mediaEntitiesLocal = domainGroups['media_player'] || [];
    const vacuumEntitiesLocal = domainGroups['vacuum'] || [];
    const weatherEntitiesLocal = domainGroups['weather'] || [];

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

  // Active Weather Resolution
  const activeWeather = useMemo(() => {
    return weatherEntities.find((w) => w.entity_id === selectedWeatherEntityId) || weatherEntities[0];
  }, [weatherEntities, selectedWeatherEntityId]);

  const weatherCondition = activeWeather?.state || 'partlycloudy';
  const weatherCondInfo = getWeatherConditionInfo(weatherCondition, false, 20);
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

  return (
    <section aria-label="House Telemetry and Fast Controls" className="space-y-4 mb-6">
      {/* ============================================================= */}
      {/* 1. STATUS PILLS BAR (WRAPS TO MULTIPLE LINES)                 */}
      {/* ============================================================= */}
      <div className="flex flex-wrap items-center gap-2">
        
        {/* 1.1 USERS PRESENCE PILLS */}
        {userEntities.map((user) => {
          const isHome = user.state === 'home';
          const firstName = user.name.split(' ')[0];

          return (
            <button
              key={user.entity_id}
              type="button"
              onClick={() => openUsersDrawer(user)}
              className={`h-8.5 pl-1 pr-2.5 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 border flex items-center gap-1.5 shadow-xs select-none whitespace-nowrap shrink-0 ${
                isHome
                  ? darkMode
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : darkMode
                    ? 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10 opacity-75'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
              }`}
              title={`${user.name}: ${isHome ? 'At Home' : user.state}`}
            >
              <PersonAvatar
                name={user.name}
                entity_picture={user.attributes?.entity_picture}
                state={user.state}
                isHome={isHome}
                size="sm"
                showPresenceDot={false}
                className="w-6 h-6 shrink-0"
              />
              <span className="whitespace-nowrap">{firstName}</span>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isHome ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            </button>
          );
        })}

        {/* LIGHTS BADGE */}
        <button
          type="button"
          onClick={() => setDrawerOpen('lights')}
          className={`h-8.5 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
            onLights.length > 0
              ? darkMode
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-amber-50 text-amber-800 border-amber-300'
              : darkMode
                ? 'bg-white/5 text-slate-400 border-white/10'
                : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          <Lightbulb size={16} weight={onLights.length > 0 ? 'fill' : 'duotone'} className="text-amber-500 shrink-0" />
          <span className="whitespace-nowrap">{onLights.length} Lights</span>
        </button>

        {/* SWITCHES BADGE */}
        <button
          type="button"
          onClick={() => setDrawerOpen('switches')}
          className={`h-8.5 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
            onSwitches.length > 0
              ? darkMode
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : darkMode
                ? 'bg-white/5 text-slate-400 border-white/10'
                : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          <ToggleRight size={16} weight="duotone" className="text-emerald-500 shrink-0" />
          <span className="whitespace-nowrap">{onSwitches.length} Switches</span>
        </button>

        {/* FANS BADGE */}
        <button
          type="button"
          onClick={() => setDrawerOpen('fans')}
          className={`h-8.5 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
            activeFans.length > 0
              ? darkMode
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                : 'bg-cyan-50 text-cyan-800 border-cyan-300'
              : darkMode
                ? 'bg-white/5 text-slate-400 border-white/10'
                : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          <Fan size={16} weight="duotone" className={`text-cyan-500 shrink-0 ${activeFans.length > 0 ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
          <span className="whitespace-nowrap">{activeFans.length} Fans</span>
        </button>

        {/* VACUUM ROBOTS BADGE */}
        {vacuumEntities.length > 0 && (
          <button
            type="button"
            onClick={() => setDrawerOpen('vacuums')}
            className={`h-8.5 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
              isVacuumCleaning
                ? darkMode
                  ? 'bg-teal-500/15 text-teal-300 border-teal-500/30'
                  : 'bg-teal-50 text-teal-800 border-teal-300'
                : darkMode
                  ? 'bg-white/5 text-slate-400 border-white/10'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <Broom size={16} weight="duotone" className="text-teal-500 shrink-0" />
            <span className="whitespace-nowrap">{isVacuumCleaning ? `${activeVacuums.length} Cleaning` : `${vacuumEntities.length} Vacuums`}</span>
          </button>
        )}

        {/* AUDIO / MEDIA BADGE */}
        <button
          type="button"
          onClick={() => setDrawerOpen('media')}
          className={`h-8.5 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
            isPlayingMedia
              ? darkMode
                ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                : 'bg-purple-50 text-purple-800 border-purple-300'
              : darkMode
                ? 'bg-white/5 text-slate-400 border-white/10'
                : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
          title={
            playingMediaEntities.length === 1
              ? `Playing: ${playingSongTitle || 'Audio'}`
              : playingMediaEntities.length > 1
                ? `${playingMediaEntities.length} speakers currently playing`
                : 'Audio & Media'
          }
        >
          <MusicNotes size={16} weight="duotone" className="text-purple-500 shrink-0" />
          <span className="whitespace-nowrap">
            {playingMediaEntities.length === 1
              ? (playingSongTitle || 'Playing Audio')
              : playingMediaEntities.length > 1
                ? `${playingMediaEntities.length} Playing`
                : 'Audio'}
          </span>
        </button>

        {/* ALARM BADGE */}
        <button
          type="button"
          onClick={() => setDrawerOpen('alarm')}
          className={`h-8.5 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
            isAlarmArmed
              ? darkMode
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : darkMode
                ? 'bg-white/5 text-slate-400 border-white/10'
                : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          {isAlarmArmed ? (
            <ShieldCheck size={16} weight="duotone" className="text-emerald-500 shrink-0" />
          ) : (
            <LockOpen size={16} weight="duotone" className="text-slate-400 shrink-0" />
          )}
          <span className="whitespace-nowrap">{isAlarmArmed ? 'Armed' : 'Alarm'}</span>
        </button>

        {/* DOORS BADGE */}
        <button
          type="button"
          onClick={openDoorsDrawer}
          className={`h-8.5 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
            openDoors.length > 0
              ? darkMode
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-amber-50 text-amber-800 border-amber-300'
              : darkMode
                ? 'bg-white/5 text-slate-400 border-white/10'
                : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          {openDoors.length > 0 ? (
            <DoorOpen size={16} weight="duotone" className="text-amber-500 shrink-0" />
          ) : (
            <Door size={16} weight="duotone" className="text-slate-400 shrink-0" />
          )}
          <span className="whitespace-nowrap">{openDoors.length} Doors</span>
        </button>

        {/* WINDOWS BADGE */}
        <button
          type="button"
          onClick={openWindowsDrawer}
          className={`h-8.5 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
            openWindows.length > 0
              ? darkMode
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-amber-50 text-amber-800 border-amber-300'
              : darkMode
                ? 'bg-white/5 text-slate-400 border-white/10'
                : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          <FrameCorners size={16} weight="duotone" className={openWindows.length > 0 ? 'text-amber-500 shrink-0' : 'text-slate-400 shrink-0'} />
          <span className="whitespace-nowrap">{openWindows.length} Windows</span>
        </button>

        {/* MOTION BADGE */}
        <button
          type="button"
          onClick={() => openSensorsDrawer('motion')}
          className={`h-8.5 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
            activeMotion.length > 0
              ? darkMode
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-amber-50 text-amber-800 border-amber-300'
              : darkMode
                ? 'bg-white/5 text-slate-400 border-white/10'
                : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          <PersonSimpleWalk size={16} weight="duotone" className={activeMotion.length > 0 ? 'text-amber-500 shrink-0' : 'text-slate-400 shrink-0'} />
          <span className="whitespace-nowrap">{activeMotion.length} Motion</span>
        </button>

        {/* LEAKAGE BADGE */}
        <button
          type="button"
          onClick={() => openSensorsDrawer('leak')}
          className={`h-8.5 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
            activeLeaks.length > 0
              ? darkMode
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                : 'bg-rose-50 text-rose-800 border-rose-300'
              : darkMode
                ? 'bg-white/5 text-slate-400 border-white/10'
                : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          <Drop size={16} weight="duotone" className={activeLeaks.length > 0 ? 'text-rose-500 shrink-0' : 'text-slate-400 shrink-0'} />
          <span className="whitespace-nowrap">{activeLeaks.length > 0 ? `${activeLeaks.length} Leaks` : '0 Leaks'}</span>
        </button>

        {/* SMOKE BADGE */}
        <button
          type="button"
          onClick={() => openSensorsDrawer('smoke')}
          className={`h-8.5 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
            activeSmoke.length > 0
              ? darkMode
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                : 'bg-rose-50 text-rose-800 border-rose-300'
              : darkMode
                ? 'bg-white/5 text-slate-400 border-white/10'
                : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          <Flame size={16} weight="duotone" className={activeSmoke.length > 0 ? 'text-rose-500 shrink-0' : 'text-slate-400 shrink-0'} />
          <span className="whitespace-nowrap">{activeSmoke.length > 0 ? `${activeSmoke.length} Smoke` : '0 Smoke'}</span>
        </button>

      </div>

      {/* ============================================================= */}
      {/* 2. BENTO TILES GRID (BORDERLESS 4-COLS MOBILE / ADAPTIVE)    */}
      {/* ============================================================= */}
      <div className="grid grid-cols-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
        
        {/* 2.1 WEATHER TILE */}
        <div
          onClick={() => setDrawerOpen('weather')}
          style={{ boxShadow: '4px 6px 12px rgba(0, 0, 0, 0.15)' }}
          className={`col-span-2 sm:col-span-1 group relative h-36 rounded-3xl border border-sky-500/30 dark:border-sky-400/30 backdrop-blur-sm transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden isolate transform-gpu p-3.5 sm:p-4 ${
            darkMode
              ? 'bg-black/20 hover:bg-black/30 text-white'
              : 'bg-white/20 hover:bg-white/30 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between relative z-10">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs">
              {weatherCondInfo.icon}
            </div>
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300">
              {weatherCondInfo.name}
            </span>
          </div>

          <div className="relative z-10 my-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                {Math.round(currentTemp)}{tempUnit}
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
                H: {Math.round(weatherHigh)}° L: {Math.round(weatherLow)}°
              </span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">Weather</div>
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
              <span>{humidity}% Humidity</span>
              <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* 2.2 PERSONS / FAMILY PRESENCE */}
        <div
          onClick={() => openUsersDrawer()}
          style={{ boxShadow: '4px 6px 12px rgba(0, 0, 0, 0.15)' }}
          className={`col-span-2 sm:col-span-1 group relative h-36 rounded-3xl border border-indigo-500/30 dark:border-indigo-400/30 backdrop-blur-sm transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden isolate transform-gpu p-3.5 sm:p-4 ${
            darkMode
              ? 'bg-black/20 hover:bg-black/30 text-white'
              : 'bg-white/20 hover:bg-white/30 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between relative z-10">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <Users size={20} weight="duotone" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              {homeUsers.length} Home
            </span>
          </div>

          <div className="flex items-center gap-2 my-auto py-1 relative z-10">
            {userEntities.slice(0, 3).map((user) => {
              const isHome = user.state === 'home';
              return (
                <PersonAvatar
                  key={user.entity_id}
                  name={user.name}
                  entity_picture={user.attributes?.entity_picture}
                  state={user.state}
                  isHome={isHome}
                  size="sm"
                  className="w-8 h-8 sm:w-9 sm:h-9"
                />
              );
            })}
          </div>

          <div className="relative z-10">
            <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">Family Presence</div>
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
              <span>{homeUsers.map((u) => u.name.split(' ')[0]).join(', ') || 'No one home'}</span>
              <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* 2.3 LIGHTS */}
        <div
          onClick={() => setDrawerOpen('lights')}
          style={{ boxShadow: '4px 6px 12px rgba(0, 0, 0, 0.15)' }}
          className={`col-span-2 sm:col-span-1 group relative h-36 rounded-3xl border ${
            onLights.length > 0 ? 'border-amber-400/40' : 'border-slate-200/80 dark:border-white/10'
          } backdrop-blur-sm transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden isolate transform-gpu p-3.5 sm:p-4 ${
            onLights.length > 0
              ? 'bg-amber-500/20 text-slate-900 dark:text-white'
              : darkMode
              ? 'bg-black/20 hover:bg-black/30 text-white'
              : 'bg-white/20 hover:bg-white/30 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between relative z-10">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center transition-all ${
              onLights.length > 0
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-white/80 dark:bg-white/10 text-slate-500 dark:text-slate-400'
            }`}>
              <Lightbulb size={20} weight={onLights.length > 0 ? 'fill' : 'duotone'} />
            </div>

            <button
              type="button"
              onClick={handleToggleLightBatch}
              className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                onLights.length > 0
                  ? 'bg-amber-500/25 text-amber-700 dark:text-amber-300 hover:bg-amber-500/40'
                  : 'bg-white/80 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/15'
              }`}
              title={onLights.length > 0 ? 'Turn all off' : 'Turn on lights'}
            >
              <Power size={13} weight="bold" />
            </button>
          </div>

          <div className="relative z-10 my-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{onLights.length}</span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">/ {lightEntities.length} On</span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Lighting</div>
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
              <span>{onLights.length > 0 ? `${onLights.length} active` : 'All lights off'}</span>
              <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* 2.4 SWITCHES */}
        <div
          onClick={() => setDrawerOpen('switches')}
          style={{ boxShadow: '4px 6px 12px rgba(0, 0, 0, 0.15)' }}
          className={`col-span-2 sm:col-span-1 group relative h-36 rounded-3xl border ${
            onSwitches.length > 0 ? 'border-emerald-400/40' : 'border-slate-200/80 dark:border-white/10'
          } backdrop-blur-sm transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden isolate transform-gpu p-3.5 sm:p-4 ${
            onSwitches.length > 0
              ? 'bg-emerald-500/20 text-slate-900 dark:text-white'
              : darkMode
              ? 'bg-black/20 hover:bg-black/30 text-white'
              : 'bg-white/20 hover:bg-white/30 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between relative z-10">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center transition-all ${
              onSwitches.length > 0
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'bg-white/80 dark:bg-white/10 text-slate-500 dark:text-slate-400'
            }`}>
              <ToggleRight size={20} weight="duotone" />
            </div>

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

          <div className="relative z-10 my-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{onSwitches.length}</span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">/ {switchEntities.length} Active</span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Switches</div>
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
              <span>{onSwitches.length > 0 ? `${onSwitches.length} powered` : 'All off'}</span>
              <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* 2.5 ROBOT VACUUM TILE */}
        {vacuumEntities.length > 0 && (
          <div
            onClick={() => setDrawerOpen('vacuums')}
            style={{ boxShadow: '4px 6px 12px rgba(0, 0, 0, 0.15)' }}
            className={`col-span-2 sm:col-span-1 group relative h-36 rounded-3xl border ${
              isVacuumCleaning ? 'border-teal-400/40' : 'border-slate-200/80 dark:border-white/10'
            } backdrop-blur-sm transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden isolate transform-gpu p-3.5 sm:p-4 ${
              isVacuumCleaning
                ? 'bg-teal-500/20 text-slate-900 dark:text-white'
                : darkMode
                ? 'bg-black/20 hover:bg-black/30 text-white'
                : 'bg-white/20 hover:bg-white/30 text-slate-900'
            }`}
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

            <div className="relative z-10 my-0.5">
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
            </div>

            <div className="relative z-10">
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Vacuums</div>
              <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
                <span>{firstVacuum?.name || 'Robotic Cleaner'}</span>
                <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </div>
        )}

        {/* 2.6 FANS */}
        <div
          onClick={() => setDrawerOpen('fans')}
          style={{ boxShadow: '4px 6px 12px rgba(0, 0, 0, 0.15)' }}
          className={`col-span-2 sm:col-span-1 group relative h-36 rounded-3xl border ${
            activeFans.length > 0 ? 'border-cyan-400/40' : 'border-slate-200/80 dark:border-white/10'
          } backdrop-blur-sm transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden isolate transform-gpu p-3.5 sm:p-4 ${
            activeFans.length > 0
              ? 'bg-cyan-500/20 text-slate-900 dark:text-white'
              : darkMode
              ? 'bg-black/20 hover:bg-black/30 text-white'
              : 'bg-white/20 hover:bg-white/30 text-slate-900'
          }`}
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

          <div className="relative z-10 my-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{activeFans.length}</span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">/ {fanEntities.length} Running</span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Fans & Airflow</div>
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
              <span>{activeFans.length > 0 ? 'Circulating air' : 'All fans idle'}</span>
              <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* 2.7 AUDIO & MEDIA */}
        <div
          onClick={() => setDrawerOpen('media')}
          style={{ boxShadow: '4px 6px 12px rgba(0, 0, 0, 0.15)' }}
          className={`col-span-2 sm:col-span-1 group relative h-36 rounded-3xl border ${
            isPlayingMedia ? 'border-purple-400/40' : 'border-slate-200/80 dark:border-white/10'
          } backdrop-blur-sm transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden isolate transform-gpu p-3.5 sm:p-4 ${
            isPlayingMedia
              ? 'bg-purple-500/20 text-slate-900 dark:text-white'
              : darkMode
              ? 'bg-black/20 hover:bg-black/30 text-white'
              : 'bg-white/20 hover:bg-white/30 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between relative z-10">
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl overflow-hidden shadow-xs">
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

            <button
              type="button"
              onClick={handleTogglePlayPause}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-xs transition-all cursor-pointer active:scale-95"
              title={isPlayingMedia ? 'Pause Audio' : 'Play Audio'}
            >
              {isPlayingMedia ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" className="ml-0.5" />}
            </button>
          </div>

          <div className="relative z-10 my-0.5 min-w-0">
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
              {activeMedia?.attributes?.media_title || (isPlayingMedia ? 'Playing Media' : 'Audio Idle')}
            </h4>
            <p className="text-[11px] sm:text-xs text-purple-600 dark:text-purple-300 font-medium truncate">
              {activeMedia?.attributes?.media_artist || (activeMedia ? activeMedia.name : 'No active player')}
            </p>
          </div>

          <div className="relative z-10">
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
              <span className="truncate">{activeMedia?.name || 'Media Player'}</span>
              <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          </div>
        </div>

        {/* 2.8 ALARM & SECURITY */}
        <div
          onClick={() => setDrawerOpen('alarm')}
          style={{ boxShadow: '4px 6px 12px rgba(0, 0, 0, 0.15)' }}
          className={`col-span-2 sm:col-span-1 group relative h-36 rounded-3xl border ${
            isAlarmArmed ? 'border-emerald-400/40' : 'border-slate-200/80 dark:border-white/10'
          } backdrop-blur-sm transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden isolate transform-gpu p-3.5 sm:p-4 ${
            isAlarmArmed
              ? 'bg-emerald-500/20 text-slate-900 dark:text-white'
              : darkMode
              ? 'bg-black/20 hover:bg-black/30 text-white'
              : 'bg-white/20 hover:bg-white/30 text-slate-900'
          }`}
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

          <div className="relative z-10 my-0.5">
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
              {alarmDetails.label}
            </div>
          </div>

          <div className="relative z-10">
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Security Guard</div>
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
              <span>{isAlarmArmed ? 'Perimeter armed' : 'Ready to arm'}</span>
              <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* 2.9 ENTRY DOORS (SUBTLE ALERT) */}
        <div
          onClick={openDoorsDrawer}
          style={{ boxShadow: '4px 6px 12px rgba(0, 0, 0, 0.15)' }}
          className={`col-span-2 sm:col-span-1 group relative h-36 rounded-3xl border ${
            openDoors.length > 0 ? 'border-amber-400/40' : 'border-slate-200/80 dark:border-white/10'
          } backdrop-blur-sm transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden isolate transform-gpu p-3.5 sm:p-4 ${
            openDoors.length > 0
              ? 'bg-amber-500/20 text-slate-900 dark:text-white'
              : darkMode
              ? 'bg-black/20 hover:bg-black/30 text-white'
              : 'bg-white/20 hover:bg-white/30 text-slate-900'
          }`}
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

          <div className="relative z-10 my-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                {openDoors.length}
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">/ {doorSensors.length} Doors</span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Entry Doors</div>
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
              <span>{openDoors.length > 0 ? `${openDoors.length} open` : 'All doors closed'}</span>
              <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* 2.10 WINDOWS (SUBTLE ALERT) */}
        <div
          onClick={openWindowsDrawer}
          style={{ boxShadow: '4px 6px 12px rgba(0, 0, 0, 0.15)' }}
          className={`col-span-2 sm:col-span-1 group relative h-36 rounded-3xl border ${
            openWindows.length > 0 ? 'border-amber-400/40' : 'border-slate-200/80 dark:border-white/10'
          } backdrop-blur-sm transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden isolate transform-gpu p-3.5 sm:p-4 ${
            openWindows.length > 0
              ? 'bg-amber-500/20 text-slate-900 dark:text-white'
              : darkMode
              ? 'bg-black/20 hover:bg-black/30 text-white'
              : 'bg-white/20 hover:bg-white/30 text-slate-900'
          }`}
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

          <div className="relative z-10 my-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                {openWindows.length}
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">/ {windowSensors.length} Windows</span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Windows</div>
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
              <span>{openWindows.length > 0 ? `${openWindows.length} open` : 'All windows shut'}</span>
              <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* 2.11 MOTION */}
        <div
          onClick={() => openSensorsDrawer('motion')}
          style={{ boxShadow: '4px 6px 12px rgba(0, 0, 0, 0.15)' }}
          className={`col-span-2 sm:col-span-1 group relative h-36 rounded-3xl border ${
            activeMotion.length > 0 ? 'border-amber-400/40' : 'border-slate-200/80 dark:border-white/10'
          } backdrop-blur-sm transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden isolate transform-gpu p-3.5 sm:p-4 ${
            activeMotion.length > 0
              ? 'bg-amber-500/20 text-slate-900 dark:text-white'
              : darkMode
              ? 'bg-black/20 hover:bg-black/30 text-white'
              : 'bg-white/20 hover:bg-white/30 text-slate-900'
          }`}
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

          <div className="relative z-10 my-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">{activeMotion.length}</span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">/ {motionSensors.length} Active</span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Motion Zones</div>
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
              <span>{activeMotion.length > 0 ? `${activeMotion.length} active` : 'No activity'}</span>
              <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* 2.12 WATER LEAKAGE (SUBTLE ALERT) */}
        <div
          onClick={() => openSensorsDrawer('leak')}
          style={{ boxShadow: '4px 6px 12px rgba(0, 0, 0, 0.15)' }}
          className={`col-span-2 sm:col-span-1 group relative h-36 rounded-3xl border ${
            activeLeaks.length > 0 ? 'border-rose-500/50' : 'border-slate-200/80 dark:border-white/10'
          } backdrop-blur-sm transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden isolate transform-gpu p-3.5 sm:p-4 ${
            activeLeaks.length > 0
              ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300'
              : darkMode
              ? 'bg-black/20 hover:bg-black/30 text-white'
              : 'bg-white/20 hover:bg-white/30 text-slate-900'
          }`}
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

          <div className="relative z-10 my-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl sm:text-2xl font-black font-mono ${activeLeaks.length > 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                {activeLeaks.length}
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">/ {leakSensors.length} Probes</span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Water Leaks</div>
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
              <span>{activeLeaks.length > 0 ? 'Moisture detected!' : 'All zones dry'}</span>
              <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* 2.13 SMOKE & FIRE (SUBTLE ALERT) */}
        <div
          onClick={() => openSensorsDrawer('smoke')}
          style={{ boxShadow: '4px 6px 12px rgba(0, 0, 0, 0.15)' }}
          className={`col-span-2 sm:col-span-1 group relative h-36 rounded-3xl border ${
            activeSmoke.length > 0 ? 'border-rose-500/50' : 'border-slate-200/80 dark:border-white/10'
          } backdrop-blur-sm transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden isolate transform-gpu p-3.5 sm:p-4 ${
            activeSmoke.length > 0
              ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300'
              : darkMode
              ? 'bg-black/20 hover:bg-black/30 text-white'
              : 'bg-white/20 hover:bg-white/30 text-slate-900'
          }`}
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

          <div className="relative z-10 my-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl sm:text-2xl font-black font-mono ${activeSmoke.length > 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                {activeSmoke.length}
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">/ {smokeSensors.length} Detectors</span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Smoke & Fire</div>
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
              <span>{activeSmoke.length > 0 ? 'Smoke alarm triggered!' : 'All normal'}</span>
              <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

      </div>

      {/* ============================================================= */}
      {/* 3. SLIDE-OVER RIGHT SIDEBARS                                  */}
      {/* ============================================================= */}
      <WeatherOverviewDrawer
        isOpen={drawerOpen === 'weather'}
        onClose={() => setDrawerOpen(null)}
        darkMode={darkMode}
      />

      <VacuumsOverviewDrawer
        isOpen={drawerOpen === 'vacuums'}
        onClose={() => setDrawerOpen(null)}
        vacuums={vacuumEntities}
        darkMode={darkMode}
      />

      <UsersPresenceModal
        isOpen={drawerOpen === 'users'}
        onClose={() => setDrawerOpen(null)}
        users={userEntities}
        selectedUser={selectedUser}
        darkMode={darkMode}
      />

      <LightsOverviewModal
        isOpen={drawerOpen === 'lights'}
        onClose={() => setDrawerOpen(null)}
        lights={lightEntities}
        onUpdateEntity={updateEntityState}
        darkMode={darkMode}
      />

      <SwitchesOverviewModal
        isOpen={drawerOpen === 'switches'}
        onClose={() => setDrawerOpen(null)}
        switches={switchEntities}
        onUpdateEntity={updateEntityState}
        darkMode={darkMode}
      />

      <FansOverviewModal
        isOpen={drawerOpen === 'fans'}
        onClose={() => setDrawerOpen(null)}
        fans={fanEntities}
        onUpdateEntity={updateEntityState}
        darkMode={darkMode}
      />

      <OpeningsOverviewModal
        isOpen={drawerOpen === 'doors' || drawerOpen === 'windows'}
        onClose={() => setDrawerOpen(null)}
        doorSensors={doorSensors}
        windowSensors={windowSensors}
        otherContactSensors={otherContactSensors}
        initialTab={openingsTab}
        darkMode={darkMode}
      />

      <SensorsOverviewDrawer
        isOpen={drawerOpen === 'sensors'}
        onClose={() => setDrawerOpen(null)}
        motionSensors={motionSensors}
        leakSensors={leakSensors}
        smokeSensors={smokeSensors}
        initialTab={sensorsTab}
        darkMode={darkMode}
      />

      <AlarmKeypadModal
        isOpen={drawerOpen === 'alarm'}
        onClose={() => setDrawerOpen(null)}
        alarmEntity={alarmEntity}
        onUpdateEntity={updateEntityState}
        darkMode={darkMode}
      />

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
    </section>
  );
}
