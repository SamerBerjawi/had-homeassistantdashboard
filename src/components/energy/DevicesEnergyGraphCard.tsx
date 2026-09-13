/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Devices,
  Television,
  ChargingStation,
  ThermometerHot,
  CookingPot,
  Lightbulb,
  Plug,
  Cpu
} from '@phosphor-icons/react';
import { TransformedDevice } from '../../services/energyDataTransformer';
import { PieChart } from '../charts/pie-chart';
import { PieSlice } from '../charts/pie-slice';
import { PieData } from '../charts/pie-context';

interface DevicesEnergyGraphCardProps {
  devices: TransformedDevice[];
  untrackedKwh: number;
  untrackedPercentage: number;
  totalHomeConsumption: number;
  darkMode?: boolean;
  className?: string;
}

const PIE_COLORS_DARK = [
  '#f43f5e', // rose-500
  '#38bdf8', // sky-400
  '#10b981', // emerald-500
  '#a855f7', // purple-500
  '#f59e0b', // amber-500
  '#6366f1', // indigo-500
];

const PIE_COLORS_LIGHT = [
  '#e11d48', // rose-600
  '#0284c7', // sky-600
  '#059669', // emerald-600
  '#9333ea', // purple-600
  '#d97706', // amber-600
  '#4f46e5', // indigo-600
];

function getDeviceIcon(name: string, darkMode = true) {
  const lower = name.toLowerCase();
  if (lower.includes('heat') || lower.includes('hvac') || lower.includes('climate') || lower.includes('pump')) {
    return <ThermometerHot size={16} className={darkMode ? 'text-rose-400' : 'text-rose-600'} />;
  }
  if (lower.includes('ev') || lower.includes('charger') || lower.includes('wallbox') || lower.includes('car')) {
    return <ChargingStation size={16} className={darkMode ? 'text-emerald-400' : 'text-emerald-600'} />;
  }
  if (lower.includes('kitchen') || lower.includes('cook') || lower.includes('oven') || lower.includes('fridge')) {
    return <CookingPot size={16} className={darkMode ? 'text-amber-400' : 'text-amber-600'} />;
  }
  if (lower.includes('light') || lower.includes('lamp')) {
    return <Lightbulb size={16} className={darkMode ? 'text-yellow-400' : 'text-amber-600'} />;
  }
  if (lower.includes('tv') || lower.includes('media') || lower.includes('entertainment')) {
    return <Television size={16} className={darkMode ? 'text-sky-400' : 'text-sky-600'} />;
  }
  return <Plug size={16} className={darkMode ? 'text-purple-400' : 'text-purple-600'} />;
}

export default function DevicesEnergyGraphCard({
  devices = [],
  untrackedKwh = 0,
  untrackedPercentage = 0,
  totalHomeConsumption = 0,
  darkMode = true,
  className = ''
}: DevicesEnergyGraphCardProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (devices.length === 0) return null;

  const piePalette = darkMode ? PIE_COLORS_DARK : PIE_COLORS_LIGHT;

  // Prepare top devices for pie chart (up to top 6 + grouped remainder)
  const topDevices = devices.slice(0, 6);
  const otherKwh = devices.slice(6).reduce((sum, d) => sum + d.kwh, 0);

  const pieData: PieData[] = useMemo(() => {
    const list: PieData[] = topDevices.map((d, i) => ({
      label: d.name,
      value: Math.max(0.001, Number(d.kwh.toFixed(2))),
      color: d.color || piePalette[i % piePalette.length]
    }));

    if (otherKwh > 0.05) {
      list.push({
        label: 'Other Devices',
        value: Number(otherKwh.toFixed(2)),
        color: darkMode ? '#64748b' : '#94a3b8'
      });
    }

    return list;
  }, [topDevices, otherKwh, piePalette, darkMode]);

  const totalDevicesKwh = devices.reduce((sum, d) => sum + d.kwh, 0);

  return (
    <div
      className={`w-full h-full rounded-3xl p-5 sm:p-6 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 transition-all duration-300 relative flex flex-col justify-between overflow-hidden isolate shadow-[4px_6px_12px_rgba(0,0,0,0.15)] ${
        darkMode
          ? 'bg-black/20 text-white'
          : 'bg-white/20 text-slate-900'
      } ${className}`}
    >
      {/* Ambient Glow rendered via smooth radial gradient */}
      <div
        className="absolute inset-0 rounded-3xl pointer-events-none transition-opacity duration-500"
        style={{
          backgroundImage: darkMode
            ? 'radial-gradient(circle 200px at 90% 10%, rgba(99, 102, 241, 0.08) 0%, transparent 70%)'
            : 'radial-gradient(circle 200px at 90% 10%, rgba(99, 102, 241, 0.05) 0%, transparent 70%)',
        }}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 z-10">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-2xl ${
              darkMode
                ? 'bg-indigo-500/15 text-indigo-400'
                : 'bg-indigo-50 text-indigo-600'
            }`}
          >
            <Devices size={18} weight="fill" />
          </div>
          <div>
            <h3 className={`text-sm font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Monitored Devices
            </h3>
            <p className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Distribution across {devices.length} monitored consumers
            </p>
          </div>
        </div>

        <div
          className={`px-3 py-1 rounded-2xl border font-mono text-xs font-bold ${
            darkMode
              ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
              : 'bg-indigo-50 border-indigo-200 text-indigo-700'
          }`}
        >
          {totalDevicesKwh.toFixed(2)} kWh Tracked
        </div>
      </div>

      {/* Main Content Area: Pie Chart on Left/Top, Detailed List on Right/Bottom */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center my-auto flex-1 py-2 z-10">
        {/* Pie Chart Column */}
        <div className="md:col-span-5 flex flex-col items-center justify-center relative min-h-[220px]">
          <div className="w-[190px] h-[190px] sm:w-[210px] sm:h-[210px] relative flex items-center justify-center">
            <PieChart
              data={pieData}
              size={210}
              innerRadius={0}
              padAngle={0.02}
              cornerRadius={3}
              hoveredIndex={hoveredIndex}
              onHoverChange={setHoveredIndex}
              className="w-full h-full"
            >
              {pieData.map((d, idx) => (
                <PieSlice
                  key={idx}
                  index={idx}
                  color={d.color}
                  showGlow={hoveredIndex === idx}
                />
              ))}
            </PieChart>
          </div>

          {/* Device Detail or Summary Beneath Pie */}
          <div className="mt-2.5 text-center min-h-[36px] flex flex-col items-center justify-center select-none">
            {hoveredIndex !== null && pieData[hoveredIndex] ? (
              <div className="flex flex-col items-center animate-in fade-in duration-150">
                <span className={`text-[11px] font-bold max-w-[200px] truncate ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  {pieData[hoveredIndex].label}
                </span>
                <span className={`text-xs font-mono font-black ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  {pieData[hoveredIndex].value.toFixed(2)} kWh
                  <span className={`ml-1.5 text-[10px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    ({((pieData[hoveredIndex].value / Math.max(0.01, totalDevicesKwh)) * 100).toFixed(1)}%)
                  </span>
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Total Tracked
                </span>
                <span className={`text-xs font-mono font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {totalDevicesKwh.toFixed(2)} kWh
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Device Breakdown List Column */}
        <div className="md:col-span-7 space-y-2.5 overflow-y-auto max-h-[420px] pr-1">
          {devices.map((device, idx) => {
            const isPieItem = idx < 6;
            const color = isPieItem ? (device.color || piePalette[idx % piePalette.length]) : (darkMode ? '#64748b' : '#94a3b8');
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={device.statId}
                onMouseEnter={() => isPieItem && setHoveredIndex(idx)}
                onMouseLeave={() => isPieItem && setHoveredIndex(null)}
                className={`p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col gap-1.5 ${
                  isHovered
                    ? darkMode
                      ? 'bg-white/10 border-indigo-500/50 scale-[1.01] shadow-lg'
                      : 'bg-indigo-50/90 border-indigo-300 scale-[1.01] shadow-md'
                    : darkMode
                    ? 'bg-white/5 border-white/5 hover:bg-white/[0.08]'
                    : 'bg-white/70 border-slate-200/80 shadow-xs hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-2 truncate max-w-[65%]">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: color }}
                    />
                    <div
                      className={`p-1.5 rounded-xl border shrink-0 ${
                        darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200/80 shadow-2xs'
                      }`}
                    >
                      {getDeviceIcon(device.name, darkMode)}
                    </div>
                    <span className={`truncate font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      {device.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono shrink-0">
                    <span className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {device.percentage.toFixed(1)}%
                    </span>
                    <span className={`font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {device.kwh.toFixed(2)} kWh
                    </span>
                  </div>
                </div>

                {/* Mini progress track */}
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800/80' : 'bg-slate-200/80'}`}>
                  <div
                    className="h-full rounded-full transition-all duration-500 shadow-xs"
                    style={{
                      width: `${Math.min(100, Math.max(2, device.percentage))}%`,
                      backgroundColor: color
                    }}
                  />
                </div>
              </div>
            );
          })}

          {/* Untracked Other Usage Segment */}
          {untrackedKwh > 0.05 && (
            <div
              className={`p-2.5 rounded-2xl border border-dashed flex items-center justify-between text-xs transition-colors ${
                darkMode
                  ? 'border-white/10 bg-slate-950/40'
                  : 'border-slate-300/80 bg-white/40 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`p-1.5 rounded-xl border shrink-0 ${
                    darkMode ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
                  }`}
                >
                  <Cpu size={16} />
                </div>
                <span className={darkMode ? 'text-slate-400' : 'text-slate-600 font-medium'}>
                  Other / Untracked
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className={`text-[11px] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  {untrackedPercentage.toFixed(1)}%
                </span>
                <span className={`font-bold ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                  {untrackedKwh.toFixed(2)} kWh
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
