/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BentoGrid Component
 * Adaptive zero-gap virtual grid container that packs mixed dimension tiles.
 */

import React from 'react';
import { motion } from 'motion/react';
import { BentoItem, PackedBentoItem } from '../../utils/bentoLayout';
import { useBentoLayout } from '../../hooks/useBentoLayout';

interface BentoGridProps<T = any> {
  items: BentoItem<T>[];
  renderItem: (item: PackedBentoItem<T>) => React.ReactNode;
  className?: string;
  columns?: number;
  gap?: number; // Gap in pixels (default 14px on mobile, 16px on desktop)
  enableMotion?: boolean;
}

export function BentoGrid<T = any>({
  items,
  renderItem,
  className = '',
  columns: forcedColumns,
  gap = 14,
  enableMotion = true
}: BentoGridProps<T>) {
  const { containerRef, columns, packedItems } = useBentoLayout(items, {
    forcedColumns
  });

  return (
    <div
      ref={containerRef}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gridAutoRows: 'minmax(72px, auto)',
        gap: `${gap}px`
      }}
      className={`w-full ${className}`}
    >
      {packedItems.map((item) => {
        const itemContent = renderItem(item);

        if (!enableMotion) {
          return (
            <div
              key={item.id}
              style={{
                gridColumn: item.gridColumn,
                gridRow: item.gridRow
              }}
              className="w-full h-full min-w-0"
            >
              {itemContent}
            </div>
          );
        }

        return (
          <motion.div
            key={item.id}
            layout="position"
            layoutId={item.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{
              type: 'spring',
              stiffness: 380,
              damping: 30
            }}
            style={{
              gridColumn: item.gridColumn,
              gridRow: item.gridRow
            }}
            className="w-full h-full min-w-0"
          >
            {itemContent}
          </motion.div>
        );
      })}
    </div>
  );
}

export default BentoGrid;
