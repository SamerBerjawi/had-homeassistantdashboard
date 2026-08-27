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
  CheckCircle 
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import DetailsRightDrawer from '../DetailsRightDrawer';

interface AlarmKeypadModalProps {
  isOpen: boolean;
  onClose: () => void;
  alarmEntity?: ResolvedEntity;
  onUpdateEntity: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
}

export default function AlarmKeypadModal({
  isOpen,
  onClose,
  alarmEntity,
  onUpdateEntity
}: AlarmKeypadModalProps) {
  const [pin, setPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const currentState = alarmEntity?.state || 'armed_home';
  const entityId = alarmEntity?.entity_id || 'alarm_control_panel.home_alarm';

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + num);
      setErrorMessage(null);
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

  const handleSetMode = (mode: 'disarmed' | 'armed_home' | 'armed_away' | 'armed_night') => {
    if (mode === 'disarmed' && currentState !== 'disarmed') {
      if (pin.length > 0 && pin !== '1234' && pin.length < 4) {
        setErrorMessage('Invalid PIN code. Try 1234.');
        return;
      }
    }

    onUpdateEntity(entityId, mode, {
      changed_by: 'User Keypad',
      last_changed: 'Just now'
    });

    setPin('');
    setSuccessMessage(`Alarm state updated to ${mode.replace('_', ' ').toUpperCase()}`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const getStateBadge = () => {
    switch (currentState) {
      case 'armed_home':
        return {
          label: 'Armed (Home)',
          color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          icon: ShieldCheck,
          iconColor: 'text-emerald-400'
        };
      case 'armed_away':
        return {
          label: 'Armed (Away)',
          color: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          icon: ShieldWarning,
          iconColor: 'text-rose-400'
        };
      case 'armed_night':
        return {
          label: 'Armed (Night)',
          color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
          icon: Moon,
          iconColor: 'text-indigo-400'
        };
      case 'disarmed':
      default:
        return {
          label: 'Disarmed',
          color: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
          icon: LockOpen,
          iconColor: 'text-slate-400'
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
      subtitle={alarmEntity?.name || 'Homz Perimeter Security Guard'}
      icon={<Shield size={22} weight="duotone" className="text-indigo-400" />}
    >
      <div className="space-y-6">
        {/* Status Header */}
        <div className="p-5 rounded-3xl bg-linear-to-b from-slate-900 via-slate-900 to-slate-950 border border-white/10 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-lg ${badge.color}`}>
              <StateIcon size={32} weight="duotone" className={badge.iconColor} />
            </div>
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Security Mode</div>
              <div className="text-xl font-black text-white">{badge.label}</div>
            </div>
          </div>

          <span className={`text-[10px] font-extrabold uppercase px-3 py-1 rounded-full border shadow-sm ${badge.color}`}>
            Live Active
          </span>
        </div>

        {/* Mode Selector Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => handleSetMode('disarmed')}
            className={`p-3.5 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              currentState === 'disarmed'
                ? 'bg-slate-700/60 text-white border-slate-500 shadow-md ring-1 ring-white/20'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
          >
            <LockOpen size={16} weight="duotone" />
            <span>Disarm</span>
          </button>

          <button
            type="button"
            onClick={() => handleSetMode('armed_home')}
            className={`p-3.5 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              currentState === 'armed_home'
                ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
          >
            <ShieldCheck size={16} weight="duotone" />
            <span>Arm Home</span>
          </button>

          <button
            type="button"
            onClick={() => handleSetMode('armed_away')}
            className={`p-3.5 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              currentState === 'armed_away'
                ? 'bg-rose-500/25 text-rose-300 border-rose-500/50 shadow-md ring-1 ring-rose-500/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
          >
            <ShieldWarning size={16} weight="duotone" />
            <span>Arm Away</span>
          </button>

          <button
            type="button"
            onClick={() => handleSetMode('armed_night')}
            className={`p-3.5 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              currentState === 'armed_night'
                ? 'bg-indigo-500/25 text-indigo-300 border-indigo-500/50 shadow-md ring-1 ring-indigo-500/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
          >
            <Moon size={16} weight="duotone" />
            <span>Arm Night</span>
          </button>
        </div>

        {/* PIN Code Display */}
        <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
            Security Keypad PIN
          </div>
          <div className="flex items-center gap-3 my-2">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  pin.length > idx
                    ? 'bg-indigo-400 border-indigo-400 shadow-sm shadow-indigo-400/50 scale-110'
                    : 'bg-transparent border-slate-600'
                }`}
              />
            ))}
          </div>
          {errorMessage && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 mt-2">
              <WarningCircle size={14} weight="bold" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mt-2">
              <CheckCircle size={14} weight="bold" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Numeric Keypad Grid */}
        <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="h-12 rounded-2xl bg-white/5 hover:bg-white/15 active:bg-white/20 border border-white/10 text-lg font-bold text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm"
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-extrabold uppercase text-slate-400 hover:text-slate-200 flex items-center justify-center transition-all cursor-pointer active:scale-95"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-12 rounded-2xl bg-white/5 hover:bg-white/15 active:bg-white/20 border border-white/10 text-lg font-bold text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
          >
            <Backspace size={20} weight="duotone" />
          </button>
        </div>
      </div>
    </DetailsRightDrawer>
  );
}
