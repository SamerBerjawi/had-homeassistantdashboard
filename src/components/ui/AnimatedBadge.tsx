/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MagicUI Interactive Primitive: AnimatedBadge
 * Pill badge with animated status dot, subtle glowing edge, and polished typography.
 */

import React from 'react';

export type BadgeVariant =
  | 'coral'
  | 'lime'
  | 'purple'
  | 'cyan'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'neutral';

interface AnimatedBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  showDot?: boolean;
  className?: string;
  darkMode?: boolean;
}

const variantStyles: Record<BadgeVariant, { badge: string; dot: string }> = {
  coral: {
    badge: 'bg-[#FF2D55]/15 text-[#FF2D55] border-[#FF2D55]/30',
    dot: 'bg-[#FF2D55]',
  },
  lime: {
    badge: 'bg-[#A1E833]/15 text-[#A1E833] border-[#A1E833]/30',
    dot: 'bg-[#A1E833]',
  },
  purple: {
    badge: 'bg-[#AF52DE]/15 text-[#BF5AF2] border-[#AF52DE]/30',
    dot: 'bg-[#AF52DE]',
  },
  cyan: {
    badge: 'bg-[#5AC8FA]/15 text-[#5AC8FA] border-[#5AC8FA]/30',
    dot: 'bg-[#5AC8FA]',
  },
  emerald: {
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  amber: {
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    dot: 'bg-amber-500',
  },
  rose: {
    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    dot: 'bg-rose-500',
  },
  neutral: {
    badge: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    dot: 'bg-slate-400',
  },
};

export const AnimatedBadge: React.FC<AnimatedBadgeProps> = ({
  children,
  variant = 'coral',
  showDot = true,
  className = '',
}) => {
  const current = variantStyles[variant] || variantStyles.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border shadow-sm backdrop-blur-md ${current.badge} ${className}`}
    >
      {showDot && (
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${current.dot}`}
          />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${current.dot}`} />
        </span>
      )}
      <span>{children}</span>
    </span>
  );
};
