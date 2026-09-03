/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MagicUI Interactive Primitive: NumberTicker
 * Animates numbers with smooth spring-based or digit-by-digit transitions.
 */

import React, { useMemo } from 'react';
import NumberFlow from '@number-flow/react';

interface NumberTickerProps {
  value: number;
  direction?: 'up' | 'down';
  className?: string;
  decimalPlaces?: number;
  prefix?: string;
  suffix?: string;
}

export const NumberTicker: React.FC<NumberTickerProps> = ({
  value,
  className = '',
  decimalPlaces = 0,
  prefix = '',
  suffix = '',
}) => {
  const formatOptions = useMemo(
    () => ({
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
      notation: 'standard' as const,
    }),
    [decimalPlaces]
  );

  return (
    <span className={`tabular-nums inline-flex items-baseline ${className}`}>
      <NumberFlow
        value={value}
        format={formatOptions}
        prefix={prefix}
        suffix={suffix}
        isolate
        willChange
      />
    </span>
  );
};
