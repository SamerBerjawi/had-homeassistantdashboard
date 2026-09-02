/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GridTile Component
 * Responsive tile wrapper with 2-way mirror visibility ghosting,
 * @dnd-kit drag-and-drop sortable integration, in-place tile resizing,
 * touch collision cancellation for long-press, and unavailable state preservation.
 */

import React from 'react';
import { useLongPress } from '../../hooks/useLongPress';
import {
  WarningCircle,
  Eye,
  EyeSlash,
  DotsSixVertical,
  ArrowsOutSimple,
  HandGrabbing,
  ArrowSquareOut
} from '@phosphor-icons/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEditMode } from '../../contexts/EditModeContext';
import { formatTileSize } from '../../utils/bentoLayout';

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
  isUnavailable?: boolean;
  unavailableText?: string;
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

const ROW_SPAN_CLASSES: Record<GridRowSpan, string> = {
  1: 'row-span-1',
  2: 'row-span-2',
  3: 'row-span-3',
  4: 'row-span-4'
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
  isUnavailable = false,
  unavailableText = 'Unavailable',
  onLongPress,
  onClick,
  onToggleVisibility,
  className = '',
  style,
  children
}) => {
  const {
    isEditMode,
    isEntityHidden,
    isAreaHidden,
    toggleEntityHidden,
    toggleAreaHidden,
    cycleTileSize,
    getTileLayout
  } = useEditMode();

  // Retrieve any layout overrides for this tile
  const layoutOverride = getTileLayout(id);
  const activeColSpan = (layoutOverride?.colSpan as GridColSpan) || colSpan;
  const activeRowSpan = (layoutOverride?.rowSpan as GridRowSpan) || rowSpan;

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

  // Sortable hook from @dnd-kit
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id,
    disabled: !isEditMode
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

  const handleCycleSize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    cycleTileSize(id, activeColSpan, activeRowSpan);
  };

  const colClass = COL_SPAN_CLASSES[activeColSpan] || 'col-span-2';
  const tabletColClass = tabletColSpan ? TABLET_COL_SPAN_CLASSES[tabletColSpan] : '';
  const desktopColClass = desktopColSpan ? DESKTOP_COL_SPAN_CLASSES[desktopColSpan] : '';
  const rowClass = ROW_SPAN_CLASSES[activeRowSpan] || 'row-span-1';

  const dndStyle: React.CSSProperties = isEditMode
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.6 : undefined,
        ...style
      }
    : (style || {});

  return (
    <div
      ref={setNodeRef}
      id={id}
      {...(!isEditMode && (onLongPress || onClick) ? longPressHandlers : {})}
      style={dndStyle}
      className={`relative w-full h-full min-w-0 ${colClass} ${tabletColClass} ${desktopColClass} ${rowClass} transition-all duration-200 ${
        isEditMode
          ? 'select-none group/edit'
          : isUnavailable
          ? 'pointer-events-none cursor-not-allowed select-none'
          : ''
      } ${
        effectiveIsGhosted
          ? 'opacity-50 grayscale hover:opacity-80 transition-opacity border-dashed border-2 border-amber-500/60 ring-2 ring-amber-500/20 ring-offset-2 ring-offset-slate-900/20 rounded-3xl bg-amber-500/5'
          : ''
      } ${className}`}
    >
      {/* ========================================================================= */}
      {/* EDIT MODE CONTROLS OVERLAY (Eye Visibility, Sizing, Drag Handle)          */}
      {/* ========================================================================= */}
      {isEditMode && (
        <div className="absolute top-2 left-2 right-2 z-30 flex items-center justify-between pointer-events-auto">
          {/* Left Action: Eye Visibility 2-Way Mirror Toggle Button */}
          <div className="flex items-center gap-1.5">
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
                  <EyeSlash size={15} weight="bold" />
                  <span className="text-[10px] font-bold uppercase tracking-wider pr-0.5">Hidden</span>
                </>
              ) : (
                <Eye size={15} weight="bold" />
              )}
            </button>

            {/* Direct Open Area Action in Edit Mode */}
            {onClick && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClick();
                }}
                className="px-2 py-1 rounded-xl bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white text-[11px] font-bold shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1 shrink-0 backdrop-blur-md"
                title="Access Area page to customize entities inside this room"
              >
                <span>Open Area</span>
                <ArrowSquareOut size={13} weight="bold" />
              </button>
            )}
          </div>

          {/* Right Action Tools: Size Cycle + Drag Handle */}
          <div className="flex items-center gap-1">
            {/* Tile Size Cycle Button */}
            <button
              type="button"
              onClick={handleCycleSize}
              className="px-2 py-1 rounded-xl bg-slate-900/80 dark:bg-black/70 border border-white/20 text-white hover:bg-sky-500/20 hover:border-sky-500/40 text-[11px] font-mono font-bold backdrop-blur-md shadow-md cursor-pointer transition-all active:scale-90 flex items-center gap-1"
              title="Click to cycle tile dimensions (2×1, 2×2, 4×2, 6×2)"
            >
              <ArrowsOutSimple size={12} weight="bold" className="text-sky-400" />
              <span>{formatTileSize(activeColSpan, activeRowSpan)}</span>
            </button>

            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="p-1.5 rounded-xl bg-slate-900/80 dark:bg-black/70 border border-white/20 text-slate-300 hover:text-white hover:border-white/40 backdrop-blur-md shadow-md cursor-grab active:cursor-grabbing transition-all active:scale-95 flex items-center justify-center"
              title="Drag to reorder tile"
            >
              <DotsSixVertical size={16} weight="bold" />
            </div>
          </div>
        </div>
      )}

      {/* Edit Mode Click Shield: Prevents accidental device triggering while editing, forwards navigation clicks */}
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          onClick={(e) => {
            if (onClick) {
              e.preventDefault();
              e.stopPropagation();
              onClick();
            }
          }}
          className={`absolute inset-0 z-20 rounded-3xl ${
            onClick ? 'cursor-pointer hover:bg-sky-500/10' : 'cursor-grab active:cursor-grabbing'
          } bg-black/5 dark:bg-white/3 transition-colors`}
        />
      )}

      {/* Unavailable State Card */}
      {isUnavailable ? (
        <div className="relative w-full h-full min-h-[92px] rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md shadow-xs flex flex-col items-center justify-center p-3 text-center overflow-hidden">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <WarningCircle size={18} weight="duotone" className="text-amber-500 dark:text-amber-400 shrink-0" />
            <span className="font-medium">{unavailableText}</span>
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
};

export default GridTile;
