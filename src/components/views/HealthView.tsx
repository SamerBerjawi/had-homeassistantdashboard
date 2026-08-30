/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Heartbeat, Wind, Drop, Thermometer, Tree } from '@phosphor-icons/react';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import ViewEmptyState from '../ui/ViewEmptyState';
import ViewLoadingState from '../ui/ViewLoadingState';

interface ViewProps {
  darkMode?: boolean;
}

export default function HealthView({ darkMode = true }: ViewProps) {
  const isLoading = useAutoLayoutStore((s) => s.isLoading);
  const domainGroups = useAutoLayoutStore((s) => s.domainGroups);
  const sensorEntities = domainGroups['sensor'] || [];

  const healthSensors = sensorEntities.filter((s) => {
    const dc = s.attributes?.device_class;
    const name = (s.name || s.entity_id).toLowerCase();
    return (
      dc === 'aqi' ||
      dc === 'carbon_dioxide' ||
      dc === 'carbon_monoxide' ||
      dc === 'pm25' ||
      dc === 'pm10' ||
      dc === 'volatile_organic_compounds' ||
      name.includes('aqi') ||
      name.includes('air quality') ||
      name.includes('co2') ||
      name.includes('voc')
    );
  });

  if (isLoading) {
    return <ViewLoadingState title="Loading Environmental Health..." subtitle="Gathering air quality, CO2, and comfort telemetry" darkMode={darkMode} />;
  }

  if (healthSensors.length === 0) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center">
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
    <div className="w-full flex-1 flex flex-col">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {healthSensors.map((sensor) => (
          <div key={sensor.entity_id} className={`p-5 rounded-3xl border backdrop-blur-md ${darkMode ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                <Heartbeat size={20} weight="duotone" />
              </div>
              <div>
                <h4 className="text-sm font-bold">{sensor.name}</h4>
                <p className="text-xs text-slate-400">{sensor.state} {sensor.attributes?.unit_of_measurement || ''}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
