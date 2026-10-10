/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let mockPromise: Promise<typeof import('./mockRegistries')> | null = null;

/**
 * Loads the demo-mode registries on demand, keeping ~120 KB of sample data out of the main
 * bundle for live users.
 */
export function loadMockRegistries(): Promise<typeof import('./mockRegistries')> {
  if (!mockPromise) {
    mockPromise = import('./mockRegistries').catch((err) => {
      mockPromise = null;
      throw err;
    });
  }
  return mockPromise;
}
