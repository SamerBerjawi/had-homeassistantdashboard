/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responsive Hook for Adaptive Bento Layout Packing
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { BentoItem, PackedBentoItem, packBentoLayout, getBentoVirtualColumns } from '../utils/bentoLayout';

interface UseBentoLayoutOptions {
  forcedColumns?: number;
  gapPx?: number;
}

export function useBentoLayout<T = any>(
  items: BentoItem<T>[],
  options: UseBentoLayoutOptions = {}
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') return window.innerWidth;
    return 1200;
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      const handleResize = () => setContainerWidth(window.innerWidth);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const columns = useMemo(() => {
    if (options.forcedColumns && options.forcedColumns > 0) {
      return options.forcedColumns;
    }
    return getBentoVirtualColumns(containerWidth);
  }, [containerWidth, options.forcedColumns]);

  const packedItems = useMemo<PackedBentoItem<T>[]>(() => {
    return packBentoLayout(items, { columns });
  }, [items, columns]);

  return {
    containerRef,
    containerWidth,
    columns,
    packedItems
  };
}
