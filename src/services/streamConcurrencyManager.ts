/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Stream Concurrency Manager
 * Singleton that gates how many simultaneous WebRTC/HLS negotiations are in flight app-wide.
 * Prevents thundering-herd CPU/bandwidth spikes when multiple camera players are mounted.
 */

type ReleaseCallback = () => void;

interface QueuedRequest {
  entityId: string;
  resolve: (release: ReleaseCallback) => void;
  priority: number;
  timer?: any;
}

class StreamConcurrencyManager {
  private maxConcurrent: number = 2;
  private activeNegotiations: Set<string> = new Set();
  private queue: QueuedRequest[] = [];
  private listeners: Set<() => void> = new Set();

  /**
   * Set maximum allowed concurrent stream negotiations (default: 2).
   */
  public setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.max(1, max);
    this.processQueue();
    this.notifyListeners();
  }

  /**
   * Get maximum allowed concurrent stream negotiations.
   */
  public getMaxConcurrent(): number {
    return this.maxConcurrent;
  }

  /**
   * Get count of currently active negotiations.
   */
  public getActiveCount(): number {
    return this.activeNegotiations.size;
  }

  /**
   * Get count of queued negotiation requests.
   */
  public getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Check if a negotiation slot is immediately available.
   */
  public isSlotAvailable(): boolean {
    return this.activeNegotiations.size < this.maxConcurrent;
  }

  /**
   * Acquire a negotiation slot.
   * If slot is available immediately, marks active and returns release function.
   * If busy, queues request and returns a Promise resolving with the release function once a slot frees.
   */
  public acquireSlot(entityId: string, priority: number = 0, timeoutMs: number = 15000): Promise<ReleaseCallback> {
    // If this entity already holds an active negotiation slot, return existing release handle
    if (this.activeNegotiations.has(entityId)) {
      return Promise.resolve(() => this.releaseSlot(entityId));
    }

    // If slots are open and no higher priority items are waiting
    if (this.activeNegotiations.size < this.maxConcurrent && this.queue.length === 0) {
      this.activeNegotiations.add(entityId);
      this.notifyListeners();
      return Promise.resolve(() => this.releaseSlot(entityId));
    }

    // Otherwise, queue the request
    return new Promise<ReleaseCallback>((resolve) => {
      const queuedItem: QueuedRequest = {
        entityId,
        resolve: (release) => {
          if (queuedItem.timer) {
            clearTimeout(queuedItem.timer);
          }
          resolve(release);
        },
        priority
      };

      // Set a fallback queue timeout to prevent requests hanging indefinitely in queue
      queuedItem.timer = setTimeout(() => {
        const idx = this.queue.indexOf(queuedItem);
        if (idx !== -1) {
          this.queue.splice(idx, 1);
          console.warn(`[StreamConcurrencyManager] Queue wait timed out for ${entityId}`);
          this.activeNegotiations.add(entityId);
          this.notifyListeners();
          resolve(() => this.releaseSlot(entityId));
        }
      }, timeoutMs);

      // Insert by priority descending, then FIFO
      const insertIndex = this.queue.findIndex(item => item.priority < priority);
      if (insertIndex === -1) {
        this.queue.push(queuedItem);
      } else {
        this.queue.splice(insertIndex, 0, queuedItem);
      }

      this.notifyListeners();
    });
  }

  /**
   * Release a previously held negotiation slot for an entity.
   */
  public releaseSlot(entityId: string): void {
    if (this.activeNegotiations.has(entityId)) {
      this.activeNegotiations.delete(entityId);
      this.processQueue();
      this.notifyListeners();
    } else {
      // If was in queue, remove it
      const idx = this.queue.findIndex(item => item.entityId === entityId);
      if (idx !== -1) {
        const item = this.queue[idx];
        if (item.timer) clearTimeout(item.timer);
        this.queue.splice(idx, 1);
        this.notifyListeners();
      }
    }
  }

  /**
   * Check if a specific entity is actively negotiating.
   */
  public isNegotiating(entityId: string): boolean {
    return this.activeNegotiations.has(entityId);
  }

  /**
   * Subscribe to concurrency state changes.
   */
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private processQueue(): void {
    while (this.activeNegotiations.size < this.maxConcurrent && this.queue.length > 0) {
      const nextItem = this.queue.shift();
      if (!nextItem) break;
      if (nextItem.timer) clearTimeout(nextItem.timer);

      this.activeNegotiations.add(nextItem.entityId);
      nextItem.resolve(() => this.releaseSlot(nextItem.entityId));
    }
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {
        console.error('[StreamConcurrencyManager] Listener error:', e);
      }
    }
  }
}

export const streamConcurrencyManager = new StreamConcurrencyManager();
