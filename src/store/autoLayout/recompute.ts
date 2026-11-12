/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GetState } from './types';

let recomputeTimer: ReturnType<typeof setTimeout> | number | null = null;

export const scheduleRecompute = (get: GetState) => {
  if (recomputeTimer) return;
  if (typeof requestAnimationFrame !== 'undefined') {
    recomputeTimer = requestAnimationFrame(() => {
      recomputeTimer = null;
      get().recomputeGraph();
    });
  } else {
    recomputeTimer = setTimeout(() => {
      recomputeTimer = null;
      get().recomputeGraph();
    }, 16);
  }
};
