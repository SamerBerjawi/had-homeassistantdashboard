/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SortableGrid Component
 * Wraps VirtualGrid in @dnd-kit DndContext and SortableContext during Edit Mode.
 * Seamlessly manages drag-and-drop reordering with touch & pointer sensors,
 * interactive 3D elevated DragOverlay preview, and visual grid overlay support.
 */

import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverlay
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
  const [activeId, setActiveId] = useState<string | null>(null);

  // Configure sensors for touch and pointer with collision guards
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5 // 5px movement required before dragging initiates
    }
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 150, // snappy 150ms hold delay on mobile touch
      tolerance: 8 // 8px move tolerance
    }
  });

  const sensors = useSensors(pointerSensor, touchSensor);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
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

  const handleDragCancel = () => {
    setActiveId(null);
  };

  // If not in Edit Mode, render standard VirtualGrid without DND wrappers
  if (!isEditMode) {
    return (
      <VirtualGrid className={className} style={style}>
        {children}
      </VirtualGrid>
    );
  }

  // Find active child for DragOverlay preview
  const activeChild = React.Children.toArray(children).find((child) => {
    if (React.isValidElement<{ id?: string }>(child)) {
      return child.props?.id === activeId || child.key === activeId;
    }
    return false;
  });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <VirtualGrid className={`relative ${className}`} style={style} showOverlay={isEditMode}>
          {children}
        </VirtualGrid>
      </SortableContext>

      {/* Elevated Floating Drag Preview Overlay */}
      <DragOverlay
        dropAnimation={{
          duration: 180,
          easing: 'cubic-bezier(0.2, 0, 0, 1)'
        }}
      >
        {activeId && React.isValidElement(activeChild) ? (
          <div className="w-full pointer-events-none scale-[1.03] shadow-2xl shadow-sky-500/30 ring-2 ring-sky-400 rounded-3xl opacity-95">
            {React.cloneElement(activeChild as React.ReactElement<Record<string, unknown>>, {
              isOverlay: true
            })}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default SortableGrid;
