/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Centralized Settings & Account Modal Dialog
 * Displays Active User Details, Auth Method, Live Sync Status Badge, and Configuration Backup/Restore
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  ShieldCheck, 
  Key, 
  ArrowsClockwise, 
  DownloadSimple, 
  UploadSimple, 
  SignOut, 
  SignIn, 
  CheckCircle, 
  HardDrives, 
  Sparkle, 
  DeviceMobile, 
  X,
  ArrowCounterClockwise,
  FloppyDisk,
  Check
} from '@phosphor-icons/react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserConfig } from '../../contexts/ConfigContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

export default function SettingsModal({ isOpen, onClose, darkMode = true }: SettingsModalProps) {
  const { authState, logout, openAuthModal } = useAuth();
  const { 
    config, 
    driverType, 
    driverName, 
    isSyncingRemote, 
    isSaving, 
    lastSaved, 
    exportConfigJson, 
    importConfigJson, 
    resetConfig 
  } = useUserConfig();

  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [resetConfirm, setResetConfirm] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportBackup = () => {
    const jsonStr = exportConfigJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `homz_config_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const success = await importConfigJson(text);
      if (success) {
        setImportStatus('success');
        setTimeout(() => setImportStatus('idle'), 3000);
      } else {
        setImportStatus('error');
        setTimeout(() => setImportStatus('idle'), 3000);
      }
    } catch {
      setImportStatus('error');
      setTimeout(() => setImportStatus('idle'), 3000);
    }
  };

  const handleReset = async () => {
    await resetConfig();
    setResetConfirm(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto backdrop-blur-xl bg-slate-950/70">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900/95 dark:bg-slate-900/95 text-white shadow-2xl p-6 sm:p-8 backdrop-blur-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
                <ShieldCheck size={22} weight="duotone" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  Account & Storage Synchronization
                </h2>
                <p className="text-xs text-slate-400">
                  Environment-aware configuration persistence and credential controls
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X size={20} weight="bold" />
            </button>
          </div>

          <div className="space-y-6 pt-5">
            {/* 1. Account Details Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500/30 to-blue-600/30 border border-sky-400/30 text-sky-300 flex items-center justify-center text-lg font-black shrink-0">
                    {authState.user?.name ? authState.user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm sm:text-base font-bold text-white">
                        {authState.user?.name || (authState.isDemo ? 'Demo Guest User' : 'Home Assistant User')}
                      </h4>
                      {authState.user?.isOwner && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Owner
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono truncate max-w-xs sm:max-w-md">
                      {authState.haUrl || (authState.isDemo ? 'Local Browser Sandbox' : 'Home Assistant Core')}
                    </p>
                  </div>
                </div>

                {/* Connection Method Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300">
                  {authState.authMethod === 'oauth' && (
                    <>
                      <Key size={14} weight="fill" className="text-sky-400" />
                      <span>OAuth2 Redirect</span>
                    </>
                  )}
                  {authState.authMethod === 'llat' && (
                    <>
                      <DeviceMobile size={14} weight="fill" className="text-cyan-400" />
                      <span>Long-Lived Access Token</span>
                    </>
                  )}
                  {authState.isDemo && (
                    <>
                      <Sparkle size={14} weight="fill" className="text-amber-400" />
                      <span>Demo Mode Sandbox</span>
                    </>
                  )}
                </div>
              </div>

              {/* Live Backend Storage Indicator */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-2.5 w-2.5 relative shrink-0">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isSyncingRemote ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}></span>
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      isSyncingRemote ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}></span>
                  </span>
                  <div className="truncate">
                    {isSyncingRemote ? (
                      <span className="text-emerald-300 font-bold">
                        🟢 Sync: Connected to Home Assistant & NAS Storage (Cross-device active)
                      </span>
                    ) : (
                      <span className="text-amber-300 font-bold">
                        🟡 Sync: Isolated Local Storage (Demo Mode)
                      </span>
                    )}
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Driver: <code className="text-slate-300">{driverName}</code> • Last Saved: {lastSaved ? new Date(lastSaved).toLocaleTimeString() : 'Just now'}
                    </div>
                  </div>
                </div>

                {isSaving && (
                  <span className="flex items-center gap-1.5 text-xs text-sky-400 font-medium shrink-0">
                    <ArrowsClockwise size={14} className="animate-spin" />
                    <span>Syncing...</span>
                  </span>
                )}
              </div>
            </div>

            {/* 2. Configuration Backup & Restore */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3.5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Dashboard Configuration Management
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Export your vehicle images, room sort orders, and theme preferences to JSON, or restore from a backup.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Backup JSON */}
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <DownloadSimple size={16} weight="bold" className="text-sky-400" />
                  <span>Backup Configuration (JSON)</span>
                </button>

                {/* Import JSON */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <UploadSimple size={16} weight="bold" className="text-cyan-400" />
                  <span>Import Configuration (JSON)</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json"
                  className="hidden"
                />
              </div>

              {/* Status Notice */}
              {importStatus === 'success' && (
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle size={16} weight="fill" />
                  <span>Configuration imported and synchronized successfully!</span>
                </div>
              )}
              {importStatus === 'error' && (
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <X size={16} weight="bold" />
                  <span>Invalid JSON backup file. Please check file formatting.</span>
                </div>
              )}
            </div>

            {/* 3. Account Actions */}
            <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
              {authState.isDemo ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openAuthModal();
                  }}
                  className="py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/20 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                >
                  <SignIn size={16} weight="bold" />
                  <span>Switch to Live HA Account</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    logout();
                  }}
                  className="py-2.5 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 hover:text-rose-300 font-bold text-xs transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  <SignOut size={16} weight="bold" />
                  <span>Sign Out</span>
                </button>
              )}

              {/* Reset to Defaults */}
              {resetConfirm ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="py-2 px-3 rounded-xl bg-rose-600 text-white font-bold text-xs active:scale-95 transition-all cursor-pointer"
                  >
                    Confirm Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetConfirm(false)}
                    className="py-2 px-3 rounded-xl bg-white/10 text-slate-300 text-xs active:scale-95 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setResetConfirm(true)}
                  className="py-2.5 px-3 rounded-xl text-slate-400 hover:text-slate-200 text-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowCounterClockwise size={14} />
                  <span>Reset Config to Defaults</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
