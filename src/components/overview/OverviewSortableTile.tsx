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
  Eye,
  EyeSlash,
  ArrowsLeftRight,
  CaretLeft,
  CaretRight
} from '@phosphor-icons/react';

export interface OverviewSortableTileProps {
  id: string;
  isEditMode: boolean;
  isHidden: boolean;
  is2x: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onToggleHide: () => void;
  onToggleSize: () => void;
  onClick?: () => void;
  children: React.ReactNode;
}

export const OverviewSortableTile: React.FC<OverviewSortableTileProps> = ({
  id,
  isEditMode,
  isHidden,
  is2x,
  canMoveLeft,
  canMoveRight,
  onMoveLeft,
  onMoveRight,
  onToggleHide,
  onToggleSize,
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

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.35 : isHidden ? 0.45 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative select-none transition-all duration-200 ${
        is2x ? 'col-span-4 sm:col-span-2' : 'col-span-2 sm:col-span-1'
      } ${
        isEditMode
          ? isHidden
            ? 'ring-2 ring-dashed ring-amber-500/60 rounded-3xl'
            : 'hover:ring-2 hover:ring-sky-400/40 rounded-3xl'
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

      {/* Edit Mode Controls Overlay */}
      {isEditMode && (
        <div className="absolute inset-0 pointer-events-none rounded-3xl ring-2 ring-sky-500/40 p-2 sm:p-2.5 flex flex-col justify-between z-30 bg-black/20 dark:bg-black/30 backdrop-blur-[2px] transition-all">
          {/* Top Row: Drag Handle + Move Arrows on Left, Size & Hide on Right */}
          <div className="flex items-center justify-between pointer-events-auto gap-1">
            {/* Left: Drag Handle & Shift Controls */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-black/80 dark:bg-black/90 backdrop-blur-md rounded-xl p-0.5 sm:p-1 border border-white/15 shadow-lg">
              <button
                type="button"
                {...attributes}
                {...listeners}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/15 cursor-grab active:cursor-grabbing transition-all"
                title="Drag to reorder"
                aria-label="Drag handle"
              >
                <DotsSixVertical size={16} weight="bold" />
              </button>

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

            {/* Right: Width Size Toggle & Hide/Unhide */}
            <div className="flex items-center gap-1 bg-black/80 dark:bg-black/90 backdrop-blur-md rounded-xl p-0.5 sm:p-1 border border-white/15 shadow-lg">
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
                  onToggleHide();
                }}
                className={`p-1 sm:p-1.5 rounded-lg transition-all cursor-pointer active:scale-95 ${
                  isHidden
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-white/15'
                }`}
                title={isHidden ? 'Unhide tile' : 'Hide tile'}
              >
                {isHidden ? <Eye size={15} weight="bold" /> : <EyeSlash size={15} weight="bold" />}
              </button>
            </div>
          </div>

          {/* Bottom Center Pill if tile is currently hidden */}
          {isHidden && (
            <div className="flex items-center justify-center pb-0.5">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md pointer-events-none">
                Hidden • Tap Eye to Show
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OverviewSortableTile;
