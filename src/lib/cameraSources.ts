/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ResolvedEntity } from '../types';
import { CameraSourceConfig } from '../types/userConfig';
import { isSurveillanceCamera } from './entityClassifiers';

/**
 * Resolves only cameras that have configured RTSP streams in user config.
 * 
 * Matches configured sources against Home Assistant camera entities (by ID or haEntityId),
 * or constructs standalone stream camera entities if added directly by RTSP URL.
 * 
 * Unconfigured camera entities (those without an active RTSP URL in config) are excluded.
 */
export function getConfiguredRtspCameras(
  cameraSources: Record<string, CameraSourceConfig> | undefined,
  haCameras: ResolvedEntity[] = []
): ResolvedEntity[] {
  if (!cameraSources || typeof cameraSources !== 'object') {
    return [];
  }

  // Filter sources that have a non-empty RTSP stream URL configured
  const validSources = Object.values(cameraSources).filter(
    (s): s is CameraSourceConfig & { rtspUrl: string } =>
      Boolean(s && typeof s.rtspUrl === 'string' && s.rtspUrl.trim().length > 0)
  );

  if (validSources.length === 0) {
    return [];
  }

  const resolvedCameras: ResolvedEntity[] = [];
  const processedEntityIds = new Set<string>();

  for (const source of validSources) {
    const trimmedUrl = source.rtspUrl.trim();
    const sourceId = (source.id || '').trim();
    const haEntityId = (source.haEntityId || '').trim();

    // Look for matching Home Assistant entity
    const matchedHaCam = haCameras.find((c) => {
      if (c.hidden || c.disabled_by) return false;
      const cId = c.entity_id.toLowerCase();
      return (
        c.entity_id === sourceId ||
        c.entity_id === haEntityId ||
        (sourceId && cId === sourceId.toLowerCase()) ||
        (haEntityId && cId === haEntityId.toLowerCase()) ||
        (sourceId && `camera.${sourceId.toLowerCase()}` === cId) ||
        (sourceId.startsWith('camera.') && sourceId.slice(7).toLowerCase() === cId.replace('camera.', ''))
      );
    });

    if (matchedHaCam) {
      if (!processedEntityIds.has(matchedHaCam.entity_id)) {
        processedEntityIds.add(matchedHaCam.entity_id);
        resolvedCameras.push({
          ...matchedHaCam,
          name: source.name?.trim() || matchedHaCam.name || matchedHaCam.attributes?.friendly_name || matchedHaCam.entity_id,
          attributes: {
            ...matchedHaCam.attributes,
            friendly_name: source.name?.trim() || matchedHaCam.attributes?.friendly_name || matchedHaCam.name || matchedHaCam.entity_id,
            stream_source: trimmedUrl
          }
        });
      }
    } else {
      // Standalone or custom RTSP stream added in settings
      const normalizedId = sourceId.startsWith('camera.') ? sourceId : `camera.${sourceId || `stream_${Date.now()}`}`;
      if (!processedEntityIds.has(normalizedId)) {
        processedEntityIds.add(normalizedId);
        resolvedCameras.push({
          entity_id: normalizedId,
          name: source.name?.trim() || sourceId || 'RTSP Camera',
          state: 'idle',
          domain: 'camera',
          attributes: {
            friendly_name: source.name?.trim() || sourceId || 'RTSP Camera',
            stream_source: trimmedUrl,
            model_name: 'Configured RTSP Stream'
          },
          area_id: null,
          device_id: null,
          floor_id: null,
          device: null,
          area: null,
          floor: null,
          resolutionSource: 'unassigned',
          hidden: false,
          disabled_by: null,
          isDiagnostic: false
        });
      }
    }
  }

  // Filter with isSurveillanceCamera just in case
  return resolvedCameras.filter(isSurveillanceCamera);
}

/**
 * Checks if a specific camera entity has a configured RTSP stream.
 */
export function isCameraRtspConfigured(
  cameraId: string,
  cameraSources?: Record<string, CameraSourceConfig>
): boolean {
  if (!cameraId || !cameraSources) return false;
  const direct = cameraSources[cameraId];
  if (direct?.rtspUrl && direct.rtspUrl.trim().length > 0) return true;

  return Object.values(cameraSources).some((s) => {
    if (!s?.rtspUrl || s.rtspUrl.trim().length === 0) return false;
    return (
      s.id === cameraId ||
      s.haEntityId === cameraId ||
      (s.id && `camera.${s.id}` === cameraId) ||
      (cameraId.startsWith('camera.') && s.id === cameraId.replace('camera.', ''))
    );
  });
}
