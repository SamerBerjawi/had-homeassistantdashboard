/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SlidersHorizontal, HouseLine, Cpu, Eye, EyeSlash, MagnifyingGlass, CaretDown, CaretRight, DoorOpen, Gauge, ListBullets, X, CheckSquare, Square, WarningOctagon, FolderSimple } from '@phosphor-icons/react';
import type { DeviceVisibilityState } from './useDeviceVisibilityState';

export default function VisibilityPanel({ s }: { s: DeviceVisibilityState }) {
  const {
    activeCategoryEntityIds,
    activeCategoryHiddenCount,
    activeCategoryInfo,
    activeCategoryTotalCount,
    activeCategoryVisibleCount,
    activeMatchingEntities,
    allCollapsed,
    allResolvedList,
    binarySubcategory,
    binarySubcategoryConfigs,
    categoryConfigs,
    categoryFilter,
    classifyBinarySensor,
    classifySensor,
    collapsedGroups,
    groupedData,
    groupingMode,
    handleBulkSetVisibility,
    handleSelectAllFiltered,
    handleSelectGroup,
    handleToggleExpandCollapseAll,
    isEntityHidden,
    offlineOnlyFilter,
    renderEntityRow,
    renderIconByName,
    searchQuery,
    selectedEntityIds,
    sensorSubcategory,
    sensorSubcategoryConfigs,
    setBinarySubcategory,
    setCategoryFilter,
    setCollapsedGroups,
    setGroupingMode,
    setOfflineOnlyFilter,
    setSearchQuery,
    setSelectedEntityIds,
    setSensorSubcategory,
    setVisibilityFilter,
    visibilityFilter
  } = s;
  return (
    <div className="space-y-4">
      {/* Quick Category Filter Bar */}
      <div className="p-3 sm:p-4 rounded-3xl bg-white/70 dark:bg-black/25 border border-slate-200/90 dark:border-white/10 backdrop-blur-md shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <SlidersHorizontal size={14} weight="bold" className="text-sky-500" />
            <span>Categories</span>
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {allResolvedList.length} Total Registered
          </span>
        </div>

        {/* Scrollable Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 touch-scroll-x custom-scrollbar">
          {categoryConfigs.map(cat => {
            const isSelected = categoryFilter === cat.id;
            const IconComponent = cat.icon;
            
            const catEntities = cat.id === 'all'
              ? allResolvedList
              : cat.id === 'other'
                ? allResolvedList.filter(e => ![
                    'light', 'switch', 'climate', 'fan', 'cover', 'lock',
                    'media_player', 'camera', 'vacuum', 'binary_sensor', 'sensor'
                  ].includes(e.domain))
                : allResolvedList.filter(e => e.domain === cat.id);

            const count = catEntities.length;
            if (count === 0 && cat.id !== 'all') return null;
            const catVisible = catEntities.filter(e => !isEntityHidden(e)).length;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCategoryFilter(cat.id);
                  if (cat.id === 'binary_sensor') setBinarySubcategory('all');
                  if (cat.id === 'sensor') setSensorSubcategory('all');
                }}
                className={`flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                  isSelected
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-md scale-102 border-transparent'
                    : 'bg-white/80 dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                }`}
              >
                <IconComponent
                  size={16}
                  weight={isSelected ? 'fill' : 'duotone'}
                  style={{ color: isSelected ? undefined : cat.color }}
                />
                <span>{cat.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] sm:text-[11px] font-mono font-bold ${
                  isSelected
                    ? 'bg-white/20 dark:bg-black/20 text-white dark:text-black'
                    : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                }`}>
                  {catVisible}/{count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Granular Sub-Category Filter Bar for Binary Sensors */}
        {categoryFilter === 'binary_sensor' && (
          <div className="pt-2.5 border-t border-slate-200/80 dark:border-white/5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                <DoorOpen size={14} weight="bold" />
                <span>Binary Sensor Sub-Classifications</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 touch-scroll-x custom-scrollbar">
              {binarySubcategoryConfigs.map(sub => {
                const isSubSelected = binarySubcategory === sub.id;
                const SubIcon = sub.icon;
                const subEntities = sub.id === 'all'
                  ? allResolvedList.filter(e => e.domain === 'binary_sensor')
                  : allResolvedList.filter(e => e.domain === 'binary_sensor' && classifyBinarySensor(e) === sub.id);
                
                const count = subEntities.length;
                if (count === 0 && sub.id !== 'all') return null;
                const subVis = subEntities.filter(e => !isEntityHidden(e)).length;

                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setBinarySubcategory(sub.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                      isSubSelected
                        ? 'bg-teal-500 text-white border-teal-400 shadow-sm'
                        : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-teal-50 dark:hover:bg-teal-500/10'
                    }`}
                  >
                    <SubIcon size={14} weight={isSubSelected ? 'bold' : 'duotone'} />
                    <span>{sub.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[11px] font-mono ${
                      isSubSelected ? 'bg-black/20 text-white font-bold' : 'bg-slate-100 dark:bg-white/10 text-slate-500'
                    }`}>
                      {subVis}/{count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Granular Sub-Category Filter Bar for Numerical Sensors */}
        {categoryFilter === 'sensor' && (
          <div className="pt-2.5 border-t border-slate-200/80 dark:border-white/5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Gauge size={14} weight="bold" />
                <span>Sensor Sub-Classifications</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 touch-scroll-x custom-scrollbar">
              {sensorSubcategoryConfigs.map(sub => {
                const isSubSelected = sensorSubcategory === sub.id;
                const SubIcon = sub.icon;
                const subEntities = sub.id === 'all'
                  ? allResolvedList.filter(e => e.domain === 'sensor')
                  : allResolvedList.filter(e => e.domain === 'sensor' && classifySensor(e) === sub.id);
                
                const count = subEntities.length;
                if (count === 0 && sub.id !== 'all') return null;
                const subVis = subEntities.filter(e => !isEntityHidden(e)).length;

                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSensorSubcategory(sub.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                      isSubSelected
                        ? 'bg-indigo-500 text-white border-indigo-400 shadow-sm'
                        : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-indigo-50 dark:hover:bg-indigo-500/10'
                    }`}
                  >
                    <SubIcon size={14} weight={isSubSelected ? 'bold' : 'duotone'} />
                    <span>{sub.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[11px] font-mono ${
                      isSubSelected ? 'bg-black/20 text-white font-bold' : 'bg-slate-100 dark:bg-white/10 text-slate-500'
                    }`}>
                      {subVis}/{count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Search, Filter & Grouping Controls Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-50/90 dark:bg-white/2 border border-slate-200 dark:border-white/10 backdrop-blur-md space-y-4 shadow-xs">
        {/* Top Row: Search Input + Visibility Segmented Control */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search input with clear button */}
          <div className="relative flex-1 w-full">
            <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, entity_id, room, device, domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-white dark:bg-black/40 border border-slate-300 dark:border-white/15 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 shadow-xs"
            />
            {searchQuery && (
              <button aria-label="Close"
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X size={14} weight="bold" />
              </button>
            )}
          </div>

          {/* Segmented Visibility Filter (All / Visible / Hidden) */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-200/80 dark:bg-white/10 border border-slate-300/80 dark:border-white/10 shrink-0">
            {(['all', 'visible', 'hidden'] as const).map(mode => {
              const isSel = visibilityFilter === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setVisibilityFilter(mode)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                    isSel
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              );
            })}
          </div>

          {/* Offline / Unavailable filter pill */}
          <button
            type="button"
            onClick={() => setOfflineOnlyFilter(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold border transition-all cursor-pointer shrink-0 ${
              offlineOnlyFilter
                ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
            title="Filter to entities currently offline or unavailable"
          >
            <WarningOctagon size={15} weight={offlineOnlyFilter ? 'fill' : 'duotone'} />
            <span>Offline Only</span>
          </button>
        </div>

        {/* Bottom Row: Grouping Selector + Category Bulk Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-white/5">
          {/* Grouping Mode Switcher */}
          <div className="flex items-center gap-2 flex-wrap max-w-full">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Group By:</span>
            <div className="flex items-center p-1 rounded-2xl bg-slate-200/80 dark:bg-white/10 border border-slate-300/80 dark:border-white/10 overflow-x-auto touch-scroll-x custom-scrollbar max-w-full">
              <button
                type="button"
                onClick={() => setGroupingMode('domain')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  groupingMode === 'domain'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FolderSimple size={14} weight="bold" />
                <span>Domain</span>
              </button>

              <button
                type="button"
                onClick={() => setGroupingMode('area')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  groupingMode === 'area'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <HouseLine size={14} weight="bold" />
                <span>Room / Area</span>
              </button>

              <button
                type="button"
                onClick={() => setGroupingMode('device')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  groupingMode === 'device'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Cpu size={14} weight="bold" />
                <span>Device</span>
              </button>

              <button
                type="button"
                onClick={() => setGroupingMode('flat')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  groupingMode === 'flat'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ListBullets size={14} weight="bold" />
                <span>Flat List</span>
              </button>
            </div>

            {groupingMode !== 'flat' && (
              <button
                type="button"
                onClick={handleToggleExpandCollapseAll}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
              >
                {allCollapsed ? 'Expand All' : 'Collapse All'}
              </button>
            )}
          </div>

          {/* Category Bulk Toggles / Search Result Bulk Toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            {searchQuery.trim() ? (
              // Search specific bulk actions
              <>
                <button
                  type="button"
                  onClick={() => handleBulkSetVisibility(activeMatchingEntities.map(e => e.entity_id), false, `Search "${searchQuery}"`)}
                  disabled={activeMatchingEntities.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white border border-emerald-400 shadow-xs cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Eye size={14} weight="bold" />
                  <span>Show All Matches ({activeMatchingEntities.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkSetVisibility(activeMatchingEntities.map(e => e.entity_id), true, `Search "${searchQuery}"`)}
                  disabled={activeMatchingEntities.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-white border border-amber-400 shadow-xs cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <EyeSlash size={14} weight="bold" />
                  <span>Hide All Matches</span>
                </button>
              </>
            ) : (
              // Category specific bulk actions
              <>
                <button
                  type="button"
                  onClick={() => handleBulkSetVisibility(activeCategoryEntityIds, false, activeCategoryInfo.title)}
                  disabled={activeCategoryTotalCount === 0 || activeCategoryHiddenCount === 0}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-xs ${
                    activeCategoryHiddenCount > 0
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-400 active:scale-95'
                      : 'bg-emerald-500/10 text-emerald-600/50 dark:text-emerald-400/40 border-emerald-500/15 cursor-not-allowed'
                  }`}
                  title={`Show all ${activeCategoryTotalCount} ${activeCategoryInfo.title}`}
                >
                  <Eye size={14} weight="bold" />
                  <span>Show All {activeCategoryInfo.title}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkSetVisibility(activeCategoryEntityIds, true, activeCategoryInfo.title)}
                  disabled={activeCategoryTotalCount === 0 || activeCategoryVisibleCount === 0}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-xs ${
                    activeCategoryVisibleCount > 0
                      ? 'bg-amber-500 hover:bg-amber-400 text-white border-amber-400 active:scale-95'
                      : 'bg-amber-500/10 text-amber-600/50 dark:text-amber-400/40 border-amber-500/15 cursor-not-allowed'
                  }`}
                  title={`Hide all ${activeCategoryTotalCount} ${activeCategoryInfo.title}`}
                >
                  <EyeSlash size={14} weight="bold" />
                  <span>Hide All {activeCategoryInfo.title}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Search matches notice if searching */}
      {searchQuery.trim() && (
        <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300 text-xs">
          <span className="flex items-center gap-2">
            <MagnifyingGlass size={15} weight="bold" />
            <span>Found <strong>{activeMatchingEntities.length}</strong> entities matching "<strong>{searchQuery}</strong>"</span>
          </span>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ENTITY LISTINGS: GROUPED OR FLAT */}
      {/* ========================================================================= */}
      {activeMatchingEntities.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-white/10 bg-white/40 dark:bg-white/1 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-400 flex items-center justify-center mx-auto">
            <MagnifyingGlass size={24} weight="duotone" />
          </div>
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            No entities found
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No entities match your current filters and search query. Try clearing the search or switching the category filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('all');
              setVisibilityFilter('all');
              setOfflineOnlyFilter(false);
            }}
            className="px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-bold shadow-xs hover:bg-sky-400 transition-colors cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : groupingMode === 'flat' ? (
        // Flat List Rendering
        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/2 p-3 sm:p-4 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-2 py-1">
            <span>All Matching Entities ({activeMatchingEntities.length})</span>
            <button
              type="button"
              onClick={() => handleSelectAllFiltered(selectedEntityIds.size !== activeMatchingEntities.length)}
              className="text-sky-600 dark:text-sky-400 hover:underline font-semibold cursor-pointer"
            >
              {selectedEntityIds.size === activeMatchingEntities.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="space-y-2">
            {activeMatchingEntities.map(entity => renderEntityRow(entity))}
          </div>
        </div>
      ) : (
        // Grouped Accordion Cards (Domain, Area, Device)
        <div className="space-y-3.5">
          {groupedData.map(group => {
            const isCollapsed = Boolean(collapsedGroups[group.id]);
            const IconComponent = group.icon;
            const isAllSelected = group.allEntityIds.length > 0 && group.allEntityIds.every(id => selectedEntityIds.has(id));
            const isPartiallySelected = !isAllSelected && group.allEntityIds.some(id => selectedEntityIds.has(id));

            return (
              <div
                key={group.id}
                className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/2 overflow-hidden shadow-xs transition-all"
              >
                {/* Group Header Card */}
                <div className="p-3 sm:p-4 bg-slate-100/80 dark:bg-white/4 border-b border-slate-200/80 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                  {/* Top Row / Left Side: Checkbox + Chevron + Icon + Title + (Mobile Count Badge) */}
                  <div className="flex items-center justify-between gap-2 min-w-0 w-full sm:w-auto sm:flex-1">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      {/* Group Multi-Select Checkbox */}
                      <button
                        type="button"
                        onClick={() => handleSelectGroup(group.allEntityIds, !isAllSelected)}
                        className="p-1 rounded-lg text-slate-400 hover:text-sky-500 transition-colors shrink-0 cursor-pointer"
                        title={isAllSelected ? 'Deselect entire group' : 'Select entire group'}
                      >
                        {isAllSelected ? (
                          <CheckSquare size={20} weight="fill" className="text-sky-500" />
                        ) : isPartiallySelected ? (
                          <CheckSquare size={20} weight="duotone" className="text-sky-500 opacity-70" />
                        ) : (
                          <Square size={20} className="text-slate-300 dark:text-slate-600 hover:text-slate-400" />
                        )}
                      </button>

                      {/* Chevron + Icon + Title */}
                      <div
                        onClick={() => setCollapsedGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                        className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none min-w-0 flex-1 group"
                       role="button" tabIndex={0} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.currentTarget.click(); } }}>
                        <button type="button" className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-transform shrink-0">
                          {isCollapsed ? <CaretRight size={18} weight="bold" /> : <CaretDown size={18} weight="bold" />}
                        </button>

                        <div
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center border shadow-2xs shrink-0"
                          style={{
                            backgroundColor: `${group.color || '#0ea5e9'}15`,
                            borderColor: `${group.color || '#0ea5e9'}35`,
                            color: group.color || '#0ea5e9'
                          }}
                        >
                          {typeof IconComponent === 'function' ? (
                            <IconComponent size={18} weight="duotone" />
                          ) : (
                            renderIconByName(IconComponent, 18)
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white group-hover:text-sky-500 transition-colors truncate">
                            {group.title}
                          </h4>
                          {group.subtitle && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate block">
                              {group.subtitle}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Count Badge on Mobile */}
                    <span className={`sm:hidden text-xs font-mono font-bold px-2.5 py-1 rounded-xl border shrink-0 ${
                      group.visibleCount === group.totalCount
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                        : group.visibleCount === 0
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                          : 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30'
                    }`}>
                      {group.visibleCount} / {group.totalCount}
                    </span>
                  </div>

                  {/* Right Side / Bottom Row: Desktop Count Badge + 1-Tap Show All / Hide All */}
                  <div className="flex items-center gap-2 shrink-0 justify-end sm:justify-start pl-[52px] sm:pl-0 w-full sm:w-auto">
                    {/* Desktop Count Badge */}
                    <span className={`hidden sm:inline-block text-xs font-mono font-bold px-2.5 py-1 rounded-xl border ${
                      group.visibleCount === group.totalCount
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                        : group.visibleCount === 0
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                          : 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30'
                    }`}>
                      {group.visibleCount} / {group.totalCount}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleBulkSetVisibility(group.allEntityIds, false, group.title)}
                      disabled={group.visibleCount === group.totalCount}
                      className="flex-1 sm:flex-initial text-center px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-white dark:bg-white/10 hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 dark:text-slate-200 dark:hover:text-emerald-400 border border-slate-200 dark:border-white/10 text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Show All
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBulkSetVisibility(group.allEntityIds, true, group.title)}
                      disabled={group.visibleCount === 0}
                      className="flex-1 sm:flex-initial text-center px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-white dark:bg-white/10 hover:bg-amber-50 text-slate-700 hover:text-amber-600 dark:text-slate-200 dark:hover:text-amber-400 border border-slate-200 dark:border-white/10 text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Hide All
                    </button>
                  </div>
                </div>

                {/* Entities inside Group */}
                {!isCollapsed && (
                  <div className="p-3 sm:p-4 space-y-2">
                    {group.entities.map(entity => renderEntityRow(entity))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Multi-Select Action Bar (appears when 1 or more entities are selected) */}
      <AnimatePresence>
        {selectedEntityIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-5 inset-x-3 sm:inset-x-auto sm:right-8 z-50 sm:max-w-md p-3 sm:p-4 rounded-3xl bg-slate-900/95 dark:bg-slate-800/95 text-white border border-white/20 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0">
                <CheckSquare size={18} weight="bold" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold block">
                  {selectedEntityIds.size} Selected
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectAllFiltered(false)}
                  className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  handleBulkSetVisibility(Array.from(selectedEntityIds), false, 'Selected Entities');
                  setSelectedEntityIds(new Set());
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Eye size={14} weight="bold" />
                <span>Show ({selectedEntityIds.size})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleBulkSetVisibility(Array.from(selectedEntityIds), true, 'Selected Entities');
                  setSelectedEntityIds(new Set());
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <EyeSlash size={14} weight="bold" />
                <span>Hide ({selectedEntityIds.size})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedEntityIds(new Set())}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                title="Dismiss selection"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
