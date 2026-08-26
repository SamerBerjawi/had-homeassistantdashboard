/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldBan, 
  Lock, 
  Unlock, 
  KeyRound, 
  DoorOpen, 
  DoorClosed, 
  Eye, 
  Video, 
  Volume2, 
  VolumeX, 
  Flame, 
  Droplets, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Radio, 
  Camera, 
  Maximize2, 
  Clock, 
  Sparkles, 
  PhoneCall, 
  Siren, 
  BatteryLow, 
  ChevronRight, 
  History,
  Activity,
  Zap,
  Mic,
  MicOff
} from 'lucide-react';
import { HAEntity, Room } from '../types';
import CameraFeedCard from './CameraFeedCard';

interface SecurityViewProps {
  entities: HAEntity[];
  rooms: Room[];
  onUpdateEntityState: (entityId: string, newState: string, newAttributes?: any) => void;
  onCaptureSnapshot: (cameraName: string) => void;
  onIntercomToggle: (cameraName: string, isMuted: boolean) => void;
  onPanicTrigger: () => void;
  darkMode: boolean;
}

type AlarmMode = 'disarmed' | 'armed_home' | 'armed_away' | 'armed_night';

interface SecuritySensor {
  id: string;
  name: string;
  room: string;
  type: 'door' | 'window' | 'motion' | 'smoke' | 'leak' | 'lock';
  state: 'open' | 'closed' | 'motion' | 'clear' | 'smoke' | 'leak' | 'locked' | 'unlocked';
  battery?: number;
  lastEvent: string;
  isWarning?: boolean;
}

export default function SecurityView({
  entities,
  rooms,
  onUpdateEntityState,
  onCaptureSnapshot,
  onIntercomToggle,
  onPanicTrigger,
  darkMode
}: SecurityViewProps) {
  const [alarmMode, setAlarmMode] = useState<AlarmMode>('armed_home');
  const [showKeypadModal, setShowKeypadModal] = useState(false);
  const [targetAlarmMode, setTargetAlarmMode] = useState<AlarmMode | null>(null);
  const [pinCode, setPinCode] = useState('');
  const [pinError, setPinError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'doors_windows' | 'motion' | 'hazards'>('all');
  const [panicActive, setPanicActive] = useState(false);
  const [selectedCameraModal, setSelectedCameraModal] = useState<string | null>(null);

  // Derive front door lock entity
  const frontLock = entities.find(e => e.entity_id === 'lock.front_door') || {
    entity_id: 'lock.front_door',
    state: 'locked',
    attributes: { friendly_name: 'Front Door Nest Lock', battery: 94 }
  };

  // Static list of curated security perimeter sensors with live entity bindings
  const securitySensors: SecuritySensor[] = [
    {
      id: 'lock.front_door',
      name: 'Front Door Smart Lock',
      room: 'Entrance Hall',
      type: 'lock',
      state: frontLock.state === 'locked' ? 'locked' : 'unlocked',
      battery: 94,
      lastEvent: 'Armed Today, 8:02 AM',
      isWarning: frontLock.state !== 'locked'
    },
    {
      id: 'sensor.bedroom_window_contact',
      name: 'Bedroom Balcony Window',
      room: 'Bedroom',
      type: 'window',
      state: 'closed',
      battery: 16,
      lastEvent: 'Closed 3 days ago',
      isWarning: true // Due to low battery
    },
    {
      id: 'sensor.living_room_motion',
      name: 'Living Room PIR Sensor',
      room: 'Living Room',
      type: 'motion',
      state: 'clear',
      battery: 89,
      lastEvent: 'Motion clear 10 min ago',
      isWarning: false
    },
    {
      id: 'binary_sensor.front_motion',
      name: 'Front Porch Radar Detector',
      room: 'Entrance Hall',
      type: 'motion',
      state: 'clear',
      battery: 95,
      lastEvent: 'Clear 4 min ago',
      isWarning: false
    },
    {
      id: 'sensor.kitchen_cabinet_sensor',
      name: 'Kitchen Pantry Door',
      room: 'Kitchen',
      type: 'door',
      state: 'closed',
      battery: 14,
      lastEvent: 'Opened 1 hour ago',
      isWarning: false
    },
    {
      id: 'sensor.kitchen_smoke_detector',
      name: 'Kitchen Nest Smoke & CO',
      room: 'Kitchen',
      type: 'smoke',
      state: 'clear',
      battery: 98,
      lastEvent: 'Self-test passed (Normal)',
      isWarning: false
    },
    {
      id: 'sensor.kitchen_leak_detector',
      name: 'Under-Sink Water Leak Sensor',
      room: 'Kitchen',
      type: 'leak',
      state: 'clear',
      battery: 24,
      lastEvent: 'Probes dry & armed',
      isWarning: false
    },
    {
      id: 'sensor.patio_sliding_door',
      name: 'Patio Slider Contact',
      room: 'Living Room',
      type: 'door',
      state: 'closed',
      battery: 88,
      lastEvent: 'Closed Today, 7:30 AM',
      isWarning: false
    }
  ];

  // Camera feeds list
  const cameraFeeds = [
    {
      id: 'front_door',
      name: 'Front Porch & Entry Intercom',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
      status: 'Live • Courier present',
      isIntercom: true
    },
    {
      id: 'backyard',
      name: 'Backyard Pool & Perimeter',
      image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=800',
      status: 'Live • No activity detected',
      isIntercom: false
    },
    {
      id: 'garage',
      name: 'Garage Bay & Vehicle Entry',
      image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=800',
      status: 'Live • Door closed secure',
      isIntercom: false
    }
  ];

  const filteredSensors = securitySensors.filter(sensor => {
    if (activeFilter === 'doors_windows') return sensor.type === 'door' || sensor.type === 'window' || sensor.type === 'lock';
    if (activeFilter === 'motion') return sensor.type === 'motion';
    if (activeFilter === 'hazards') return sensor.type === 'smoke' || sensor.type === 'leak';
    return true;
  });

  const openDoorsCount = securitySensors.filter(s => (s.type === 'door' || s.type === 'window') && s.state === 'open').length;
  const unlockedLocksCount = securitySensors.filter(s => s.type === 'lock' && s.state === 'unlocked').length;

  const handleKeypadPress = (val: string) => {
    if (pinCode.length < 4) {
      setPinCode(prev => prev + val);
    }
  };

  const handleKeypadClear = () => {
    setPinCode('');
    setPinError(false);
  };

  const handleConfirmPin = () => {
    // Demo PIN accepts 1234 or any 4 digit
    if (pinCode.length === 4) {
      if (targetAlarmMode) {
        setAlarmMode(targetAlarmMode);
      }
      setShowKeypadModal(false);
      setPinCode('');
      setPinError(false);
      setTargetAlarmMode(null);
    } else {
      setPinError(true);
    }
  };

  const requestModeChange = (mode: AlarmMode) => {
    if (mode === alarmMode) return;
    if (mode === 'disarmed' || alarmMode === 'armed_away') {
      setTargetAlarmMode(mode);
      setShowKeypadModal(true);
    } else {
      setAlarmMode(mode);
    }
  };

  const handleToggleDoorLock = () => {
    const nextState = frontLock.state === 'locked' ? 'unlocked' : 'locked';
    onUpdateEntityState('lock.front_door', nextState);
  };

  const handlePanicClick = () => {
    setPanicActive(true);
    onPanicTrigger();
    setTimeout(() => {
      setPanicActive(false);
    }, 4000);
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col min-h-0">
      {/* 1. TOP HERO: ALARM STATUS & ARMING CONTROLS */}
      <div className={`rounded-3xl p-6 sm:p-8 border transition-all relative overflow-hidden shadow-sm ${
        panicActive
          ? 'bg-rose-950 border-rose-600 text-white animate-pulse'
          : alarmMode === 'disarmed'
            ? darkMode ? 'bg-slate-900/80 border-white/[0.1] backdrop-blur-md' : 'bg-white/80 border-black/[0.06] backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
            : darkMode
              ? 'bg-slate-900/90 border-[#7B61FF]/40 text-white backdrop-blur-md'
              : 'bg-indigo-50/80 border-indigo-200 text-slate-800 backdrop-blur-md'
      }`}>
        {/* Subtle Background Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#7B61FF]/15 to-transparent rounded-bl-full pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          {/* Left: Alarm Status Indicator */}
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-md transition-all ${
              panicActive
                ? 'bg-rose-600 text-white border-rose-400 animate-bounce shadow-rose-600/50'
                : alarmMode === 'disarmed'
                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                  : 'bg-[#7B61FF] text-white border-[#7B61FF] shadow-lg shadow-[#7B61FF]/40'
            }`}>
              {panicActive ? (
                <Siren size={32} />
              ) : alarmMode === 'disarmed' ? (
                <ShieldBan size={32} />
              ) : (
                <ShieldCheck size={32} />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  {panicActive 
                    ? 'SECURITY ALARM TRIGGERED' 
                    : alarmMode === 'disarmed' 
                      ? 'System Disarmed' 
                      : alarmMode === 'armed_home' 
                        ? 'Armed (Home Stay)' 
                        : alarmMode === 'armed_away' 
                          ? 'Armed (Away Shield)' 
                          : 'Armed (Night Guard)'}
                </h2>
                <span className={`w-2.5 h-2.5 rounded-full ${
                  alarmMode === 'disarmed' ? 'bg-slate-400' : 'bg-emerald-400 animate-pulse'
                }`} />
              </div>

              <p className="text-xs text-slate-400 font-medium mt-1">
                {openDoorsCount > 0 
                  ? `${openDoorsCount} entry points currently open • Perimeter check required`
                  : 'All perimeter door and window contact sensors secured'}
              </p>
            </div>
          </div>

          {/* Right: Arming Mode Selector Pills + Panic Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            {[
              { id: 'disarmed', label: 'Disarm', icon: ShieldBan },
              { id: 'armed_home', label: 'Arm Home', icon: ShieldCheck },
              { id: 'armed_away', label: 'Arm Away', icon: ShieldAlert },
              { id: 'armed_night', label: 'Night Mode', icon: Lock }
            ].map(item => {
              const Icon = item.icon;
              const isSel = alarmMode === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => requestModeChange(item.id as AlarmMode)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                    isSel
                      ? 'bg-[#7B61FF] text-white border-[#7B61FF] shadow-md shadow-[#7B61FF]/30 scale-105'
                      : darkMode
                        ? 'bg-slate-950/70 hover:bg-slate-800 border-slate-800 text-slate-300'
                        : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Emergency Panic Siren Button */}
            <button
              onClick={handlePanicClick}
              className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-rose-600/30 transition-all cursor-pointer"
            >
              <Siren size={15} />
              <span>SOS Siren</span>
            </button>
          </div>
        </div>

        {/* Security Quick Summary Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-200/50 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              openDoorsCount === 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
            }`}>
              {openDoorsCount === 0 ? <DoorClosed size={18} /> : <DoorOpen size={18} />}
            </div>
            <div>
              <span className={`text-sm font-black block leading-none ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                {openDoorsCount === 0 ? 'All Closed' : `${openDoorsCount} Open`}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Doors & Windows</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              frontLock.state === 'locked' ? 'bg-indigo-500/15 text-[#9D8BFF]' : 'bg-rose-500/15 text-rose-400'
            }`}>
              {frontLock.state === 'locked' ? <Lock size={18} /> : <Unlock size={18} />}
            </div>
            <div>
              <span className={`text-sm font-black block leading-none ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                {frontLock.state === 'locked' ? 'Front Locked' : 'Unlocked'}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Smart Locks</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-teal-500/15 text-teal-400">
              <Eye size={18} />
            </div>
            <div>
              <span className={`text-sm font-black block leading-none ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                3 Active
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">CCTV Feeds</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/15 text-emerald-400">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <span className={`text-sm font-black block leading-none ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                Optimal
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Smoke & Leak</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SURVEILLANCE CAMERAS SECTION (Replacing Live View) */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Video size={18} className="text-[#7B61FF]" />
            <h3 className={`text-base font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              Surveillance & Live Camera Feeds
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">H.265 Local NAS continuous sync</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Front Door Camera with Intercom */}
          <div className="lg:col-span-2">
            <CameraFeedCard 
              onCaptureSnapshot={onCaptureSnapshot}
              onIntercomToggle={onIntercomToggle}
              doorLocked={frontLock.state === 'locked'}
              onToggleDoorLock={handleToggleDoorLock}
              darkMode={darkMode}
            />
          </div>

          {/* Secondary Cameras Grid */}
          <div className="space-y-4">
            {cameraFeeds.slice(1).map(cam => (
              <div
                key={cam.id}
                className={`rounded-2xl overflow-hidden border relative group shadow-xs ${
                  darkMode ? 'bg-slate-900/80 border-white/[0.1]' : 'bg-white/80 border-black/[0.06]'
                }`}
              >
                <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                  <img
                    src={cam.image}
                    alt={cam.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="bg-red-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      LIVE
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                    <div>
                      <p className="text-xs font-black leading-tight">{cam.name}</p>
                      <p className="text-[10px] text-slate-300">{cam.status}</p>
                    </div>

                    <button
                      onClick={() => onCaptureSnapshot(cam.name)}
                      className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-colors cursor-pointer"
                      title="Capture snapshot"
                    >
                      <Camera size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. PERIMETER CONTACTS, SENSORS & LIFE SAFETY GRID */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className={`text-base font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              Perimeter Sensors & Safety Detectors
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Real-time contact state, motion radar, smoke & leak alerts
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 touch-scroll-container">
            {[
              { id: 'all', label: 'All Sensors' },
              { id: 'doors_windows', label: 'Doors & Windows' },
              { id: 'motion', label: 'Motion Radar' },
              { id: 'hazards', label: 'Smoke & Leak' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                  activeFilter === f.id
                    ? 'bg-[#7B61FF] text-white border-[#7B61FF]'
                    : darkMode
                      ? 'bg-slate-900/70 border-slate-800 text-slate-400'
                      : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredSensors.map(sensor => {
            const isLock = sensor.type === 'lock';
            const isDoorOrWindow = sensor.type === 'door' || sensor.type === 'window';
            const isMotion = sensor.type === 'motion';
            const isHazard = sensor.type === 'smoke' || sensor.type === 'leak';

            return (
              <motion.div
                key={sensor.id}
                layout
                whileHover={{ y: -2 }}
                className={`rounded-2xl p-4 border transition-all flex flex-col justify-between shadow-xs ${
                  sensor.isWarning
                    ? darkMode
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : 'bg-rose-50/80 border-rose-200'
                    : darkMode
                      ? 'bg-slate-900/70 border-white/[0.1]'
                      : 'bg-white/80 border-black/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs ${
                      sensor.isWarning
                        ? 'bg-rose-500 text-white border-rose-400'
                        : isLock
                          ? 'bg-[#7B61FF] text-white border-[#7B61FF]'
                          : isHazard
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : darkMode
                              ? 'bg-slate-800 text-slate-300 border-slate-700'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {isLock ? (
                        sensor.state === 'locked' ? <Lock size={16} /> : <Unlock size={16} />
                      ) : isDoorOrWindow ? (
                        sensor.state === 'open' ? <DoorOpen size={16} /> : <DoorClosed size={16} />
                      ) : isMotion ? (
                        <Activity size={16} />
                      ) : sensor.type === 'smoke' ? (
                        <Flame size={16} />
                      ) : (
                        <Droplets size={16} />
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {typeof sensor.battery === 'number' && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md font-mono flex items-center gap-0.5 ${
                          sensor.battery <= 20
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'text-slate-400'
                        }`}>
                          <BatteryLow size={10} />
                          {sensor.battery}%
                        </span>
                      )}

                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full font-mono ${
                        sensor.state === 'open' || sensor.state === 'unlocked' || sensor.state === 'smoke' || sensor.state === 'leak'
                          ? 'bg-rose-500 text-white'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {sensor.state}
                      </span>
                    </div>
                  </div>

                  <h4 className={`font-extrabold text-sm leading-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    {sensor.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{sensor.room}</p>
                </div>

                <div className={`mt-3 pt-2.5 border-t text-[10px] text-slate-400 flex items-center justify-between ${
                  darkMode ? 'border-slate-800' : 'border-slate-100'
                }`}>
                  <span>{sensor.lastEvent}</span>
                  {isLock && (
                    <button
                      onClick={handleToggleDoorLock}
                      className="font-bold text-[#7B61FF] hover:underline cursor-pointer"
                    >
                      {sensor.state === 'locked' ? 'Unlock' : 'Lock'}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* PIN KEYPAD MODAL FOR DISARMING / ARMING */}
      <AnimatePresence>
        {showKeypadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-xs p-6 rounded-3xl border shadow-2xl ${
                darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="text-center mb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#7B61FF]/20 text-[#7B61FF] flex items-center justify-center mx-auto mb-2">
                  <KeyRound size={24} />
                </div>
                <h3 className="text-base font-extrabold">Security PIN Verification</h3>
                <p className="text-xs text-slate-400">Enter master PIN to confirm status change</p>
              </div>

              {/* PIN Dots Display */}
              <div className="flex justify-center gap-3 my-4">
                {[0, 1, 2, 3].map(idx => (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                      pinCode.length > idx
                        ? 'bg-[#7B61FF] border-[#7B61FF] scale-110 shadow-sm shadow-[#7B61FF]'
                        : darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-300 bg-slate-100'
                    }`}
                  />
                ))}
              </div>

              {pinError && (
                <p className="text-center text-xs text-rose-500 font-bold mb-2">
                  Please enter a 4-digit code (e.g. 1234)
                </p>
              )}

              {/* Keypad Grid */}
              <div className="grid grid-cols-3 gap-2.5 my-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].map(key => {
                  const isOK = key === 'OK';
                  const isC = key === 'C';
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        if (isC) handleKeypadClear();
                        else if (isOK) handleConfirmPin();
                        else handleKeypadPress(key);
                      }}
                      className={`h-12 rounded-2xl text-sm font-extrabold transition-all flex items-center justify-center cursor-pointer border ${
                        isOK
                          ? 'bg-[#7B61FF] hover:bg-[#684be3] text-white border-[#7B61FF]'
                          : isC
                            ? darkMode ? 'bg-slate-800 text-rose-400 border-slate-700' : 'bg-slate-100 text-rose-600 border-slate-200'
                            : darkMode
                              ? 'bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-white'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                      }`}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowKeypadModal(false);
                  setPinCode('');
                  setTargetAlarmMode(null);
                }}
                className="w-full mt-2 py-2 text-center text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
