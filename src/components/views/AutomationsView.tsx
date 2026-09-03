/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Automations & Scenes Command Center
 * High-density table and card management with floating AdaptiveSectionTabs,
 * instant trigger controls, and batch actions.
 */

import React, { useMemo, useState } from 'react';
import type { SortDescriptor } from 'react-aria-components';
import { 
  GitFork, 
  Sparkle, 
  Play, 
  Clock, 
  Tag as TagIcon, 
  House, 
  MagnifyingGlass, 
  Check, 
  Lightbulb, 
  ShieldCheck, 
  Thermometer, 
  Broom, 
  MusicNotes, 
  Moon, 
  Sun, 
  Drop, 
  ForkKnife, 
  SlidersHorizontal,
  Power
} from '@phosphor-icons/react';

import { Table, TableCard } from '../application/table/table';
import { Badge, BadgeWithDot } from '../base/badges/badges';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { useShallow } from 'zustand/react/shallow';
import { ResolvedEntity } from '../../types';
import CustomDropdown from '../ui/CustomDropdown';
import ViewEmptyState from '../ui/ViewEmptyState';
import ViewLoadingState from '../ui/ViewLoadingState';
import AdaptiveSectionTabs, { SectionTabItem } from '../common/AdaptiveSectionTabs';

interface ViewProps {
  darkMode?: boolean;
}

type FilterTab = 'all' | 'automations' | 'scenes' | 'active' | 'disabled';

// Helper to determine relevant domain icon for an automation/scene
function getEntityIcon(entity: ResolvedEntity) {
  const name = (entity.name || entity.entity_id || '').toLowerCase();
  const labels = (entity.labels || []).map(l => l.toLowerCase());
  const allText = `${name} ${labels.join(' ')}`;

  if (allText.includes('light') || allText.includes('sun') || allText.includes('lamp') || allText.includes('bright')) {
    return <Lightbulb size={16} weight="duotone" className="text-amber-400" />;
  }
  if (allText.includes('security') || allText.includes('lock') || allText.includes('alarm') || allText.includes('guard')) {
    return <ShieldCheck size={16} weight="duotone" className="text-emerald-400" />;
  }
  if (allText.includes('climate') || allText.includes('ac') || allText.includes('temp') || allText.includes('heat')) {
    return <Thermometer size={16} weight="duotone" className="text-rose-400" />;
  }
  if (allText.includes('clean') || allText.includes('vac') || allText.includes('mop') || allText.includes('robot')) {
    return <Broom size={16} weight="duotone" className="text-cyan-400" />;
  }
  if (allText.includes('music') || allText.includes('media') || allText.includes('audio') || allText.includes('movie') || allText.includes('tv')) {
    return <MusicNotes size={16} weight="duotone" className="text-purple-400" />;
  }
  if (allText.includes('night') || allText.includes('sleep') || allText.includes('bed')) {
    return <Moon size={16} weight="duotone" className="text-indigo-400" />;
  }
  if (allText.includes('leak') || allText.includes('water') || allText.includes('shutoff')) {
    return <Drop size={16} weight="duotone" className="text-sky-400" />;
  }
  if (allText.includes('dinner') || allText.includes('food') || allText.includes('cook')) {
    return <ForkKnife size={16} weight="duotone" className="text-amber-400" />;
  }
  if (entity.domain === 'scene') {
    return <Sparkle size={16} weight="duotone" className="text-violet-400" />;
  }
  return <GitFork size={16} weight="duotone" className="text-violet-400" />;
}

// Relative timestamp helper
function formatLastTriggered(isoString?: string): { text: string; isRecent: boolean } {
  if (!isoString) return { text: 'Never', isRecent: false };
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return { text: 'Just now', isRecent: true };
    if (diffMins < 60) return { text: `${diffMins}m ago`, isRecent: true };
    if (diffHours < 24) return { text: `${diffHours}h ago`, isRecent: diffHours < 12 };
    if (diffDays === 1) return { text: 'Yesterday', isRecent: false };
    if (diffDays < 7) return { text: `${diffDays}d ago`, isRecent: false };

    return { 
      text: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), 
      isRecent: false 
    };
  } catch {
    return { text: 'Never', isRecent: false };
  }
}

export default function AutomationsView({ darkMode = true }: ViewProps) {
  const isLoading = useAutoLayoutStore((s) => s.isLoading);
  const domainGroups = useAutoLayoutStore(useShallow(s => s.domainGroups));
  const rawAreas = useAutoLayoutStore(useShallow(s => s.rawAreas));
  const callHAService = useAutoLayoutStore(s => s.callHAService);
  const updateEntityState = useAutoLayoutStore(s => s.updateEntityState);

  // State Management
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'name',
    direction: 'ascending'
  });
  const [triggeredFeedback, setTriggeredFeedback] = useState<Record<string, boolean>>({});

  // Areas map
  const areasMap = useMemo(() => {
    const map: Record<string, string> = {};
    rawAreas.forEach(a => {
      map[a.area_id] = a.name;
    });
    return map;
  }, [rawAreas]);

  // Extract automations & scenes (excluding disabled)
  const automationEntities = (domainGroups['automation'] || []).filter((a) => !a.disabled_by);
  const sceneEntities = (domainGroups['scene'] || []).filter((s) => !s.disabled_by);
  const allEntities = useMemo(() => [...automationEntities, ...sceneEntities], [automationEntities, sceneEntities]);

  // Unique areas
  const availableAreas = useMemo(() => {
    const areaSet = new Set<string>();
    allEntities.forEach(e => {
      if (e.area_id) areaSet.add(e.area_id);
    });
    return Array.from(areaSet);
  }, [allEntities]);

  const activeCount = useMemo(() => {
    return automationEntities.filter(e => e.state === 'on').length;
  }, [automationEntities]);

  const filterTabs: SectionTabItem[] = useMemo(() => [
    { id: 'all', label: 'All Routines', badge: allEntities.length },
    { id: 'automations', label: 'Automations', badge: automationEntities.length },
    { id: 'scenes', label: 'Scenes', badge: sceneEntities.length },
    { id: 'active', label: 'Active', badge: activeCount, badgeColor: 'bg-emerald-500/20 text-emerald-300 font-bold' },
    { id: 'disabled', label: 'Paused', badge: automationEntities.length - activeCount }
  ], [allEntities.length, automationEntities.length, sceneEntities.length, activeCount]);

  // Trigger automation / scene
  const handleTrigger = async (e: React.MouseEvent, entity: ResolvedEntity) => {
    e.stopPropagation();
    const isScene = entity.domain === 'scene';
    const domain = isScene ? 'scene' : 'automation';
    const service = isScene ? 'turn_on' : 'trigger';

    setTriggeredFeedback(prev => ({ ...prev, [entity.entity_id]: true }));
    await callHAService(domain, service, { entity_id: entity.entity_id });

    setTimeout(() => {
      setTriggeredFeedback(prev => ({ ...prev, [entity.entity_id]: false }));
    }, 1500);
  };

  // Toggle automation ON / OFF
  const handleToggleAutomation = async (e: React.MouseEvent, entity: ResolvedEntity) => {
    e.stopPropagation();
    const isCurrentlyOn = entity.state === 'on';
    const targetService = isCurrentlyOn ? 'turn_off' : 'turn_on';

    updateEntityState(entity.entity_id, isCurrentlyOn ? 'off' : 'on');
    await callHAService('automation', targetService, { entity_id: entity.entity_id });
  };

  // Batch toggle
  const handleBatchToggle = async (turnOn: boolean) => {
    const targetService = turnOn ? 'turn_on' : 'turn_off';
    const automationsToUpdate = allEntities.filter(e => e.domain === 'automation');
    
    automationsToUpdate.forEach(a => {
      updateEntityState(a.entity_id, turnOn ? 'on' : 'off');
    });

    for (const a of automationsToUpdate) {
      callHAService('automation', targetService, { entity_id: a.entity_id });
    }
  };

  // Filtered & Sorted Table Items
  const sortedItems = useMemo(() => {
    let filtered = allEntities;

    if (activeTab === 'automations') {
      filtered = filtered.filter(e => e.domain === 'automation');
    } else if (activeTab === 'scenes') {
      filtered = filtered.filter(e => e.domain === 'scene');
    } else if (activeTab === 'active') {
      filtered = filtered.filter(e => e.domain === 'automation' && e.state === 'on');
    } else if (activeTab === 'disabled') {
      filtered = filtered.filter(e => e.domain === 'automation' && e.state === 'off');
    }

    if (selectedAreaFilter !== 'all') {
      filtered = filtered.filter(e => e.area_id === selectedAreaFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e => {
        const name = (e.name || e.entity_id).toLowerCase();
        const area = (e.area_id ? areasMap[e.area_id] || e.area_id : '').toLowerCase();
        const labels = (e.labels || []).map(l => l.toLowerCase()).join(' ');
        return name.includes(q) || area.includes(q) || labels.includes(q) || e.entity_id.toLowerCase().includes(q);
      });
    }

    return [...filtered].sort((a, b) => {
      const col = sortDescriptor.column as string;
      const isAsc = sortDescriptor.direction === 'ascending';

      if (col === 'name') {
        const valA = (a.name || a.entity_id).toLowerCase();
        const valB = (b.name || b.entity_id).toLowerCase();
        return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (col === 'status') {
        const valA = a.state || '';
        const valB = b.state || '';
        return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (col === 'last_triggered') {
        const timeA = new Date(a.attributes?.last_triggered || a.last_updated || 0).getTime();
        const timeB = new Date(b.attributes?.last_triggered || b.last_updated || 0).getTime();
        return isAsc ? timeA - timeB : timeB - timeA;
      }
      if (col === 'area') {
        const areaA = areasMap[a.area_id || ''] || '';
        const areaB = areasMap[b.area_id || ''] || '';
        return isAsc ? areaA.localeCompare(areaB) : areaB.localeCompare(areaA);
      }
      return 0;
    });
  }, [allEntities, activeTab, selectedAreaFilter, searchQuery, sortDescriptor, areasMap]);

  if (isLoading) {
    return (
      <ViewLoadingState
        title="Loading Automations & Scenes..."
        subtitle="Fetching automation triggers, scene presets, and schedules"
        darkMode={darkMode}
      />
    );
  }

  if (allEntities.length === 0) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center pb-24 md:pb-8">
        <ViewEmptyState
          icon={GitFork}
          title="No Automations or Scenes Configured"
          badgeText="Smart Routines"
          description="Create smart automations, routines, and scene presets in Home Assistant to automate lighting, climate, security, and cleaning schedules."
          configPath="Settings → Automations & Scenes"
          darkMode={darkMode}
        />
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col gap-6 animate-fadeIn pb-24 md:pb-8">
      {/* Top Floating Controls Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <AdaptiveSectionTabs
          tabs={filterTabs}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as FilterTab)}
          darkMode={darkMode}
        />

        {/* Search & Area Filter */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap ml-auto">
          {availableAreas.length > 0 && (
            <div className="w-40">
              <CustomDropdown
                value={selectedAreaFilter}
                onChange={(val) => setSelectedAreaFilter(val)}
                size="sm"
                options={[
                  { value: 'all', label: 'All Rooms' },
                  ...availableAreas.map(areaId => ({
                    value: areaId,
                    label: areasMap[areaId] || areaId
                  }))
                ]}
              />
            </div>
          )}

          <div
            className={`relative flex items-center px-3 py-1.5 rounded-2xl text-xs backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
              darkMode ? 'bg-black/20 text-white' : 'bg-white/20 text-slate-800'
            }`}
          >
            <MagnifyingGlass size={15} className="text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search routines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none text-xs w-36 sm:w-48"
            />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <TableCard.Root className={darkMode ? 'bg-black/20 backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)]' : 'bg-white/20 backdrop-blur-sm shadow-[4px_6px_12px_rgba(0,0,0,0.15)]'}>
        <TableCard.Header
          title="Automations & Scenes"
          badge={`${sortedItems.length} routines`}
          contentTrailing={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleBatchToggle(true)}
                className="h-8 px-3 rounded-xl text-xs font-bold bg-violet-500/15 hover:bg-violet-500/25 text-violet-600 dark:text-violet-300 transition-all cursor-pointer"
              >
                Enable All
              </button>
              <button
                type="button"
                onClick={() => handleBatchToggle(false)}
                className="h-8 px-3 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              >
                Pause All
              </button>
            </div>
          }
        />

        <Table
          aria-label="Automations and Scenes Table"
          sortDescriptor={sortDescriptor}
          onSortChange={setSortDescriptor}
          className="min-w-full"
        >
          <Table.Header>
            <Table.Head id="name" allowsSorting isRowHeader className="w-2/5">
              Routine
            </Table.Head>
            <Table.Head id="area" allowsSorting className="w-1/6">
              Room
            </Table.Head>
            <Table.Head id="last_triggered" allowsSorting className="w-1/6">
              Last Triggered
            </Table.Head>
            <Table.Head id="status" allowsSorting className="w-1/6">
              State
            </Table.Head>
            <Table.Head id="actions" className="w-1/6 text-right">
              Actions
            </Table.Head>
          </Table.Header>

          <Table.Body items={sortedItems}>
            {(item) => {
              const isScene = item.domain === 'scene';
              const isOn = item.state === 'on';
              const isTriggered = !!triggeredFeedback[item.entity_id];
              const lastRun = formatLastTriggered(item.attributes?.last_triggered || item.last_updated);
              const areaName = item.area_id ? areasMap[item.area_id] || item.area_id : null;

              return (
                <Table.Row key={item.entity_id} id={item.entity_id}>
                  {/* Column 1: Routine Name & Icon */}
                  <Table.Cell>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isScene 
                          ? 'bg-violet-500/15 text-violet-400' 
                          : isOn 
                          ? 'bg-emerald-500/15 text-emerald-400' 
                          : 'bg-white/5 text-slate-400'
                      }`}>
                        {getEntityIcon(item)}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className={`text-xs sm:text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {item.name || item.entity_id}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {item.entity_id}
                        </span>
                      </div>
                    </div>
                  </Table.Cell>

                  {/* Column 2: Area */}
                  <Table.Cell>
                    {areaName ? (
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        {areaName}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 dark:text-slate-500">—</span>
                    )}
                  </Table.Cell>

                  {/* Column 3: Last Triggered */}
                  <Table.Cell>
                    <span className={`text-xs font-mono font-medium ${
                      lastRun.isRecent ? 'text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {lastRun.text}
                    </span>
                  </Table.Cell>

                  {/* Column 4: State */}
                  <Table.Cell>
                    {isScene ? (
                      <Badge color="purple" size="sm">
                        Scene
                      </Badge>
                    ) : isOn ? (
                      <BadgeWithDot color="success" size="sm">
                        Active
                      </BadgeWithDot>
                    ) : (
                      <BadgeWithDot color="gray" size="sm">
                        Paused
                      </BadgeWithDot>
                    )}
                  </Table.Cell>

                  {/* Column 5: Action Buttons */}
                  <Table.Cell>
                    <div className="flex items-center justify-end gap-2">
                      {/* Trigger Button */}
                      <button
                        type="button"
                        onClick={(e) => handleTrigger(e, item)}
                        title="Run this routine now"
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                          isTriggered
                            ? 'bg-emerald-500 text-slate-950 font-black'
                            : darkMode
                            ? 'bg-white/10 hover:bg-white/20 text-white'
                            : 'bg-slate-900/[0.04] hover:bg-slate-900/[0.08] text-slate-800'
                        }`}
                      >
                        {isTriggered ? (
                          <>
                            <Check size={13} weight="bold" />
                            <span>Ran</span>
                          </>
                        ) : (
                          <>
                            <Play size={13} weight="fill" />
                            <span>Run</span>
                          </>
                        )}
                      </button>

                      {/* Enable/Disable Switch (Automations only) */}
                      {!isScene && (
                        <button
                          type="button"
                          onClick={(e) => handleToggleAutomation(e, item)}
                          title={isOn ? 'Pause automation' : 'Enable automation'}
                          className={`p-1.5 rounded-xl transition-all cursor-pointer active:scale-95 ${
                            isOn
                              ? 'text-emerald-400 hover:bg-emerald-500/15'
                              : 'text-slate-500 hover:bg-white/10'
                          }`}
                        >
                          <Power size={16} weight="bold" />
                        </button>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              );
            }}
          </Table.Body>
        </Table>
      </TableCard.Root>
    </div>
  );
}
