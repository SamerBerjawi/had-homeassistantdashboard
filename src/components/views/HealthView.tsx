/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Environmental Health & Air Quality Command Center
 * Clean 2-column mobile and responsive desktop VirtualGrid layout for air quality,
 * CO2 concentrations, volatile compounds, and ambient comfort sensors.
 */

import React, { useMemo } from 'react';
import { Heartbeat, Wind, Drop, Thermometer, ShieldCheck } from '@phosphor-icons/react';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { useEntityPopup } from '../../contexts/EntityPopupContext';
import { useUserConfig } from '../../contexts/ConfigContext';
import { useEditMode } from '../../contexts/EditModeContext';
import SortableGrid from '../layout/SortableGrid';
import GridTile from '../layout/GridTile';
import SensorTile from '../tiles/SensorTile';
import ViewEmptyState from '../ui/ViewEmptyState';
import ViewLoadingState from '../ui/ViewLoadingState';
import { sortTilesForBento } from '../../utils/bentoLayout';

interface ViewProps {
  darkMode?: boolean;
}

export default function HealthView({ darkMode = true }: ViewProps) {
  const isLoading = useAutoLayoutStore((s) => s.isLoading);
  const domainGroups = useAutoLayoutStore((s) => s.domainGroups);
  const { openEntityDetails } = useEntityPopup();
  const { config } = useUserConfig();
  const { isEditMode } = useEditMode();

  const sensorEntities = domainGroups['sensor'] || [];

  const healthSensors = useMemo(() => {
    return sensorEntities.filter((s) => {
      const dc = s.attributes?.device_class;
      const name = (s.name || s.entity_id).toLowerCase();
      return (
        dc === 'aqi' ||
        dc === 'carbon_dioxide' ||
        dc === 'carbon_monoxide' ||
        dc === 'pm25' ||
        dc === 'pm10' ||
        dc === 'volatile_organic_compounds' ||
        dc === 'nitrogen_dioxide' ||
        name.includes('aqi') ||
        name.includes('air quality') ||
        name.includes('co2') ||
        name.includes('voc') ||
        name.includes('pm2.5') ||
        name.includes('pm10')
      );
    });
  }, [sensorEntities]);

  const sortedSensors = useMemo(() => {
    return sortTilesForBento({
      items: healthSensors,
      getId: (s) => s.entity_id,
      layoutOverrides: config?.layoutOverrides,
      isEditMode
    });
  }, [healthSensors, config?.layoutOverrides, isEditMode]);

  if (isLoading) {
    return (
      <ViewLoadingState
        title="Loading Environmental Health..."
        subtitle="Gathering air quality, CO2, and comfort telemetry"
        darkMode={darkMode}
      />
    );
  }

  if (healthSensors.length === 0) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center pb-24 md:pb-8">
        <ViewEmptyState
          icon={Heartbeat}
          title="No Environmental Health Sensors Configured"
          badgeText="Environmental Wellness"
          description="Track indoor air quality index (AQI), carbon dioxide (CO2) concentrations, volatile organic compounds (VOCs), and humidity comfort by adding environmental sensors to Home Assistant."
          configPath="Settings → Devices & Services → Add Integration"
          darkMode={darkMode}
        />
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col gap-6 animate-fadeIn pb-24 md:pb-8">
      {/* Header Strip */}
      <div className="flex items-center justify-between gap-3 pb-1 border-b border-slate-200/50 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400 flex items-center justify-center">
            <Wind size={18} weight="duotone" />
          </div>
          <h2 className={`text-base font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Air Quality & Wellness
          </h2>
        </div>

        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
          {healthSensors.length} {healthSensors.length === 1 ? 'Sensor' : 'Sensors'} Monitored
        </span>
      </div>

      {/* Sensor Bento Grid */}
      <SortableGrid items={sortedSensors.map((s) => s.entity_id)}>
        {sortedSensors.map((sensor) => {
          const isUnavailable = sensor.state === 'unavailable' || sensor.state === 'unknown';

          return (
            <GridTile
              key={sensor.entity_id}
              id={sensor.entity_id}
              colSpan={2}
              rowSpan={1}
              tabletColSpan={3}
              desktopColSpan={3}
              isUnavailable={isUnavailable}
              onLongPress={() => openEntityDetails(sensor.entity_id)}
            >
              <SensorTile
                entity={sensor}
                darkMode={darkMode}
                onIconClick={() => openEntityDetails(sensor.entity_id)}
                onContextMenu={() => openEntityDetails(sensor.entity_id)}
              />
            </GridTile>
          );
        })}
      </SortableGrid>
    </div>
  );
}
