/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Zap,
  Sun,
  BatteryCharging,
  TrendingDown,
  Activity,
  CheckCircle2,
  Clock,
  Home,
  Shield,
  Bot,
  Flame,
  Droplets,
  DollarSign,
  Leaf,
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { HAEntity, Room } from '../types';
import { ENERGY_SUMMARY_DATA } from '../data';

interface DailyInsightsWidgetProps {
  entities: HAEntity[];
  rooms: Room[];
  darkMode: boolean;
  onOpenEnergyTab?: () => void;
}

type InsightCategory = 'all' | 'energy' | 'activity' | 'optimizations';

export default function DailyInsightsWidget({
  entities,
  rooms,
  darkMode,
  onOpenEnergyTab
}: DailyInsightsWidgetProps) {
  const [activeFilter, setActiveFilter] = useState<InsightCategory>('all');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [analysisProgress, setAnalysisProgress] = useState(100);
  const [analysisStep, setAnalysisStep] = useState('Analysis Complete');

  // Simulated 24-hour activity events and trends
  const activityEvents = [
    {
      id: 'act-1',
      time: '07:15 AM',
      category: 'activity',
      icon: Sun,
      color: 'amber',
      title: 'Morning Routine & Wake-up Automation',
      desc: 'Living Room blinds opened, Kitchen lights set to 75% warm white, smart espresso maker preheated.'
    },
    {
      id: 'act-2',
      time: '11:30 AM',
      category: 'activity',
      icon: Bot,
      color: 'indigo',
      title: 'Roborock Vacuum Scheduled Cycle',
      desc: 'Completed Bedroom & Hallway sweep (42 min runtime, 98% room coverage, battery returned to 82%).'
    },
    {
      id: 'act-3',
      time: '12:00 PM',
      category: 'energy',
      icon: Zap,
      color: 'amber',
      title: 'Peak Solar Production Window (5.4 kW)',
      desc: 'Rooftop solar reached daily max of 5.4 kW. Surplus power routed to Tesla Powerwall at -2.4 kW charging rate.'
    },
    {
      id: 'act-4',
      time: '02:00 PM',
      category: 'energy',
      icon: BatteryCharging,
      color: 'emerald',
      title: 'Storage Battery Reached 100% Saturation',
      desc: 'Tesla Powerwall reached 13.5 kWh full capacity. Excess solar flipped to negative utility grid export (-2.9 kW peak).'
    },
    {
      id: 'act-5',
      time: '06:45 PM',
      category: 'activity',
      icon: Home,
      color: 'purple',
      title: 'Evening Occupancy Peak (3.2 kW Load)',
      desc: 'Simultaneous load across Living Room Sonos, Kitchen appliances, and Bedroom AC. Self-powered 100% via battery storage discharge.'
    },
    {
      id: 'act-6',
      time: '08:00 PM',
      category: 'activity',
      icon: Sparkles,
      color: 'purple',
      title: 'Calm Zen Scene Activated',
      desc: 'Lighting dimmed to 40% ambient gold across all active zones; climate adjusted to sleep-optimal 20.5°C.'
    },
    {
      id: 'act-7',
      time: '11:30 PM',
      category: 'activity',
      icon: Shield,
      color: 'teal',
      title: 'Night Security Guard Armed',
      desc: 'Front door confirmed locked, exterior radar motion sensors calibrated to high sensitivity, standby loads audited.'
    }
  ];

  const optimizations = [
    {
      id: 'opt-1',
      icon: Zap,
      title: 'Align Heavy Loads with Solar Peak',
      impact: 'Save ~$1.40 / day',
      desc: 'Schedule dishwasher or EV charging between 11:00 AM – 2:00 PM to absorb -2.9 kW surplus export at 0 marginal cost.'
    },
    {
      id: 'opt-2',
      icon: Leaf,
      title: 'Overnight Standby Vampires Detected',
      impact: 'Cut ~0.6 kWh / night',
      desc: 'AV Entertainment Power Strip drew 85W continuous standby from 01:00–06:00. Enable auto-sleep rule on inactivity.'
    },
    {
      id: 'opt-3',
      icon: Home,
      title: 'Pre-Cooling Thermal Storage Efficiency',
      impact: 'Extend Battery by 18%',
      desc: 'Pre-cool bedroom zones to 20°C using rooftop solar between 14:00–16:00 to reduce evening battery drawdown.'
    }
  ];

  // Trigger simulated 24h re-analysis
  const handleTriggerAnalysis = () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysisProgress(15);
    setAnalysisStep('Ingesting 1,440 entity telemetry frames...');

    setTimeout(() => {
      setAnalysisProgress(45);
      setAnalysisStep('Evaluating negative grid export & battery flows...');
    }, 600);

    setTimeout(() => {
      setAnalysisProgress(75);
      setAnalysisStep('Auditing room occupancy & routine triggers...');
    }, 1200);

    setTimeout(() => {
      setAnalysisProgress(100);
      setAnalysisStep('Synthesizing 24-hour intelligent briefing...');
      setTimeout(() => {
        setIsAnalyzing(false);
      }, 500);
    }, 1800);
  };

  const handleCopySummary = () => {
    const summaryText = `Home Assistant 24h Intelligence Briefing:
• Self-Sufficiency: ${ENERGY_SUMMARY_DATA.selfSufficiency}%
• Solar Production: +${ENERGY_SUMMARY_DATA.todaySolarKwh} kWh (Peak 5.4 kW @ 12:00)
• Battery Storage Charged: -${ENERGY_SUMMARY_DATA.todayBatteryChargedKwh} kWh
• Grid Energy Exported: -${ENERGY_SUMMARY_DATA.todayGridExportKwh} kWh
• Total Consumption: ${ENERGY_SUMMARY_DATA.todayConsumedKwh} kWh
• Estimated Daily Savings: $${ENERGY_SUMMARY_DATA.estimatedSavings} (${ENERGY_SUMMARY_DATA.carbonOffsetKg} kg CO₂ offset)
• Top Consuming Zone: Living Room (38% of total load)
• Automations: 7 routine cycles executed with zero security anomalies.`;

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const filteredEvents = activityEvents.filter(evt => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'energy') return evt.category === 'energy';
    if (activeFilter === 'activity') return evt.category === 'activity';
    return false;
  });

  return (
    <motion.section
      layout
      id="daily-insights-widget"
      className={`rounded-[32px] p-5 sm:p-6 border backdrop-blur-2xl transition-all relative overflow-hidden shadow-xs ${
        darkMode 
          ? 'bg-slate-900/60 border-white/10' 
          : 'bg-white/65 border-white/80'
      }`}
    >
      {/* Dynamic Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-linear-to-br from-[#7B61FF]/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* TOP HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 pb-3.5 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm ${
            darkMode 
              ? 'bg-[#7B61FF]/20 border-[#7B61FF]/40 text-[#9D8BFF]' 
              : 'bg-[#7B61FF]/10 border-[#7B61FF]/30 text-[#7B61FF]'
          }`}>
            <Sparkles size={20} className={isAnalyzing ? 'animate-spin' : ''} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase tracking-wider block ${
                darkMode ? 'text-[#9D8BFF]' : 'text-[#7B61FF]'
              }`}>
                24-Hour Telemetry Intelligence
              </span>
              <span className="text-[10px] px-2 py-0.2 rounded-full font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Simulated Analysis
              </span>
            </div>
            <h3 className={`text-lg font-extrabold tracking-tight mt-0.5 ${
              darkMode ? 'text-white' : 'text-slate-800'
            }`}>
              Daily Insights & Activity Trends
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-start">
          {/* Re-analyze Button */}
          <button
            id="btn-reanalyze-daily-insights"
            disabled={isAnalyzing}
            onClick={handleTriggerAnalysis}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              isAnalyzing
                ? 'opacity-70 cursor-not-allowed bg-slate-800 text-slate-400 border-slate-700'
                : darkMode
                  ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700 hover:border-slate-600'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 shadow-2xs'
            }`}
          >
            <RefreshCw size={13} className={isAnalyzing ? 'animate-spin text-[#7B61FF]' : ''} />
            <span>{isAnalyzing ? 'Analyzing...' : 'Re-analyze 24h'}</span>
          </button>

          {/* Copy Briefing */}
          <button
            id="btn-copy-daily-briefing"
            onClick={handleCopySummary}
            className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              copied
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : darkMode
                  ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
            }`}
            title="Copy 24h briefing summary"
          >
            {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
          </button>

          {/* Expand/Collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              darkMode ? 'bg-slate-800/80 text-slate-300 border-slate-700' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* ANALYSIS IN-PROGRESS BANNER */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className={`p-3.5 rounded-2xl border ${
              darkMode ? 'bg-indigo-950/40 border-[#7B61FF]/40 text-white' : 'bg-indigo-50 border-indigo-200 text-slate-800'
            }`}>
              <div className="flex justify-between items-center text-xs font-bold mb-2">
                <span className="flex items-center gap-2 text-[#7B61FF]">
                  <Sparkles size={14} className="animate-spin" />
                  <span>{analysisStep}</span>
                </span>
                <span className="font-mono text-xs font-black text-[#7B61FF]">{analysisProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-700/30 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-linear-to-r from-[#7B61FF] to-amber-400 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${analysisProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXECUTIVE SYNTHESIS SUMMARY BANNER */}
      <div className={`p-4 sm:p-5 rounded-2xl border mb-5 transition-all ${
        darkMode 
          ? 'bg-slate-950/60 border-slate-800 text-slate-200' 
          : 'bg-white/80 border-slate-200/90 text-slate-800 shadow-2xs'
      }`}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 shrink-0 border border-amber-500/25 mt-0.5">
            <Lightbulb size={18} />
          </div>
          <div className="space-y-1.5 flex-1 text-xs sm:text-sm leading-relaxed">
            <p className="font-medium">
              Over the past 24 hours, your home operated at{' '}
              <strong className="text-emerald-400 font-extrabold">{ENERGY_SUMMARY_DATA.selfSufficiency}% self-sufficiency</strong>,
              generating <strong className="text-amber-400 font-extrabold">+{ENERGY_SUMMARY_DATA.todaySolarKwh} kWh</strong> of solar power with peak output of{' '}
              <strong className="text-amber-400 font-extrabold">+5.4 kW</strong> at midday.
            </p>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Storage battery absorbed <strong className="text-emerald-400 font-bold">-{ENERGY_SUMMARY_DATA.todayBatteryChargedKwh} kWh</strong> during excess solar windows, and exported <strong className="text-sky-400 font-bold">-{ENERGY_SUMMARY_DATA.todayGridExportKwh} kWh</strong> to the utility grid, yielding <strong className="text-emerald-400 font-bold">${ENERGY_SUMMARY_DATA.estimatedSavings}</strong> in total avoided grid costs.
              Living Room represented the dominant energy footprint (38%), while all 7 automated routine cycles executed reliably.
            </p>
          </div>
        </div>
      </div>

      {/* 4 CORE KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        
        {/* Metric 1: Solar Peak & Production (Positive) */}
        <div className={`p-3.5 rounded-2xl border ${
          darkMode ? 'bg-amber-950/20 border-amber-500/25' : 'bg-amber-50/70 border-amber-200/70'
        }`}>
          <div className="flex items-center justify-between text-amber-500 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Solar Generation</span>
            <Sun size={15} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              +{ENERGY_SUMMARY_DATA.todaySolarKwh}
            </span>
            <span className="text-[10px] font-bold text-amber-500">kWh</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Peak +5.4 kW @ 12:00</span>
        </div>

        {/* Metric 2: Battery Storage Intake (Negative) */}
        <div className={`p-3.5 rounded-2xl border ${
          darkMode ? 'bg-emerald-950/20 border-emerald-500/25' : 'bg-emerald-50/70 border-emerald-200/70'
        }`}>
          <div className="flex items-center justify-between text-emerald-500 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Battery Intake</span>
            <BatteryCharging size={15} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              -{ENERGY_SUMMARY_DATA.todayBatteryChargedKwh}
            </span>
            <span className="text-[10px] font-bold text-emerald-500">kWh</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Reached 100% by 14:00</span>
        </div>

        {/* Metric 3: Grid Net Export (Negative) */}
        <div className={`p-3.5 rounded-2xl border ${
          darkMode ? 'bg-sky-950/20 border-sky-500/25' : 'bg-sky-50/70 border-sky-200/70'
        }`}>
          <div className="flex items-center justify-between text-sky-500 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Grid Export</span>
            <ArrowUpRight size={15} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              -{ENERGY_SUMMARY_DATA.todayGridExportKwh}
            </span>
            <span className="text-[10px] font-bold text-sky-500">kWh</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Peak -2.9 kW export</span>
        </div>

        {/* Metric 4: Net Dollar Savings */}
        <div className={`p-3.5 rounded-2xl border ${
          darkMode ? 'bg-teal-950/20 border-teal-500/25' : 'bg-teal-50/70 border-teal-200/70'
        }`}>
          <div className="flex items-center justify-between text-teal-500 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Net Savings</span>
            <DollarSign size={15} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              ${ENERGY_SUMMARY_DATA.estimatedSavings}
            </span>
            <span className="text-[10px] font-bold text-teal-400">today</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">{ENERGY_SUMMARY_DATA.carbonOffsetKg} kg CO₂ avoided</span>
        </div>

      </div>

      {/* EXPANDABLE SECTION: FILTERABLE INSIGHT FEED & OPTIMIZATIONS */}
      {isExpanded && (
        <motion.div layout className="space-y-4">
          
          {/* Sub-Tabs: Filter by Category */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div 
              role="tablist"
              className={`flex items-center p-1 rounded-2xl border ${
                darkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100/90 border-slate-200'
              }`}
            >
              {[
                { id: 'all', label: 'All 24h Telemetry' },
                { id: 'energy', label: 'Energy Trends' },
                { id: 'activity', label: 'Activity Logs' },
                { id: 'optimizations', label: 'Smart Tips (3)' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  id={`btn-insight-filter-${tab.id}`}
                  onClick={() => setActiveFilter(tab.id as InsightCategory)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeFilter === tab.id
                      ? 'bg-[#7B61FF] text-white shadow-md shadow-[#7B61FF]/30'
                      : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {onOpenEnergyTab && (
              <button
                onClick={onOpenEnergyTab}
                className={`text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer ${
                  darkMode ? 'text-[#9D8BFF]' : 'text-[#7B61FF]'
                }`}
              >
                <span>Full Energy Graphs &rarr;</span>
              </button>
            )}
          </div>

          {/* CONTENT: TIMELINE OR SMART TIPS */}
          {activeFilter !== 'optimizations' ? (
            <div className="space-y-2.5">
              {filteredEvents.map((evt) => {
                const Icon = evt.icon;
                return (
                  <motion.div
                    layout
                    key={evt.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 transition-all ${
                      darkMode 
                        ? 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-950/60' 
                        : 'bg-white/70 border-slate-100 hover:bg-white shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${
                        evt.color === 'amber'
                          ? darkMode ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' : 'bg-amber-100 text-amber-600 border-amber-200'
                          : evt.color === 'emerald'
                            ? darkMode ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-emerald-100 text-emerald-600 border-emerald-200'
                            : evt.color === 'indigo'
                              ? darkMode ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' : 'bg-indigo-100 text-indigo-600 border-indigo-200'
                              : darkMode ? 'bg-purple-500/20 border-purple-500/30 text-purple-400' : 'bg-purple-100 text-purple-600 border-purple-200'
                      }`}>
                        <Icon size={16} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-xs font-extrabold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                            {evt.title}
                          </h4>
                          <span className={`text-[10px] px-2 py-0.2 rounded-md font-mono ${
                            darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {evt.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          {evt.desc}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* SMART OPTIMIZATIONS LIST */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {optimizations.map((opt) => {
                const Icon = opt.icon;
                return (
                  <motion.div
                    layout
                    key={opt.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`p-4 rounded-2xl border flex flex-col justify-between ${
                      darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-white/80 border-slate-200/80 shadow-2xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-2 rounded-xl ${
                          darkMode ? 'bg-[#7B61FF]/20 text-[#9D8BFF]' : 'bg-[#7B61FF]/10 text-[#7B61FF]'
                        }`}>
                          <Icon size={16} />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          {opt.impact}
                        </span>
                      </div>
                      <h4 className={`text-xs font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        {opt.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {opt.desc}
                      </p>
                    </div>
                    <button className={`mt-3 text-[10px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer self-start ${
                      darkMode 
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}>
                      Apply Recommendation
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}

        </motion.div>
      )}
    </motion.section>
  );
}
