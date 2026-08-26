/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lightbulb, 
  Thermometer, 
  Activity, 
  ToggleLeft, 
  Bot, 
  Music, 
  Lock, 
  Unlock, 
  Search, 
  SlidersHorizontal,
  Droplets,
  Wind,
  Shield,
  Zap,
  Radio,
  Sun,
  Flame,
  CheckCircle2,
  XCircle,
  EyeOff,
  Battery,
  BatteryLow,
  BatteryWarning,
  AlertTriangle,
  Wrench
} from 'lucide-react';
import { Room, HAEntity, MaintenanceTask } from '../types';
import BatteryStatusCard from './BatteryStatusCard';

interface RoomDetailSectionProps {
  room: Room;
  entities: HAEntity[];
  rooms?: Room[];
  maintenanceTasks?: MaintenanceTask[];
  onUpdateEntityState: (entityId: string, newState: string, newAttributes?: any) => void;
  onSelectRoom?: (roomId: string) => void;
  onViewHealth?: () => void;
  darkMode: boolean;
}

type DeviceCategory = 'all' | 'lights' | 'sensors' | 'climate' | 'switches' | 'appliances' | 'battery';

export function getEntityCategory(entityId: string): 'lights' | 'climate' | 'sensors' | 'switches' | 'appliances' {
  if (entityId.startsWith('light.')) return 'lights';
  if (entityId.startsWith('climate.') || entityId.startsWith('humidifier.')) return 'climate';
  if (entityId.startsWith('sensor.') || entityId.startsWith('binary_sensor.')) return 'sensors';
  if (entityId.startsWith('switch.')) return 'switches';
  return 'appliances';
}

export default function RoomDetailSection({
  room,
  entities,
  rooms = [],
  maintenanceTasks = [],
  onUpdateEntityState,
  onSelectRoom,
  onViewHealth,
  darkMode
}: RoomDetailSectionProps) {
  const [activeCategory, setActiveCategory] = useState<DeviceCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all entities assigned to this room
  const roomEntities = useMemo(() => {
    return entities.filter(ent => room.entityIds.includes(ent.entity_id));
  }, [entities, room.entityIds]);

  // Battery-powered IoT devices in this room
  const roomBatteryDevices = useMemo(() => {
    return roomEntities.filter(ent => typeof ent.attributes.battery === 'number');
  }, [roomEntities]);

  const criticalBatteries = useMemo(() => {
    return roomBatteryDevices.filter(ent => Number(ent.attributes.battery) <= 20);
  }, [roomBatteryDevices]);

  const warningBatteries = useMemo(() => {
    return roomBatteryDevices.filter(ent => {
      const b = Number(ent.attributes.battery);
      return b > 20 && b <= 49;
    });
  }, [roomBatteryDevices]);

  // Compute category counts for pills
  const categoryCounts = useMemo(() => {
    const counts: Record<DeviceCategory, number> = {
      all: roomEntities.length,
      lights: 0,
      sensors: 0,
      climate: 0,
      switches: 0,
      appliances: 0,
      battery: roomBatteryDevices.length
    };

    roomEntities.forEach(ent => {
      const cat = getEntityCategory(ent.entity_id);
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return counts;
  }, [roomEntities, roomBatteryDevices]);

  // Filter entities according to active category and search
  const filteredEntities = useMemo(() => {
    return roomEntities.filter(ent => {
      // Category filter
      if (activeCategory === 'battery') {
        return typeof ent.attributes.battery === 'number';
      }
      if (activeCategory !== 'all') {
        const cat = getEntityCategory(ent.entity_id);
        if (cat !== activeCategory) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (ent.attributes.friendly_name || '').toLowerCase();
        const id = ent.entity_id.toLowerCase();
        return name.includes(q) || id.includes(q);
      }

      return true;
    });
  }, [roomEntities, activeCategory, searchQuery]);

  const categories: { id: DeviceCategory; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'all', label: 'All Devices', icon: SlidersHorizontal },
    { id: 'lights', label: 'Lights', icon: Sun },
    { id: 'climate', label: 'Climate', icon: Thermometer },
    { id: 'sensors', label: 'Sensors', icon: Activity },
    { id: 'switches', label: 'Switches', icon: ToggleLeft },
    { id: 'appliances', label: 'Appliances', icon: Bot },
    { id: 'battery', label: 'IoT Batteries', icon: Battery }
  ];

  // Helper for entity icons
  const getEntityIcon = (ent: HAEntity) => {
    const id = ent.entity_id;
    if (id.startsWith('light.')) return Lightbulb;
    if (id.startsWith('climate.')) return Thermometer;
    if (id.startsWith('humidifier.')) return Droplets;
    if (id.startsWith('vacuum.')) return Bot;
    if (id.startsWith('media_player.')) return Music;
    if (id.startsWith('lock.')) return ent.state === 'locked' ? Lock : Unlock;
    if (id.startsWith('binary_sensor.doorbell')) return Radio;
    if (id.startsWith('sensor.') && id.includes('air')) return Wind;
    if (id.startsWith('sensor.') && id.includes('smoke')) return Flame;
    if (id.startsWith('sensor.') && id.includes('motion')) return Shield;
    if (id.startsWith('sensor.')) return Activity;
    if (id.startsWith('switch.')) return Zap;
    return ToggleLeft;
  };

  return (
    <motion.section 
      layout
      id="room-expansion-details" 
      className={`backdrop-blur-2xl rounded-[32px] p-5 sm:p-6 transition-all duration-300 shadow-xs border ${
        darkMode 
          ? 'bg-slate-900/50 border-white/10' 
          : 'bg-white/50 border-white/70'
      }`}
    >
      {/* Top Header with title and quick summary */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-baseline gap-2 mb-4 pb-3 border-b ${
        darkMode ? 'border-slate-800' : 'border-white/80'
      }`}>
        <div>
          <span className={`text-[10px] font-black uppercase tracking-wider block ${
            darkMode ? 'text-[#9D8BFF]' : 'text-[#7B61FF]'
          }`}>Quick room focus</span>
          <h3 className={`text-base sm:text-lg font-extrabold inline-flex items-center gap-2 mt-0.5 ${
            darkMode ? 'text-white' : 'text-slate-800'
          }`}>
            Devices in {room.name}
          </h3>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-start flex-wrap">
          {criticalBatteries.length > 0 && (
            <button
              onClick={() => setActiveCategory('battery')}
              className={`text-[10px] px-3 py-1 rounded-full font-bold border flex items-center gap-1.5 cursor-pointer transition-all ${
                activeCategory === 'battery'
                  ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                  : darkMode
                    ? 'bg-rose-500/15 border-rose-500/35 text-rose-300 hover:bg-rose-500/25'
                    : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <BatteryLow size={12} className="animate-pulse text-rose-400" />
              <span>{criticalBatteries.length} Critical Bat Alert</span>
            </button>
          )}

          <span className={`text-[10px] px-3 py-1 rounded-full font-bold border ${
            darkMode 
              ? 'bg-[#7B61FF]/20 border-[#7B61FF]/40 text-[#9D8BFF]' 
              : 'bg-[#7B61FF]/10 border-[#7B61FF]/20 text-[#7B61FF]'
          }`}>
            {roomEntities.length} Total Registered
          </span>
          <span className={`text-[10px] px-3 py-1 rounded-full font-bold border ${
            darkMode 
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
              : 'bg-emerald-50 border-emerald-100 text-emerald-700'
          }`}>
            {roomEntities.filter(e => e.state === 'on' || e.state === 'playing' || e.state === 'locked').length} Active
          </span>
        </div>
      </div>

      {/* FILTERABLE DEVICE CATEGORY MENU */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between mb-5">
        {/* Category Tab Pills */}
        <div 
          id="room-category-filters"
          role="tablist"
          aria-label="Filter devices by category"
          className={`flex items-center gap-1.5 overflow-x-auto pb-1.5 lg:pb-0 scrollbar-none p-1 rounded-2xl border ${
            darkMode ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-100/80 border-slate-200/60'
          }`}
        >
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            const count = categoryCounts[cat.id];

            // Hide categories with 0 devices unless it's 'all'
            if (cat.id !== 'all' && count === 0) return null;

            return (
              <button
                key={cat.id}
                id={`btn-category-${cat.id}`}
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-[#7B61FF] text-white shadow-md shadow-[#7B61FF]/30 scale-[1.02]'
                    : darkMode
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Icon size={14} className={isSelected ? 'text-white' : ''} />
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected 
                    ? 'bg-white/20 text-white' 
                    : darkMode 
                      ? 'bg-slate-800 text-slate-400' 
                      : 'bg-slate-200 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Search within room */}
        <div className="relative min-w-[200px]">
          <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${
            darkMode ? 'text-slate-500' : 'text-slate-400'
          }`} />
          <input
            id="input-search-room-devices"
            type="text"
            placeholder="Search room entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full text-xs pl-8 pr-7 py-2 rounded-xl border focus:outline-hidden transition-all ${
              darkMode 
                ? 'bg-slate-950/70 border-slate-800 text-white placeholder-slate-500 focus:border-[#7B61FF]' 
                : 'bg-white/80 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#7B61FF]'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* CONDITIONAL BATTERY STATUS CARD OR ENTITIES GRID */}
      {activeCategory === 'battery' ? (
        <BatteryStatusCard
          room={room}
          entities={entities}
          rooms={rooms}
          darkMode={darkMode}
          onSelectRoom={onSelectRoom}
        />
      ) : filteredEntities.length === 0 ? (
        <div className={`p-8 text-center rounded-2xl border ${
          darkMode ? 'bg-slate-950/40 border-slate-800/80 text-slate-400' : 'bg-white/40 border-slate-100 text-slate-500'
        }`}>
          <EyeOff size={28} className="mx-auto mb-2 opacity-50" />
          <p className="text-xs font-bold">No entities matching the current category or filter.</p>
          <button
            onClick={() => {
              setActiveCategory('all');
              setSearchQuery('');
            }}
            className="mt-2 text-xs font-bold text-[#7B61FF] hover:underline cursor-pointer"
          >
            Show all devices in {room.name}
          </button>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          <AnimatePresence mode="popLayout">
            {filteredEntities.map((ent) => {
              const Icon = getEntityIcon(ent);
              const isEntityOn = ent.state === 'on' || ent.state === 'playing' || ent.state === 'locked' || ent.state === 'optimal';
              const isSensor = ent.entity_id.startsWith('sensor.') || ent.entity_id.startsWith('binary_sensor.');
              const isLock = ent.entity_id.startsWith('lock.');
              const isMedia = ent.entity_id.startsWith('media_player.');

              // Find pending maintenance task for this specific device
              const devTask = maintenanceTasks.find(t => t.entityId === ent.entity_id && (t.status === 'overdue' || t.status === 'due_soon'));

              return (
                <motion.div 
                  layout
                  key={ent.entity_id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all backdrop-blur-xl group relative overflow-hidden ${
                    isEntityOn 
                      ? darkMode
                        ? 'bg-slate-900/90 border-[#7B61FF]/50 shadow-md shadow-[#7B61FF]/15'
                        : 'bg-white/90 border-[#7B61FF]/40 shadow-md shadow-[#7B61FF]/10' 
                      : darkMode
                        ? 'bg-slate-900/40 border-slate-800 text-slate-400'
                        : 'bg-white/70 border-slate-100/90 shadow-2xs hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Device Icon Badge */}
                    <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center transition-colors border ${
                      isEntityOn 
                        ? darkMode 
                          ? 'bg-[#7B61FF]/25 border-[#7B61FF]/40 text-[#9D8BFF]' 
                          : 'bg-[#7B61FF]/15 border-[#7B61FF]/30 text-[#7B61FF]' 
                        : darkMode
                          ? 'bg-slate-800 border-slate-700 text-slate-500'
                          : 'bg-slate-100 border-slate-200 text-slate-400'
                    }`}>
                      <Icon size={17} />
                    </div>

                    {/* Device Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h5 className={`font-extrabold text-xs truncate ${
                          darkMode ? (isEntityOn ? 'text-white' : 'text-slate-300') : 'text-slate-800'
                        }`}>
                          {ent.attributes.friendly_name}
                        </h5>
                        {devTask && (
                          <button
                            type="button"
                            onClick={onViewHealth}
                            title={`${devTask.taskTitle} - ${devTask.status === 'overdue' ? 'Overdue' : 'Due Soon'}`}
                            className={`inline-flex items-center gap-0.5 text-[8.5px] font-black uppercase px-1.5 py-0.2 rounded-md border cursor-pointer ${
                              devTask.status === 'overdue'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            <Wrench size={8} />
                            <span>{devTask.status === 'overdue' ? 'Service Overdue' : 'Service Due'}</span>
                          </button>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mt-0.5">
                        <span className="font-mono truncate">{ent.entity_id}</span>
                        {ent.attributes.power !== undefined && ent.attributes.power > 0 && (
                          <span className="shrink-0 text-amber-400 font-bold">
                            {ent.attributes.power}W
                          </span>
                        )}
                        {ent.attributes.temperature !== undefined && (
                          <span className="shrink-0 text-rose-400 font-bold">
                            {ent.attributes.temperature}°C
                          </span>
                        )}
                        {ent.attributes.battery !== undefined && (
                          <span className="shrink-0 text-emerald-400 font-bold">
                            {ent.attributes.battery}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Controller: Switch Toggle or Sensor Pill */}
                  {isSensor ? (
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold shrink-0 border ${
                      ent.state === 'optimal' || ent.state === 'clear' || ent.state === 'off'
                        ? darkMode ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : darkMode ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}>
                      {ent.state}
                    </div>
                  ) : (
                    <div className="relative flex items-center justify-center shrink-0">
                      {isEntityOn && (
                        <motion.div 
                          animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.7, 0.4] }}
                          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                          className="absolute -inset-1.5 bg-[#7B61FF] rounded-full blur-sm pointer-events-none" 
                          style={{ boxShadow: '0 0 12px rgba(123, 97, 255, 0.6)' }}
                        />
                      )}
                      <button
                        id={`btn-toggle-entity-${ent.entity_id}`}
                        aria-label={`Toggle ${ent.attributes.friendly_name}`}
                        onClick={() => {
                          let nextState = 'off';
                          if (isLock) {
                            nextState = ent.state === 'locked' ? 'unlocked' : 'locked';
                          } else if (isMedia) {
                            nextState = ent.state === 'playing' ? 'paused' : 'playing';
                          } else {
                            nextState = ent.state === 'on' ? 'off' : 'on';
                          }
                          onUpdateEntityState(ent.entity_id, nextState);
                        }}
                        className={`w-9.5 h-5.5 rounded-full relative transition-all border shrink-0 cursor-pointer z-10 ${
                          isEntityOn 
                            ? 'bg-[#7B61FF] border-[#7B61FF] ring-1 ring-[#7B61FF]/40' 
                            : darkMode
                              ? 'bg-slate-800 hover:bg-slate-700 border-slate-700'
                              : 'bg-slate-100 hover:bg-slate-200 border-slate-200'
                        }`}
                        style={{
                          boxShadow: isEntityOn ? '0 2px 10px rgba(123, 97, 255, 0.5)' : undefined
                        }}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                          isEntityOn ? 'right-0.5' : 'left-0.5'
                        }`} />
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.section>
  );
}
