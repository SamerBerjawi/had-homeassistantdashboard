/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useUserConfig } from '../contexts/ConfigContext';

export interface CartoBasemapResult {
  tileUrl: string;
  attribution: string;
  isCarto: boolean;
  cartoApiKey?: string;
}

export function useCartoBasemap(isDarkMode: boolean): CartoBasemapResult {
  const { config } = useUserConfig();
  const cartoApiKey = config?.cartoApiKey?.trim();

  let tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  if (cartoApiKey) {
    tileUrl = isDarkMode
      ? `https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${cartoApiKey}`
      : `https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png?key=${cartoApiKey}`;
    attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
  }

  return {
    tileUrl,
    attribution,
    isCarto: Boolean(cartoApiKey),
    cartoApiKey
  };
}
