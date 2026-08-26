/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import {
  Sun,
  Battery,
  BatteryCharging,
  Zap,
  ArrowDownRight,
  ArrowUpRight,
  Home,
  TrendingDown,
  Sparkles,
  Leaf,
  DollarSign,
  Layers,
  Gauge,
  Sliders,
  Calendar,
  Clock,
  Info,
  CheckCircle2,
  RefreshCw,
  Lightbulb
} from 'lucide-react';
import { HAEntity, Room, EnergyDataPoint } from '../types';
import { 
  ENERGY_24H_HISTORY, 
  ENERGY_7D_HISTORY, 
  ENERGY_30D_HISTORY, 
  ENERGY_SUMMARY_DATA 
} from '../data';
import DailyInsightsWidget from './DailyInsightsWidget';

interface EnergyAnalyticsViewProps {
  entities: HAEntity[];
  rooms: Room[];
  darkMode: boolean;
}

type TimeRange = '24h' | '7d' | '30d';

export default function EnergyAnalyticsView({
  entities,
  rooms,
  darkMode
}: EnergyAnalyticsViewProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [activeChartTab, setActiveChartTab] = useState<'flow' | 'rooms' | 'breakdown' | 'insights'>('flow');
  
  // Metric visibility toggles for the primary flow chart
  const [visibleSeries, setVisibleSeries] = useState({
    solar: true,
    consumption: true,
    battery: true,
    grid: true
  });

  // Selected dataset based on time range
  const currentData: EnergyDataPoint[] = useMemo(() => {
    if (timeRange === '7d') return ENERGY_7D_HISTORY;
    if (timeRange === '30d') return ENERGY_30D_HISTORY;
    return ENERGY_24H_HISTORY;
  }, [timeRange]);

  // Chart processed data where grid export and battery charging are viewed as negative values, and solar is positive
  const chartProcessedData = useMemo(() => {
    return currentData.map(item => ({
      ...item,
      // Solar is positive (+)
      solarProduction: Math.abs(item.solarProduction),
      // Consumption is positive (+)
      totalConsumption: Math.abs(item.totalConsumption),
      // Battery charging is negative (-)
      batteryCharge: item.batteryCharge > 0 ? -Math.abs(item.batteryCharge) : 0,
      // Grid export is negative (-)
      gridExport: item.gridExport > 0 ? -Math.abs(item.gridExport) : 0,
      // Battery discharge is positive (+)
      batteryDischarge: Math.abs(item.batteryDischarge),
      // Grid import is positive (+)
      gridImport: Math.abs(item.gridImport)
    }));
  }, [currentData]);

  // Extract live energy entities or fallback to calibrated values
  const solarEntity = entities.find(e => e.entity_id === 'sensor.solar_production');
  const batteryEntity = entities.find(e => e.entity_id === 'sensor.home_battery');
  const gridEntity = entities.find(e => e.entity_id === 'sensor.grid_power');
  const totalConsumptionEntity = entities.find(e => e.entity_id === 'sensor.total_consumption');

  const liveSolarKw = solarEntity?.attributes?.current_power_kw ?? 4.8;
  const liveBatteryPct = batteryEntity?.attributes?.level_pct ?? 92;
  const liveBatteryKw = batteryEntity?.attributes?.power_kw ?? 1.4;
  const liveBatteryStatus = batteryEntity?.attributes?.status ?? 'charging';
  const liveGridKw = gridEntity?.attributes?.export_kw ?? 2.1;
  const liveGridStatus = gridEntity?.attributes?.status ?? 'exporting';
  const liveTotalDemandKw = totalConsumptionEntity?.attributes?.current_kw ?? 1.3;

  // Colors adapted for Daylight Glass and Deep-Space Dark
  const chartColors = useMemo(() => ({
    solar: '#F59E0B', // Amber 500
    solarFill: '#FDE68A',
    consumption: '#7B61FF', // Brand Indigo/Purple
    consumptionFill: '#C4B5FD',
    batteryCharge: '#10B981', // Emerald 500
    batteryDischarge: '#14B8A6', // Teal 500
    gridExport: '#38BDF8', // Sky 400
    gridImport: '#F43F5E', // Rose 500
    // Room colors
    livingRoom: '#7B61FF',
    bedroom: '#38BDF8',
    kitchen: '#F59E0B',
    hall: '#10B981',
    gridLines: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    axisText: darkMode ? '#94A3B8' : '#64748B'
  }), [darkMode]);

  // Room breakdown data for Donut/Pie chart
  const roomBreakdownData = useMemo(() => {
    // Sum room totals from current dataset
    const totals = currentData.reduce(
      (acc, item) => {
        acc.livingRoom += item.livingRoom;
        acc.bedroom += item.bedroom;
        acc.kitchen += item.kitchen;
        acc.hall += item.hall;
        return acc;
      },
      { livingRoom: 0, bedroom: 0, kitchen: 0, hall: 0 }
    );

    const grandTotal = totals.livingRoom + totals.bedroom + totals.kitchen + totals.hall || 1;

    return [
      { name: 'Living Room', value: Number(totals.livingRoom.toFixed(1)), pct: Math.round((totals.livingRoom / grandTotal) * 100), color: chartColors.livingRoom },
      { name: 'Kitchen', value: Number(totals.kitchen.toFixed(1)), pct: Math.round((totals.kitchen / grandTotal) * 100), color: chartColors.kitchen },
      { name: 'Bedroom', value: Number(totals.bedroom.toFixed(1)), pct: Math.round((totals.bedroom / grandTotal) * 100), color: chartColors.bedroom },
      { name: 'Entrance Hall', value: Number(totals.hall.toFixed(1)), pct: Math.round((totals.hall / grandTotal) * 100), color: chartColors.hall }
    ];
  }, [currentData, chartColors]);

  // Custom Glassmorphic Tooltip for Recharts with polarity formatting
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const unit = timeRange === '24h' ? 'kW' : 'kWh';

    return (
      <div className={`p-3.5 rounded-2xl border shadow-xl backdrop-blur-2xl text-xs z-50 ${
        darkMode 
          ? 'bg-[#090e1f]/95 border-slate-700/80 text-white shadow-black/60' 
          : 'bg-white/95 border-slate-200/90 text-slate-800 shadow-slate-300/50'
      }`}>
        <div className="font-bold pb-2 mb-2 border-b border-white/10 flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <Clock size={12} className={darkMode ? 'text-[#9D8BFF]' : 'text-indigo-600'} />
            <span>{timeRange === '24h' ? `Time: ${label}` : `Period: ${label}`}</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {timeRange === '24h' ? 'Hourly rate (kW)' : 'Total energy (kWh)'}
          </span>
        </div>

        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => {
            if (entry.value === undefined || entry.value === null) return null;
            const val = typeof entry.value === 'number' ? entry.value : parseFloat(entry.value);
            
            // Format polarity: solar is +, battery charge is -, grid export is -, etc.
            let formattedVal = `${val.toFixed(1)} ${unit}`;
            if (entry.dataKey === 'solarProduction' && val > 0) {
              formattedVal = `+${val.toFixed(1)} ${unit}`;
            } else if (entry.dataKey === 'batteryCharge' && val !== 0) {
              formattedVal = `${val.toFixed(1)} ${unit} (charge)`;
            } else if (entry.dataKey === 'gridExport' && val !== 0) {
              formattedVal = `${val.toFixed(1)} ${unit} (export)`;
            }

            return (
              <div key={`tooltip-item-${index}`} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: entry.color || entry.stroke || entry.fill }}
                  />
                  <span className="text-[11px] font-medium text-slate-300">
                    {entry.name}:
                  </span>
                </div>
                <span className="font-mono font-bold">
                  {formattedVal}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div id="energy-analytics-view" className="space-y-6">
      
      {/* 1. TOP HEADER & TIME RANGE SELECTOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className={`text-[10px] font-black uppercase tracking-wider block ${
            darkMode ? 'text-[#9D8BFF]' : 'text-[#7B61FF]'
          }`}>Microgrid & Solar Intelligence</span>
          <h2 className={`text-xl sm:text-2xl font-extrabold tracking-tight ${
            darkMode ? 'text-white' : 'text-slate-800'
          }`}>
            Energy Production & Room Consumption
          </h2>
        </div>

        {/* Time Period Selector Tabs */}
        <div 
          id="energy-time-selector" 
          className={`flex items-center p-1 rounded-2xl border self-start sm:self-auto ${
            darkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100/90 border-slate-200'
          }`}
        >
          {(['24h', '7d', '30d'] as TimeRange[]).map((range) => {
            const isSelected = timeRange === range;
            const labels: Record<TimeRange, string> = {
              '24h': 'Today (24h)',
              '7d': 'Last 7 Days',
              '30d': '30 Days'
            };
            return (
              <button
                key={range}
                id={`btn-energy-range-${range}`}
                onClick={() => setTimeRange(range)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#7B61FF] text-white shadow-md shadow-[#7B61FF]/30 scale-[1.02]'
                    : darkMode
                      ? 'text-slate-400 hover:text-white hover:bg-white/5'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {labels[range]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. LIVE POWER TOPOGRAPHY & ENERGY FLOW INTERACTION */}
      <div className={`rounded-3xl p-5 sm:p-6 border backdrop-blur-xl relative overflow-hidden transition-all ${
        darkMode ? 'bg-slate-900/60 border-white/[0.1]' : 'bg-white/80 border-black/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
      }`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${
              darkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-600'
            }`}>
              <Sun size={18} />
            </div>
            <div>
              <h3 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>Live Microgrid Flow</h3>
              <p className="text-[10px] text-slate-400 font-medium">
                Positive solar production (+) • Negative battery charging & grid export (-)
              </p>
            </div>
          </div>

          <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border ${
            darkMode 
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            <Sparkles size={13} className="text-emerald-400 animate-spin-slow" />
            <span>{ENERGY_SUMMARY_DATA.selfSufficiency}% Self-Sufficient</span>
          </div>
        </div>

        {/* 4-Node Power Flow Layout (Solar +, Battery -, Grid -, Home +) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
          
          {/* Node 1: Solar Production (Positive +) */}
          <motion.div 
            whileHover={{ y: -2 }}
            className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${
              darkMode ? 'bg-amber-950/25 border-amber-500/30' : 'bg-amber-50/80 border-amber-200/80'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Solar Array (+)</span>
              <Sun size={18} className="text-amber-500 animate-spin-slow" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                +{liveSolarKw}
              </span>
              <span className="text-xs font-bold text-amber-500">kW</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <TrendingDown size={10} className="text-emerald-400 rotate-180" />
              <span>Generating +{ENERGY_SUMMARY_DATA.todaySolarKwh} kWh today</span>
            </p>
          </motion.div>

          {/* Node 2: Home Battery (Negative - when charging) */}
          <motion.div 
            whileHover={{ y: -2 }}
            className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${
              darkMode ? 'bg-emerald-950/25 border-emerald-500/30' : 'bg-emerald-50/80 border-emerald-200/80'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">
                Storage Battery {liveBatteryStatus === 'charging' ? '(-)' : '(+)'}
              </span>
              <BatteryCharging size={18} className="text-emerald-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{liveBatteryPct}%</span>
                <span className="text-[10px] font-bold text-slate-400">SOC</span>
              </div>
              <span className="text-xs font-bold text-emerald-500">
                {liveBatteryStatus === 'charging' ? `-${liveBatteryKw}` : `+${liveBatteryKw}`} kW
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>{liveBatteryStatus === 'charging' ? 'Intake from Solar' : 'Discharging'}</span>
              <span className="font-mono text-emerald-400 font-bold">-{ENERGY_SUMMARY_DATA.todayBatteryChargedKwh} kWh</span>
            </p>
          </motion.div>

          {/* Node 3: Grid Import/Export (Negative - when exporting) */}
          <motion.div 
            whileHover={{ y: -2 }}
            className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${
              liveGridStatus === 'exporting'
                ? darkMode ? 'bg-sky-950/25 border-sky-500/30' : 'bg-sky-50/80 border-sky-200/80'
                : darkMode ? 'bg-rose-950/25 border-rose-500/30' : 'bg-rose-50/80 border-rose-200/80'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className={`text-[10px] font-black uppercase tracking-wider ${
                liveGridStatus === 'exporting' ? 'text-sky-500' : 'text-rose-500'
              }`}>
                Utility Grid {liveGridStatus === 'exporting' ? '(-)' : '(+)'}
              </span>
              {liveGridStatus === 'exporting' ? (
                <ArrowUpRight size={18} className="text-sky-500" />
              ) : (
                <ArrowDownRight size={18} className="text-rose-500" />
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {liveGridStatus === 'exporting' ? `-${liveGridKw}` : `+${liveGridKw}`}
              </span>
              <span className={`text-xs font-bold ${
                liveGridStatus === 'exporting' ? 'text-sky-500' : 'text-rose-500'
              }`}>kW</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {liveGridStatus === 'exporting' ? `Exported -${ENERGY_SUMMARY_DATA.todayGridExportKwh} kWh` : 'Importing backup power'}
            </p>
          </motion.div>

          {/* Node 4: Home Total Demand */}
          <motion.div 
            whileHover={{ y: -2 }}
            className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${
              darkMode ? 'bg-indigo-950/25 border-indigo-500/30' : 'bg-indigo-50/80 border-indigo-200/80'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase text-[#7B61FF] tracking-wider">Total Home Load</span>
              <Home size={18} className="text-[#7B61FF]" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{liveTotalDemandKw}</span>
              <span className="text-xs font-bold text-[#7B61FF]">kW</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {ENERGY_SUMMARY_DATA.todayConsumedKwh} kWh total today
            </p>
          </motion.div>

        </div>
      </div>

      {/* 3. CHART NAVIGATION TABS & FILTER TOGGLES */}
      <div className={`rounded-3xl p-5 sm:p-6 border backdrop-blur-2xl transition-all ${
        darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white/65 border-white/80'
      }`}>
        
        {/* Sub-Tabs for Chart Views */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-4 border-b border-white/10">
          
          <div 
            id="energy-chart-tabs"
            className={`flex items-center p-1 rounded-2xl border overflow-x-auto scrollbar-none ${
              darkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100/90 border-slate-200'
            }`}
          >
            <button
              id="btn-chart-tab-flow"
              onClick={() => setActiveChartTab('flow')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeChartTab === 'flow'
                  ? 'bg-[#7B61FF] text-white shadow-md shadow-[#7B61FF]/30'
                  : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap size={14} />
              <span>Grid & Solar Balance (+ / -)</span>
            </button>
            <button
              id="btn-chart-tab-rooms"
              onClick={() => setActiveChartTab('rooms')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeChartTab === 'rooms'
                  ? 'bg-[#7B61FF] text-white shadow-md shadow-[#7B61FF]/30'
                  : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers size={14} />
              <span>Room Consumption Trends</span>
            </button>
            <button
              id="btn-chart-tab-breakdown"
              onClick={() => setActiveChartTab('breakdown')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeChartTab === 'breakdown'
                  ? 'bg-[#7B61FF] text-white shadow-md shadow-[#7B61FF]/30'
                  : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Gauge size={14} />
              <span>Distribution Breakdown</span>
            </button>
            <button
              id="btn-chart-tab-insights"
              onClick={() => setActiveChartTab('insights')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeChartTab === 'insights'
                  ? 'bg-[#7B61FF] text-white shadow-md shadow-[#7B61FF]/30'
                  : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles size={14} />
              <span>24h Daily Insights</span>
            </button>
          </div>

          {/* Metric Visibility Toggles (Flow tab) */}
          {activeChartTab === 'flow' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Series:</span>
              
              <button
                onClick={() => setVisibleSeries(s => ({ ...s, solar: !s.solar }))}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  visibleSeries.solar
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                    : 'bg-slate-800/40 border-slate-700 text-slate-500 opacity-60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Solar (+)</span>
              </button>

              <button
                onClick={() => setVisibleSeries(s => ({ ...s, consumption: !s.consumption }))}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  visibleSeries.consumption
                    ? 'bg-[#7B61FF]/20 border-[#7B61FF]/50 text-[#9D8BFF]'
                    : 'bg-slate-800/40 border-slate-700 text-slate-500 opacity-60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#7B61FF]" />
                <span>Consumption (+)</span>
              </button>

              <button
                onClick={() => setVisibleSeries(s => ({ ...s, battery: !s.battery }))}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  visibleSeries.battery
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                    : 'bg-slate-800/40 border-slate-700 text-slate-500 opacity-60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Battery Intake (-)</span>
              </button>

              <button
                onClick={() => setVisibleSeries(s => ({ ...s, grid: !s.grid }))}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  visibleSeries.grid
                    ? 'bg-sky-500/20 border-sky-500/50 text-sky-400'
                    : 'bg-slate-800/40 border-slate-700 text-slate-500 opacity-60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span>Grid Export (-)</span>
              </button>
            </div>
          )}
        </div>

        {/* 4. PRIMARY RECHARTS VISUALIZATION CONTAINER */}
        <div className="w-full min-h-[380px]">
          
          {/* TAB 1: FLOW & BALANCE AREA CHART WITH POSITIVE/NEGATIVE POLARITY */}
          {activeChartTab === 'flow' && (
            <div className="h-[380px] sm:h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartProcessedData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    {/* Solar Gradient (Positive) */}
                    <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.solar} stopOpacity={0.45}/>
                      <stop offset="95%" stopColor={chartColors.solar} stopOpacity={0.0}/>
                    </linearGradient>
                    {/* Consumption Gradient (Positive) */}
                    <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.consumption} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={chartColors.consumption} stopOpacity={0.0}/>
                    </linearGradient>
                    {/* Battery Gradient (Negative - charging below 0) */}
                    <linearGradient id="colorBatteryNegative" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.batteryCharge} stopOpacity={0.0}/>
                      <stop offset="95%" stopColor={chartColors.batteryCharge} stopOpacity={0.4}/>
                    </linearGradient>
                    {/* Grid Export Gradient (Negative - export below 0) */}
                    <linearGradient id="colorGridExportNegative" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.gridExport} stopOpacity={0.0}/>
                      <stop offset="95%" stopColor={chartColors.gridExport} stopOpacity={0.4}/>
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.gridLines} vertical={false} />
                  
                  {/* ZERO BASELINE SEPARATING POSITIVE GENERATION & NEGATIVE EXPORT/CHARGE */}
                  <ReferenceLine 
                    y={0} 
                    stroke={darkMode ? '#94A3B8' : '#64748B'} 
                    strokeWidth={1.5}
                    strokeDasharray="2 2"
                    label={{ value: '0 Baseline (Neutral)', position: 'insideTopLeft', fill: chartColors.axisText, fontSize: 10 }}
                  />

                  <XAxis 
                    dataKey="time" 
                    stroke={chartColors.axisText} 
                    fontSize={11} 
                    tickLine={false}
                    axisLine={{ stroke: chartColors.gridLines }}
                  />
                  <YAxis 
                    stroke={chartColors.axisText} 
                    fontSize={11} 
                    tickLine={false}
                    axisLine={{ stroke: chartColors.gridLines }}
                    unit={timeRange === '24h' ? ' kW' : ' kWh'}
                  />
                  <Tooltip content={<CustomChartTooltip />} />

                  {visibleSeries.solar && (
                    <Area
                      type="monotone"
                      dataKey="solarProduction"
                      name="Solar Production (+)"
                      stroke={chartColors.solar}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorSolar)"
                    />
                  )}

                  {visibleSeries.consumption && (
                    <Area
                      type="monotone"
                      dataKey="totalConsumption"
                      name="Home Consumption (+)"
                      stroke={chartColors.consumption}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorConsumption)"
                    />
                  )}

                  {visibleSeries.battery && (
                    <Area
                      type="monotone"
                      dataKey="batteryCharge"
                      name="Battery Intake (-)"
                      stroke={chartColors.batteryCharge}
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      fillOpacity={1}
                      fill="url(#colorBatteryNegative)"
                    />
                  )}

                  {visibleSeries.grid && (
                    <Area
                      type="monotone"
                      dataKey="gridExport"
                      name="Grid Export (-)"
                      stroke={chartColors.gridExport}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorGridExportNegative)"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* TAB 2: ROOM-BY-ROOM HISTORICAL TRENDS (STACKED AREA / MULTI-SERIES) */}
          {activeChartTab === 'rooms' && (
            <div className="h-[380px] sm:h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={currentData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLivingRoom" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.livingRoom} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={chartColors.livingRoom} stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="colorKitchen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.kitchen} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={chartColors.kitchen} stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="colorBedroom" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.bedroom} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={chartColors.bedroom} stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="colorHall" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.hall} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={chartColors.hall} stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.gridLines} vertical={false} />
                  <XAxis 
                    dataKey="time" 
                    stroke={chartColors.axisText} 
                    fontSize={11} 
                    tickLine={false}
                    axisLine={{ stroke: chartColors.gridLines }}
                  />
                  <YAxis 
                    stroke={chartColors.axisText} 
                    fontSize={11} 
                    tickLine={false}
                    axisLine={{ stroke: chartColors.gridLines }}
                    unit={timeRange === '24h' ? ' kW' : ' kWh'}
                  />
                  <Tooltip content={<CustomChartTooltip />} />

                  <Area
                    type="monotone"
                    stackId="1"
                    dataKey="livingRoom"
                    name="Living Room"
                    stroke={chartColors.livingRoom}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorLivingRoom)"
                  />
                  <Area
                    type="monotone"
                    stackId="1"
                    dataKey="kitchen"
                    name="Kitchen"
                    stroke={chartColors.kitchen}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorKitchen)"
                  />
                  <Area
                    type="monotone"
                    stackId="1"
                    dataKey="bedroom"
                    name="Bedroom"
                    stroke={chartColors.bedroom}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorBedroom)"
                  />
                  <Area
                    type="monotone"
                    stackId="1"
                    dataKey="hall"
                    name="Entrance Hall"
                    stroke={chartColors.hall}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorHall)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* TAB 3: DONUT BREAKDOWN & ROOM AUDIT */}
          {activeChartTab === 'breakdown' && (
            <div className="grid grid-cols-1 md:grid-cols-12 h-full gap-6 items-center py-4">
              {/* Donut Chart */}
              <div className="md:col-span-6 h-[280px] sm:h-[340px] relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roomBreakdownData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {roomBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Load</span>
                  <span className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {roomBreakdownData.reduce((acc, r) => acc + r.value, 0).toFixed(1)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">{timeRange === '24h' ? 'kWh today' : 'kWh'}</span>
                </div>
              </div>

              {/* Room Stats List */}
              <div className="md:col-span-6 space-y-3">
                {roomBreakdownData.map((roomItem) => (
                  <div 
                    key={roomItem.name} 
                    className={`p-3 rounded-2xl border flex items-center justify-between ${
                      darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: roomItem.color }} />
                      <div>
                        <h4 className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{roomItem.name}</h4>
                        <span className="text-[10px] text-slate-400">Dominant: AC & Entertainment</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className={`text-xs font-extrabold font-mono ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {roomItem.value} {timeRange === '24h' ? 'kWh' : 'kWh'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold block">
                        {roomItem.pct}% of home
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: INTEGRATED DAILY INSIGHTS & ACTIVITY BRIEFS */}
          {activeChartTab === 'insights' && (
            <div className="py-2">
              <DailyInsightsWidget
                entities={entities}
                rooms={rooms}
                darkMode={darkMode}
              />
            </div>
          )}

        </div>

      </div>

      {/* 5. SUMMARY AUDIT & SMART SAVINGS INSIGHTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Estimated Savings */}
        <div className={`p-5 rounded-2xl border backdrop-blur-xl flex items-center gap-4 ${
          darkMode ? 'bg-slate-900/60 border-white/[0.1]' : 'bg-white/80 border-black/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
        }`}>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <DollarSign size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Estimated Savings</span>
            <p className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              ${ENERGY_SUMMARY_DATA.estimatedSavings} <span className="text-xs font-semibold text-emerald-400">today</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Based on $0.28/kWh peak grid rate</p>
          </div>
        </div>

        {/* Carbon Offset */}
        <div className={`p-5 rounded-2xl border backdrop-blur-xl flex items-center gap-4 ${
          darkMode ? 'bg-slate-900/60 border-white/[0.1]' : 'bg-white/80 border-black/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
        }`}>
          <div className="w-12 h-12 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/30">
            <Leaf size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Carbon Avoided</span>
            <p className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              {ENERGY_SUMMARY_DATA.carbonOffsetKg} <span className="text-xs font-semibold text-teal-400">kg CO₂</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Equivalent to 1.2 planted trees</p>
          </div>
        </div>

        {/* Solar Coverage */}
        <div className={`p-5 rounded-2xl border backdrop-blur-xl flex items-center gap-4 ${
          darkMode ? 'bg-slate-900/60 border-white/[0.1]' : 'bg-white/80 border-black/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
        }`}>
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <Sun size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Solar vs Demand</span>
            <p className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              {ENERGY_SUMMARY_DATA.solarCoverage}% <span className="text-xs font-semibold text-amber-400">coverage</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Generating +{ENERGY_SUMMARY_DATA.todaySolarKwh} kWh vs {ENERGY_SUMMARY_DATA.todayConsumedKwh} kWh demand</p>
          </div>
        </div>

      </div>

    </div>
  );
}

