/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lazy loaders for every Phosphor icon, keyed by icon name. Kept in its own module (loaded on
 * first use) because the map of ~1,500 paths is itself sizeable.
 */

const ICON_MODULE_DIR = '/node_modules/@phosphor-icons/react/dist/csr/';

const iconModules = import.meta.glob<Record<string, unknown>>(
  '/node_modules/@phosphor-icons/react/dist/csr/*.es.js'
);

export function getPhosphorIconLoader(iconName: string): (() => Promise<Record<string, unknown>>) | undefined {
  return iconModules[`${ICON_MODULE_DIR}${iconName}.es.js`];
}
