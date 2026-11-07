/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { TileProps } from './types';

// Each tile body is its own chunk so the landing page only pays for the tiles it actually shows
const WeatherTile = React.lazy(() => import('./WeatherTile'));
const WeatherHourlyTile = React.lazy(() => import('./WeatherHourlyTile'));
const UsersTile = React.lazy(() => import('./UsersTile'));
const LightsTile = React.lazy(() => import('./LightsTile'));
const SwitchesTile = React.lazy(() => import('./SwitchesTile'));
const VacuumsTile = React.lazy(() => import('./VacuumsTile'));
const FansTile = React.lazy(() => import('./FansTile'));
const MediaTile = React.lazy(() => import('./MediaTile'));
const AlarmTile = React.lazy(() => import('./AlarmTile'));
const PowerFlowTile = React.lazy(() => import('./PowerFlowTile'));
const PowerFlowChartTile = React.lazy(() => import('./PowerFlowChartTile'));
const EnergyUsageTile = React.lazy(() => import('./EnergyUsageTile'));
const EnergyUsageChartTile = React.lazy(() => import('./EnergyUsageChartTile'));
const SolarProductionTile = React.lazy(() => import('./SolarProductionTile'));
const SolarProductionChartTile = React.lazy(() => import('./SolarProductionChartTile'));
const DoorsTile = React.lazy(() => import('./DoorsTile'));
const WindowsTile = React.lazy(() => import('./WindowsTile'));
const MotionTile = React.lazy(() => import('./MotionTile'));
const LeakTile = React.lazy(() => import('./LeakTile'));
const SmokeTile = React.lazy(() => import('./SmokeTile'));
const CamerasTile = React.lazy(() => import('./CamerasTile'));
const CameraFeedTile = React.lazy(() => import('./CameraFeedTile'));

function TileSkeleton() {
  return <div aria-hidden="true" className="w-full h-36 rounded-3xl bg-black/10 dark:bg-white/5 animate-pulse" />;
}

function renderTile(props: TileProps): React.ReactNode {
  switch (props.tileId) {
    case 'weather':
      return <WeatherTile {...props} />;
    case 'weather_hourly':
      return <WeatherHourlyTile {...props} />;
    case 'users':
      return <UsersTile {...props} />;
    case 'lights':
      return <LightsTile {...props} />;
    case 'switches':
      return <SwitchesTile {...props} />;
    case 'vacuums':
      return <VacuumsTile {...props} />;
    case 'fans':
      return <FansTile {...props} />;
    case 'media':
      return <MediaTile {...props} />;
    case 'alarm':
      return <AlarmTile {...props} />;
    case 'power_flow':
      return <PowerFlowTile {...props} />;
    case 'power_flow_chart':
      return <PowerFlowChartTile {...props} />;
    case 'energy_usage':
      return <EnergyUsageTile {...props} />;
    case 'energy_usage_chart':
      return <EnergyUsageChartTile {...props} />;
    case 'solar_production':
      return <SolarProductionTile {...props} />;
    case 'solar_production_chart':
      return <SolarProductionChartTile {...props} />;
    case 'doors':
      return <DoorsTile {...props} />;
    case 'windows':
      return <WindowsTile {...props} />;
    case 'motion':
      return <MotionTile {...props} />;
    case 'leak':
      return <LeakTile {...props} />;
    case 'smoke':
      return <SmokeTile {...props} />;
    case 'cameras':
      return <CamerasTile {...props} />;
    default:
      return <CameraFeedTile {...props} />;
  }
}

/** Renders the body of one Overview tile, chosen by its id. */
export default function OverviewTileContent(props: TileProps) {
  return <React.Suspense fallback={<TileSkeleton />}>{renderTile(props)}</React.Suspense>;
}
