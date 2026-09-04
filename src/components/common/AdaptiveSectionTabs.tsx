/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AdaptiveSectionTabs Component
 * Responsive sub-view tab switcher with smooth horizontal touch scrolling,
 * clean floating pill styling (no unnecessary gray container), and strong light/dark mode contrast.
 */

import React from 'react';

export interface SectionTabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<any> | React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
  activeColor?: string;
}

export interface AdaptiveSectionTabsProps {
  tabs: SectionTabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  layoutId?: string;
  darkMode?: boolean;
  hideOnDesktop?: boolean;
  className?: string;
}

export const AdaptiveSectionTabs: React.FC<AdaptiveSectionTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  darkMode = true,
  hideOnDesktop = false,
  className = ''
}) => {
  return (
    <div
      className={`p-1 rounded-2xl inline-flex items-center gap-1 backdrop-blur-xl border transition-all shadow-[4px_6px_12px_rgba(0,0,0,0.15)] select-none shrink-0 ${
        darkMode ? 'bg-black/20 border-white/5' : 'bg-white/20 border-slate-200/50'
      } ${hideOnDesktop ? 'lg:hidden' : ''} ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 select-none ${
              isActive
                ? darkMode
                  ? 'bg-sky-500 text-slate-950 font-black shadow-md shadow-sky-500/20'
                  : 'bg-sky-500 text-slate-950 font-black shadow-md'
                : darkMode
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-700 hover:text-slate-950'
            }`}
          >
            {/* Icon rendering */}
            {Icon && (
              <span className="shrink-0 flex items-center justify-center">
                {React.isValidElement(Icon)
                  ? Icon
                  : (typeof Icon === 'function' || (typeof Icon === 'object' && Icon !== null))
                  ? React.createElement(Icon as React.ComponentType<any>, {
                      size: 16,
                      weight: isActive ? 'bold' : 'duotone',
                      className: isActive
                        ? 'text-slate-950'
                        : darkMode ? 'text-slate-400' : 'text-slate-600'
                    })
                  : null}
              </span>
            )}

            <span>{tab.label}</span>

            {/* Counter / Status Badge */}
            {tab.badge !== undefined && tab.badge !== '' && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-lg font-mono font-bold shrink-0 ${
                  isActive
                    ? darkMode
                      ? 'bg-black/20 text-black'
                      : 'bg-slate-950/20 text-slate-950'
                    : darkMode
                    ? 'bg-white/10 text-slate-300'
                    : 'bg-slate-900/10 text-slate-700'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default AdaptiveSectionTabs;
