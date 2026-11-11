/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Per-device consumption breakdown and the untracked remainder.
 */

import type { ExtractedEnergyStatisticIds } from '../haEnergyPreferences';
import type { StatisticsMetaData } from '../haEnergyStatistics';
import type { TransformedDevice, TransformedEnergyBucket } from './types';

export function computeDevices(p: {
  extracted: ExtractedEnergyStatisticIds;
  buckets: TransformedEnergyBucket[];
  totalHomeConsumption: number;
  states: Record<string, any>;
  metadata: Record<string, StatisticsMetaData>;
}) {
  const { extracted, buckets, totalHomeConsumption, states, metadata } = p;
  // 4. Compute Device Breakdowns
  const deviceSums: Record<string, number> = {};
  for (const dev of extracted.deviceConsumption) {
    deviceSums[dev.statId] = 0;
  }
  for (const b of buckets) {
    for (const [id, val] of Object.entries(b.deviceValues)) {
      deviceSums[id] = (deviceSums[id] || 0) + val;
    }
  }

  const devicePalette = [
    '#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185',
    '#fb923c', '#facc15', '#4ade80', '#2dd4bf', '#22d3ee'
  ];

  const devices: TransformedDevice[] = extracted.deviceConsumption.map((dev, idx) => {
    const kwh = deviceSums[dev.statId] || 0;
    const percentage = totalHomeConsumption > 0
      ? Math.min(100, Math.max(0, (kwh / totalHomeConsumption) * 100))
      : 0;

    const friendlyName = dev.name ||
      states[dev.statId]?.attributes?.friendly_name ||
      metadata[dev.statId]?.name ||
      dev.statId.replace('sensor.', '').replace(/_/g, ' ');

    return {
      statId: dev.statId,
      name: friendlyName,
      kwh: Number(kwh.toFixed(2)),
      percentage: Number(percentage.toFixed(1)),
      color: devicePalette[idx % devicePalette.length]
    };
  }).sort((a, b) => b.kwh - a.kwh);

  const trackedDevicesTotalKWh = devices.reduce((sum, d) => sum + d.kwh, 0);
  const untrackedKwh = Math.max(0, totalHomeConsumption - trackedDevicesTotalKWh);
  const untrackedPercentage = totalHomeConsumption > 0
    ? Math.max(0, Number(((untrackedKwh / totalHomeConsumption) * 100).toFixed(1)))
    : 0;
  return { devices, untrackedKwh, untrackedPercentage };
}
