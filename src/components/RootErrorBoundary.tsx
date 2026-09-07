/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo } from 'react';
import { WarningCircle, ArrowsClockwise, Trash, Sparkle } from '@phosphor-icons/react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class RootErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[RootErrorBoundary] Caught uncaught application error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleEnterDemo = () => {
    try {
      localStorage.setItem('had_auth_config', JSON.stringify({
        authMethod: 'demo',
        savedAt: Date.now()
      }));
      localStorage.removeItem('ha_token');
      localStorage.setItem('ha_live_mode', 'false');
    } catch {}
    window.location.href = '/';
  };

  private handleClearCacheAndReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 bg-slate-950 text-white font-sans select-none">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-white/[0.04] border border-white/10 shadow-2xl backdrop-blur-xl text-center space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <WarningCircle size={32} weight="duotone" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-white">Dashboard Encountered an Error</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                {this.state.error?.message || 'An unexpected rendering error occurred. You can reload or enter demo mode.'}
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-all active:scale-95 shadow-md cursor-pointer"
              >
                <ArrowsClockwise size={15} weight="bold" />
                <span>Reload Dashboard</span>
              </button>

              <button
                type="button"
                onClick={this.handleEnterDemo}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/10 transition-all active:scale-95 cursor-pointer"
              >
                <Sparkle size={15} weight="fill" className="text-amber-400" />
                <span>Open in Demo Mode</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearCacheAndReset}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-transparent hover:bg-rose-500/10 text-rose-400 font-medium text-xs transition-all active:scale-95 cursor-pointer"
              >
                <Trash size={14} />
                <span>Reset Stored Cache & Re-login</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
