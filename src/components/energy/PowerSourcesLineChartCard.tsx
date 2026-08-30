/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import PowerSourcesChart, { PowerSourcesChartProps } from './PowerSourcesChart';

export type PowerSourcesLineChartCardProps = PowerSourcesChartProps;

export default function PowerSourcesLineChartCard(props: PowerSourcesLineChartCardProps) {
  return <PowerSourcesChart {...props} />;
}
