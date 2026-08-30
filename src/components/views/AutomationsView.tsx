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

// Format relative last triggered time
function formatLastTriggered(isoString?: string | null): { text: string; isRecent: boolean } {
  if (!isoString) return { text: 'Never', isRecent: false };
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return { text: 'Never', isRecent: false };

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
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

  // Extract automations & scenes
  const automationEntities = domainGroups['automation'] || [];
  const sceneEntities = domainGroups['scene'] || [];
  const allEntities = useMemo(() => [...automationEntities, ...sceneEntities], [automationEntities, sceneEntities]);

  // Unique areas
  const availableAreas = useMemo(() => {
    const areaSet = new Set<string>();
    allEntities.forEach(e => {
      if (e.area_id) areaSet.add(e.area_id);
    });
    return Array.from(areaSet);
  }, [allEntities]);

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
        const valA = a.domain === 'scene' ? 'scene' : a.state;
        const valB = b.domain === 'scene' ? 'scene' : b.state;
        return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (col === 'area') {
        const valA = (a.area_id ? areasMap[a.area_id] || a.area_id : 'Global').toLowerCase();
        const valB = (b.area_id ? areasMap[b.area_id] || b.area_id : 'Global').toLowerCase();
        return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      // last_triggered
      const timeA = new Date(a.attributes?.last_triggered || (a.domain === 'scene' ? a.state : 0)).getTime() || 0;
      const timeB = new Date(b.attributes?.last_triggered || (b.domain === 'scene' ? b.state : 0)).getTime() || 0;
      return isAsc ? timeA - timeB : timeB - timeA;
    });
  }, [allEntities, activeTab, selectedAreaFilter, searchQuery, sortDescriptor, areasMap]);

  const activeCount = automationEntities.filter(a => a.state === 'on').length;

  if (isLoading) {
    return <ViewLoadingState title="Loading Automations & Scenes..." subtitle="Fetching automation triggers, scene presets, and schedules" darkMode={darkMode} />;
  }

  if (allEntities.length === 0) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center">
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
    <div className="w-full flex-1 flex flex-col space-y-5">
      
      {/* Search and Filters Bar */}
      <div className={`p-3 sm:p-3.5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${
        darkMode ? 'bg-slate-900/90 text-white' : 'bg-slate-100/90 text-slate-900 shadow-xs'
      }`}>
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto touch-scroll-container pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All', count: allEntities.length },
            { id: 'automations', label: 'Automations', count: automationEntities.length },
            { id: 'scenes', label: 'Scenes', count: sceneEntities.length },
            { id: 'active', label: 'Active', count: activeCount },
            { id: 'disabled', label: 'Disabled', count: automationEntities.length - activeCount }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as FilterTab)}
              className={`h-8 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                activeTab === tab.id
                  ? darkMode
                    ? 'bg-violet-500 text-white border-violet-400 shadow-xs'
                    : 'bg-violet-600 text-white border-violet-600 shadow-xs'
                  : darkMode
                    ? 'bg-white/5 text-slate-300 hover:bg-white/10 border-white/10'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === tab.id 
                  ? 'bg-white/20 text-white' 
                  : darkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-200 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Area Filter */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Area Filter */}
          <div className="w-44">
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

          {/* Search Box */}
          <div className="relative flex-1 sm:w-56">
            <MagnifyingGlass size={14} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by name, area, tag..."
              className={`w-full h-8 pl-8 pr-3 rounded-xl text-xs font-medium border outline-none transition-all ${
                darkMode
                  ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-violet-400'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-500'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Untitled UI Table with Alternating Fills */}
      <TableCard.Root className={darkMode ? 'bg-black/60 backdrop-blur-md border border-white/10 shadow-lg' : 'bg-white/70 backdrop-blur-md border border-slate-200/90 shadow-sm'}>
        <TableCard.Header
          title="Automations & Scenes"
          badge={`${sortedItems.length} items`}
          description="Manage, trigger, and toggle smart automations and scene presets configured in Home Assistant."
          contentTrailing={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleBatchToggle(true)}
                className="h-8 px-2.5 rounded-xl text-xs font-bold bg-violet-500/15 hover:bg-violet-500/25 text-violet-600 dark:text-violet-300 border border-violet-500/30 transition-all cursor-pointer"
              >
                Enable All
              </button>
              <button
                type="button"
                onClick={() => handleBatchToggle(false)}
                className="h-8 px-2.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all cursor-pointer"
              >
                Pause All
              </button>
            </div>
          }
        />

        <Table 
          aria-label="Automations and Scenes" 
          sortDescriptor={sortDescriptor} 
          onSortChange={setSortDescriptor}
          size="sm"
        >
          <Table.Header className={darkMode ? 'bg-neutral-900/80 border-b border-white/10' : 'bg-slate-50 border-b border-slate-200'}>
            <Table.Head id="name" label="Name" isRowHeader allowsSorting className="w-2/5 min-w-[220px]" />
            <Table.Head id="status" label="Status" allowsSorting className="min-w-[140px]" />
            <Table.Head id="area" label="Area" allowsSorting className="min-w-[120px]" />
            <Table.Head id="last_triggered" label="Last Triggered" allowsSorting className="min-w-[130px]" />
            <Table.Head id="labels" label="Tags" className="hidden md:table-cell min-w-[140px]" />
            <Table.Head id="actions" label="Action" className="text-right pr-5 min-w-[100px]" />
          </Table.Header>

          <Table.Body items={sortedItems}>
            {(item) => {
              const isScene = item.domain === 'scene';
              const isAutomation = item.domain === 'automation';
              const isEnabled = item.state === 'on';
              const isTriggered = !!triggeredFeedback[item.entity_id];
              const { text: lastTriggeredText, isRecent } = formatLastTriggered(item.attributes?.last_triggered || (isScene ? item.state : null));
              const areaName = item.area_id ? (areasMap[item.area_id] || item.area_id) : 'Global';
              const entityIcon = getEntityIcon(item);

              return (
                <Table.Row 
                  id={item.entity_id} 
                  className={`transition-colors border-b border-white/5 dark:border-white/5 ${
                    darkMode 
                      ? 'odd:bg-neutral-950/40 even:bg-black/30 hover:bg-white/5' 
                      : 'odd:bg-slate-50/70 even:bg-white hover:bg-slate-100/60'
                  }`}
                >
                  {/* Name & Details Column */}
                  <Table.Cell>
                    <div className="flex items-center gap-3 py-1">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                        isTriggered
                          ? 'bg-violet-500 text-white border-violet-400 animate-pulse'
                          : isEnabled || isScene
                            ? 'bg-violet-500/15 border-violet-500/30 text-violet-400'
                            : 'bg-white/5 border-white/10 text-slate-400'
                      }`}>
                        {isTriggered ? <Check size={16} weight="bold" /> : entityIcon}
                      </div>
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs font-mono">
                          {item.entity_id}
                        </p>
                      </div>
                    </div>
                  </Table.Cell>

                  {/* Status & Toggle Column */}
                  <Table.Cell>
                    <div className="flex items-center gap-2.5">
                      {isScene ? (
                        <Badge color="purple" size="sm" type="pill-color">
                          Scene Preset
                        </Badge>
                      ) : (
                        <>
                          <BadgeWithDot size="sm" color={isEnabled ? 'success' : 'gray'} type="modern">
                            {isEnabled ? 'Active' : 'Paused'}
                          </BadgeWithDot>
                          
                          <button
                            type="button"
                            onClick={(e) => handleToggleAutomation(e, item)}
                            title={isEnabled ? 'Click to pause' : 'Click to activate'}
                            className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer p-0.5 shrink-0 ${
                              isEnabled ? 'bg-violet-500' : darkMode ? 'bg-slate-700' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`block w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${
                                isEnabled ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </>
                      )}
                    </div>
                  </Table.Cell>

                  {/* Area Column */}
                  <Table.Cell>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <House size={13} weight="duotone" className="text-slate-400" />
                      <span>{areaName}</span>
                    </span>
                  </Table.Cell>

                  {/* Last Triggered Column */}
                  <Table.Cell>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                      <Clock size={13} weight="duotone" className={isRecent ? 'text-amber-400' : 'text-slate-400'} />
                      <span>{lastTriggeredText}</span>
                    </span>
                  </Table.Cell>

                  {/* Labels / Tags Column */}
                  <Table.Cell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(item.labels || []).slice(0, 2).map(label => (
                        <span 
                          key={label} 
                          className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20"
                        >
                          #{label}
                        </span>
                      ))}
                      {(!item.labels || item.labels.length === 0) && (
                        <span className="text-[11px] text-slate-400 italic">None</span>
                      )}
                    </div>
                  </Table.Cell>

                  {/* Actions Column */}
                  <Table.Cell className="text-right pr-4">
                    <button
                      type="button"
                      onClick={(e) => handleTrigger(e, item)}
                      title={isScene ? 'Activate Scene' : 'Trigger Automation'}
                      className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95 border ${
                        isTriggered
                          ? 'bg-emerald-500 text-white border-emerald-400 shadow-xs'
                          : isScene
                            ? 'bg-violet-500/15 hover:bg-violet-500/25 text-violet-400 border-violet-500/30'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
                      }`}
                    >
                      {isTriggered ? (
                        <>
                          <Check size={12} weight="bold" />
                          <span>Ran</span>
                        </>
                      ) : (
                        <>
                          <Play size={11} weight="fill" className={isScene ? 'text-violet-400' : 'text-slate-400'} />
                          <span>{isScene ? 'Activate' : 'Run'}</span>
                        </>
                      )}
                    </button>
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
