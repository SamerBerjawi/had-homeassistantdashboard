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
      className={`w-full overflow-x-auto overscroll-x-contain pb-1 scrollbar-none select-none touch-pan-x ${
        hideOnDesktop ? 'lg:hidden' : ''
      } ${className}`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div className="flex items-center gap-2 w-max py-0.5 min-w-full sm:min-w-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0 select-none border ${
                isActive
                  ? darkMode
                    ? 'bg-sky-500 text-black border-sky-400 shadow-lg shadow-sky-500/25 font-black'
                    : 'bg-sky-500 text-slate-950 border-sky-600 shadow-md shadow-sky-500/20 font-black'
                  : darkMode
                  ? 'bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white border-white/10'
                  : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200/80 shadow-xs'
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
                          ? darkMode ? 'text-black' : 'text-slate-950'
                          : darkMode ? 'text-slate-400' : 'text-slate-500'
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
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AdaptiveSectionTabs;
