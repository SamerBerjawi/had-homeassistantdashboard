/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CameraSettingsModal
 * Provides granular, per-camera streaming settings:
 * 1. Stream Engine (Auto, go2rtc Iframe, Home Assistant, Snapshot Only)
 * 2. Custom go2rtc URL template with live token resolution ({entity_id}, {entity_object_id})
 * 3. go2rtc mode (Auto, WebRTC, MSE)
 * 4. Refresh mode (Interval vs Motion Sensor Triggered)
 * 5. Refresh interval (seconds)
 * 6. Associated motion sensor entity picker
 * 7. In-app HEVC / H.265 Transcoding directive guide with 1-click copy
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  SlidersHorizontal,
  Broadcast,
  Check,
  Copy,
  Info,
  Warning,
  VideoCamera,
  ArrowsClockwise,
  Lightning,
  Sparkle
} from '@phosphor-icons/react';
import {
  CameraEntitySettings,
  getCameraSettings,
  saveCameraSettings
} from '../../services/haCameraService';
import { resolveCameraTemplate } from './CameraFeed';
import { generateGo2RtcConfigSnippet } from '../../services/go2rtcService';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';

export interface CameraSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: string;
  cameraName?: string;
  rtspUrl?: string;
  darkMode?: boolean;
  onSettingsSaved?: (settings: CameraEntitySettings) => void;
}

export default function CameraSettingsModal({
  isOpen,
  onClose,
  entityId,
  cameraName = 'Camera',
  rtspUrl,
  darkMode = true,
  onSettingsSaved
}: CameraSettingsModalProps) {
  const { domainGroups } = useAutoLayoutStore();
  const [settings, setSettings] = useState<CameraEntitySettings>(() => getCameraSettings(entityId));
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Reload settings on open or entity change
  useEffect(() => {
    if (isOpen && entityId) {
      setSettings(getCameraSettings(entityId));
      setSavedSuccess(false);
    }
  }, [isOpen, entityId]);

  // Motion sensor candidate entities (binary_sensor.*)
  const motionSensors = useMemo(() => {
    const raw = domainGroups['binary_sensor'] || [];
    return raw.filter((b) => {
      const devClass = (b.attributes?.device_class || '').toLowerCase();
      const id = b.entity_id.toLowerCase();
      return (
        devClass === 'motion' ||
        devClass === 'occupancy' ||
        id.includes('motion') ||
        id.includes('occupancy')
      );
    });
  }, [domainGroups]);

  if (!isOpen) return null;

  const resolvedUrlPreview = settings.cameraWebrtcUrl
    ? resolveCameraTemplate(settings.cameraWebrtcUrl, entityId)
    : '';

  const snippet = generateGo2RtcConfigSnippet(entityId, rtspUrl);

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleSave = () => {
    saveCameraSettings(entityId, settings);
    onSettingsSaved?.(settings);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const insertTemplateTag = (tag: string) => {
    setSettings((prev) => ({
      ...prev,
      cameraWebrtcUrl: `${prev.cameraWebrtcUrl || ''}${tag}`
    }));
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/75 backdrop-blur-md animate-fadeIn">
      <div
        className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ${
          darkMode
            ? 'bg-slate-950/95 border-white/10 text-white'
            : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/80'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <SlidersHorizontal size={20} weight="bold" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Camera Stream Settings</h2>
              <p className="text-xs text-slate-400 truncate max-w-sm">
                {cameraName} <span className="font-mono text-[11px] text-cyan-400">({entityId})</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          {/* 1. Stream Engine Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Primary Stream Engine
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: 'auto', label: 'Auto', desc: 'Capability-first' },
                  { id: 'go2rtc', label: 'go2rtc', desc: 'Direct Iframe' },
                  { id: 'ha', label: 'HA Native', desc: 'WebRTC / HLS' },
                  { id: 'snapshot', label: 'Snapshot', desc: 'Bandwidth Saver' }
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, cameraStreamEngine: opt.id }))}
                  className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    settings.cameraStreamEngine === opt.id
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold shadow-md shadow-cyan-500/10'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="text-xs font-bold">{opt.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Custom go2rtc WebRTC URL Template */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                go2rtc URL Template (Iframe Escape Hatch)
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => insertTemplateTag('{entity_object_id}')}
                  className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-mono text-cyan-300 transition-colors cursor-pointer"
                  title="Insert entity object id tag"
                >
                  +{'{entity_object_id}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertTemplateTag('{entity_id}')}
                  className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-mono text-cyan-300 transition-colors cursor-pointer"
                  title="Insert full entity id tag"
                >
                  +{'{entity_id}'}
                </button>
              </div>
            </div>
            <input
              type="text"
              value={settings.cameraWebrtcUrl || ''}
              onChange={(e) => setSettings((s) => ({ ...s, cameraWebrtcUrl: e.target.value }))}
              placeholder="e.g. http://192.168.1.50:1984/stream.html?src={entity_object_id}"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono outline-none transition-all ${
                darkMode
                  ? 'bg-black/40 border-white/10 text-white focus:border-cyan-400'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500'
              }`}
            />
            {resolvedUrlPreview && (
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] font-mono text-cyan-300 truncate">
                Preview: {resolvedUrlPreview}
              </div>
            )}
            <p className="text-[11px] text-slate-400">
              When configured, the feed loads directly from go2rtc via a sandboxed player, bypassing Home Assistant signaling overhead.
            </p>
          </div>

          {/* 3. go2rtc Stream Mode */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              go2rtc Stream Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'auto', label: 'Auto Negotiate' },
                  { id: 'webrtc', label: 'Force WebRTC' },
                  { id: 'mse', label: 'Force MSE' }
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, cameraGo2rtcMode: m.id }))}
                  className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                    (settings.cameraGo2rtcMode || 'auto') === m.id
                      ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-md shadow-purple-500/10'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Snapshot & Preview Refresh Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Refresh Trigger
              </label>
              <select
                value={settings.cameraRefreshMode || 'interval'}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, cameraRefreshMode: e.target.value as any }))
                }
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold outline-none transition-all cursor-pointer ${
                  darkMode
                    ? 'bg-black/40 border-white/10 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <option value="interval">Periodic Interval</option>
                <option value="motion">Motion Sensor Triggered</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Interval (Seconds)
              </label>
              <input
                type="number"
                min={2}
                max={300}
                value={settings.cameraRefreshInterval || 10}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    cameraRefreshInterval: Math.max(2, parseInt(e.target.value, 10) || 10)
                  }))
                }
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold outline-none transition-all ${
                  darkMode
                    ? 'bg-black/40 border-white/10 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* 5. Motion Sensor Picker */}
          {settings.cameraRefreshMode === 'motion' && (
            <div className="space-y-2 animate-fadeIn">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Associated Motion Entity
              </label>
              <select
                value={settings.cameraMotionSensor || ''}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, cameraMotionSensor: e.target.value || undefined }))
                }
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono outline-none transition-all cursor-pointer ${
                  darkMode
                    ? 'bg-black/40 border-white/10 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <option value="">-- Select Motion Sensor --</option>
                {motionSensors.map((s) => (
                  <option key={s.entity_id} value={s.entity_id}>
                    {s.attributes?.friendly_name || s.name || s.entity_id} ({s.entity_id})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 6. HEVC / H.265 Transcode Directive Guide */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3">
            <div className="flex items-start gap-2.5">
              <Warning size={18} className="text-amber-400 shrink-0 mt-0.5" weight="fill" />
              <div className="text-xs space-y-1">
                <div className="font-bold text-amber-300">H.265 / HEVC Compatibility</div>
                <p className="text-slate-300 leading-relaxed">
                  WebRTC in modern browsers cannot decode H.265 streams (common with Eufy E21 & 4K RTSP cameras).
                  Add the <code className="text-amber-300 font-bold bg-black/40 px-1 py-0.5 rounded">#video=h264</code> transcode directive to your <code className="text-amber-300 font-bold bg-black/40 px-1 py-0.5 rounded">go2rtc.yaml</code>:
                </p>
              </div>
            </div>

            <div className="relative p-3 rounded-xl bg-black/60 font-mono text-xs text-amber-200/90 border border-white/10 overflow-x-auto">
              <pre className="text-[11px] leading-tight">{snippet}</pre>
              <button
                type="button"
                onClick={handleCopySnippet}
                className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedSnippet ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-white/10 bg-white/5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
              savedSuccess
                ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/30'
            }`}
          >
            {savedSuccess ? <Check size={16} weight="bold" /> : <Sparkle size={16} weight="fill" />}
            <span>{savedSuccess ? 'Saved!' : 'Save Preferences'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
