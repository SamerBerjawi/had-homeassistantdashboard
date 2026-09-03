/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MagicUI Interactive Primitive: BentoCard
 * High-aesthetic glassmorphism bento card with optional glowing BorderBeam,
 * subtle inner border, and smooth hover elevation.
 */

import React from 'react';
import { motion } from 'motion/react';
import { BorderBeam } from './BorderBeam';

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  colSpan?: 1 | 2 | 3 | 4 | 6;
  rowSpan?: 1 | 2;
  hasBorderBeam?: boolean;
  borderBeamColorFrom?: string;
  borderBeamColorTo?: string;
  darkMode?: boolean;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const BentoCard: React.FC<BentoCardProps> = ({
  children,
  className = '',
  colSpan = 1,
  rowSpan = 1,
  hasBorderBeam = false,
  borderBeamColorFrom = '#FF2D55',
  borderBeamColorTo = '#AF52DE',
  darkMode = true,
  onClick,
  onContextMenu,
}) => {
  const colSpanClasses = {
    1: 'col-span-1',
    2: 'col-span-1 md:col-span-2',
    3: 'col-span-1 md:col-span-2 lg:col-span-3',
    4: 'col-span-1 md:col-span-2 lg:col-span-4',
    6: 'col-span-1 md:col-span-3 lg:col-span-6',
  }[colSpan];

  const rowSpanClasses = {
    1: 'row-span-1',
    2: 'row-span-2',
  }[rowSpan];

  const themeClasses = darkMode
    ? 'bg-slate-900/60 hover:bg-slate-900/80 border-white/10 text-white shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]'
    : 'bg-white/80 hover:bg-white/95 border-slate-200/80 text-slate-900 shadow-[0_8px_24px_rgba(0,0,0,0.06)] shadow-slate-100';

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border p-4 sm:p-5 backdrop-blur-xl transition-all duration-300 flex flex-col justify-between ${colSpanClasses} ${rowSpanClasses} ${themeClasses} ${className} ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {hasBorderBeam && (
        <BorderBeam
          colorFrom={borderBeamColorFrom}
          colorTo={borderBeamColorTo}
          duration={10}
          borderWidth={1.5}
        />
      )}
      {children}
    </motion.div>
  );
};
