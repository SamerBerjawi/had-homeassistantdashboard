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
  Disc 
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

interface OverviewHeaderProps {
  darkMode?: boolean;
}

export default function OverviewHeader({ darkMode = true }: OverviewHeaderProps) {
  const { 
    domainGroups, 
    overviewSummary, 
    securityOverview, 
    updateEntityState,
    serverUrl
  } = useAutoLayoutStore();

  // Active Right Sidebar State
  const [drawerOpen, setDrawerOpen] = useState<
    'users' | 'lights' | 'fans' | 'doors' | 'windows' | 'alarm' | 'media' | null
  >(null);

  const [selectedUser, setSelectedUser] = useState<ResolvedEntity | null>(null);
  const [openingsTab, setOpeningsTab] = useState<'all' | 'doors' | 'windows' | 'other'>('all');

  // Entities Breakdown directly from HA Domain Groups
  const userEntities: ResolvedEntity[] = [
    ...(domainGroups['person'] || []),
    ...(domainGroups['device_tracker'] || [])
  ];
  const lightEntities: ResolvedEntity[] = domainGroups['light'] || [];
  const fanEntities: ResolvedEntity[] = domainGroups['fan'] || [];
  const mediaEntities: ResolvedEntity[] = domainGroups['media_player'] || [];
  const alarmEntity: ResolvedEntity | undefined = domainGroups['alarm_control_panel']?.[0];

  // Classify all binary sensors (Doors, Windows, and Other Contacts)
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

  const isOtherContact = (e: ResolvedEntity) =>
    !isDoor(e) &&
    !isWindow(e) &&
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
  const otherContactSensors = allBinary.filter(isOtherContact);

  const activeMedia = mediaEntities.find(m => m.state === 'playing') || mediaEntities[0];
  const activeMediaCount = mediaEntities.filter(m => m.state === 'playing').length;

  // Calculated Real Metrics
  const homeUsers = userEntities.filter(u => u.state === 'home');
  const onLights = lightEntities.filter(l => l.state === 'on');
  const activeFans = fanEntities.filter(f => f.state === 'on');
  const openDoors = doorSensors.filter(d => d.state === 'on');
  const openWindows = windowSensors.filter(w => w.state === 'on');
  const openOthers = otherContactSensors.filter(o => o.state === 'on');
  const totalOpenContacts = openDoors.length + openWindows.length + openOthers.length;

  const isAlarmArmed = alarmEntity?.state && alarmEntity.state !== 'disarmed';
  const isPlayingMedia = activeMedia?.state === 'playing';

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

  // Real Service Call Handlers (Controllable devices only)
  const handleToggleLightBatch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onLights.length > 0) {
      onLights.forEach(l => updateEntityState(l.entity_id, 'off', { brightness: 0 }));
    } else {
      lightEntities.slice(0, 4).forEach(l => updateEntityState(l.entity_id, 'on', { brightness: 80 }));
    }
  };

  const handleToggleFanBatch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeFans.length > 0) {
      activeFans.forEach(f => updateEntityState(f.entity_id, 'off', { percentage: 0 }));
    } else {
      fanEntities.forEach(f => updateEntityState(f.entity_id, 'on', { percentage: 66 }));
    }
  };

  const handleTogglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeMedia) {
      const nextState = isPlayingMedia ? 'paused' : 'playing';
      updateEntityState(activeMedia.entity_id, nextState);
    }
  };

  const handleQuickAlarmToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (alarmEntity) {
      const nextState = isAlarmArmed ? 'disarmed' : 'armed_home';
      updateEntityState(alarmEntity.entity_id, nextState, {
        changed_by: 'Quick Action',
        last_changed: 'Just now'
      });
    }
  };

  // Alarm Style & Badge helpers
  const getAlarmDetails = () => {
    const state = alarmEntity?.state || 'disarmed';
    switch (state) {
      case 'armed_home':
        return { label: 'Armed (Home)', color: 'emerald', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' };
      case 'armed_away':
        return { label: 'Armed (Away)', color: 'rose', bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' };
      case 'armed_night':
        return { label: 'Armed (Night)', color: 'indigo', bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/30' };
      case 'disarmed':
      default:
        return { label: 'Disarmed', color: 'slate', bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30' };
    }
  };
  const alarmDetails = getAlarmDetails();

  return (
    <section className="w-full mb-8 space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER STATUS BAR & SEPARATE BADGES                    */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10 dark:border-white/10">
        
        {/* Left Sub-Header Status Line */}
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-400">
              Live Home Status
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-400 dark:text-slate-300 mt-0.5">
            {homeUsers.length} of {userEntities.length} family member{userEntities.length === 1 ? '' : 's'} at home • {totalOpenContacts > 0 ? `${totalOpenContacts} contact${totalOpenContacts === 1 ? '' : 's'} open` : 'All perimeter contacts sealed'}
          </p>
        </div>

        {/* Right Badges Cluster - All Fully Separate Individual Pills */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Standalone Individual User Badges (Not grouped) */}
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
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-xs'
                    : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10 opacity-75'
                }`}
                title={`${user.name}: ${isHome ? 'At Home' : user.state}`}
              >
                <div className="relative">
                  {picUrl ? (
                    <img
                      src={picUrl}
                      alt={user.name}
                      className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-900"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-indigo-600 ring-1 ring-slate-900 flex items-center justify-center text-[9px] font-bold text-white">
                      {user.name.charAt(0)}
                    </div>
                  )}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-950 ${
                      isHome ? 'bg-emerald-400' : 'bg-slate-500'
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
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
          >
            {openDoors.length > 0 ? (
              <DoorOpen size={15} weight="duotone" className="text-amber-400" />
            ) : (
              <Door size={15} weight="duotone" className="text-emerald-400" />
            )}
            <span>{openDoors.length > 0 ? `${openDoors.length} Door${openDoors.length === 1 ? '' : 's'} Open` : `Doors (${doorSensors.length})`}</span>
          </button>

          {/* Standalone Separate Windows Badge */}
          <button
            type="button"
            onClick={openWindowsDrawer}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 ${
              openWindows.length > 0
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
          >
            <FrameCorners size={15} weight="duotone" className={openWindows.length > 0 ? 'text-amber-400' : 'text-emerald-400'} />
            <span>{openWindows.length > 0 ? `${openWindows.length} Win Open` : `Windows (${windowSensors.length})`}</span>
          </button>

          {/* Standalone Separate Music / Media Player Badge */}
          <button
            type="button"
            onClick={() => setDrawerOpen('media')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 ${
              isPlayingMedia
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
            }`}
          >
            <MusicNotes size={15} weight="duotone" className="text-purple-400 shrink-0" />
            {isPlayingMedia ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="truncate max-w-28 sm:max-w-36 font-semibold">
                  {activeMedia?.attributes?.media_title || 'Playing'}
                </span>
                <span className="flex items-end gap-0.5 h-3 shrink-0">
                  <span className="w-0.5 bg-purple-400 rounded-full animate-bounce" style={{ height: '70%', animationDuration: '0.6s' }} />
                  <span className="w-0.5 bg-purple-400 rounded-full animate-bounce" style={{ height: '100%', animationDuration: '0.8s' }} />
                  <span className="w-0.5 bg-purple-400 rounded-full animate-bounce" style={{ height: '50%', animationDuration: '0.7s' }} />
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
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-white/5 text-slate-400 border-white/10'
            }`}
          >
            <Lightbulb size={15} weight="duotone" className="text-amber-400" />
            <span>{onLights.length} Lights</span>
          </button>

          {/* Standalone Fans Badge */}
          <button
            type="button"
            onClick={() => setDrawerOpen('fans')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 ${
              activeFans.length > 0
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                : 'bg-white/5 text-slate-400 border-white/10'
            }`}
          >
            <Fan size={15} weight="duotone" className={`text-cyan-400 ${activeFans.length > 0 ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
            <span>{activeFans.length} Fans</span>
          </button>

        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. FEATURED HEADER OVERVIEW TILES (BENTO GRID)                 */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        
        {/* TILE 1: USERS & FAMILY PRESENCE */}
        <div
          onClick={() => openUsersDrawer()}
          className="group relative p-4 rounded-3xl bg-slate-900/60 hover:bg-slate-900/80 backdrop-blur-xl border border-white/10 hover:border-indigo-500/40 shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px]"
        >
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-indigo-500/15 rounded-full blur-2xl group-hover:bg-indigo-500/25 transition-all" />

          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-sm">
              <Users size={22} weight="duotone" />
            </div>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {homeUsers.length} Home
            </span>
          </div>

          <div className="flex items-center -space-x-2.5 my-2 relative z-10">
            {userEntities.map((user) => {
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
                        isHome ? 'ring-emerald-400' : 'ring-slate-600 opacity-60'
                      }`}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ${
                      isHome ? 'bg-indigo-600 ring-emerald-400' : 'bg-slate-700 ring-slate-600 opacity-60'
                    }`}>
                      {user.name.charAt(0)}
                    </div>
                  )}
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-900 ${
                      isHome ? 'bg-emerald-400' : 'bg-slate-500'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          <div className="relative z-10 mt-1">
            <div className="text-base font-extrabold text-white truncate">Family Presence</div>
            <div className="text-xs text-slate-400 font-medium truncate flex items-center justify-between">
              <span>{homeUsers.map(u => u.name.split(' ')[0]).join(', ') || 'No one home'}</span>
              <CaretRight size={14} weight="bold" className="text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* TILE 2: LIGHTS ON / TOTAL */}
        <div
          onClick={() => setDrawerOpen('lights')}
          className={`group relative p-4 rounded-3xl backdrop-blur-xl border shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px] ${
            onLights.length > 0
              ? 'bg-slate-900/70 hover:bg-slate-900/90 border-amber-500/30 hover:border-amber-400/60'
              : 'bg-slate-900/60 hover:bg-slate-900/80 border-white/10 hover:border-white/20'
          }`}
        >
          <div className={`absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl transition-all ${
            onLights.length > 0 ? 'bg-amber-500/20 group-hover:bg-amber-500/30' : 'bg-white/5'
          }`} />

          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm transition-all ${
              onLights.length > 0
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-300 shadow-amber-500/20'
                : 'bg-white/10 border-white/15 text-slate-400'
            }`}>
              <Lightbulb size={22} weight="duotone" />
            </div>

            <button
              type="button"
              onClick={handleToggleLightBatch}
              className={`w-7 h-7 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                onLights.length > 0
                  ? 'bg-amber-500/30 text-amber-300 border-amber-400/40 hover:bg-amber-500/50'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/15 hover:text-white'
              }`}
              title={onLights.length > 0 ? 'Turn all off' : 'Turn on lights'}
            >
              <Power size={14} weight="bold" />
            </button>
          </div>

          <div className="my-1 relative z-10">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">{onLights.length}</span>
              <span className="text-xs font-bold text-slate-400">/ {lightEntities.length} On</span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="text-sm font-bold text-white">Lighting</div>
            <div className="text-xs text-slate-400 font-medium truncate flex items-center justify-between">
              <span>{onLights.length > 0 ? `${onLights.length} active fixtures` : 'All lights off'}</span>
              <CaretRight size={14} weight="bold" className="text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* TILE 3: FANS ON / VENTILATION */}
        <div
          onClick={() => setDrawerOpen('fans')}
          className={`group relative p-4 rounded-3xl backdrop-blur-xl border shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px] ${
            activeFans.length > 0
              ? 'bg-slate-900/70 hover:bg-slate-900/90 border-cyan-500/30 hover:border-cyan-400/60'
              : 'bg-slate-900/60 hover:bg-slate-900/80 border-white/10 hover:border-white/20'
          }`}
        >
          <div className={`absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl transition-all ${
            activeFans.length > 0 ? 'bg-cyan-500/20 group-hover:bg-cyan-500/30' : 'bg-white/5'
          }`} />

          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm transition-all ${
              activeFans.length > 0
                ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300 shadow-cyan-500/20'
                : 'bg-white/10 border-white/15 text-slate-400'
            }`}>
              <Fan size={22} weight="duotone" className={activeFans.length > 0 ? 'animate-spin' : ''} style={{ animationDuration: '2s' }} />
            </div>

            <button
              type="button"
              onClick={handleToggleFanBatch}
              className={`w-7 h-7 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                activeFans.length > 0
                  ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400/40 hover:bg-cyan-500/50'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/15 hover:text-white'
              }`}
              title={activeFans.length > 0 ? 'Turn all off' : 'Turn fans on'}
            >
              <Power size={14} weight="bold" />
            </button>
          </div>

          <div className="my-1 relative z-10">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">{activeFans.length}</span>
              <span className="text-xs font-bold text-slate-400">/ {fanEntities.length} Running</span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="text-sm font-bold text-white">Fans & Airflow</div>
            <div className="text-xs text-slate-400 font-medium truncate flex items-center justify-between">
              <span>{activeFans.length > 0 ? 'Circulating fresh air' : 'All fans idle'}</span>
              <CaretRight size={14} weight="bold" className="text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* TILE 4: DOORS OPEN / CLOSED */}
        <div
          onClick={openDoorsDrawer}
          className={`group relative p-4 rounded-3xl backdrop-blur-xl border shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px] ${
            openDoors.length > 0
              ? 'bg-slate-900/70 hover:bg-slate-900/90 border-amber-500/30 hover:border-amber-400/60'
              : 'bg-slate-900/60 hover:bg-slate-900/80 border-white/10 hover:border-white/20'
          }`}
        >
          <div className={`absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl transition-all ${
            openDoors.length > 0 ? 'bg-amber-500/20 group-hover:bg-amber-500/30' : 'bg-emerald-500/10'
          }`} />

          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm transition-all ${
              openDoors.length > 0
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-300 animate-pulse'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
            }`}>
              {openDoors.length > 0 ? <DoorOpen size={22} weight="duotone" /> : <Door size={22} weight="duotone" />}
            </div>

            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
              openDoors.length > 0
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            }`}>
              {openDoors.length > 0 ? `${openDoors.length} Open` : 'Secure'}
            </span>
          </div>

          <div className="my-1 relative z-10">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black ${openDoors.length > 0 ? 'text-amber-300' : 'text-white'}`}>
                {openDoors.length}
              </span>
              <span className="text-xs font-bold text-slate-400">/ {doorSensors.length} Doors Open</span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="text-sm font-bold text-white">Entry Doors</div>
            <div className="text-xs text-slate-400 font-medium truncate flex items-center justify-between">
              <span>{openDoors.length > 0 ? openDoors[0].name : 'All doors closed'}</span>
              <CaretRight size={14} weight="bold" className="text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* TILE 5: WINDOWS OPEN / CLOSED */}
        <div
          onClick={openWindowsDrawer}
          className={`group relative p-4 rounded-3xl backdrop-blur-xl border shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px] ${
            openWindows.length > 0
              ? 'bg-slate-900/70 hover:bg-slate-900/90 border-amber-500/30 hover:border-amber-400/60'
              : 'bg-slate-900/60 hover:bg-slate-900/80 border-white/10 hover:border-white/20'
          }`}
        >
          <div className={`absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl transition-all ${
            openWindows.length > 0 ? 'bg-amber-500/20 group-hover:bg-amber-500/30' : 'bg-emerald-500/10'
          }`} />

          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm transition-all ${
              openWindows.length > 0
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-300 animate-pulse'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
            }`}>
              <FrameCorners size={22} weight="duotone" className={openWindows.length > 0 ? 'text-amber-300' : 'text-emerald-400'} />
            </div>

            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
              openWindows.length > 0
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            }`}>
              {openWindows.length > 0 ? `${openWindows.length} Open` : 'Sealed'}
            </span>
          </div>

          <div className="my-1 relative z-10">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black ${openWindows.length > 0 ? 'text-amber-300' : 'text-white'}`}>
                {openWindows.length}
              </span>
              <span className="text-xs font-bold text-slate-400">/ {windowSensors.length} Windows Open</span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="text-sm font-bold text-white">Windows</div>
            <div className="text-xs text-slate-400 font-medium truncate flex items-center justify-between">
              <span>{openWindows.length > 0 ? openWindows[0].name : 'All windows shut'}</span>
              <CaretRight size={14} weight="bold" className="text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* TILE 6: ALARM STATE */}
        <div
          onClick={() => setDrawerOpen('alarm')}
          className={`group relative p-4 rounded-3xl backdrop-blur-xl border shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px] ${
            isAlarmArmed
              ? 'bg-slate-900/70 hover:bg-slate-900/90 border-emerald-500/30 hover:border-emerald-400/60'
              : 'bg-slate-900/60 hover:bg-slate-900/80 border-white/10 hover:border-white/20'
          }`}
        >
          <div className={`absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl transition-all ${
            isAlarmArmed ? 'bg-emerald-500/20 group-hover:bg-emerald-500/30' : 'bg-slate-500/10'
          }`} />

          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm transition-all ${alarmDetails.bg} ${alarmDetails.border} ${alarmDetails.text}`}>
              {isAlarmArmed ? <ShieldCheck size={22} weight="duotone" /> : <LockOpen size={22} weight="duotone" />}
            </div>

            <button
              type="button"
              onClick={handleQuickAlarmToggle}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase border transition-all cursor-pointer ${
                isAlarmArmed
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/15'
              }`}
              title={isAlarmArmed ? 'Click to disarm' : 'Click to arm'}
            >
              {isAlarmArmed ? 'Arm Home' : 'Disarmed'}
            </button>
          </div>

          <div className="my-1 relative z-10">
            <div className="text-xl font-black text-white tracking-tight">
              {alarmDetails.label}
            </div>
          </div>

          <div className="relative z-10">
            <div className="text-sm font-bold text-white">Security Guard</div>
            <div className="text-xs text-slate-400 font-medium truncate flex items-center justify-between">
              <span>{alarmEntity?.attributes?.armed_at || (isAlarmArmed ? 'Perimeter active' : 'Disarmed')}</span>
              <CaretRight size={14} weight="bold" className="text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>

        {/* TILE 7: MUSIC / MEDIA PLAYING HERO TILE */}
        <div
          onClick={() => setDrawerOpen('media')}
          className="group relative p-4 rounded-3xl bg-linear-to-br from-purple-950/40 via-slate-900/80 to-slate-900/90 backdrop-blur-xl border border-purple-500/25 hover:border-purple-400/50 shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:translate-y-[-2px]"
        >
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-purple-500/30 transition-all" />

          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className="relative w-10 h-10 rounded-2xl overflow-hidden ring-1 ring-white/20 shadow-md">
              {getHAImageUrl(activeMedia?.attributes?.media_image, serverUrl) ? (
                <img
                  src={getHAImageUrl(activeMedia?.attributes?.media_image, serverUrl)}
                  alt="Album artwork"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-purple-900/50 flex items-center justify-center text-purple-300">
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
              className="w-8 h-8 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 flex items-center justify-center shadow-md transition-all cursor-pointer active:scale-95"
              title={isPlayingMedia ? 'Pause Audio' : 'Play Audio'}
            >
              {isPlayingMedia ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" className="ml-0.5" />}
            </button>
          </div>

          <div className="my-1 relative z-10 min-w-0">
            <h4 className="text-sm font-extrabold text-white truncate">
              {activeMedia?.attributes?.media_title || (isPlayingMedia ? 'Playing Media' : 'No Media Playing')}
            </h4>
            <p className="text-xs text-purple-300/80 font-medium truncate">
              {activeMedia?.attributes?.media_artist || (activeMedia ? activeMedia.name : 'Idle')}
            </p>
          </div>

          <div className="relative z-10">
            <div className="text-xs text-slate-400 font-medium truncate flex items-center justify-between">
              <span className="truncate">{activeMedia?.name || 'Media Player'}</span>
              <CaretRight size={14} weight="bold" className="text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all shrink-0" />
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
      />

      <FansOverviewModal
        isOpen={drawerOpen === 'fans'}
        onClose={() => setDrawerOpen(null)}
        fans={fanEntities}
        onUpdateEntity={updateEntityState}
      />

      <OpeningsOverviewModal
        isOpen={drawerOpen === 'doors' || drawerOpen === 'windows'}
        onClose={() => setDrawerOpen(null)}
        doorSensors={doorSensors}
        windowSensors={windowSensors}
        otherContactSensors={otherContactSensors}
        initialTab={openingsTab}
      />

      <AlarmKeypadModal
        isOpen={drawerOpen === 'alarm'}
        onClose={() => setDrawerOpen(null)}
        alarmEntity={alarmEntity}
        onUpdateEntity={updateEntityState}
      />

      <MediaOverviewDrawer
        isOpen={drawerOpen === 'media'}
        onClose={() => setDrawerOpen(null)}
        mediaPlayers={mediaEntities}
        activeEntity={activeMedia}
        onUpdateEntity={(entityId, newState, attrs) => {
          updateEntityState(entityId, newState, attrs);
        }}
      />
    </section>
  );
}
