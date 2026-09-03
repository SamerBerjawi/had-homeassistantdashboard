/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Health Onboarding & Zero-Sensor Alert State
 * Provides step-by-step guidance on pairing Apple Health sensors
 * with Home Assistant via the official iOS Companion App, with an interactive
 * demo toggle to immediately preview the dashboard layout.
 */

import React from 'react';
import {
  Heartbeat,
  DeviceMobile,
  Gear,
  CheckCircle,
  ArrowClockwise,
  Eye,
} from '@phosphor-icons/react';
import { BorderBeam } from '../../ui/BorderBeam';

interface HealthOnboardingEmptyStateProps {
  onEnableDemo: () => void;
  onRefresh: () => void;
  darkMode?: boolean;
}

export const HealthOnboardingEmptyState: React.FC<HealthOnboardingEmptyStateProps> = ({
  onEnableDemo,
  onRefresh,
  darkMode = true,
}) => {
  const steps = [
    {
      icon: DeviceMobile,
      title: 'Open Home Assistant iOS App',
      description: 'Launch the official Home Assistant Companion App on your iPhone or iPad.',
    },
    {
      icon: Gear,
      title: 'Navigate to Sensor Settings',
      description: 'Go to App Settings → Companion App → Manage Sensors → Apple Health.',
    },
    {
      icon: CheckCircle,
      title: 'Enable Health Metrics',
      description: 'Toggle on Steps, Active Energy, Distance, Heart Rate, SpO2, and Body Weight.',
    },
  ];

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center p-4 sm:p-8 animate-fadeIn">
      <div
        className={`relative max-w-2xl w-full rounded-3xl border p-6 sm:p-8 backdrop-blur-2xl shadow-2xl ${
          darkMode
            ? 'bg-slate-900/70 border-white/10 text-white shadow-[0_16px_48px_rgba(0,0,0,0.5)]'
            : 'bg-white/90 border-slate-200 text-slate-900 shadow-slate-200'
        }`}
      >
        <BorderBeam
          colorFrom="#FF2D55"
          colorTo="#AF52DE"
          duration={12}
          borderWidth={1.5}
        />

        {/* Top Header Badge & Icon */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#FF2D55] to-[#AF52DE] text-white flex items-center justify-center shadow-[0_0_24px_rgba(255,45,85,0.4)] mb-4">
            <Heartbeat size={36} weight="fill" />
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FF2D55]/15 text-[#FF2D55] border border-[#FF2D55]/30 mb-2">
            Apple Health &amp; Vitals
          </span>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Connect Your Apple Health Telemetry
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md">
            No Apple Health companion sensors were detected in Home Assistant. Connect your iOS device to track steps, activity rings, heart rate, and vitals.
          </p>
        </div>

        {/* Step-by-Step Guide */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-6">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="flex flex-col items-center text-center p-4 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/10"
              >
                <div className="w-8 h-8 rounded-xl bg-[#FF2D55]/10 text-[#FF2D55] flex items-center justify-center mb-2">
                  <Icon size={18} weight="bold" />
                </div>
                <div className="text-[11px] font-bold text-slate-400 uppercase">Step {idx + 1}</div>
                <div className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">
                  {step.title}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {step.description}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onEnableDemo}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#FF2D55] to-[#AF52DE] hover:opacity-90 shadow-[0_4px_16px_rgba(255,45,85,0.3)] transition-all cursor-pointer"
          >
            <Eye size={16} weight="bold" />
            <span>Preview Demo Dashboard</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs border border-slate-200/80 dark:border-white/15 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
          >
            <ArrowClockwise size={16} weight="bold" />
            <span>Scan for Sensors</span>
          </button>
        </div>
      </div>
    </div>
  );
};
