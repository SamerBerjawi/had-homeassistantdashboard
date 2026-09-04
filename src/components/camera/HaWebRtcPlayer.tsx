/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * HaWebRtcPlayer
 * Backward-compatibility wrapper delegating directly to the unified CameraFeed component.
 */

import React from 'react';
import CameraFeed, { CameraFeedProps, CameraEngine } from './CameraFeed';
import { ResolvedEntity } from '../../types';

export interface HaWebRtcPlayerProps {
  camera: ResolvedEntity | { entity_id: string; name?: string; attributes?: any; state?: string };
  mode?: 'live' | 'preview';
  darkMode?: boolean;
  className?: string;
  showControls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  isIntercomActive?: boolean;
  preferProtocol?: 'auto' | 'mse' | 'webrtc' | 'hls' | 'mjpeg' | 'snapshot' | 'go2rtc' | 'ha';
  codecMode?: string;
  previewIntervalMs?: number;
  onReady?: () => void;
  onError?: (error: Error | string) => void;
  onSnapshotReady?: (canvas: HTMLCanvasElement) => void;
  onGoLive?: () => void;
}

export default function HaWebRtcPlayer({
  camera,
  mode = 'live',
  darkMode = true,
  className = '',
  showControls = true,
  autoPlay = true,
  muted = true,
  preferProtocol,
  onReady,
  onError
}: HaWebRtcPlayerProps) {
  // Normalize legacy preferProtocol options
  const normalizedProtocol: CameraEngine | undefined =
    preferProtocol === 'webrtc' || preferProtocol === 'hls' || preferProtocol === 'snapshot' || preferProtocol === 'go2rtc' || preferProtocol === 'ha'
      ? (preferProtocol as CameraEngine)
      : preferProtocol === 'mse'
      ? 'go2rtc'
      : undefined;

  return (
    <CameraFeed
      camera={camera}
      mode={mode}
      darkMode={darkMode}
      className={className}
      showControls={showControls}
      autoPlay={autoPlay}
      muted={muted}
      preferProtocol={normalizedProtocol}
      onReady={onReady}
      onError={(err) => onError?.(err)}
    />
  );
}
