/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Health Vitals Bento Grid Section
 * Presents cardiac metrics, respiratory telemetry, blood pressure,
 * blood oxygen saturation (SpO2), HRV, and temperature.
 */

import React from 'react';
import { BentoGrid } from '../../ui/BentoGrid';
import { HealthMetricCard } from './HealthMetricCard';
import { HealthMetricKey, HealthMetricSummary } from '../../../types/health';

interface HealthVitalsSectionProps {
  summaries: Record<HealthMetricKey, HealthMetricSummary>;
  darkMode?: boolean;
}

const VITALS_KEYS: HealthMetricKey[] = [
  'heartRate',
  'restingHeartRate',
  'walkingHeartRate',
  'hrv',
  'bloodOxygen',
  'bpSystolic',
  'bpDiastolic',
  'respiratoryRate',
  'bloodGlucose',
  'bodyTemperature',
];

export const HealthVitalsSection: React.FC<HealthVitalsSectionProps> = ({
  summaries,
  darkMode = true,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Heart &amp; Vital Telemetry
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time biometric signals recorded by Apple Watch &amp; medical devices
          </p>
        </div>
      </div>

      <BentoGrid cols={3}>
        {VITALS_KEYS.map((key) => {
          const summary = summaries[key];
          if (!summary) return null;

          // Highlight primary cardiac indicators
          const isHighlighted = key === 'heartRate' || key === 'bloodOxygen' || key === 'restingHeartRate';

          return (
            <HealthMetricCard
              key={key}
              summary={summary}
              darkMode={darkMode}
              highlighted={isHighlighted}
            />
          );
        })}
      </BentoGrid>
    </div>
  );
};
