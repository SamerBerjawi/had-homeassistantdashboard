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
import { PieCenter } from '../charts/pie-center';
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

      {/* Main Content Area: Donut Chart on Left/Top, Simplified List on Right/Bottom */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center my-auto flex-1 py-2 z-10">
        {/* Donut Chart Column */}
        <div className="md:col-span-5 flex flex-col items-center justify-center relative min-h-[220px]">
          <div className="w-[190px] h-[190px] sm:w-[210px] sm:h-[210px] relative flex items-center justify-center">
            <PieChart
              data={pieData}
              size={210}
              innerRadius={58}
              padAngle={0.03}
              cornerRadius={4}
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
              <PieCenter defaultLabel="Total Tracked">
                {({ value, label, isHovered }) => (
                  <div className="flex flex-col items-center justify-center text-center select-none pointer-events-none px-2 max-w-full">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 max-w-[95px] truncate leading-tight">
                      {isHovered ? label : 'Total Tracked'}
                    </span>
                    <span className="text-base sm:text-lg font-black font-mono tracking-tight text-slate-900 dark:text-white leading-tight my-0.5">
                      {value.toFixed(2)}
                    </span>
                    <span className="text-[10px] font-bold font-mono text-indigo-500 dark:text-indigo-400 leading-tight">
                      {isHovered
                        ? `${((value / Math.max(0.01, totalDevicesKwh)) * 100).toFixed(1)}%`
                        : 'kWh'}
                    </span>
                  </div>
                )}
              </PieCenter>
            </PieChart>
          </div>
        </div>

        {/* Simplified Device Breakdown List Column */}
        <div className="md:col-span-7 flex flex-col justify-center overflow-y-auto max-h-[380px] pr-1">
          <div className="divide-y divide-slate-200/50 dark:divide-white/[0.06]">
            {devices.map((device, idx) => {
              const isPieItem = idx < 6;
              const color = isPieItem ? (device.color || piePalette[idx % piePalette.length]) : (darkMode ? '#64748b' : '#94a3b8');
              const isHovered = hoveredIndex === idx || (hoveredIndex === 6 && idx >= 6);

              return (
                <div
                  key={device.statId}
                  onMouseEnter={() => setHoveredIndex(isPieItem ? idx : (otherKwh > 0.05 ? 6 : null))}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={`flex items-center justify-between py-2 px-2.5 rounded-xl transition-all duration-150 cursor-pointer group ${
                    isHovered
                      ? darkMode
                        ? 'bg-white/10'
                        : 'bg-indigo-50/90'
                      : darkMode
                      ? 'hover:bg-white/5'
                      : 'hover:bg-slate-100/70'
                  }`}
                >
                  {/* Device Icon & Name */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0 transition-transform group-hover:scale-125"
                      style={{ backgroundColor: color }}
                    />
                    <div className="shrink-0 text-slate-400 dark:text-slate-400">
                      {getDeviceIcon(device.name, darkMode)}
                    </div>
                    <span className={`text-xs sm:text-sm truncate transition-colors ${
                      isHovered
                        ? darkMode ? 'text-white font-semibold' : 'text-slate-900 font-semibold'
                        : darkMode ? 'text-slate-200 font-medium' : 'text-slate-700 font-medium'
                    }`}>
                      {device.name}
                    </span>
                  </div>

                  {/* Inline Mini Progress Bar */}
                  <div className="w-14 sm:w-20 h-1.5 rounded-full bg-slate-200/70 dark:bg-white/10 overflow-hidden shrink-0 hidden xs:block sm:block mx-2.5">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(3, device.percentage))}%`,
                        backgroundColor: color
                      }}
                    />
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center justify-end gap-2 font-mono shrink-0">
                    <span className={`text-[11px] font-medium w-10 text-right ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {device.percentage.toFixed(1)}%
                    </span>
                    <span className={`text-xs sm:text-sm font-bold w-16 sm:w-18 text-right ${
                      isHovered
                        ? darkMode ? 'text-indigo-300' : 'text-indigo-600'
                        : darkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      {device.kwh.toFixed(2)} <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">kWh</span>
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Untracked Other Usage Row */}
            {untrackedKwh > 0.05 && (
              <div
                className={`flex items-center justify-between py-2 px-2.5 rounded-xl transition-colors text-xs ${
                  darkMode ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                  <span className="w-2 h-2 rounded-full shrink-0 bg-slate-400/40" />
                  <div className="shrink-0 text-slate-400 dark:text-slate-500">
                    <Cpu size={16} />
                  </div>
                  <span className="text-xs font-medium truncate text-slate-400 dark:text-slate-400">
                    Other / Untracked
                  </span>
                </div>

                <div className="w-14 sm:w-20 h-1.5 rounded-full bg-slate-200/70 dark:bg-white/10 overflow-hidden shrink-0 hidden xs:block sm:block mx-2.5">
                  <div
                    className="h-full rounded-full transition-all duration-300 bg-slate-400/50"
                    style={{
                      width: `${Math.min(100, Math.max(3, untrackedPercentage))}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 font-mono shrink-0">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 w-10 text-right">
                    {untrackedPercentage.toFixed(1)}%
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-400 w-16 sm:w-18 text-right">
                    {untrackedKwh.toFixed(2)} <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">kWh</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
