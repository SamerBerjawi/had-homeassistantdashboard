/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WidgetsDrawer Component
 * Slide-over drawer allowing users to browse, search, and selectively add or remove
 * widget tiles from the Overview dashboard.
 */

import React, { useState, useMemo } from 'react';
import {
  SquaresFour,
  MagnifyingGlass,
  Check,
  Plus,
  CloudSun,
  Users,
  Lightbulb,
  ToggleRight,
  Fan,
  ShieldCheck,
  Door,
  FrameCorners,
  PersonSimpleWalk,
  Drop,
  Flame,
  Lightning,
  Sun,
  MusicNotes,
  Broom
} from '@phosphor-icons/react';
import type { OverviewTileVisibilityMode } from '../../../types/userConfig';
import DetailsRightDrawer from '../DetailsRightDrawer';

export interface WidgetCatalogItem {
  id: string;
  title: string;
  description: string;
  category: 'All' | 'Energy' | 'Lighting' | 'Security' | 'Climate' | 'Weather' | 'Media' | 'Cleaners';
  icon: React.ComponentType<any>;
  color: string;
  defaultSize: '1x' | '2x';
}

export const WIDGET_CATALOG: WidgetCatalogItem[] = [
  {
    id: 'weather',
    title: 'Weather Overview',
    description: 'Current ambient conditions, temperature, humidity, and 3-day forecast',
    category: 'Weather',
    icon: CloudSun,
    color: '#0284c7',
    defaultSize: '2x'
  },
  {
    id: 'weather_hourly',
    title: 'Weather (Hourly Forecast)',
    description: 'Live conditions with hourly temperature and sky prediction curve',
    category: 'Weather',
    icon: CloudSun,
    color: '#0284c7',
    defaultSize: '2x'
  },
  {
    id: 'users',
    title: 'Family Presence',
    description: 'Household members, real-time home/away status, and zone tracking',
    category: 'Security',
    icon: Users,
    color: '#10b981',
    defaultSize: '1x'
  },
  {
    id: 'lights',
    title: 'Lighting Controls',
    description: 'Quick master toggle, on/off count, and room brightness controls',
    category: 'Lighting',
    icon: Lightbulb,
    color: '#eab308',
    defaultSize: '1x'
  },
  {
    id: 'switches',
    title: 'Smart Switches',
    description: 'Control connected smart plugs, power relays, and appliances',
    category: 'Lighting',
    icon: ToggleRight,
    color: '#8b5cf6',
    defaultSize: '1x'
  },
  {
    id: 'fans',
    title: 'Fans & Airflow',
    description: 'Active fans status, speed presets, and ventilation controls',
    category: 'Climate',
    icon: Fan,
    color: '#06b6d4',
    defaultSize: '1x'
  },
  {
    id: 'alarm',
    title: 'Security Alarm',
    description: 'Arm/disarm state, security guard monitoring, and keypad modal',
    category: 'Security',
    icon: ShieldCheck,
    color: '#ef4444',
    defaultSize: '1x'
  },
  {
    id: 'doors',
    title: 'Entry Doors',
    description: 'Contact sensors monitoring entry, back, and garage doors',
    category: 'Security',
    icon: Door,
    color: '#f59e0b',
    defaultSize: '1x'
  },
  {
    id: 'windows',
    title: 'Windows',
    description: 'Window contact sensor states with open alert tracking',
    category: 'Security',
    icon: FrameCorners,
    color: '#8b5cf6',
    defaultSize: '1x'
  },
  {
    id: 'motion',
    title: 'Motion Zones',
    description: 'Occupancy and motion detection sensors across all house zones',
    category: 'Security',
    icon: PersonSimpleWalk,
    color: '#10b981',
    defaultSize: '1x'
  },
  {
    id: 'leak',
    title: 'Water Leak Detectors',
    description: 'Moisture and water flood sensors with active alert status',
    category: 'Security',
    icon: Drop,
    color: '#0ea5e9',
    defaultSize: '1x'
  },
  {
    id: 'smoke',
    title: 'Smoke & Fire Safety',
    description: 'Smoke alarms and fire detector emergency monitoring',
    category: 'Security',
    icon: Flame,
    color: '#f43f5e',
    defaultSize: '1x'
  },
  {
    id: 'power_flow',
    title: 'Power Sources Flow',
    description: 'Real-time solar, grid import/export, and home consumption rate',
    category: 'Energy',
    icon: Lightning,
    color: '#10b981',
    defaultSize: '1x'
  },
  {
    id: 'power_flow_chart',
    title: 'Power Flow (12h Chart)',
    description: 'Interactive power distribution flow graph over the last 12 hours',
    category: 'Energy',
    icon: Lightning,
    color: '#10b981',
    defaultSize: '2x'
  },
  {
    id: 'energy_usage',
    title: 'Monitored Devices Pie',
    description: 'Individual device consumption share with interactive pie breakdown',
    category: 'Energy',
    icon: Lightning,
    color: '#8b5cf6',
    defaultSize: '1x'
  },
  {
    id: 'energy_usage_chart',
    title: 'Energy Usage (Hourly Chart)',
    description: 'Hourly home consumption and grid return breakdown bar graph',
    category: 'Energy',
    icon: Lightning,
    color: '#8b5cf6',
    defaultSize: '2x'
  },
  {
    id: 'solar_production',
    title: 'Solar Production Forecast',
    description: 'Solar generation forecast with full-day curve and peak estimates',
    category: 'Energy',
    icon: Sun,
    color: '#f59e0b',
    defaultSize: '1x'
  },
  {
    id: 'solar_production_chart',
    title: 'Solar Forecast (Full-Day Chart)',
    description: 'Full 24-hour solar generation forecast chart with dawn-to-dusk curve',
    category: 'Energy',
    icon: Sun,
    color: '#f59e0b',
    defaultSize: '2x'
  },
  {
    id: 'media',
    title: 'Media Player',
    description: 'Active media playback, volume, and playback controls',
    category: 'Media',
    icon: MusicNotes,
    color: '#ec4899',
    defaultSize: '1x'
  },
  {
    id: 'vacuums',
    title: 'Robot Vacuum & Cleaner',
    description: 'Robot vacuum status, room cleaning progress, and dock commands',
    category: 'Cleaners',
    icon: Broom,
    color: '#f97316',
    defaultSize: '1x'
  }
];

export const CATEGORIES = [
  'All',
  'Energy',
  'Lighting',
  'Security',
  'Climate',
  'Weather',
  'Media',
  'Cleaners'
] as const;

interface WidgetsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTileIds: string[];
  hiddenTileIds: string[];
  hiddenFromAllTileIds?: string[];
  onAddWidget?: (widgetId: string) => void;
  onRemoveWidget?: (widgetId: string) => void;
  onToggleHiddenFromAll?: (widgetId: string) => void;
  onSetTileMode?: (widgetId: string, mode: OverviewTileVisibilityMode) => void;
  onAddAllWidgets: () => void;
  onResetWidgets: () => void;
  darkMode?: boolean;
}

export default function WidgetsDrawer({
  isOpen,
  onClose,
  activeTileIds: _activeTileIds,
  hiddenTileIds,
  hiddenFromAllTileIds = [],
  onAddWidget,
  onRemoveWidget,
  onToggleHiddenFromAll,
  onSetTileMode,
  onAddAllWidgets,
  onResetWidgets,
  darkMode = true
}: WidgetsDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const hiddenSet = useMemo(() => new Set(hiddenTileIds), [hiddenTileIds]);
  const hiddenFromAllSet = useMemo(() => new Set(hiddenFromAllTileIds), [hiddenFromAllTileIds]);

  const allOnCount = useMemo(() => {
    return WIDGET_CATALOG.filter((w) => !hiddenSet.has(w.id) && !hiddenFromAllSet.has(w.id)).length;
  }, [hiddenSet, hiddenFromAllSet]);

  const tabOnlyCount = useMemo(() => {
    return WIDGET_CATALOG.filter((w) => !hiddenSet.has(w.id) && hiddenFromAllSet.has(w.id)).length;
  }, [hiddenSet, hiddenFromAllSet]);

  const allOffCount = useMemo(() => {
    return WIDGET_CATALOG.filter((w) => hiddenSet.has(w.id)).length;
  }, [hiddenSet]);

  const handleModeChange = (widgetId: string, targetMode: OverviewTileVisibilityMode) => {
    if (onSetTileMode) {
      onSetTileMode(widgetId, targetMode);
    } else {
      if (targetMode === 'all_off') {
        onRemoveWidget?.(widgetId);
      } else if (targetMode === 'tab_only') {
        if (hiddenSet.has(widgetId)) onAddWidget?.(widgetId);
        if (!hiddenFromAllSet.has(widgetId)) onToggleHiddenFromAll?.(widgetId);
      } else if (targetMode === 'all_on') {
        if (hiddenSet.has(widgetId)) onAddWidget?.(widgetId);
        if (hiddenFromAllSet.has(widgetId)) onToggleHiddenFromAll?.(widgetId);
      }
    }
  };

  const activeSet = useMemo(() => {
    return new Set(_activeTileIds.filter((id) => !hiddenSet.has(id)));
  }, [_activeTileIds, hiddenSet]);

  const filteredWidgets = useMemo(() => {
    return WIDGET_CATALOG.filter((widget) => {
      // Category filter
      if (selectedCategory !== 'All' && widget.category !== selectedCategory) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = widget.title.toLowerCase().includes(q);
        const matchDesc = widget.description.toLowerCase().includes(q);
        const matchCategory = widget.category.toLowerCase().includes(q);
        return matchTitle || matchDesc || matchCategory;
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <DetailsRightDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Widget Library"
      subtitle={`${allOnCount} All On • ${tabOnlyCount} Tab Only • ${allOffCount} All Off`}
      icon={<SquaresFour size={22} weight="duotone" className="text-sky-500" />}
      darkMode={darkMode}
      footerActions={
        <div className="w-full flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onResetWidgets}
            className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer flex items-center gap-1.5"
            title="Reset overview widgets to default"
          >
            <SquaresFour size={14} weight="bold" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <Check size={14} weight="bold" />
            <span>Done</span>
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 pb-20 sm:pb-6">
        {/* Search Bar */}
        <div className="relative w-full">
          <MagnifyingGlass
            size={16}
            weight="bold"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search widgets by name or description..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs transition-all outline-none border ${
              darkMode
                ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-sky-400/60 focus:bg-white/10'
                : 'bg-slate-100/80 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:bg-white'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer font-bold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-sky-500 text-white shadow-xs'
                    : darkMode
                    ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Action Header: Count & Enable All */}
        <div className="flex items-center justify-between text-xs pt-1 px-1">
          <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">
            Showing {filteredWidgets.length} {filteredWidgets.length === 1 ? 'widget' : 'widgets'}
          </span>
          {allOffCount > 0 && (
            <button
              type="button"
              onClick={onAddAllWidgets}
              className="text-[11px] font-bold text-sky-500 hover:text-sky-400 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Plus size={12} weight="bold" />
              <span>Enable All (All On)</span>
            </button>
          )}
        </div>

        {/* Widgets List */}
        <div className="flex flex-col gap-2.5">
          {filteredWidgets.map((widget) => {
            const Icon = widget.icon;
            const isAllOff = hiddenSet.has(widget.id);
            const isTabOnly = !isAllOff && hiddenFromAllSet.has(widget.id);
            const isAllOn = !isAllOff && !hiddenFromAllSet.has(widget.id);

            return (
              <div
                key={widget.id}
                className={`group p-3 sm:p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 select-none ${
                  isAllOn
                    ? darkMode
                      ? 'bg-white/[0.03] border-white/10 hover:border-emerald-500/30'
                      : 'bg-white border-slate-200/80 shadow-xs hover:border-emerald-400/40'
                    : isTabOnly
                    ? darkMode
                      ? 'bg-amber-500/[0.03] border-amber-500/20 hover:border-amber-500/40'
                      : 'bg-amber-50/50 border-amber-200/80 shadow-xs hover:border-amber-400/60'
                    : darkMode
                    ? 'bg-black/20 border-white/5 opacity-70 hover:opacity-100 hover:border-white/15'
                    : 'bg-slate-50 border-slate-200/60 opacity-70 hover:opacity-100 hover:border-slate-300'
                }`}
              >
                {/* Left: Icon & Description */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
                    style={{
                      backgroundColor: `${widget.color}20`,
                      color: widget.color
                    }}
                  >
                    <Icon size={20} weight="duotone" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {widget.title}
                      </h4>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-slate-400 shrink-0">
                        {widget.defaultSize === '2x' ? '2× Wide' : '1×'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {widget.description}
                    </p>
                  </div>
                </div>

                {/* Right: 3-Mode Segmented Control */}
                <div className="shrink-0 flex items-center justify-end">
                  <div
                    className={`flex items-center p-0.5 rounded-xl border ${
                      darkMode ? 'bg-black/40 border-white/10' : 'bg-slate-100 border-slate-200'
                    }`}
                  >
                    {/* All On */}
                    <button
                      type="button"
                      onClick={() => handleModeChange(widget.id, 'all_on')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                        isAllOn
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : darkMode
                          ? 'text-slate-400 hover:text-white hover:bg-white/5'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                      title="Show on 'All' overview tab and its category tab"
                    >
                      {isAllOn && <Check size={11} weight="bold" />}
                      <span>All On</span>
                    </button>

                    {/* Tab Only */}
                    <button
                      type="button"
                      onClick={() => handleModeChange(widget.id, 'tab_only')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                        isTabOnly
                          ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                          : darkMode
                          ? 'text-slate-400 hover:text-amber-300 hover:bg-white/5'
                          : 'text-slate-600 hover:text-amber-700 hover:bg-white/60'
                      }`}
                      title="Hide from 'All' overview tab, show only in its category tab"
                    >
                      {isTabOnly && <Check size={11} weight="bold" />}
                      <span>Tab Only</span>
                    </button>

                    {/* All Off */}
                    <button
                      type="button"
                      onClick={() => handleModeChange(widget.id, 'all_off')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                        isAllOff
                          ? 'bg-rose-500 text-white shadow-xs'
                          : darkMode
                          ? 'text-slate-400 hover:text-rose-400 hover:bg-white/5'
                          : 'text-slate-600 hover:text-rose-600 hover:bg-white/60'
                      }`}
                      title="Hide completely from Overview dashboard"
                    >
                      {isAllOff && <Check size={11} weight="bold" />}
                      <span>All Off</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredWidgets.length === 0 && (
            <div className="w-full py-12 flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
              <MagnifyingGlass size={24} weight="duotone" className="text-slate-400 mb-2" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                No matching widgets found
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Try searching with another keyword or select "All" categories.
              </p>
            </div>
          )}
        </div>
      </div>
    </DetailsRightDrawer>
  );
}
