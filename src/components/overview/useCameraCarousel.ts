/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef } from 'react';

/**
 * Active index plus gesture and navigation helpers for the multi-camera swipeable carousel tile.
 * justSwipedRef stays true for 300 ms after a swipe so the tile's click handler can ignore it.
 */
export function useCameraCarousel(cameraCount: number) {
  const [activeCamerasIndex, setActiveCamerasIndex] = useState<number>(0);

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const pointerStartXRef = useRef<number | null>(null);
  const justSwipedRef = useRef<boolean>(false);

  const handleNextCamera = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (cameraCount > 0) {
      setActiveCamerasIndex((prev) => (prev + 1) % cameraCount);
    }
  }, [cameraCount]);

  const handlePrevCamera = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (cameraCount > 0) {
      setActiveCamerasIndex((prev) => (prev - 1 + cameraCount) % cameraCount);
    }
  }, [cameraCount]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (Math.abs(deltaX) > 30 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1) {
      justSwipedRef.current = true;
      setTimeout(() => {
        justSwipedRef.current = false;
      }, 300);

      if (deltaX < 0) {
        handleNextCamera();
      } else {
        handlePrevCamera();
      }
    }
  }, [handleNextCamera, handlePrevCamera]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    pointerStartXRef.current = e.clientX;
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (pointerStartXRef.current === null) return;
    const deltaX = e.clientX - pointerStartXRef.current;
    pointerStartXRef.current = null;

    if (Math.abs(deltaX) > 35) {
      justSwipedRef.current = true;
      setTimeout(() => {
        justSwipedRef.current = false;
      }, 300);

      if (deltaX < 0) {
        handleNextCamera();
      } else {
        handlePrevCamera();
      }
    }
  }, [handleNextCamera, handlePrevCamera]);

  return {
    activeCamerasIndex,
    setActiveCamerasIndex,
    touchStartXRef,
    touchStartYRef,
    pointerStartXRef,
    justSwipedRef,
    handleNextCamera,
    handlePrevCamera,
    handleTouchStart,
    handleTouchEnd,
    handleMouseDown,
    handleMouseUp
  };
}
