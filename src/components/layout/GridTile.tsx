/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GridTile Component
 * Responsive tile wrapper with 2-way mirror visibility ghosting,
 * @dnd-kit drag-and-drop sortable integration, tactile in-place corner resize handles,
 * live drag-to-resize gesture, quick dimension presets popover (1×1, 2×1, 2×2, 4×1, 4×2),
 * and layout override persistence.
 */

import React, { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { useLongPress } from '../../hooks/useLongPress';
import {
  WarningCircle,
  Eye,
  EyeSlash,
  DotsSixVertical,
  ArrowsLeftRight,
  ArrowSquareOut,
  Check
} from '@phosphor-icons/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEditMode, BREAKPOINT_ALLOWED_COLUMNS, LayoutBreakpoint } from '../../contexts/EditModeContext';
import { formatTileSize, formatTileHorizontalSize } from '../../utils/bentoLayout';

export type GridColSpan = 1 | 2 | 3 | 4 | 6 | 8 | 12;
export type GridRowSpan = 1 | 2 | 3 | 4;

export interface GridTileProps {
  id: string;
  entityId?: string;
  areaId?: string;
  isGhosted?: boolean;
  colSpan?: GridColSpan;
  rowSpan?: GridRowSpan;
  tabletColSpan?: GridColSpan;
  desktopColSpan?: GridColSpan;
  colStart?: number;
  tabletColStart?: number;
  desktopColStart?: number;
  isUnavailable?: boolean;
  unavailableText?: string;
  isOverlay?: boolean;
  onLongPress?: () => void;
  onClick?: () => void;
  onToggleVisibility?: () => void;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

const COL_SPAN_CLASSES: Record<GridColSpan, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  6: 'col-span-6',
  8: 'col-span-8',
  12: 'col-span-12'
};

const TABLET_COL_SPAN_CLASSES: Record<GridColSpan, string> = {
  1: 'sm:col-span-1',
  2: 'sm:col-span-2',
  3: 'sm:col-span-3',
  4: 'sm:col-span-4',
  6: 'sm:col-span-6',
  8: 'sm:col-span-8',
  12: 'sm:col-span-12'
};

const DESKTOP_COL_SPAN_CLASSES: Record<GridColSpan, string> = {
  1: 'lg:col-span-1',
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  6: 'lg:col-span-6',
  8: 'lg:col-span-8',
  12: 'lg:col-span-12'
};

const COL_START_CLASSES: Record<number, string> = {
  1: 'col-start-1',
  2: 'col-start-2',
  3: 'col-start-3',
  4: 'col-start-4'
};

const TABLET_COL_START_CLASSES: Record<number, string> = {
  1: 'sm:col-start-1',
  2: 'sm:col-start-2',
  3: 'sm:col-start-3',
  4: 'sm:col-start-4',
  5: 'sm:col-start-5',
  6: 'sm:col-start-6'
};

const DESKTOP_COL_START_CLASSES: Record<number, string> = {
  1: 'lg:col-start-1',
  2: 'lg:col-start-2',
  3: 'lg:col-start-3',
  4: 'lg:col-start-4',
  5: 'lg:col-start-5',
  6: 'lg:col-start-6',
  7: 'lg:col-start-7',
  8: 'lg:col-start-8',
  9: 'lg:col-start-9',
  10: 'lg:col-start-10',
  11: 'lg:col-start-11',
  12: 'lg:col-start-12'
};

const BREAKPOINT_WIDTH_PRESETS: Record<LayoutBreakpoint, GridColSpan[]> = {
  mobile: [1, 2, 4],
  laptop: [2, 3, 4, 6],
  desktop: [3, 4, 6, 8, 12]
};

export const GridTile: React.FC<GridTileProps> = ({
  id,
  entityId,
  areaId,
  isGhosted,
  colSpan = 2,
  rowSpan = 1,
  tabletColSpan,
  desktopColSpan,
  colStart,
  tabletColStart,
  desktopColStart,
  isUnavailable = false,
  unavailableText = 'Unavailable',
  isOverlay = false,
  onLongPress,
  onClick,
  onToggleVisibility,
  className = '',
  style,
  children
}) => {
  const {
    isEditMode,
    activeBreakpoint,
    isEntityHidden,
    isAreaHidden,
    toggleEntityHidden,
    toggleAreaHidden,
    setTileWidth,
    getTileLayout
  } = useEditMode();

  // Retrieve layout override for the active breakpoint
  const layoutOverride = getTileLayout(id, activeBreakpoint);
  const activeColSpan = layoutOverride?.colSpan
    ? (layoutOverride.colSpan as GridColSpan)
    : activeBreakpoint === 'desktop'
    ? (desktopColSpan || 3)
    : activeBreakpoint === 'laptop'
    ? (tabletColSpan || 3)
    : colSpan;

  const currentPresets = BREAKPOINT_WIDTH_PRESETS[activeBreakpoint] || BREAKPOINT_WIDTH_PRESETS.mobile;

  // Local state for Quick Width popover menu & live interactive horizontal resizing
  const [showSizeMenu, setShowSizeMenu] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [dragPreviewColSpan, setDragPreviewColSpan] = useState<GridColSpan | null>(null);

  // Determine ghosted state (hidden in master config)
  const targetEntityId = entityId || id;
  const targetAreaId = areaId;

  const effectiveIsGhosted = isGhosted !== undefined
    ? isGhosted
    : targetAreaId
      ? isAreaHidden(targetAreaId)
      : isEntityHidden(targetEntityId);

  // If item is hidden and dashboard is NOT in edit mode, do not render
  if (!isEditMode && effectiveIsGhosted) {
    return null;
  }

  // Sortable hook from @dnd-kit (disabled if rendered inside DragOverlay or not in edit mode)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id,
    disabled: !isEditMode || isOverlay
  });

  // Long press handlers for normal interactive mode
  const longPressHandlers = useLongPress({
    threshold: 450,
    cancelOnMove: true,
    moveThreshold: 10,
    onLongPress: () => {
      if (!isUnavailable && onLongPress && !isEditMode) {
        onLongPress();
      }
    },
    onClick: () => {
      if (!isUnavailable && onClick && !isEditMode) {
        onClick();
      }
    }
  });

  const handleToggleEye = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onToggleVisibility) {
      onToggleVisibility();
    } else if (targetAreaId) {
      toggleAreaHidden(targetAreaId);
    } else {
      toggleEntityHidden(targetEntityId);
    }
  };

  const handleSelectCols = async (cols: GridColSpan, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowSizeMenu(false);
    await setTileWidth(id, cols, activeBreakpoint);
  };

  // =========================================================================
  // Interactive Horizontal Drag-to-Resize Gesture on Right Edge / Handle
  // =========================================================================
  const resizeStartPos = useRef<{ x: number } | null>(null);
  const initialColSpan = useRef<GridColSpan>(activeColSpan);

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignored if pointer capture not supported
    }

    resizeStartPos.current = { x: e.clientX };
    initialColSpan.current = activeColSpan;
    setIsResizing(true);
    setDragPreviewColSpan(activeColSpan);
  };

  const handleResizePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeStartPos.current) return;
    e.preventDefault();
    e.stopPropagation();

    const dx = e.clientX - resizeStartPos.current.x;
    const allowed = BREAKPOINT_ALLOWED_COLUMNS[activeBreakpoint] || [1, 2, 4];
    const initialIndex = allowed.indexOf(initialColSpan.current);
    const safeIndex = initialIndex !== -1 ? initialIndex : 0;

    // Every ~45px horizontal drag shifts one column step wider or narrower
    const steps = Math.round(dx / 45);
    const targetIndex = Math.max(0, Math.min(allowed.length - 1, safeIndex + steps));
    const nextCols = allowed[targetIndex];

    setDragPreviewColSpan(nextCols);
  }, [activeBreakpoint]);

  const handleResizePointerUp = useCallback(async (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeStartPos.current) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }

    const finalCols = dragPreviewColSpan || initialColSpan.current;
    const dx = Math.abs(e.clientX - (resizeStartPos.current?.x ?? e.clientX));
    resizeStartPos.current = null;
    setIsResizing(false);
    setDragPreviewColSpan(null);

    // If pointer moved very little (< 10px), treat as tap to toggle Quick Width Popover menu
    if (dx < 10) {
      setShowSizeMenu((prev) => !prev);
      return;
    }

    if (finalCols !== activeColSpan) {
      await setTileWidth(id, finalCols, activeBreakpoint);
    }
  }, [dragPreviewColSpan, activeColSpan, id, activeBreakpoint, setTileWidth]);

  // Display column span taking drag preview into account
  const displayColSpan = dragPreviewColSpan || activeColSpan;

  const colClass = COL_SPAN_CLASSES[displayColSpan] || 'col-span-2';
  const tabletColClass = tabletColSpan ? TABLET_COL_SPAN_CLASSES[tabletColSpan] : '';
  const desktopColClass = desktopColSpan ? DESKTOP_COL_SPAN_CLASSES[desktopColSpan] : '';
  const colStartClass = colStart ? COL_START_CLASSES[colStart] || '' : '';
  const tabletColStartClass = tabletColStart ? TABLET_COL_START_CLASSES[tabletColStart] || '' : '';
  const desktopColStartClass = desktopColStart ? DESKTOP_COL_START_CLASSES[desktopColStart] || '' : '';

  const innerRef = useRef<HTMLDivElement>(null);
  const [measuredSpan, setMeasuredSpan] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!innerRef.current) return;
    const el = innerRef.current;

    const calculateSpan = () => {
      const rect = el.getBoundingClientRect();
      const height = Math.round(rect.height);
      if (height > 0) {
        // Natural adaptive height: only ensure 1-col mini tile has touch target breathing room
        const minHeight = displayColSpan === 1 ? 84 : 0;
        const effectiveHeight = Math.max(height, minHeight);
        const width = typeof window !== 'undefined' ? window.innerWidth : 390;
        const gap = width >= 1024 ? 16 : width >= 640 ? 14 : 12;
        // In VirtualGrid with gridAutoRows: 2px and rowGap: 0px, each track is 2px.
        const span = Math.ceil((effectiveHeight + gap) / 2);
        setMeasuredSpan(Math.max(1, span));
      }
    };

    calculateSpan();

    const resizeObserver = new ResizeObserver(() => {
      calculateSpan();
    });
    resizeObserver.observe(el);

    window.addEventListener('resize', calculateSpan);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculateSpan);
    };
  }, [displayColSpan]);

  const rowSpanStyle: React.CSSProperties = measuredSpan
    ? { gridRowEnd: `span ${measuredSpan}` }
    : { gridRowEnd: 'span 56' };

  const menuRef = useRef<HTMLDivElement>(null);
  const sizeButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-clamp popup to stay strictly inside the screen viewport
  useLayoutEffect(() => {
    if (!showSizeMenu || !menuRef.current) return;
    const el = menuRef.current;
    el.style.transform = '';
    const rect = el.getBoundingClientRect();
    const padding = 12; // 12px safe margin from viewport edge
    if (rect.left < padding) {
      el.style.transform = `translateX(${padding - rect.left}px)`;
    } else if (rect.right > window.innerWidth - padding) {
      el.style.transform = `translateX(-${rect.right - (window.innerWidth - padding)}px)`;
    }
  }, [showSizeMenu]);

  // Click outside listener to dismiss popup
  useEffect(() => {
    if (!showSizeMenu) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !sizeButtonRef.current?.contains(e.target as Node)
      ) {
        setShowSizeMenu(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [showSizeMenu]);

  const dndStyle: React.CSSProperties = isEditMode && !isOverlay
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 60 : showSizeMenu ? 45 : undefined,
        opacity: isDragging ? 0.35 : undefined,
        ...style
      }
    : {
        touchAction: 'pan-y',
        ...style
      };

  return (
    <div
      ref={setNodeRef}
      id={id}
      {...(!isEditMode && (onLongPress || onClick) ? longPressHandlers : {})}
      style={{
        ...dndStyle,
        ...rowSpanStyle
      }}
      className={`relative w-full min-w-0 ${colClass} ${tabletColClass} ${desktopColClass} ${colStartClass} ${tabletColStartClass} ${desktopColStartClass} transition-all duration-200 ${
        isEditMode && !isOverlay
          ? 'select-none group/edit'
          : isUnavailable
          ? 'pointer-events-none cursor-not-allowed select-none'
          : ''
      } ${
        isDragging
          ? 'border-2 border-dashed border-sky-400/50 rounded-3xl ring-2 ring-sky-500/20'
          : ''
      } ${
        effectiveIsGhosted
          ? 'opacity-50 grayscale hover:opacity-80 transition-opacity border-dashed border-2 border-amber-500/60 ring-2 ring-amber-500/20 ring-offset-2 ring-offset-slate-900/20 rounded-3xl bg-amber-500/5'
          : ''
      } ${
        isResizing
          ? 'ring-2 ring-sky-400 shadow-xl shadow-sky-500/20 scale-[0.99] transition-transform'
          : ''
      } ${className}`}
    >
      {/* ========================================================================= */}
      {/* EDIT MODE CONTROLS OVERLAY (Eye Visibility, Sizing Toolbar, Drag Grip)     */}
      {/* Positioned at bottom so Area Icon, Title & Telemetry at top stay visible   */}
      {/* ========================================================================= */}
      {isEditMode && !isOverlay && (
        <div className="absolute bottom-2 left-2 right-2 z-30 flex items-center justify-between pointer-events-auto">
          {/* Left Action: Eye Visibility 2-Way Mirror Toggle Button + Open Area button */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleToggleEye}
              className={`p-1.5 rounded-xl border backdrop-blur-md shadow-md cursor-pointer transition-all active:scale-90 flex items-center gap-1 ${
                effectiveIsGhosted
                  ? 'bg-amber-500/25 border-amber-500/60 text-amber-300 hover:bg-amber-500/40'
                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
              }`}
              title={effectiveIsGhosted ? 'Click to show this tile on dashboard' : 'Click to hide this tile from dashboard'}
            >
              {effectiveIsGhosted ? (
                <>
                  <EyeSlash size={13} weight="bold" />
                  <span className="text-[9px] font-bold uppercase tracking-wider pr-0.5">Hidden</span>
                </>
              ) : (
                <Eye size={13} weight="bold" />
              )}
            </button>

            {/* Direct Open Area Action in Edit Mode */}
            {onClick && displayColSpan >= 2 && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClick();
                }}
                className="p-1.5 sm:px-2 sm:py-1 rounded-xl bg-sky-500/90 hover:bg-sky-400 active:bg-sky-600 text-white text-[11px] font-bold shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1 shrink-0 backdrop-blur-md"
                title="Access Area page to customize entities inside this room"
              >
                <span className="hidden sm:inline">Open</span>
                <ArrowSquareOut size={13} weight="bold" />
              </button>
            )}
          </div>

          {/* Right Action Tools: Quick Dimensions Trigger + Drag Grip */}
          <div className="flex items-center gap-1 relative">
            {/* Quick Width Preset Selector Popover */}
            {showSizeMenu && (
              <div
                ref={menuRef}
                className="absolute bottom-10 right-0 z-50 bg-slate-900/95 dark:bg-black/95 border border-sky-500/40 rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl flex items-center gap-1.5 animate-fadeIn ring-2 ring-sky-500/20 whitespace-nowrap pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {currentPresets.map((cols) => {
                  const isCurrent = activeColSpan === cols;
                  return (
                    <button
                      key={cols}
                      type="button"
                      onClick={(e) => handleSelectCols(cols, e)}
                      className={`min-w-[32px] h-8 px-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95 ${
                        isCurrent
                          ? 'bg-sky-500 text-white shadow-md shadow-sky-500/40 ring-1 ring-sky-300/50'
                          : 'bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white'
                      }`}
                      title={`${cols} Columns`}
                    >
                      {isCurrent && <Check size={11} weight="bold" className="text-white shrink-0" />}
                      <span>{cols}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Tile Horizontal Width Button / Menu Toggle */}
            <button
              ref={sizeButtonRef}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowSizeMenu((prev) => !prev);
              }}
              className={`h-7 px-2.5 rounded-xl border text-xs font-mono font-bold backdrop-blur-md shadow-md cursor-pointer transition-all active:scale-90 flex items-center gap-1.5 shrink-0 ${
                showSizeMenu
                  ? 'bg-sky-500 border-sky-400 text-white ring-2 ring-sky-500/30'
                  : 'bg-slate-900/80 dark:bg-black/70 border-white/20 text-white hover:bg-sky-500/20 hover:border-sky-500/40'
              }`}
              title="Click to select columns"
            >
              <ArrowsLeftRight size={12} weight="bold" className={showSizeMenu ? 'text-white' : 'text-sky-400'} />
              <span>{displayColSpan}</span>
            </button>

            {/* Drag Handle Grip (with touchAction: none for smooth mobile touch dragging) */}
            <div
              {...attributes}
              {...listeners}
              style={{ touchAction: 'none' }}
              className="p-1.5 rounded-xl bg-slate-900/80 dark:bg-black/70 border border-white/20 text-slate-300 hover:text-white hover:border-white/40 backdrop-blur-md shadow-md cursor-grab active:cursor-grabbing transition-all active:scale-95 flex items-center justify-center select-none"
              title="Drag to reorder tile"
            >
              <DotsSixVertical size={14} weight="bold" />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TACTILE HORIZONTAL RESIZE HANDLE (Right Edge Drag-to-Resize Gesture)       */}
      {/* ========================================================================= */}
      {isEditMode && !isOverlay && (
        <div
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          onPointerCancel={handleResizePointerUp}
          style={{ touchAction: 'none' }}
          className={`absolute -bottom-1 -right-1 z-35 h-7 px-1.5 rounded-tl-xl rounded-br-2xl flex items-center justify-center cursor-ew-resize select-none transition-all active:scale-110 ${
            isResizing
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/50 ring-2 ring-white scale-105'
              : 'bg-slate-900/95 dark:bg-sky-950/95 text-sky-400 hover:bg-sky-500 hover:text-white border border-sky-400/40 shadow-md'
          }`}
          title="Drag horizontally to change grid width (or tap for presets)"
        >
          <ArrowsLeftRight size={13} weight="bold" />
        </div>
      )}

      {/* Edit Mode Click Shield: Prevents HA device toggling beneath card while editing */}
      {isEditMode && !isOverlay && (
        <div
          {...attributes}
          {...listeners}
          style={{ touchAction: 'none' }}
          className="absolute inset-0 z-20 rounded-3xl cursor-grab active:cursor-grabbing bg-black/[0.02] dark:bg-white/[0.02] transition-colors"
        />
      )}

      {/* Dynamic Content Height Wrapper */}
      <div ref={innerRef} className="w-full h-fit">
        {isUnavailable ? (
          <div className="relative w-full min-h-[88px] rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md shadow-xs flex flex-col items-center justify-center p-3 text-center overflow-hidden">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold">
              <WarningCircle size={18} weight="duotone" className="text-amber-500 dark:text-amber-400 shrink-0" />
              <span className="font-medium">{unavailableText}</span>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default GridTile;
