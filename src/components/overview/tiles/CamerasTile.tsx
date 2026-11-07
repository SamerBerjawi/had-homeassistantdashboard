/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CaretRight, CaretLeft, VideoCamera, ArrowsOut } from '@phosphor-icons/react';
import CameraFeed from '../../camera/CameraFeed';
import { getCameraMotionStatus } from '../../../services/cameraIntegrationService';
import type { TileProps } from './types';

export default function CamerasTile({ s, tileId, is2x }: TileProps) {
  const {
    activeCamerasIndex,
    areasMap,
    darkMode,
    domainGroups,
    handleMouseDown,
    handleMouseUp,
    handleNextCamera,
    handlePrevCamera,
    handleTouchEnd,
    handleTouchStart,
    setActiveCamerasIndex,
    setIsCameraModalOpen,
    setSelectedCameraForModal,
    surveillanceCameras
  } = s;

  const isCamerasGroup = tileId === 'cameras';
  const isSpecificCamera = tileId.startsWith('camera:');

  if (!isCamerasGroup && !isSpecificCamera) {
    return null;
  }

  const targetCam = isSpecificCamera
    ? surveillanceCameras.find((c) => c.entity_id === tileId.replace('camera:', '')) || null
    : surveillanceCameras[activeCamerasIndex % Math.max(1, surveillanceCameras.length)] || surveillanceCameras[0] || null;

  const camName = targetCam
    ? targetCam.name || targetCam.attributes?.friendly_name || targetCam.entity_id.replace('camera.', '')
    : 'Surveillance Cameras';

  const camArea = targetCam?.area_id && areasMap?.[targetCam.area_id]?.name
    ? areasMap[targetCam.area_id].name
    : '';

  const motionStatus = targetCam
    ? getCameraMotionStatus(targetCam, domainGroups['binary_sensor'] || [])
    : { isMotionActive: false, lastMotionText: 'No motion detected', relativeTime: '', sensorEntity: null, sensorName: '' };

  const isMotionActive = motionStatus.isMotionActive;

  // 2x Wide Layout
  if (is2x) {
    return (
      <div
        className="w-full group relative h-36 rounded-3xl overflow-hidden isolate border transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-[4px_6px_12px_rgba(0,0,0,0.15)] bg-slate-950 border-white/10 dark:border-white/10 select-none"
        onTouchStart={isCamerasGroup ? handleTouchStart : undefined}
        onTouchEnd={isCamerasGroup ? handleTouchEnd : undefined}
        onMouseDown={isCamerasGroup ? handleMouseDown : undefined}
        onMouseUp={isCamerasGroup ? handleMouseUp : undefined}
      >
        {/* Background Camera Feed / Snapshot */}
        {targetCam ? (
          <div className="absolute inset-0 z-0 overflow-hidden">
            <CameraFeed
              key={targetCam.entity_id}
              camera={targetCam}
              mode="preview"
              darkMode={darkMode}
              showControls={false}
              autoPlay={true}
              muted={true}
              className="w-full h-full object-cover scale-[1.02] group-hover:scale-105 transition-transform duration-700 pointer-events-none"
            />
            {/* Glass gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/75 pointer-events-none" />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-slate-900/60 p-4 text-center">
            <VideoCamera size={32} weight="duotone" className="text-purple-400/50 mb-1" />
            <span className="text-xs font-bold text-slate-400">No Configured RTSP Cameras</span>
          </div>
        )}

        {/* Top Bar: Icon + Name + Controls + Motion/Live badge + Expand button */}
        <div className="relative z-10 flex items-center justify-between p-3.5 sm:p-4 pb-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-purple-500/25 border border-purple-400/30 text-purple-300 backdrop-blur-md flex items-center justify-center shrink-0 shadow-sm">
              <VideoCamera size={18} weight="fill" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-white drop-shadow-md truncate flex items-center gap-1.5">
                <span>{camName}</span>
                {isCamerasGroup && surveillanceCameras.length > 1 && (
                  <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-md bg-purple-500/20 text-purple-200 border border-purple-400/30 font-mono">
                    {(activeCamerasIndex % surveillanceCameras.length) + 1}/{surveillanceCameras.length}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-300/90 font-medium drop-shadow-sm truncate">
                {camArea ? `${camArea} • ` : ''}Live Feed
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Prev / Next Swipe Carets */}
            {isCamerasGroup && surveillanceCameras.length > 1 && (
              <div className="flex items-center gap-0.5 bg-black/40 border border-white/15 p-0.5 rounded-xl backdrop-blur-md shadow-sm mr-0.5" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={handlePrevCamera}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                  title="Previous Camera"
                >
                  <CaretLeft size={12} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={handleNextCamera}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                  title="Next Camera"
                >
                  <CaretRight size={12} weight="bold" />
                </button>
              </div>
            )}

            {isMotionActive ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/40 backdrop-blur-md shadow-md animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                Motion
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-200 border border-emerald-400/30 backdrop-blur-md shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Live
              </span>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (targetCam) {
                  setSelectedCameraForModal(targetCam);
                  setIsCameraModalOpen(true);
                }
              }}
              className="w-7 h-7 rounded-xl bg-black/40 hover:bg-black/70 border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
              title="Open Fullscreen Feed"
            >
              <ArrowsOut size={13} weight="bold" />
            </button>
          </div>
        </div>

        {/* Bottom Bar: Switcher (if multi) + Motion status */}
        <div className="relative z-10 mt-auto flex items-center justify-between p-3.5 sm:p-4 pt-0 gap-2">
          {isCamerasGroup && surveillanceCameras.length > 1 ? (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 max-w-[65%]" onClick={(e) => e.stopPropagation()}>
              {surveillanceCameras.map((cam, idx) => {
                const isSelected = idx === (activeCamerasIndex % surveillanceCameras.length);
                const short = cam.name || cam.attributes?.friendly_name || cam.entity_id.replace('camera.', '');
                return (
                  <button
                    key={cam.entity_id}
                    type="button"
                    onClick={() => setActiveCamerasIndex(idx)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-purple-500 text-white shadow-md'
                        : 'bg-black/50 hover:bg-black/75 text-slate-300 border border-white/10'
                    }`}
                  >
                    {short}
                  </button>
                );
              })}
            </div>
          ) : (
            <span className="text-[11px] text-slate-300/90 font-medium drop-shadow-sm truncate">
              {isMotionActive ? motionStatus.lastMotionText : 'Surveillance stream online'}
            </span>
          )}

          <div className="text-[11px] text-slate-200/90 font-medium drop-shadow-sm truncate ml-auto flex items-center gap-1 shrink-0">
            <span>{isCamerasGroup && surveillanceCameras.length > 1 ? `${surveillanceCameras.length} Cameras` : 'Tap for Stream'}</span>
            <CaretRight size={12} weight="bold" className="group-hover:translate-x-0.5 transition-transform shrink-0 text-slate-300" />
          </div>
        </div>
      </div>
    );
  }

  // 1x Compact Layout (Default size, fully swipeable, full tile video coverage)
  return (
    <div
      className="w-full group relative h-36 rounded-3xl overflow-hidden isolate border transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-[4px_6px_12px_rgba(0,0,0,0.15)] bg-slate-950 border-white/10 dark:border-white/10 select-none"
      onTouchStart={isCamerasGroup ? handleTouchStart : undefined}
      onTouchEnd={isCamerasGroup ? handleTouchEnd : undefined}
      onMouseDown={isCamerasGroup ? handleMouseDown : undefined}
      onMouseUp={isCamerasGroup ? handleMouseUp : undefined}
    >
      {/* Full Tile Background Camera Feed */}
      {targetCam ? (
        <div className="absolute inset-0 z-0 overflow-hidden">
          <CameraFeed
            key={targetCam.entity_id}
            camera={targetCam}
            mode="preview"
            darkMode={darkMode}
            showControls={false}
            autoPlay={true}
            muted={true}
            className="w-full h-full object-cover scale-[1.02] group-hover:scale-105 transition-transform duration-700 pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/75 pointer-events-none" />
        </div>
      ) : (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-slate-900/60 p-3 text-center">
          <VideoCamera size={26} weight="duotone" className="text-purple-400/50 mb-1" />
          <span className="text-[11px] font-bold text-slate-400">No Configured Cameras</span>
        </div>
      )}

      {/* Floating Top Bar */}
      <div className="relative z-10 flex items-center justify-between p-3 sm:p-3.5 pb-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-purple-500/25 border border-purple-400/30 text-purple-200 backdrop-blur-md flex items-center justify-center shrink-0 shadow-sm">
            <VideoCamera size={15} weight="fill" />
          </div>
          {isCamerasGroup && surveillanceCameras.length > 1 && (
            <span className="text-[11px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/25 text-purple-200 border border-purple-400/30 font-mono backdrop-blur-md">
              {(activeCamerasIndex % surveillanceCameras.length) + 1}/{surveillanceCameras.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Quick Prev / Next Swipe Carets */}
          {isCamerasGroup && surveillanceCameras.length > 1 && (
            <div className="flex items-center gap-0.5 bg-black/40 border border-white/15 p-0.5 rounded-lg backdrop-blur-md shadow-sm mr-0.5" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={handlePrevCamera}
                className="w-5 h-5 rounded flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                title="Previous Camera"
                aria-label="Previous Camera"
              >
                <CaretLeft size={11} weight="bold" />
              </button>
              <button
                type="button"
                onClick={handleNextCamera}
                className="w-5 h-5 rounded flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                title="Next Camera"
                aria-label="Next Camera"
              >
                <CaretRight size={11} weight="bold" />
              </button>
            </div>
          )}

          {isMotionActive ? (
            <span className="inline-flex items-center gap-1 text-[11px] sm:text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/40 backdrop-blur-md shadow-md animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              Motion
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] sm:text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-200 border border-emerald-400/30 backdrop-blur-md shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Live
            </span>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (targetCam) {
                setSelectedCameraForModal(targetCam);
                setIsCameraModalOpen(true);
              }
            }}
            className="w-6 h-6 rounded-lg bg-black/40 hover:bg-black/70 border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 shrink-0 backdrop-blur-md ml-0.5"
            title="Open Fullscreen Feed"
          >
            <ArrowsOut size={11} weight="bold" />
          </button>
        </div>
      </div>

      {/* Floating Bottom Bar: Camera Name + Carousel Dots */}
      <div className="relative z-10 mt-auto flex items-center justify-between p-3 sm:p-3.5 pt-0">
        <div className="text-xs sm:text-sm font-bold text-white drop-shadow-md truncate">
          {camName}
        </div>
        {isMotionActive && !isCamerasGroup && (
          <span className="text-[11px] font-bold text-amber-300 drop-shadow-sm truncate ml-2 shrink-0">
            {motionStatus.lastMotionText}
          </span>
        )}
        {isCamerasGroup && surveillanceCameras.length > 1 && (
          <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
            {surveillanceCameras.map((_, idx) => (
              <span
                key={idx}
                className={`h-1 rounded-full transition-all duration-300 ${
                  idx === (activeCamerasIndex % surveillanceCameras.length)
                    ? 'w-2.5 bg-purple-400 shadow-sm'
                    : 'w-1 bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
