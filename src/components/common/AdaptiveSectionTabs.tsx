/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AdaptiveSectionTabs Component
 * Responsive sub-view tab switcher with smooth horizontal touch scrolling,
 * clean floating pill styling (no unnecessary gray container), and strong light/dark mode contrast.
 */

import React, { useRef, useEffect } from 'react';

export interface SectionTabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<any> | React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
  activeColor?: string;
  color?: string;
}

function getContrastTextColor(hexOrColor?: string): string {
  if (!hexOrColor) return '#020617';
  if (hexOrColor.startsWith('#')) {
    const hex = hexOrColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 140 ? '#020617' : '#ffffff';
  }
  return '#020617';
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll active tab into view when activeTab changes
  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const tab = activeTabRef.current;
      const tabLeft = tab.offsetLeft;
      const tabWidth = tab.offsetWidth;
      const containerWidth = container.offsetWidth;
      const targetScrollLeft = tabLeft - (containerWidth / 2) + (tabWidth / 2);

      container.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior: 'smooth'
      });
    }
  }, [activeTab]);

  return (
    <div
      ref={scrollContainerRef}
      className={`w-full max-w-full overflow-x-auto touch-scroll-x no-scrollbar pt-1.5 pb-4 px-2 -my-1 flex items-center ${
        hideOnDesktop ? 'lg:hidden' : ''
      }`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div
        role="tablist"
        className={`p-1 rounded-2xl inline-flex items-center gap-1 backdrop-blur-xl border transition-all select-none shrink-0 ${
          darkMode
            ? 'bg-black/30 border-white/10 shadow-[0_4px_16px_-2px_rgba(0,0,0,0.5),0_2px_6px_-1px_rgba(0,0,0,0.3)]'
            : 'bg-white/80 border-slate-200/80 shadow-[0_4px_16px_-2px_rgba(0,0,0,0.08),0_2px_6px_-1px_rgba(0,0,0,0.04)]'
        } ${className}`}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          const contrastText = getContrastTextColor(tab.color);

          const customTabStyle: React.CSSProperties | undefined = isActive && tab.color
            ? {
                backgroundColor: tab.color,
                color: contrastText,
                boxShadow: `0 4px 14px ${tab.color}50`
              }
            : undefined;

          // In Mobile mode (< sm): only show the name of the active tab, and the icons of the rest of the tabs
          const showLabelOnMobile = isActive || !Icon;
          const showBadgeOnMobile = isActive;

          return (
            <button
              key={tab.id}
              ref={isActive ? activeTabRef : undefined}
              role="tab"
              aria-selected={isActive}
              type="button"
              title={tab.label}
              aria-label={tab.label}
              onClick={() => onChange(tab.id)}
              style={customTabStyle}
              className={`flex items-center transition-all duration-200 cursor-pointer shrink-0 select-none ${
                isActive
                  ? 'gap-1.5 sm:gap-2 px-3.5 py-1.5 rounded-xl text-xs'
                  : Icon
                  ? 'gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs'
                  : 'gap-1.5 sm:gap-2 px-3.5 py-1.5 rounded-xl text-xs'
              } ${
                isActive
                  ? tab.color
                    ? 'font-black'
                    : darkMode
                    ? 'bg-sky-500 text-slate-950 font-black shadow-md shadow-sky-500/20'
                    : 'bg-sky-500 text-slate-950 font-black shadow-md'
                  : darkMode
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              {/* Icon rendering */}
              {Icon && (
                <span
                  className="shrink-0 flex items-center justify-center"
                  style={!isActive && tab.color ? { color: tab.color } : undefined}
                >
                  {React.isValidElement(Icon)
                    ? Icon
                    : (typeof Icon === 'function' || (typeof Icon === 'object' && Icon !== null))
                    ? React.createElement(Icon as React.ComponentType<any>, {
                        size: 16,
                        weight: isActive ? 'bold' : 'duotone',
                        className: isActive
                          ? ''
                          : tab.color ? '' : (darkMode ? 'text-slate-400' : 'text-slate-600')
                      })
                    : null}
                </span>
              )}

              {/* Tab Name Label: On mobile (< sm), only show name if active or if tab has no icon */}
              <span className={`whitespace-nowrap font-bold ${
                showLabelOnMobile ? 'inline' : 'hidden sm:inline'
              }`}>
                {tab.label}
              </span>

              {/* Counter / Status Badge: On mobile (< sm), only show on active tab */}
              {tab.badge !== undefined && tab.badge !== '' && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-lg font-mono font-bold shrink-0 ${
                    showBadgeOnMobile ? 'inline-flex' : 'hidden sm:inline-flex'
                  } ${
                    isActive
                      ? tab.color
                        ? contrastText === '#ffffff'
                          ? 'bg-white/20 text-white'
                          : 'bg-black/20 text-black'
                        : darkMode
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
    </div>
  );
};

export default AdaptiveSectionTabs;
