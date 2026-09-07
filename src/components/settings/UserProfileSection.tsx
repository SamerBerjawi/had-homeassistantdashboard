/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * User Profile & Identity Subpage
 * Clean, mobile-optimized, zero-bulk layout matching ThemeCustomizationSection.
 */

import React, { useState } from 'react';
import {
  User,
  Lock,
  FloppyDisk,
  CheckCircle,
  HardDrives,
  SignOut,
  SignIn,
  DeviceMobile,
  CalendarBlank,
  Sparkle
} from '@phosphor-icons/react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserConfig } from '../../contexts/ConfigContext';
import { useHealthData } from '../../hooks/useHealthData';

interface UserProfileData {
  displayName: string;
  email: string;
  role: 'Administrator' | 'Resident' | 'Kiosk Operator';
  avatarInitials: string;
  homeName: string;
}

interface UserProfileSectionProps {
  darkMode: boolean;
  profileData: UserProfileData;
  setProfileData: React.Dispatch<React.SetStateAction<UserProfileData>>;
  handleSaveProfile: (e: React.FormEvent) => void;
  pinCode: string;
  setPinCode: (pin: string) => void;
  addToast?: (toast: any) => void;
  profileSavedNotice: boolean;
}

export default function UserProfileSection({
  darkMode,
  profileData,
  setProfileData,
  handleSaveProfile,
  pinCode,
  setPinCode,
  addToast,
  profileSavedNotice
}: UserProfileSectionProps) {
  const { authState, openAuthModal, logout } = useAuth();
  const { driverName, isSyncingRemote } = useUserConfig() as any;
  const { devices, selectedDeviceId, setSelectedDeviceId, timeRange, setTimeRange } = useHealthData();

  const [newPinInput, setNewPinInput] = useState('');
  const [isEditingPin, setIsEditingPin] = useState(false);

  const handleSavePin = () => {
    if (newPinInput.length === 4 && /^\d+$/.test(newPinInput)) {
      setPinCode(newPinInput);
      setNewPinInput('');
      setIsEditingPin(false);
      addToast?.({
        type: 'success',
        title: 'Kiosk PIN Updated',
        message: 'New 4-digit security PIN has been set.'
      });
    } else {
      addToast?.({
        type: 'warning',
        title: 'Invalid PIN',
        message: 'PIN must be exactly 4 digits.'
      });
    }
  };

  const handleClearPin = () => {
    setPinCode('');
    setIsEditingPin(false);
    addToast?.({
      type: 'info',
      title: 'PIN Removed',
      message: 'Kiosk lock PIN protection disabled.'
    });
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 sm:space-y-5 animate-in fade-in duration-200 px-1 sm:px-0">
      {/* 1. Account & Session Floating Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-white/60 dark:bg-black/25 backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-black text-base flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0">
            {authState.user?.name ? authState.user.name.charAt(0).toUpperCase() : profileData.avatarInitials || 'AM'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                {authState.user?.name || profileData.displayName}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                authState.isAuthenticated
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
              }`}>
                {authState.isAuthenticated ? (authState.isDemo ? 'Demo' : 'Online') : 'Guest'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="truncate">{authState.user?.username ? `@${authState.user.username}` : profileData.email}</span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                <HardDrives size={12} weight="duotone" className="text-sky-500" />
                {driverName || 'Local'}
              </span>
            </div>
          </div>
        </div>

        <div className="self-end sm:self-auto shrink-0">
          {authState.isAuthenticated && !authState.isDemo ? (
            <button
              type="button"
              onClick={() => logout()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold transition-all cursor-pointer"
            >
              <SignOut size={14} weight="bold" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-sm shadow-sky-500/20 transition-all cursor-pointer"
            >
              <SignIn size={14} weight="bold" />
              <span>Switch User</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Account Profile Form */}
      <form onSubmit={handleSaveProfile} className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Account Profile
          </span>
          {profileSavedNotice && (
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle size={13} weight="bold" /> Saved
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 px-0.5">
              Display Name
            </label>
            <input
              type="text"
              value={profileData.displayName}
              onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
              className="w-full h-10 px-3 rounded-xl bg-white/60 dark:bg-black/25 backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:border-sky-500 shadow-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 px-0.5">
              Email Address
            </label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              className="w-full h-10 px-3 rounded-xl bg-white/60 dark:bg-black/25 backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:border-sky-500 shadow-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 px-0.5">
              Access Role
            </label>
            <select
              value={profileData.role}
              onChange={(e) => setProfileData({ ...profileData, role: e.target.value as any })}
              className="w-full h-10 px-3 rounded-xl bg-white/60 dark:bg-black/25 backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:border-sky-500 shadow-xs"
            >
              <option value="Administrator">Administrator (Full Control)</option>
              <option value="Resident">Resident (Standard Controls)</option>
              <option value="Kiosk Operator">Kiosk Operator (Wall Display)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 px-0.5">
              Avatar Initials
            </label>
            <input
              type="text"
              maxLength={3}
              value={profileData.avatarInitials}
              onChange={(e) => setProfileData({ ...profileData, avatarInitials: e.target.value.toUpperCase() })}
              className="w-full h-10 px-3 rounded-xl bg-white/60 dark:bg-black/25 backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white text-xs font-mono font-bold uppercase focus:outline-hidden focus:border-sky-500 shadow-xs"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-sm shadow-sky-500/20 transition-all cursor-pointer active:scale-98"
        >
          <FloppyDisk size={15} weight="bold" />
          <span>Save Profile Details</span>
        </button>
      </form>

      {/* 3. Wall Tablet / Kiosk PIN Protection */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5">
            <Lock size={14} weight="duotone" className="text-amber-500" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Kiosk Security PIN
            </span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            pinCode
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-white/10'
          }`}>
            {pinCode ? 'PIN Active' : 'No PIN Set'}
          </span>
        </div>

        <div className="p-2.5 rounded-2xl bg-white/60 dark:bg-black/25 backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-xs">
          {isEditingPin ? (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="password"
                maxLength={4}
                placeholder="••••"
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                className="w-28 h-9 px-3 rounded-xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-center text-sm font-mono tracking-widest text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500 shadow-xs"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSavePin}
                className="h-9 px-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Save PIN
              </button>
              <button
                type="button"
                onClick={() => { setIsEditingPin(false); setNewPinInput(''); }}
                className="h-9 px-3 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {pinCode ? 'Protected by 4-digit lock' : 'Require PIN for settings & controls'}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditingPin(true)}
                  className="h-8 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  {pinCode ? 'Change' : 'Set PIN'}
                </button>
                {pinCode && (
                  <button
                    type="button"
                    onClick={handleClearPin}
                    className="h-8 px-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold transition-all cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Mobile Companion & Health Timeline */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5">
            <DeviceMobile size={14} weight="duotone" className="text-rose-500" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Health &amp; Companion Device
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {devices.length} {devices.length === 1 ? 'Device' : 'Devices'}
          </span>
        </div>

        {devices.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {devices.map((d) => {
              const isSelected = (selectedDeviceId || devices[0].deviceId) === d.deviceId;
              return (
                <button
                  key={d.deviceId}
                  type="button"
                  onClick={() => {
                    setSelectedDeviceId(d.deviceId);
                    addToast?.({
                      type: 'success',
                      title: 'Health Device Selected',
                      message: `Bound health telemetry to ${d.deviceName}.`
                    });
                  }}
                  className={`p-2.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-rose-500/10 border-rose-500/60 text-slate-900 dark:text-white'
                      : 'bg-white/60 dark:bg-black/25 backdrop-blur-md border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>
                      <DeviceMobile size={14} weight={isSelected ? 'fill' : 'bold'} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{d.deviceName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{d.sensorCount} Sensors</div>
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle size={16} weight="fill" className="text-rose-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-2.5 rounded-2xl bg-white/60 dark:bg-black/25 backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-xs text-slate-400 italic">
            No Companion App devices detected. Install Home Assistant on iOS to bind biometrics.
          </div>
        )}

        {/* Timeline Segmented Pill */}
        <div className="grid grid-cols-4 p-1 rounded-2xl bg-white/60 dark:bg-black/25 backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-xs gap-1 mt-2">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'Week' },
            { id: 'month', label: 'Month' },
            { id: 'year', label: 'Year' },
          ].map((range) => {
            const isSelected = timeRange === range.id;
            return (
              <button
                key={range.id}
                type="button"
                onClick={() => setTimeRange(range.id as any)}
                className={`h-8 sm:h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <span>{range.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
