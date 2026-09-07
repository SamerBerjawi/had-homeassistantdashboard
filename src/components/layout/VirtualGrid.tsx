/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * VirtualGrid Component
 * Adaptive 12-factor virtual grid container:
 * - Mobile: 4 virtual columns (compact tile = 2 cols -> 2 per row)
 * - Tablet: 6 virtual columns (compact tile = 3 cols -> 2 per row)
 * - Desktop: 12 virtual columns (compact tile = 3 or 4 cols -> 3-4 per row)
 */

import React from 'react';

export interface VirtualGridProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const VirtualGrid: React.FC<VirtualGridProps> = ({
  children,
  className = '',
  style
}) => {
  return (
    <div
      style={{
        gridAutoRows: '2px',
        gridAutoFlow: 'dense',
        rowGap: '0px',
        ...style
      }}
      className={`w-full grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-x-3 sm:gap-x-3.5 lg:gap-x-4 items-start ${className}`}
    >
      {children}
    </div>
  );
};

export default VirtualGrid;
