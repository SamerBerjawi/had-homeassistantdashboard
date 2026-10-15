/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * One confirmation dialog for the app (UI-012). Replaces the near-duplicate confirm modals.
 * Dialog semantics, Escape, focus trap and focus restore come from useDialogA11y.
 */

import React, { useId, useState } from 'react';
import { CheckCircle, SpinnerGap, WarningCircle, X } from '@phosphor-icons/react';
import { useDialogA11y } from '../../hooks/useDialogA11y';

export type ConfirmTone = 'cyan' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate';

const CONFIRM_BUTTON: Record<ConfirmTone, string> = {
  cyan: 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/25',
  emerald: 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/25',
  amber: 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/25',
  rose: 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/25',
  indigo: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25',
  slate: 'bg-slate-700 hover:bg-slate-600 text-white shadow-slate-700/25'
};

const ICON_BOX: Record<ConfirmTone, string> = {
  cyan: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
  emerald: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
  amber: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
  rose: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
  indigo: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400',
  slate: 'bg-slate-500/15 border-slate-500/30 text-slate-400'
};

const ACCENT_STRIP: Record<ConfirmTone, string> = {
  cyan: 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400',
  emerald: 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400',
  amber: 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400',
  rose: 'bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500',
  indigo: 'bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400',
  slate: 'bg-gradient-to-r from-slate-500 via-slate-400 to-slate-300'
};

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  icon?: React.ReactNode;
  confirmIcon?: React.ReactNode;
  /** Small mono caption under the title, e.g. an entity name */
  subtitle?: string;
  darkMode?: boolean;
  /** Extra content between the description and the buttons */
  children?: React.ReactNode;
  /** Controlled loading state; the dialog also tracks its own while onConfirm runs */
  isLoading?: boolean;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'cyan',
  icon,
  confirmIcon,
  subtitle,
  darkMode = true,
  children,
  isLoading = false
}: ConfirmDialogProps) {
  const titleId = useId();
  const [busy, setBusy] = useState(false);
  const dialogRef = useDialogA11y({ open, onClose });
  if (!open) return null;
  const disabled = busy || isLoading;

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    try {
      await onConfirm();
    } catch (err) {
      console.error('[ConfirmDialog] Action failed:', err);
    } finally {
      setBusy(false);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col transition-all ${
          darkMode
            ? 'bg-slate-900/95 border-white/15 text-white shadow-black/80'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-300'
        }`}
      >
        <div className={`h-1.5 w-full ${ACCENT_STRIP[tone]}`} />

        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 shadow-lg ${ICON_BOX[tone]}`}>
                {icon || <WarningCircle size={24} weight="duotone" />}
              </div>
              <div>
                <h3 id={titleId} className="text-base sm:text-lg font-black tracking-tight">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-semibold truncate max-w-[240px]">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              disabled={disabled}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <X size={18} weight="bold" />
            </button>
          </div>

          {description && (
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{description}</div>
          )}
          {children}
        </div>

        <div className="p-4 sm:p-5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-end gap-2.5 bg-slate-100/50 dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={disabled}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black shadow-lg transition-all cursor-pointer disabled:opacity-50 ${CONFIRM_BUTTON[tone]}`}
          >
            {disabled ? (
              <SpinnerGap size={15} weight="bold" className="animate-spin" />
            ) : (
              confirmIcon || <CheckCircle size={15} weight="bold" />
            )}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
