/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, WarningCircle, CheckCircle, SpinnerGap } from '@phosphor-icons/react';

interface ActionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmText: string;
  confirmColor?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate';
  icon?: React.ReactNode;
  entityName?: string;
  darkMode?: boolean;
  isLoading?: boolean;
}

export function ActionConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  confirmColor = 'cyan',
  icon,
  entityName,
  darkMode = true,
  isLoading = false
}: ActionConfirmModalProps) {
  if (!isOpen) return null;

  const colorStyles = {
    cyan: 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/25',
    emerald: 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/25',
    amber: 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/25',
    rose: 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/25',
    indigo: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25',
    slate: 'bg-slate-700 hover:bg-slate-600 text-white shadow-slate-700/25'
  }[confirmColor];

  const iconBgStyles = {
    cyan: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
    emerald: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    amber: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
    rose: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
    indigo: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400',
    slate: 'bg-slate-500/15 border-slate-500/30 text-slate-400'
  }[confirmColor];

  const handleConfirmClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await onConfirm();
    } catch (err) {
      console.error('Action error in modal:', err);
    } finally {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col transition-all ${
          darkMode
            ? 'bg-slate-900/95 border-white/15 text-white shadow-black/80'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-300'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Accent Strip */}
        <div
          className={`h-1.5 w-full ${
            confirmColor === 'emerald'
              ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400'
              : confirmColor === 'rose'
              ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500'
              : confirmColor === 'amber'
              ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400'
              : 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400'
          }`}
        />

        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 shadow-lg ${iconBgStyles}`}>
                {icon || <WarningCircle size={24} weight="duotone" />}
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-black tracking-tight">{title}</h3>
                {entityName && (
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-semibold truncate max-w-[240px]">
                    {entityName}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <X size={18} weight="bold" />
            </button>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="p-4 sm:p-5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-end gap-2.5 bg-slate-100/50 dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={isLoading}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black shadow-lg transition-all cursor-pointer disabled:opacity-50 ${colorStyles}`}
          >
            {isLoading ? (
              <SpinnerGap size={15} weight="bold" className="animate-spin" />
            ) : (
              <CheckCircle size={15} weight="bold" />
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
