/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GripVertical, Trash2, Copy, Sliders, Maximize2 } from 'lucide-react';
import { CardConfig } from '../../types/canvas';

interface CardShellProps {
  config: CardConfig;
  isEditMode: boolean;
  onOpenModal: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  children: React.ReactNode;
  className?: string;
}

export default function CardShell({
  config,
  isEditMode,
  onOpenModal,
  onRemove,
  onDuplicate,
  children,
  className = ''
}: CardShellProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative w-full h-full rounded-3xl overflow-hidden tunet-card-shell flex flex-col justify-between select-none group ${
        isEditMode ? 'ring-2 ring-brand-purple/40 border-indigo-400/30' : ''
      } ${className}`}
    >
      {/* Top Inner Refractive Highlight Line */}
      <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent pointer-events-none z-10" />

      {/* Edit Mode Toolbar / Controls */}
      {isEditMode && (
        <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1.5 p-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 shadow-lg">
          {/* Drag Handle */}
          <div
            className="canvas-drag-handle p-1 text-slate-300 hover:text-white cursor-grab hover:bg-white/10 rounded-lg transition-colors"
            title="Drag to reposition"
          >
            <GripVertical size={14} />
          </div>

          {/* Duplicate Card */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-1 text-slate-300 hover:text-indigo-300 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Duplicate Card"
          >
            <Copy size={14} />
          </button>

          {/* Delete Card */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
            title="Delete Card"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {/* Expand / Modal button in View Mode when hovered */}
      {!isEditMode && isHovered && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenModal();
          }}
          className="absolute top-3 right-3 z-20 w-7 h-7 rounded-lg bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/15 text-white/70 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-sm hover:scale-105"
          title="Open detailed controls"
        >
          <Maximize2 size={12} />
        </button>
      )}

      {/* Inner Card Content */}
      <div 
        onClick={() => {
          if (!isEditMode) {
            onOpenModal();
          }
        }}
        className="w-full h-full p-4 sm:p-5 flex flex-col justify-between cursor-pointer"
      >
        {children}
      </div>
    </div>
  );
}
