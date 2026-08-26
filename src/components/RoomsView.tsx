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
  BatteryWarning,
  Battery,
  Sliders,
  Filter,
  Layers,
  HelpCircle,
  TrendingUp,
  LayoutGrid,
  Network,
  Home,
  Building2,
  Trees,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  ArrowRight,
  GripVertical
} from 'lucide-react';
import { BentoGrid } from './ui/bento-grid';
import { Dock, DockIcon } from './ui/dock';
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

  // Selected dedicated room ID or null for overview
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(initialSelectedRoomId);
  const [selectedFloorFilter, setSelectedFloorFilter] = useState<string>('all');
  const [groupingMode, setGroupingMode] = useState<'floor' | 'alphabetical'>('floor');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'devices' | 'temp' | 'power'>('name');
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showUnassignedDrawer, setShowUnassignedDrawer] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomIcon, setNewRoomIcon] = useState('Sofa');

  // Compute room statistics and attach resolved Home Assistant area and floor metadata
  const roomStats = useMemo(() => {
    return rooms.map(room => {
      const roomEntities = entities.filter(ent => room.entityIds.includes(ent.entity_id));
      const activeCount = roomEntities.filter(ent => ent.state === 'on' || ent.state === 'playing' || ent.state === 'locked').length;
      const totalPower = roomEntities.reduce((sum, ent) => sum + (Number(ent.attributes.power) || 0), 0);
      const hasOverdueTasks = maintenanceTasks.some(t => room.entityIds.includes(t.entityId) && t.status === 'overdue');
      const criticalBatteries = roomEntities.filter(ent => typeof ent.attributes.battery === 'number' && ent.attributes.battery <= 20).length;

      // Find matching resolvedArea from Home Assistant registry
      const matchingResolvedArea = resolvedAreas.find(ra => 
        ra.area_id === room.id || 
        ra.name.toLowerCase() === room.name.toLowerCase()
      );
      
      const floorId = matchingResolvedArea?.floor_id || (room.id === 'master_bedroom' ? 'first_floor' : 'ground_floor');
      const floorName = matchingResolvedArea?.floor?.name || (floorId === 'first_floor' ? 'First Floor' : 'Ground Floor');

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

  // Dynamically resolve all floors from Home Assistant Registry
  const haFloors = useMemo(() => {
    const floorMap = new Map<string, { id: string; name: string; level: number; icon: string; count: number }>();
    
    // Ingest registered floors from Home Assistant WebSocket registry
    if (resolvedFloors && resolvedFloors.length > 0) {
      resolvedFloors.forEach(f => {
        const count = roomStats.filter(r => r.floorId === f.floor_id).length;
        floorMap.set(f.floor_id, {
          id: f.floor_id,
          name: f.name,
          level: f.level ?? 0,
          icon: f.icon || (f.level && f.level > 0 ? 'Building' : 'Home'),
          count
        });
      });
    }

    // Include standard fallback floors if empty
    if (floorMap.size === 0) {
      const gfCount = roomStats.filter(r => r.floorId === 'ground_floor' || !r.floorId).length;
      const ffCount = roomStats.filter(r => r.floorId === 'first_floor').length;
      floorMap.set('ground_floor', { id: 'ground_floor', name: 'Ground Floor', level: 0, icon: 'Home', count: gfCount });
      floorMap.set('first_floor', { id: 'first_floor', name: 'First Floor', level: 1, icon: 'Building', count: ffCount });
    }

    // Ensure any floor IDs present on roomStats are mapped
    roomStats.forEach(r => {
      if (r.floorId && !floorMap.has(r.floorId)) {
        floorMap.set(r.floorId, {
          id: r.floorId,
          name: r.floorName || r.floorId.replace(/_/g, ' '),
          level: 0,
          icon: 'LayoutGrid',
          count: roomStats.filter(rs => rs.floorId === r.floorId).length
        });
      }
    });

    return Array.from(floorMap.values());
  }, [resolvedFloors, roomStats]);

  // User Floor Ordering State for Grouped by Floors mode
  const [floorOrder, setFloorOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ha_floor_order');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return ['ground_floor', 'first_floor', 'outdoors'];
  });

  // Reorder floor helpers
  const moveFloorUp = (floorId: string) => {
    setFloorOrder(prev => {
      const currentList = Array.from(new Set([...prev, ...haFloors.map(f => f.id)]));
      const idx = currentList.indexOf(floorId);
      if (idx <= 0) return prev;
      const updated = [...currentList];
      const temp = updated[idx - 1];
      updated[idx - 1] = updated[idx];
      updated[idx] = temp;
      localStorage.setItem('ha_floor_order', JSON.stringify(updated));
      return updated;
    });
  };

  const moveFloorDown = (floorId: string) => {
    setFloorOrder(prev => {
      const currentList = Array.from(new Set([...prev, ...haFloors.map(f => f.id)]));
      const idx = currentList.indexOf(floorId);
      if (idx < 0 || idx >= currentList.length - 1) return prev;
      const updated = [...currentList];
      const temp = updated[idx + 1];
      updated[idx + 1] = updated[idx];
      updated[idx] = temp;
      localStorage.setItem('ha_floor_order', JSON.stringify(updated));
      return updated;
    });
  };

  // Compute ordered floors for floor grouping
  const orderedFloors = useMemo(() => {
    const allFloorIds = haFloors.map(f => f.id);
    const fullOrder = Array.from(new Set([...floorOrder, ...allFloorIds]));
    return fullOrder
      .map(id => haFloors.find(f => f.id === id))
      .filter(Boolean) as typeof haFloors;
  }, [haFloors, floorOrder]);

  // Filter & Search
  const filteredRooms = useMemo(() => {
    return roomStats
      .filter(({ room, floorId }) => {
        // Floor filter from Dock
        if (selectedFloorFilter !== 'all') {
          if (floorId !== selectedFloorFilter) return false;
        }

        // Search query
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return room.name.toLowerCase().includes(q) || room.id.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (groupingMode === 'alphabetical') return a.room.name.localeCompare(b.room.name);
        if (sortBy === 'name') return a.room.name.localeCompare(b.room.name);
        if (sortBy === 'devices') return b.activeCount - a.activeCount;
        if (sortBy === 'temp') return b.room.temperature - a.room.temperature;
        if (sortBy === 'power') return b.totalPower - a.totalPower;
        return 0;
      });
  }, [roomStats, selectedFloorFilter, searchQuery, sortBy, groupingMode]);

  const activeSelectedRoom = useMemo(() => {
    return rooms.find(r => r.id === selectedRoomId) || null;
  }, [rooms, selectedRoomId]);

  // Master Floor Power Toggle: Turns on/off all devices in all rooms of a floor
  const handleToggleFloor = (floorId: string, currentActiveCount: number) => {
    const shouldTurnOn = currentActiveCount === 0;
    const floorRoomList = roomStats.filter(r => r.floorId === floorId);
    floorRoomList.forEach(({ room }) => {
      onToggleAllInRoom(room.id, shouldTurnOn);
    });
  };

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
                  {rooms.length} HA Areas · {haFloors.length} Floors
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Automatically ingested from Home Assistant floor and area registries.
              </p>
            </div>

            {/* Action buttons & View mode toggles */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Grouping Mode Toggle: Floor vs Alphabetical */}
              <div className={`p-1 rounded-2xl flex items-center gap-1 border shadow-xs ${
                darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <button
                  id="btn-group-by-floor"
                  onClick={() => setGroupingMode('floor')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    groupingMode === 'floor'
                      ? 'bg-[#7B61FF] text-white shadow-xs'
                      : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers size={13} />
                  <span>By Floor</span>
                </button>
                <button
                  id="btn-group-by-alphabetical"
                  onClick={() => setGroupingMode('alphabetical')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    groupingMode === 'alphabetical'
                      ? 'bg-[#7B61FF] text-white shadow-xs'
                      : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ArrowUpDown size={13} />
                  <span>Alphabetical (A-Z)</span>
                </button>
              </div>

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
                  <span>Graph Ingestion</span>
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
                  <span>Unassigned ({unassignedEntities.length})</span>
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

          {/* MagicUI Dock for Floor Selection & Search/Sort controls */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 py-1">
            {/* MagicUI Dock Component for Home Assistant Floor Hierarchy */}
            <div className="w-full lg:w-auto flex justify-center lg:justify-start">
              <Dock 
                className="my-0"
                iconSize={38}
                iconMagnification={52}
                iconDistance={100}
              >
                <DockIcon
                  onClick={() => setSelectedFloorFilter('all')}
                  className={`transition-all ${
                    selectedFloorFilter === 'all'
                      ? 'bg-[#7B61FF] text-white shadow-md shadow-[#7B61FF]/40 ring-2 ring-[#7B61FF]/60'
                      : darkMode
                        ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                        : 'bg-white/90 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-xs'
                  }`}
                  title={`All Spaces (${rooms.length} Areas)`}
                >
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <Layers size={17} />
                    <span className="text-[8px] font-bold">All</span>
                  </div>
                </DockIcon>

                {haFloors.map(f => (
                  <DockIcon
                    key={f.id}
                    onClick={() => setSelectedFloorFilter(f.id)}
                    className={`transition-all ${
                      selectedFloorFilter === f.id
                        ? 'bg-[#7B61FF] text-white shadow-md shadow-[#7B61FF]/40 ring-2 ring-[#7B61FF]/60'
                        : darkMode
                          ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                          : 'bg-white/90 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-xs'
                    }`}
                    title={`${f.name} (${f.count} rooms)`}
                  >
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      {f.id === 'ground_floor' || f.icon === 'Home' ? (
                        <Home size={17} />
                      ) : f.id === 'first_floor' || f.icon === 'Building' ? (
                        <Building2 size={17} />
                      ) : f.id === 'outdoors' || f.icon === 'Trees' ? (
                        <Trees size={17} />
                      ) : (
                        <LayoutGrid size={17} />
                      )}
                      <span className="text-[8px] font-bold truncate max-w-[44px]">{f.name.split(' ')[0]}</span>
                    </div>
                  </DockIcon>
                ))}
              </Dock>
            </div>

            {/* Search and Sort controls */}
            <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
              <div className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs shadow-xs flex-1 sm:flex-initial ${
                darkMode ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                <Search size={14} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter areas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-hidden placeholder-slate-400 text-xs w-full sm:w-36"
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
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold capitalize transition-all cursor-pointer ${
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

          {/* ROOMS CONTENT AREA: GROUPED BY FLOOR OR ALPHABETICAL BENTO GRID */}
          {groupingMode === 'floor' && selectedFloorFilter === 'all' ? (
            /* 1. GROUPED BY FLOOR WITH ARRANGEABLE FLOORS ORDER */
            <div className="space-y-8">
              {orderedFloors.map((floor, floorIndex) => {
                const floorRooms = filteredRooms.filter(r => r.floorId === floor.id);
                if (floorRooms.length === 0 && searchQuery) return null;

                const floorActiveCount = floorRooms.reduce((sum, r) => sum + r.activeCount, 0);
                const floorTotalPower = floorRooms.reduce((sum, r) => sum + r.totalPower, 0);

                return (
                  <motion.section 
                    key={floor.id} 
                    layout
                    className={`p-5 sm:p-6 rounded-3xl border transition-all ${
                      darkMode 
                        ? 'bg-slate-950/40 border-white/[0.06]' 
                        : 'bg-white/60 border-black/[0.04] shadow-xs'
                    }`}
                  >
                    {/* Floor Header Bar with Reorder Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-200/60 dark:border-slate-800/80">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${
                          darkMode ? 'bg-[#7B61FF]/20 text-indigo-300' : 'bg-indigo-50 text-[#7B61FF]'
                        }`}>
                          {floor.id === 'ground_floor' || floor.icon === 'Home' ? (
                            <Home size={20} />
                          ) : floor.id === 'first_floor' || floor.icon === 'Building' ? (
                            <Building2 size={20} />
                          ) : (
                            <Trees size={20} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className={`text-base font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                              {floor.name}
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-500">
                              Level {floor.level}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 font-medium">
                            {floorRooms.length} Living Areas · {floorActiveCount} Devices Active · {Math.round(floorTotalPower)}W Load
                          </p>
                        </div>
                      </div>

                      {/* Floor Reorder Controls & Master Floor Power Switch */}
                      <div className="flex items-center gap-2">
                        {/* Floor Move Up / Down Buttons */}
                        <div className="flex items-center gap-1 mr-1">
                          <button
                            onClick={() => moveFloorUp(floor.id)}
                            disabled={floorIndex === 0}
                            title="Move floor section up"
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              floorIndex === 0 
                                ? 'opacity-30 cursor-not-allowed border-transparent' 
                                : darkMode 
                                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                                  : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            <ChevronUp size={15} />
                          </button>
                          <button
                            onClick={() => moveFloorDown(floor.id)}
                            disabled={floorIndex === orderedFloors.length - 1}
                            title="Move floor section down"
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              floorIndex === orderedFloors.length - 1 
                                ? 'opacity-30 cursor-not-allowed border-transparent' 
                                : darkMode 
                                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                                  : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            <ChevronDown size={15} />
                          </button>
                        </div>

                        {/* Master Floor Power Toggle */}
                        <button
                          onClick={() => handleToggleFloor(floor.id, floorActiveCount)}
                          title={floorActiveCount > 0 ? `Turn off all rooms on ${floor.name}` : `Turn on default rooms on ${floor.name}`}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
                            floorActiveCount > 0
                              ? 'bg-[#7B61FF] text-white border-[#7B61FF] shadow-xs'
                              : darkMode
                                ? 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border-slate-700'
                                : 'bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
                          }`}
                        >
                          <Power size={13} />
                          <span>{floorActiveCount > 0 ? 'Floor Active' : 'Power Floor'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Floor Rooms Bento Grid */}
                    {floorRooms.length > 0 ? (
                      <BentoGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                        {floorRooms.map(({ room, roomEntities, activeCount, totalCount, totalPower, hasOverdueTasks, criticalBatteries, floorName }, idx) => {
                          const anyActive = activeCount > 0;
                          const isHero = idx === 0 || (anyActive && idx % 3 === 0);
                          const bentoSpan = isHero
                            ? 'col-span-1 sm:col-span-2 lg:col-span-2'
                            : 'col-span-1';

                          return (
                            <motion.div
                              key={room.id}
                              layout
                              whileHover={{ y: -3 }}
                              className={`rounded-3xl p-5 sm:p-6 border transition-all relative overflow-hidden flex flex-col justify-between group shadow-xs backdrop-blur-xl ${bentoSpan} ${
                                darkMode 
                                  ? 'bg-slate-900/80 hover:bg-slate-900 border-white/[0.08] hover:border-[#7B61FF]/50' 
                                  : 'bg-white hover:bg-slate-50 border-black/[0.06] hover:border-[#7B61FF]/50'
                              }`}
                            >
                              {/* Top Section */}
                              <div>
                                <div className="flex items-start justify-between gap-2 mb-4 relative z-10">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xs transition-colors ${
                                      anyActive
                                        ? 'bg-[#7B61FF] text-white border-[#7B61FF] shadow-[#7B61FF]/30'
                                        : darkMode
                                          ? 'bg-slate-800 text-slate-400 border-slate-700'
                                          : 'bg-slate-100 text-slate-500 border-slate-200'
                                    }`}>
                                      {renderRoomIcon(room.icon, 20)}
                                    </div>

                                    <div>
                                      <h3 className={`font-bold text-sm leading-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                        {room.name}
                                      </h3>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[11px] text-slate-400 font-medium">
                                          {activeCount} of {totalCount} active
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

                                  {/* Quick Room Power Switch */}
                                  <button
                                    title={anyActive ? `Turn off all devices in ${room.name}` : `Turn on default devices in ${room.name}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onToggleAllInRoom(room.id, !anyActive);
                                    }}
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer shadow-xs ${
                                      anyActive
                                        ? 'bg-[#7B61FF] text-white border-[#7B61FF] shadow-[#7B61FF]/30'
                                        : darkMode
                                          ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                                          : 'bg-slate-100 text-slate-400 border-slate-200 hover:text-slate-700'
                                    }`}
                                  >
                                    <Power size={14} />
                                  </button>
                                </div>

                                {/* Room Telemetry Badges */}
                                <div className="grid grid-cols-3 gap-2 my-3">
                                  <div className={`p-2 rounded-xl border text-center ${
                                    darkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200/60'
                                  }`}>
                                    <div className="flex items-center justify-center gap-1 text-slate-400 text-[9px] font-bold">
                                      <Thermometer size={10} className="text-rose-400" />
                                      <span>Temp</span>
                                    </div>
                                    <span className={`text-[11px] font-black mt-0.5 block ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                                      {room.temperature}°C
                                    </span>
                                  </div>

                                  <div className={`p-2 rounded-xl border text-center ${
                                    darkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200/60'
                                  }`}>
                                    <div className="flex items-center justify-center gap-1 text-slate-400 text-[9px] font-bold">
                                      <Droplets size={10} className="text-sky-400" />
                                      <span>Humidity</span>
                                    </div>
                                    <span className={`text-[11px] font-black mt-0.5 block ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                                      {room.humidity}%
                                    </span>
                                  </div>

                                  <div className={`p-2 rounded-xl border text-center ${
                                    darkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200/60'
                                  }`}>
                                    <div className="flex items-center justify-center gap-1 text-slate-400 text-[9px] font-bold">
                                      <Zap size={10} className="text-amber-400" />
                                      <span>Power</span>
                                    </div>
                                    <span className={`text-[11px] font-black mt-0.5 block ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                                      {totalPower}W
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Bottom Action: Direct Room Focus & Detail Controls */}
                              <div className={`pt-3 border-t flex justify-between items-center text-[10px] relative z-10 ${
                                darkMode ? 'border-white/[0.06] text-slate-400' : 'border-black/[0.04] text-slate-400'
                              }`}>
                                <span className="text-[11px] font-bold text-slate-400 truncate pr-2">
                                  {anyActive ? (
                                    <span className="text-[#7B61FF] dark:text-[#9D8BFF] font-black">
                                      {activeCount} active
                                    </span>
                                  ) : (
                                    <span>Idle</span>
                                  )}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => setSelectedRoomId(room.id)}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-xs ${
                                    darkMode 
                                      ? 'bg-slate-800/90 text-slate-300 hover:bg-[#7B61FF] hover:text-white border border-white/[0.08]' 
                                      : 'bg-white/90 text-slate-600 hover:bg-[#7B61FF] hover:text-white border border-black/[0.06]'
                                  }`}
                                  title={`Open ${room.name} details`}
                                >
                                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </BentoGrid>
                    ) : (
                      <div className="text-center py-8 text-xs text-slate-400">
                        No rooms configured on this floor.
                      </div>
                    )}
                  </motion.section>
                );
              })}
            </div>
          ) : (
            /* 2. ALPHABETICAL (A-Z) OR FLAT FILTERED BENTO GRID */
            <BentoGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {filteredRooms.map(({ room, roomEntities, activeCount, totalCount, totalPower, hasOverdueTasks, criticalBatteries, floorName }, idx) => {
                const anyActive = activeCount > 0;
                const isHero = idx === 0 || (anyActive && idx % 3 === 0);
                const bentoSpan = isHero
                  ? 'col-span-1 sm:col-span-2 lg:col-span-2'
                  : 'col-span-1';

                return (
                  <motion.div
                    key={room.id}
                    layout
                    whileHover={{ y: -3 }}
                    className={`rounded-3xl p-5 sm:p-6 border transition-all relative overflow-hidden flex flex-col justify-between group shadow-xs backdrop-blur-xl ${bentoSpan} ${
                      darkMode 
                        ? 'bg-slate-900/80 hover:bg-slate-900 border-white/[0.08] hover:border-[#7B61FF]/50' 
                        : 'bg-white hover:bg-slate-50 border-black/[0.06] hover:border-[#7B61FF]/50'
                    }`}
                  >
                    <div>
                      {/* Top Section */}
                      <div className="flex items-start justify-between gap-2 mb-4 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xs transition-colors ${
                            anyActive
                              ? 'bg-[#7B61FF] text-white border-[#7B61FF] shadow-[#7B61FF]/30'
                              : darkMode
                                ? 'bg-slate-800 text-slate-400 border-slate-700'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {renderRoomIcon(room.icon, 20)}
                          </div>

                          <div>
                            <h3 className={`font-bold text-sm leading-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                              {room.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-slate-400 font-medium">
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

                        {/* Quick Room Switch */}
                        <button
                          title={anyActive ? `Turn off all devices in ${room.name}` : `Turn on default devices in ${room.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleAllInRoom(room.id, !anyActive);
                          }}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer shadow-xs ${
                            anyActive
                              ? 'bg-[#7B61FF] text-white border-[#7B61FF] shadow-[#7B61FF]/30'
                              : darkMode
                                ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                                : 'bg-slate-100 text-slate-400 border-slate-200 hover:text-slate-700'
                          }`}
                        >
                          <Power size={14} />
                        </button>
                      </div>

                      {/* Room Telemetry Badges */}
                      <div className="grid grid-cols-3 gap-2 my-3">
                        <div className={`p-2 rounded-xl border text-center ${
                          darkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200/60'
                        }`}>
                          <div className="flex items-center justify-center gap-1 text-slate-400 text-[9px] font-bold">
                            <Thermometer size={10} className="text-rose-400" />
                            <span>Temp</span>
                          </div>
                          <span className={`text-[11px] font-black mt-0.5 block ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                            {room.temperature}°C
                          </span>
                        </div>

                        <div className={`p-2 rounded-xl border text-center ${
                          darkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200/60'
                        }`}>
                          <div className="flex items-center justify-center gap-1 text-slate-400 text-[9px] font-bold">
                            <Droplets size={10} className="text-sky-400" />
                            <span>Humidity</span>
                          </div>
                          <span className={`text-[11px] font-black mt-0.5 block ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                            {room.humidity}%
                          </span>
                        </div>

                        <div className={`p-2 rounded-xl border text-center ${
                          darkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200/60'
                        }`}>
                          <div className="flex items-center justify-center gap-1 text-slate-400 text-[9px] font-bold">
                            <Zap size={10} className="text-amber-400" />
                            <span>Power</span>
                          </div>
                          <span className={`text-[11px] font-black mt-0.5 block ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                            {totalPower}W
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action: Direct Room Focus & Detail Controls */}
                    <div className={`pt-3 border-t flex justify-between items-center text-[10px] relative z-10 ${
                      darkMode ? 'border-white/[0.06] text-slate-400' : 'border-black/[0.04] text-slate-400'
                    }`}>
                      <span className="text-[11px] font-bold text-slate-400 truncate pr-2">
                        {anyActive ? (
                          <span className="text-[#7B61FF] dark:text-[#9D8BFF] font-black">
                            {activeCount} active
                          </span>
                        ) : (
                          <span>Idle</span>
                        )}
                      </span>

                      <button
                        type="button"
                        onClick={() => setSelectedRoomId(room.id)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-xs ${
                          darkMode 
                            ? 'bg-slate-800/90 text-slate-300 hover:bg-[#7B61FF] hover:text-white border border-white/[0.08]' 
                            : 'bg-white/90 text-slate-600 hover:bg-[#7B61FF] hover:text-white border border-black/[0.06]'
                        }`}
                        title={`Open ${room.name} details`}
                      >
                        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </BentoGrid>
          )}
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
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1.5">Icon Theme</label>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { id: 'Sofa', icon: Sofa },
                      { id: 'BedDouble', icon: BedDouble },
                      { id: 'Cookie', icon: Cookie },
                      { id: 'Bath', icon: Bath },
                      { id: 'Tv', icon: Tv }
                    ].map(item => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setNewRoomIcon(item.id)}
                          className={`p-3 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                            newRoomIcon === item.id
                              ? 'bg-[#7B61FF] text-white border-[#7B61FF]'
                              : darkMode
                                ? 'bg-slate-800 border-slate-700 text-slate-400'
                                : 'bg-slate-100 border-slate-200 text-slate-600'
                          }`}
                        >
                          <Icon size={18} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-200/60 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddRoomModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#7B61FF] text-white text-xs font-bold shadow-md shadow-[#7B61FF]/30 cursor-pointer"
                  >
                    Create Space
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
