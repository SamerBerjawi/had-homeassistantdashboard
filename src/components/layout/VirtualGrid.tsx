/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * VirtualGrid Component
 * Adaptive 12-factor virtual grid container:
 * - Mobile: 4 virtual columns (compact tile = 2 cols -> 2 per row)
 * - Tablet: 6 virtual columns (compact tile = 3 cols -> 2 per row)
 * - Desktop: 12 virtual columns (compact tile = 3 or 4 cols -> 3-4 per row)
 *
 * Features an interactive Visual Blueprint Grid Overlay during Edit Mode
 * that highlights active column snap tracks (C1-C4 mobile, C1-C6 tablet, C1-C12 desktop).
 */

import React from 'react';
import { useEditMode } from '../../contexts/EditModeContext';

export interface VirtualGridProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  showOverlay?: boolean;
}

export const VirtualGrid: React.FC<VirtualGridProps> = ({
  children,
  className = '',
  style,
  showOverlay
}) => {
  let isEditMode = false;
  try {
    // Safely check edit mode context
    const editModeContext = useEditMode();
    isEditMode = editModeContext.isEditMode;
  } catch {
    // If rendered outside EditModeProvider
  }

  const activeOverlay = showOverlay !== undefined ? showOverlay : isEditMode;

  return (
    <div className="relative w-full">
      {/* Visual Blueprint Grid Overlay when in Edit Mode */}
      {activeOverlay && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 pointer-events-none rounded-3xl overflow-hidden animate-fadeIn"
        >
          {/* Subtle architectural blueprint grid pattern */}
          <div
            className="absolute inset-0 opacity-25 dark:opacity-20"
            style={{
              backgroundImage: `
                radial-gradient(circle, rgba(56, 189, 248, 0.4) 1px, transparent 1px),
                linear-gradient(to right, rgba(56, 189, 248, 0.08) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(56, 189, 248, 0.08) 1px, transparent 1px)
              `,
              backgroundSize: '24px 24px, 48px 48px, 48px 48px'
            }}
          />

          {/* Responsive Virtual Column Track Guides (4 cols mobile, 6 cols tablet, 12 cols desktop) */}
          <div className="w-full h-full grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-x-3 sm:gap-x-3.5 lg:gap-x-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className={`h-full rounded-2xl border border-dashed border-sky-400/25 dark:border-sky-400/20 bg-sky-500/[0.02] flex flex-col justify-between py-2 px-1 ${
                  i >= 4 ? 'hidden sm:flex' : 'flex'
                } ${i >= 6 ? 'sm:hidden lg:flex' : ''}`}
              >
                <span className="text-[9px] font-mono font-bold text-sky-400/50 text-center select-none">
                  C{i + 1}
                </span>
                <span className="text-[9px] font-mono font-bold text-sky-400/40 text-center select-none">
                  ⋮
                </span>
              </div>
            ))}
          </div>

          {/* Ambient Blueprint Glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-sky-500/[0.04] via-transparent to-sky-500/[0.04] rounded-3xl" />
        </div>
      )}

      {/* Main Grid Content */}
      <div
        style={{
          gridAutoRows: '2px',
          gridAutoFlow: 'dense',
          rowGap: '0px',
          ...style
        }}
        className={`relative z-10 w-full grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-x-3 sm:gap-x-3.5 lg:gap-x-4 items-start ${className}`}
      >
        {children}
      </div>
    </div>
  );
};

export default VirtualGrid;
