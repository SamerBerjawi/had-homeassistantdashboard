/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  VideoCamera, 
  ArrowsOut, 
  Camera, 
  PersonSimpleWalk, 
  CaretRight,
  VideoCameraSlash
} from '@phosphor-icons/react';
import { ResolvedEntity } from '../../../types';
import CameraStreamModal from './CameraStreamModal';
import CameraFeed from '../../camera/CameraFeed';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { getCameraMotionStatus, captureAndDownloadSnapshot } from '../../../services/cameraIntegrationService';
import CameraNoSignalPlaceholder from '../../ui/CameraNoSignalPlaceholder';
import { isSurveillanceCamera } from '../../../lib/entityClassifiers';

interface CameraFeedSectionProps {
  darkMode?: boolean;
  cameraEntities: ResolvedEntity[];
  columns?: 1 | 2 | 3 | 4;
}

export default function CameraFeedSection({
  darkMode = true,
  cameraEntities = [],
  columns = 4
}: CameraFeedSectionProps) {
  const { domainGroups, serverUrl, areasMap } = useAutoLayoutStore();
  const [selectedCamera, setSelectedCamera] = useState<ResolvedEntity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [snapshottingId, setSnapshottingId] = useState<string | null>(null);

  const activeCameras = React.useMemo(() => {
    return cameraEntities.filter(isSurveillanceCamera);
  }, [cameraEntities]);

  // Dynamically derive filters matching the actual loaded camera feeds
  const filterTabs = React.useMemo(() => {
    const tabs: { id: string; label: string; count: number }[] = [
      { id: 'all', label: 'All Feeds', count: activeCameras.length }
    ];

    if (activeCameras.length === 0) return tabs;

    // Extract area groupings or individual camera locations
    const areaCounts: Record<string, { label: string; count: number }> = {};
    activeCameras.forEach(cam => {
      const rawAreaId = cam.area_id || '';
      const resolvedAreaName = rawAreaId && areasMap[rawAreaId]?.name 
        ? areasMap[rawAreaId].name 
        : rawAreaId 
          ? rawAreaId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          : (cam.name || cam.attributes?.friendly_name || cam.entity_id.replace('camera.', '')).split(' ')[0];
      
      const filterKey = rawAreaId || cam.entity_id;
      if (!areaCounts[filterKey]) {
        areaCounts[filterKey] = { label: resolvedAreaName, count: 0 };
      }
      areaCounts[filterKey].count += 1;
    });

    const distinctKeys = Object.keys(areaCounts);
    if (distinctKeys.length > 1) {
      distinctKeys.forEach(key => {
        tabs.push({
          id: key,
          label: areaCounts[key].label,
          count: areaCounts[key].count
        });
      });
    } else {
      // If all cameras are in the same area or unassigned, list individual camera names
      activeCameras.forEach(cam => {
        const shortName = cam.name || cam.attributes?.friendly_name || cam.entity_id.replace('camera.', '');
        tabs.push({
          id: cam.entity_id,
          label: shortName,
          count: 1
        });
      });
    }

    return tabs;
  }, [activeCameras, areasMap]);

  // Filter cameras based on active dynamic filter
  const filteredCameras = React.useMemo(() => {
    if (areaFilter === 'all') return activeCameras;
    return activeCameras.filter(c => {
      if (c.entity_id === areaFilter) return true;
      if (c.area_id && c.area_id === areaFilter) return true;
      const areaName = c.area_id && areasMap[c.area_id]?.name ? areasMap[c.area_id].name.toLowerCase() : '';
      if (areaName && areaName === areaFilter.toLowerCase()) return true;
      const camName = (c.name || c.attributes?.friendly_name || '').toLowerCase();
      return camName.includes(areaFilter.toLowerCase());
    });
  }, [activeCameras, areaFilter, areasMap]);

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
          <div className="p-2 rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
            <VideoCamera size={20} weight="duotone" />
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
              <span>Live Surveillance Feeds</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30 font-mono font-bold">
                {activeCameras.length} Feeds
              </span>
            </h3>
          </div>
        </div>

        {/* Dynamic Filter Tabs */}
        {filterTabs.length > 1 && (
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/[0.08] dark:border-white/10 text-xs font-semibold backdrop-blur-md overflow-x-auto max-w-full custom-scrollbar">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAreaFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl capitalize transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  areaFilter === tab.id
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                {tab.id !== 'all' && (
                  <span className={`text-[10px] px-1 py-0.2 rounded-full font-bold ${
                    areaFilter === tab.id ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-900/[0.06] dark:bg-white/10 text-slate-500 dark:text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Empty State when no cameras exist */}
      {activeCameras.length === 0 ? (
        <div className={`p-8 rounded-3xl border flex flex-col items-center justify-center text-center ${
          darkMode ? 'bg-black/40 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}>
          <CameraNoSignalPlaceholder
            title="No Cameras Connected"
            subtitle="Configure camera entities in Home Assistant or go2rtc to view live surveillance feeds."
            iconSize={36}
            className="bg-transparent"
          />
        </div>
      ) : (
        /* Grid of Camera Feeds */
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
                className={`rounded-3xl backdrop-blur-sm transition-all duration-300 group cursor-pointer overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
                  darkMode
                    ? 'bg-black/20 hover:bg-black/30 text-white'
                    : 'bg-white/20 hover:bg-white/30 text-slate-900'
                }`}
              >
                {/* Video Stream Frame with Native HA WebRTC (go2rtc-backed) engine */}
                <div className="relative w-full aspect-video bg-black overflow-hidden">
                  <CameraFeed
                    camera={camera}
                    mode="preview"
                    darkMode={darkMode}
                    showControls={false}
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
      )}

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
