/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MagicUI Interactive Primitive: BentoGrid
 * Responsive Bento Grid layout for dashboard cards.
 */

import React from 'react';

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: 2 | 3 | 4 | 6;
}

export const BentoGrid: React.FC<BentoGridProps> = ({
  children,
  className = '',
  cols = 3,
}) => {
  const colClass = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
  }[cols];

  return (
    <div className={`grid gap-3 sm:gap-4 auto-rows-auto w-full ${colClass} ${className}`}>
      {children}
    </div>
  );
};
