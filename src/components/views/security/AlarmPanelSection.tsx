/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldWarning, 
  Lock, 
  LockOpen, 
  Moon, 
  Shield, 
  Backspace, 
  WarningCircle, 
  CheckCircle,
  Warning,
  DoorOpen,
  Broom,
  BellRinging,
  CaretDown
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';

interface AlarmPanelSectionProps {
  darkMode?: boolean;
  alarmEntities: ResolvedEntity[];
  openDoors: ResolvedEntity[];
  openWindows: ResolvedEntity[];
}

export default function AlarmPanelSection({
  darkMode = true,
  alarmEntities,
  openDoors,
  openWindows
}: AlarmPanelSectionProps) {
  const selectedAlarmEntityId = useAutoLayoutStore(s => s.selectedAlarmEntityId);
  const setSelectedAlarmEntityId = useAutoLayoutStore(s => s.setSelectedAlarmEntityId);
  const callHAService = useAutoLayoutStore(s => s.callHAService);
  const updateEntityState = useAutoLayoutStore(s => s.updateEntityState);

  const activeAlarm: ResolvedEntity = 
    alarmEntities.find(a => a.entity_id === selectedAlarmEntityId) || 
    alarmEntities[0] || {
      entity_id: 'alarm_control_panel.home_alarm',
      name: 'Homz Security Guard',
      state: 'armed_home',
      domain: 'alarm_control_panel',
      area_id: 'hallway',
      device_id: 'dev_alarm',
      floor_id: 'floor_ground',
      resolutionSource: 'direct_entity_area',
      hidden: false,
      isDiagnostic: false,
      attributes: {
        friendly_name: 'Homz Security Guard',
        changed_by: 'Sarah Jenkins',
        armed_at: 'Today, 7:30 AM'
      }
    };

  const currentState = activeAlarm.state || 'disarmed';
  const entityId = activeAlarm.entity_id;
  const isArmed = currentState.startsWith('armed');
  const isTriggered = currentState === 'triggered';

  const [pin, setPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isBypassMode, setIsBypassMode] = useState<boolean>(false);
  const [showPanicConfirm, setShowPanicConfirm] = useState<boolean>(false);

  const totalOpenOpenings = openDoors.length + openWindows.length;

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + num);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleClear = () => {
    setPin('');
    setErrorMessage(null);
  };

  const handleSetMode = async (mode: 'disarmed' | 'armed_home' | 'armed_away' | 'armed_night') => {
    // If arming away with open doors and not bypassed, warn user
    if (mode === 'armed_away' && totalOpenOpenings > 0 && !isBypassMode) {
      setErrorMessage(`${totalOpenOpenings} perimeter opening(s) are open. Bypass or close before arming away.`);
      return;
    }

    try {
      const serviceName = 
        mode === 'disarmed' ? 'alarm_disarm' :
        mode === 'armed_home' ? 'alarm_arm_home' :
        mode === 'armed_away' ? 'alarm_arm_away' :
        'alarm_arm_night';

      const payload: Record<string, any> = {};
      if (pin && pin.length >= 4) {
        payload.code = pin;
      }

      await callHAService('alarm_control_panel', serviceName, payload, { entity_id: entityId });
      
      updateEntityState(entityId, mode, {
        changed_by: 'User Keypad (1-Tap)',
        armed_at: 'Just now',
        perimeter_secure: totalOpenOpenings === 0 || isBypassMode
      });

      setPin('');
      setErrorMessage(null);
      setSuccessMessage(`Alarm successfully changed to ${mode.replace('_', ' ').toUpperCase()}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update alarm status');
    }
  };

  const handleTriggerPanic = async () => {
    try {
      await callHAService('alarm_control_panel', 'alarm_trigger', {}, { entity_id: entityId });
      updateEntityState(entityId, 'triggered', {
        changed_by: 'Emergency Panic Trigger',
        armed_at: 'Just now'
      });
      setShowPanicConfirm(false);
      setSuccessMessage('Emergency Panic Siren Broadcasted');
    } catch (err: any) {
      setErrorMessage('Failed to trigger panic alarm');
    }
  };

  const getStatusColorConfig = () => {
    if (isTriggered) {
      return {
        bg: 'from-rose-500/20 to-red-600/30 border-rose-500/50',
        text: 'text-rose-400',
        glow: 'shadow-rose-500/30 shadow-2xl',
        badge: 'bg-rose-500 text-white',
        title: 'ALARM TRIGGERED',
        desc: 'Intrusion alert active! Sirens and notifications broadcasting.'
      };
    }
    if (currentState === 'armed_away') {
      return {
        bg: 'from-emerald-500/15 to-teal-500/10 border-emerald-500/40',
        text: 'text-emerald-400',
        glow: 'shadow-emerald-500/20 shadow-xl',
        badge: 'bg-emerald-500 text-black',
        title: 'ARMED AWAY',
        desc: 'Maximum perimeter and interior motion protection active.'
      };
    }
    if (currentState === 'armed_home') {
      return {
        bg: 'from-emerald-500/15 to-teal-500/10 border-emerald-500/40',
        text: 'text-emerald-400',
        glow: 'shadow-emerald-500/20 shadow-xl',
        badge: 'bg-emerald-500 text-black',
        title: 'ARMED HOME',
        desc: 'Perimeter doors, windows, and outdoor zones secured.'
      };
    }
    if (currentState === 'armed_night') {
      return {
        bg: 'from-indigo-500/15 to-purple-500/10 border-indigo-500/40',
        text: 'text-indigo-400',
        glow: 'shadow-indigo-500/20 shadow-xl',
        badge: 'bg-indigo-500 text-white',
        title: 'ARMED NIGHT',
        desc: 'Exterior perimeter and downstairs sensors armed for sleep.'
      };
    }
    return {
      bg: 'from-slate-500/10 to-slate-600/5 border-white/10',
      text: 'text-amber-400',
      glow: 'shadow-none',
      badge: 'bg-amber-500 text-black',
      title: 'DISARMED',
      desc: 'Standby mode. All sensors active in telemetry-only monitoring.'
    };
  };

  const statusConfig = getStatusColorConfig();

  return (
    <section className="w-full flex flex-col space-y-4">
      {/* Section Header with Partition Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <ShieldCheck size={18} weight="duotone" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight">Security Alarm Control Panel</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage partitions, armed zones, and interactive PIN authentication
            </p>
          </div>
        </div>

        {/* Partition Dropdown if multiple alarms */}
        {alarmEntities.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold hidden sm:inline">Partition:</span>
            <select
              value={entityId}
              onChange={(e) => setSelectedAlarmEntityId(e.target.value)}
              className={`px-3 py-1.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                darkMode ? 'bg-black/60 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {alarmEntities.map((a) => (
                <option key={a.entity_id} value={a.entity_id}>
                  {a.name || a.attributes?.friendly_name || a.entity_id}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Glassmorphic Alarm Panel Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        
        {/* LEFT COLUMN: Status Visualizer & Mode Switcher (7 cols) */}
        <div className={`lg:col-span-7 p-6 sm:p-8 rounded-3xl backdrop-blur-xl border bg-gradient-to-br transition-all flex flex-col justify-between ${
          statusConfig.bg
        } ${statusConfig.glow}`}>
          
          {/* Top Status Strip */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-6">
              <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${statusConfig.badge}`}>
                {statusConfig.title}
              </span>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Partition 01 • Hallway</span>
              </div>
            </div>

            {/* Shield & State Illustration */}
            <div className="flex flex-col sm:flex-row items-center gap-6 my-4">
              <div className="relative">
                <div className={`w-24 h-24 rounded-3xl border flex items-center justify-center ${
                  isTriggered
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 animate-bounce'
                    : isArmed
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : 'bg-white/10 border-white/15 text-slate-400'
                }`}>
                  {isArmed ? (
                    <ShieldCheck size={48} weight="duotone" />
                  ) : isTriggered ? (
                    <BellRinging size={48} weight="duotone" />
                  ) : (
                    <ShieldWarning size={48} weight="duotone" />
                  )}
                </div>
                {isArmed && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
                  </span>
                )}
              </div>

              <div className="space-y-1 text-center sm:text-left">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                  {activeAlarm.name || activeAlarm.attributes?.friendly_name || 'Homz Security Guard'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md">
                  {statusConfig.desc}
                </p>
                <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-400 font-medium">
                  <span>Last changed: {activeAlarm.attributes?.armed_at || 'Today, 7:30 AM'}</span>
                  <span>•</span>
                  <span>By: {activeAlarm.attributes?.changed_by || 'User'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Open Openings Readiness Warning Banner */}
          {totalOpenOpenings > 0 && (
            <div className="my-4 p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-300">
                <DoorOpen size={18} weight="duotone" className="shrink-0 text-amber-400" />
                <span>
                  <strong>{totalOpenOpenings} perimeter opening(s) are open.</strong> (
                  {[...openDoors, ...openWindows].map(e => e.name || e.attributes?.friendly_name).join(', ')}
                  )
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsBypassMode(!isBypassMode)}
                className={`px-2.5 py-1 rounded-xl font-bold uppercase text-[10px] transition-all cursor-pointer ${
                  isBypassMode
                    ? 'bg-amber-500 text-black'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {isBypassMode ? 'Bypassed' : 'Bypass Zones'}
              </button>
            </div>
          )}

          {/* Mode Selector Buttons */}
          <div className="pt-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Disarm */}
              <button
                type="button"
                onClick={() => handleSetMode('disarmed')}
                className={`py-3 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  currentState === 'disarmed'
                    ? 'bg-white text-black border-white shadow-md'
                    : darkMode
                      ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                      : 'bg-white/60 hover:bg-white border-slate-200 text-slate-700'
                }`}
              >
                <LockOpen size={20} weight={currentState === 'disarmed' ? 'bold' : 'duotone'} />
                <span>Disarm</span>
              </button>

              {/* Arm Home */}
              <button
                type="button"
                onClick={() => handleSetMode('armed_home')}
                className={`py-3 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  currentState === 'armed_home'
                    ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/20'
                    : darkMode
                      ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                      : 'bg-white/60 hover:bg-white border-slate-200 text-slate-700'
                }`}
              >
                <ShieldCheck size={20} weight={currentState === 'armed_home' ? 'bold' : 'duotone'} />
                <span>Arm Home</span>
              </button>

              {/* Arm Away */}
              <button
                type="button"
                onClick={() => handleSetMode('armed_away')}
                className={`py-3 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  currentState === 'armed_away'
                    ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/20'
                    : darkMode
                      ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                      : 'bg-white/60 hover:bg-white border-slate-200 text-slate-700'
                }`}
              >
                <Shield size={20} weight={currentState === 'armed_away' ? 'bold' : 'duotone'} />
                <span>Arm Away</span>
              </button>

              {/* Arm Night */}
              <button
                type="button"
                onClick={() => handleSetMode('armed_night')}
                className={`py-3 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  currentState === 'armed_night'
                    ? 'bg-indigo-500 text-white border-indigo-400 shadow-md shadow-indigo-500/20'
                    : darkMode
                      ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                      : 'bg-white/60 hover:bg-white border-slate-200 text-slate-700'
                }`}
              >
                <Moon size={20} weight={currentState === 'armed_night' ? 'bold' : 'duotone'} />
                <span>Arm Night</span>
              </button>
            </div>

            {/* Panic / Emergency Button */}
            <div className="flex items-center justify-between gap-3 pt-1">
              {showPanicConfirm ? (
                <div className="flex items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={handleTriggerPanic}
                    className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold animate-pulse cursor-pointer shadow-lg"
                  >
                    Confirm Siren & Panic Broadcast!
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPanicConfirm(false)}
                    className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPanicConfirm(true)}
                  className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <BellRinging size={16} weight="duotone" />
                  <span>Emergency SOS / Panic Trigger</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Security PIN Keypad (5 cols) */}
        <div className={`lg:col-span-5 p-6 rounded-3xl backdrop-blur-xl border flex flex-col justify-between ${
          darkMode ? 'bg-black/60 border-white/10 text-white' : 'bg-white/80 border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-black tracking-tight">Security PIN Keypad</h4>
              <span className="text-[11px] text-slate-400 font-mono">Optional 4-Digit PIN</span>
            </div>

            {/* PIN Code Masked Indicators */}
            <div className={`py-3.5 px-4 rounded-2xl border flex items-center justify-center gap-3 mb-4 ${
              darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
            }`}>
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = pin.length > idx;
                return (
                  <span
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all ${
                      isFilled
                        ? 'bg-emerald-400 scale-110 shadow-md shadow-emerald-400/50'
                        : darkMode
                          ? 'bg-white/20'
                          : 'bg-slate-300'
                    }`}
                  />
                );
              })}
            </div>

            {/* Error or Success Notice */}
            {errorMessage && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <WarningCircle size={15} weight="fill" className="shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="mb-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle size={15} weight="fill" className="shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Numeric Keypad Grid (1-9, Clear, 0, Backspace) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyPress(num)}
                  className={`h-11 rounded-2xl border font-mono text-base font-bold transition-all cursor-pointer active:scale-95 flex items-center justify-center ${
                    darkMode
                      ? 'bg-white/5 hover:bg-white/15 border-white/10 text-white'
                      : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800 shadow-2xs'
                  }`}
                >
                  {num}
                </button>
              ))}

              {/* Clear */}
              <button
                type="button"
                onClick={handleClear}
                className={`h-11 rounded-2xl border text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center justify-center ${
                  darkMode ? 'bg-white/5 hover:bg-white/15 border-white/10 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                }`}
              >
                CLEAR
              </button>

              {/* 0 */}
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className={`h-11 rounded-2xl border font-mono text-base font-bold transition-all cursor-pointer active:scale-95 flex items-center justify-center ${
                  darkMode
                    ? 'bg-white/5 hover:bg-white/15 border-white/10 text-white'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800 shadow-2xs'
                }`}
              >
                0
              </button>

              {/* Backspace */}
              <button
                type="button"
                onClick={handleBackspace}
                className={`h-11 rounded-2xl border text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center justify-center ${
                  darkMode ? 'bg-white/5 hover:bg-white/15 border-white/10 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                }`}
              >
                <Backspace size={18} weight="duotone" />
              </button>
            </div>
          </div>

          <div className="pt-4 text-center">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Homz Security Panel • Encrypted Local PIN Check
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
