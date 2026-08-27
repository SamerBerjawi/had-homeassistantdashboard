import React, { useState } from 'react';
import { 
  Users, 
  User,
  House, 
  Car, 
  MapPin, 
  Clock, 
  BatteryCharging, 
  BatteryHigh, 
  BatteryLow, 
  BatteryWarning, 
  DeviceMobile, 
  Compass, 
  NavigationArrow,
  ShieldCheck,
  Globe,
  Radio,
  Lightning,
  Sparkle
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import DetailsRightDrawer from '../DetailsRightDrawer';
import { getHAImageUrl } from '../../../lib/utils';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';

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
  const serverUrl = useAutoLayoutStore(s => s.serverUrl);
  const resolvedZones = useAutoLayoutStore(s => s.resolvedZones);
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

  const activePerson = users.find(u => u.entity_id === activeUserId) || users[0];
  const homeUsers = users.filter(u => u.state === 'home');

  // Active Person Details
  const isHome = activePerson?.state === 'home';
  const rawPicture = activePerson?.attributes?.entity_picture;
  const pictureUrl = getHAImageUrl(rawPicture, serverUrl);

  // Link Active HA Zone
  const matchedZone = resolvedZones.find(z => 
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
      return clean.replace(/\b\w/g, l => l.toUpperCase());
    }
    return `${person.name.split(' ')[0]}'s Phone`;
  };

  const deviceFriendlyName = getDeviceFriendlyName(activePerson);
  const batteryState = activePerson?.attributes?.battery_state || 
    activePerson?.attributes?.battery_status || 
    (battery !== undefined ? (battery >= 90 ? 'Full' : battery <= 20 ? 'Low Battery' : 'Discharging') : 'Monitoring');

  const isCharging = activePerson?.attributes?.battery_charging || batteryState.toLowerCase().includes('charg');
  const location = matchedZone ? `In ${matchedZone.name} Zone` : activePerson?.attributes?.location || (isHome ? 'At Home' : activePerson?.state === 'not_home' ? 'Away from Home' : activePerson?.state || 'Unknown');

  // OpenStreetMap Coordinates (use person coords or fallback to zone coords)
  const lat = typeof activePerson?.attributes?.latitude === 'number' 
    ? activePerson.attributes.latitude 
    : (matchedZone?.latitude || 37.7749);
  const lon = typeof activePerson?.attributes?.longitude === 'number' 
    ? activePerson.attributes.longitude 
    : (matchedZone?.longitude || -122.4194);
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.008}%2C${lat - 0.005}%2C${lon + 0.008}%2C${lat + 0.005}&layer=mapnik&marker=${lat}%2C${lon}`;
  const osmDirectUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;

  return (
    <DetailsRightDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Household Identity & Presence"
      subtitle={`${homeUsers.length} of ${users.length} members currently at home`}
      icon={<Users size={22} weight="duotone" className="text-indigo-500 dark:text-indigo-400" />}
      darkMode={darkMode}
    >
      <div className="space-y-6">
        
        {/* User Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 touch-scroll-container">
          {users.map((user) => {
            const isSel = user.entity_id === activeUserId;
            const isUserHome = user.state === 'home';
            const userPic = getHAImageUrl(user.attributes?.entity_picture, serverUrl);

            return (
              <button
                key={user.entity_id}
                type="button"
                onClick={() => setActiveUserId(user.entity_id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all cursor-pointer shrink-0 ${
                  isSel
                    ? 'bg-indigo-500/15 text-indigo-700 dark:bg-indigo-500/25 dark:text-white border-indigo-500/50 shadow-xs ring-1 ring-indigo-500/40'
                    : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="relative">
                  {userPic ? (
                    <img
                      src={userPic}
                      alt={user.name}
                      className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-300 dark:ring-white/20"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                      {user.name.charAt(0)}
                    </div>
                  )}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-slate-950 ${
                      isUserHome ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-slate-400 dark:bg-slate-500'
                    }`}
                  />
                </div>
                <span className="text-xs font-bold">{user.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* LUXURY SECURITY ID / PRESENCE BADGE CARD                      */}
        {/* ------------------------------------------------------------- */}
        {activePerson && (
          <div className={`p-6 rounded-3xl border shadow-xl relative overflow-hidden space-y-5 transition-colors ${
            darkMode
              ? 'bg-linear-to-b from-indigo-950/40 via-slate-900/90 to-slate-950 border-white/15 text-white'
              : 'bg-linear-to-b from-indigo-50/80 via-white to-slate-50 border-slate-200 text-slate-900 shadow-slate-200/60'
          }`}>
            {/* Top Lanyard / Badge Accent */}
            <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-indigo-500 via-purple-500 to-emerald-400" />
            
            {/* User Header with Avatar & Online Ring */}
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                {pictureUrl ? (
                  <img
                    src={pictureUrl}
                    alt={activePerson.name}
                    className={`w-20 h-20 rounded-3xl object-cover ring-4 shadow-xl ${
                      isHome ? 'ring-emerald-500 dark:ring-emerald-400/80' : 'ring-slate-300 dark:ring-slate-600'
                    }`}
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className={`w-20 h-20 rounded-3xl bg-linear-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-3xl font-extrabold text-white ring-4 shadow-xl ${
                    isHome ? 'ring-emerald-500 dark:ring-emerald-400/80' : 'ring-slate-300 dark:ring-slate-600'
                  }`}>
                    {activePerson.name.charAt(0)}
                  </div>
                )}
                <span
                  className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-md ${
                    isHome
                      ? 'bg-emerald-500 text-white dark:text-slate-950 border-emerald-400'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600'
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
                  Home Assistant Household Member
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-600 dark:text-slate-300 font-medium truncate">
                  <MapPin size={15} weight="duotone" className="text-indigo-500 dark:text-indigo-400 shrink-0" />
                  <span className="truncate">{location}</span>
                </div>
              </div>
            </div>

            {/* Device Info & Battery State Derived from User's Device */}
            <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 min-w-0">
                  <DeviceMobile size={18} weight="duotone" className="text-indigo-500 dark:text-indigo-400 shrink-0" />
                  <span className="truncate">{deviceFriendlyName}</span>
                </div>

                {battery !== undefined && (
                  <div className="flex items-center gap-2 font-black text-xs shrink-0">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300">
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
              <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Presence State
                </span>
                <span className="font-bold text-slate-900 dark:text-white capitalize mt-0.5 block truncate">
                  {activePerson.state.replace('_', ' ')}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Device Power State
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 capitalize mt-0.5 block truncate">
                  {batteryState}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 col-span-2">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  HA Entity ID
                </span>
                <span className="font-mono text-slate-600 dark:text-slate-300 truncate mt-0.5 block text-[11px]">
                  {activePerson.entity_id}
                </span>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* OPENSTREETMAP INTERACTIVE LOCATION POINTER (DARK / LIGHT)     */}
            {/* ------------------------------------------------------------- */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Globe size={16} weight="duotone" className="text-emerald-600 dark:text-emerald-400" />
                  <span>OpenStreetMap Live Position</span>
                </div>
                <a
                  href={osmDirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors flex items-center gap-1"
                >
                  <span>Open Map</span>
                  <NavigationArrow size={12} weight="bold" />
                </a>
              </div>

              {/* Embedded OSM Map with strict Theme Invert in Dark Mode */}
              <div className={`relative w-full h-44 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/15 shadow-inner ${
                darkMode ? 'bg-[#0B0F19]' : 'bg-slate-100'
              }`}>
                <iframe
                  title={`OpenStreetMap location for ${activePerson.name}`}
                  src={osmEmbedUrl}
                  style={darkMode ? { filter: 'invert(90%) hue-rotate(180deg) brightness(90%) contrast(95%)' } : {}}
                  className="w-full h-full border-0 pointer-events-auto transition-all opacity-95 hover:opacity-100"
                  loading="lazy"
                />

                {/* Radar Location Center Pin Marker */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative flex items-center justify-center">
                    <span className="absolute w-8 h-8 rounded-full bg-emerald-500/40 animate-ping" />
                    <div className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-xl flex items-center justify-center text-slate-950">
                      <MapPin size={12} weight="bold" />
                    </div>
                  </div>
                </div>

                {/* GPS Coordinates Badge Overlay */}
                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-xl bg-slate-900/80 text-white dark:bg-black/80 backdrop-blur-md border border-white/15 text-[10px] font-mono shadow-md">
                  {lat.toFixed(4)}° N, {lon.toFixed(4)}° W
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </DetailsRightDrawer>
  );
}
