import React, { useState, useEffect, useMemo } from 'react';
import {
  Thermometer,
  Drop,
  Sun,
  Eye,
  Lightning,
  Gauge,
  ArrowsClockwise,
  ChartLineUp,
  Pulse,
  Door,
  DoorOpen,
  Lock,
  LockOpen,
  PersonSimpleWalk,
  Flame,
  Clock,
  ShieldCheck,
  CheckCircle,
  WarningCircle,
  ToggleLeft,
  ToggleRight
} from '@phosphor-icons/react';
import { HAEntity } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { haWebSocketService } from '../../../services/haWebSocket';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import DynamicPhosphorIcon from '../../ui/DynamicPhosphorIcon';
import { fetchLiveEntityHistory } from '../../../services/haHistoryService';

interface SensorHistoryViewProps {
  entity: HAEntity;
  darkMode?: boolean;
  customIcon?: string | null;
}

interface NumericPoint {
  time: string;
  timestamp: number;
  value: number;
}

interface StateChangeEvent {
  id: string;
  state: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  timeFormatted: string;
  isCurrent: boolean;
}

export default function SensorHistoryView({ entity, darkMode = true, customIcon }: SensorHistoryViewProps) {
  const isLiveMode = useAutoLayoutStore((s) => s.isLiveMode);

  const rawState = String(entity?.state || '').toLowerCase();
  const numValue = parseFloat(rawState);
  const domain = entity?.entity_id ? entity.entity_id.split('.')[0] : 'sensor';
  const unit = entity?.attributes?.unit_of_measurement || '';
  const deviceClass = (entity?.attributes?.device_class || '').toLowerCase();

  // Determine if this is a binary / discrete status sensor (on/off, open/closed, etc.)
  const isBinaryOrStatusSensor =
    domain === 'binary_sensor' ||
    rawState === 'on' ||
    rawState === 'off' ||
    rawState === 'open' ||
    rawState === 'closed' ||
    rawState === 'locked' ||
    rawState === 'unlocked' ||
    rawState === 'detected' ||
    rawState === 'clear' ||
    rawState === 'home' ||
    rawState === 'away' ||
    isNaN(numValue);

  const [timeRange, setTimeRange] = useState<'6h' | '24h' | '7d'>('24h');
  const [numericHistory, setNumericHistory] = useState<NumericPoint[]>([]);
  const [stateEvents, setStateEvents] = useState<StateChangeEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Helper to format duration into human readable string
  const formatDuration = (ms: number) => {
    const sec = Math.floor(ms / 1000);
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    const remMin = min % 60;
    if (hr < 24) return remMin > 0 ? `${hr}h ${remMin}m` : `${hr}h`;
    const days = Math.floor(hr / 24);
    return `${days}d ${hr % 24}h`;
  };

  // Generate synthetic state change timeline for binary sensors (Demo mode only)
  const generateSyntheticStateEvents = (
    range: '6h' | '24h' | '7d',
    currentState: string
  ): StateChangeEvent[] => {
    const now = Date.now();
    const durationMs =
      range === '6h' ? 6 * 3600 * 1000 : range === '24h' ? 24 * 3600 * 1000 : 7 * 24 * 3600 * 1000;
    const startRangeTime = now - durationMs;

    const events: StateChangeEvent[] = [];
    const isCurrentlyActive =
      currentState === 'on' || currentState === 'open' || currentState === 'detected';
    const activeLabel =
      deviceClass === 'door' || deviceClass === 'window' || deviceClass === 'garage_door'
        ? 'open'
        : deviceClass === 'motion' || deviceClass === 'occupancy'
        ? 'detected'
        : 'on';
    const inactiveLabel =
      deviceClass === 'door' || deviceClass === 'window' || deviceClass === 'garage_door'
        ? 'closed'
        : deviceClass === 'motion' || deviceClass === 'occupancy'
        ? 'clear'
        : 'off';

    // Current Ongoing state
    const currentDuration = range === '6h' ? 45 * 60 * 1000 : 2 * 3600 * 1000;
    const currentStart = Math.max(startRangeTime, now - currentDuration);

    events.push({
      id: 'evt-0',
      state: isCurrentlyActive ? activeLabel : inactiveLabel,
      startTime: currentStart,
      endTime: now,
      durationMs: now - currentStart,
      timeFormatted: new Date(currentStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isCurrent: true
    });

    let lastEnd = currentStart;
    let toggle = !isCurrentlyActive;
    const intervals = range === '6h' ? [20, 8, 120, 15, 60] : [180, 25, 360, 45, 240, 15];

    for (let i = 0; i < intervals.length; i++) {
      const intervalMs = intervals[i] * 60 * 1000;
      const start = Math.max(startRangeTime, lastEnd - intervalMs);
      if (start >= lastEnd) break;

      events.push({
        id: `evt-${i + 1}`,
        state: toggle ? activeLabel : inactiveLabel,
        startTime: start,
        endTime: lastEnd,
        durationMs: lastEnd - start,
        timeFormatted: new Date(start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isCurrent: false
      });

      lastEnd = start;
      toggle = !toggle;
      if (lastEnd <= startRangeTime) break;
    }

    return events;
  };

  // Generate synthetic smooth history curve for numeric sensors (Demo mode only)
  const generateSyntheticNumericHistory = (
    range: '6h' | '24h' | '7d',
    baseVal: number
  ): NumericPoint[] => {
    const pointsCount = range === '6h' ? 24 : range === '24h' ? 36 : 48;
    const now = Date.now();
    const durationMs =
      range === '6h' ? 6 * 3600 * 1000 : range === '24h' ? 24 * 3600 * 1000 : 7 * 24 * 3600 * 1000;
    const interval = durationMs / pointsCount;

    const res: NumericPoint[] = [];
    const cur = isNaN(baseVal) ? 21.5 : baseVal;

    for (let i = pointsCount; i >= 0; i--) {
      const ts = now - i * interval;
      const d = new Date(ts);
      const timeStr =
        range === '7d'
          ? `${d.toLocaleDateString(undefined, { weekday: 'short' })} ${d.getHours()}:00`
          : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

      const noise = (Math.sin(i * 0.4) + Math.cos(i * 0.2)) * (cur * 0.05);
      const val = Number((cur + noise).toFixed(1));

      res.push({
        time: timeStr,
        timestamp: ts,
        value: val
      });
    }
    return res;
  };

  useEffect(() => {
    let isCancelled = false;

    async function loadHistory() {
      if (!entity?.entity_id) return;
      setIsLoading(true);
      const now = new Date();
      const startTime = new Date(
        now.getTime() - (timeRange === '6h' ? 6 : timeRange === '24h' ? 24 : 168) * 3600 * 1000
      ).toISOString();

      try {
        if (isLiveMode) {
          const liveHistory = await fetchLiveEntityHistory(entity.entity_id, startTime);

          if (!isCancelled && liveHistory.length > 0) {
            if (isBinaryOrStatusSensor) {
              // Parse discrete state change events from real HA timeline
              const parsedEvents: StateChangeEvent[] = [];
              let previousEnd = now.getTime();

              for (let i = liveHistory.length - 1; i >= 0; i--) {
                const pt = liveHistory[i];
                const ptTime = pt.timestamp;
                const durationMs = Math.max(1000, previousEnd - ptTime);

                parsedEvents.push({
                  id: `live-evt-${i}`,
                  state: pt.state.toLowerCase(),
                  startTime: ptTime,
                  endTime: previousEnd,
                  durationMs,
                  timeFormatted: new Date(ptTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  isCurrent: i === liveHistory.length - 1
                });
                previousEnd = ptTime;
              }

              if (parsedEvents.length > 0) {
                setStateEvents(parsedEvents);
                setIsLoading(false);
                return;
              }
            } else {
              // Parse real numeric telemetry points
              const parsed: NumericPoint[] = liveHistory
                .map((p) => {
                  const v = parseFloat(p.state);
                  if (isNaN(v)) return null;
                  const d = new Date(p.timestamp);
                  const timeStr =
                    timeRange === '7d'
                      ? `${d.toLocaleDateString(undefined, { weekday: 'short' })} ${d.getHours()}:00`
                      : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                  return {
                    time: timeStr,
                    timestamp: p.timestamp,
                    value: v
                  };
                })
                .filter((p): p is NumericPoint => p !== null);

              // Append active live state value as the most recent point
              if (!isNaN(numValue)) {
                parsed.push({
                  time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
                  timestamp: now.getTime(),
                  value: numValue
                });
              }

              if (parsed.length >= 1) {
                if (parsed.length === 1) {
                  // Stable continuous reading across period
                  const startMs = new Date(startTime).getTime();
                  const startD = new Date(startMs);
                  const startTimeStr =
                    timeRange === '7d'
                      ? `${startD.toLocaleDateString(undefined, { weekday: 'short' })} ${startD.getHours()}:00`
                      : `${String(startD.getHours()).padStart(2, '0')}:${String(startD.getMinutes()).padStart(2, '0')}`;
                  parsed.unshift({
                    time: startTimeStr,
                    timestamp: startMs,
                    value: parsed[0].value
                  });
                }

                setNumericHistory(parsed);
                setIsLoading(false);
                return;
              }
            }
          } else if (isLiveMode && !isNaN(numValue) && !isBinaryOrStatusSensor) {
            // Live sensor with steady constant value over window
            const startMs = new Date(startTime).getTime();
            const startD = new Date(startMs);
            const startTimeStr =
              timeRange === '7d'
                ? `${startD.toLocaleDateString(undefined, { weekday: 'short' })} ${startD.getHours()}:00`
                : `${String(startD.getHours()).padStart(2, '0')}:${String(startD.getMinutes()).padStart(2, '0')}`;
            const curTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            setNumericHistory([
              { time: startTimeStr, timestamp: startMs, value: numValue },
              { time: curTimeStr, timestamp: now.getTime(), value: numValue }
            ]);
            setIsLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn('[SensorHistoryView] History load error:', e);
      }

      if (!isCancelled) {
        if (haWebSocketService.isDemo()) {
          if (isBinaryOrStatusSensor) {
            setStateEvents(generateSyntheticStateEvents(timeRange, rawState));
          } else {
            setNumericHistory(generateSyntheticNumericHistory(timeRange, !isNaN(numValue) ? numValue : 22));
          }
        } else {
          setStateEvents([]);
          setNumericHistory([]);
        }
        setIsLoading(false);
      }
    }

    loadHistory();
    return () => {
      isCancelled = true;
    };
  }, [entity?.entity_id, timeRange, isLiveMode, rawState, isBinaryOrStatusSensor, numValue]);

  // Aggregate stats for numeric sensor
  const stats = useMemo(() => {
    if (numericHistory.length === 0) return { min: 0, max: 0, avg: 0 };
    const values = numericHistory.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((acc, v) => acc + v, 0) / values.length;
    return { min, max, avg };
  }, [numericHistory]);

  // Calculate timeline ribbon segments percentage
  const ribbonSegments = useMemo(() => {
    if (stateEvents.length === 0) return [];
    const totalMs = stateEvents.reduce((acc, e) => acc + e.durationMs, 0) || 1;
    return [...stateEvents].reverse().map((e) => {
      const pct = Math.max(2, (e.durationMs / totalMs) * 100);
      const isPositive =
        e.state === 'on' ||
        e.state === 'open' ||
        e.state === 'detected' ||
        e.state === 'home';
      return {
        ...e,
        widthPct: pct,
        isPositive
      };
    });
  }, [stateEvents]);

  // Sensor Hero Icon
  const SensorHeroIcon = useMemo(() => {
    if (deviceClass === 'door' || deviceClass === 'garage_door') {
      return rawState === 'open' || rawState === 'on' ? DoorOpen : Door;
    }
    if (deviceClass === 'lock') {
      return rawState === 'unlocked' || rawState === 'open' ? LockOpen : Lock;
    }
    if (deviceClass === 'motion' || deviceClass === 'occupancy') {
      return PersonSimpleWalk;
    }
    if (deviceClass === 'smoke' || deviceClass === 'moisture') {
      return Flame;
    }
    if (deviceClass === 'temperature' || String(entity?.state).includes('°')) {
      return Thermometer;
    }
    if (deviceClass === 'humidity') {
      return Drop;
    }
    if (deviceClass === 'illuminance') {
      return Sun;
    }
    if (deviceClass === 'power' || unit === 'W') {
      return Lightning;
    }
    return Pulse;
  }, [deviceClass, rawState, entity?.state, unit]);

  const isStateActive =
    rawState === 'on' ||
    rawState === 'open' ||
    rawState === 'detected' ||
    rawState === 'unlocked';

  const formatStateLabel = (st: string) => {
    const s = (st || '').toLowerCase();
    const eid = (entity?.entity_id || '').toLowerCase();
    const isDoorOrWin =
      deviceClass === 'door' ||
      deviceClass === 'window' ||
      deviceClass === 'garage_door' ||
      deviceClass === 'opening' ||
      eid.includes('door') ||
      eid.includes('window');

    if (isDoorOrWin) {
      if (s === 'on' || s === 'open') return 'Open';
      if (s === 'off' || s === 'closed') return 'Closed';
    }
    if (deviceClass === 'motion' || deviceClass === 'occupancy' || eid.includes('motion')) {
      if (s === 'on' || s === 'detected') return 'Motion Detected';
      if (s === 'off' || s === 'clear') return 'Clear';
    }
    if (deviceClass === 'smoke') {
      if (s === 'on' || s === 'detected') return 'Smoke Alert';
      if (s === 'off' || s === 'clear') return 'Clear';
    }
    if (deviceClass === 'moisture') {
      if (s === 'on' || s === 'detected') return 'Leak Alert';
      if (s === 'off' || s === 'dry') return 'Dry & Safe';
    }
    return st;
  };

  const heroStateDisplay = useMemo(() => {
    const s = rawState;
    const eid = (entity?.entity_id || '').toLowerCase();
    const isDoorOrWin =
      deviceClass === 'door' ||
      deviceClass === 'window' ||
      deviceClass === 'garage_door' ||
      deviceClass === 'opening' ||
      eid.includes('door') ||
      eid.includes('window');

    if (isDoorOrWin) {
      return s === 'on' || s === 'open' ? 'OPEN' : 'CLOSED';
    }
    return String(entity?.state || 'Unknown').toUpperCase();
  }, [deviceClass, entity?.entity_id, entity?.state, rawState]);

  // Health page design tokens for containers and tiles (frosted translucent glass)
  const bentoCardStyle = darkMode
    ? 'bg-black/20 hover:bg-black/30 text-white shadow-[4px_6px_12px_rgba(0,0,0,0.15)] border border-white/5 backdrop-blur-xl'
    : 'bg-white/35 hover:bg-white/45 text-slate-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/40 backdrop-blur-xl';

  const bentoStaticCardStyle = darkMode
    ? 'bg-black/20 text-white shadow-[4px_6px_12px_rgba(0,0,0,0.15)] border border-white/5 backdrop-blur-xl'
    : 'bg-white/35 text-slate-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/40 backdrop-blur-xl';

  return (
    <div className="space-y-4 select-none">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER ROW (Health Section Header Pattern)                         */}
      {/* ========================================================================= */}
      <div className={`p-4 rounded-3xl backdrop-blur-xl flex items-center justify-between transition-all ${bentoStaticCardStyle}`}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors"
            style={{
              backgroundColor: isBinaryOrStatusSensor
                ? isStateActive
                  ? 'rgba(244, 63, 94, 0.15)'
                  : 'rgba(16, 185, 129, 0.15)'
                : 'rgba(6, 182, 212, 0.15)',
              borderColor: isBinaryOrStatusSensor
                ? isStateActive
                  ? 'rgba(244, 63, 94, 0.35)'
                  : 'rgba(16, 185, 129, 0.35)'
                : 'rgba(6, 182, 212, 0.35)',
              color: isBinaryOrStatusSensor
                ? isStateActive
                  ? '#f43f5e'
                  : '#10b981'
                : '#06b6d4'
            }}
          >
            {customIcon ? (
              <DynamicPhosphorIcon name={customIcon} size={18} weight="duotone" />
            ) : (
              <SensorHeroIcon size={18} weight="duotone" />
            )}
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              {entity.attributes.room || entity.attributes.area || (isBinaryOrStatusSensor ? 'BINARY SENSOR' : 'TELEMETRY SENSOR')}
            </span>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-xs">
              {entity.attributes.friendly_name || 'Sensor Feed'}
            </h2>
          </div>
        </div>

        {/* Status Pill Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
              isBinaryOrStatusSensor
                ? isStateActive
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isBinaryOrStatusSensor
                  ? isStateActive
                    ? 'bg-rose-500 animate-pulse'
                    : 'bg-emerald-500'
                  : 'bg-cyan-500 animate-pulse'
              }`}
            />
            <span className="uppercase">{heroStateDisplay}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. HERO SENSOR STATUS CARD (HealthMetricCard Typography)                  */}
      {/* ========================================================================= */}
      <div
        className={`p-6 sm:p-7 rounded-3xl flex flex-col items-center justify-center text-center relative overflow-hidden transition-all ${bentoStaticCardStyle}`}
      >
        <div
          className={`absolute -inset-10 opacity-20 blur-3xl rounded-full pointer-events-none transition-all duration-700 ${
            isBinaryOrStatusSensor
              ? isStateActive
                ? 'bg-rose-500/25'
                : 'bg-emerald-500/20'
              : 'bg-cyan-500/20'
          }`}
        />

        <div
          className={`w-16 h-16 rounded-2xl border flex items-center justify-center mb-3 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] transition-all ${
            isBinaryOrStatusSensor
              ? isStateActive
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-500 dark:text-rose-300 ring-4 ring-rose-400/20'
                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-300 ring-4 ring-emerald-400/20'
              : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-600 dark:text-cyan-300 ring-4 ring-cyan-400/20'
          }`}
        >
          <SensorHeroIcon size={32} weight="duotone" />
        </div>

        {/* Big Metric Typography */}
        <div className="flex items-baseline justify-center gap-1 my-1">
          <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
            {heroStateDisplay}
          </span>
          {unit && (
            <span className="text-xl font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {unit}
            </span>
          )}
        </div>

        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 capitalize">
          {entity?.attributes?.friendly_name || entity?.entity_id}
        </p>

        {isBinaryOrStatusSensor && stateEvents.length > 0 && (
          <div
            className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border ${
              darkMode ? 'bg-black/20 border-white/10 text-slate-300' : 'bg-white/40 border-slate-200 text-slate-700 shadow-xs'
            }`}
          >
            <Clock size={14} weight="bold" className="text-slate-400" />
            <span>
              Current state for <strong className={darkMode ? 'text-white' : 'text-slate-900'}>{formatDuration(stateEvents[0]?.durationMs || 0)}</strong>
            </span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. DISCRETE SENSORS: TIMELINE OF STATUS CHANGES                            */}
      {/* ========================================================================= */}
      {isBinaryOrStatusSensor ? (
        <div className={`p-4 sm:p-5 rounded-3xl space-y-4 ${bentoStaticCardStyle}`}>
          {/* Time-Range Header */}
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Clock size={15} weight="duotone" className="text-cyan-500" />
              <span>Status History Timeline</span>
            </div>

            <div
              className={`flex items-center gap-1 p-1 rounded-2xl border ${
                darkMode ? 'bg-black/30 border-white/10' : 'bg-white/40 border-slate-200/60'
              }`}
            >
              {(['6h', '24h', '7d'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTimeRange(r)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                    timeRange === r
                      ? 'bg-cyan-500 text-slate-950 shadow-xs'
                      : darkMode
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Continuous Segmented Status Ribbon */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-mono text-slate-400 px-0.5">
              <span>{timeRange} ago</span>
              <span>Now (Live)</span>
            </div>

            <div
              className={`w-full h-5 rounded-2xl overflow-hidden flex border p-0.5 gap-0.5 ${
                darkMode ? 'bg-black/30 border-white/10' : 'bg-white/40 border-slate-200/60'
              }`}
            >
              {ribbonSegments.map((seg) => (
                <div
                  key={seg.id}
                  style={{ width: `${seg.widthPct}%` }}
                  className={`h-full rounded-md transition-all cursor-pointer hover:opacity-80 relative group ${
                    seg.isPositive
                      ? 'bg-rose-500/80 hover:bg-rose-400'
                      : 'bg-emerald-500/80 hover:bg-emerald-400'
                  }`}
                  title={`${seg.state.toUpperCase()} • ${seg.timeFormatted} (${formatDuration(seg.durationMs)})`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-[10px] pt-1 text-slate-400 dark:text-slate-500 px-0.5">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Closed / Clear / Off</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Open / Active / On</span>
                </span>
              </div>
              <span className="font-mono">{stateEvents.length} state events</span>
            </div>
          </div>

          {/* Chronological State Transition Log */}
          <div className={`space-y-2 pt-2 border-t ${darkMode ? 'border-white/5' : 'border-slate-200/50'}`}>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block px-0.5">
              Activity Log
            </label>

            {isLoading ? (
              <div className="py-6 flex items-center justify-center text-xs text-slate-400 font-mono">
                <ArrowsClockwise size={16} weight="bold" className="animate-spin mr-2" />
                Loading Status Log...
              </div>
            ) : stateEvents.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">No status changes in this period.</div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                {stateEvents.map((evt) => {
                  const isActive =
                    evt.state === 'on' ||
                    evt.state === 'open' ||
                    evt.state === 'detected' ||
                    evt.state === 'unlocked';

                  return (
                    <div
                      key={evt.id}
                      className={`p-2.5 rounded-2xl flex items-center justify-between gap-3 text-xs transition-all ${bentoCardStyle}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${
                            isActive
                              ? 'bg-rose-500/20 border-rose-500/30 text-rose-500 dark:text-rose-300'
                              : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-300'
                          }`}
                        >
                          {isActive ? (
                            <WarningCircle size={15} weight="bold" />
                          ) : (
                            <CheckCircle size={15} weight="bold" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold uppercase tracking-wide truncate text-slate-900 dark:text-white">
                            {formatStateLabel(evt.state)}
                            {evt.isCurrent && (
                              <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono mt-0.5 text-slate-400 dark:text-slate-500">
                            Started at {evt.timeFormatted}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-black text-slate-800 dark:text-slate-200">
                          {formatDuration(evt.durationMs)}
                        </span>
                        <div className="text-[10px] text-slate-400">duration</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 4. NUMERIC SENSORS: TELEMETRY CONTINUOUS AREA CHART                       */
        /* ========================================================================= */
        <div className={`p-4 sm:p-5 rounded-3xl space-y-4 ${bentoStaticCardStyle}`}>
          {/* Time-Range Selector Header */}
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <ChartLineUp size={15} weight="duotone" className="text-cyan-500" />
              <span>Telemetry History Curve</span>
            </div>

            <div
              className={`flex items-center gap-1 p-1 rounded-2xl border ${
                darkMode ? 'bg-black/30 border-white/10' : 'bg-white/40 border-slate-200/60'
              }`}
            >
              {(['6h', '24h', '7d'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTimeRange(r)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                    timeRange === r
                      ? 'bg-cyan-500 text-slate-950 shadow-xs'
                      : darkMode
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Aggregate Stats Pill Strip in Health sub-well */}
          <div
            className={`flex items-center justify-around py-2 px-3 rounded-2xl text-[11px] font-mono border ${
              darkMode ? 'bg-black/20 border-white/5 text-slate-300' : 'bg-white/40 border-slate-200/50 text-slate-700'
            }`}
          >
            <span>Min: <strong className="font-black text-slate-900 dark:text-white">{Number(stats.min || 0).toFixed(1)}{unit}</strong></span>
            <span className="opacity-20">•</span>
            <span>Avg: <strong className="font-black text-cyan-600 dark:text-cyan-300">{Number(stats.avg || 0).toFixed(1)}{unit}</strong></span>
            <span className="opacity-20">•</span>
            <span>Max: <strong className="font-black text-slate-900 dark:text-white">{Number(stats.max || 0).toFixed(1)}{unit}</strong></span>
          </div>

          {/* Chart Canvas */}
          <div className="w-full h-52 relative">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-mono">
                <ArrowsClockwise size={16} weight="bold" className="animate-spin mr-2" />
                Loading History Curve...
              </div>
            ) : numericHistory.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-mono">
                No historical records available for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={numericHistory} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sensorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke={darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                    tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke={darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                    tick={{ fontSize: 10, fill: darkMode ? '#94a3b8' : '#64748b' }}
                    tickLine={false}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as NumericPoint;
                        return (
                          <div className={`p-2.5 rounded-2xl border backdrop-blur-xl shadow-xl text-xs ${
                            darkMode ? 'bg-black/80 border-cyan-500/30 text-white' : 'bg-white/90 border-cyan-500/40 text-slate-900'
                          }`}>
                            <p className="text-[10px] text-slate-400 font-mono">{data.time}</p>
                            <p className="font-mono font-black text-cyan-500 text-sm mt-0.5">
                              {data.value} {unit}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#sensorGradient)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
