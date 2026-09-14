/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * CameraSettingsSection
 * Configure RTSP camera streams, go2rtc sidecar conversion, and live playback settings.
 * Designed with glassmorphic cards and layout consistency matching BackupRestoreSection.
 */

import React, { useState, useEffect } from 'react';
import {
  VideoCamera,
  Plus,
  Trash,
  PencilSimple,
  CheckCircle,
  WarningCircle,
  Broadcast,
  Play,
  ArrowCounterClockwise,
  ShieldCheck,
  Info
} from '@phosphor-icons/react';
import { HAEntity, ToastNotification } from '../../types';
import { useUserConfig } from '../../contexts/ConfigContext';
import { CameraSourceConfig } from '../../types/userConfig';
import { getAuthHeaders } from '../../services/configStorageService';
import CameraFeed from '../camera/CameraFeed';

interface CameraSettingsSectionProps {
  darkMode: boolean;
  entities: HAEntity[];
  addToast?: (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => void;
}

export default function CameraSettingsSection({
  darkMode,
  entities,
  addToast
}: CameraSettingsSectionProps) {
  const { config, updateConfig } = useUserConfig();
  const configuredSources = config.cameras?.sources || {};

  const [editingCameraId, setEditingCameraId] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [cameraName, setCameraName] = useState<string>('');
  const [rtspUrl, setRtspUrl] = useState<string>('');
  const [liveType, setLiveType] = useState<'auto' | 'webrtc' | 'hls'>('auto');
  const [testingCameraId, setTestingCameraId] = useState<string | null>(null);
  const [go2rtcOnline, setGo2rtcOnline] = useState<boolean | null>(null);
  const [isCheckingGo2rtc, setIsCheckingGo2rtc] = useState<boolean>(false);

  // Filter available Home Assistant camera entities
  const haCameraEntities = entities.filter(e => e.entity_id.startsWith('camera.'));

  // Check go2rtc sidecar health
  const checkGo2rtcHealth = async () => {
    setIsCheckingGo2rtc(true);
    try {
      const res = await fetch('/api/cameras/status');
      if (res.ok) {
        const data = await res.json();
        setGo2rtcOnline(Boolean(data.go2rtcOnline));
      } else {
        setGo2rtcOnline(false);
      }
    } catch {
      setGo2rtcOnline(false);
    } finally {
      setIsCheckingGo2rtc(false);
    }
  };

  useEffect(() => {
    checkGo2rtcHealth();
  }, []);

  // When an entity is selected from the dropdown, auto-fill name and stream_source if available
  const handleSelectEntity = (entityId: string) => {
    setSelectedEntityId(entityId);
    if (!entityId) return;

    const matched = entities.find(e => e.entity_id === entityId);
    if (matched) {
      if (!cameraName) {
        setCameraName(matched.attributes?.friendly_name || matched.entity_id);
      }
      if (!rtspUrl && matched.attributes?.stream_source) {
        setRtspUrl(matched.attributes.stream_source);
      }
    }
  };

  const handleStartEdit = (source: CameraSourceConfig) => {
    setEditingCameraId(source.id);
    setSelectedEntityId(source.haEntityId || source.id);
    setCameraName(source.name || '');
    setRtspUrl(source.rtspUrl || '');
    setLiveType(source.liveType || 'auto');
  };

  const handleCancelEdit = () => {
    setEditingCameraId(null);
    setSelectedEntityId('');
    setCameraName('');
    setRtspUrl('');
    setLiveType('auto');
  };

  const handleSaveCamera = () => {
    const trimmedId = (selectedEntityId || editingCameraId || `camera.stream_${Date.now()}`).trim();
    const trimmedUrl = rtspUrl.trim();

    if (!trimmedId) {
      addToast?.({ type: 'warning', title: 'Camera ID Required', message: 'Please select an entity or provide an ID.' });
      return;
    }

    if (!trimmedUrl) {
      addToast?.({ type: 'warning', title: 'RTSP URL Required', message: 'Please provide a valid RTSP stream URL.' });
      return;
    }

    const updatedSources: Record<string, CameraSourceConfig> = {
      ...configuredSources,
      [trimmedId]: {
        id: trimmedId,
        name: cameraName.trim() || trimmedId,
        rtspUrl: trimmedUrl,
        haEntityId: selectedEntityId || trimmedId,
        liveType
      }
    };

    updateConfig({
      cameras: {
        sources: updatedSources
      }
    });

    addToast?.({
      type: 'success',
      title: 'Camera Saved',
      message: `Stream configuration for "${cameraName.trim() || trimmedId}" persisted.`
    });

    handleCancelEdit();
  };

  const handleDeleteCamera = async (id: string) => {
    const updatedSources = { ...configuredSources };
    delete updatedSources[id];

    updateConfig({
      cameras: {
        sources: updatedSources
      }
    });

    // Notify backend endpoint to clean up stream and persistent config immediately
    try {
      await fetch(`/api/cameras/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
    } catch (err) {
      console.warn('[CameraSettings] Could not notify backend of camera deletion:', err);
    }

    if (testingCameraId === id) {
      setTestingCameraId(null);
    }

    addToast?.({
      type: 'info',
      title: 'Camera Removed',
      message: `Camera stream "${id}" removed from dashboard configuration.`
    });
  };

  // Helper to mask RTSP credentials in display
  const maskRtspUrl = (url: string) => {
    return url.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@');
  };

  return (
    <div className="w-full flex flex-col gap-6 max-w-5xl mx-auto animate-fadeIn">
      {/* 1. Header Card with go2rtc Status */}
      <div className={`p-6 rounded-3xl border ${
        darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white/80 border-slate-200'
      } backdrop-blur-xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <VideoCamera size={32} weight="duotone" />
          </div>
          <div>
            <h2 className={`text-xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              RTSP Camera Feeds & go2rtc Sidecar
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
              Convert raw RTSP IP camera streams into native browser WebRTC (lowest latency) and HLS fallback via the go2rtc sidecar engine.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-stretch md:self-auto justify-end">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
            go2rtcOnline === true
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : go2rtcOnline === false
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              go2rtcOnline === true ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`} />
            <span>
              {isCheckingGo2rtc
                ? 'Probing go2rtc...'
                : go2rtcOnline === true
                ? 'go2rtc Sidecar Connected'
                : 'go2rtc Sidecar Standby'}
            </span>
          </div>

          <button
            onClick={checkGo2rtcHealth}
            disabled={isCheckingGo2rtc}
            title="Refresh go2rtc status"
            className={`p-2 rounded-xl border transition-all ${
              darkMode 
                ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300' 
                : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <ArrowCounterClockwise size={16} className={isCheckingGo2rtc ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 2. Add / Edit Camera Form */}
      <div className={`p-6 rounded-3xl border ${
        darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white/80 border-slate-200'
      } backdrop-blur-xl shadow-xl flex flex-col gap-5`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Plus size={20} className="text-cyan-400" />
            <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {editingCameraId ? 'Edit RTSP Camera Source' : 'Add RTSP Camera Source'}
            </h3>
          </div>
          {editingCameraId && (
            <button
              onClick={handleCancelEdit}
              className="text-xs text-slate-400 hover:text-white px-3 py-1 rounded-lg bg-white/5 border border-white/10"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* HA Entity Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">
              Home Assistant Camera Entity
            </label>
            <select
              value={selectedEntityId}
              onChange={(e) => handleSelectEntity(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border transition-colors outline-none ${
                darkMode
                  ? 'bg-slate-950 border-white/10 text-white focus:border-cyan-500/50'
                  : 'bg-white border-slate-200 text-slate-900 focus:border-cyan-500'
              }`}
            >
              <option value="">-- Choose an entity (or configure custom ID) --</option>
              {haCameraEntities.map(e => (
                <option key={e.entity_id} value={e.entity_id}>
                  {e.attributes?.friendly_name || e.entity_id} ({e.entity_id})
                </option>
              ))}
            </select>
          </div>

          {/* Display Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">
              Display Name
            </label>
            <input
              type="text"
              placeholder="e.g. Front Doorbell, Driveway, Garage"
              value={cameraName}
              onChange={(e) => setCameraName(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border transition-colors outline-none ${
                darkMode
                  ? 'bg-slate-950 border-white/10 text-white focus:border-cyan-500/50'
                  : 'bg-white border-slate-200 text-slate-900 focus:border-cyan-500'
              }`}
            />
          </div>

          {/* RTSP Stream URL */}
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-400 flex items-center justify-between">
              <span>RTSP Source Stream URL</span>
              <span className="text-[10px] text-slate-500 font-normal">
                Supported: rtsp://, rtsps://, http:// (HLS/FLV/MJPEG)
              </span>
            </label>
            <input
              type="text"
              placeholder="rtsp://admin:password@192.168.1.50:554/h264Preview_01_main"
              value={rtspUrl}
              onChange={(e) => setRtspUrl(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border transition-colors outline-none ${
                darkMode
                  ? 'bg-slate-950 border-white/10 text-white focus:border-cyan-500/50'
                  : 'bg-white border-slate-200 text-slate-900 focus:border-cyan-500'
              }`}
            />
          </div>

          {/* Preferred Live Protocol */}
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-400">
              Preferred Streaming Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'auto', title: 'Auto (WebRTC + HLS Fallback)', desc: 'Lowest latency WebRTC with seamless HLS resilience' },
                { id: 'webrtc', title: 'WebRTC Only', desc: 'Direct sub-second latency via browser RTCPeerConnection' },
                { id: 'hls', title: 'HLS Only', desc: 'Standard HTTP Live Streaming via hls.js' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLiveType(opt.id as any)}
                  className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                    liveType === opt.id
                      ? 'bg-cyan-500/15 border-cyan-500 text-cyan-400 shadow-md shadow-cyan-500/10'
                      : darkMode
                      ? 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs font-bold">{opt.title}</span>
                  <span className="text-[10px] text-slate-400 leading-snug">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={handleSaveCamera}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 transition-all active:scale-[0.98]"
          >
            <CheckCircle size={16} weight="bold" />
            <span>{editingCameraId ? 'Update Camera Stream' : 'Save Camera Stream'}</span>
          </button>
        </div>
      </div>

      {/* 3. Configured Cameras List */}
      <div className={`p-6 rounded-3xl border ${
        darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white/80 border-slate-200'
      } backdrop-blur-xl shadow-xl flex flex-col gap-4`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Configured RTSP Streams ({Object.keys(configuredSources).length})
          </h3>
        </div>

        {Object.keys(configuredSources).length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center gap-3">
            <div className="p-3 rounded-2xl bg-white/5 text-slate-400 border border-white/10">
              <VideoCamera size={32} weight="duotone" />
            </div>
            <div className="flex flex-col gap-1">
              <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                No RTSP Cameras Configured Yet
              </span>
              <p className="text-xs text-slate-400 max-w-md">
                Select your camera above, paste its RTSP URL, and click "Save Camera Stream". Live video feeds will immediately stream in Area and Security views.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {Object.values(configuredSources).map((src) => {
              const isTesting = testingCameraId === src.id;
              const matchedEntity = entities.find(e => e.entity_id === src.id);
              const stubEntity: HAEntity = matchedEntity || {
                entity_id: src.id,
                state: 'idle',
                attributes: {
                  friendly_name: src.name || src.id
                }
              };

              return (
                <div
                  key={src.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 ${
                    darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <Broadcast size={20} weight="duotone" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {src.name || src.id}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 uppercase tracking-wider">
                            {src.liveType || 'auto'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-mono">
                          <span>{src.id}</span>
                          <span>•</span>
                          <span className="truncate max-w-xs">{maskRtspUrl(src.rtspUrl || '')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => setTestingCameraId(isTesting ? null : src.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          isTesting
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <Play size={14} weight="bold" />
                        <span>{isTesting ? 'Hide Test' : 'Test Stream'}</span>
                      </button>

                      <button
                        onClick={() => handleStartEdit(src)}
                        title="Edit camera configuration"
                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all"
                      >
                        <PencilSimple size={14} />
                      </button>

                      <button
                        onClick={() => handleDeleteCamera(src.id)}
                        title="Delete camera configuration"
                        className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Inline Test Player Viewport */}
                  {isTesting && (
                    <div className="mt-2 rounded-2xl overflow-hidden border border-cyan-500/30 bg-black aspect-video max-w-xl mx-auto w-full shadow-2xl relative">
                      <CameraFeed
                        camera={stubEntity}
                        mode="live"
                        autoPlay={true}
                        muted={true}
                        showControls={true}
                        className="w-full h-full"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Tips & Camera Compatibility Info Card */}
      <div className={`p-5 rounded-3xl border ${
        darkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'
      } flex items-start gap-3 text-xs text-slate-400 leading-relaxed`}>
        <Info size={20} className="text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-300">Quick Setup Tips:</span>
          <ul className="list-disc list-inside mt-1 space-y-1 text-slate-400">
            <li>Ensure the <code className="text-cyan-400">go2rtc</code> sidecar container is running on port 1984 in your docker-compose stack.</li>
            <li>For Reolink, Tapo, and Hikvision cameras, use standard RTSP sub-streams (e.g. <code className="text-slate-300">rtsp://user:pass@192.168.1.x:554/h264Preview_01_sub</code>) for fastest load times on mobile wall tablets.</li>
            <li>If a camera has no RTSP source configured, it automatically renders the still snapshot from Home Assistant unchanged.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
