/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Broom,
  Play,
  Pause,
  ArrowArcLeft,
  BatteryCharging,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
  CheckCircle,
  Warning,
  Fan,
  Sparkle,
  MapPin,
  Stairs,
  HouseLine
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import DetailsRightDrawer from '../DetailsRightDrawer';
import { groupEntitiesByFloorAndArea } from '../../../lib/grouping';
import DynamicPhosphorIcon from '../../ui/DynamicPhosphorIcon';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';

interface VacuumsOverviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  vacuums: ResolvedEntity[];
  darkMode?: boolean;
}

export default function VacuumsOverviewDrawer({
  isOpen,
  onClose,
  vacuums,
  darkMode = true
}: VacuumsOverviewDrawerProps) {
  const customFloors = useAutoLayoutStore((s) => s.floors);
  const customAreas = useAutoLayoutStore((s) => s.areas);
  const callHAService = useAutoLayoutStore((s) => s.callHAService);
  const updateEntityState = useAutoLayoutStore((s) => s.updateEntityState);

  const [operatingId, setOperatingId] = useState<string | null>(null);

  const safeVacuums = Array.isArray(vacuums) ? vacuums : [];

  const grouped = React.useMemo(() => {
    if (!isOpen || safeVacuums.length === 0) {
      return { hasFloors: false, hasAreas: false, groups: [], totalEntities: 0 };
    }
    return groupEntitiesByFloorAndArea(safeVacuums, customFloors, customAreas);
  }, [isOpen, safeVacuums, customFloors, customAreas]);

  const activeCleaning = safeVacuums.filter(
    (v) => (v?.state || '').toLowerCase() === 'cleaning' || (v?.state || '').toLowerCase() === 'on'
  );

  const handleAction = async (
    entityId: string,
    action: 'start' | 'pause' | 'stop' | 'return_to_base' | 'locate'
  ) => {
    setOperatingId(entityId);
    try {
      if (action === 'start') {
        await callHAService('vacuum', 'start', {}, { entity_id: entityId });
        updateEntityState(entityId, 'cleaning');
      } else if (action === 'pause') {
        await callHAService('vacuum', 'pause', {}, { entity_id: entityId });
        updateEntityState(entityId, 'paused');
      } else if (action === 'return_to_base') {
        await callHAService('vacuum', 'return_to_base', {}, { entity_id: entityId });
        updateEntityState(entityId, 'returning');
      } else if (action === 'locate') {
        await callHAService('vacuum', 'locate', {}, { entity_id: entityId });
      }
    } catch (err) {
      console.warn('[VacuumsOverviewDrawer] Service call error:', err);
    } finally {
      setTimeout(() => setOperatingId(null), 600);
    }
  };

  const handleFanSpeed = async (entityId: string, speed: string) => {
    try {
      await callHAService('vacuum', 'set_fan_speed', { fan_speed: speed }, { entity_id: entityId });
      updateEntityState(entityId, undefined, { fan_speed: speed });
    } catch (err) {
      console.warn('[VacuumsOverviewDrawer] Fan speed error:', err);
    }
  };

  const getVacuumStatus = (vac: ResolvedEntity) => {
    const s = (vac.state || 'docked').toLowerCase();
    if (s === 'cleaning' || s === 'on') {
      return {
        label: 'Cleaning Floor',
        color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
        badge: 'ACTIVE',
        isCleaning: true
      };
    }
    if (s === 'returning') {
      return {
        label: 'Returning to Dock',
        color: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
        badge: 'RETURNING',
        isReturning: true
      };
    }
    if (s === 'paused') {
      return {
        label: 'Paused',
        color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
        badge: 'PAUSED',
        isPaused: true
      };
    }
    if (s === 'error') {
      return {
        label: 'Needs Attention',
        color: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
        badge: 'ERROR',
        isError: true
      };
    }
    return {
      label: 'Docked & Ready',
      color: 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300',
      badge: 'DOCKED',
      isDocked: true
    };
  };

  return (
    <DetailsRightDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Vacuum Cleaners & Mops"
      subtitle={`${activeCleaning.length} of ${safeVacuums.length} robotic cleaners active`}
      icon={<Broom size={22} weight="duotone" className="text-teal-500" />}
      darkMode={darkMode}
    >
      <div className="space-y-5 pb-24 sm:pb-6">
        {/* Top Summary Card (Borderless) */}
        <div className="p-4 rounded-2xl bg-slate-100/90 dark:bg-white/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-300 flex items-center justify-center shadow-xs">
              <Broom size={22} weight="duotone" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {activeCleaning.length > 0
                  ? `${activeCleaning.length} Vacuum${activeCleaning.length === 1 ? '' : 's'} Cleaning Now`
                  : 'All Vacuums Docked & Standby'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {safeVacuums.length} autonomous robot cleaner{safeVacuums.length === 1 ? '' : 's'} connected
              </div>
            </div>
          </div>

          <span
            className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
              activeCleaning.length > 0
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300'
            }`}
          >
            {activeCleaning.length > 0 ? 'CLEANING' : 'STANDBY'}
          </span>
        </div>

        {/* Grouped Vacuums: Floor -> Area -> Entity */}
        <div className="space-y-5">
          {grouped.groups.map((floorGroup) => (
            <div key={floorGroup.floorId || 'no-floor'} className="space-y-3">
              {/* Floor Header */}
              {grouped.hasFloors && (
                <div className="flex items-center gap-2 px-1">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${floorGroup.color || '#0d9488'}1a`,
                      color: floorGroup.color || '#0d9488'
                    }}
                  >
                    <DynamicPhosphorIcon
                      name={floorGroup.icon}
                      fallback={Stairs}
                      size={14}
                      weight="duotone"
                      style={{ color: floorGroup.color || '#0d9488' }}
                    />
                  </div>
                  <h4
                    className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200"
                    style={{ color: floorGroup.color || undefined }}
                  >
                    {floorGroup.floorName}
                  </h4>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                    ({floorGroup.areaGroups.reduce((acc, a) => acc + a.entities.length, 0)})
                  </span>
                </div>
              )}

              {/* Area Groups */}
              <div className="space-y-3">
                {floorGroup.areaGroups.map((areaGroup) => (
                  <div key={areaGroup.areaId || 'no-area'} className="space-y-2">
                    {(grouped.hasAreas || grouped.hasFloors) && (
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: `${areaGroup.color || '#0d9488'}1a`,
                              color: areaGroup.color || '#0d9488'
                            }}
                          >
                            <DynamicPhosphorIcon
                              name={areaGroup.icon}
                              fallback={HouseLine}
                              size={12}
                              weight="duotone"
                              style={{ color: areaGroup.color || '#0d9488' }}
                            />
                          </div>
                          <span
                            className="text-xs font-bold text-slate-700 dark:text-slate-300"
                            style={{ color: areaGroup.color || undefined }}
                          >
                            {areaGroup.areaName}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Vacuum Card List */}
                    <div className="space-y-2.5">
                      {areaGroup.entities.map((vac) => {
                        const status = getVacuumStatus(vac);
                        const battery = vac.attributes?.battery_level ?? vac.attributes?.battery;
                        const fanSpeed = vac.attributes?.fan_speed;
                        const fanSpeedList: string[] = vac.attributes?.fan_speed_list || [];
                        const isBusy = operatingId === vac.entity_id;

                        return (
                          <div
                            key={vac.entity_id}
                            className={`p-4 rounded-2xl transition-all duration-200 space-y-3 ${
                              status.isCleaning
                                ? 'bg-emerald-500/10 dark:bg-emerald-500/10'
                                : 'bg-slate-100/90 dark:bg-white/[0.04] hover:bg-slate-200/80 dark:hover:bg-white/[0.08]'
                            }`}
                          >
                            {/* Header: Icon, Name, Battery, Status */}
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
                                    status.isCleaning
                                      ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                                      : 'bg-white/80 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                                  }`}
                                >
                                  <Broom
                                    size={20}
                                    weight={status.isCleaning ? 'fill' : 'duotone'}
                                    className={status.isCleaning ? 'animate-bounce' : ''}
                                    style={{ animationDuration: '2s' }}
                                  />
                                </div>

                                <div className="min-w-0">
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                    {vac.name}
                                  </h4>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {status.label}
                                    {battery !== undefined && ` • ${Math.round(battery)}% Battery`}
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full shrink-0 ${status.color}`}
                              >
                                {status.badge}
                              </span>
                            </div>

                            {/* Battery & Telemetry Bar */}
                            {battery !== undefined && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                  <span className="flex items-center gap-1">
                                    {battery <= 20 ? (
                                      <BatteryWarning size={13} weight="duotone" className="text-rose-500" />
                                    ) : (
                                      <BatteryCharging size={13} weight="duotone" className="text-teal-500" />
                                    )}
                                    Battery Level
                                  </span>
                                  <span className="font-mono">{Math.round(battery)}%</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      battery <= 20
                                        ? 'bg-rose-500'
                                        : battery <= 50
                                          ? 'bg-amber-500'
                                          : 'bg-teal-500'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, battery))}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Action Buttons: Clean, Pause, Return to Dock */}
                            <div className="grid grid-cols-3 gap-2 pt-1">
                              {status.isCleaning ? (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleAction(vac.entity_id, 'pause')}
                                  className="py-2 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                                >
                                  <Pause size={14} weight="bold" />
                                  <span>Pause</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleAction(vac.entity_id, 'start')}
                                  className="py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                                >
                                  <Play size={14} weight="fill" />
                                  <span>Clean</span>
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleAction(vac.entity_id, 'return_to_base')}
                                className="py-2 rounded-xl text-xs font-bold bg-white/80 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                              >
                                <ArrowArcLeft size={14} weight="bold" />
                                <span>Dock</span>
                              </button>

                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleAction(vac.entity_id, 'locate')}
                                className="py-2 rounded-xl text-xs font-bold bg-white/80 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                              >
                                <MapPin size={14} weight="duotone" />
                                <span>Locate</span>
                              </button>
                            </div>

                            {/* Fan Speed Presets */}
                            {fanSpeedList.length > 0 && (
                              <div className="pt-2 space-y-1.5">
                                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <Fan size={13} weight="duotone" className="text-teal-500" />
                                  <span>Suction Power:</span>
                                </div>
                                <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                                  {fanSpeedList.map((speed) => {
                                    const isCur = fanSpeed === speed;
                                    return (
                                      <button
                                        key={speed}
                                        type="button"
                                        onClick={() => handleFanSpeed(vac.entity_id, speed)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer shrink-0 ${
                                          isCur
                                            ? 'bg-teal-500 text-slate-950 font-black shadow-xs'
                                            : 'bg-white/80 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                      >
                                        {speed}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DetailsRightDrawer>
  );
}
