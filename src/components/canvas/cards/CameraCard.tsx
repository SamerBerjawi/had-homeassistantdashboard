/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Camera, Broadcast } from '@phosphor-icons/react';
import { CardConfig } from '../../../types/canvas';
import { HAEntity, ResolvedEntity } from '../../../types';
import CameraNoSignalPlaceholder from '../../ui/CameraNoSignalPlaceholder';
import HaWebRtcPlayer from '../../camera/HaWebRtcPlayer';

interface CameraCardProps {
  config: CardConfig;
  entity?: HAEntity;
  onOpenModal: () => void;
}

export default function CameraCard({
  config,
  entity,
  onOpenModal
}: CameraCardProps) {
  const title = config.title || entity?.attributes?.friendly_name || 'Camera Feed';
  const snapshotUrl = entity?.attributes?.entity_picture || null;

  return (
    <div 
      onClick={onOpenModal}
      className="relative w-full h-full flex flex-col justify-between overflow-hidden rounded-2xl cursor-pointer group bg-black"
    >
      {/* Live Stream or Snapshot Background */}
      {entity ? (
        <div className="absolute inset-0 w-full h-full">
          <HaWebRtcPlayer
            camera={entity as ResolvedEntity}
            mode="preview"
            showControls={false}
            autoPlay={true}
            muted={true}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
        </div>
      ) : snapshotUrl ? (
        <>
          <img
            src={snapshotUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover brightness-[0.75] group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
        </>
      ) : (
        <CameraNoSignalPlaceholder title={title} compact={true} className="absolute inset-0 w-full h-full" />
      )}

      {/* Top row: Status Tag & Live indicator */}
      <div className="relative z-10 flex items-center justify-between p-3 pointer-events-none">
        <div className="flex items-center gap-2 min-w-0">
          <Camera
            size={18}
            weight="duotone"
            className="text-cyan-400 shrink-0 drop-shadow-md"
          />
          <span className="text-xs font-bold text-white drop-shadow-md truncate">{title}</span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/80 backdrop-blur-md text-slate-950 text-[10px] font-black uppercase tracking-wider shrink-0 shadow-md">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
          <span>Live Feed</span>
        </div>
      </div>

      {/* Bottom row: Motion Status badge */}
      <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-200 p-3 pt-1 pointer-events-none">
        <span className="flex items-center gap-1 font-semibold text-emerald-300">
          <Broadcast size={14} weight="duotone" className="text-emerald-400" /> Motion Cleared
        </span>
        <span className="text-[10px] text-slate-300 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-md border border-white/10">
          Tap to Open
        </span>
      </div>
    </div>
  );
}
