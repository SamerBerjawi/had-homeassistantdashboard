/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mini Sensor Sparkline Component
 * Accurate 24h live history trendline with smooth bezier curve
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { fetchLiveEntityHistory } from '../../services/haHistoryService';
import { haWebSocketService } from '../../services/haWebSocket';

interface MiniSensorSparklineProps {
  entityId: string;
  currentValue?: number | string;
  color?: string;
  fillGradientId?: string;
  height?: number;
  width?: number | string;
  strokeWidth?: number;
}

interface SparklinePoint {
  x: number;
  y: number;
  val: number;
}

export default function MiniSensorSparkline({
  entityId,
  currentValue,
  color = '#f43f5e',
  fillGradientId,
  height = 36,
  strokeWidth = 2
}: MiniSensorSparklineProps) {
  const isLiveMode = useAutoLayoutStore((s) => s.isLiveMode);
  const [dataPoints, setDataPoints] = useState<number[]>([]);

  const parsedCurrent = typeof currentValue === 'number'
    ? currentValue
    : parseFloat(String(currentValue || ''));
  const baseVal = isNaN(parsedCurrent) ? 21.5 : parsedCurrent;

  useEffect(() => {
    let isCancelled = false;

    async function fetchPoints() {
      if (!entityId) return;

      try {
        if (isLiveMode) {
          const startTime = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
          const liveHistory = await fetchLiveEntityHistory(entityId, startTime);

          if (!isCancelled && liveHistory.length > 0) {
            const vals = liveHistory
              .map((p) => parseFloat(p.state))
              .filter((v) => !isNaN(v));

            if (vals.length >= 1) {
              // Ensure the latest point aligns with live entity current reading
              if (!isNaN(parsedCurrent)) {
                vals.push(parsedCurrent);
              }

              if (vals.length === 1) {
                setDataPoints([vals[0], vals[0]]);
                return;
              }

              // Sample down to max 24 points for crisp, high-performance SVG rendering
              const maxPoints = 24;
              if (vals.length <= maxPoints) {
                setDataPoints(vals);
              } else {
                const step = (vals.length - 1) / (maxPoints - 1);
                const sampled: number[] = [];
                for (let i = 0; i < maxPoints - 1; i++) {
                  sampled.push(vals[Math.round(i * step)]);
                }
                // Always include the absolute latest live point
                sampled.push(vals[vals.length - 1]);
                setDataPoints(sampled);
              }
              return;
            }
          } else if (isLiveMode && !isNaN(parsedCurrent)) {
            // Live sensor with constant state over the period
            setDataPoints([parsedCurrent, parsedCurrent]);
            return;
          }
        }
      } catch (err) {
        console.warn('[MiniSensorSparkline] History fetch error:', err);
      }

      // Fallback for demo mode only
      if (!isCancelled) {
        if (haWebSocketService.isDemo()) {
          const synthetic: number[] = [];
          const count = 16;
          for (let i = 0; i < count; i++) {
            const wave = Math.sin(i * 0.45) * 0.8 + Math.cos(i * 0.3) * 0.4;
            synthetic.push(Number((baseVal + wave).toFixed(1)));
          }
          setDataPoints(synthetic);
        } else {
          setDataPoints([]);
        }
      }
    }

    fetchPoints();
    return () => {
      isCancelled = true;
    };
  }, [entityId, isLiveMode, baseVal, parsedCurrent]);

  const svgPaths = useMemo(() => {
    if (dataPoints.length < 2) return null;

    const min = Math.min(...dataPoints);
    const max = Math.max(...dataPoints);
    const isFlat = max === min;
    const range = isFlat ? 1 : max - min;

    const w = 120;
    const h = height;
    const padding = 3;

    const points: SparklinePoint[] = dataPoints.map((val, idx) => {
      const x = (idx / (dataPoints.length - 1)) * (w - padding * 2) + padding;
      // If flat line, place in vertical center
      const y = isFlat
        ? h / 2
        : h - padding - ((val - min) / range) * (h - padding * 2);
      return { x, y, val };
    });

    // Build smooth bezier path
    let pathD = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const mx = (p0.x + p1.x) / 2;
      pathD += ` C ${mx.toFixed(1)},${p0.y.toFixed(1)} ${mx.toFixed(1)},${p1.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
    }

    // Fill path closing at bottom
    const fillD = `${pathD} L ${points[points.length - 1].x.toFixed(1)},${h} L ${points[0].x.toFixed(1)},${h} Z`;

    return { pathD, fillD, points };
  }, [dataPoints, height]);

  if (!svgPaths) {
    return <div style={{ height }} className="w-full" />;
  }

  const gradId = fillGradientId || `grad-${entityId.replace(/[^a-zA-Z0-9]/g, '-')}`;

  return (
    <div className="w-full relative overflow-hidden" style={{ height }}>
      <svg
        viewBox={`0 0 120 ${height}`}
        className="w-full h-full overflow-visible preserve-3d"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Gradient fill underneath curve */}
        <path d={svgPaths.fillD} fill={`url(#${gradId})`} />

        {/* Stroke Line */}
        <path
          d={svgPaths.pathD}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-xs"
        />

        {/* Pulsing latest point dot */}
        {svgPaths.points.length > 0 && (
          <circle
            cx={svgPaths.points[svgPaths.points.length - 1].x}
            cy={svgPaths.points[svgPaths.points.length - 1].y}
            r="2.5"
            fill={color}
            className="animate-pulse"
          />
        )}
      </svg>
    </div>
  );
}
