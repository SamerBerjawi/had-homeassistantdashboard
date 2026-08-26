/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sofa, 
  BedDouble, 
  Cookie, 
  KeyRound, 
  Bath, 
  Tv, 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Thermometer, 
  Droplets, 
  Zap, 
  Power, 
  ArrowLeft, 
  Sparkles, 
  Check, 
  Lightbulb, 
  ChevronRight,
  Sun,
  Flame,
  Volume2,
  Lock,
  Unlock,
  Wind,
  Shield,
  Bot,
  Wrench,
  BatteryLow,
  Sliders,
  Filter,
  Layers,
  HelpCircle,
  Network
} from 'lucide-react';
import { Room, HAEntity, MaintenanceTask } from '../types';
import RoomDetailSection from './RoomDetailSection';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';

interface RoomsViewProps {
  rooms: Room[];
  entities: HAEntity[];
  maintenanceTasks?: MaintenanceTask[];
  onUpdateEntityState: (entityId: string, newState: string, newAttributes?: any) => void;
  onToggleAllInRoom: (roomId: string, forceTurnOn?: boolean) => void;
  onAddRoom?: (newRoom: Partial<Room>) => void;
  onViewHealth?: () => void;
  onOpenEnergy?: () => void;
  onOpenGraphInspector?: () => void;
  initialSelectedRoomId?: string | null;
  darkMode: boolean;
}

export default function RoomsView({
  rooms,
  entities,
  maintenanceTasks = [],
  onUpdateEntityState,
  onToggleAllInRoom,
  onAddRoom,
  onViewHealth,
  onOpenEnergy,
  onOpenGraphInspector,
  initialSelectedRoomId = null,
  darkMode
}: RoomsViewProps) {
  const {
    resolvedFloors,
    resolvedAreas,
    unassignedEntities,
    metrics
  } = useAutoLayoutStore();

  // If activeRoomId is set, show the dedicated Room Page; if null, show all rooms grid
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(initialSelectedRoomId);
  const [selectedFloorFilter, setSelectedFloorFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'devices' | 'temp' | 'power'>('name');
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showUnassignedDrawer, setShowUnassignedDrawer] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomIcon, setNewRoomIcon] = useState('Sofa');

  // Compute room statistics
  const roomStats = useMemo(() => {
    return rooms.map(room => {
      const roomEntities = entities.filter(ent => room.entityIds.includes(ent.entity_id));
      const activeCount = roomEntities.filter(ent => ent.state === 'on' || ent.state === 'playing' || ent.state === 'locked').length;
      const totalPower = roomEntities.reduce((sum, ent) => sum + (Number(ent.attributes.power) || 0), 0);
      const hasOverdueTasks = maintenanceTasks.some(t => room.entityIds.includes(t.entityId) && t.status === 'overdue');
      const criticalBatteries = roomEntities.filter(ent => typeof ent.attributes.battery === 'number' && ent.attributes.battery <= 20).length;

      // Find matching resolvedArea to get floor info
      const matchingResolvedArea = resolvedAreas.find(ra => ra.area_id === room.id || ra.name.toLowerCase() === room.name.toLowerCase());
      const floorId = matchingResolvedArea?.floor_id || 'ground_floor';
      const floorName = matchingResolvedArea?.floor?.name || (room.id === 'master_bedroom' ? 'First Floor' : 'Ground Floor');

      return {
        room,
        roomEntities,
        activeCount,
        totalCount: roomEntities.length,
        totalPower: Math.round(totalPower * 10) / 10,
        hasOverdueTasks,
        criticalBatteries,
        floorId,
        floorName,
        resolvedArea: matchingResolvedArea
      };
    });
  }, [rooms, entities, maintenanceTasks, resolvedAreas]);

  // Filter by Floor & Search & Sort
  const filteredRooms = useMemo(() => {
    return roomStats
      .filter(({ room, floorId }) => {
        // Floor filter
        if (selectedFloorFilter !== 'all') {
          if (selectedFloorFilter === 'ground_floor' && floorId !== 'ground_floor') return false;
          if (selectedFloorFilter === 'first_floor' && floorId !== 'first_floor') return false;
          if (selectedFloorFilter === 'outdoors' && floorId !== 'outdoors' && room.id !== 'hallway') return false;
        }

        // Search query
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return room.name.toLowerCase().includes(q) || room.id.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.room.name.localeCompare(b.room.name);
        if (sortBy === 'devices') return b.activeCount - a.activeCount;
        if (sortBy === 'temp') return b.room.temperature - a.room.temperature;
        if (sortBy === 'power') return b.totalPower - a.totalPower;
        return 0;
      });
  }, [roomStats, selectedFloorFilter, searchQuery, sortBy]);

  const activeSelectedRoom = useMemo(() => {
    return rooms.find(r => r.id === selectedRoomId) || null;
  }, [rooms, selectedRoomId]);

  // Map icon helper
  const renderRoomIcon = (iconName: string, size = 20) => {
    switch (iconName) {
      case 'BedDouble': return <BedDouble size={size} />;
      case 'Cookie': return <Cookie size={size} />;
      case 'KeyRound': return <KeyRound size={size} />;
      case 'Bath': return <Bath size={size} />;
      case 'Tv': return <Tv size={size} />;
      case 'Sofa':
      default:
        return <Sofa size={size} />;
    }
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    if (onAddRoom) {
      const generatedId = newRoomName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      onAddRoom({
        id: generatedId,
        name: newRoomName.trim(),
        icon: newRoomIcon,
        temperature: 21.5,
        humidity: 46,
        devicesCount: 0,
        entityIds: [],
        bannerImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=500&auto=format&fit=crop'
      });
    }

    setNewRoomName('');
    setShowAddRoomModal(false);
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col min-h-0">
      {/* If a Room is selected, render the dedicated Room Detail Page with Back Navigation */}
      {activeSelectedRoom ? (
        <div className="space-y-6">
          {/* Room Breadcrumb & Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <button
                id="btn-back-to-rooms"
                onClick={() => setSelectedRoomId(null)}
                className={`p-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all border cursor-pointer ${
                  darkMode 
                    ? 'bg-slate-900/80 hover:bg-slate-800 border-slate-700 text-slate-200 shadow-sm' 
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-xs'
                }`}
              >
                <ArrowLeft size={16} />
                <span>All Rooms</span>
              </button>

              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  darkMode ? 'bg-indigo-600/20 text-[#9D8BFF]' : 'bg-indigo-100 text-indigo-600'
                }`}>
                  {renderRoomIcon(activeSelectedRoom.icon, 18)}
                </div>
                <div>
                  <h2 className={`text-lg font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    {activeSelectedRoom.name}
                  </h2>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {activeSelectedRoom.entityIds.length} connected smart devices
                  </span>
                </div>
              </div>
            </div>

            {/* Room Switcher Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 touch-scroll-container">
              {rooms.map(r => {
                const isCurrent = r.id === activeSelectedRoom.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoomId(r.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                      isCurrent
                        ? 'bg-[#7B61FF] text-white border-[#7B61FF] shadow-sm shadow-[#7B61FF]/30'
                        : darkMode
                          ? 'bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-300'
                          : 'bg-slate-100/80 hover:bg-slate-200/80 border-slate-200/70 text-slate-700'
                    }`}
                  >
                    {r.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Deep Interactive Room Detail Section */}
          <RoomDetailSection 
            room={activeSelectedRoom}
            entities={entities}
            rooms={rooms}
            maintenanceTasks={maintenanceTasks}
            onUpdateEntityState={onUpdateEntityState}
            onSelectRoom={(rId) => setSelectedRoomId(rId)}
            onViewHealth={onViewHealth}
            darkMode={darkMode}
          />
        </div>
      ) : (
        /* ALL ROOMS OVERVIEW GRID */
        <div className="space-y-6">
          {/* Header Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  Rooms & Living Spaces
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#7B61FF]/15 text-[#7B61FF] dark:text-[#9D8BFF] border border-[#7B61FF]/30">
                  HAPulse Ingested ({rooms.length} Areas)
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Automatically resolved from Home Assistant area and device registries.
              </p>
            </div>

            {/* Action buttons & Graph inspector trigger */}
            <div className="flex flex-wrap items-center gap-2.5">
              {onOpenGraphInspector && (
                <button
                  onClick={onOpenGraphInspector}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                    darkMode
                      ? 'bg-slate-900/80 hover:bg-slate-800 border-slate-700 text-indigo-300'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-[#7B61FF]'
                  }`}
                >
                  <Network size={14} />
                  <span>Graph Inspector</span>
                </button>
              )}

              {/* Unassigned Pool Drawer Toggle */}
              {unassignedEntities.length > 0 && (
                <button
                  onClick={() => setShowUnassignedDrawer(!showUnassignedDrawer)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                    showUnassignedDrawer
                      ? 'bg-amber-500 text-white border-amber-400'
                      : darkMode
                        ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-300'
                        : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800'
                  }`}
                >
                  <HelpCircle size={14} />
                  <span>Unassigned Devices ({unassignedEntities.length})</span>
                </button>
              )}

              {/* Add Room Button */}
              {onAddRoom && (
                <button
                  id="btn-add-room"
                  onClick={() => setShowAddRoomModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#7B61FF] hover:bg-[#684be3] text-white text-xs font-bold shadow-md shadow-[#7B61FF]/30 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Room</span>
                </button>
              )}
            </div>
          </div>

          {/* Floor Level Filter Tabs & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
            {/* Floor Navigation Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: `All Spaces (${rooms.length})` },
                { id: 'ground_floor', label: 'Ground Floor' },
                { id: 'first_floor', label: 'First Floor' },
                { id: 'outdoors', label: 'Outdoors' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFloorFilter(f.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                    selectedFloorFilter === f.id
                      ? 'bg-[#7B61FF] text-white border-[#7B61FF] shadow-sm shadow-[#7B61FF]/30'
                      : darkMode
                        ? 'bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-300'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search and Sort controls */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-xs shadow-xs ${
                darkMode ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                <Search size={13} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter areas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-hidden placeholder-slate-400 text-xs w-24 sm:w-32"
                />
              </div>

              {/* Sort selector */}
              <div className={`p-1 rounded-2xl flex items-center gap-1 border shadow-2xs backdrop-blur-md ${
                darkMode ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-100/90 border-slate-200/70'
              }`}>
                <span className="text-[10px] font-black uppercase text-slate-400 px-2">Sort:</span>
                {(['name', 'devices', 'temp', 'power'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSortBy(opt)}
                    className={`px-2 py-1 rounded-xl text-[10px] font-bold capitalize transition-all cursor-pointer ${
                      sortBy === opt
                        ? 'bg-[#7B61FF] text-white shadow-xs'
                        : darkMode
                          ? 'text-slate-400 hover:text-slate-200'
                          : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt === 'devices' ? 'Active' : opt === 'temp' ? 'Climate' : opt === 'power' ? 'Load' : 'Name'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Optional Unassigned Devices Panel */}
          <AnimatePresence>
            {showUnassignedDrawer && unassignedEntities.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`p-5 rounded-3xl border mb-6 overflow-hidden ${
                  darkMode ? 'bg-amber-950/20 border-amber-500/30 text-slate-200' : 'bg-amber-50/80 border-amber-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <HelpCircle size={16} className="text-amber-500" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-500">
                      Unassigned Device Pool ({unassignedEntities.length} Entities)
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Entities without an area_id in HA registry or device registry
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {unassignedEntities.map(ent => (
                    <div
                      key={ent.entity_id}
                      className={`p-3 rounded-2xl border flex items-center justify-between ${
                        darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-xs block truncate">{ent.name}</span>
                        <span className="font-mono text-[9px] text-slate-400 block truncate">{ent.entity_id}</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-slate-500/10 text-slate-400 font-bold">
                        {ent.state}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Rooms Overview Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredRooms.map(({ room, roomEntities, activeCount, totalCount, totalPower, hasOverdueTasks, criticalBatteries, floorName }) => {
              const anyActive = activeCount > 0;
              return (
                <motion.div
                  key={room.id}
                  layout
                  whileHover={{ y: -3 }}
                  className={`rounded-[28px] p-5 border transition-all relative overflow-hidden flex flex-col justify-between group shadow-sm ${
                    darkMode 
                      ? 'bg-slate-900/70 hover:bg-slate-900/90 border-slate-800/80 hover:border-[#7B61FF]/50' 
                      : 'bg-white hover:bg-slate-50/80 border-slate-200/80 hover:border-[#7B61FF]/50'
                  }`}
                >
                  {/* Card Background Subtle Accent */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#7B61FF]/10 to-transparent rounded-bl-full pointer-events-none" />

                  <div>
                    {/* Top Row: Icon + Room Name + Master Room Power Toggle */}
                    <div className="flex items-start justify-between gap-2 mb-4 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs transition-colors ${
                          anyActive
                            ? 'bg-[#7B61FF] text-white border-[#7B61FF] shadow-[#7B61FF]/30'
                            : darkMode
                              ? 'bg-slate-800 text-slate-400 border-slate-700'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {renderRoomIcon(room.icon, 22)}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className={`font-extrabold text-base leading-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                              {room.name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-400 font-medium">
                              {activeCount} of {totalCount} active
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-500">
                              {floorName}
                            </span>
                            {criticalBatteries > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-md border border-rose-500/20">
                                <BatteryLow size={9} />
                                {criticalBatteries} Low
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Master Room Toggle */}
                      <button
                        title={anyActive ? `Turn off all devices in ${room.name}` : `Turn on default devices in ${room.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleAllInRoom(room.id, !anyActive);
                        }}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer shadow-xs ${
                          anyActive
                            ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/30'
                            : darkMode
                              ? 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                              : 'bg-slate-100 text-slate-400 border-slate-200 hover:text-slate-700'
                        }`}
                      >
                        <Power size={15} />
                      </button>
                    </div>

                    {/* Room Telemetry Badges */}
                    <div className="grid grid-cols-3 gap-2 my-4">
                      {/* Temperature */}
                      <div className={`p-2.5 rounded-2xl border text-center ${
                        darkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200/60'
                      }`}>
                        <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] font-bold">
                          <Thermometer size={11} className="text-rose-400" />
                          <span>Temp</span>
                        </div>
                        <span className={`text-xs font-black mt-0.5 block ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                          {room.temperature}°C
                        </span>
                      </div>

                      {/* Humidity */}
                      <div className={`p-2.5 rounded-2xl border text-center ${
                        darkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200/60'
                      }`}>
                        <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] font-bold">
                          <Droplets size={11} className="text-sky-400" />
                          <span>Humidity</span>
                        </div>
                        <span className={`text-xs font-black mt-0.5 block ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                          {room.humidity}%
                        </span>
                      </div>

                      {/* Power Draw */}
                      <div className={`p-2.5 rounded-2xl border text-center ${
                        darkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200/60'
                      }`}>
                        <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] font-bold">
                          <Zap size={11} className="text-amber-400" />
                          <span>Power</span>
                        </div>
                        <span className={`text-xs font-black mt-0.5 block ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                          {totalPower}W
                        </span>
                      </div>
                    </div>

                    {/* Room Key Devices Preview */}
                    <div className="space-y-1.5 mb-4">
                      {roomEntities.slice(0, 3).map(ent => {
                        const isEntActive = ent.state === 'on' || ent.state === 'playing' || ent.state === 'locked';
                        return (
                          <div
                            key={ent.entity_id}
                            className={`flex items-center justify-between p-2 rounded-xl text-xs border transition-colors ${
                              darkMode ? 'bg-slate-950/40 border-slate-800/50' : 'bg-slate-50/70 border-slate-100'
                            }`}
                          >
                            <span className="truncate max-w-[140px] font-medium text-slate-400">
                              {ent.attributes.friendly_name}
                            </span>
                            <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md ${
                              isEntActive
                                ? 'bg-[#7B61FF]/15 text-[#7B61FF] dark:text-[#9D8BFF]'
                                : darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200/80 text-slate-500'
                            }`}>
                              {ent.state}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Action: Open Room Controls */}
                  <button
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`w-full py-2.5 px-4 rounded-xl flex items-center justify-between text-xs font-bold transition-all border cursor-pointer ${
                      darkMode 
                        ? 'bg-slate-800/70 hover:bg-[#7B61FF] text-slate-200 hover:text-white border-slate-700 hover:border-[#7B61FF]' 
                        : 'bg-indigo-50/80 hover:bg-[#7B61FF] text-indigo-700 hover:text-white border-indigo-100 hover:border-[#7B61FF]'
                    }`}
                  >
                    <span>Manage {room.name}</span>
                    <ChevronRight size={14} />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ADD ROOM MODAL */}
      <AnimatePresence>
        {showAddRoomModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${
                darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <h3 className="text-base font-extrabold mb-1">Add New Living Space</h3>
              <p className="text-xs text-slate-400 mb-4">Create a room zone to organize smart sensors and fixtures.</p>

              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className="text-xs font-bold block mb-1.5">Room Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Master Bedroom, Home Office, Balcony"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-xs font-medium border outline-hidden ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-[#7B61FF]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#7B61FF]'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1.5">Room Icon</label>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { id: 'Sofa', icon: Sofa, label: 'Lounge' },
                      { id: 'BedDouble', icon: BedDouble, label: 'Bedroom' },
                      { id: 'Cookie', icon: Cookie, label: 'Kitchen' },
                      { id: 'Bath', icon: Bath, label: 'Bath' },
                      { id: 'Tv', icon: Tv, label: 'Media' }
                    ].map(item => {
                      const Icon = item.icon;
                      const isSel = newRoomIcon === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setNewRoomIcon(item.id)}
                          className={`p-3 rounded-xl flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                            isSel
                              ? 'bg-[#7B61FF] text-white border-[#7B61FF]'
                              : darkMode
                                ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Icon size={18} />
                          <span className="text-[9px] font-bold">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/50 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddRoomModal(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                      darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#7B61FF] hover:bg-[#684be3] text-white text-xs font-bold shadow-md shadow-[#7B61FF]/30 cursor-pointer"
                  >
                    Create Room
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
