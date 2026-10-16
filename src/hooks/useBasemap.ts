/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const OPENFREEMAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>';

/** OpenFreeMap style URL: Liberty for light mode, Dark for dark mode. */
export function getBasemapStyleUrl(isDarkMode: boolean): string {
  return `https://tiles.openfreemap.org/styles/${isDarkMode ? 'dark' : 'liberty'}`;
}

export function useBasemap(isDarkMode: boolean) {
  return { styleUrl: getBasemapStyleUrl(isDarkMode) };
}
