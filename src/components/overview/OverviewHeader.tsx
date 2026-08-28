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
  Warning
} from '@phosphor-icons/react';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { useShallow } from 'zustand/react/shallow';
import { ResolvedEntity } from '../../types';
import { classifyBinarySensors } from '../../lib/entityClassifiers';
import { getHAImageUrl } from '../../lib/utils';
import PersonAvatar from '../ui/PersonAvatar';

// Interactive Slide-over Right Drawers
import UsersPresenceModal from './modals/UsersPresenceModal';
import LightsOverviewModal from './modals/LightsOverviewModal';
import SwitchesOverviewModal from './modals/SwitchesOverviewModal';
import FansOverviewModal from './modals/FansOverviewModal';
import OpeningsOverviewModal from './modals/OpeningsOverviewModal';
import AlarmKeypadModal from './modals/AlarmKeypadModal';
import MediaOverviewDrawer from './modals/MediaOverviewDrawer';
import SensorsOverviewDrawer from './modals/SensorsOverviewDrawer';

interface OverviewHeaderProps {
  darkMode?: boolean;
}

export default function OverviewHeader({ darkMode = true }: OverviewHeaderProps) {
  const { 
    domainGroups, 
    updateEntityState,
    callHAService,
    serverUrl,
    selectedAlarmEntityId
  } = useAutoLayoutStore(useShallow(s => ({
    domainGroups: s.domainGroups,
    updateEntityState: s.updateEntityState,
    callHAService: s.callHAService,
    serverUrl: s.serverUrl,
    selectedAlarmEntityId: s.selectedAlarmEntityId
  })));

  // Active Right Sidebar State
  const [drawerOpen, setDrawerOpen] = useState<
    'users' | 'lights' | 'switches' | 'fans' | 'doors' | 'windows' | 'alarm' | 'media' | 'sensors' | null
  >(null);

  const [selectedUser, setSelectedUser] = useState<ResolvedEntity | null>(null);
  const [openingsTab, setOpeningsTab] = useState<'all' | 'doors' | 'windows' | 'other'>('all');
  const [sensorsTab, setSensorsTab] = useState<'all' | 'motion' | 'leak' | 'smoke'>('all');

  // alarmEntity for keypad
  const alarmEntities: ResolvedEntity[] = domainGroups['alarm_control_panel'] || [];
  const alarmEntity: ResolvedEntity | undefined =
    alarmEntities.find(a => a.entity_id === selectedAlarmEntityId) ||
    alarmEntities[0];

  // Classify all binary sensors and devices
  const {
    doorSensors, windowSensors, motionSensors, leakSensors, smokeSensors, otherContactSensors,
    activeMedia, playingMediaEntities,
    userEntities, lightEntities, switchEntities, fanEntities, mediaEntities,
    homeUsers, onLights, onSwitches, activeFans, openDoors, openWindows, activeMotion, activeLeaks, activeSmoke
  } = useMemo(() => {
    const allBinary: ResolvedEntity[] = domainGroups['binary_sensor'] || [];
    const userEntitiesLocal = [...(domainGroups['person'] || []), ...(domainGroups['device_tracker'] || [])];
    const lightEntitiesLocal = domainGroups['light'] || [];
    const switchEntitiesLocal = domainGroups['switch'] || [];
    const fanEntitiesLocal = domainGroups['fan'] || [];
    const mediaEntitiesLocal = domainGroups['media_player'] || [];

    const {
      doorSensors: doors,
      windowSensors: windows,
      motionSensors: motions,
      leakSensors: leaks,
      smokeSensors: smokes,
      otherContactSensors: otherContacts
    } = classifyBinarySensors(allBinary);

    const activeMed = mediaEntitiesLocal.find(m => m.state === 'playing') || mediaEntitiesLocal[0];
    const playingMediaList = mediaEntitiesLocal.filter(m => m.state === 'playing');

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
      homeUsers: userEntitiesLocal.filter(u => u.state === 'home'),
      onLights: lightEntitiesLocal.filter(l => l.state === 'on'),
      onSwitches: switchEntitiesLocal.filter(s => s.state === 'on'),
      activeFans: fanEntitiesLocal.filter(f => f.state === 'on'),
      openDoors: doors.filter(d => d.state === 'on'),
      openWindows: windows.filter(w => w.state === 'on'),
      activeMotion: motions.filter(m => m.state === 'on'),
      activeLeaks: leaks.filter(l => l.state === 'on' || l.state === 'wet' || l.state === 'detected'),
      activeSmoke: smokes.filter(s => s.state === 'on' || s.state === 'detected' || s.state === 'smoke'),
    };
  }, [domainGroups]);

  const isAlarmArmed = alarmEntity?.state && alarmEntity.state !== 'disarmed';
  const isPlayingMedia = playingMediaEntities.length > 0;
  const singlePlayingMedia = playingMediaEntities.length === 1 ? playingMediaEntities[0] : null;
  const playingSongTitle = singlePlayingMedia?.attributes?.media_title || singlePlayingMedia?.attributes?.app_name || singlePlayingMedia?.name;


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

  const handleToggleSwitchBatch = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shouldTurnOff = onSwitches.length > 0;
    const targetEntities = shouldTurnOff ? onSwitches : switchEntities;
    targetEntities.forEach((s) => {
      updateEntityState(s.entity_id, shouldTurnOff ? 'off' : 'on');
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
      {/* 1. TOP HEADER BADGES CLUSTER (UNIFORM SAME HEIGHT h-9)        */}
      {/*    Order: 1. Persons -> 2. Controllables -> 3. Sensors        */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-2">
        
        {/* ========================================================= */}
        {/* 1.1 PERSONS BADGES (SECURITY DASHBOARD STYLE)              */}
        {/* ========================================================= */}
        {userEntities.map((user) => {
          const isHome = user.state === 'home';
          const firstName = user.name.split(' ')[0];

          return (
            <button
              key={user.entity_id}
              type="button"
              onClick={() => openUsersDrawer(user)}
              className={`h-9 pl-0.5 pr-2.5 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 border flex items-center gap-1.5 shadow-xs select-none ${
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
                className="w-7 h-7 shrink-0"
              />
              <span>{firstName}</span>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isHome ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            </button>
          );
        })}

        {/* ========================================================= */}
        {/* 1.2 CONTROLLABLE ENTITIES (LIGHTS, SWITCHES, FANS, AUDIO, ALARM) */}
        {/* ========================================================= */}

        {/* LIGHTS BADGE */}
        <button
          type="button"
          onClick={() => setDrawerOpen('lights')}
          className={`h-9 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs ${
            onLights.length > 0
              ? darkMode
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-amber-50 text-amber-800 border-amber-300'
              : darkMode
                ? 'bg-white/5 text-slate-400 border-white/10'
                : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          <Lightbulb size={16} weight={onLights.length > 0 ? 'fill' : 'regular'} className="text-amber-500 shrink-0" />
          <span>{onLights.length} Lights</span>
        </button>

        {/* SWITCHES BADGE */}
        <button
          type="button"
          onClick={() => setDrawerOpen('switches')}
          className={`h-9 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs ${
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
          <span>{onSwitches.length} Switches</span>
        </button>

        {/* FANS BADGE */}
        <button
          type="button"
          onClick={() => setDrawerOpen('fans')}
          className={`h-9 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs ${
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
          <span>{activeFans.length} Fans</span>
        </button>

        {/* AUDIO / MEDIA BADGE */}
        <button
          type="button"
          onClick={() => setDrawerOpen('media')}
          className={`h-9 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs max-w-[200px] sm:max-w-xs ${
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
          <span className="truncate">
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
          className={`h-9 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs ${
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
          <span>{isAlarmArmed ? 'Armed' : 'Alarm'}</span>
        </button>

        {/* ========================================================= */}
        {/* 1.3 SENSORS (DOORS, WINDOWS, MOTION, LEAKAGE, SMOKE)      */}
        {/* ========================================================= */}

        {/* DOORS BADGE */}
        <button
          type="button"
          onClick={openDoorsDrawer}
          className={`h-9 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs ${
            openDoors.length > 0
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
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
          <span>{openDoors.length} Doors</span>
        </button>

        {/* WINDOWS BADGE */}
        <button
          type="button"
          onClick={openWindowsDrawer}
          className={`h-9 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs ${
            openWindows.length > 0
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
              : darkMode
                ? 'bg-white/5 text-slate-400 border-white/10'
                : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          <FrameCorners size={16} weight="duotone" className={openWindows.length > 0 ? 'text-amber-500 shrink-0' : 'text-slate-400 shrink-0'} />
          <span>{openWindows.length} Windows</span>
        </button>

        {/* MOTION BADGE */}
        <button
          type="button"
          onClick={() => openSensorsDrawer('motion')}
          className={`h-9 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs ${
            activeMotion.length > 0
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
              : darkMode
                ? 'bg-white/5 text-slate-400 border-white/10'
                : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          <PersonSimpleWalk size={16} weight="duotone" className={activeMotion.length > 0 ? 'text-amber-500 shrink-0' : 'text-slate-400 shrink-0'} />
          <span>{activeMotion.length} Motion</span>
        </button>

        {/* LEAKAGE BADGE */}
        <button
          type="button"
          onClick={() => openSensorsDrawer('leak')}
          className={`h-9 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs ${
            activeLeaks.length > 0
              ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/40 animate-pulse'
              : darkMode
                ? 'bg-white/5 text-slate-400 border-white/10'
                : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          <Drop size={16} weight="duotone" className={activeLeaks.length > 0 ? 'text-rose-500 shrink-0' : 'text-slate-400 shrink-0'} />
          <span>{activeLeaks.length > 0 ? `${activeLeaks.length} Leaks` : '0 Leaks'}</span>
        </button>

        {/* SMOKE BADGE */}
        <button
          type="button"
          onClick={() => openSensorsDrawer('smoke')}
          className={`h-9 px-3 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs ${
            activeSmoke.length > 0
              ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/40 animate-pulse'
              : darkMode
                ? 'bg-white/5 text-slate-400 border-white/10'
                : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          <Flame size={16} weight="duotone" className={activeSmoke.length > 0 ? 'text-rose-500 shrink-0' : 'text-slate-400 shrink-0'} />
          <span>{activeSmoke.length > 0 ? `${activeSmoke.length} Smoke` : '0 Smoke'}</span>
        </button>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. BENTO TILES GRID (4-COLS MOBILE / ADAPTIVE DESKTOP)        */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-3.5">
        
        {/* 2.1 PERSONS / FAMILY PRESENCE */}
        <div
          onClick={() => openUsersDrawer()}
          className={`col-span-2 sm:col-span-1 group relative h-36 rounded-3xl border shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px] p-3.5 sm:p-4 ${
            darkMode
              ? 'bg-slate-900/80 hover:bg-slate-900 border-white/10 hover:border-indigo-500/40 text-white'
              : 'bg-white/80 hover:bg-white border-slate-200/90 hover:border-indigo-300 text-slate-900 shadow-slate-200/40'
          }`}
        >
          <div className="flex items-center justify-between relative z-10">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <Users size={20} weight="duotone" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              {homeUsers.length} Home
            </span>
          </div>

          <div className="flex items-center gap-2.5 my-auto py-1 relative z-10">
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
              <span>{homeUsers.map(u => u.name.split(' ')[0]).join(', ') || 'No one home'}</span>
              <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* 2.2 LIGHTS */}
        <div
          onClick={() => setDrawerOpen('lights')}
          className={`col-span-2 sm:col-span-1 group relative h-36 rounded-3xl border shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px] p-3.5 sm:p-4 ${
            onLights.length > 0
              ? darkMode
                ? 'bg-slate-900/90 hover:bg-slate-900 border-amber-500/30 hover:border-amber-400/60 text-white'
                : 'bg-amber-50/80 hover:bg-amber-50 border-amber-200/90 hover:border-amber-300 text-slate-900'
              : darkMode
                ? 'bg-slate-900/80 hover:bg-slate-900 border-white/10 hover:border-white/20 text-white'
                : 'bg-white/80 hover:bg-white border-slate-200/90 hover:border-slate-300 text-slate-900 shadow-slate-200/40'
          }`}
        >
          <div className="flex items-center justify-between relative z-10">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center border shadow-xs transition-all ${
              onLights.length > 0
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-600 dark:text-amber-300 shadow-amber-500/20'
                : 'bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/15 text-slate-500 dark:text-slate-400'
            }`}>
              <Lightbulb size={20} weight="duotone" />
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
              <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-amber-500 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* 2.3 SWITCHES */}
        <div
          onClick={() => setDrawerOpen('switches')}
          className={`col-span-2 sm:col-span-1 group relative h-36 rounded-3xl border shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px] p-3.5 sm:p-4 ${
            onSwitches.length > 0
              ? darkMode
                ? 'bg-slate-900/90 hover:bg-slate-900 border-emerald-500/30 hover:border-emerald-400/60 text-white'
                : 'bg-emerald-50/80 hover:bg-emerald-50 border-emerald-200/90 hover:border-emerald-300 text-slate-900'
              : darkMode
                ? 'bg-slate-900/80 hover:bg-slate-900 border-white/10 hover:border-white/20 text-white'
                : 'bg-white/80 hover:bg-white border-slate-200/90 hover:border-slate-300 text-slate-900 shadow-slate-200/40'
          }`}
        >
          <div className="flex items-center justify-between relative z-10">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center border shadow-xs transition-all ${
              onSwitches.length > 0
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-600 dark:text-emerald-300 shadow-emerald-500/20'
                : 'bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/15 text-slate-500 dark:text-slate-400'
            }`}>
              <ToggleRight size={20} weight="duotone" />
            </div>

            <button
              type="button"
              onClick={handleToggleSwitchBatch}
              className={`w-7 h-7 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                onSwitches.length > 0
                  ? 'bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border-emerald-400/40 hover:bg-emerald-500/40'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/15'
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
              <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* 2.4 FANS */}
        <div
          onClick={() => setDrawerOpen('fans')}
          className={`col-span-2 sm:col-span-1 group relative h-36 rounded-3xl border shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px] p-3.5 sm:p-4 ${
            activeFans.length > 0
              ? darkMode
                ? 'bg-slate-900/90 hover:bg-slate-900 border-cyan-500/30 hover:border-cyan-400/60 text-white'
                : 'bg-cyan-50/80 hover:bg-cyan-50 border-cyan-200/90 hover:border-cyan-300 text-slate-900'
              : darkMode
                ? 'bg-slate-900/80 hover:bg-slate-900 border-white/10 hover:border-white/20 text-white'
                : 'bg-white/80 hover:bg-white border-slate-200/90 hover:border-slate-300 text-slate-900 shadow-slate-200/40'
          }`}
        >
          <div className="flex items-center justify-between relative z-10">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center border shadow-xs transition-all ${
              activeFans.length > 0
                ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-600 dark:text-cyan-300 shadow-cyan-500/20'
                : 'bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/15 text-slate-500 dark:text-slate-400'
            }`}>
              <Fan size={20} weight="duotone" className={activeFans.length > 0 ? 'animate-spin' : ''} style={{ animationDuration: '2s' }} />
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
              <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* 2.5 AUDIO & MEDIA */}
        <div
          onClick={() => setDrawerOpen('media')}
          className={`col-span-2 sm:col-span-1 group relative h-36 rounded-3xl border shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px] p-3.5 sm:p-4 ${
            isPlayingMedia
              ? darkMode
                ? 'bg-slate-900/90 hover:bg-slate-900 border-purple-500/30 hover:border-purple-400/50 text-white'
                : 'bg-purple-50/80 hover:bg-purple-50 border-purple-200/90 hover:border-purple-300 text-slate-900 shadow-purple-500/10'
              : darkMode
                ? 'bg-slate-900/80 hover:bg-slate-900 border-white/10 hover:border-white/20 text-white'
                : 'bg-white/80 hover:bg-white border-slate-200/90 hover:border-slate-300 text-slate-900 shadow-slate-200/40'
          }`}
        >
          <div className="flex items-center justify-between relative z-10">
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl overflow-hidden ring-1 ring-slate-300 dark:ring-white/20 shadow-xs">
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
              <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-purple-500 dark:group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          </div>
        </div>

        {/* 2.6 ALARM & SECURITY */}
        <div
          onClick={() => setDrawerOpen('alarm')}
          className={`col-span-2 sm:col-span-1 group relative h-36 rounded-3xl border shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px] p-3.5 sm:p-4 ${
            isAlarmArmed
              ? darkMode
                ? 'bg-slate-900/90 hover:bg-slate-900 border-emerald-500/30 hover:border-emerald-400/60 text-white'
                : 'bg-emerald-50/80 hover:bg-emerald-50 border-emerald-200/90 hover:border-emerald-300 text-slate-900'
              : darkMode
                ? 'bg-slate-900/80 hover:bg-slate-900 border-white/10 hover:border-white/20 text-white'
                : 'bg-white/80 hover:bg-white border-slate-200/90 hover:border-slate-300 text-slate-900 shadow-slate-200/40'
          }`}
        >
          <div className="flex items-center justify-between relative z-10">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center border shadow-xs transition-all ${alarmDetails.bg} ${alarmDetails.border} ${alarmDetails.text}`}>
              {isAlarmArmed ? <ShieldCheck size={20} weight="duotone" /> : <LockOpen size={20} weight="duotone" />}
            </div>

            <button
              type="button"
              onClick={handleQuickAlarmToggle}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl text-[9px] sm:text-[10px] font-extrabold uppercase border transition-all cursor-pointer ${
                isAlarmArmed
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/15'
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
              <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* 2.7 ENTRY DOORS */}
        <div
          onClick={openDoorsDrawer}
          className={`col-span-2 sm:col-span-1 group relative h-36 rounded-3xl border shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px] p-3.5 sm:p-4 ${
            openDoors.length > 0
              ? darkMode
                ? 'bg-slate-900/90 hover:bg-slate-900 border-amber-500/30 hover:border-amber-400/60 text-white'
                : 'bg-amber-50/80 hover:bg-amber-50 border-amber-200/90 hover:border-amber-300 text-slate-900'
              : darkMode
                ? 'bg-slate-900/80 hover:bg-slate-900 border-white/10 hover:border-white/20 text-white'
                : 'bg-white/80 hover:bg-white border-slate-200/90 hover:border-slate-300 text-slate-900 shadow-slate-200/40'
          }`}
        >
          <div className="flex items-center justify-between relative z-10">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center border shadow-xs transition-all ${
              openDoors.length > 0
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-600 dark:text-amber-300 animate-pulse'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            }`}>
              {openDoors.length > 0 ? <DoorOpen size={20} weight="duotone" /> : <Door size={20} weight="duotone" />}
            </div>

            <span className={`text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
              openDoors.length > 0
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
            }`}>
              {openDoors.length > 0 ? `${openDoors.length} Open` : 'Secure'}
            </span>
          </div>

          <div className="relative z-10 my-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl sm:text-2xl font-black font-mono ${openDoors.length > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-slate-900 dark:text-white'}`}>
                {openDoors.length}
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">/ {doorSensors.length} Doors</span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Entry Doors</div>
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
              <span>{openDoors.length > 0 ? `${openDoors.length} open` : 'All doors closed'}</span>
              <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-amber-500 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* 2.8 WINDOWS */}
        <div
          onClick={openWindowsDrawer}
          className={`col-span-2 sm:col-span-1 group relative h-36 rounded-3xl border shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px] p-3.5 sm:p-4 ${
            openWindows.length > 0
              ? darkMode
                ? 'bg-slate-900/90 hover:bg-slate-900 border-amber-500/30 hover:border-amber-400/60 text-white'
                : 'bg-amber-50/80 hover:bg-amber-50 border-amber-200/90 hover:border-amber-300 text-slate-900'
              : darkMode
                ? 'bg-slate-900/80 hover:bg-slate-900 border-white/10 hover:border-white/20 text-white'
                : 'bg-white/80 hover:bg-white border-slate-200/90 hover:border-slate-300 text-slate-900 shadow-slate-200/40'
          }`}
        >
          <div className="flex items-center justify-between relative z-10">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center border shadow-xs transition-all ${
              openWindows.length > 0
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-600 dark:text-amber-300 animate-pulse'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            }`}>
              <FrameCorners size={20} weight="duotone" className={openWindows.length > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-emerald-600 dark:text-emerald-400'} />
            </div>

            <span className={`text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
              openWindows.length > 0
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
            }`}>
              {openWindows.length > 0 ? `${openWindows.length} Open` : 'Sealed'}
            </span>
          </div>

          <div className="relative z-10 my-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl sm:text-2xl font-black font-mono ${openWindows.length > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-slate-900 dark:text-white'}`}>
                {openWindows.length}
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">/ {windowSensors.length} Windows</span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Windows</div>
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
              <span>{openWindows.length > 0 ? `${openWindows.length} open` : 'All windows shut'}</span>
              <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-amber-500 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* 2.9 MOTION */}
        <div
          onClick={() => openSensorsDrawer('motion')}
          className={`col-span-2 sm:col-span-1 group relative h-36 rounded-3xl border shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px] p-3.5 sm:p-4 ${
            activeMotion.length > 0
              ? darkMode
                ? 'bg-slate-900/90 hover:bg-slate-900 border-amber-500/30 hover:border-amber-400/60 text-white'
                : 'bg-amber-50/80 hover:bg-amber-50 border-amber-200/90 hover:border-amber-300 text-slate-900'
              : darkMode
                ? 'bg-slate-900/80 hover:bg-slate-900 border-white/10 hover:border-white/20 text-white'
                : 'bg-white/80 hover:bg-white border-slate-200/90 hover:border-slate-300 text-slate-900 shadow-slate-200/40'
          }`}
        >
          <div className="flex items-center justify-between relative z-10">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center border shadow-xs transition-all ${
              activeMotion.length > 0
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-600 dark:text-amber-300'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            }`}>
              <PersonSimpleWalk size={20} weight="duotone" />
            </div>

            <span className={`text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
              activeMotion.length > 0
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
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
              <span>{activeMotion.length > 0 ? `${activeMotion.length} zones active` : 'No activity'}</span>
              <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-amber-500 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* 2.10 LEAKAGE */}
        <div
          onClick={() => openSensorsDrawer('leak')}
          className={`col-span-2 sm:col-span-1 group relative h-36 rounded-3xl border shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px] p-3.5 sm:p-4 ${
            activeLeaks.length > 0
              ? 'bg-rose-950/50 border-rose-500/40 text-slate-900 dark:text-white shadow-rose-500/10 animate-pulse'
              : darkMode
                ? 'bg-slate-900/80 hover:bg-slate-900 border-white/10 hover:border-white/20 text-white'
                : 'bg-white/80 hover:bg-white border-slate-200/90 hover:border-slate-300 text-slate-900 shadow-slate-200/40'
          }`}
        >
          <div className="flex items-center justify-between relative z-10">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center border shadow-xs transition-all ${
              activeLeaks.length > 0
                ? 'bg-rose-500/30 border-rose-500/50 text-rose-600 dark:text-rose-400'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            }`}>
              <Drop size={20} weight="duotone" />
            </div>

            <span className={`text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
              activeLeaks.length > 0
                ? 'bg-rose-500/25 text-rose-700 dark:text-rose-300 border-rose-500/40'
                : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
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
              <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-rose-500 dark:group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* 2.11 SMOKE */}
        <div
          onClick={() => openSensorsDrawer('smoke')}
          className={`col-span-2 sm:col-span-1 group relative h-36 rounded-3xl border shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px] p-3.5 sm:p-4 ${
            activeSmoke.length > 0
              ? 'bg-rose-950/50 border-rose-500/40 text-slate-900 dark:text-white shadow-rose-500/10 animate-pulse'
              : darkMode
                ? 'bg-slate-900/80 hover:bg-slate-900 border-white/10 hover:border-white/20 text-white'
                : 'bg-white/80 hover:bg-white border-slate-200/90 hover:border-slate-300 text-slate-900 shadow-slate-200/40'
          }`}
        >
          <div className="flex items-center justify-between relative z-10">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center border shadow-xs transition-all ${
              activeSmoke.length > 0
                ? 'bg-rose-500/30 border-rose-500/50 text-rose-600 dark:text-rose-400'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            }`}>
              <Flame size={20} weight="duotone" />
            </div>

            <span className={`text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
              activeSmoke.length > 0
                ? 'bg-rose-500/25 text-rose-700 dark:text-rose-300 border-rose-500/40'
                : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
            }`}>
              {activeSmoke.length > 0 ? 'Fire Hazard' : 'Safe'}
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
              <span>{activeSmoke.length > 0 ? 'Smoke detected!' : 'Air clear'}</span>
              <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-rose-500 dark:group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all" />
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
