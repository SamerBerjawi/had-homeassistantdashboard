/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  VideoCamera, 
  ArrowsOut, 
  Camera, 
  Microphone, 
  MicrophoneSlash, 
  Broadcast, 
  PersonSimpleWalk, 
  ShieldCheck, 
  ArrowsClockwise,
  CaretRight,
  Eye,
  Sliders
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import CameraStreamModal from './CameraStreamModal';
import HaWebRtcPlayer from './HaWebRtcPlayer';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { getCameraMotionStatus, captureAndDownloadSnapshot } from '../../../services/cameraIntegrationService';

interface CameraFeedSectionProps {
  darkMode?: boolean;
  cameraEntities: ResolvedEntity[];
  columns?: 1 | 2 | 3 | 4;
}

export default function CameraFeedSection({
  darkMode = true,
  cameraEntities,
  columns = 4
}: CameraFeedSectionProps) {
  const { domainGroups, serverUrl } = useAutoLayoutStore();
  const [selectedCamera, setSelectedCamera] = useState<ResolvedEntity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [areaFilter, setAreaFilter] = useState<'all' | 'perimeter' | 'garage' | 'indoors'>('all');
  const [snapshottingId, setSnapshottingId] = useState<string | null>(null);

  // Fallback cameras if none in registry
  const defaultCameras: ResolvedEntity[] = [
    {
      entity_id: 'camera.front_entrance',
      name: 'Front Entrance & Doorbell Cam',
      state: 'idle',
      domain: 'camera',
      area_id: 'hallway',
      device_id: 'dev_camera_entrance',
      floor_id: 'floor_ground',
      resolutionSource: 'direct_entity_area',
      hidden: false,
      isDiagnostic: false,
      attributes: {
        friendly_name: 'Front Entrance & Doorbell Cam',
        model_name: 'UniFi G4 Doorbell Pro',
        motion_detection: true,
        stream_type: 'webrtc',
        resolution: '2K HDR',
        fps: 30,
        last_motion: '2 mins ago',
        entity_picture: 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?auto=format&fit=crop&q=80&w=1200'
      }
    },
    {
      entity_id: 'camera.driveway_garage',
      name: 'Driveway & Garage Wide Cam',
      state: 'idle',
      domain: 'camera',
      area_id: 'garage',
      device_id: 'dev_camera_garage',
      floor_id: 'floor_ground',
      resolutionSource: 'direct_entity_area',
      hidden: false,
      isDiagnostic: false,
      attributes: {
        friendly_name: 'Driveway & Garage Wide Cam',
        model_name: 'UniFi Protect AI Bullet',
        motion_detection: true,
        stream_type: 'webrtc',
        resolution: '4K Ultra HD',
        fps: 30,
        last_motion: '15 mins ago',
        entity_picture: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&q=80&w=1200'
      }
    },
    {
      entity_id: 'camera.backyard_patio',
      name: 'Backyard & Patio Garden Cam',
      state: 'idle',
      domain: 'camera',
      area_id: 'patio',
      device_id: 'dev_camera_patio',
      floor_id: 'floor_outdoor',
      resolutionSource: 'direct_entity_area',
      hidden: false,
      isDiagnostic: false,
      attributes: {
        friendly_name: 'Backyard & Patio Garden Cam',
        model_name: 'Reolink Argus PT Ultra',
        motion_detection: true,
        stream_type: 'webrtc',
        resolution: '4K ColorX',
        fps: 25,
        last_motion: '1 hour ago',
        entity_picture: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1200'
      }
    },
    {
      entity_id: 'camera.living_room_indoor',
      name: 'Living Room 360 Indoor Cam',
      state: 'idle',
      domain: 'camera',
      area_id: 'living_room',
      device_id: 'dev_camera_living',
      floor_id: 'floor_ground',
      resolutionSource: 'direct_entity_area',
      hidden: false,
      isDiagnostic: false,
      attributes: {
        friendly_name: 'Living Room 360 Indoor Cam',
        model_name: 'Eufy Indoor Cam S350',
        motion_detection: true,
        stream_type: 'hls',
        resolution: '4K Dual-Cam',
        fps: 30,
        last_motion: 'Just now',
        entity_picture: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&q=80&w=1200'
      }
    }
  ];

  const activeCameras = cameraEntities.length > 0 ? cameraEntities : defaultCameras;

  const filteredCameras = activeCameras.filter(c => {
    if (areaFilter === 'all') return true;
    const id = c.entity_id.toLowerCase();
    const name = (c.name || '').toLowerCase();
    if (areaFilter === 'perimeter') return id.includes('entrance') || id.includes('doorbell') || id.includes('backyard') || name.includes('patio');
    if (areaFilter === 'garage') return id.includes('garage') || id.includes('driveway') || name.includes('driveway');
    if (areaFilter === 'indoors') return id.includes('indoor') || id.includes('living') || name.includes('room');
    return true;
  });

  const handleOpenStream = (camera: ResolvedEntity) => {
    setSelectedCamera(camera);
    setIsModalOpen(true);
  };

  const handleTriggerSnapshot = async (e: React.MouseEvent, cam: ResolvedEntity) => {
    e.stopPropagation();
    setSnapshottingId(cam.entity_id);
    await captureAndDownloadSnapshot(null, cam, serverUrl);
    setTimeout(() => setSnapshottingId(null), 1200);
  };

  return (
    <section className="space-y-4">
      {/* Header with Camera Counter & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <VideoCamera size={20} weight="duotone" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              <span>Live Surveillance Feeds</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-mono font-bold">
                {cameraEntities.length} Feeds
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Low-latency WebRTC streams with live motion detection
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold">
          {(['all', 'perimeter', 'garage', 'indoors'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setAreaFilter(filter)}
              className={`px-3 py-1.5 rounded-xl capitalize transition-all cursor-pointer ${
                areaFilter === filter
                  ? 'bg-white dark:bg-cyan-500 text-slate-900 dark:text-slate-950 font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Camera Feeds */}
      <div className={
        columns === 1
          ? 'grid grid-cols-1 gap-4'
          : columns === 2
            ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
            : columns === 3
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4'
      }>
        {filteredCameras.map((camera) => {
          const name = camera.name || camera.attributes?.friendly_name || camera.entity_id;
          const isSnapshotting = snapshottingId === camera.entity_id;
          const motionStatus = getCameraMotionStatus(camera, domainGroups['binary_sensor'] || []);

          return (
            <div
              key={camera.entity_id}
              onClick={() => handleOpenStream(camera)}
              className={`rounded-3xl border overflow-hidden backdrop-blur-xl transition-all duration-300 group cursor-pointer hover:shadow-xl ${
                darkMode
                  ? 'bg-black/60 hover:bg-black/80 border-white/10 hover:border-cyan-500/40 text-white'
                  : 'bg-white/80 hover:bg-white border-slate-200 hover:border-cyan-400 text-slate-900 shadow-sm'
              }`}
            >
              {/* Video Stream Frame with Native HA WebRTC (go2rtc-backed) engine */}
              <div className="relative w-full aspect-video bg-black overflow-hidden">
                <HaWebRtcPlayer
                  camera={camera}
                  darkMode={darkMode}
                  showControls={true}
                  muted={true}
                />

                {/* Top Quick Actions (Flash Snapshot & Expand Modal) */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                  {/* Capture button */}
                  <button
                    type="button"
                    onClick={(e) => handleTriggerSnapshot(e, camera)}
                    title="Download Instant Snapshot"
                    className="p-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/10 transition-all cursor-pointer shadow-md"
                  >
                    <Camera size={14} weight="duotone" className={isSnapshotting ? 'text-emerald-400 animate-spin' : 'text-cyan-400'} />
                  </button>

                  {/* Expand Fullscreen */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenStream(camera);
                    }}
                    title="Open Fullscreen Feed"
                    className="p-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/10 transition-all cursor-pointer shadow-md"
                  >
                    <ArrowsOut size={14} weight="bold" />
                  </button>
                </div>

                {/* Bottom HUD: Motion Alert Indicator */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
                  <div className={`px-2.5 py-1 rounded-xl backdrop-blur-md text-[10px] sm:text-[11px] font-semibold border flex items-center gap-1.5 shadow-md ${
                    motionStatus.isMotionActive
                      ? 'bg-rose-600/90 text-white border-rose-400 animate-pulse shadow-rose-600/40'
                      : 'bg-black/65 text-slate-200 border-white/10'
                  }`}>
                    <PersonSimpleWalk size={13} weight="duotone" className={motionStatus.isMotionActive ? 'text-white' : 'text-amber-400'} />
                    <span>{motionStatus.lastMotionText}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-3.5 sm:p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold tracking-tight">{name}</h4>
                    {(camera.attributes?.is_rtsp_stream || camera.attributes?.stream_source === 'go2rtc') && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                        RTSP
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {camera.attributes?.model_name || 'Encrypted Video Stream'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-cyan-500 dark:text-cyan-400 text-xs font-bold group-hover:translate-x-0.5 transition-transform">
                  <span>View Feed</span>
                  <CaretRight size={14} weight="bold" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stream Modal */}
      <CameraStreamModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        camera={selectedCamera}
        darkMode={darkMode}
      />
    </section>
  );
}
