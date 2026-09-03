/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Health Activity & Movement Bento Grid Section
 * Shows steps, active burn calories, distance traveled, flights climbed,
 * exercise duration, active pace, and VO2 Max.
 */

import React from 'react';
import { BentoGrid } from '../../ui/BentoGrid';
import { HealthMetricCard } from './HealthMetricCard';
import { HealthMetricKey, HealthMetricSummary } from '../../../types/health';

interface HealthActivitySectionProps {
  summaries: Record<HealthMetricKey, HealthMetricSummary>;
  darkMode?: boolean;
}

const ACTIVITY_KEYS: HealthMetricKey[] = [
  'healthSteps',
  'activeEnergy',
  'restingEnergy',
  'distance',
  'flightsClimbed',
  'exerciseTime',
  'activePace',
  'vo2Max',
];

export const HealthActivitySection: React.FC<HealthActivitySectionProps> = ({
  summaries,
  darkMode = true,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Activity, Movement &amp; Fitness
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pedometer, caloric expenditure, distance, and cardio endurance telemetry
          </p>
        </div>
      </div>

      <BentoGrid cols={3}>
        {ACTIVITY_KEYS.map((key) => {
          const summary = summaries[key];
          if (!summary) return null;

          const isHighlighted = key === 'healthSteps' || key === 'activeEnergy' || key === 'exerciseTime';

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
