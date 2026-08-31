/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldWarning, 
  LockOpen, 
  Moon, 
  Shield, 
  Backspace, 
  WarningCircle, 
  CheckCircle,
  MapPin
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import DetailsRightDrawer from '../DetailsRightDrawer';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import CustomDropdown from '../../ui/CustomDropdown';

interface AlarmKeypadModalProps {
  isOpen: boolean;
  onClose: () => void;
  alarmEntity?: ResolvedEntity;
  onUpdateEntity: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
  darkMode?: boolean;
}

export default function AlarmKeypadModal({
  isOpen,
  onClose,
  alarmEntity,
  onUpdateEntity,
  darkMode = true
}: AlarmKeypadModalProps) {
  const domainGroups = useAutoLayoutStore((s) => s.domainGroups);
  const selectedAlarmEntityId = useAutoLayoutStore((s) => s.selectedAlarmEntityId);
  const setSelectedAlarmEntityId = useAutoLayoutStore((s) => s.setSelectedAlarmEntityId);
  const callHAService = useAutoLayoutStore((s) => s.callHAService);

  const alarmEntities: ResolvedEntity[] = domainGroups['alarm_control_panel'] || [];
  const activeAlarm: ResolvedEntity | undefined = 
    (alarmEntity && !selectedAlarmEntityId ? alarmEntity : undefined) ||
    alarmEntities.find((a) => a.entity_id === selectedAlarmEntityId) || 
    alarmEntity ||
    alarmEntities[0];

  const entityOptions = alarmEntities.map((a) => ({
    value: a.entity_id,
    label: a.name || a.attributes?.friendly_name || a.entity_id
  }));

  const [pin, setPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const currentState = activeAlarm?.state || 'disarmed';
  const entityId = activeAlarm?.entity_id || 'alarm_control_panel.home_alarm';

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + num);
      setErrorMessage(null);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleClear = () => {
    setPin('');
    setErrorMessage(null);
  };

  const handleSetMode = async (mode: 'disarmed' | 'armed_home' | 'armed_away' | 'armed_night') => {
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
      onUpdateEntity(entityId, mode, {
        changed_by: 'User Keypad (1-Tap)',
        last_changed: 'Just now'
      });

      setPin('');
      setErrorMessage(null);
      setSuccessMessage(`Alarm successfully ${mode === 'disarmed' ? 'disarmed' : `armed (${mode.replace('armed_', '')})`}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update alarm state');
    }
  };

  const getStateBadge = () => {
    switch (currentState) {
      case 'armed_home':
        return {
          label: 'Armed (Home)',
          color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
          icon: ShieldCheck,
          iconColor: 'text-emerald-500'
        };
      case 'armed_away':
        return {
          label: 'Armed (Away)',
          color: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
          icon: ShieldWarning,
          iconColor: 'text-rose-500'
        };
      case 'armed_night':
        return {
          label: 'Armed (Night)',
          color: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
          icon: Moon,
          iconColor: 'text-indigo-500'
        };
      case 'disarmed':
      default:
        return {
          label: 'Disarmed',
          color: 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300',
          icon: LockOpen,
          iconColor: 'text-slate-500'
        };
    }
  };

  const badge = getStateBadge();
  const StateIcon = badge.icon;

  return (
    <DetailsRightDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Security System & Keypad"
      subtitle={activeAlarm?.name || 'Perimeter Security Guard'}
      icon={<Shield size={22} weight="duotone" className="text-indigo-500" />}
      darkMode={darkMode}
    >
      <div className="space-y-5 pb-24 sm:pb-6">
        {/* Multi-Alarm Entity Selector */}
        {alarmEntities.length > 1 && (
          <div className="p-3.5 rounded-2xl bg-white/20 dark:bg-black/20 border border-slate-200/80 dark:border-white/10 backdrop-blur-sm flex flex-col gap-1.5 shadow-[4px_6px_12px_rgba(0,0,0,0.15)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin size={14} weight="duotone" className="text-indigo-500" />
                Select Alarm Panel
              </span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                {alarmEntities.length} panels installed
              </span>
            </div>
            <CustomDropdown
              value={entityId}
              onChange={(val) => setSelectedAlarmEntityId(val)}
              options={entityOptions}
              size="md"
              placement="bottom"
            />
          </div>
        )}

        {/* Status Header */}
        <div className={`p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)] flex items-center justify-between transition-colors ${
          darkMode
            ? 'bg-black/20 text-white'
            : 'bg-white/20 text-slate-900'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${badge.color}`}>
              <StateIcon size={32} weight="duotone" className={badge.iconColor} />
            </div>
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Security Mode</div>
              <div className="text-xl font-black text-slate-900 dark:text-white">{badge.label}</div>
            </div>
          </div>

          <span className={`text-[10px] font-extrabold uppercase px-3 py-1 rounded-full ${badge.color}`}>
            Live Active
          </span>
        </div>

        {/* Mode Selector Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleSetMode('disarmed')}
            className={`p-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer shadow-xs ${
              currentState === 'disarmed'
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 shadow-md'
                : 'bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300'
            }`}
          >
            <LockOpen size={16} weight="duotone" />
            <span>Disarm</span>
          </button>

          <button
            type="button"
            onClick={() => handleSetMode('armed_home')}
            className={`p-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer shadow-xs ${
              currentState === 'armed_home'
                ? 'bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 shadow-md'
                : 'bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300'
            }`}
          >
            <ShieldCheck size={16} weight="duotone" />
            <span>Arm Home</span>
          </button>

          <button
            type="button"
            onClick={() => handleSetMode('armed_away')}
            className={`p-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer shadow-xs ${
              currentState === 'armed_away'
                ? 'bg-rose-500/25 text-rose-800 dark:text-rose-300 border-rose-500/40 shadow-md'
                : 'bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300'
            }`}
          >
            <ShieldWarning size={16} weight="duotone" />
            <span>Arm Away</span>
          </button>

          <button
            type="button"
            onClick={() => handleSetMode('armed_night')}
            className={`p-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer shadow-xs ${
              currentState === 'armed_night'
                ? 'bg-indigo-500/25 text-indigo-800 dark:text-indigo-300 border-indigo-500/40 shadow-md'
                : 'bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Moon size={16} weight="duotone" />
            <span>Arm Night</span>
          </button>
        </div>

        {/* PIN Code Display */}
        <div className="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/20 dark:bg-black/20 backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)]">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
            Optional Keypad PIN
          </div>
          <div className="flex items-center gap-3 my-2">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all ${
                  pin.length > idx
                    ? 'bg-indigo-500 shadow-xs shadow-indigo-500/50 scale-110'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>
          {errorMessage && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500 mt-2">
              <WarningCircle size={14} weight="bold" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-2">
              <CheckCircle size={14} weight="bold" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Numeric Keypad Grid */}
        <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="h-12 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/20 hover:bg-white/30 dark:bg-black/20 dark:hover:bg-black/30 active:bg-white/40 dark:active:bg-black/40 text-lg font-bold text-slate-900 dark:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-xs"
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/20 hover:bg-white/30 dark:bg-black/20 dark:hover:bg-black/30 text-xs font-extrabold uppercase text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-xs"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-12 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/20 hover:bg-white/30 dark:bg-black/20 dark:hover:bg-black/30 active:bg-white/40 dark:active:bg-black/40 text-lg font-bold text-slate-900 dark:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-xs"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/20 hover:bg-white/30 dark:bg-black/20 dark:hover:bg-black/30 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-xs"
          >
            <Backspace size={20} weight="duotone" />
          </button>
        </div>
      </div>
    </DetailsRightDrawer>
  );
}
