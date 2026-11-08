/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Users, CaretRight, HouseLine, MapPin, BatteryCharging, BatteryHigh, BatteryWarning } from '@phosphor-icons/react';
import PersonAvatar from '../../ui/PersonAvatar';
import type { TileProps } from './types';

export default function UsersTile({ s, is2x }: TileProps) {
  const {
    activeZoneUsers,
    darkMode,
    getPersonZoneDetails,
    homeUsers,
    openUsersDrawer,
    tileBaseClass,
    userEntities
  } = s;

  if (is2x) {
    return (
      <div className={tileBaseClass(false, '', false, true)}>
        {/* Header: Identity on left, Live presence badges on right */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs shrink-0">
              <Users size={19} weight="duotone" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                Family Presence
              </div>
              <div className="text-[11px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                {userEntities.length === 0
                  ? 'No members tracked'
                  : `${userEntities.length} member${userEntities.length === 1 ? '' : 's'} • ${homeUsers.length} at home`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {homeUsers.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] sm:text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {homeUsers.length} Home
              </span>
            )}
            {activeZoneUsers.length > homeUsers.length && (
              <span className="inline-flex items-center gap-1 text-[11px] sm:text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/20 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                {activeZoneUsers.length - homeUsers.length} Zone
              </span>
            )}
            {homeUsers.length === 0 && activeZoneUsers.length === 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] sm:text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/20 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Away
              </span>
            )}
            <CaretRight
              size={14}
              weight="bold"
              className="text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-0.5"
            />
          </div>
        </div>

        {/* Middle: Member Cards Row */}
        <div className="flex items-center gap-2 my-auto py-0.5 relative z-10 overflow-x-auto no-scrollbar">
          {userEntities.length === 0 ? (
            <div className="w-full flex items-center justify-center py-2 text-xs text-slate-400 font-medium">
              No family members configured
            </div>
          ) : (
            <>
              {userEntities.slice(0, 4).map((user) => {
                const { isHome, isInKnownZone, zoneName } = getPersonZoneDetails(user);
                const battery = user?.batteryPct ?? (
                  typeof user?.attributes?.battery === 'number'
                    ? user.attributes.battery
                    : typeof user?.attributes?.battery_level === 'number'
                      ? user.attributes.battery_level
                      : undefined
                );
                const batteryState = user?.attributes?.battery_state || user?.attributes?.battery_status;
                const isCharging = Boolean(
                  user?.attributes?.battery_charging ||
                  (typeof batteryState === 'string' && batteryState.toLowerCase().includes('charg'))
                );
                const firstName = user.name.split(' ')[0];

                return (
                  <div
                    key={user.entity_id}
                    onClick={(e) => {
                      e.stopPropagation();
                      openUsersDrawer(user);
                    }}
                    className={`flex-1 min-w-[105px] sm:min-w-[120px] p-2 rounded-2xl transition-all cursor-pointer flex items-center gap-2 sm:gap-2.5 shadow-2xs group/card border ${
                      darkMode
                        ? 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 text-white'
                        : 'bg-white/60 hover:bg-white/90 border-slate-200/60 hover:border-slate-300 text-slate-900'
                    }`}
                    title={`${user.name}: ${isHome ? 'Home' : isInKnownZone ? zoneName : 'Away'}`}
                  >
                    <PersonAvatar
                      name={user.name}
                      entity_picture={user.attributes?.entity_picture}
                      state={user.state}
                      isHome={isHome}
                      inZone={isInKnownZone && !isHome}
                      size="sm"
                      className="w-8.5 h-8.5 sm:w-9 sm:h-9 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate group-hover/card:text-indigo-500 dark:group-hover/card:text-indigo-400 transition-colors">
                        {firstName}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {isHome ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 truncate">
                            <HouseLine size={11} weight="bold" className="shrink-0" />
                            <span className="truncate">Home</span>
                          </span>
                        ) : isInKnownZone ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 truncate">
                            <MapPin size={11} weight="fill" className="shrink-0" />
                            <span className="truncate">{zoneName}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                            <span className="truncate">Away</span>
                          </span>
                        )}
                      </div>
                      {typeof battery === 'number' && (
                        <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-slate-400 dark:text-slate-400 mt-0.5">
                          {isCharging ? (
                            <BatteryCharging size={11} weight="fill" className="text-emerald-500 shrink-0" />
                          ) : battery <= 20 ? (
                            <BatteryWarning size={11} weight="fill" className="text-rose-500 shrink-0" />
                          ) : (
                            <BatteryHigh size={11} weight="fill" className="text-slate-400 dark:text-slate-400 shrink-0" />
                          )}
                          <span>{Math.round(battery)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {userEntities.length > 4 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openUsersDrawer();
                  }}
                  className={`shrink-0 px-2.5 py-2 rounded-2xl transition-all text-center flex flex-col items-center justify-center border cursor-pointer ${
                    darkMode
                      ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                      : 'bg-white/60 hover:bg-white/90 border-slate-200/60 text-slate-700'
                  }`}
                  title="View all family members"
                >
                  <span className="text-xs font-black">+{userEntities.length - 4}</span>
                  <span className="text-[11px] font-medium text-slate-400">more</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Bottom Summary Bar */}
        <div className="relative z-10 flex items-center justify-between text-[11px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 border-t border-black/5 dark:border-white/5 pt-1.5 mt-0.5">
          <span className="truncate">
            {activeZoneUsers.length === 0
              ? 'All members away from home'
              : homeUsers.length === userEntities.length
              ? 'Everyone is currently at home'
              : activeZoneUsers.map((u) => {
                  const fn = u.name.split(' ')[0];
                  const { isHome, zoneName } = getPersonZoneDetails(u);
                  return isHome ? `${fn} (Home)` : `${fn} (${zoneName})`;
                }).join(' • ')}
          </span>
          <span className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400 shrink-0 ml-2 group-hover:underline flex items-center gap-0.5">
            Map & Details
            <CaretRight size={10} weight="bold" />
          </span>
        </div>
      </div>
    );
  }

  // 1x width version
  const statusSummary = (() => {
    if (userEntities.length === 0) return 'No members tracked';
    if (homeUsers.length === userEntities.length) return 'Everyone is home';
    if (activeZoneUsers.length === 0) return 'All members away';
    return activeZoneUsers.map((u) => {
      const fn = u.name.split(' ')[0];
      const { isHome, zoneName } = getPersonZoneDetails(u);
      return isHome ? fn : `${fn} (${zoneName})`;
    }).join(', ');
  })();

  return (
    <div className={tileBaseClass(false, '', false, false)}>
      {/* Top Row: Icon on left, Presence Status Badge on right */}
      <div className="flex items-center justify-between relative z-10">
        <div className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs shrink-0">
          <Users size={19} weight="duotone" />
        </div>

        {homeUsers.length > 0 ? (
          <span className="inline-flex items-center gap-1 text-[11px] sm:text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {homeUsers.length} Home
          </span>
        ) : activeZoneUsers.length > 0 ? (
          <span className="inline-flex items-center gap-1 text-[11px] sm:text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/20 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            {activeZoneUsers.length} Zone
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] sm:text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/20 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            All Away
          </span>
        )}
      </div>

      {/* Middle Row: Avatars Cluster with presence rings & hover zoom */}
      <div className="flex items-center my-auto py-1 relative z-10">
        <div className="flex items-center -space-x-2 overflow-hidden">
          {userEntities.slice(0, 3).map((user, idx) => {
            const { isHome, isInKnownZone } = getPersonZoneDetails(user);
            return (
              <div
                key={user.entity_id}
                className="relative transition-transform duration-200 hover:scale-110 hover:z-20 cursor-pointer"
                style={{ zIndex: 10 - idx }}
                onClick={(e) => {
                  e.stopPropagation();
                  openUsersDrawer(user);
                }}
                title={`${user.name} (${isHome ? 'Home' : isInKnownZone ? 'In Zone' : 'Away'})`}
              >
                <PersonAvatar
                  name={user.name}
                  entity_picture={user.attributes?.entity_picture}
                  state={user.state}
                  isHome={isHome}
                  inZone={isInKnownZone && !isHome}
                  size="sm"
                  className="w-8 h-8 sm:w-9 sm:h-9 ring-2 ring-white dark:ring-slate-900 shadow-xs"
                />
              </div>
            );
          })}
          {userEntities.length > 3 && (
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 ring-2 ring-white dark:ring-slate-900 text-[11px] sm:text-[11px] font-black flex items-center justify-center shadow-xs z-0"
              title={`${userEntities.length - 3} more members`}
            >
              +{userEntities.length - 3}
            </div>
          )}
        </div>

        {userEntities.length === 1 && (
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 ml-2.5 truncate">
            {userEntities[0].name.split(' ')[0]}
          </span>
        )}
      </div>

      {/* Bottom: Title & Natural Language Presence Summary with Chevron */}
      <div className="relative z-10">
        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
          Family Presence
        </div>
        <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
          <span className="truncate">{statusSummary}</span>
          <CaretRight size={13} weight="bold" className="text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
        </div>
      </div>
    </div>
  );
}
