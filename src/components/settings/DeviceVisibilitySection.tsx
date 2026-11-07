/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Devices & Entity Visibility Subpage (Redesigned)
 * Features:
 * - 4 Clear Grouping Modes: By Domain, By Area, By Device, or Flat Searchable List
 * - Instant Search with match count indicator & 1-tap "Show All Results" / "Hide All Results"
 * - Multi-Select with floating bulk action bar (Show Selected, Hide Selected, Select/Deselect All)
 * - Quick Category Filter Pills with live count badges and subcategory drill-downs
 * - Group-level bulk toggles ("Show All", "Hide All", group checkbox selection)
 * - Responsive mobile-first Entity Rows with iOS-style toggle switches and touch-friendly targets
 * - Floor & Area Styling, Labels, and Zones management
 */

import React from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import EntityCustomizerModal from '../modals/EntityCustomizerModal';
import AdaptiveSectionTabs from '../common/AdaptiveSectionTabs';
import { useDeviceVisibilityState } from './deviceVisibility/useDeviceVisibilityState';
import type { DeviceVisibilitySectionProps } from './deviceVisibility/shared';
import EditFloorModal from './deviceVisibility/EditFloorModal';
import EditAreaModal from './deviceVisibility/EditAreaModal';
import EditLabelModal from './deviceVisibility/EditLabelModal';
import { NAVIGATION_PAGES } from './deviceVisibility/shared';

const PagesPanel = React.lazy(() => import('./deviceVisibility/PagesPanel'));
const VisibilityPanel = React.lazy(() => import('./deviceVisibility/VisibilityPanel'));
const StylingPanel = React.lazy(() => import('./deviceVisibility/StylingPanel'));
const LabelsPanel = React.lazy(() => import('./deviceVisibility/LabelsPanel'));
const ZonesPanel = React.lazy(() => import('./deviceVisibility/ZonesPanel'));

export default function DeviceVisibilitySection(props: DeviceVisibilitySectionProps) {
  const s = useDeviceVisibilityState(props);
  const {
    activeTab,
    addToast,
    customizingEntity,
    darkMode,
    editingArea,
    editingFloor,
    editingLabel,
    hiddenCount,
    hiddenPagesList,
    setActiveTab,
    setCustomizingEntity,
    subNavTabs,
    visibleCount,
    visiblePagesCount,
    visiblePercent
  } = s;

  return (
    <div className="space-y-4 w-full animate-in fade-in duration-200 pb-28 md:pb-8">
      {/* Top Floating AdaptiveSectionTabs & Visibility Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
        <div className="min-w-0 max-w-full">
          <AdaptiveSectionTabs
            tabs={subNavTabs}
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab as any)}
            darkMode={darkMode}
          />
        </div>

        {/* Global Visibility Summary Card with visual progress bar */}
        {activeTab === 'pages' ? (
          <div className="flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-white/70 dark:bg-black/30 border border-slate-200/90 dark:border-white/10 backdrop-blur-md text-xs shadow-xs font-mono self-start sm:self-auto">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-bold">
                <Eye size={14} weight="bold" /> {visiblePagesCount} Visible
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                <EyeSlash size={14} weight="bold" /> {hiddenPagesList.length} Hidden
              </span>
            </div>

            {/* Mini progress bar */}
            <div className="w-16 sm:w-24 h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden shrink-0">
              <div
                className="h-full bg-cyan-500 transition-all duration-300 rounded-full"
                style={{ width: `${Math.round((visiblePagesCount / NAVIGATION_PAGES.length) * 100)}%` }}
                title={`${Math.round((visiblePagesCount / NAVIGATION_PAGES.length) * 100)}% visible`}
              />
            </div>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {Math.round((visiblePagesCount / NAVIGATION_PAGES.length) * 100)}%
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-white/70 dark:bg-black/30 border border-slate-200/90 dark:border-white/10 backdrop-blur-md text-xs shadow-xs font-mono self-start sm:self-auto">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                <Eye size={14} weight="bold" /> {visibleCount}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                <EyeSlash size={14} weight="bold" /> {hiddenCount}
              </span>
            </div>

            {/* Mini progress bar */}
            <div className="w-16 sm:w-24 h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden shrink-0">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${visiblePercent}%` }}
                title={`${visiblePercent}% visible`}
              />
            </div>
            <span className="font-bold text-slate-700 dark:text-slate-300">{visiblePercent}%</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: NAVIGATION PAGES VISIBILITY */}
      {/* ========================================================================= */}
      <React.Suspense fallback={<div aria-hidden="true" className="h-64 w-full rounded-3xl bg-black/10 dark:bg-white/5 animate-pulse" />}>
        {activeTab === 'pages' && <PagesPanel s={s} />}

      {/* ========================================================================= */}
      {/* TAB 1: REDESIGNED ENTITY VISIBILITY MANAGER */}
      {/* ========================================================================= */}
      {activeTab === 'visibility' && <VisibilityPanel s={s} />}

      {/* ========================================================================= */}
      {/* TAB 2: ROOM ICONS & COLORS (Grouped strictly by Floor) */}
      {/* ========================================================================= */}
      {activeTab === 'styling' && <StylingPanel s={s} />}

      {/* ========================================================================= */}
      {/* TAB 3: LABELS */}
      {/* ========================================================================= */}
      {activeTab === 'labels' && <LabelsPanel s={s} />}

      {/* ========================================================================= */}
      {/* TAB 4: ZONES */}
      {/* ========================================================================= */}
      {activeTab === 'zones' && <ZonesPanel s={s} />}
      </React.Suspense>

      {/* Modals for Floor, Area, and Label Style Editing */}
      {editingFloor && <EditFloorModal s={s} />}

      {editingArea && <EditAreaModal s={s} />}

      {editingLabel && <EditLabelModal s={s} />}

      {/* Entity Customizer Modal with Phosphor Icon Finder */}
      <EntityCustomizerModal
        isOpen={Boolean(customizingEntity)}
        onClose={() => setCustomizingEntity(null)}
        entityId={customizingEntity?.entity_id || null}
        defaultName={customizingEntity?.name}
        defaultIcon={customizingEntity?.icon}
        domain={customizingEntity?.domain}
        areaName={customizingEntity?.area?.name}
        floorName={customizingEntity?.floor?.name}
        addToast={addToast}
      />
    </div>
  );
}
