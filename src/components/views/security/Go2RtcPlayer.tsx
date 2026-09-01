/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * go2rtc / WebRTC Player Adapter.
 * Bridges go2rtc and HA native WebSocket signaling using the unified HaWebRtcPlayer component.
 */

import React from 'react';
import HaWebRtcPlayer, { HaWebRtcPlayerProps } from '../../camera/HaWebRtcPlayer';
import { ResolvedEntity } from '../../../types';

export interface Go2RtcPlayerProps extends Omit<HaWebRtcPlayerProps, 'camera'> {
  camera: ResolvedEntity;
}

export default function Go2RtcPlayer(props: Go2RtcPlayerProps) {
  return <HaWebRtcPlayer {...props} />;
}
