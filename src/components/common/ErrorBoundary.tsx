/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo } from 'react';
import { WarningCircle, ArrowsClockwise } from '@phosphor-icons/react';

interface Props {
  children: React.ReactNode;
  /**
   * view: full-page panel with retry/reload; card: compact tile-sized panel with retry;
   * silent: render nothing (for optional chrome such as header sentences and drawers).
   */
  variant?: 'view' | 'card' | 'silent';
  /** Shown in logs and the fallback to identify what failed. */
  label?: string;
  /** The boundary resets when any of these change (e.g. the active tab). */
  resetKeys?: unknown[];
}

interface State {
  error: Error | null;
}

/**
 * Contains a rendering error to the part of the dashboard that threw, so one broken card or
 * page doesn't replace the whole wall display with the root error screen.
 */
export default class ErrorBoundary extends Component<Props, State> {
  public state: State = { error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? `: ${this.props.label}` : ''}]`, error, errorInfo.componentStack);
  }

  public componentDidUpdate(prevProps: Props) {
    if (!this.state.error) return;
    const prevKeys = prevProps.resetKeys || [];
    const nextKeys = this.props.resetKeys || [];
    if (prevKeys.length !== nextKeys.length || prevKeys.some((key, i) => !Object.is(key, nextKeys[i]))) {
      this.setState({ error: null });
    }
  }

  private handleRetry = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    this.setState({ error: null });
  };

  public render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const { variant = 'card', label } = this.props;

    if (variant === 'silent') return null;

    if (variant === 'card') {
      return (
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full h-full min-h-[88px] rounded-3xl border border-rose-500/25 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md shadow-xs flex flex-col items-center justify-center gap-2 p-3 text-center"
        >
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs font-semibold">
            <WarningCircle size={18} weight="duotone" className="text-rose-500 dark:text-rose-400 shrink-0" />
            <span>{label ? `${label} couldn't load` : "This card couldn't load"}</span>
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 transition-colors cursor-pointer"
          >
            <ArrowsClockwise size={12} weight="bold" />
            Retry
          </button>
        </div>
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <div className="max-w-sm w-full p-6 rounded-3xl bg-white/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-xl text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 dark:text-rose-400">
            <WarningCircle size={28} weight="duotone" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {label ? `${label} hit an error` : 'This page hit an error'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed break-words">
              {error.message || 'An unexpected rendering error occurred.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs transition-all active:scale-95 cursor-pointer"
            >
              <ArrowsClockwise size={14} weight="bold" />
              Retry
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="py-2 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold text-xs transition-all active:scale-95 cursor-pointer"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
