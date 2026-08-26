/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lightbulb, 
  Thermometer, 
  Tv, 
  Power, 
  Radio, 
  Lock, 
  Unlock, 
  Bot, 
  Search, 
  SlidersHorizontal, 
  ChevronRight, 
  Sparkles, 
  Check, 
  Sun, 
  Moon, 
  Flame, 
  Wind, 
  Droplets, 
  BatteryLow, 
  Zap, 
  Activity, 
  Layers, 
  Wrench, 
  Eye, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  ShieldAlert, 
  ArrowUpDown, 
  Sliders, 
  Plus, 
  Filter, 
  ArrowRight,
  RefreshCw,
  Box,
  PanelTopClose,
  PanelBottomClose
} from 'lucide-react';
import { ResolvedEntity, Room, HAEntity } from '../types';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';

interface DevicesViewProps {
  entities: HAEntity[];
  rooms: Room[];
  darkMode: boolean;
  onUpdateEntityState: (entityId: string, newState: string, newAttributes?: any) => void;
  onSelectRoom?: (roomId: string) => void;
  onViewHealth?: () => void;
}

type DeviceDomainCategory = 
  | 'all' 
  | 'light' 
  | 'climate' 
  | 'cover' 
  | 'switch' 
  | 'media_player' 
  | 'sensor' 
  | 'lock' 
  | 'vacuum' 
  | 'other';

const CATEGORY_CONFIG: Record<DeviceDomainCategory, { label: string; icon: any; color: string }> = {
  all: { label: 'All Fleet', icon: Sliders, color: 'text-indigo-500' },
  light: { label: 'Lights', icon: Lightbulb, color: 'text-amber-500' },
  climate: { label: 'Climates & HVAC', icon: Thermometer, color: 'text-sky-500' },
  cover: { label: 'Covers & Blinds', icon: PanelTopClose, color: 'text-emerald-500' },
  switch: { label: 'Switches & Plugs', icon: Power, color: 'text-violet-500' },
  media_player: { label: 'Media Players', icon: Tv, color: 'text-pink-500' },
  sensor: { label: 'Sensors & Metrics', icon: Activity, color: 'text-cyan-500' },
  lock: { label: 'Security & Access', icon: Lock, color: 'text-rose-500' },
  vacuum: { label: 'Vacuums & Robots', icon: Bot, color: 'text-teal-500' },
  other: { label: 'Others & Unassigned', icon: Box, color: 'text-slate-400' }
};

export default function DevicesView({
  entities,
  rooms,
  darkMode,
  onUpdateEntityState,
  onSelectRoom,
  onViewHealth
}: DevicesViewProps) {
  const {
    resolvedEntities,
    domainGroups,
    unassignedEntities,
    callHAService,
    areasMap
  } = useAutoLayoutStore();

  const [activeCategory, setActiveCategory] = useState<DeviceDomainCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<'all' | 'active' | 'inactive' | 'alerts'>('all');

  // Convert resolvedEntities object to array
  const allResolvedList = useMemo(() => {
    return Object.values(resolvedEntities);
  }, [resolvedEntities]);

  // Fallback to entities if resolvedEntities is empty
  const displayEntities = useMemo<ResolvedEntity[]>(() => {
    if (allResolvedList.length > 0) return allResolvedList;
    return entities.map(e => ({
      entity_id: e.entity_id,
      domain: e.entity_id.split('.')[0],
      name: e.attributes.friendly_name || e.entity_id,
      state: e.state,
      attributes: e.attributes,
      area_id: e.attributes.room ? e.attributes.room.toLowerCase().replace(/\s+/g, '_') : null,
      device_id: null,
      floor_id: null,
      resolutionSource: 'unassigned',
      hidden: false,
      isDiagnostic: false,
      powerWatts: e.attributes.power,
      batteryPct: e.attributes.battery
    }));
  }, [allResolvedList, entities]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<DeviceDomainCategory, number> = {
      all: displayEntities.length,
      light: 0,
      climate: 0,
      cover: 0,
      switch: 0,
      media_player: 0,
      sensor: 0,
      lock: 0,
      vacuum: 0,
      other: 0
    };

    for (const ent of displayEntities) {
      if (ent.domain === 'light') counts.light++;
      else if (ent.domain === 'climate') counts.climate++;
      else if (ent.domain === 'cover') counts.cover++;
      else if (ent.domain === 'switch') counts.switch++;
      else if (ent.domain === 'media_player') counts.media_player++;
      else if (ent.domain === 'sensor' || ent.domain === 'binary_sensor') counts.sensor++;
      else if (ent.domain === 'lock' || ent.domain === 'alarm_control_panel' || ent.domain === 'camera') counts.lock++;
      else if (ent.domain === 'vacuum') counts.vacuum++;
      else counts.other++;
    }

    return counts;
  }, [displayEntities]);

  // Filtered devices
  const filteredEntities = useMemo(() => {
    return displayEntities.filter(ent => {
      // 1. Domain category filter
      if (activeCategory !== 'all') {
        if (activeCategory === 'sensor') {
          if (ent.domain !== 'sensor' && ent.domain !== 'binary_sensor') return false;
        } else if (activeCategory === 'lock') {
          if (ent.domain !== 'lock' && ent.domain !== 'alarm_control_panel' && ent.domain !== 'camera') return false;
        } else if (activeCategory === 'other') {
          const mainDomains = ['light', 'climate', 'cover', 'switch', 'media_player', 'sensor', 'binary_sensor', 'lock', 'alarm_control_panel', 'camera', 'vacuum'];
          if (mainDomains.includes(ent.domain)) return false;
        } else {
          if (ent.domain !== activeCategory) return false;
        }
      }

      // 2. Room filter
      if (selectedRoomFilter !== 'all') {
        if (selectedRoomFilter === 'unassigned') {
          if (ent.area_id) return false;
        } else {
          if (ent.area_id !== selectedRoomFilter) return false;
        }
      }

      // 3. State filter
      if (stateFilter === 'active') {
        const isActive = ent.state === 'on' || ent.state === 'playing' || ent.state === 'cleaning' || (ent.domain === 'climate' && ent.state !== 'off' && ent.state !== 'unavailable');
        if (!isActive) return false;
      } else if (stateFilter === 'inactive') {
        const isInactive = ent.state === 'off' || ent.state === 'paused' || ent.state === 'docked' || ent.state === 'idle' || ent.state === 'closed';
        if (!isInactive) return false;
      } else if (stateFilter === 'alerts') {
        const hasAlert = (typeof ent.batteryPct === 'number' && ent.batteryPct <= 20) || ent.state === 'unavailable' || (ent.domain === 'lock' && ent.state === 'unlocked');
        if (!hasAlert) return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = ent.name.toLowerCase().includes(q);
        const idMatch = ent.entity_id.toLowerCase().includes(q);
        const roomMatch = (ent.area?.name || ent.area_id || '').toLowerCase().includes(q);
        const devMatch = (ent.device?.name || '').toLowerCase().includes(q);
        if (!nameMatch && !idMatch && !roomMatch && !devMatch) return false;
      }

      return true;
    });
  }, [displayEntities, activeCategory, selectedRoomFilter, stateFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Sliders size={20} />
            </span>
            <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Device Fleet & Domain Graph
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automatic categorical aggregation across all {displayEntities.length} ingested Home Assistant entities
          </p>
        </div>

        {/* Global Summary Metric Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
            darkMode ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
          }`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{categoryCounts.all} Total Entities</span>
          </div>

          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
            darkMode ? 'bg-amber-950/30 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <Lightbulb size={13} className="text-amber-500" />
            <span>{categoryCounts.light} Lights</span>
          </div>

          {onViewHealth && (
            <button
              onClick={onViewHealth}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 ${
                darkMode 
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/30' 
                  : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              <Activity size={13} />
              <span>Fleet Diagnostics &rarr;</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Controls Card */}
      <div className={`p-4 sm:p-5 rounded-2xl border shadow-xs transition-all ${
        darkMode ? 'bg-slate-900/60 border-white/[0.1] backdrop-blur-md' : 'bg-white/80 border-black/[0.06] backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
      }`}>
        {/* Search Bar & Dropdowns */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by friendly name, entity_id (e.g. light.living_room), or room..."
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium border outline-hidden transition-all ${
                darkMode
                  ? 'bg-slate-950/70 border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Room Filter Dropdown */}
          <select
            value={selectedRoomFilter}
            onChange={(e) => setSelectedRoomFilter(e.target.value)}
            className={`px-3 py-2.5 rounded-xl text-xs font-bold border outline-hidden cursor-pointer transition-all ${
              darkMode 
                ? 'bg-slate-950/70 border-slate-800 text-slate-200' 
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="all">All Rooms / Zones</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
            <option value="unassigned">Unassigned / Other</option>
          </select>

          {/* State Filter Buttons */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/50 dark:bg-slate-950/80 border border-slate-300/30 dark:border-slate-800 self-start sm:self-auto">
            {(['all', 'active', 'inactive', 'alerts'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStateFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all cursor-pointer ${
                  stateFilter === st
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : darkMode
                      ? 'text-slate-400 hover:text-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Domain Category Scrollable / Responsive Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto touch-scroll-container pb-1 pt-1 scrollbar-none">
          {(Object.keys(CATEGORY_CONFIG) as DeviceDomainCategory[]).map(cat => {
            const config = CATEGORY_CONFIG[cat];
            const Icon = config.icon;
            const isSelected = activeCategory === cat;
            const count = categoryCounts[cat];

            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30'
                    : darkMode
                      ? 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon size={14} className={isSelected ? 'text-white' : config.color} />
                <span>{config.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  isSelected 
                    ? 'bg-white/20 text-white' 
                    : darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Devices Grid */}
      {filteredEntities.length === 0 ? (
        <div className={`p-12 text-center rounded-3xl border ${
          darkMode ? 'bg-slate-900/40 border-white/[0.08]' : 'bg-white/70 border-black/[0.06]'
        }`}>
          <Sliders className="mx-auto text-slate-400 mb-3" size={32} />
          <h3 className="font-extrabold text-base mb-1">No Matching Devices Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            Try adjusting your search term, clearing room filters, or selecting "All Fleet" to view all entities.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setActiveCategory('all');
              setSelectedRoomFilter('all');
              setStateFilter('all');
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 transition-all cursor-pointer shadow-md shadow-indigo-600/30"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredEntities.map((entity) => {
            const domain = entity.domain;
            const isOn = entity.state === 'on' || entity.state === 'playing' || entity.state === 'cleaning' || entity.state === 'locked';
            const roomName = entity.area?.name || (entity.area_id ? entity.area_id.replace(/_/g, ' ') : 'Unassigned');
            const isBatteryCritical = typeof entity.batteryPct === 'number' && entity.batteryPct <= 20;

            return (
              <motion.div
                key={entity.entity_id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className={`p-4 sm:p-5 rounded-2xl border shadow-xs transition-all relative group flex flex-col justify-between ${
                  isBatteryCritical
                    ? darkMode
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : 'bg-rose-50/80 border-rose-200'
                    : darkMode
                      ? 'bg-slate-900/70 border-white/[0.1] hover:border-indigo-500/40 shadow-xs'
                      : 'bg-white/80 border-black/[0.06] hover:border-indigo-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
                }`}
              >
                {/* Top Row: Domain Tag + Room Tag + Battery */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                        domain === 'light' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                        domain === 'climate' ? 'bg-sky-500/10 text-sky-500 border border-sky-500/20' :
                        domain === 'cover' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                        domain === 'switch' ? 'bg-violet-500/10 text-violet-500 border border-violet-500/20' :
                        domain === 'media_player' ? 'bg-pink-500/10 text-pink-500 border border-pink-500/20' :
                        domain === 'lock' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                        'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                      }`}>
                        {domain}
                      </span>

                      {/* Room Badge with navigation click */}
                      <button
                        onClick={() => {
                          if (entity.area_id && onSelectRoom) {
                            onSelectRoom(entity.area_id);
                          }
                        }}
                        className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-colors ${
                          entity.area_id
                            ? darkMode
                              ? 'bg-slate-800 text-slate-300 hover:bg-indigo-600/30 hover:text-indigo-200'
                              : 'bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                            : 'bg-amber-500/10 text-amber-500'
                        }`}
                        title={entity.area_id ? `View ${roomName} Room` : 'Unassigned to area'}
                      >
                        <span>{roomName}</span>
                        {entity.area_id && <ChevronRight size={10} />}
                      </button>
                    </div>

                    {/* Right Tag: Battery or Power */}
                    <div className="flex items-center gap-1.5">
                      {typeof entity.batteryPct === 'number' && (
                        <span className={`text-[10px] font-bold flex items-center gap-1 px-1.5 py-0.5 rounded-md ${
                          entity.batteryPct <= 20
                            ? 'bg-rose-500/20 text-rose-400 animate-pulse font-black'
                            : darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <BatteryLow size={11} className={entity.batteryPct <= 20 ? 'text-rose-500' : ''} />
                          <span>{entity.batteryPct}%</span>
                        </span>
                      )}

                      {typeof entity.powerWatts === 'number' && entity.powerWatts > 0 && (
                        <span className={`text-[10px] font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${
                          darkMode ? 'bg-amber-950/40 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          <Zap size={10} />
                          <span>{entity.powerWatts}W</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Device Friendly Name & ID */}
                  <div className="mb-3">
                    <h4 className={`text-sm font-extrabold tracking-tight truncate ${darkMode ? 'text-white' : 'text-slate-800'}`} title={entity.name}>
                      {entity.name}
                    </h4>
                    <p className="text-[10px] font-mono text-slate-400 truncate" title={entity.entity_id}>
                      {entity.entity_id}
                    </p>
                  </div>
                </div>

                {/* Bottom Row: Interactive Domain-Specific Controls */}
                <div className={`pt-3 mt-2 border-t flex items-center justify-between gap-2 ${
                  darkMode ? 'border-slate-800/80' : 'border-slate-100'
                }`}>
                  {/* Status Text / Reading */}
                  <div className="min-w-0">
                    <div className="text-[11px] font-extrabold capitalize truncate flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        isOn || entity.state === 'unlocked' ? 'bg-emerald-500' : 'bg-slate-400'
                      }`} />
                      <span className={darkMode ? 'text-slate-200' : 'text-slate-700'}>
                        {domain === 'climate' && entity.attributes.current_temperature 
                          ? `${entity.attributes.current_temperature}°C (${entity.state})`
                          : domain === 'sensor' && entity.attributes.unit_of_measurement
                            ? `${entity.state} ${entity.attributes.unit_of_measurement}`
                            : entity.state}
                      </span>
                    </div>

                    {domain === 'light' && typeof entity.attributes.brightness === 'number' && (
                      <span className="text-[9.5px] text-slate-400">
                        Brightness: {Math.round((entity.attributes.brightness / 255) * 100)}%
                      </span>
                    )}

                    {domain === 'media_player' && entity.attributes.media_title && (
                      <span className="text-[9.5px] text-indigo-400 truncate block max-w-[140px]">
                        {entity.attributes.media_title}
                      </span>
                    )}
                  </div>

                  {/* Action Controls by Domain */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Light Controls */}
                    {domain === 'light' && (
                      <button
                        onClick={() => {
                          const nextState = entity.state === 'on' ? 'off' : 'on';
                          onUpdateEntityState(entity.entity_id, nextState);
                          callHAService('light', nextState === 'on' ? 'turn_on' : 'turn_off', {}, { entity_id: entity.entity_id });
                        }}
                        className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          entity.state === 'on'
                            ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                            : darkMode
                              ? 'bg-slate-800 text-slate-400 hover:text-white'
                              : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                        }`}
                        title="Toggle Light"
                      >
                        <Power size={14} />
                        <span>{entity.state === 'on' ? 'ON' : 'OFF'}</span>
                      </button>
                    )}

                    {/* Switch Controls */}
                    {domain === 'switch' && (
                      <button
                        onClick={() => {
                          const nextState = entity.state === 'on' ? 'off' : 'on';
                          onUpdateEntityState(entity.entity_id, nextState);
                          callHAService('switch', nextState === 'on' ? 'turn_on' : 'turn_off', {}, { entity_id: entity.entity_id });
                        }}
                        className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          entity.state === 'on'
                            ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                            : darkMode
                              ? 'bg-slate-800 text-slate-400 hover:text-white'
                              : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Power size={14} />
                        <span>{entity.state === 'on' ? 'ON' : 'OFF'}</span>
                      </button>
                    )}

                    {/* Climate Controls */}
                    {domain === 'climate' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            const cur = Number(entity.attributes.temperature || 21);
                            const next = cur - 0.5;
                            onUpdateEntityState(entity.entity_id, entity.state, { temperature: next });
                            callHAService('climate', 'set_temperature', { temperature: next }, { entity_id: entity.entity_id });
                          }}
                          className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer ${
                            darkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                          }`}
                          title="Decrease Target Temp"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold px-1">{entity.attributes.temperature || 21}°</span>
                        <button
                          onClick={() => {
                            const cur = Number(entity.attributes.temperature || 21);
                            const next = cur + 0.5;
                            onUpdateEntityState(entity.entity_id, entity.state, { temperature: next });
                            callHAService('climate', 'set_temperature', { temperature: next }, { entity_id: entity.entity_id });
                          }}
                          className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer ${
                            darkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                          }`}
                          title="Increase Target Temp"
                        >
                          +
                        </button>
                      </div>
                    )}

                    {/* Cover Controls */}
                    {domain === 'cover' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            onUpdateEntityState(entity.entity_id, 'open', { current_position: 100 });
                            callHAService('cover', 'open_cover', {}, { entity_id: entity.entity_id });
                          }}
                          className={`p-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                            darkMode ? 'bg-slate-800 text-slate-300 hover:bg-emerald-600/30' : 'bg-slate-100 text-slate-700 hover:bg-emerald-50'
                          }`}
                          title="Open Shade / Blind"
                        >
                          <PanelTopClose size={14} />
                        </button>
                        <button
                          onClick={() => {
                            onUpdateEntityState(entity.entity_id, 'closed', { current_position: 0 });
                            callHAService('cover', 'close_cover', {}, { entity_id: entity.entity_id });
                          }}
                          className={`p-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                            darkMode ? 'bg-slate-800 text-slate-300 hover:bg-rose-600/30' : 'bg-slate-100 text-slate-700 hover:bg-rose-50'
                          }`}
                          title="Close Shade / Blind"
                        >
                          <PanelBottomClose size={14} />
                        </button>
                      </div>
                    )}

                    {/* Lock Controls */}
                    {domain === 'lock' && (
                      <button
                        onClick={() => {
                          const nextState = entity.state === 'locked' ? 'unlocked' : 'locked';
                          onUpdateEntityState(entity.entity_id, nextState);
                          callHAService('lock', nextState, {}, { entity_id: entity.entity_id });
                        }}
                        className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          entity.state === 'locked'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-rose-600 text-white shadow-md shadow-rose-600/30 animate-pulse'
                        }`}
                      >
                        {entity.state === 'locked' ? <Lock size={13} /> : <Unlock size={13} />}
                        <span>{entity.state === 'locked' ? 'Locked' : 'Unlocked'}</span>
                      </button>
                    )}

                    {/* Media Player Controls */}
                    {domain === 'media_player' && (
                      <button
                        onClick={() => {
                          const nextState = entity.state === 'playing' ? 'paused' : 'playing';
                          onUpdateEntityState(entity.entity_id, nextState);
                          callHAService('media_player', nextState === 'playing' ? 'media_play' : 'media_pause', {}, { entity_id: entity.entity_id });
                        }}
                        className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          entity.state === 'playing'
                            ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                            : darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {entity.state === 'playing' ? <Pause size={13} /> : <Play size={13} />}
                        <span>{entity.state === 'playing' ? 'Playing' : 'Paused'}</span>
                      </button>
                    )}

                    {/* Vacuum Controls */}
                    {domain === 'vacuum' && (
                      <button
                        onClick={() => {
                          const nextState = entity.state === 'cleaning' ? 'docked' : 'cleaning';
                          onUpdateEntityState(entity.entity_id, nextState);
                          callHAService('vacuum', nextState === 'cleaning' ? 'start' : 'return_to_base', {}, { entity_id: entity.entity_id });
                        }}
                        className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          entity.state === 'cleaning'
                            ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                            : darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Bot size={13} />
                        <span>{entity.state === 'cleaning' ? 'Cleaning' : 'Docked'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
