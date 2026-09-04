/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * User Profile & Identity Subpage
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  User,
  ShieldCheck,
  Key,
  Lock,
  LockOpen,
  FloppyDisk,
  CheckCircle,
  HardDrives,
  Sparkle,
  IdentificationCard,
  SignOut,
  SignIn,
  DeviceMobile,
  CalendarBlank
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
  const { driverType, driverName, isSyncingRemote, configLastSaved, isConfigSaving } = useUserConfig() as any;
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
    <div className="space-y-6 w-full animate-in fade-in duration-300 pb-24 md:pb-6">
      {/* Account & Storage Synchronization Status Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white/20 dark:bg-black/20 backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)] space-y-4 overflow-hidden isolate">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-linear-to-tr from-sky-500 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
              {authState.user?.name ? authState.user.name.charAt(0).toUpperCase() : profileData.avatarInitials || 'AM'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  {authState.user?.name || profileData.displayName}
                </h4>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  authState.isAuthenticated
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                }`}>
                  {authState.isAuthenticated ? (authState.isDemo ? 'Demo Mode' : 'Authenticated') : 'Guest Session'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">
                {authState.user?.username ? `@${authState.user.username}` : profileData.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {authState.isAuthenticated && !authState.isDemo ? (
              <button
                type="button"
                onClick={() => logout()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold transition-all cursor-pointer"
              >
                <SignOut size={14} weight="bold" />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all cursor-pointer"
              >
                <SignIn size={14} weight="bold" />
                <span>Sign In / Switch User</span>
              </button>
            )}
          </div>
        </div>

        {/* Cloud/Local Storage Driver Pill */}
        <div className="pt-3 border-t border-slate-200/80 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <HardDrives size={16} weight="duotone" className="text-sky-500" />
            <span className="text-slate-500 dark:text-slate-400">Settings Storage Engine:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{driverName || 'Isolated LocalStorage'}</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
            {isSyncingRemote ? (
              <span className="text-sky-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
                Syncing with server...
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle size={13} weight="bold" />
                Synced
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Profile Edit Form */}
      <form onSubmit={handleSaveProfile} className="p-5 sm:p-6 rounded-3xl bg-white/20 dark:bg-black/20 backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)] space-y-4 overflow-hidden isolate">
        <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-white/10">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Account Profile Information
          </h4>
          {profileSavedNotice && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-pulse">
              <CheckCircle size={14} weight="bold" /> Profile Saved
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Display Name</label>
            <input
              type="text"
              value={profileData.displayName}
              onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:border-sky-500 shadow-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Address</label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:border-sky-500 shadow-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Role / Access Level</label>
            <select
              value={profileData.role}
              onChange={(e) => setProfileData({ ...profileData, role: e.target.value as any })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:border-sky-500 shadow-xs"
            >
              <option value="Administrator">Administrator (Full Control)</option>
              <option value="Resident">Resident (Standard Controls)</option>
              <option value="Kiosk Operator">Kiosk Operator (Wall Display)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Avatar Initials</label>
            <input
              type="text"
              maxLength={3}
              value={profileData.avatarInitials}
              onChange={(e) => setProfileData({ ...profileData, avatarInitials: e.target.value.toUpperCase() })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-xs font-mono font-bold uppercase focus:outline-hidden focus:border-sky-500 shadow-xs"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all cursor-pointer"
          >
            <FloppyDisk size={16} weight="bold" />
            <span>Save Profile Info</span>
          </button>
        </div>
      </form>

      {/* Wall Display / Kiosk PIN Security Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white/20 dark:bg-black/20 backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)] space-y-4 overflow-hidden isolate">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Lock size={20} weight="duotone" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Wall Display & Kiosk Security PIN
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Protect sensitive controls and settings when dashboard runs on a wall tablet in Kiosk mode.
              </p>
            </div>
          </div>

          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
            pinCode
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-white/10'
          }`}>
            {pinCode ? 'PIN Active' : 'No PIN Set'}
          </span>
        </div>

        {isEditingPin ? (
          <div className="p-4 rounded-2xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 space-y-3">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Enter 4-Digit Security PIN
            </label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                maxLength={4}
                placeholder="••••"
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                className="w-32 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-black/60 border border-slate-300 dark:border-white/15 text-center text-lg font-mono tracking-widest text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500 shadow-xs"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSavePin}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Save PIN
              </button>
              <button
                type="button"
                onClick={() => { setIsEditingPin(false); setNewPinInput(''); }}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditingPin(true)}
              className="px-4 py-2 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 border border-slate-200 dark:border-white/15 text-slate-800 dark:text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              {pinCode ? 'Change 4-Digit PIN' : 'Set 4-Digit Security PIN'}
            </button>
            {pinCode && (
              <button
                type="button"
                onClick={handleClearPin}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold transition-all cursor-pointer"
              >
                Remove PIN
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mobile Companion App & Health Device Selection Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white/20 dark:bg-black/20 backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)] space-y-4 overflow-hidden isolate">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-[#FF2D55] border border-rose-500/30 flex items-center justify-center shrink-0">
              <DeviceMobile size={20} weight="duotone" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Mobile Companion &amp; Apple Health Device
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select your primary mobile device running the Home Assistant Companion App for biometrics and health telemetry.
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-[#FF2D55] border border-rose-500/30">
            {devices.length} Mobile {devices.length === 1 ? 'Device' : 'Devices'} Detected
          </span>
        </div>

        <div className="pt-2">
          {devices.length > 0 ? (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Active Health Device
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          message: `Bound health biometrics to ${d.deviceName}.`
                        });
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-[#FF2D55]/10 border-[#FF2D55] ring-2 ring-[#FF2D55]/20 text-slate-900 dark:text-white'
                          : 'bg-white/50 dark:bg-black/40 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? 'bg-[#FF2D55] text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>
                          <DeviceMobile size={16} weight={isSelected ? 'fill' : 'bold'} />
                        </div>
                        <div>
                          <div className="text-xs font-bold">{d.deviceName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{d.sensorCount} Health Sensors</div>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle size={18} weight="fill" className="text-[#FF2D55] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              No mobile companion app devices currently exposing Apple Health sensors. Install the Home Assistant Companion App on iOS to automatically link biometric sensors.
            </p>
          )}
        </div>

        {/* Health Telemetry Timeline Filter */}
        <div className="pt-3 border-t border-slate-200/80 dark:border-white/5 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <div className="flex items-center gap-2">
              <CalendarBlank size={16} weight="duotone" className="text-[#FF2D55]" />
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Default Health Telemetry Timeline
              </label>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Active analysis window for charts &amp; stats
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'year', label: 'This Year' },
            ].map((range) => {
              const isSelected = timeRange === range.id;
              return (
                <button
                  key={range.id}
                  type="button"
                  onClick={() => {
                    setTimeRange(range.id as any);
                    addToast?.({
                      type: 'success',
                      title: 'Health Timeline Updated',
                      message: `Set default health telemetry window to ${range.label}.`
                    });
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center cursor-pointer border ${
                    isSelected
                      ? 'bg-linear-to-r from-[#FF2D55] to-[#FF5E3A] text-white border-transparent shadow-sm'
                      : 'bg-white/50 dark:bg-black/40 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  {range.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
