/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let recomputeTimer: any = null;

export const scheduleRecompute = (get: any) => {
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
