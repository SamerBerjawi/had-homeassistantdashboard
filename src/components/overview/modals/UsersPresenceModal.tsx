/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, 
  MapPin, 
  BatteryCharging, 
  BatteryHigh, 
  BatteryWarning, 
  DeviceMobile, 
  NavigationArrow,
  Globe
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import DetailsRightDrawer from '../DetailsRightDrawer';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { haWebSocketService } from '../../../services/haWebSocket';
import PersonAvatar from '../../ui/PersonAvatar';

interface UsersPresenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: ResolvedEntity[];
  selectedUser?: ResolvedEntity | null;
  darkMode?: boolean;
}

export default function UsersPresenceModal({
  isOpen,
  onClose,
  users,
  selectedUser,
  darkMode = true
}: UsersPresenceModalProps) {
  const resolvedZones = useAutoLayoutStore((s) => s.resolvedZones);
  const [activeUserId, setActiveUserId] = useState<string>(
    selectedUser?.entity_id || users[0]?.entity_id || ''
  );

  React.useEffect(() => {
    if (selectedUser?.entity_id) {
      setActiveUserId(selectedUser.entity_id);
    } else if (users.length > 0 && !activeUserId) {
      setActiveUserId(users[0].entity_id);
    }
  }, [selectedUser, users]);

  const activePerson = users.find((u) => u.entity_id === activeUserId) || users[0];
  const homeUsers = users.filter((u) => u.state === 'home');

  // Active Person Details
  const isHome = activePerson?.state === 'home';

  // Link Active HA Zone
  const matchedZone = resolvedZones.find((z) => 
    z.name.toLowerCase() === activePerson?.state?.toLowerCase() ||
    (isHome && z.entity_id === 'zone.home')
  );

  const battery = activePerson?.batteryPct ?? (
    typeof activePerson?.attributes?.battery === 'number' 
      ? activePerson.attributes.battery 
      : typeof activePerson?.attributes?.battery_level === 'number' 
        ? activePerson.attributes.battery_level 
        : undefined
  );

  // Friendly Device Name Resolution
  const getDeviceFriendlyName = (person: ResolvedEntity | undefined) => {
    if (!person) return "Mobile Device";
    const customName = person.attributes?.device_friendly_name || person.attributes?.device_name;
    if (customName) return customName;
    const source = person.attributes?.source || person.attributes?.device_tracker;
    if (typeof source === 'string') {
      const clean = source.replace('device_tracker.', '').replace(/_/g, ' ');
      return clean.replace(/\b\w/g, (l) => l.toUpperCase());
    }
    return `${person.name.split(' ')[0]}'s Phone`;
  };

  const deviceFriendlyName = getDeviceFriendlyName(activePerson);
  const batteryState = activePerson?.attributes?.battery_state || 
    activePerson?.attributes?.battery_status || 
    (battery !== undefined ? (battery >= 90 ? 'Full' : battery <= 20 ? 'Low Battery' : 'Discharging') : 'Monitoring');

  const isCharging = activePerson?.attributes?.battery_charging || batteryState.toLowerCase().includes('charg');
  const location = matchedZone ? `In ${matchedZone.name} Zone` : activePerson?.attributes?.location || (isHome ? 'At Home' : activePerson?.state === 'not_home' ? 'Away from Home' : activePerson?.state || 'Unknown');

  // OpenStreetMap Coordinates
  const homeZone = resolvedZones.find(
    (z) => z.entity_id === 'zone.home' || z.name?.toLowerCase() === 'home'
  );
  const isDemo = haWebSocketService.isDemo();
  const personLat = typeof activePerson?.attributes?.latitude === 'number' 
    ? activePerson.attributes.latitude 
    : undefined;
  const personLon = typeof activePerson?.attributes?.longitude === 'number' 
    ? activePerson.attributes.longitude 
    : undefined;

  const lat = personLat ?? matchedZone?.latitude ?? homeZone?.latitude ?? (isDemo ? 37.7749 : undefined);
  const lon = personLon ?? matchedZone?.longitude ?? homeZone?.longitude ?? (isDemo ? -122.4194 : undefined);
  const hasGps = lat !== undefined && lon !== undefined;

  const osmEmbedUrl = hasGps
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.008}%2C${lat - 0.005}%2C${lon + 0.008}%2C${lat + 0.005}&layer=mapnik&marker=${lat}%2C${lon}`
    : '';
  const osmDirectUrl = hasGps
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`
    : '';

  return (
    <DetailsRightDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Household Identity & Presence"
      subtitle={`${homeUsers.length} of ${users.length} members currently at home`}
      icon={<Users size={22} weight="duotone" className="text-indigo-500 dark:text-indigo-400" />}
      darkMode={darkMode}
    >
      <div className="space-y-5 pb-24 sm:pb-6">
        
        {/* User Selector Pills (Borderless) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 touch-scroll-container">
          {users.map((user) => {
            const isSel = user.entity_id === activeUserId;
            const isUserHome = user.state === 'home';

            return (
              <button
                key={user.entity_id}
                type="button"
                onClick={() => setActiveUserId(user.entity_id)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-2xl transition-all cursor-pointer shrink-0 ${
                  isSel
                    ? 'bg-indigo-500/20 text-indigo-700 dark:text-white shadow-xs font-bold'
                    : 'bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300'
                }`}
              >
                <PersonAvatar
                  name={user.name}
                  entity_picture={user.attributes?.entity_picture}
                  state={user.state}
                  isHome={isUserHome}
                  size="xs"
                  className="w-6 h-6 shrink-0"
                />
                <span className="text-xs font-bold">{user.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* LUXURY SECURITY ID / PRESENCE BADGE CARD (BORDERLESS)         */}
        {/* ------------------------------------------------------------- */}
        {activePerson && (
          <div className={`p-6 rounded-3xl shadow-xl relative overflow-hidden space-y-5 transition-colors ${
            darkMode
              ? 'bg-linear-to-b from-indigo-950/40 via-slate-900/90 to-slate-950 text-white shadow-slate-950/50'
              : 'bg-linear-to-b from-indigo-50/80 via-white to-slate-50 text-slate-900 shadow-slate-200/60'
          }`}>
            {/* Top Accent */}
            <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-indigo-500 via-purple-500 to-emerald-400" />
            
            {/* User Header with Avatar & Online Ring */}
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <PersonAvatar
                  name={activePerson.name}
                  entity_picture={activePerson.attributes?.entity_picture}
                  state={activePerson.state}
                  isHome={isHome}
                  size="xl"
                  showPresenceDot={false}
                  className="w-20 h-20 shadow-xl"
                />
                <span
                  className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md ${
                    isHome
                      ? 'bg-emerald-500 text-white dark:text-slate-950'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {isHome ? 'Home' : 'Away'}
                </span>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white truncate">{activePerson.name}</h3>
                </div>
                <p className="text-xs text-indigo-600 dark:text-indigo-300 font-semibold truncate mt-0.5">
                  Household Member
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-600 dark:text-slate-300 font-medium truncate">
                  <MapPin size={15} weight="duotone" className="text-indigo-500 dark:text-indigo-400 shrink-0" />
                  <span className="truncate">{location}</span>
                </div>
              </div>
            </div>

            {/* Device Info & Battery State Derived from User's Device */}
            <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-white/[0.04] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 min-w-0">
                  <DeviceMobile size={18} weight="duotone" className="text-indigo-500 dark:text-indigo-400 shrink-0" />
                  <span className="truncate">{deviceFriendlyName}</span>
                </div>

                {battery !== undefined && (
                  <div className="flex items-center gap-2 font-black text-xs shrink-0">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                      {batteryState}
                    </span>
                    <span className={`flex items-center gap-1 ${
                      battery <= 20 ? 'text-rose-500' : battery >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      {isCharging ? (
                        <BatteryCharging size={18} weight="duotone" className="text-emerald-600 dark:text-emerald-400" />
                      ) : battery <= 20 ? (
                        <BatteryWarning size={18} weight="duotone" className="text-rose-500" />
                      ) : (
                        <BatteryHigh size={18} weight="duotone" className="text-amber-600 dark:text-amber-400" />
                      )}
                      <span>{Math.round(battery)}%</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Battery Level Visual Progress Bar */}
              {battery !== undefined && (
                <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      battery <= 20
                        ? 'bg-rose-500 shadow-xs shadow-rose-500/50'
                        : battery >= 80
                          ? 'bg-emerald-500 dark:bg-emerald-400 shadow-xs shadow-emerald-400/50'
                          : 'bg-amber-500 dark:bg-amber-400 shadow-xs shadow-amber-400/50'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, battery))}%` }}
                  />
                </div>
              )}
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-white/[0.04]">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Presence State
                </span>
                <span className="font-bold text-slate-900 dark:text-white capitalize mt-0.5 block truncate">
                  {activePerson.state.replace('_', ' ')}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-white/[0.04]">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Device Power State
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 capitalize mt-0.5 block truncate">
                  {batteryState}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-white/[0.04] col-span-2">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  HA Entity ID
                </span>
                <span className="font-mono text-slate-600 dark:text-slate-300 truncate mt-0.5 block text-[11px]">
                  {activePerson.entity_id}
                </span>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* OPENSTREETMAP INTERACTIVE LOCATION POINTER (BORDERLESS)       */}
            {/* ------------------------------------------------------------- */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Globe size={16} weight="duotone" className="text-emerald-600 dark:text-emerald-400" />
                  <span>OpenStreetMap Live Position</span>
                </div>
                {hasGps && (
                  <a
                    href={osmDirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors flex items-center gap-1"
                  >
                    <span>Open Map</span>
                    <NavigationArrow size={12} weight="bold" />
                  </a>
                )}
              </div>

              {/* Embedded OSM Map */}
              {hasGps && lat !== undefined && lon !== undefined ? (
                <div className={`relative w-full h-44 rounded-2xl overflow-hidden shadow-inner ${
                  darkMode ? 'bg-[#0B0F19]' : 'bg-slate-100'
                }`}>
                  <iframe
                    title={`OpenStreetMap location for ${activePerson.name}`}
                    src={osmEmbedUrl}
                    style={darkMode ? { filter: 'invert(90%) hue-rotate(180deg) brightness(90%) contrast(95%)' } : {}}
                    className="w-full h-full border-0 pointer-events-auto transition-all opacity-95 hover:opacity-100"
                    loading="lazy"
                  />

                  {/* Center Pin Marker */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="relative flex items-center justify-center">
                      <span className="absolute w-8 h-8 rounded-full bg-emerald-500/40 animate-ping" />
                      <div className="w-5 h-5 rounded-full bg-emerald-500 shadow-xl flex items-center justify-center text-slate-950">
                        <MapPin size={12} weight="bold" />
                      </div>
                    </div>
                  </div>

                  {/* GPS Coordinates Badge Overlay */}
                  <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-xl bg-slate-900/80 text-white dark:bg-black/80 backdrop-blur-md text-[10px] font-mono shadow-md">
                    {lat.toFixed(4)}° N, {lon.toFixed(4)}° W
                  </div>
                </div>
              ) : (
                <div className={`w-full h-32 rounded-2xl flex flex-col items-center justify-center p-4 text-center border ${
                  darkMode ? 'bg-black/20 border-white/5 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                }`}>
                  <Globe size={28} weight="duotone" className="mb-1.5 opacity-60 text-slate-400" />
                  <span className="text-xs font-bold">Location Coordinates Unavailable</span>
                  <span className="text-[10px] opacity-75 mt-0.5">No GPS location reported for this person or zone.</span>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </DetailsRightDrawer>
  );
}
