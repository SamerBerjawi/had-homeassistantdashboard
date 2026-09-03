/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Health Body Composition & Nutrition Bento Grid Section
 * Shows weight, body fat %, lean body mass, height, and water intake.
 */

import React from 'react';
import { BentoGrid } from '../../ui/BentoGrid';
import { HealthMetricCard } from './HealthMetricCard';
import { HealthMetricKey, HealthMetricSummary } from '../../../types/health';

interface HealthBodySectionProps {
  summaries: Record<HealthMetricKey, HealthMetricSummary>;
  darkMode?: boolean;
}

const BODY_KEYS: HealthMetricKey[] = [
  'weight',
  'bodyFat',
  'leanBodyMass',
  'height',
  'water',
];

export const HealthBodySection: React.FC<HealthBodySectionProps> = ({
  summaries,
  darkMode = true,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Body Composition &amp; Nutrition
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Smart scale telemetry, hydration levels, and physical parameters
          </p>
        </div>
      </div>

      <BentoGrid cols={3}>
        {BODY_KEYS.map((key) => {
          const summary = summaries[key];
          if (!summary) return null;

          const isHighlighted = key === 'weight' || key === 'bodyFat';

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
