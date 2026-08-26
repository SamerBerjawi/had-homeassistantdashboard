/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Camera, Radio, Shield, Maximize2 } from 'lucide-react';
import { CardConfig } from '../../../types/canvas';
import { HAEntity } from '../../../types';

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
  const title = config.title || 'Front Entrance Camera';
  const snapshotUrl = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800';

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden rounded-2xl">
      {/* Live Stream Snapshot Background */}
      <img
        src={snapshotUrl}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover brightness-[0.75] group-hover:scale-105 transition-transform duration-500"
      />
      {/* Live HUD Gradient Overlay */}
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

      {/* Top row: Status Tag & Live indicator */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center">
            <Camera size={16} />
          </div>
          <span className="text-xs font-bold text-white drop-shadow-md truncate">{title}</span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/80 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          <span>Live 1080p</span>
        </div>
      </div>

      {/* Bottom row: Motion Status badge */}
      <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-200 pt-1">
        <span className="flex items-center gap-1 font-semibold text-emerald-300">
          <Radio size={12} className="text-emerald-400" /> Motion Cleared
        </span>
        <span className="text-[10px] text-slate-400 bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-md">
          WebRTC Low Latency
        </span>
      </div>
    </div>
  );
}
