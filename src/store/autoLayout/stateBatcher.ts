/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Leading + trailing throttle for entity state events. A burst of `state_changed` events becomes
 * one store update per window instead of one per event (each store update re-renders every
 * subscriber of `states`). An isolated event is applied immediately, so single toggles keep their
 * latency. Pending changes are last-write-wins per entity.
 */
export interface StateBatcher<T> {
  push(id: string, value: T): void;
  /** Apply anything pending now. */
  flush(): void;
  /** Drop anything pending (state was replaced wholesale). */
  clear(): void;
}

export function createStateBatcher<T>(
  apply: (batch: Map<string, T>) => void,
  windowMs: number,
  now: () => number = Date.now
): StateBatcher<T> {
  let pending = new Map<string, T>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastFlush = -Infinity;

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (pending.size === 0) return;
    const batch = pending;
    pending = new Map();
    lastFlush = now();
    apply(batch);
  };

  return {
    push(id, value) {
      pending.set(id, value);
      if (timer) return;
      const sinceLast = now() - lastFlush;
      if (sinceLast >= windowMs) {
        flush();
      } else {
        timer = setTimeout(flush, windowMs - sinceLast);
      }
    },
    flush,
    clear() {
      pending = new Map();
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }
  };
}
