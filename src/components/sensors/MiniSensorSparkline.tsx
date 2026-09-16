import React, { useState, useEffect } from 'react';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { fetchLiveEntityHistory } from '../../services/haHistoryService';
import { haWebSocketService } from '../../services/haWebSocket';
import { LineChart } from '../charts/line-chart';
import { Line } from '../charts/line';
import { Area } from '../charts/area';

interface MiniSensorSparklineProps {
  entityId: string;
  currentValue?: number | string;
  color?: string;
  fillGradientId?: string;
  height?: number;
  width?: number | string;
  strokeWidth?: number;
}

interface ChartDatum {
  date: Date;
  value: number;
}

const HOURS_WINDOW = 72;

function binPointsToHourly(
  rawPoints: Array<{ timestamp: number; value: number }>,
  startMs: number,
  nowMs: number,
  currentVal: number,
  totalHours: number = HOURS_WINDOW
): ChartDatum[] {
  const hourStep = 3600 * 1000;
  const result: ChartDatum[] = [];

  let rawIdx = 0;
  let lastVal = rawPoints.length > 0 ? rawPoints[0].value : currentVal;

  for (let h = 0; h < totalHours; h++) {
    const slotTime = startMs + (h + 1) * hourStep;

    // Advance raw points up to this slot's time
    while (rawIdx < rawPoints.length && rawPoints[rawIdx].timestamp <= slotTime) {
      lastVal = rawPoints[rawIdx].value;
      rawIdx++;
    }

    result.push({
      date: new Date(slotTime),
      value: Number(lastVal.toFixed(1))
    });
  }

  // Ensure the latest point at the end is the current reading
  if (!isNaN(currentVal) && result.length > 0) {
    result[result.length - 1] = {
      date: new Date(nowMs),
      value: Number(currentVal.toFixed(1))
    };
  }

  return result;
}

export default function MiniSensorSparkline({
  entityId,
  currentValue,
  color = '#f43f5e',
  height = 32,
  strokeWidth = 2
}: MiniSensorSparklineProps) {
  const isLiveMode = useAutoLayoutStore((s) => s.isLiveMode);
  const [dataPoints, setDataPoints] = useState<ChartDatum[]>([]);

  const parsedCurrent = typeof currentValue === 'number'
    ? currentValue
    : parseFloat(String(currentValue || ''));
  const baseVal = isNaN(parsedCurrent) ? 21.5 : parsedCurrent;

  useEffect(() => {
    let isCancelled = false;

    async function fetchPoints() {
      if (!entityId) return;

      const nowMs = Date.now();
      const startMs = nowMs - HOURS_WINDOW * 3600 * 1000;
      const startTime = new Date(startMs).toISOString();

      try {
        if (isLiveMode) {
          const liveHistory = await fetchLiveEntityHistory(entityId, startTime);

          if (!isCancelled && liveHistory.length > 0) {
            const rawPoints: Array<{ timestamp: number; value: number }> = [];
            for (const p of liveHistory) {
              const v = parseFloat(p.state);
              if (!isNaN(v)) {
                const ts = typeof (p as any).timestamp === 'number'
                  ? ((p as any).timestamp < 1e12 ? (p as any).timestamp * 1000 : (p as any).timestamp)
                  : Date.now();
                rawPoints.push({ timestamp: ts, value: v });
              }
            }

            if (rawPoints.length >= 1) {
              // Sort chronologically
              rawPoints.sort((a, b) => a.timestamp - b.timestamp);

              // Bin into 72 hourly points
              const hourly = binPointsToHourly(rawPoints, startMs, nowMs, baseVal, HOURS_WINDOW);
              setDataPoints(hourly);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('[MiniSensorSparkline] History fetch error:', err);
      }

      // Fallback for live sensor without prior history or demo mode (72 hours, 1 point/hr)
      if (!isCancelled) {
        const synthetic: ChartDatum[] = [];
        for (let i = 0; i < HOURS_WINDOW; i++) {
          const d = new Date(startMs + i * 3600 * 1000);
          const wave = Math.sin(i * 0.18) * 1.2 + Math.cos(i * 0.08) * 0.6;
          synthetic.push({
            date: d,
            value: Number((baseVal + wave).toFixed(1))
          });
        }
        setDataPoints(synthetic);
      }
    }

    fetchPoints();
    return () => {
      isCancelled = true;
    };
  }, [entityId, isLiveMode, baseVal, parsedCurrent]);

  if (dataPoints.length < 2) {
    return <div style={{ height }} className="w-full" />;
  }

  return (
    <div
      className="w-full h-full relative overflow-hidden pointer-events-none"
      style={{ height }}
    >
      <LineChart
        data={dataPoints as unknown as Record<string, unknown>[]}
        xDataKey="date"
        margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
        aspectRatio=""
        tightYDomain
        animationDuration={0}
        status="ready"
        style={{ width: '100%', height: '100%' }}
        className="w-full h-full"
      >
        <Area
          dataKey="value"
          fill={color}
          fillOpacity={0.2}
          showLine={false}
          showHighlight={false}
          animate={false}
          loading={false}
        />
        <Line
          dataKey="value"
          stroke={color}
          strokeWidth={strokeWidth}
          animate={false}
          showHighlight={false}
          fadeEdges={false}
          loading={false}
        />
      </LineChart>
    </div>
  );
}
