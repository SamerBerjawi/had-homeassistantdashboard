/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface BasemapLayerProps {
  styleUrl: string;
}

/** OpenFreeMap vector basemap rendered through MapLibre GL inside the Leaflet map. */
export function BasemapLayer({ styleUrl }: BasemapLayerProps) {
  const map = useMap();

  useEffect(() => {
    let cancelled = false;
    let layer: L.Layer | null = null;
    // MapLibre is large, so it is loaded only when a map is actually rendered.
    Promise.all([
      import('maplibre-gl/dist/maplibre-gl.css'),
      import('@maplibre/maplibre-gl-leaflet')
    ])
      .then(() => {
        if (cancelled) return;
        layer = (L as unknown as {
          maplibreGL: (options: { style: string }) => L.Layer;
        }).maplibreGL({ style: styleUrl });
        layer.addTo(map);
      })
      .catch((err) => console.error('[Map] Failed to load basemap', err));
    return () => {
      cancelled = true;
      if (layer) map.removeLayer(layer);
    };
  }, [map, styleUrl]);

  return null;
}
