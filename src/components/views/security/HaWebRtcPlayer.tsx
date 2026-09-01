/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Backwards-compatibility wrapper for HaWebRtcPlayer.
 * Re-exports the unified player from `src/components/camera/HaWebRtcPlayer.tsx`.
 */

import HaWebRtcPlayer, { HaWebRtcPlayerProps } from '../../camera/HaWebRtcPlayer';

export type { HaWebRtcPlayerProps };
export default HaWebRtcPlayer;
