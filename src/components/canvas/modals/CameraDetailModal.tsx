/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Camera } from '@phosphor-icons/react';
import CardModalContainer from './CardModalContainer';
import CameraFeed from '../../camera/CameraFeed';
import CameraNoSignalPlaceholder from '../../ui/CameraNoSignalPlaceholder';

interface CameraDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  cameraName?: string;
  entityId?: string;
  snapshotUrl?: string | null;
}

export default function CameraDetailModal({
  isOpen,
  onClose,
  cameraName = 'Surveillance Camera',
  entityId = 'camera.surveillance',
  snapshotUrl = null
}: CameraDetailModalProps) {
  return (
    <CardModalContainer
      isOpen={isOpen}
      onClose={onClose}
      title={cameraName}
      subtitle="Camera Feed"
      icon={<Camera size={22} weight="duotone" className="text-cyan-400" />}
      maxWidth="max-w-2xl"
    >
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl">
        {entityId ? (
          <CameraFeed
            camera={{ entity_id: entityId, name: cameraName }}
            mode="live"
            showControls={false}
          />
        ) : snapshotUrl ? (
          <img
            src={snapshotUrl}
            alt={cameraName}
            className="w-full h-full object-cover"
          />
        ) : (
          <CameraNoSignalPlaceholder title={cameraName} subtitle="Live stream unavailable" />
        )}
      </div>
    </CardModalContainer>
  );
}
