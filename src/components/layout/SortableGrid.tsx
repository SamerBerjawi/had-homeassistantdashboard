/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SortableGrid Component
 * Wraps VirtualGrid in @dnd-kit DndContext and SortableContext during Edit Mode.
 * Seamlessly manages drag-and-drop reordering with touch & pointer sensors.
 */

import React from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable';
import VirtualGrid from './VirtualGrid';
import { useEditMode } from '../../contexts/EditModeContext';

export interface SortableGridProps {
  items: string[];
  onReorder?: (newOrderedIds: string[]) => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const SortableGrid: React.FC<SortableGridProps> = ({
  items,
  onReorder,
  children,
  className = '',
  style
}) => {
  const { isEditMode, reorderTiles } = useEditMode();

  // Configure sensors for touch and pointer with collision guards
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 6 // 6px movement required before dragging initiates
    }
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200, // 200ms hold delay on mobile touch
      tolerance: 6 // 6px move tolerance
    }
  });

  const sensors = useSensors(pointerSensor, touchSensor);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.indexOf(String(active.id));
    const newIndex = items.indexOf(String(over.id));

    if (oldIndex !== -1 && newIndex !== -1) {
      const newItems = arrayMove(items, oldIndex, newIndex);
      if (onReorder) {
        onReorder(newItems);
      }
      reorderTiles(newItems);
    }
  };

  // If not in Edit Mode, render standard VirtualGrid without DND wrappers
  if (!isEditMode) {
    return (
      <VirtualGrid className={className} style={style}>
        {children}
      </VirtualGrid>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <VirtualGrid className={`relative ${className}`} style={style}>
          {children}
        </VirtualGrid>
      </SortableContext>
    </DndContext>
  );
};

export default SortableGrid;
