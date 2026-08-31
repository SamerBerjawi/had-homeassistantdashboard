/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Custom hook for long-press & touchmove collision protection.
 * Cancels long-press when user scrolls (> 10px move) and prevents
 * interactive child elements (buttons, inputs) from triggering parent click.
 */

import { useCallback, useRef } from 'react';

export interface UseLongPressOptions {
  threshold?: number;
  onLongPress: (e: React.TouchEvent | React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent | React.TouchEvent) => void;
  cancelOnMove?: boolean;
  moveThreshold?: number;
}

const isInteractiveElement = (target: EventTarget | null): boolean => {
  if (!target || !(target instanceof HTMLElement || target instanceof SVGElement)) return false;
  const el = target instanceof HTMLElement ? target : target.parentElement;
  if (!el) return false;
  return Boolean(el.closest('button, input, select, textarea, a, [role="button"], [data-no-longpress="true"]'));
};

export function useLongPress({
  threshold = 500,
  onLongPress,
  onClick,
  cancelOnMove = true,
  moveThreshold = 10
}: UseLongPressOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const startCoordsRef = useRef<{ x: number; y: number } | null>(null);
  const targetRef = useRef<EventTarget | null>(null);

  const triggerHaptic = useCallback(() => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate(15);
      }
    } catch {
      // Ignore vibration errors
    }
  }, []);

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      targetRef.current = e.target;
      isLongPressRef.current = false;

      if (isInteractiveElement(e.target)) {
        return;
      }

      if ('touches' in e && e.touches.length > 0) {
        startCoordsRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
      } else if ('clientX' in e) {
        startCoordsRef.current = {
          x: e.clientX,
          y: e.clientY
        };
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        triggerHaptic();
        onLongPress(e);
      }, threshold);
    },
    [threshold, onLongPress, triggerHaptic]
  );

  const move = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!cancelOnMove || !startCoordsRef.current || !timerRef.current) return;

      let currentX = 0;
      let currentY = 0;

      if ('touches' in e && e.touches.length > 0) {
        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        currentX = e.clientX;
        currentY = e.clientY;
      }

      const deltaX = Math.abs(currentX - startCoordsRef.current.x);
      const deltaY = Math.abs(currentY - startCoordsRef.current.y);

      if (deltaX > moveThreshold || deltaY > moveThreshold) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    },
    [cancelOnMove, moveThreshold]
  );

  const clear = useCallback(
    (e: React.TouchEvent | React.MouseEvent, shouldTriggerClick = true) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      const wasInteractive = isInteractiveElement(targetRef.current) || isInteractiveElement(e.target);
      startCoordsRef.current = null;
      targetRef.current = null;

      if (shouldTriggerClick && !isLongPressRef.current && !wasInteractive && onClick) {
        onClick(e);
      }
    },
    [onClick]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (isInteractiveElement(e.target)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      triggerHaptic();
      onLongPress(e);
    },
    [onLongPress, triggerHaptic]
  );

  return {
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: (e: React.TouchEvent) => clear(e, true),
    onTouchCancel: (e: React.TouchEvent) => clear(e, false),
    onMouseDown: (e: React.MouseEvent) => {
      if (e.button === 0) {
        start(e);
      }
    },
    onMouseMove: move,
    onMouseUp: (e: React.MouseEvent) => {
      if (e.button === 0) {
        clear(e, true);
      }
    },
    onMouseLeave: (e: React.MouseEvent) => clear(e, false),
    onContextMenu: handleContextMenu
  };
}
