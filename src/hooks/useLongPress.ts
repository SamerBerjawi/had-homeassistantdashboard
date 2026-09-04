/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Custom hook for unified pointer-based press, tap, and long-press handling.
 *
 * Features:
 * - Clear tap-vs-scroll distinction: tracks touch movement and cancels pending
 *   taps/actions if the finger moves beyond a threshold (~10px) during a scroll gesture.
 * - Suppresses trailing synthetic click events following a scroll or long-press.
 * - Standardized on Pointer Events (onPointerDown, onPointerMove, onPointerUp, onPointerCancel)
 *   to avoid duplicate event firing across hybrid touch/mouse devices.
 * - Allows child interactive controls (buttons, inputs, sliders, links) to function natively
 *   without triggering parent tile handlers.
 * - Zero artificial tap latency: quick taps fire immediately on pointerup.
 */

import { useCallback, useRef } from 'react';

export interface UseLongPressOptions {
  threshold?: number;
  onLongPress?: (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => void;
  onClick?: (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => void;
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
  threshold = 450,
  onLongPress,
  onClick,
  cancelOnMove = true,
  moveThreshold = 10
}: UseLongPressOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const isScrolledRef = useRef(false);
  const hasFiredActionRef = useRef(false);
  const startCoordsRef = useRef<{ x: number; y: number } | null>(null);
  const startTimeRef = useRef<number>(0);
  const targetRef = useRef<EventTarget | null>(null);
  const scrollResetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerHaptic = useCallback(() => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate(15);
      }
    } catch {
      // Ignore vibration errors
    }
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only process primary pointer button (left click or touch/stylus primary contact)
      if (e.button !== 0) return;

      if (isInteractiveElement(e.target)) {
        return;
      }

      if (scrollResetTimerRef.current) {
        clearTimeout(scrollResetTimerRef.current);
        scrollResetTimerRef.current = null;
      }

      targetRef.current = e.target;
      isLongPressRef.current = false;
      isScrolledRef.current = false;
      hasFiredActionRef.current = false;
      startCoordsRef.current = { x: e.clientX, y: e.clientY };
      startTimeRef.current = Date.now();

      clearTimer();

      if (onLongPress) {
        timerRef.current = setTimeout(() => {
          // If the user already scrolled, do not fire long press
          if (isScrolledRef.current) return;
          isLongPressRef.current = true;
          triggerHaptic();
          onLongPress(e);
        }, threshold);
      }
    },
    [threshold, onLongPress, triggerHaptic, clearTimer]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!cancelOnMove || !startCoordsRef.current || isScrolledRef.current) return;

      const deltaX = Math.abs(e.clientX - startCoordsRef.current.x);
      const deltaY = Math.abs(e.clientY - startCoordsRef.current.y);

      // If finger/cursor moved beyond the movement threshold, mark as a scroll gesture
      if (deltaX > moveThreshold || deltaY > moveThreshold) {
        isScrolledRef.current = true;
        clearTimer();
      }
    },
    [cancelOnMove, moveThreshold, clearTimer]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      clearTimer();

      const wasInteractive = isInteractiveElement(targetRef.current) || isInteractiveElement(e.target);
      const wasScrolled = isScrolledRef.current;
      const wasLongPress = isLongPressRef.current;

      startCoordsRef.current = null;
      targetRef.current = null;

      // If gesture was a scroll or long-press, do NOT trigger tap/click
      if (wasScrolled || wasLongPress) {
        // Keep isScrolledRef = true for a brief duration (250ms) to swallow any trailing synthetic click event
        if (wasScrolled) {
          if (scrollResetTimerRef.current) clearTimeout(scrollResetTimerRef.current);
          scrollResetTimerRef.current = setTimeout(() => {
            isScrolledRef.current = false;
            scrollResetTimerRef.current = null;
          }, 250);
        }
        return;
      }

      // Valid quick tap!
      if (!wasInteractive && onClick) {
        hasFiredActionRef.current = true;
        onClick(e);

        // Reset hasFiredAction after standard synthetic click dispatch window
        setTimeout(() => {
          hasFiredActionRef.current = false;
        }, 300);
      }
    },
    [onClick, clearTimer]
  );

  const handlePointerCancel = useCallback(() => {
    clearTimer();
    isScrolledRef.current = true;
    startCoordsRef.current = null;
    targetRef.current = null;

    if (scrollResetTimerRef.current) clearTimeout(scrollResetTimerRef.current);
    scrollResetTimerRef.current = setTimeout(() => {
      isScrolledRef.current = false;
      scrollResetTimerRef.current = null;
    }, 250);
  }, [clearTimer]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Prevent click if this was a scroll gesture or long-press
      if (isScrolledRef.current || isLongPressRef.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // If pointerup already triggered onClick, swallow duplicate synthetic click
      if (hasFiredActionRef.current) {
        e.preventDefault();
        return;
      }

      // Fallback for keyboard navigation (Enter/Space on focused elements)
      if (!isInteractiveElement(e.target) && onClick) {
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
      if (onLongPress) {
        triggerHaptic();
        onLongPress(e);
      }
    },
    [onLongPress, triggerHaptic]
  );

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
    onClick: handleClick,
    onContextMenu: handleContextMenu,
    style: { touchAction: 'pan-y' as const }
  };
}

/**
 * Convenience hook for simple buttons and cards that need tap-vs-scroll
 * gesture distinction without long-press behavior.
 */
export function usePress({
  onClick,
  moveThreshold = 10
}: {
  onClick?: (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => void;
  moveThreshold?: number;
}) {
  return useLongPress({
    onClick,
    moveThreshold,
    threshold: 999999
  });
}
