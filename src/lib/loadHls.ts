/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type Hls from 'hls.js';

let hlsPromise: Promise<typeof Hls> | null = null;

/**
 * Loads hls.js on demand. It's large (~400 KB minified) and only needed when a camera falls
 * back from WebRTC to HLS, so it stays out of the main bundle.
 */
export function loadHls(): Promise<typeof Hls> {
  if (!hlsPromise) {
    hlsPromise = import('hls.js')
      .then((mod) => mod.default)
      .catch((err) => {
        hlsPromise = null; // Allow a retry, e.g. after a network blip
        throw err;
      });
  }
  return hlsPromise;
}
