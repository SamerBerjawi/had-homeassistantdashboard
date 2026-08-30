/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Lightning,
  Sun,
  Plug,
  BatteryCharging,
  House,
  Eye,
  EyeSlash
} from '@phosphor-icons/react';
import { TransformedEnergyBucket } from '../../services/energyDataTransformer';
import { InstantaneousPowerTelemetry } from '../../utils/energyMath';
import { LineChart } from '../charts/line-chart';
import { Line } from '../charts/line';
import { Grid } from '../charts/grid';
import { XAxis } from '../charts/x-axis';
import { ChartTooltip } from '../charts/tooltip';

interface PowerSourcesLineChartCardProps {
  buckets: TransformedEnergyBucket[];
  realtime?: InstantaneousPowerTelemetry;
  hasSolar: boolean;
  hasGrid: boolean;
  hasBattery: boolean;
  darkMode?: boolean;
}

export default function PowerSourcesLineChartCard({
  buckets = [],
  realtime,
  hasSolar,
  hasGrid,
  hasBattery,
  darkMode = true
}: PowerSourcesLineChartCardProps) {
  // Visibility toggles for each combined net line series
  const [showSolar, setShowSolar] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showBattery, setShowBattery] = useState(true);
  const [showHome, setShowHome] = useState(true);

  // Transform buckets into Net lines matching Home Assistant's Power Chart:
  // - Net Grid: Import (+) / Export (-)
  // - Net Battery: Discharge (+) / Charge (-)
  // - Solar: Production (+)
  // - Home: Consumption (+)
  const chartData = useMemo(() => {
    return buckets.map((b) => {
      const netGrid = Number(((b.gridImport || 0) - (b.gridExport || 0)).toFixed(2));
      const netBattery = Number(((b.batteryDischarge || 0) - (b.batteryCharge || 0)).toFixed(2));

      return {
        date: new Date(b.startMs),
        solar: Number((b.solar || 0).toFixed(2)),
        netGrid,
        netBattery,
        homeConsumption: Number((b.homeConsumption || 0).toFixed(2)),
      };
    });
  }, [buckets]);

  // Real-time net values
  const netLiveGridKW = realtime
    ? Number((realtime.gridImportPowerKW - realtime.gridExportPowerKW).toFixed(2))
    : 0;
  const netLiveBatteryKW = realtime
    ? Number((realtime.batteryDischargePowerKW - realtime.batteryChargePowerKW).toFixed(2))
    : 0;

  return (
    <div
      className={`w-full rounded-3xl p-5 sm:p-6 border backdrop-blur-xl transition-all duration-300 relative flex flex-col justify-between overflow-hidden shadow-2xl ${darkMode
        ? 'bg-slate-900/80 border-white/10 text-white'
        : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-200/80'
        }`}
    >
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Title and Live Power Badges */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 z-10">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-2xl border ${darkMode
              ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
              : 'bg-purple-50 text-purple-600 border-purple-200'
              }`}
          >
            <Lightning size={18} weight="fill" />
          </div>
          <div>
            <h3 className={`text-sm font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Power Sources
            </h3>
            <p className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Combined net flows matching Home Assistant (Import/Discharge + vs Export/Charge -)
            </p>
          </div>
        </div>

        {/* Live Power Instantaneous Badges */}
        {realtime && (
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold">
            {hasSolar && (
              <div
                className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${darkMode
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
                  }`}
              >
                <Sun size={14} weight="fill" />
                <span>{realtime.solarPowerKW.toFixed(2)} kW</span>
              </div>
            )}

            <div
              className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${darkMode
                ? 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                : 'bg-sky-50 border-sky-200 text-sky-700'
                }`}
            >
              <Plug size={14} weight="fill" />
              <span>{netLiveGridKW >= 0 ? `+${netLiveGridKW.toFixed(2)}` : netLiveGridKW.toFixed(2)} kW</span>
            </div>

            {hasBattery && (
              <div
                className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${darkMode
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}
              >
                <BatteryCharging size={14} weight="fill" />
                <span>{netLiveBatteryKW >= 0 ? `+${netLiveBatteryKW.toFixed(2)}` : netLiveBatteryKW.toFixed(2)} kW</span>
              </div>
            )}

            <div
              className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${darkMode
                ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                : 'bg-purple-50 border-purple-200 text-purple-700'
                }`}
            >
              <House size={14} weight="fill" />
              <span>{realtime.homeConsumptionKW.toFixed(2)} kW</span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Legend & Series Filter Toggles */}
      <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold mb-4 z-10">
        {/* Home Load */}
        <button
          type="button"
          onClick={() => setShowHome(!showHome)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${showHome
            ? darkMode
              ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
              : 'bg-purple-50 border-purple-300 text-purple-700 shadow-xs'
            : darkMode
              ? 'bg-white/5 border-white/10 text-slate-500 opacity-60'
              : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60'
            }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-xs" />
          <span>Home Load</span>
          {showHome ? <Eye size={13} /> : <EyeSlash size={13} />}
        </button>

        {/* Solar Generation */}
        {hasSolar && (
          <button
            type="button"
            onClick={() => setShowSolar(!showSolar)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${showSolar
              ? darkMode
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-amber-50 border-amber-300 text-amber-700 shadow-xs'
              : darkMode
                ? 'bg-white/5 border-white/10 text-slate-500 opacity-60'
                : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60'
              }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
            <span>Solar Generation</span>
            {showSolar ? <Eye size={13} /> : <EyeSlash size={13} />}
          </button>
        )}

        {/* Combined Net Grid */}
        <button
          type="button"
          onClick={() => setShowGrid(!showGrid)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${showGrid
            ? darkMode
              ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
              : 'bg-sky-50 border-sky-300 text-sky-700 shadow-xs'
            : darkMode
              ? 'bg-white/5 border-white/10 text-slate-500 opacity-60'
              : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60'
            }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-xs" />
          <span>Grid (Import + / Export -)</span>
          {showGrid ? <Eye size={13} /> : <EyeSlash size={13} />}
        </button>

        {/* Combined Net Battery */}
        {hasBattery && (
          <button
            type="button"
            onClick={() => setShowBattery(!showBattery)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${showBattery
              ? darkMode
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
              : darkMode
                ? 'bg-white/5 border-white/10 text-slate-500 opacity-60'
                : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60'
              }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
            <span>Battery (Discharge + / Charge -)</span>
            {showBattery ? <Eye size={13} /> : <EyeSlash size={13} />}
          </button>
        )}
      </div>

      {/* Main Line Chart Area */}
      <div className="w-full h-64 sm:h-72 relative z-10">
        {chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-medium">
            No telemetry recorded for this period
          </div>
        ) : (
          <LineChart
            data={chartData}
            xDataKey="date"
            className="w-full h-full"
            margin={{ top: 20, right: 20, bottom: 35, left: 35 }}
          >
            <Grid
              stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
              highlightRowValues={[0]}
              highlightRowStroke={darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
            />
            <XAxis numTicks={Math.min(10, chartData.length)} />

            {showHome && (
              <Line
                dataKey="homeConsumption"
                stroke="#a855f7"
                strokeWidth={2.5}
              />
            )}
            {hasSolar && showSolar && (
              <Line
                dataKey="solar"
                stroke="#f59e0b"
                strokeWidth={2.2}
              />
            )}
            {showGrid && (
              <Line
                dataKey="netGrid"
                stroke="#38bdf8"
                strokeWidth={2.2}
              />
            )}
            {hasBattery && showBattery && (
              <Line
                dataKey="netBattery"
                stroke="#10b981"
                strokeWidth={2.2}
              />
            )}

            <ChartTooltip />
          </LineChart>
        )}
      </div>
    </div>
  );
}
}
