/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  Thermometer, 
  Droplets, 
  Zap, 
  BedDouble, 
  Sofa, 
  Cookie, 
  KeyRound, 
  Lightbulb, 
  Power,
  BatteryLow,
  BatteryWarning,
  Battery,
  Wrench,
  GripVertical
} from 'lucide-react';
import { Room, HAEntity, MaintenanceTask } from '../types';

interface RoomCardProps {
  key?: string;
  room: Room;
  entities: HAEntity[];
  maintenanceTasks?: MaintenanceTask[];
  isSelected: boolean;
  onSelect: () => void;
  onToggleAllInRoom: (roomId: string, currentAllActive: boolean) => void;
  darkMode?: boolean;
  isDragEnabled?: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Sofa: Sofa,
  BedDouble: BedDouble,
  Cookie: Cookie,
  KeyRound: KeyRound
};

export default function RoomCard({
  room,
  entities,
  maintenanceTasks = [],
  isSelected,
  onSelect,
  onToggleAllInRoom,
  darkMode = false,
  isDragEnabled = false
}: RoomCardProps) {
  // Find which of our entities are associated with this room
  const roomEntities = entities.filter(ent => room.entityIds.includes(ent.entity_id));
  const activeDeviceCount = roomEntities.filter(ent => ent.state === 'on' || ent.state === 'playing').length;
  const isAllOn = activeDeviceCount > 0 && activeDeviceCount === roomEntities.length;

  // Check if any device in room has due or overdue maintenance task
  const roomTasks = maintenanceTasks.filter(t => room.entityIds.includes(t.entityId) || t.roomName.toLowerCase() === room.name.toLowerCase());
  const overdueRoomTasks = roomTasks.filter(t => t.status === 'overdue').length;
  const dueSoonRoomTasks = roomTasks.filter(t => t.status === 'due_soon').length;

  // Calculate live room power consumption
  const totalPowerWatts = roomEntities.reduce((sum, ent) => {
    if (ent.state === 'on' || ent.state === 'playing') {
      return sum + (Number(ent.attributes.power) || 0);
    }
    return sum;
  }, 0);

  // Calculate battery alert count for room IoT devices
  const batteryEntities = roomEntities.filter(ent => typeof ent.attributes.battery === 'number');
  const criticalBelow15Count = batteryEntities.filter(ent => Number(ent.attributes.battery) < 15).length;
  const criticalBatteryCount = batteryEntities.filter(ent => {
    const b = Number(ent.attributes.battery);
    return b >= 15 && b <= 20;
  }).length;
  const warningBatteryCount = batteryEntities.filter(ent => {
    const b = Number(ent.attributes.battery);
    return b > 20 && b <= 49;
  }).length;

  const IconComponent = ICON_MAP[room.icon] || Sofa;
  
  // Calculate dynamic reactive glow based on active devices
  const glowFactor = activeDeviceCount > 0 ? Math.min(1, 0.45 + (activeDeviceCount / roomEntities.length) * 0.55) : 0;

  return (
    <motion.div 
      layout
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      id={`card-room-${room.id}`}
      onClick={onSelect}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      className={`rounded-3xl p-5 sm:p-6 border cursor-pointer backdrop-blur-xl transition-all duration-300 relative overflow-hidden group glass-noise ${
        isSelected 
          ? darkMode
            ? 'ring-2 ring-[#7B61FF] border-[#7B61FF]/60 shadow-xl shadow-[#7B61FF]/25'
            : 'ring-2 ring-[#7B61FF] border-[#7B61FF]/40 shadow-xl shadow-[#7B61FF]/15' 
          : darkMode
            ? 'border-white/[0.1] hover:border-white/[0.2] hover:shadow-2xl shadow-black/40'
            : 'border-black/[0.06] hover:border-black/[0.12] hover:shadow-lg shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
      }`}
      style={{
        background: darkMode
          ? isSelected 
            ? `radial-gradient(circle at 85% 15%, rgba(123, 97, 255, ${0.32 + 0.12 * glowFactor}) 0%, rgba(158, 138, 255, 0.15) 40%, rgba(14, 21, 42, 0.92) 85%)`
            : activeDeviceCount > 0
              ? `radial-gradient(circle at 85% 15%, rgba(123, 97, 255, ${0.22 * glowFactor}) 0%, rgba(16, 24, 48, 0.85) 75%)`
              : 'rgba(15, 23, 44, 0.75)'
          : isSelected 
            ? `radial-gradient(circle at 85% 15%, rgba(123, 97, 255, ${0.18 + 0.08 * glowFactor}) 0%, rgba(158, 138, 255, 0.1) 40%, rgba(255, 255, 255, 0.8) 90%)`
            : activeDeviceCount > 0
              ? `radial-gradient(circle at 85% 15%, rgba(123, 97, 255, ${0.12 * glowFactor}) 0%, rgba(255, 255, 255, 0.7) 70%)`
              : 'rgba(255, 255, 255, 0.65)'
      }}
    >
      {/* Subtle Dynamic Radial Gradient Mesh Overlay */}
      {activeDeviceCount > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: glowFactor }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 10% 90%, rgba(123, 97, 255, ${0.18 * glowFactor}) 0%, transparent 55%), radial-gradient(circle at 90% 10%, rgba(158, 138, 255, 0.18) 0%, transparent 50%)`
          }}
        />
      )}

      {/* Top Section heading and status */}
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl transition-all ${
            isSelected || activeDeviceCount > 0
              ? darkMode
                ? 'bg-[#7B61FF]/25 text-indigo-300 shadow-xs'
                : 'bg-[#7B61FF]/15 text-[#7B61FF] shadow-xs'
              : darkMode
                ? 'bg-slate-800/80 text-slate-400 group-hover:bg-slate-800'
                : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
          }`}>
            <IconComponent size={20} />
          </div>
          <div>
            <h3 className={`font-bold text-sm tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{room.name}</h3>
            <p className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>{roomEntities.length} Registered Devices</p>
          </div>
        </div>

        {/* Quick Room Switch Toggle and Drag Handle */}
        <div className="flex items-center gap-1.5">
          {isDragEnabled && (
            <div 
              title="Drag to personalize room layout"
              className={`p-1.5 rounded-lg opacity-40 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing ${
                darkMode ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-700 hover:bg-black/5'
              }`}
            >
              <GripVertical size={15} />
            </div>
          )}

          <div className="relative flex items-center justify-center">
            {activeDeviceCount > 0 && (
              <motion.div 
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.35 * glowFactor, 0.7 * glowFactor, 0.35 * glowFactor]
                }}
                transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                className="absolute -inset-1 bg-[#7B61FF] rounded-xl blur-xs pointer-events-none" 
                style={{
                  filter: `blur(${4 + 4 * glowFactor}px)`,
                  boxShadow: `0 0 ${12 + 14 * glowFactor}px rgba(123, 97, 255, ${0.45 * glowFactor})`
                }}
              />
            )}
            <button
              id={`btn-toggle-room-${room.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleAllInRoom(room.id, activeDeviceCount > 0);
              }}
              title={isAllOn ? "Power off all room lights" : "Enable all room lights"}
              className={`p-2.5 min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center transition-all relative z-10 cursor-pointer ${
                activeDeviceCount > 0 
                  ? 'bg-[#7B61FF] text-white border border-[#7B61FF] ring-1 ring-[#7B61FF]/50' 
                  : darkMode
                    ? 'bg-slate-800/90 text-slate-400 hover:text-slate-200 hover:bg-slate-700/90 border border-slate-700/80 shadow-xs'
                    : 'bg-white/80 text-slate-400 hover:text-slate-600 hover:bg-white border border-black/[0.06] shadow-xs'
              }`}
              style={{
                boxShadow: activeDeviceCount > 0 ? `0 3px ${8 + 10 * glowFactor}px rgba(123, 97, 255, ${0.4 * glowFactor})` : undefined
              }}
            >
              <Power size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Sensor tags: Temp and Humidity */}
      <div className="flex flex-wrap gap-2 mb-4 relative z-10">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-2xs border ${
          darkMode ? 'bg-slate-800/80 text-slate-300 border-slate-700/70' : 'bg-white/75 text-slate-600 border-slate-100'
        }`}>
          <Thermometer size={11} className="text-rose-400" />
          <span>{room.temperature}°C</span>
        </div>
        
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-2xs border ${
          darkMode ? 'bg-slate-800/80 text-slate-300 border-slate-700/70' : 'bg-white/75 text-slate-600 border-slate-100'
        }`}>
          <Droplets size={11} className="text-sky-400" />
          <span>{room.humidity}%</span>
        </div>

        {/* Real-time Room Energy Draw Tag */}
        {totalPowerWatts > 0 && (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-2xs border ${
            darkMode ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200/80'
          }`}>
            <Zap size={11} className="text-amber-400" />
            <span>{totalPowerWatts >= 1000 ? `${(totalPowerWatts / 1000).toFixed(2)} kW` : `${Math.round(totalPowerWatts)} W`}</span>
          </div>
        )}

        {/* Maintenance Alert Tag */}
        {overdueRoomTasks > 0 ? (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-2xs border ${
            darkMode ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            <Wrench size={11} className="text-rose-400" />
            <span>{overdueRoomTasks} Overdue Service</span>
          </div>
        ) : dueSoonRoomTasks > 0 ? (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-2xs border ${
            darkMode ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            <Wrench size={11} className="text-amber-400" />
            <span>{dueSoonRoomTasks} Service Due</span>
          </div>
        ) : null}

        {/* Battery Health Indicator Tag */}
        {criticalBelow15Count > 0 ? (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black shadow-xs border ${
            darkMode ? 'bg-rose-600/30 text-rose-300 border-rose-500/60 animate-bounce' : 'bg-rose-500 text-white border-rose-600 shadow-rose-500/30'
          }`}>
            <BatteryLow size={11} className={darkMode ? "text-rose-300" : "text-white"} />
            <span>{criticalBelow15Count} &lt;15% Critical Bat</span>
          </div>
        ) : criticalBatteryCount > 0 ? (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-2xs border ${
            darkMode ? 'bg-rose-500/15 text-rose-300 border-rose-500/40 animate-pulse' : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            <BatteryLow size={11} className="text-rose-400" />
            <span>{criticalBatteryCount} Critical Bat</span>
          </div>
        ) : warningBatteryCount > 0 ? (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-2xs border ${
            darkMode ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            <BatteryWarning size={11} className="text-amber-400" />
            <span>{warningBatteryCount} Low Bat</span>
          </div>
        ) : batteryEntities.length > 0 ? (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-2xs border ${
            darkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
          }`}>
            <Battery size={11} className="text-emerald-400" />
            <span>{batteryEntities.length} IoT Bat</span>
          </div>
        ) : null}
      </div>

      {/* Dynamic inline component devices visualizers */}
      <div className={`pt-2.5 border-t flex justify-between items-center text-[10px] relative z-10 ${
        darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-100/70 text-slate-400'
      }`}>
        <div className="flex -space-x-1.5 overflow-hidden" id={`room-devices-${room.id}`}>
          {roomEntities.map((ent) => {
            const isEntActive = ent.state === 'on' || ent.state === 'playing';
            return (
              <div 
                key={ent.entity_id}
                title={`${ent.attributes.friendly_name}: ${ent.state}`}
                className={`w-5.5 h-5.5 rounded-full flex items-center justify-center border-2 transition-all ${
                  darkMode ? 'border-slate-800' : 'border-white'
                } ${
                  isEntActive
                    ? 'bg-[#7B61FF] text-white shadow-xs' 
                    : darkMode
                      ? 'bg-slate-800 text-slate-400'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                <span className="text-[7.5px] font-bold uppercase">{ent.attributes.friendly_name.substring(0, 2)}</span>
              </div>
            );
          })}
        </div>
        
        <span className={`font-extrabold cursor-pointer flex items-center gap-0.5 transition-colors ${
          darkMode ? 'text-indigo-400 group-hover:text-indigo-300' : 'text-slate-500 group-hover:text-[#7B61FF]'
        }`}>
          Focus Room &rarr;
        </span>
      </div>
    </motion.div>
  );
}
