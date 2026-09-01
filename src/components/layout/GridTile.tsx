/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GridTile Component
 * Responsive tile wrapper with Framer Motion spring layout animations,
 * touch collision cancellation for long-press, and unavailable state preservation.
 */

import React from 'react';
import { motion } from 'motion/react';
import { useLongPress } from '../../hooks/useLongPress';
import { WarningCircle } from '@phosphor-icons/react';

export type GridColSpan = 1 | 2 | 3 | 4 | 6 | 8 | 12;
export type GridRowSpan = 1 | 2 | 3 | 4;

export interface GridTileProps {
  id: string;
  colSpan?: GridColSpan;
  rowSpan?: GridRowSpan;
  tabletColSpan?: GridColSpan;
  desktopColSpan?: GridColSpan;
  isUnavailable?: boolean;
  unavailableText?: string;
  onLongPress?: () => void;
  onClick?: () => void;
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
  colSpan = 2,
  rowSpan = 1,
  tabletColSpan,
  desktopColSpan,
  isUnavailable = false,
  unavailableText = 'Unavailable',
  onLongPress,
  onClick,
  className = '',
  style,
  children
}) => {
  // Gesture collision guard: cancels long-press if user scrolls/moves > 10px
  const longPressHandlers = useLongPress({
    threshold: 450,
    cancelOnMove: true,
    moveThreshold: 10,
    onLongPress: () => {
      if (!isUnavailable && onLongPress) {
        onLongPress();
      }
    },
    onClick: () => {
      if (!isUnavailable && onClick) {
        onClick();
      }
    }
  });

  const colClass = COL_SPAN_CLASSES[colSpan] || 'col-span-2';
  const tabletColClass = tabletColSpan ? TABLET_COL_SPAN_CLASSES[tabletColSpan] : '';
  const desktopColClass = desktopColSpan ? DESKTOP_COL_SPAN_CLASSES[desktopColSpan] : '';
  const rowClass = ROW_SPAN_CLASSES[rowSpan] || 'row-span-1';

  return (
    <motion.div
      layout
      layoutId={id}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30
      }}
      {...(onLongPress || onClick ? longPressHandlers : {})}
      style={style}
      className={`w-full h-full min-w-0 ${colClass} ${tabletColClass} ${desktopColClass} ${rowClass} ${
        isUnavailable ? 'pointer-events-none cursor-not-allowed select-none' : ''
      } ${className}`}
    >
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
    </motion.div>
  );
};

export default GridTile;
