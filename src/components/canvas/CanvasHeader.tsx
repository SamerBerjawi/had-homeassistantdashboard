/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, 
  Lock, 
  LockOpen, 
  CloudSun, 
  Sun, 
  CloudRain, 
  Cloud, 
  Lightning, 
  Snowflake, 
  Moon, 
  Faders, 
  Stack, 
  CaretDown, 
  DownloadSimple, 
  UploadSimple, 
  ArrowCounterClockwise, 
  ShieldCheck, 
  Sparkle, 
  PencilSimple,
  Trash
} from '@phosphor-icons/react';
import { DashboardProfile, WeatherBackdropType } from '../../types/canvas';

interface CanvasHeaderProps {
  profiles: Record<string, DashboardProfile>;
  activeProfileId: string;
  isEditMode: boolean;
  isLocked: boolean;
  hasPinSet: boolean;
  weatherBackdrop: WeatherBackdropType;
  cardCount: number;
  onSelectProfile: (id: string) => void;
  onCreateProfile: (name: string) => void;
  onDeleteProfile: (id: string) => void;
  onToggleEditMode: () => void;
  onOpenPinModal: (mode?: 'unlock' | 'set_pin' | 'remove_pin') => void;
  onSelectWeatherBackdrop: (type: WeatherBackdropType) => void;
  onOpenCatalog: () => void;
  onResetDefaults: () => void;
  onExportJson: () => void;
  onImportJson: (json: string) => void;
}

const WEATHER_OPTIONS: { id: WeatherBackdropType; label: string; icon: any }[] = [
  { id: 'auto', label: 'Auto (Hass Entity)', icon: Sparkle },
  { id: 'sunny', label: 'Sunny Day', icon: Sun },
  { id: 'partly-cloudy', label: 'Partly Cloudy', icon: CloudSun },
  { id: 'cloudy', label: 'Overcast Clouds', icon: Cloud },
  { id: 'rain', label: 'Rain Streaks', icon: CloudRain },
  { id: 'storm', label: 'Thunderstorm', icon: Lightning },
  { id: 'snow', label: 'Snowfall', icon: Snowflake },
  { id: 'starry-night', label: 'Starry Night', icon: Moon }
];

export default function CanvasHeader({
  profiles,
  activeProfileId,
  isEditMode,
  isLocked,
  hasPinSet,
  weatherBackdrop,
  cardCount,
  onSelectProfile,
  onCreateProfile,
  onDeleteProfile,
  onToggleEditMode,
  onOpenPinModal,
  onSelectWeatherBackdrop,
  onOpenCatalog,
  onResetDefaults,
  onExportJson,
  onImportJson
}: CanvasHeaderProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showWeatherMenu, setShowWeatherMenu] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  const activeProfile = profiles[activeProfileId] || { name: 'Tunet Canvas' };

  const handleCreate = () => {
    if (newProfileName.trim()) {
      onCreateProfile(newProfileName.trim());
      setNewProfileName('');
      setIsCreatingProfile(false);
      setShowProfileMenu(false);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) onImportJson(text);
      };
      reader.readAsText(file);
    }
  };

  return (
    <header className="relative z-20 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      {/* Left: Profile Switcher & Dashboard Title */}
      <div className="flex items-center gap-3">
        {/* Profile Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white backdrop-blur-xl shadow-lg transition-all cursor-pointer group"
          >
            <Stack size={18} weight="duotone" className="text-[#9D8BFF] shrink-0" />
            <span className="text-sm font-extrabold tracking-tight">{activeProfile.name}</span>
            <CaretDown size={14} weight="bold" className="text-slate-400 group-hover:text-white transition-transform duration-200" />
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <>
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setShowProfileMenu(false)} 
              />
              <div className="absolute top-full left-0 mt-2 w-72 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-white/20 p-2.5 shadow-2xl z-40 text-white space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 px-2 py-1 block">
                  Dashboard Profiles
                </span>

                {Object.values(profiles).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectProfile(p.id);
                      setShowProfileMenu(false);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                      p.id === activeProfileId
                        ? 'bg-indigo-600/30 border border-indigo-500/40 text-white font-bold'
                        : 'hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs truncate">{p.name}</span>
                    </div>
                    {Object.keys(profiles).length > 1 && p.id !== 'profile_main' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteProfile(p.id);
                        }}
                        className="w-6 h-6 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-white/15 transition-colors"
                        title="Delete profile"
                      >
                        <Trash size={13} weight="duotone" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Create Profile Section */}
                <div className="pt-2 border-t border-white/10">
                  {isCreatingProfile ? (
                    <div className="flex items-center gap-2 p-1">
                      <input
                        type="text"
                        placeholder="Profile Name..."
                        value={newProfileName}
                        onChange={(e) => setNewProfileName(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={handleCreate}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl text-white cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsCreatingProfile(true)}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-indigo-300 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <Plus size={14} weight="duotone" />
                      <span>Create New Profile</span>
                    </button>
                  )}
                </div>

                {/* Import / Export & Reset actions */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <button
                    onClick={onExportJson}
                    className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer p-1"
                    title="Export profiles JSON"
                  >
                    <DownloadSimple size={13} weight="duotone" /> Export
                  </button>

                  <label className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer p-1">
                    <UploadSimple size={13} weight="duotone" /> Import
                    <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                  </label>

                  <button
                    onClick={onResetDefaults}
                    className="flex items-center gap-1 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer p-1"
                    title="Reset to default profiles"
                  >
                    <ArrowCounterClockwise size={13} weight="duotone" /> Reset
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Card Counter Badge */}
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400 font-mono">
          <strong className="text-white">{cardCount}</strong> Cards Active
        </span>
      </div>

      {/* Right Toolbar: Weather Backdrop Switcher, Kiosk/Edit Mode Toggle, Add Card */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Weather Backdrop Picker */}
        <div className="relative">
          <button
            onClick={() => setShowWeatherMenu(!showWeatherMenu)}
            className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white backdrop-blur-xl shadow-lg transition-all cursor-pointer text-xs font-bold"
            title="Choose Animated Weather Backdrop"
          >
            <CloudSun size={16} weight="duotone" className="text-amber-400" />
            <span className="capitalize hidden sm:inline">
              {weatherBackdrop.replace('-', ' ')}
            </span>
            <CaretDown size={13} weight="bold" className="text-slate-400" />
          </button>

          {showWeatherMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowWeatherMenu(false)} />
              <div className="absolute top-full right-0 mt-2 w-56 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-white/20 p-2 shadow-2xl z-40 text-white space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 px-2 py-1 block">
                  Atmospheric Backdrops
                </span>
                {WEATHER_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = weatherBackdrop === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        onSelectWeatherBackdrop(opt.id);
                        setShowWeatherMenu(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      <Icon size={16} weight="duotone" className={isSelected ? 'text-white' : 'text-slate-400'} />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* PIN Security Settings button */}
        <button
          onClick={() => onOpenPinModal(hasPinSet ? 'remove_pin' : 'set_pin')}
          className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer backdrop-blur-xl ${
            hasPinSet
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-white/10 border-white/15 text-slate-400 hover:text-white'
          }`}
          title={hasPinSet ? '4-Digit PIN Lock Enabled (Click to change/remove)' : 'Configure PIN Lock for Kiosk mode'}
        >
          <ShieldCheck size={18} weight="duotone" />
        </button>

        {/* Edit Mode vs Kiosk Mode Toggle */}
        <button
          onClick={onToggleEditMode}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border font-bold text-xs transition-all cursor-pointer shadow-lg backdrop-blur-xl ${
            isEditMode
              ? 'bg-amber-500 hover:bg-amber-400 text-black border-amber-400 shadow-amber-500/25 scale-105'
              : 'bg-white/10 hover:bg-white/15 border-white/20 text-white'
          }`}
        >
          {isEditMode ? <LockOpen size={16} weight="duotone" /> : <Lock size={16} weight="duotone" />}
          <span>{isEditMode ? 'Editing Canvas' : 'Locked Kiosk'}</span>
        </button>

        {/* Floating / Toolbar + Add Card Button */}
        <button
          onClick={onOpenCatalog}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer hover:scale-105"
        >
          <Plus size={16} weight="bold" />
          <span>Add Card</span>
        </button>
      </div>
    </header>
  );
}
