/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Backup, Snapshots & Disaster Recovery Subpage
 * Clean, mobile-optimized, zero-bulk layout matching ThemeCustomizationSection.
 */

import React, { useRef } from 'react';
import {
  DownloadSimple,
  UploadSimple,
  Trash,
  Warning,
  HardDrives,
  Clock,
  FloppyDisk
} from '@phosphor-icons/react';

interface LocalSnapshot {
  id: string;
  name: string;
  timestamp: string;
  cardCount: number;
  profileCount: number;
  data: string;
}

interface BackupRestoreSectionProps {
  darkMode: boolean;
  snapshots: LocalSnapshot[];
  handleCreateSnapshot: () => void;
  snapshotNameInput: string;
  setSnapshotNameInput: (name: string) => void;
  handleRestoreSnapshot: (snap: LocalSnapshot) => void;
  handleDeleteSnapshot: (id: string) => void;
  handleExportSnapshot?: (snap: LocalSnapshot) => void;
  handleExportFullBackup: () => void;
  handleImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  showResetConfirm: boolean;
  setShowResetConfirm: (show: boolean) => void;
  handleFactoryReset: () => void;
}

export default function BackupRestoreSection({
  darkMode,
  snapshots,
  handleCreateSnapshot,
  snapshotNameInput,
  setSnapshotNameInput,
  handleRestoreSnapshot,
  handleDeleteSnapshot,
  handleExportSnapshot,
  handleExportFullBackup,
  handleImportFile,
  fileInputRef,
  showResetConfirm,
  setShowResetConfirm,
  handleFactoryReset
}: BackupRestoreSectionProps) {
  return (
    <div className="w-full max-w-xl mx-auto space-y-4 sm:space-y-5 animate-in fade-in duration-200 px-1 sm:px-0">
      {/* 1. Quick Backup & Restore Actions */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Configuration File Archive
          </span>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Full Backup JSON
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Export Button */}
          <button
            type="button"
            onClick={handleExportFullBackup}
            className="flex items-center justify-center gap-2 h-11 px-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-sm shadow-sky-500/20 transition-all cursor-pointer active:scale-98"
          >
            <DownloadSimple size={17} weight="bold" />
            <span>Download Backup (.json)</span>
          </button>

          {/* Import Button */}
          <label className="flex items-center justify-center gap-2 h-11 px-3.5 rounded-2xl bg-white/60 dark:bg-black/25 backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200 font-bold text-xs shadow-xs hover:border-sky-500/50 transition-all cursor-pointer active:scale-98">
            <UploadSimple size={17} weight="bold" className="text-sky-500" />
            <span>Restore from File</span>
            <input
              ref={fileInputRef as any}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 2. Local Browser Storage Snapshots */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Local Browser Snapshots
          </span>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {snapshots.length} {snapshots.length === 1 ? 'Snapshot' : 'Snapshots'}
          </span>
        </div>

        {/* Snapshot Creation Row */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="New snapshot title..."
            value={snapshotNameInput}
            onChange={(e) => setSnapshotNameInput(e.target.value)}
            className="flex-1 h-10 px-3 rounded-xl bg-white/60 dark:bg-black/25 backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:border-sky-500 shadow-xs"
          />
          <button
            type="button"
            onClick={handleCreateSnapshot}
            disabled={!snapshotNameInput.trim()}
            className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-sm shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
          >
            Create
          </button>
        </div>

        {/* Snapshots List */}
        {snapshots.length === 0 ? (
          <div className="p-3.5 rounded-2xl bg-white/40 dark:bg-black/20 border border-dashed border-slate-300 dark:border-white/10 text-center text-xs text-slate-400">
            No local snapshots created yet.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-56 overflow-y-auto touch-scroll-container pr-0.5">
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                className="p-2.5 rounded-xl bg-white/60 dark:bg-black/25 backdrop-blur-md border border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-2 shadow-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {snap.name}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 truncate">
                    {snap.timestamp} • {snap.profileCount} profiles
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRestoreSnapshot(snap)}
                    className="h-7 px-2.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-700 dark:text-sky-300 font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    Restore
                  </button>
                  {handleExportSnapshot && (
                    <button
                      type="button"
                      onClick={() => handleExportSnapshot(snap)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
                      title="Download JSON"
                    >
                      <DownloadSimple size={13} weight="bold" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteSnapshot(snap.id)}
                    className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center cursor-pointer transition-colors"
                    title="Delete"
                  >
                    <Trash size={13} weight="duotone" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Factory Reset Zone */}
      <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Warning size={18} weight="duotone" className="text-rose-500 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-bold text-rose-700 dark:text-rose-300 truncate">
              Factory Reset Dashboard
            </div>
            <div className="text-[10px] text-rose-600/80 dark:text-rose-300/70 truncate">
              Wipe custom canvas and restore defaults
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="h-8 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0 active:scale-98"
        >
          Reset
        </button>
      </div>

      {/* Confirmation Modal for Reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 p-5 shadow-2xl space-y-3.5 text-center">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <Warning size={24} weight="duotone" />
            </div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white">Reset Dashboard Defaults?</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              This will clear all custom canvas profiles, cards, and custom configurations to factory defaults.
            </p>
            <div className="flex justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="h-9 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFactoryReset}
                className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
