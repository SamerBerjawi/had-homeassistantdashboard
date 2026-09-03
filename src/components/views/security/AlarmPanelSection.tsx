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
import CustomDropdown from '../../ui/CustomDropdown';

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
        bg: darkMode
          ? 'from-rose-500/20 to-red-600/30 border-rose-500/50'
          : 'from-rose-500/[0.12] to-red-600/[0.08] border-rose-500/35 bg-white/70 shadow-[0_4px_24px_-6px_rgba(244,63,94,0.2)]',
        text: darkMode ? 'text-rose-300' : 'text-rose-800',
        glow: 'shadow-rose-500/30 shadow-2xl',
        badge: 'bg-rose-500 text-white font-black',
        title: 'ALARM TRIGGERED',
        desc: 'Intrusion alert active! Sirens and notifications broadcasting.'
      };
    }
    if (currentState === 'armed_away') {
      return {
        bg: darkMode
          ? 'from-emerald-950/40 to-teal-950/20 bg-slate-900/70'
          : 'from-emerald-50 to-teal-50/50 bg-white/95',
        text: darkMode ? 'text-emerald-300' : 'text-emerald-900',
        glow: darkMode ? 'shadow-[0_20px_50px_rgba(0,0,0,0.5)]' : 'shadow-xl shadow-slate-200/80',
        badge: 'bg-emerald-500 text-slate-950 font-black',
        title: 'ARMED AWAY',
        desc: 'Maximum perimeter and interior motion protection active.'
      };
    }
    if (currentState === 'armed_home') {
      return {
        bg: darkMode
          ? 'from-emerald-950/40 to-teal-950/20 bg-slate-900/70'
          : 'from-emerald-50 to-teal-50/50 bg-white/95',
        text: darkMode ? 'text-emerald-300' : 'text-emerald-900',
        glow: darkMode ? 'shadow-[0_20px_50px_rgba(0,0,0,0.5)]' : 'shadow-xl shadow-slate-200/80',
        badge: 'bg-emerald-500 text-slate-950 font-black',
        title: 'ARMED HOME',
        desc: 'Perimeter doors, windows, and outdoor zones secured.'
      };
    }
    if (currentState === 'armed_night') {
      return {
        bg: darkMode
          ? 'from-indigo-950/40 to-purple-950/20 bg-slate-900/70'
          : 'from-indigo-50 to-purple-50/50 bg-white/95',
        text: darkMode ? 'text-indigo-300' : 'text-indigo-900',
        glow: darkMode ? 'shadow-[0_20px_50px_rgba(0,0,0,0.5)]' : 'shadow-xl shadow-slate-200/80',
        badge: 'bg-indigo-500 text-white font-black',
        title: 'ARMED NIGHT',
        desc: 'Exterior perimeter and downstairs sensors armed for sleep.'
      };
    }
    return {
      bg: darkMode
        ? 'from-slate-800/40 to-slate-900/40 bg-slate-900/70'
        : 'from-white to-slate-50/80 bg-white/95',
      text: darkMode ? 'text-amber-400' : 'text-amber-800',
      glow: 'shadow-[4px_6px_12px_rgba(0,0,0,0.15)]',
      badge: 'bg-amber-500 text-slate-950 font-black',
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
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
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
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold hidden sm:inline">Partition:</span>
            <CustomDropdown
              value={entityId}
              onChange={(val) => setSelectedAlarmEntityId(val)}
              size="sm"
              className="w-56"
              options={alarmEntities.map((a) => ({
                value: a.entity_id,
                label: a.name || a.attributes?.friendly_name || a.entity_id,
                badge: a.state ? (a.state.startsWith('armed') ? 'ARMED' : 'DISARMED') : undefined
              }))}
            />
          </div>
        )}
      </div>

      {/* Main Glassmorphic Alarm Panel Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        
        {/* LEFT COLUMN: Status Visualizer & Mode Switcher (7 cols) */}
        <div className={`lg:col-span-7 p-6 sm:p-8 rounded-3xl backdrop-blur-sm overflow-hidden isolate transition-all flex flex-col justify-between bg-gradient-to-br ${
          statusConfig.bg
        } ${statusConfig.glow}`}>
          
          {/* Top Status Strip */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-6">
              <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${statusConfig.badge}`}>
                {statusConfig.title}
              </span>

              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Partition 01 • Hallway</span>
              </div>
            </div>

            {/* Shield & State Illustration */}
            <div className="flex flex-col sm:flex-row items-center gap-6 my-4">
              <div className="relative">
                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center ${
                  isTriggered
                    ? 'bg-rose-500/20 text-rose-400'
                    : isArmed
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-900/[0.04] dark:bg-white/10 text-slate-500 dark:text-slate-400'
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
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  {activeAlarm.name || activeAlarm.attributes?.friendly_name || 'Homz Security Guard'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md font-medium">
                  {statusConfig.desc}
                </p>
                <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span>Last changed: {activeAlarm.attributes?.armed_at || 'Today, 7:30 AM'}</span>
                  <span>•</span>
                  <span>By: {activeAlarm.attributes?.changed_by || 'User'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Open Openings Readiness Warning Banner */}
          {totalOpenOpenings > 0 && (
            <div className={`my-4 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs font-medium ${
              darkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-500/10 text-amber-950'
            }`}>
              <div className="flex items-center gap-2">
                <DoorOpen size={18} weight="duotone" className="shrink-0 text-amber-600 dark:text-amber-400" />
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
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : darkMode
                      ? 'bg-white/10 hover:bg-white/20 text-white'
                      : 'bg-slate-900/[0.08] hover:bg-slate-900/[0.14] text-slate-900'
                }`}
              >
                {isBypassMode ? 'Bypassed' : 'Bypass'}
              </button>
            </div>
          )}

          {/* Mode Switcher Action Grid */}
          <div className="space-y-3 pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
              {/* Disarm */}
              <button
                type="button"
                onClick={() => handleSetMode('disarmed')}
                className={`py-3 px-3 rounded-2xl text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  currentState === 'disarmed'
                    ? darkMode
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : darkMode
                      ? 'bg-white/5 hover:bg-white/10 text-slate-300'
                      : 'bg-slate-900/[0.04] hover:bg-slate-900/[0.08] text-slate-700 shadow-2xs'
                }`}
              >
                <LockOpen size={20} weight={currentState === 'disarmed' ? 'bold' : 'duotone'} />
                <span>Disarm</span>
              </button>

              {/* Arm Home */}
              <button
                type="button"
                onClick={() => handleSetMode('armed_home')}
                className={`py-3 px-3 rounded-2xl text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  currentState === 'armed_home'
                    ? darkMode
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                    : darkMode
                      ? 'bg-white/5 hover:bg-white/10 text-slate-300'
                      : 'bg-slate-900/[0.04] hover:bg-slate-900/[0.08] text-slate-700 shadow-2xs'
                }`}
              >
                <ShieldCheck size={20} weight={currentState === 'armed_home' ? 'bold' : 'duotone'} />
                <span>Arm Home</span>
              </button>

              {/* Arm Away */}
              <button
                type="button"
                onClick={() => handleSetMode('armed_away')}
                className={`py-3 px-3 rounded-2xl text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  currentState === 'armed_away'
                    ? darkMode
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                    : darkMode
                      ? 'bg-white/5 hover:bg-white/10 text-slate-300'
                      : 'bg-slate-900/[0.04] hover:bg-slate-900/[0.08] text-slate-700 shadow-2xs'
                }`}
              >
                <Shield size={20} weight={currentState === 'armed_away' ? 'bold' : 'duotone'} />
                <span>Arm Away</span>
              </button>

              {/* Arm Night */}
              <button
                type="button"
                onClick={() => handleSetMode('armed_night')}
                className={`py-3 px-3 rounded-2xl text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  currentState === 'armed_night'
                    ? darkMode
                      ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                      : 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : darkMode
                      ? 'bg-white/5 hover:bg-white/10 text-slate-300'
                      : 'bg-slate-900/[0.04] hover:bg-slate-900/[0.08] text-slate-700 shadow-2xs'
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
                    className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer shadow-lg"
                  >
                    Confirm Siren & Panic Broadcast!
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPanicConfirm(false)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPanicConfirm(true)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    darkMode
                      ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400'
                      : 'bg-rose-500/[0.08] hover:bg-rose-500/15 text-rose-700'
                  }`}
                >
                  <BellRinging size={16} weight="duotone" />
                  <span>Emergency SOS / Panic Trigger</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Security PIN Keypad (5 cols) */}
        <div className={`lg:col-span-5 p-6 rounded-3xl backdrop-blur-sm overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] flex flex-col justify-between ${
          darkMode
            ? 'bg-black/20 text-white'
            : 'bg-white/20 text-slate-900'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Security PIN Keypad</h4>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Optional 4-Digit PIN</span>
            </div>

            {/* PIN Code Masked Indicators */}
            <div className={`py-3.5 px-4 rounded-2xl flex items-center justify-center gap-3 mb-4 ${
              darkMode ? 'bg-white/[0.04]' : 'bg-white/80 shadow-2xs'
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
              <div className={`mb-3 p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                darkMode ? 'bg-rose-500/15 text-rose-300' : 'bg-rose-500/10 text-rose-700'
              }`}>
                <WarningCircle size={15} weight="fill" className="shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className={`mb-3 p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                darkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-500/10 text-emerald-700'
              }`}>
                <CheckCircle size={15} weight="fill" className="shrink-0 text-emerald-500" />
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
                  className={`h-11 rounded-2xl font-mono text-base font-bold transition-all cursor-pointer active:scale-95 flex items-center justify-center ${
                    darkMode
                      ? 'bg-white/[0.05] hover:bg-white/[0.12] text-white'
                      : 'bg-white hover:bg-slate-50 text-slate-900 shadow-2xs'
                  }`}
                >
                  {num}
                </button>
              ))}

              {/* Clear */}
              <button
                type="button"
                onClick={handleClear}
                className={`h-11 rounded-2xl text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center justify-center ${
                  darkMode ? 'bg-white/[0.05] hover:bg-white/[0.12] text-slate-400' : 'bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
                }`}
              >
                Clear
              </button>

              {/* 0 */}
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className={`h-11 rounded-2xl font-mono text-base font-bold transition-all cursor-pointer active:scale-95 flex items-center justify-center ${
                  darkMode
                    ? 'bg-white/[0.05] hover:bg-white/[0.12] text-white'
                    : 'bg-white hover:bg-slate-50 text-slate-900 shadow-2xs'
                }`}
              >
                0
              </button>

              {/* Backspace */}
              <button
                type="button"
                onClick={handleBackspace}
                className={`h-11 rounded-2xl text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center justify-center ${
                  darkMode ? 'bg-white/[0.05] hover:bg-white/[0.12] text-slate-400' : 'bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
                }`}
              >
                <Backspace size={18} weight="bold" />
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
