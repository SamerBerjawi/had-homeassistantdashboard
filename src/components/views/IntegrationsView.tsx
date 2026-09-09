/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Integrations, HACS & Add-ons Command Center
 * Comprehensive full-width table view for installed Official Integrations,
 * HACS Community repositories, and Supervisor Add-ons.
 * Completely excludes helper domains and uninstalled packages.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { 
  PuzzlePiece, 
  Sparkle, 
  SquaresFour, 
  HardDrives, 
  Cpu, 
  DownloadSimple, 
  Warning, 
  MagnifyingGlass, 
  ArrowsClockwise, 
  CaretRight,
  ArrowSquareOut
} from '@phosphor-icons/react';

import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { useShallow } from 'zustand/react/shallow';
import { integrationsService, isHelper } from '../../services/integrationsService';
import { IntegrationItem } from '../../types/integrations';
import IntegrationIcon from '../notifications/IntegrationIcon';
import IntegrationDetailDrawer from '../integrations/IntegrationDetailDrawer';
import AdaptiveSectionTabs, { SectionTabItem } from '../common/AdaptiveSectionTabs';
import ViewEmptyState from '../ui/ViewEmptyState';
import ViewLoadingState from '../ui/ViewLoadingState';
import CustomDropdown from '../ui/CustomDropdown';

interface ViewProps {
  darkMode?: boolean;
}

type FilterTab = 'all' | 'official' | 'hacs' | 'addon' | 'updates' | 'attention';

export default function IntegrationsView({ darkMode = true }: ViewProps) {
  const isLoading = useAutoLayoutStore(s => s.isLoading);
  const entityRegistry = useAutoLayoutStore(useShallow(s => s.entityRegistry));
  const rawDevices = useAutoLayoutStore(useShallow(s => s.rawDevices));
  const states = useAutoLayoutStore(useShallow(s => s.states));
  const rawAreas = useAutoLayoutStore(useShallow(s => s.rawAreas));

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'devices' | 'entities' | 'category'>('name');
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationItem | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch live integration data once on mount
  useEffect(() => {
    integrationsService.fetchLiveIntegrationData();
  }, []);

  // Construct unified list and guarantee helper domains are strictly omitted
  const allIntegrations = useMemo(() => {
    const list = integrationsService.getIntegrations(entityRegistry, rawDevices, states, rawAreas);
    return list.filter(item => !isHelper(item.domain, item.source));
  }, [entityRegistry, rawDevices, states, rawAreas]);

  // Handle Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await integrationsService.fetchLiveIntegrationData();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Metric aggregates
  const stats = useMemo(() => {
    const total = allIntegrations.length;
    const officialCount = allIntegrations.filter(i => i.category === 'official').length;
    const hacsCount = allIntegrations.filter(i => i.category === 'hacs').length;
    const addonCount = allIntegrations.filter(i => i.category === 'addon').length;
    const updatesCount = allIntegrations.filter(i => i.hasUpdate).length;
    const totalDevices = allIntegrations.reduce((acc, i) => acc + i.devicesCount, 0);
    const totalEntities = allIntegrations.reduce((acc, i) => acc + i.entitiesCount, 0);
    const healthyCount = allIntegrations.filter(i => i.state === 'loaded' || i.state === 'running').length;
    const attentionCount = allIntegrations.filter(i => i.state === 'setup_error' || i.state === 'disabled' || i.state === 'not_loaded').length;

    return {
      total,
      officialCount,
      hacsCount,
      addonCount,
      updatesCount,
      totalDevices,
      totalEntities,
      healthyCount,
      attentionCount
    };
  }, [allIntegrations]);

  // Tab definitions
  const filterTabs: SectionTabItem[] = useMemo(() => [
    { id: 'all', label: 'All Components', icon: SquaresFour, badge: stats.total, color: '#6366f1' },
    { id: 'official', label: 'Official Core', icon: PuzzlePiece, badge: stats.officialCount, color: '#0ea5e9' },
    { id: 'hacs', label: 'HACS Community', icon: Sparkle, badge: stats.hacsCount, color: '#a855f7' },
    { id: 'addon', label: 'Add-ons & Apps', icon: HardDrives, badge: stats.addonCount, color: '#10b981' },
    { 
      id: 'updates', 
      label: 'Updates', 
      icon: DownloadSimple, 
      badge: stats.updatesCount, 
      badgeColor: stats.updatesCount > 0 ? 'bg-amber-500/20 text-amber-300 font-black animate-pulse' : undefined,
      color: '#f59e0b' 
    },
    { 
      id: 'attention', 
      label: 'Attention', 
      icon: Warning, 
      badge: stats.attentionCount,
      badgeColor: stats.attentionCount > 0 ? 'bg-rose-500/20 text-rose-300 font-black' : undefined,
      color: '#ef4444' 
    }
  ], [stats]);

  // Filter & Sort
  const filteredIntegrations = useMemo(() => {
    let list = allIntegrations;

    // Tab filter
    if (activeTab === 'official') list = list.filter(i => i.category === 'official');
    else if (activeTab === 'hacs') list = list.filter(i => i.category === 'hacs');
    else if (activeTab === 'addon') list = list.filter(i => i.category === 'addon');
    else if (activeTab === 'updates') list = list.filter(i => i.hasUpdate);
    else if (activeTab === 'attention') list = list.filter(i => i.state === 'setup_error' || i.state === 'disabled' || i.state === 'not_loaded');

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i => {
        const name = i.name.toLowerCase();
        const dom = i.domain.toLowerCase();
        const desc = (i.description || '').toLowerCase();
        const auth = (i.authors || []).join(' ').toLowerCase();
        const devs = i.devices.some(d => (d.name || d.manufacturer || '').toLowerCase().includes(q));
        const ents = i.entities.some(e => (e.name || e.entity_id).toLowerCase().includes(q));
        return name.includes(q) || dom.includes(q) || desc.includes(q) || auth.includes(q) || devs || ents;
      });
    }

    // Sort
    return [...list].sort((a, b) => {
      if (sortBy === 'devices') return b.devicesCount - a.devicesCount;
      if (sortBy === 'entities') return b.entitiesCount - a.entitiesCount;
      if (sortBy === 'category') return a.category.localeCompare(b.category);
      return a.name.localeCompare(b.name);
    });
  }, [allIntegrations, activeTab, searchQuery, sortBy]);

  if (isLoading) {
    return <ViewLoadingState darkMode={darkMode} title="Loading Integrations & Add-ons..." subtitle="Connecting and discovering installed Home Assistant components" />;
  }

  return (
    <div className="w-full flex-1 flex flex-col gap-6 animate-fadeIn pb-24 md:pb-8">
      
      {/* 1. METRICS BENTO SUMMARY */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full">
        {/* Total Integrations */}
        <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
          darkMode ? 'bg-black/20 border-white/5 shadow-xs' : 'bg-white/50 border-slate-200/80 shadow-xs'
        } backdrop-blur-xl`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Installed</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <PuzzlePiece size={18} weight="duotone" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              {stats.total}
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {stats.healthyCount} active
            </span>
          </div>
        </div>

        {/* Connected Hardware Devices */}
        <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
          darkMode ? 'bg-black/20 border-white/5 shadow-xs' : 'bg-white/50 border-slate-200/80 shadow-xs'
        } backdrop-blur-xl`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Hardware Devices</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <HardDrives size={18} weight="duotone" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              {stats.totalDevices}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              linked hardware
            </span>
          </div>
        </div>

        {/* Telemetry Entities */}
        <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
          darkMode ? 'bg-black/20 border-white/5 shadow-xs' : 'bg-white/50 border-slate-200/80 shadow-xs'
        } backdrop-blur-xl`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Telemetry Entities</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Cpu size={18} weight="duotone" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              {stats.totalEntities}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              sensors & controls
            </span>
          </div>
        </div>

        {/* Pending Updates */}
        <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
          stats.updatesCount > 0
            ? 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_20px_-5px_rgba(245,158,11,0.2)]'
            : darkMode ? 'bg-black/20 border-white/5' : 'bg-white/50 border-slate-200/80'
        } backdrop-blur-xl`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pending Updates</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <DownloadSimple size={18} weight="bold" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-amber-600 dark:text-amber-300">
              {stats.updatesCount}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {stats.updatesCount === 0 ? 'All up to date' : 'Updates ready'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. CONTROLS BAR: CATEGORY TABS + SEARCH + SORT + REFRESH */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5 w-full">
        <div className="w-full lg:w-auto min-w-0">
          <AdaptiveSectionTabs
            tabs={filterTabs}
            activeTab={activeTab}
            onChange={(tabId) => setActiveTab(tabId as FilterTab)}
            darkMode={darkMode}
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap w-full lg:w-auto shrink-0">
          {/* Search input */}
          <div className="relative flex-1 sm:w-72 lg:w-80">
            <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search components, domains, devices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-2.5 text-xs rounded-2xl border outline-none transition-all ${
                darkMode
                  ? 'bg-black/20 border-white/10 text-white placeholder-slate-500 focus:border-indigo-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
              }`}
            />
          </div>

          {/* Sort Dropdown */}
          <div className="w-44 shrink-0">
            <CustomDropdown
              value={sortBy}
              onChange={(val) => setSortBy(val as any)}
              options={[
                { value: 'name', label: 'Sort by Name' },
                { value: 'devices', label: 'Sort by Devices' },
                { value: 'entities', label: 'Sort by Entities' },
                { value: 'category', label: 'Sort by Category' }
              ]}
              darkMode={darkMode}
            />
          </div>

          {/* Sync Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh integrations and add-ons status"
            className={`px-3.5 py-2.5 rounded-2xl border flex items-center gap-2 font-bold text-xs transition-all active:scale-95 shrink-0 ${
              darkMode
                ? 'bg-white/10 hover:bg-white/15 text-white border-white/10'
                : 'bg-white hover:bg-slate-100 text-slate-900 border-slate-200'
            }`}
          >
            <ArrowsClockwise size={16} weight="bold" className={isRefreshing ? 'animate-spin text-indigo-400' : ''} />
            <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>
      </div>

      {/* 3. FULL-WIDTH TABLE VIEW */}
      {filteredIntegrations.length === 0 ? (
        <ViewEmptyState
          icon={PuzzlePiece}
          title="No Integrations Found"
          description={searchQuery ? `No components match "${searchQuery}". Try adjusting your search query or active filter.` : 'No components found under this category.'}
          badgeText="Filtered"
          onRefresh={() => { setActiveTab('all'); setSearchQuery(''); }}
          darkMode={darkMode}
        />
      ) : (
        <div className={`w-full rounded-3xl border overflow-hidden backdrop-blur-xl shadow-xs ${
          darkMode ? 'bg-black/20 border-white/5' : 'bg-white/80 border-slate-200/80'
        }`}>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead className={`border-b ${
                darkMode ? 'border-white/10 bg-white/5 text-slate-400' : 'border-slate-200 bg-slate-50/80 text-slate-500'
              } font-extrabold uppercase tracking-wider text-[10px]`}>
                <tr>
                  <th className="py-3.5 px-4 sm:px-5">Component</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">IoT Protocol</th>
                  <th className="py-3.5 px-4 text-center">Devices</th>
                  <th className="py-3.5 px-4 text-center">Entities</th>
                  <th className="py-3.5 px-4">Version</th>
                  <th className="py-3.5 px-4 sm:px-5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-white/5">
                {filteredIntegrations.map(item => {
                  const isOfficial = item.category === 'official';
                  const isHacs = item.category === 'hacs';
                  const isAddon = item.category === 'addon';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedIntegration(item)}
                      className={`cursor-pointer transition-colors group ${
                        darkMode 
                          ? 'hover:bg-white/[0.04]' 
                          : 'hover:bg-slate-50/90'
                      }`}
                    >
                      {/* Component Column */}
                      <td className="py-3.5 px-4 sm:px-5">
                        <div className="flex items-center gap-3.5 min-w-[220px]">
                          <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 p-1.5 border border-slate-200/80 dark:border-white/10 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                            <IntegrationIcon domain={item.iconDomain || item.domain} size="md" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {item.name}
                              </span>
                              {item.entriesCount && item.entriesCount > 1 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-500/20">
                                  {item.entriesCount} entries
                                </span>
                              )}
                              {item.isCustom && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-300">
                                  Custom
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span className="font-mono">{item.domain}</span>
                              {item.description && (
                                <>
                                  <span className="opacity-40">•</span>
                                  <span className="truncate max-w-[280px] text-slate-500 dark:text-slate-400">
                                    {item.description}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                          isOfficial
                            ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30'
                            : isHacs
                            ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                        }`}>
                          {isOfficial ? 'Official' : isHacs ? 'HACS' : 'Add-on'}
                        </span>
                      </td>

                      {/* Live Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${
                            item.state === 'loaded' || item.state === 'running'
                              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                              : item.state === 'disabled'
                              ? 'bg-slate-400'
                              : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                          }`} />
                          <span className={`font-mono text-xs font-semibold ${
                            item.state === 'loaded' || item.state === 'running'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : item.state === 'disabled'
                              ? 'text-slate-500 dark:text-slate-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {item.state}
                          </span>
                        </div>
                      </td>

                      {/* IoT Protocol */}
                      <td className="py-3.5 px-4 hidden md:table-cell whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-500/10 dark:bg-white/5 font-mono text-[11px] text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-white/5">
                          {item.iotClass ? item.iotClass.replace(/_/g, ' ') : 'local'}
                        </span>
                      </td>

                      {/* Devices Count */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center font-mono font-bold text-xs px-2.5 py-1 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                          {item.devicesCount}
                        </span>
                      </td>

                      {/* Entities Count */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center font-mono font-bold text-xs px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          {item.entitiesCount}
                        </span>
                      </td>

                      {/* Version & Updates */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                            {item.version ? `v${item.version}` : '—'}
                          </span>
                          {item.hasUpdate && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                              <DownloadSimple size={10} weight="bold" />
                              Update
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action Column */}
                      <td className="py-3.5 px-4 sm:px-5 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setSelectedIntegration(item); 
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-600 text-indigo-600 dark:text-indigo-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 ml-auto shadow-xs active:scale-95"
                        >
                          <span>Inspect</span>
                          <CaretRight size={13} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. SLIDE-OVER DETAIL DRAWER */}
      <IntegrationDetailDrawer
        integration={selectedIntegration}
        isOpen={Boolean(selectedIntegration)}
        onClose={() => setSelectedIntegration(null)}
        darkMode={darkMode}
      />
    </div>
  );
}
