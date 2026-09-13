/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OverviewSortableTile Component
 * Wraps individual Overview tiles with @dnd-kit drag-and-drop sortable support,
 * tactile left/right shift buttons, 1x/2x width toggle pill, and show/hide visibility controls.
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DotsSixVertical,
  EyeSlash,
  ArrowsLeftRight,
  CaretLeft,
  CaretRight,
  SquaresFour
} from '@phosphor-icons/react';
import type { OverviewTileVisibilityMode } from '../../types/userConfig';

export interface OverviewSortableTileProps {
  id: string;
  isEditMode: boolean;
  visibilityMode?: OverviewTileVisibilityMode;
  isHidden?: boolean;
  isHiddenFromAll?: boolean;
  is2x: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onToggleHide?: () => void;
  onToggleSize: () => void;
  onToggleHiddenFromAll?: () => void;
  onSetVisibilityMode?: (mode: OverviewTileVisibilityMode) => void;
  onClick?: () => void;
  children: React.ReactNode;
}

export const OverviewSortableTile: React.FC<OverviewSortableTileProps> = ({
  id,
  isEditMode,
  visibilityMode,
  isHidden = false,
  isHiddenFromAll = false,
  is2x,
  canMoveLeft,
  canMoveRight,
  onMoveLeft,
  onMoveRight,
  onToggleHide,
  onToggleSize,
  onToggleHiddenFromAll,
  onSetVisibilityMode,
  onClick,
  children
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id, disabled: !isEditMode });

  const currentMode: OverviewTileVisibilityMode =
    visibilityMode ??
    (isHidden ? 'all_off' : isHiddenFromAll ? 'tab_only' : 'all_on');

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? undefined : transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.9 : currentMode === 'all_off' || isHidden ? 0.45 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative select-none transition-all duration-200 ${
        is2x ? 'col-span-4 sm:col-span-2' : 'col-span-2 sm:col-span-1'
      } ${
        isEditMode
          ? isDragging
            ? 'ring-2 ring-sky-400 shadow-2xl shadow-sky-500/30 scale-[1.03] rounded-3xl z-50 cursor-grabbing'
            : currentMode === 'all_off' || isHidden
            ? 'ring-2 ring-dashed ring-rose-500/60 rounded-3xl cursor-grab'
            : currentMode === 'tab_only'
            ? 'ring-2 ring-dashed ring-amber-500/60 rounded-3xl cursor-grab'
            : 'hover:ring-2 hover:ring-sky-400/50 hover:shadow-lg rounded-3xl cursor-grab'
          : ''
      }`}
    >
      {/* Click wrapper: clicking tile body triggers onClick when NOT in edit mode */}
      <div
        onClick={isEditMode ? undefined : onClick}
        className={`w-full h-full ${isEditMode ? 'cursor-default' : ''}`}
      >
        {children}
      </div>

      {/* Edit Mode Controls Overlay - Entire surface is draggable */}
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute inset-0 rounded-3xl ring-2 ring-sky-500/40 p-2 sm:p-2.5 flex flex-col justify-between z-30 bg-black/20 dark:bg-black/30 backdrop-blur-[2px] transition-all cursor-grab active:cursor-grabbing"
        >
          {/* Top Row: Drag Handle + Move Arrows on Left, Size & Visibility Modes on Right */}
          <div
            className="flex items-center justify-between gap-1 pointer-events-auto"
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Left: Drag Handle & Shift Controls */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-black/80 dark:bg-black/90 backdrop-blur-md rounded-xl p-0.5 sm:p-1 border border-white/15 shadow-lg">
              <div
                className="p-1 rounded-lg text-sky-400 bg-white/10 flex items-center justify-center pointer-events-none"
                title="Drag tile to reorder"
                aria-label="Drag handle"
              >
                <DotsSixVertical size={16} weight="bold" />
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveLeft();
                }}
                disabled={!canMoveLeft}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/15 disabled:opacity-25 disabled:hover:bg-transparent transition-all cursor-pointer"
                title="Move left"
              >
                <CaretLeft size={13} weight="bold" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveRight();
                }}
                disabled={!canMoveRight}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/15 disabled:opacity-25 disabled:hover:bg-transparent transition-all cursor-pointer"
                title="Move right"
              >
                <CaretRight size={13} weight="bold" />
              </button>
            </div>

            {/* Right: Visibility Mode Toggle, Width Size Toggle & All Off */}
            <div className="flex items-center gap-1 bg-black/80 dark:bg-black/90 backdrop-blur-md rounded-xl p-0.5 sm:p-1 border border-white/15 shadow-lg">
              {/* Visibility Mode Switcher: Toggles between 'All On' and 'Tab Only' */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSetVisibilityMode) {
                    onSetVisibilityMode(currentMode === 'all_on' ? 'tab_only' : 'all_on');
                  } else if (onToggleHiddenFromAll) {
                    onToggleHiddenFromAll();
                  }
                }}
                className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1 ${
                  currentMode === 'tab_only'
                    ? 'bg-amber-500/30 border border-amber-500/50 text-amber-300'
                    : 'bg-emerald-500/25 border border-emerald-500/40 text-emerald-300'
                }`}
                title={
                  currentMode === 'tab_only'
                    ? "Mode: Tab Only (hidden from 'All' tab, visible in category tab). Click to switch to All On."
                    : "Mode: All On (visible in both 'All' tab and category tab). Click to switch to Tab Only."
                }
              >
                <SquaresFour size={12} weight={currentMode === 'all_on' ? 'fill' : 'duotone'} />
                <span>{currentMode === 'tab_only' ? 'Tab Only' : 'All On'}</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSize();
                }}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-black tracking-wider transition-all cursor-pointer active:scale-95 flex items-center gap-1 ${
                  is2x
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'bg-white/15 text-slate-300 hover:bg-white/25 hover:text-white'
                }`}
                title={`Width: ${is2x ? '2x (double width)' : '1x (standard)'}. Click to toggle.`}
              >
                <ArrowsLeftRight size={12} weight="bold" />
                <span>{is2x ? '2×' : '1×'}</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSetVisibilityMode) {
                    onSetVisibilityMode('all_off');
                  } else if (onToggleHide) {
                    onToggleHide();
                  }
                }}
                className="p-1 sm:p-1.5 rounded-lg transition-all cursor-pointer active:scale-95 text-slate-300 hover:text-rose-400 hover:bg-rose-500/15"
                title="Mode: All Off (hide completely, move to Widget Drawer)"
              >
                <EyeSlash size={15} weight="bold" />
              </button>
            </div>
          </div>

          {/* Bottom badge indicating active visibility mode */}
          {currentMode === 'tab_only' && (
            <div className="w-full flex justify-center pointer-events-none pb-0.5">
              <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black tracking-wider uppercase bg-amber-500 text-slate-950 shadow-md">
                Category Tab Only
              </span>
            </div>
          )}
          {currentMode === 'all_off' && (
            <div className="w-full flex justify-center pointer-events-none pb-0.5">
              <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black tracking-wider uppercase bg-rose-500 text-white shadow-md">
                All Off (Hidden)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OverviewSortableTile;
