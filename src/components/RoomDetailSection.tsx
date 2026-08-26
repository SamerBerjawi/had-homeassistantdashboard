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
  Wrench,
  PanelTopClose,
  PanelBottomClose,
  Play,
  Pause,
  Volume2,
  Power,
  ChevronRight,
  Sparkles,
  Layers,
  LayoutGrid,
  Columns
} from 'lucide-react';
import { Room, HAEntity, MaintenanceTask } from '../types';
import BatteryStatusCard from './BatteryStatusCard';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';

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
  const { callHAService } = useAutoLayoutStore();
  const [viewMode, setViewMode] = useState<'structured' | 'grid'>('structured');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all entities assigned to this room
  const roomEntities = useMemo(() => {
    return entities.filter(ent => room.entityIds.includes(ent.entity_id));
  }, [entities, room.entityIds]);

  // Group entities by the 6 core auto-layout domains
  const domainGroups = useMemo(() => {
    const lights: HAEntity[] = [];
    const climates: HAEntity[] = [];
    const media: HAEntity[] = [];
    const covers: HAEntity[] = [];
    const switches: HAEntity[] = [];
    const sensors: HAEntity[] = [];
    const others: HAEntity[] = [];

    for (const ent of roomEntities) {
      const id = ent.entity_id;
      if (id.startsWith('light.')) lights.push(ent);
      else if (id.startsWith('climate.') || id.startsWith('humidifier.')) climates.push(ent);
      else if (id.startsWith('media_player.')) media.push(ent);
      else if (id.startsWith('cover.')) covers.push(ent);
      else if (id.startsWith('switch.')) switches.push(ent);
      else if (id.startsWith('sensor.') || id.startsWith('binary_sensor.')) sensors.push(ent);
      else others.push(ent);
    }

    return { lights, climates, media, covers, switches, sensors, others };
  }, [roomEntities]);

  // Battery devices in this room
  const roomBatteryDevices = useMemo(() => {
    return roomEntities.filter(ent => typeof ent.attributes.battery === 'number');
  }, [roomEntities]);

  const criticalBatteries = useMemo(() => {
    return roomBatteryDevices.filter(ent => Number(ent.attributes.battery) <= 20);
  }, [roomBatteryDevices]);

  // Quick helper to call service and update local state
  const handleToggle = (ent: HAEntity) => {
    const domain = ent.entity_id.split('.')[0];
    let nextState = 'off';
    let service = 'turn_off';

    if (domain === 'lock') {
      nextState = ent.state === 'locked' ? 'unlocked' : 'locked';
      service = nextState;
    } else if (domain === 'media_player') {
      nextState = ent.state === 'playing' ? 'paused' : 'playing';
      service = nextState === 'playing' ? 'media_play' : 'media_pause';
    } else {
      nextState = ent.state === 'on' ? 'off' : 'on';
      service = nextState === 'on' ? 'turn_on' : 'turn_off';
    }

    onUpdateEntityState(ent.entity_id, nextState);
    callHAService(domain, service, {}, { entity_id: ent.entity_id });
  };

  const handleBrightnessChange = (ent: HAEntity, pct: number) => {
    const brightness255 = Math.round((pct / 100) * 255);
    onUpdateEntityState(ent.entity_id, pct > 0 ? 'on' : 'off', { brightness: brightness255 });
    callHAService('light', 'turn_on', { brightness: brightness255 }, { entity_id: ent.entity_id });
  };

  const handleTemperatureChange = (ent: HAEntity, targetTemp: number) => {
    onUpdateEntityState(ent.entity_id, ent.state, { temperature: targetTemp });
    callHAService('climate', 'set_temperature', { temperature: targetTemp }, { entity_id: ent.entity_id });
  };

  const handleCoverCommand = (ent: HAEntity, cmd: 'open' | 'close' | 'stop') => {
    const nextState = cmd === 'open' ? 'open' : cmd === 'close' ? 'closed' : ent.state;
    onUpdateEntityState(ent.entity_id, nextState, { current_position: cmd === 'open' ? 100 : cmd === 'close' ? 0 : 50 });
    callHAService('cover', `${cmd}_cover`, {}, { entity_id: ent.entity_id });
  };

  return (
    <motion.section 
      layout
      id="room-expansion-details" 
      className={`backdrop-blur-xl rounded-3xl p-5 sm:p-6 transition-all duration-300 shadow-xs border ${
        darkMode ? 'bg-slate-900/70 border-white/[0.1]' : 'bg-white/80 border-black/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
      }`}
    >
      {/* Top Header */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pb-4 border-b ${
        darkMode ? 'border-slate-800' : 'border-slate-200/70'
      }`}>
        <div>
          <span className={`text-[10px] font-black uppercase tracking-wider block ${
            darkMode ? 'text-indigo-400' : 'text-indigo-600'
          }`}>
            Auto-Generated Domain Architecture
          </span>
          <h3 className={`text-lg sm:text-xl font-black inline-flex items-center gap-2 mt-0.5 ${
            darkMode ? 'text-white' : 'text-slate-800'
          }`}>
            {room.name} Domain Hub
          </h3>
        </div>

        {/* View Toggle & Status Badges */}
        <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-auto justify-between sm:justify-start">
          {criticalBatteries.length > 0 && (
            <span className="text-[10px] px-3 py-1 rounded-full font-black bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center gap-1.5 animate-pulse">
              <BatteryLow size={12} />
              <span>{criticalBatteries.length} Battery Warning</span>
            </span>
          )}

          <span className={`text-[10px] px-3 py-1 rounded-full font-bold border ${
            darkMode ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
          }`}>
            {roomEntities.length} Entities Ingested
          </span>

          {/* Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-200/50 dark:bg-slate-950/80 border border-slate-300/40 dark:border-slate-800">
            <button
              onClick={() => setViewMode('structured')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'structured'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Structured Domain Sections"
            >
              <Columns size={13} />
              <span className="text-[10px]">Domains</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Fleet Grid View"
            >
              <LayoutGrid size={13} />
              <span className="text-[10px]">Grid</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'structured' ? (
        <div className="space-y-6">
          {/* 1. LIGHTING DOMAIN SECTION */}
          {domainGroups.lights.length > 0 && (
            <div className={`p-4 sm:p-5 rounded-2xl border ${
              darkMode ? 'bg-slate-950/40 border-white/[0.06]' : 'bg-amber-50/40 border-amber-200/60'
            }`}>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-500">
                    <Lightbulb size={16} />
                  </span>
                  <h4 className={`text-sm font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Lighting ({domainGroups.lights.filter(l => l.state === 'on').length}/{domainGroups.lights.length} On)
                  </h4>
                </div>

                <button
                  onClick={() => {
                    const anyOn = domainGroups.lights.some(l => l.state === 'on');
                    domainGroups.lights.forEach(l => {
                      onUpdateEntityState(l.entity_id, anyOn ? 'off' : 'on');
                      callHAService('light', anyOn ? 'turn_off' : 'turn_on', {}, { entity_id: l.entity_id });
                    });
                  }}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Toggle All Lights
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {domainGroups.lights.map(light => {
                  const isOn = light.state === 'on';
                  const brightnessPct = light.attributes.brightness ? Math.round((light.attributes.brightness / 255) * 100) : (isOn ? 100 : 0);

                  return (
                    <div
                      key={light.entity_id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isOn
                          ? darkMode
                            ? 'bg-amber-950/25 border-amber-500/40 shadow-sm'
                            : 'bg-white border-amber-300 shadow-sm'
                          : darkMode
                            ? 'bg-slate-900/60 border-slate-800'
                            : 'bg-white/90 border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="min-w-0 flex-1">
                          <h5 className={`text-xs font-extrabold truncate ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                            {light.attributes.friendly_name}
                          </h5>
                          <span className="text-[9.5px] text-slate-400 font-mono">{light.entity_id}</span>
                        </div>

                        <button
                          onClick={() => handleToggle(light)}
                          className={`w-9 h-5 rounded-full relative transition-all cursor-pointer ${
                            isOn ? 'bg-amber-500' : darkMode ? 'bg-slate-800' : 'bg-slate-300'
                          }`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-xs ${
                            isOn ? 'right-0.5' : 'left-0.5'
                          }`} />
                        </button>
                      </div>

                      {/* Brightness Slider */}
                      {isOn && (
                        <div className="mt-2 pt-2 border-t border-amber-500/20 flex items-center gap-2">
                          <Sun size={12} className="text-amber-500 shrink-0" />
                          <input
                            type="range"
                            min="1"
                            max="100"
                            value={brightnessPct}
                            onChange={(e) => handleBrightnessChange(light, Number(e.target.value))}
                            className="w-full h-1.5 bg-amber-500/20 rounded-lg appearance-none cursor-pointer accent-amber-500"
                          />
                          <span className="text-[10px] font-mono font-bold text-amber-500 shrink-0">{brightnessPct}%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. CLIMATE & THERMOSTAT DOMAIN SECTION */}
          {domainGroups.climates.length > 0 && (
            <div className={`p-4 sm:p-5 rounded-2xl border ${
              darkMode ? 'bg-slate-950/40 border-white/[0.06]' : 'bg-sky-50/40 border-sky-200/60'
            }`}>
              <div className="flex items-center gap-2 mb-3.5">
                <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-500">
                  <Thermometer size={16} />
                </span>
                <h4 className={`text-sm font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Climate & Thermostat Controls
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {domainGroups.climates.map(climate => {
                  const targetTemp = Number(climate.attributes.temperature || 21);
                  const currentTemp = Number(climate.attributes.current_temperature || room.temperature || 21.5);
                  const isHeating = climate.state === 'heat';
                  const isCooling = climate.state === 'cool';
                  const isOff = climate.state === 'off';

                  return (
                    <div
                      key={climate.entity_id}
                      className={`p-4 rounded-2xl border ${
                        darkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h5 className={`text-xs font-extrabold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                            {climate.attributes.friendly_name}
                          </h5>
                          <span className="text-[9.5px] text-slate-400">Mode: <strong className="uppercase text-sky-400">{climate.state}</strong></span>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-black text-sky-400">{currentTemp}°C</div>
                          <span className="text-[9px] text-slate-400">Current Ambient</span>
                        </div>
                      </div>

                      {/* Stepper Controls */}
                      <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
                        <span className="text-xs font-bold text-slate-400">Target Temp</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTemperatureChange(climate, targetTemp - 0.5)}
                            className="w-8 h-8 rounded-lg bg-indigo-600/15 text-indigo-500 hover:bg-indigo-600/25 font-black text-sm flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <span className="text-base font-black px-2">{targetTemp.toFixed(1)}°C</span>
                          <button
                            onClick={() => handleTemperatureChange(climate, targetTemp + 0.5)}
                            className="w-8 h-8 rounded-lg bg-indigo-600/15 text-indigo-500 hover:bg-indigo-600/25 font-black text-sm flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. MEDIA PLAYERS DOMAIN SECTION */}
          {domainGroups.media.length > 0 && (
            <div className={`p-4 sm:p-5 rounded-2xl border ${
              darkMode ? 'bg-slate-950/40 border-white/[0.06]' : 'bg-pink-50/40 border-pink-200/60'
            }`}>
              <div className="flex items-center gap-2 mb-3.5">
                <span className="p-1.5 rounded-lg bg-pink-500/20 text-pink-500">
                  <Music size={16} />
                </span>
                <h4 className={`text-sm font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Media & Speakers
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {domainGroups.media.map(player => {
                  const isPlaying = player.state === 'playing';
                  return (
                    <div
                      key={player.entity_id}
                      className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                        isPlaying
                          ? darkMode ? 'bg-pink-950/25 border-pink-500/40' : 'bg-white border-pink-300 shadow-sm'
                          : darkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <h5 className={`text-xs font-extrabold truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                          {player.attributes.friendly_name}
                        </h5>
                        <p className="text-[10px] text-pink-400 font-medium truncate mt-0.5">
                          {player.attributes.media_title || (isPlaying ? 'Playing Audio' : 'Idle')}
                        </p>
                      </div>

                      <button
                        onClick={() => handleToggle(player)}
                        className={`p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isPlaying
                            ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                            : darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                        <span>{isPlaying ? 'Pause' : 'Play'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. COVERS & BLINDS DOMAIN SECTION */}
          {domainGroups.covers.length > 0 && (
            <div className={`p-4 sm:p-5 rounded-2xl border ${
              darkMode ? 'bg-slate-950/40 border-white/[0.06]' : 'bg-emerald-50/40 border-emerald-200/60'
            }`}>
              <div className="flex items-center gap-2 mb-3.5">
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-500">
                  <PanelTopClose size={16} />
                </span>
                <h4 className={`text-sm font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Covers & Roller Blinds
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {domainGroups.covers.map(cover => (
                  <div
                    key={cover.entity_id}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                      darkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div>
                      <h5 className={`text-xs font-extrabold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        {cover.attributes.friendly_name}
                      </h5>
                      <span className="text-[9.5px] text-slate-400 uppercase font-mono">{cover.state}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCoverCommand(cover, 'open')}
                        className={`p-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                          darkMode ? 'bg-slate-800 text-emerald-400 hover:bg-emerald-600/30' : 'bg-slate-100 text-emerald-700 hover:bg-emerald-100'
                        }`}
                        title="Open Cover"
                      >
                        <PanelTopClose size={15} />
                      </button>
                      <button
                        onClick={() => handleCoverCommand(cover, 'stop')}
                        className={`p-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                          darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                        title="Stop"
                      >
                        Stop
                      </button>
                      <button
                        onClick={() => handleCoverCommand(cover, 'close')}
                        className={`p-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                          darkMode ? 'bg-slate-800 text-rose-400 hover:bg-rose-600/30' : 'bg-slate-100 text-rose-700 hover:bg-rose-100'
                        }`}
                        title="Close Cover"
                      >
                        <PanelBottomClose size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. SWITCHES & OUTLETS DOMAIN SECTION */}
          {domainGroups.switches.length > 0 && (
            <div className={`p-4 sm:p-5 rounded-2xl border ${
              darkMode ? 'bg-slate-950/40 border-white/[0.06]' : 'bg-indigo-50/40 border-indigo-200/60'
            }`}>
              <div className="flex items-center gap-2 mb-3.5">
                <span className="p-1.5 rounded-lg bg-violet-500/20 text-violet-500">
                  <Power size={16} />
                </span>
                <h4 className={`text-sm font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Smart Switches & Outlets
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {domainGroups.switches.map(sw => {
                  const isOn = sw.state === 'on';
                  return (
                    <div
                      key={sw.entity_id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                        isOn
                          ? darkMode ? 'bg-violet-950/25 border-violet-500/40' : 'bg-white border-violet-300 shadow-sm'
                          : darkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <h5 className={`text-xs font-extrabold truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                          {sw.attributes.friendly_name}
                        </h5>
                        {sw.attributes.power !== undefined && (
                          <span className="text-[10px] text-amber-400 font-bold flex items-center gap-0.5">
                            <Zap size={10} /> {sw.attributes.power}W
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleToggle(sw)}
                        className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          isOn
                            ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                            : darkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Power size={13} />
                        <span>{isOn ? 'ON' : 'OFF'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6. ENVIRONMENT & SENSORS DOMAIN SECTION */}
          {domainGroups.sensors.length > 0 && (
            <div className={`p-4 sm:p-5 rounded-2xl border ${
              darkMode ? 'bg-slate-950/40 border-white/[0.06]' : 'bg-teal-50/40 border-teal-200/60'
            }`}>
              <div className="flex items-center gap-2 mb-3.5">
                <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-500">
                  <Activity size={16} />
                </span>
                <h4 className={`text-sm font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Environmental Telemetry & Security Sensors
                </h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {domainGroups.sensors.map(sensor => {
                  const isAlarm = sensor.state === 'on' || sensor.state === 'open' || sensor.state === 'motion';
                  return (
                    <div
                      key={sensor.entity_id}
                      className={`p-3 rounded-2xl border ${
                        isAlarm
                          ? darkMode ? 'bg-amber-950/30 border-amber-500/40' : 'bg-amber-50 border-amber-200'
                          : darkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    >
                      <span className="text-[9.5px] text-slate-400 truncate block">{sensor.attributes.friendly_name}</span>
                      <div className="text-sm font-black mt-1 text-cyan-400">
                        {sensor.state} {sensor.attributes.unit_of_measurement || ''}
                      </div>
                      {typeof sensor.attributes.battery === 'number' && (
                        <div className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                          <Battery size={10} /> {sensor.attributes.battery}%
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Standard Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {roomEntities.map(ent => (
            <div
              key={ent.entity_id}
              className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                ent.state === 'on' || ent.state === 'playing' || ent.state === 'locked'
                  ? darkMode ? 'bg-slate-900/90 border-indigo-500/40' : 'bg-white border-indigo-300 shadow-xs'
                  : darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="min-w-0 flex-1">
                <h5 className={`text-xs font-extrabold truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  {ent.attributes.friendly_name}
                </h5>
                <span className="text-[9.5px] text-slate-400 font-mono">{ent.entity_id}</span>
              </div>

              <button
                onClick={() => handleToggle(ent)}
                className={`p-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                  ent.state === 'on' || ent.state === 'playing' || ent.state === 'locked'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {ent.state}
              </button>
            </div>
          ))}
        </div>
      )}
    </motion.section>
  );
}
