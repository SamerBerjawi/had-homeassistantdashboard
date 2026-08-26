/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Bot, Play, Pause, Home, Battery, Sparkles, MapPin, Gauge, AlertCircle } from 'lucide-react';
import { HAEntity } from '../../../types';
import CardModalContainer from './CardModalContainer';

interface VacuumDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: HAEntity;
  onUpdateEntity: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
}

const SUCTION_MODES = ['Quiet', 'Eco', 'Standard', 'Turbo', 'Max'];
const ROOM_ZONES = ['Living Room', 'Master Bedroom', 'Kitchen', 'Hallway', 'Dining Area'];

export default function VacuumDetailModal({
  isOpen,
  onClose,
  entity,
  onUpdateEntity
}: VacuumDetailModalProps) {
  const isCleaning = entity.state === 'on' || entity.state === 'cleaning';
  const battery = entity.attributes?.battery ?? 88;
  const currentMode = entity.attributes?.mode || 'Eco';
  const [selectedMode, setSelectedMode] = useState(currentMode);
  const [selectedRooms, setSelectedRooms] = useState<string[]>(['Living Room', 'Kitchen']);

  const toggleRoom = (room: string) => {
    if (selectedRooms.includes(room)) {
      setSelectedRooms(selectedRooms.filter(r => r !== room));
    } else {
      setSelectedRooms([...selectedRooms, room]);
    }
  };

  const handleStartStop = () => {
    onUpdateEntity(entity.entity_id, isCleaning ? 'off' : 'on', {
      mode: isCleaning ? 'Docked' : selectedMode
    });
  };

  const handleReturnDock = () => {
    onUpdateEntity(entity.entity_id, 'off', { mode: 'Returning to Base' });
  };

  return (
    <CardModalContainer
      isOpen={isOpen}
      onClose={onClose}
      title={entity.attributes?.friendly_name || 'Roborock S10 Vacuum'}
      subtitle="LiDAR Navigation & Auto-Empty Dock"
      icon={<Bot size={22} className="text-indigo-400" />}
      maxWidth="max-w-xl"
    >
      <div className="space-y-6">
        {/* Status Card */}
        <div className="p-5 rounded-3xl bg-black/40 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
              isCleaning ? 'bg-indigo-600 text-white shadow-indigo-600/30' : 'bg-white/10 text-slate-400'
            }`}>
              <Bot size={28} className={isCleaning ? 'animate-pulse' : ''} />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-white">
                {isCleaning ? 'Vacuuming Active Zone' : 'Docked at Charging Base'}
              </h4>
              <p className="text-xs text-indigo-300 font-medium">
                Battery: <strong className="text-white font-mono">{battery}%</strong> • Dustbin: <strong className="text-emerald-400">Empty</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleStartStop}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-md ${
                isCleaning
                  ? 'bg-rose-500 hover:bg-rose-400 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
              }`}
            >
              {isCleaning ? 'Pause Clean' : 'Start Full Clean'}
            </button>
            <button
              onClick={handleReturnDock}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Return to Base"
            >
              <Home size={16} />
            </button>
          </div>
        </div>

        {/* Suction Power Mode */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Gauge size={14} className="text-sky-400" /> Suction Power Profile
          </div>
          <div className="grid grid-cols-5 gap-2">
            {SUCTION_MODES.map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setSelectedMode(mode);
                  onUpdateEntity(entity.entity_id, entity.state, { mode });
                }}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedMode === mode
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white/5 hover:bg-white/15 text-slate-300 border border-white/10'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Zone Cleaning Selection */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <MapPin size={14} className="text-indigo-400" /> Select Rooms to Clean
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ROOM_ZONES.map((room) => {
              const isSelected = selectedRooms.includes(room);
              return (
                <button
                  key={room}
                  onClick={() => toggleRoom(room)}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <span>{room}</span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-indigo-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Consumable Wear Meters */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <span className="text-xs font-bold text-slate-300 block">Maintenance & Parts Health</span>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
              <span className="text-[10px] text-slate-400 block mb-1">HEPA Filter</span>
              <span className="text-sm font-black text-amber-400 font-mono">92% Wear</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
              <span className="text-[10px] text-slate-400 block mb-1">Main Roller</span>
              <span className="text-sm font-black text-emerald-400 font-mono">35% Wear</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
              <span className="text-[10px] text-slate-400 block mb-1">Side Brush</span>
              <span className="text-sm font-black text-emerald-400 font-mono">22% Wear</span>
            </div>
          </div>
        </div>
      </div>
    </CardModalContainer>
  );
}
