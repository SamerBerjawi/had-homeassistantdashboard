import React, { useState } from 'react';
import { 
  Users, 
  User, 
  Lightbulb, 
  Fan, 
  Door, 
  DoorOpen, 
  FrameCorners, 
  ShieldCheck, 
  ShieldWarning, 
  LockOpen, 
  Play, 
  Pause, 
  Power, 
  CaretRight, 
  MusicNotes, 
  Disc,
  PersonSimpleWalk,
  Drop,
  Flame,
  Warning,
  Shield
} from '@phosphor-icons/react';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { ResolvedEntity } from '../../types';
import { getHAImageUrl } from '../../lib/utils';

// Interactive Slide-over Right Drawers
import UsersPresenceModal from './modals/UsersPresenceModal';
import LightsOverviewModal from './modals/LightsOverviewModal';
import FansOverviewModal from './modals/FansOverviewModal';
import OpeningsOverviewModal from './modals/OpeningsOverviewModal';
import AlarmKeypadModal from './modals/AlarmKeypadModal';
import MediaOverviewDrawer from './modals/MediaOverviewDrawer';
import SensorsOverviewDrawer from './modals/SensorsOverviewDrawer';
import WeatherOverviewDrawer from '../weather/WeatherOverviewDrawer';
import WeatherBadge from '../weather/WeatherBadge';
import AnimatedWeatherBackdrop from '../weather/AnimatedWeatherBackdrop';
import { getWeatherConditionInfo } from '../weather/weatherIcons';

interface OverviewHeaderProps {
  darkMode?: boolean;
}

export default function OverviewHeader({ darkMode = true }: OverviewHeaderProps) {
  const { 
    domainGroups, 
    overviewSummary, 
    securityOverview, 
    updateEntityState,
    callHAService,
    serverUrl,
    selectedWeatherEntityId,
    selectedAlarmEntityId
  } = useAutoLayoutStore();

  // Active Right Sidebar State
  const [drawerOpen, setDrawerOpen] = useState<
    'users' | 'lights' | 'fans' | 'doors' | 'windows' | 'alarm' | 'media' | 'sensors' | 'weather' | null
  >(null);

  const [selectedUser, setSelectedUser] = useState<ResolvedEntity | null>(null);
  const [openingsTab, setOpeningsTab] = useState<'all' | 'doors' | 'windows' | 'other'>('all');
  const [sensorsTab, setSensorsTab] = useState<'all' | 'motion' | 'leak' | 'smoke'>('all');

  // Entities Breakdown directly from HA Domain Groups
  const userEntities: ResolvedEntity[] = [
    ...(domainGroups['person'] || []),
    ...(domainGroups['device_tracker'] || [])
  ];
  const lightEntities: ResolvedEntity[] = domainGroups['light'] || [];
  const fanEntities: ResolvedEntity[] = domainGroups['fan'] || [];
  const mediaEntities: ResolvedEntity[] = domainGroups['media_player'] || [];
  const alarmEntities: ResolvedEntity[] = domainGroups['alarm_control_panel'] || [];
  const alarmEntity: ResolvedEntity | undefined = 
    alarmEntities.find(a => a.entity_id === selectedAlarmEntityId) || 
    alarmEntities[0];

  // Classify all binary sensors (Doors, Windows, Motion, Moisture/Leak, Smoke/Hazard)
  const allBinary: ResolvedEntity[] = domainGroups['binary_sensor'] || [];

  const isDoor = (e: ResolvedEntity) =>
    e.attributes.device_class === 'door' ||
    e.attributes.device_class === 'garage_door' ||
    e.entity_id.includes('door') ||
    e.entity_id.includes('garage') ||
    e.entity_id.includes('gate');

  const isWindow = (e: ResolvedEntity) =>
    e.attributes.device_class === 'window' ||
    e.entity_id.includes('window');

  const isMotion = (e: ResolvedEntity) =>
    e.attributes.device_class === 'motion' ||
    e.attributes.device_class === 'occupancy' ||
    e.attributes.device_class === 'presence' ||
    e.entity_id.includes('motion') ||
    e.entity_id.includes('occupancy') ||
    e.entity_id.includes('presence');

  const isLeak = (e: ResolvedEntity) =>
    e.attributes.device_class === 'moisture' ||
    e.attributes.device_class === 'water' ||
    e.entity_id.includes('leak') ||
    e.entity_id.includes('flood') ||
    e.entity_id.includes('moisture');

  const isSmoke = (e: ResolvedEntity) =>
    e.attributes.device_class === 'smoke' ||
    e.attributes.device_class === 'gas' ||
    e.attributes.device_class === 'carbon_monoxide' ||
    e.entity_id.includes('smoke') ||
    e.entity_id.includes('co_detector') ||
    e.entity_id.includes('gas');

  const isOtherContact = (e: ResolvedEntity) =>
    !isDoor(e) &&
    !isWindow(e) &&
    !isMotion(e) &&
    !isLeak(e) &&
    !isSmoke(e) &&
    (
      e.attributes.device_class === 'opening' ||
      e.attributes.device_class === 'safety' ||
      e.attributes.device_class === 'tamper' ||
      e.attributes.device_class === 'lock' ||
      e.entity_id.includes('contact') ||
      e.entity_id.includes('safe') ||
      e.entity_id.includes('cabinet') ||
      e.entity_id.includes('mailbox')
    );

  const doorSensors = allBinary.filter(isDoor);
  const windowSensors = allBinary.filter(isWindow);
  const motionSensors = allBinary.filter(isMotion);
  const leakSensors = allBinary.filter(isLeak);
  const smokeSensors = allBinary.filter(isSmoke);
  const otherContactSensors = allBinary.filter(isOtherContact);

  const activeMedia = mediaEntities.find(m => m.state === 'playing') || mediaEntities[0];
  const activeMediaCount = mediaEntities.filter(m => m.state === 'playing').length;

  // Calculated Real Metrics
  const homeUsers = userEntities.filter(u => u.state === 'home');
  const onLights = lightEntities.filter(l => l.state === 'on');
  const activeFans = fanEntities.filter(f => f.state === 'on');
  const openDoors = doorSensors.filter(d => d.state === 'on');
  const openWindows = windowSensors.filter(w => w.state === 'on');
  const activeMotion = motionSensors.filter(m => m.state === 'on');
  const activeLeaks = leakSensors.filter(l => l.state === 'on' || l.state === 'wet' || l.state === 'detected');
  const activeSmoke = smokeSensors.filter(s => s.state === 'on' || s.state === 'detected' || s.state === 'smoke');

  const isAlarmArmed = alarmEntity?.state && alarmEntity.state !== 'disarmed';
  const isPlayingMedia = activeMedia?.state === 'playing';

  // Weather Entity Resolution
  const weatherEntities: ResolvedEntity[] = domainGroups['weather'] || [];
  const activeWeather: ResolvedEntity | undefined = 
    weatherEntities.find(w => w.entity_id === selectedWeatherEntityId) || 
    weatherEntities[0];
  const weatherState = activeWeather?.state || 'partlycloudy';
  const isWeatherNight = weatherState.toLowerCase().includes('night');
  const weatherCondition = getWeatherConditionInfo(weatherState, isWeatherNight, 22);
  const weatherTemp = typeof activeWeather?.attributes?.temperature === 'number' 
    ? Math.round(activeWeather.attributes.temperature) 
    : 22;
  const weatherTempUnit = activeWeather?.attributes?.temperature_unit || '°C';
  const weatherApparent = typeof activeWeather?.attributes?.apparent_temperature === 'number'
    ? activeWeather.attributes.apparent_temperature.toFixed(1)
    : (weatherTemp - 0.7).toFixed(1);

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

  // Quick Action Toggles
  const handleToggleLightBatch = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shouldTurnOff = onLights.length > 0;
    const targetEntities = shouldTurnOff ? onLights : lightEntities;
    targetEntities.forEach((l) => {
      updateEntityState(l.entity_id, shouldTurnOff ? 'off' : 'on', {
        brightness: shouldTurnOff ? 0 : 80
      });
    });
  };

  const handleToggleFanBatch = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shouldTurnOff = activeFans.length > 0;
    const targetEntities = shouldTurnOff ? activeFans : fanEntities;
    targetEntities.forEach((f) => {
      updateEntityState(f.entity_id, shouldTurnOff ? 'off' : 'on', {
        percentage: shouldTurnOff ? 0 : 66
      });
    });
  };

  const handleTogglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeMedia) return;
    updateEntityState(activeMedia.entity_id, isPlayingMedia ? 'paused' : 'playing');
  };

  const handleQuickAlarmToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!alarmEntity) return;
    const nextService = isAlarmArmed ? 'alarm_disarm' : 'alarm_arm_home';
    await callHAService('alarm_control_panel', nextService, {}, { entity_id: alarmEntity.entity_id });
  };

  const getAlarmStateDetails = () => {
    const st = alarmEntity?.state || 'disarmed';
    if (st === 'armed_home') {
      return {
        label: 'Armed (Home)',
        bg: darkMode ? 'bg-emerald-500/15' : 'bg-emerald-50',
        border: darkMode ? 'border-emerald-500/30' : 'border-emerald-200',
        text: darkMode ? 'text-emerald-300' : 'text-emerald-700'
      };
    }
    if (st === 'armed_away') {
      return {
        label: 'Armed (Away)',
        bg: darkMode ? 'bg-rose-500/15' : 'bg-rose-50',
        border: darkMode ? 'border-rose-500/30' : 'border-rose-200',
        text: darkMode ? 'text-rose-300' : 'text-rose-700'
      };
    }
    if (st === 'armed_night') {
      return {
        label: 'Armed (Night)',
        bg: darkMode ? 'bg-indigo-500/15' : 'bg-indigo-50',
        border: darkMode ? 'border-indigo-500/30' : 'border-indigo-200',
        text: darkMode ? 'text-indigo-300' : 'text-indigo-700'
      };
    }
    return {
      label: 'Disarmed',
      bg: darkMode ? 'bg-white/5' : 'bg-slate-100',
      border: darkMode ? 'border-white/10' : 'border-slate-200',
      text: darkMode ? 'text-slate-400' : 'text-slate-600'
    };
  };

  const alarmDetails = getAlarmStateDetails();

  return (
    <section className="space-y-4 mb-6">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP STATUS BADGES CLUSTER (FULLY SEPARATE PILLS)            */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        
        {/* Left Sub-title Status info */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
            Real-time Telemetry
          </span>
        </div>

        {/* Right Badges Cluster - All Fully Separate Individual Pills */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Standalone Individual User Badges */}
          {userEntities.map((user) => {
            const isHome = user.state === 'home';
            const rawPic = user.attributes?.entity_picture;
            const picUrl = getHAImageUrl(rawPic, serverUrl);
            const firstName = user.name.split(' ')[0];

            return (
              <button
                key={user.entity_id}
                type="button"
                onClick={() => openUsersDrawer(user)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 border ${
                  isHome
                    ? darkMode
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                    : darkMode
                      ? 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10 opacity-75'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                }`}
                title={`${user.name}: ${isHome ? 'At Home' : user.state}`}
              >
                <div className="relative">
                  {picUrl ? (
                    <img
                      src={picUrl}
                      alt={user.name}
                      className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-300 dark:ring-slate-900"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-indigo-600 ring-1 ring-slate-300 dark:ring-slate-900 flex items-center justify-center text-[9px] font-bold text-white">
                      {user.name.charAt(0)}
                    </div>
                  )}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-slate-950 ${
                      isHome ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-slate-400 dark:bg-slate-500'
                    }`}
                  />
                </div>
                <span>{firstName}</span>
              </button>
            );
          })}

          {/* Standalone Separate Doors Badge */}
          <button
            type="button"
            onClick={openDoorsDrawer}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 ${
              openDoors.length > 0
                ? darkMode
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
                  : 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                : darkMode
                  ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            {openDoors.length > 0 ? (
              <DoorOpen size={15} weight="duotone" className="text-amber-500 dark:text-amber-400" />
            ) : (
              <Door size={15} weight="duotone" className="text-emerald-600 dark:text-emerald-400" />
            )}
            <span>{openDoors.length > 0 ? `${openDoors.length} Door${openDoors.length === 1 ? '' : 's'} Open` : `Doors (${doorSensors.length})`}</span>
          </button>

          {/* Standalone Separate Windows Badge */}
          <button
            type="button"
            onClick={openWindowsDrawer}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 ${
              openWindows.length > 0
                ? darkMode
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
                  : 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                : darkMode
                  ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            <FrameCorners size={15} weight="duotone" className={openWindows.length > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'} />
            <span>{openWindows.length > 0 ? `${openWindows.length} Win Open` : `Windows (${windowSensors.length})`}</span>
          </button>

          {/* Standalone Motion Sensors Badge */}
          <button
            type="button"
            onClick={() => openSensorsDrawer('motion')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 ${
              activeMotion.length > 0
                ? darkMode
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
                  : 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs'
                : darkMode
                  ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            <PersonSimpleWalk size={15} weight="duotone" className={activeMotion.length > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'} />
            <span>{activeMotion.length > 0 ? `${activeMotion.length} Motion Active` : `Motion (${motionSensors.length})`}</span>
          </button>

          {/* Standalone Water Leakage Sensors Badge */}
          <button
            type="button"
            onClick={() => openSensorsDrawer('leak')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 ${
              activeLeaks.length > 0
                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/50 animate-bounce'
                : darkMode
                  ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            <Drop size={15} weight="duotone" className={activeLeaks.length > 0 ? 'text-rose-500 animate-pulse' : 'text-sky-500 dark:text-sky-400'} />
            <span>{activeLeaks.length > 0 ? `${activeLeaks.length} LEAK DETECTED` : `Dry / Sealed (${leakSensors.length})`}</span>
          </button>

          {/* Standalone Smoke & Fire Detection Badge */}
          <button
            type="button"
            onClick={() => openSensorsDrawer('smoke')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 ${
              activeSmoke.length > 0
                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/50 animate-bounce'
                : darkMode
                  ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            <Flame size={15} weight="duotone" className={activeSmoke.length > 0 ? 'text-rose-500 animate-pulse' : 'text-emerald-600 dark:text-emerald-400'} />
            <span>{activeSmoke.length > 0 ? `${activeSmoke.length} SMOKE DETECTED` : `Smoke Clear (${smokeSensors.length})`}</span>
          </button>

          {/* Standalone Separate Music / Media Player Badge */}
          <button
            type="button"
            onClick={() => setDrawerOpen('media')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 ${
              isPlayingMedia
                ? darkMode
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
                  : 'bg-purple-50 text-purple-800 border-purple-300 shadow-xs'
                : darkMode
                  ? 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
            }`}
          >
            <MusicNotes size={15} weight="duotone" className="text-purple-500 dark:text-purple-400 shrink-0" />
            {isPlayingMedia ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="truncate max-w-28 sm:max-w-36 font-semibold">
                  {activeMedia?.attributes?.media_title || 'Playing'}
                </span>
                <span className="flex items-end gap-0.5 h-3 shrink-0">
                  <span className="w-0.5 bg-purple-500 dark:bg-purple-400 rounded-full animate-bounce" style={{ height: '70%', animationDuration: '0.6s' }} />
                  <span className="w-0.5 bg-purple-500 dark:bg-purple-400 rounded-full animate-bounce" style={{ height: '100%', animationDuration: '0.8s' }} />
                  <span className="w-0.5 bg-purple-500 dark:bg-purple-400 rounded-full animate-bounce" style={{ height: '50%', animationDuration: '0.7s' }} />
                </span>
              </div>
            ) : (
              <span>Audio ({mediaEntities.length})</span>
            )}
          </button>

          {/* Standalone Alarm Status Badge */}
          <button
            type="button"
            onClick={() => setDrawerOpen('alarm')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 ${alarmDetails.bg} ${alarmDetails.text} ${alarmDetails.border}`}
          >
            {isAlarmArmed ? <ShieldCheck size={15} weight="duotone" /> : <LockOpen size={15} weight="duotone" />}
            <span>{alarmDetails.label}</span>
          </button>

          {/* Standalone Lights Badge */}
          <button
            type="button"
            onClick={() => setDrawerOpen('lights')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 ${
              onLights.length > 0
                ? darkMode
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
                : darkMode
                  ? 'bg-white/5 text-slate-400 border-white/10'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <Lightbulb size={15} weight="duotone" className="text-amber-500 dark:text-amber-400" />
            <span>{onLights.length} Lights</span>
          </button>

          {/* Standalone Fans Badge */}
          <button
            type="button"
            onClick={() => setDrawerOpen('fans')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 ${
              activeFans.length > 0
                ? darkMode
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                  : 'bg-cyan-50 text-cyan-800 border-cyan-300'
                : darkMode
                  ? 'bg-white/5 text-slate-400 border-white/10'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <Fan size={15} weight="duotone" className={`text-cyan-500 dark:text-cyan-400 ${activeFans.length > 0 ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
            <span>{activeFans.length} Fans</span>
          </button>

          {/* Standalone Weather Badge */}
          <WeatherBadge
            onClick={() => setDrawerOpen('weather')}
            darkMode={darkMode}
          />

        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. FEATURED HEADER OVERVIEW TILES (BENTO GRID)                 */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-9 gap-3.5">
        
        {/* TILE 1: USERS & FAMILY PRESENCE */}
        <div
          onClick={() => openUsersDrawer()}
          className={`group relative p-4 rounded-3xl backdrop-blur-xl border shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px] ${
            darkMode
              ? 'bg-slate-900/60 hover:bg-slate-900/80 border-white/10 hover:border-indigo-500/40 text-white'
              : 'bg-white/85 hover:bg-white border-slate-200/90 hover:border-indigo-300 text-slate-900 shadow-slate-200/60'
          }`}
        >
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-indigo-500/15 rounded-full blur-2xl group-hover:bg-indigo-500/25 transition-all pointer-events-none" />

          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <Users size={22} weight="duotone" />
            </div>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              {homeUsers.length} Home
            </span>
          </div>

          <div className="flex items-center -space-x-2.5 my-2 relative z-10">
            {userEntities.slice(0, 4).map((user) => {
              const isHome = user.state === 'home';
              const rawPicture = user.attributes?.entity_picture;
              const pictureUrl = getHAImageUrl(rawPicture, serverUrl);

              return (
                <div key={user.entity_id} className="relative group/avatar" title={`${user.name} (${user.state})`}>
                  {pictureUrl ? (
                    <img
                      src={pictureUrl}
                      alt={user.name}
                      className={`w-9 h-9 rounded-full object-cover ring-2 transition-all ${
                        isHome ? 'ring-emerald-500 dark:ring-emerald-400' : 'ring-slate-300 dark:ring-slate-600 opacity-60'
                      }`}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ${
                      isHome ? 'bg-indigo-600 ring-emerald-500 dark:ring-emerald-400' : 'bg-slate-500 dark:bg-slate-700 ring-slate-300 dark:ring-slate-600 opacity-60'
                    }`}>
                      {user.name.charAt(0)}
                    </div>
                  )}
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-900 ${
                      isHome ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-slate-400 dark:bg-slate-500'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          <div className="relative z-10 mt-1">
            <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">Family Presence</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
              <span>{homeUsers.map(u => u.name.split(' ')[0]).join(', ') || 'No one home'}</span>
              <CaretRight size={14} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* TILE 2: LIGHTS ON / TOTAL */}
        <div
          onClick={() => setDrawerOpen('lights')}
          className={`group relative p-4 rounded-3xl backdrop-blur-xl border shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px] ${
            onLights.length > 0
              ? darkMode
                ? 'bg-slate-900/70 hover:bg-slate-900/90 border-amber-500/30 hover:border-amber-400/60 text-white'
                : 'bg-amber-50/50 hover:bg-amber-50/80 border-amber-200/90 hover:border-amber-300 text-slate-900'
              : darkMode
                ? 'bg-slate-900/60 hover:bg-slate-900/80 border-white/10 hover:border-white/20 text-white'
                : 'bg-white/85 hover:bg-white border-slate-200/90 hover:border-slate-300 text-slate-900 shadow-slate-200/60'
          }`}
        >
          <div className={`absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl transition-all pointer-events-none ${
            onLights.length > 0 ? 'bg-amber-500/20 group-hover:bg-amber-500/30' : 'bg-slate-500/5'
          }`} />

          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-xs transition-all ${
              onLights.length > 0
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-600 dark:text-amber-300 shadow-amber-500/20'
                : 'bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/15 text-slate-500 dark:text-slate-400'
            }`}>
              <Lightbulb size={22} weight="duotone" />
            </div>

            <button
              type="button"
              onClick={handleToggleLightBatch}
              className={`w-7 h-7 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                onLights.length > 0
                  ? 'bg-amber-500/25 text-amber-700 dark:text-amber-300 border-amber-400/40 hover:bg-amber-500/40'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/15'
              }`}
              title={onLights.length > 0 ? 'Turn all off' : 'Turn on lights'}
            >
              <Power size={14} weight="bold" />
            </button>
          </div>

          <div className="my-1 relative z-10">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{onLights.length}</span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">/ {lightEntities.length} On</span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="text-sm font-bold text-slate-900 dark:text-white">Lighting</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
              <span>{onLights.length > 0 ? `${onLights.length} active fixtures` : 'All lights off'}</span>
              <CaretRight size={14} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-amber-500 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* TILE 3: FANS ON / VENTILATION */}
        <div
          onClick={() => setDrawerOpen('fans')}
          className={`group relative p-4 rounded-3xl backdrop-blur-xl border shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px] ${
            activeFans.length > 0
              ? darkMode
                ? 'bg-slate-900/70 hover:bg-slate-900/90 border-cyan-500/30 hover:border-cyan-400/60 text-white'
                : 'bg-cyan-50/50 hover:bg-cyan-50/80 border-cyan-200/90 hover:border-cyan-300 text-slate-900'
              : darkMode
                ? 'bg-slate-900/60 hover:bg-slate-900/80 border-white/10 hover:border-white/20 text-white'
                : 'bg-white/85 hover:bg-white border-slate-200/90 hover:border-slate-300 text-slate-900 shadow-slate-200/60'
          }`}
        >
          <div className={`absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl transition-all pointer-events-none ${
            activeFans.length > 0 ? 'bg-cyan-500/20 group-hover:bg-cyan-500/30' : 'bg-slate-500/5'
          }`} />

          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-xs transition-all ${
              activeFans.length > 0
                ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-600 dark:text-cyan-300 shadow-cyan-500/20'
                : 'bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/15 text-slate-500 dark:text-slate-400'
            }`}>
              <Fan size={22} weight="duotone" className={activeFans.length > 0 ? 'animate-spin' : ''} style={{ animationDuration: '2s' }} />
            </div>

            <button
              type="button"
              onClick={handleToggleFanBatch}
              className={`w-7 h-7 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                activeFans.length > 0
                  ? 'bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 border-cyan-400/40 hover:bg-cyan-500/40'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/15'
              }`}
              title={activeFans.length > 0 ? 'Turn all off' : 'Turn fans on'}
            >
              <Power size={14} weight="bold" />
            </button>
          </div>

          <div className="my-1 relative z-10">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{activeFans.length}</span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">/ {fanEntities.length} Running</span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="text-sm font-bold text-slate-900 dark:text-white">Fans & Airflow</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
              <span>{activeFans.length > 0 ? 'Circulating fresh air' : 'All fans idle'}</span>
              <CaretRight size={14} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* TILE 4: DOORS OPEN / CLOSED */}
        <div
          onClick={openDoorsDrawer}
          className={`group relative p-4 rounded-3xl backdrop-blur-xl border shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px] ${
            openDoors.length > 0
              ? darkMode
                ? 'bg-slate-900/70 hover:bg-slate-900/90 border-amber-500/30 hover:border-amber-400/60 text-white'
                : 'bg-amber-50/50 hover:bg-amber-50/80 border-amber-200/90 hover:border-amber-300 text-slate-900'
              : darkMode
                ? 'bg-slate-900/60 hover:bg-slate-900/80 border-white/10 hover:border-white/20 text-white'
                : 'bg-white/85 hover:bg-white border-slate-200/90 hover:border-slate-300 text-slate-900 shadow-slate-200/60'
          }`}
        >
          <div className={`absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl transition-all pointer-events-none ${
            openDoors.length > 0 ? 'bg-amber-500/20 group-hover:bg-amber-500/30' : 'bg-emerald-500/10'
          }`} />

          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-xs transition-all ${
              openDoors.length > 0
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-600 dark:text-amber-300 animate-pulse'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            }`}>
              {openDoors.length > 0 ? <DoorOpen size={22} weight="duotone" /> : <Door size={22} weight="duotone" />}
            </div>

            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
              openDoors.length > 0
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
            }`}>
              {openDoors.length > 0 ? `${openDoors.length} Open` : 'Secure'}
            </span>
          </div>

          <div className="my-1 relative z-10">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black ${openDoors.length > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-slate-900 dark:text-white'}`}>
                {openDoors.length}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">/ {doorSensors.length} Doors Open</span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="text-sm font-bold text-slate-900 dark:text-white">Entry Doors</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
              <span>{openDoors.length > 0 ? openDoors[0].name : 'All doors closed'}</span>
              <CaretRight size={14} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-amber-500 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* TILE 5: WINDOWS OPEN / CLOSED */}
        <div
          onClick={openWindowsDrawer}
          className={`group relative p-4 rounded-3xl backdrop-blur-xl border shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px] ${
            openWindows.length > 0
              ? darkMode
                ? 'bg-slate-900/70 hover:bg-slate-900/90 border-amber-500/30 hover:border-amber-400/60 text-white'
                : 'bg-amber-50/50 hover:bg-amber-50/80 border-amber-200/90 hover:border-amber-300 text-slate-900'
              : darkMode
                ? 'bg-slate-900/60 hover:bg-slate-900/80 border-white/10 hover:border-white/20 text-white'
                : 'bg-white/85 hover:bg-white border-slate-200/90 hover:border-slate-300 text-slate-900 shadow-slate-200/60'
          }`}
        >
          <div className={`absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl transition-all pointer-events-none ${
            openWindows.length > 0 ? 'bg-amber-500/20 group-hover:bg-amber-500/30' : 'bg-emerald-500/10'
          }`} />

          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-xs transition-all ${
              openWindows.length > 0
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-600 dark:text-amber-300 animate-pulse'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            }`}>
              <FrameCorners size={22} weight="duotone" className={openWindows.length > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-emerald-600 dark:text-emerald-400'} />
            </div>

            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
              openWindows.length > 0
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
            }`}>
              {openWindows.length > 0 ? `${openWindows.length} Open` : 'Sealed'}
            </span>
          </div>

          <div className="my-1 relative z-10">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black ${openWindows.length > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-slate-900 dark:text-white'}`}>
                {openWindows.length}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">/ {windowSensors.length} Windows Open</span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="text-sm font-bold text-slate-900 dark:text-white">Windows</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
              <span>{openWindows.length > 0 ? openWindows[0].name : 'All windows shut'}</span>
              <CaretRight size={14} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-amber-500 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* TILE 6: MOTION & ENVIRONMENTAL SENSORS (LEAKS / SMOKE) */}
        <div
          onClick={() => openSensorsDrawer('all')}
          className={`group relative p-4 rounded-3xl backdrop-blur-xl border shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px] ${
            activeLeaks.length > 0 || activeSmoke.length > 0
              ? 'bg-rose-500/15 border-rose-500/40 text-slate-900 dark:text-white shadow-rose-500/10'
              : activeMotion.length > 0
                ? darkMode
                  ? 'bg-slate-900/70 hover:bg-slate-900/90 border-amber-500/30 hover:border-amber-400/60 text-white'
                  : 'bg-amber-50/50 hover:bg-amber-50/80 border-amber-200/90 hover:border-amber-300 text-slate-900'
                : darkMode
                  ? 'bg-slate-900/60 hover:bg-slate-900/80 border-white/10 hover:border-white/20 text-white'
                  : 'bg-white/85 hover:bg-white border-slate-200/90 hover:border-slate-300 text-slate-900 shadow-slate-200/60'
          }`}
        >
          <div className={`absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl transition-all pointer-events-none ${
            activeLeaks.length > 0 || activeSmoke.length > 0 ? 'bg-rose-500/30' : activeMotion.length > 0 ? 'bg-amber-500/20' : 'bg-emerald-500/10'
          }`} />

          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-xs transition-all ${
              activeLeaks.length > 0 || activeSmoke.length > 0
                ? 'bg-rose-500/25 border-rose-500/50 text-rose-600 dark:text-rose-400 animate-pulse'
                : activeMotion.length > 0
                  ? 'bg-amber-500/20 border-amber-400/40 text-amber-600 dark:text-amber-300'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            }`}>
              {activeLeaks.length > 0 ? (
                <Drop size={22} weight="duotone" />
              ) : activeSmoke.length > 0 ? (
                <Flame size={22} weight="duotone" />
              ) : (
                <PersonSimpleWalk size={22} weight="duotone" />
              )}
            </div>

            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
              activeLeaks.length > 0 || activeSmoke.length > 0
                ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40 animate-pulse'
                : activeMotion.length > 0
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
            }`}>
              {activeLeaks.length > 0 ? 'Leak Alert' : activeSmoke.length > 0 ? 'Smoke Alert' : activeMotion.length > 0 ? 'Active' : 'Clear'}
            </span>
          </div>

          <div className="my-1 relative z-10">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {activeMotion.length}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                / {motionSensors.length + leakSensors.length + smokeSensors.length} Sensors
              </span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="text-sm font-bold text-slate-900 dark:text-white">Safety & Sensors</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
              <span>{activeLeaks.length > 0 ? 'Moisture hazard detected' : activeSmoke.length > 0 ? 'Smoke detector triggered' : activeMotion.length > 0 ? `${activeMotion.length} motion zones` : 'All safe & dry'}</span>
              <CaretRight size={14} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-amber-500 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* TILE 7: ALARM STATE */}
        <div
          onClick={() => setDrawerOpen('alarm')}
          className={`group relative p-4 rounded-3xl backdrop-blur-xl border shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px] ${
            isAlarmArmed
              ? darkMode
                ? 'bg-slate-900/70 hover:bg-slate-900/90 border-emerald-500/30 hover:border-emerald-400/60 text-white'
                : 'bg-emerald-50/50 hover:bg-emerald-50/80 border-emerald-200/90 hover:border-emerald-300 text-slate-900'
              : darkMode
                ? 'bg-slate-900/60 hover:bg-slate-900/80 border-white/10 hover:border-white/20 text-white'
                : 'bg-white/85 hover:bg-white border-slate-200/90 hover:border-slate-300 text-slate-900 shadow-slate-200/60'
          }`}
        >
          <div className={`absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl transition-all pointer-events-none ${
            isAlarmArmed ? 'bg-emerald-500/20 group-hover:bg-emerald-500/30' : 'bg-slate-500/10'
          }`} />

          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-xs transition-all ${alarmDetails.bg} ${alarmDetails.border} ${alarmDetails.text}`}>
              {isAlarmArmed ? <ShieldCheck size={22} weight="duotone" /> : <LockOpen size={22} weight="duotone" />}
            </div>

            <button
              type="button"
              onClick={handleQuickAlarmToggle}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase border transition-all cursor-pointer ${
                isAlarmArmed
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/15'
              }`}
              title={isAlarmArmed ? 'Click to disarm' : 'Click to arm'}
            >
              {isAlarmArmed ? 'Arm Home' : 'Disarmed'}
            </button>
          </div>

          <div className="my-1 relative z-10">
            <div className="text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
              {alarmDetails.label}
            </div>
          </div>

          <div className="relative z-10">
            <div className="text-sm font-bold text-slate-900 dark:text-white">Security Guard</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
              <span>{alarmEntity?.attributes?.armed_at || (isAlarmArmed ? 'Perimeter active' : 'Disarmed')}</span>
              <CaretRight size={14} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* TILE 8: MUSIC / MEDIA PLAYING HERO TILE */}
        <div
          onClick={() => setDrawerOpen('media')}
          className={`group relative p-4 rounded-3xl backdrop-blur-xl border shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px] ${
            isPlayingMedia
              ? darkMode
                ? 'bg-linear-to-br from-purple-950/40 via-slate-900/80 to-slate-900/90 border-purple-500/25 hover:border-purple-400/50 text-white'
                : 'bg-linear-to-br from-purple-50 via-white to-slate-50 border-purple-200 hover:border-purple-300 text-slate-900 shadow-purple-500/5'
              : darkMode
                ? 'bg-slate-900/60 hover:bg-slate-900/80 border-white/10 hover:border-white/20 text-white'
                : 'bg-white/85 hover:bg-white border-slate-200/90 hover:border-slate-300 text-slate-900 shadow-slate-200/60'
          }`}
        >
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-purple-500/30 transition-all pointer-events-none" />

          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className="relative w-10 h-10 rounded-2xl overflow-hidden ring-1 ring-slate-300 dark:ring-white/20 shadow-xs">
              {getHAImageUrl(activeMedia?.attributes?.media_image, serverUrl) ? (
                <img
                  src={getHAImageUrl(activeMedia?.attributes?.media_image, serverUrl)}
                  alt="Album artwork"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-300">
                  <MusicNotes size={22} weight="duotone" />
                </div>
              )}
              {isPlayingMedia && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="flex items-end gap-0.5 h-4">
                    <span className="w-1 bg-white rounded-full animate-bounce" style={{ height: '70%', animationDuration: '0.6s' }} />
                    <span className="w-1 bg-white rounded-full animate-bounce" style={{ height: '100%', animationDuration: '0.8s' }} />
                    <span className="w-1 bg-white rounded-full animate-bounce" style={{ height: '50%', animationDuration: '0.7s' }} />
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleTogglePlayPause}
              className="w-8 h-8 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-xs transition-all cursor-pointer active:scale-95"
              title={isPlayingMedia ? 'Pause Audio' : 'Play Audio'}
            >
              {isPlayingMedia ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" className="ml-0.5" />}
            </button>
          </div>

          <div className="my-1 relative z-10 min-w-0">
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
              {activeMedia?.attributes?.media_title || (isPlayingMedia ? 'Playing Media' : 'No Media Playing')}
            </h4>
            <p className="text-xs text-purple-600 dark:text-purple-300 font-medium truncate">
              {activeMedia?.attributes?.media_artist || (activeMedia ? activeMedia.name : 'Idle')}
            </p>
          </div>

          <div className="relative z-10">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
              <span className="truncate">{activeMedia?.name || 'Media Player'}</span>
              <CaretRight size={14} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-purple-500 dark:group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          </div>
        </div>

        {/* TILE 9: WEATHER & ATMOSPHERIC FORECAST */}
        <div
          onClick={() => setDrawerOpen('weather')}
          className={`group relative p-4 rounded-3xl backdrop-blur-xl border shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px] ${
            darkMode
              ? 'bg-slate-900/70 hover:bg-slate-900/90 border-sky-500/25 hover:border-sky-400/50 text-white'
              : 'bg-linear-to-br from-sky-50 via-white to-slate-50 border-sky-200 hover:border-sky-300 text-slate-900 shadow-sky-500/5'
          }`}
        >
          {/* Animated Weather Backdrop inside tile */}
          <AnimatedWeatherBackdrop condition={weatherState} isNight={isWeatherNight} darkMode={darkMode} />

          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-white/20 dark:bg-white/10 backdrop-blur-md border border-slate-200/50 dark:border-white/20 flex items-center justify-center shadow-xs group-hover:rotate-6 transition-transform">
              {weatherCondition.icon}
            </div>

            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-sky-500/30 bg-sky-500/15 text-sky-600 dark:text-sky-300 backdrop-blur-md">
              Live
            </span>
          </div>

          <div className="my-1 relative z-10 min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono drop-shadow-xs">
                {weatherTemp}°
              </span>
              <span className="text-xs font-semibold text-sky-600 dark:text-sky-300">
                {weatherTempUnit}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
              {weatherCondition.name}
            </p>
          </div>

          <div className="relative z-10">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
              <span className="truncate">{activeWeather?.name || 'Local Weather'}</span>
              <CaretRight size={14} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. SLIDE-OVER RIGHT SIDEBARS                                  */}
      {/* ------------------------------------------------------------- */}
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

      <WeatherOverviewDrawer
        isOpen={drawerOpen === 'weather'}
        onClose={() => setDrawerOpen(null)}
        darkMode={darkMode}
      />
    </section>
  );
}
