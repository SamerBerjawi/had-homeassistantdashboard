/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * VirtualGrid Component
 * Adaptive 12-factor virtual grid container:
 * - Mobile: 4 virtual columns, auto-rows-[minmax(80px,auto)], gap-3
 * - Tablet: 6 to 8 virtual columns, auto-rows-[minmax(86px,auto)], gap-3.5
 * - Desktop: 12 virtual columns, auto-rows-[minmax(92px,auto)], gap-4
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
      style={style}
      className={`w-full grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 auto-rows-[minmax(80px,auto)] sm:auto-rows-[minmax(86px,auto)] lg:auto-rows-[minmax(92px,auto)] gap-3 sm:gap-3.5 lg:gap-4 items-stretch ${className}`}
    >
      {children}
    </div>
  );
};

export default VirtualGrid;
