/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Backup, Snapshots & Disaster Recovery Subpage
 */

import React, { useState, useRef } from 'react';
import {
  DownloadSimple,
  UploadSimple,
  Trash,
  Warning,
  Clock,
  HardDrives,
  CheckCircle,
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
    <div className="space-y-6 w-full animate-in fade-in duration-300 pb-24 md:pb-6">
      {/* Primary Export & Import Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="p-6 rounded-3xl bg-white/20 dark:bg-black/20 backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)] space-y-4 flex flex-col justify-between overflow-hidden isolate">
          <div>
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-500 flex items-center justify-center mb-3">
              <DownloadSimple size={22} weight="duotone" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Export Full Configuration JSON
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Download a comprehensive backup archive containing all customized canvas profiles, cards, room structures, visibility preferences, and units.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportFullBackup}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all cursor-pointer"
          >
            <DownloadSimple size={16} weight="bold" />
            <span>Download Backup Archive (.json)</span>
          </button>
        </div>

        <div className="p-6 rounded-3xl bg-white/20 dark:bg-black/20 backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)] space-y-4 flex flex-col justify-between overflow-hidden isolate">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center mb-3">
              <UploadSimple size={22} weight="duotone" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Restore from Backup File
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Upload an existing backup JSON file to seamlessly restore dashboard profiles, entity assignments, and settings.
            </p>
          </div>
          <label className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/15 dark:text-white font-bold text-xs transition-all cursor-pointer">
            <UploadSimple size={16} weight="bold" />
            <span>Select Backup JSON File</span>
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

      {/* Local Storage Snapshots Manager */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white/20 dark:bg-black/20 backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)] space-y-4 overflow-hidden isolate">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-slate-200 dark:border-white/10">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Local Browser Snapshots ({snapshots.length})
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Create instant rollback points cached in local browser storage.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Snapshot name..."
              value={snapshotNameInput}
              onChange={(e) => setSnapshotNameInput(e.target.value)}
              className="flex-1 sm:w-60 px-3.5 py-2 rounded-xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:border-sky-500 shadow-xs"
            />
            <button
              type="button"
              onClick={handleCreateSnapshot}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all cursor-pointer shrink-0 shadow-sm"
            >
              Take Snapshot
            </button>
          </div>
        </div>

        {snapshots.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl">
            No local snapshots stored yet. Enter a name and click "Take Snapshot" above to create an instant rollback point.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-72 overflow-y-auto touch-scroll-container pr-1">
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                className="p-3.5 rounded-2xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 shadow-xs"
              >
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">{snap.name}</h5>
                  <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                    {snap.timestamp} • {snap.cardCount} cards • {snap.profileCount} profiles
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRestoreSnapshot(snap)}
                    className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-700 dark:text-sky-300 border border-sky-400/30 text-xs font-bold cursor-pointer transition-colors"
                  >
                    Restore
                  </button>
                  {handleExportSnapshot && (
                    <button
                      type="button"
                      onClick={() => handleExportSnapshot(snap)}
                      className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-sky-50 text-slate-500 hover:text-sky-600 dark:bg-white/5 dark:hover:bg-sky-500/20 dark:text-slate-400 dark:hover:text-sky-400 border border-slate-200 dark:border-white/10 flex items-center justify-center cursor-pointer transition-colors"
                      title="Download snapshot as JSON"
                    >
                      <DownloadSimple size={14} weight="bold" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteSnapshot(snap.id)}
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 dark:bg-white/5 dark:hover:bg-rose-500/20 dark:text-slate-400 dark:hover:text-rose-400 border border-slate-200 dark:border-white/10 flex items-center justify-center cursor-pointer transition-colors"
                    title="Delete snapshot"
                  >
                    <Trash size={14} weight="duotone" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Factory Reset Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-rose-500/10 backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 overflow-hidden isolate">
        <div>
          <h4 className="text-sm font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <Warning size={18} weight="duotone" /> Factory Reset Dashboard
          </h4>
          <p className="text-xs text-rose-800/80 dark:text-rose-200/70 mt-1">
            Clear all custom profiles, canvas layouts, and room customizations, restoring standard Home Assistant default configuration.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer shrink-0"
        >
          Reset Defaults
        </button>
      </div>

      {/* Confirmation Modal for Reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <Warning size={28} weight="duotone" />
            </div>
            <h4 className="text-base font-black text-slate-900 dark:text-white">Reset Dashboard Defaults?</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              This will reset all custom canvas profiles, cards, and custom configurations to factory defaults.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFactoryReset}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md cursor-pointer"
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
