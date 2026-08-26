/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import {
  Battery,
  BatteryCharging,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  SlidersHorizontal,
  ArrowUpDown,
  Filter,
  Shield,
  Activity,
  Radio,
  Lock,
  Bot,
  Wind,
  Flame,
  Droplets,
  Eye,
  RefreshCw,
  Zap,
  Wrench,
  Search,
  Check,
  Plus,
  TrendingDown,
  Clock,
  ChevronDown,
  ChevronUp,
  LineChart as LineChartIcon,
  Layers
} from 'lucide-react';
import { HAEntity, Room } from '../types';

interface BatteryStatusCardProps {
  room?: Room | null;
  entities: HAEntity[];
  rooms: Room[];
  darkMode: boolean;
  onSelectRoom?: (roomId: string) => void;
  onReplaceBattery?: (entityId: string) => void;
  onSimulateLowBattery?: (entityId: string) => void;
  compact?: boolean;
}

export type BatteryFilter = 'all' | 'critical' | 'low' | 'healthy';
export type BatterySort = 'lowest' | 'highest' | 'name' | 'room';

export interface BatteryDeviceInfo {
  entity_id: string;
  name: string;
  roomName: string;
  roomId?: string;
  batteryLevel: number;
  alertLevel: 'critical_below_15' | 'low_warning' | 'optimal';
  statusLabel: string;
  batteryChemistry: string;
  voltage: string;
  estimatedRuntime: string;
  stateOfHealth: number;
  icon: React.ComponentType<any>;
  state: string;
}

export function getDeviceBatteryChemistry(entityId: string): { chemistry: string; voltage: string; defaultSoH: number } {
  if (entityId.startsWith('lock.')) {
    return { chemistry: '4x AA Alkaline (1.5V)', voltage: '5.8V', defaultSoH: 96 };
  }
  if (entityId.includes('smoke') || entityId.includes('fire')) {
    return { chemistry: '9V Lithium Block', voltage: '9.1V', defaultSoH: 99 };
  }
  if (entityId.startsWith('vacuum.')) {
    return { chemistry: '14.4V Li-ion 5200mAh', voltage: '14.2V', defaultSoH: 94 };
  }
  if (entityId.includes('doorbell') || entityId.startsWith('binary_sensor.doorbell')) {
    return { chemistry: 'Li-ion Rechargeable Pack', voltage: '3.7V', defaultSoH: 92 };
  }
  if (entityId.includes('leak') || entityId.includes('water')) {
    return { chemistry: 'CR2450 3V Coin Cell', voltage: '2.95V', defaultSoH: 98 };
  }
  if (entityId.includes('motion') || entityId.includes('radar')) {
    return { chemistry: '2x CR123A Lithium', voltage: '3.0V', defaultSoH: 95 };
  }
  return { chemistry: 'CR2032 3V Coin Cell', voltage: '2.98V', defaultSoH: 97 };
}

export function getBatteryAlertStatus(level: number): {
  alertLevel: 'critical_below_15' | 'low_warning' | 'optimal';
  statusLabel: string;
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
  barColor: string;
  glowColor: string;
} {
  if (level < 15) {
    return {
      alertLevel: 'critical_below_15',
      statusLabel: 'Critical Alert (<15%)',
      badgeBg: 'bg-rose-500/20',
      badgeBorder: 'border-rose-500/50',
      textColor: 'text-rose-400',
      barColor: 'bg-rose-500',
      glowColor: 'rgba(244, 63, 94, 0.5)'
    };
  }
  if (level <= 49) {
    return {
      alertLevel: 'low_warning',
      statusLabel: 'Low Battery (15-49%)',
      badgeBg: 'bg-amber-500/15',
      badgeBorder: 'border-amber-500/35',
      textColor: 'text-amber-400',
      barColor: 'bg-amber-400',
      glowColor: 'rgba(251, 191, 36, 0.4)'
    };
  }
  return {
    alertLevel: 'optimal',
    statusLabel: 'Healthy (≥50%)',
    badgeBg: 'bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/35',
    textColor: 'text-emerald-400',
    barColor: 'bg-emerald-500',
    glowColor: 'rgba(16, 185, 129, 0.4)'
  };
}

export function getDeviceTypeIcon(entityId: string): React.ComponentType<any> {
  if (entityId.startsWith('vacuum.')) return Bot;
  if (entityId.startsWith('lock.')) return Lock;
  if (entityId.startsWith('binary_sensor.doorbell')) return Radio;
  if (entityId.includes('smoke') || entityId.includes('fire')) return Flame;
  if (entityId.includes('leak') || entityId.includes('water')) return Droplets;
  if (entityId.includes('air') || entityId.includes('aqi')) return Wind;
  if (entityId.includes('motion') || entityId.includes('radar')) return Shield;
  if (entityId.includes('lux') || entityId.includes('light_sensor')) return Eye;
  return Activity;
}

export function estimateBatteryRuntime(level: number): string {
  if (level <= 5) return 'Replace immediately (<12 hours)';
  if (level < 15) return 'Urgent: ~2-5 days remaining';
  if (level <= 25) return 'Est. ~2-3 weeks remaining';
  if (level <= 50) return 'Est. ~2-4 months remaining';
  if (level <= 75) return 'Est. ~6-9 months remaining';
  return 'Est. ~1+ year (Full Health)';
}

export default function BatteryStatusCard({
  room,
  entities,
  rooms,
  darkMode,
  onSelectRoom,
  onReplaceBattery,
  onSimulateLowBattery,
  compact = false
}: BatteryStatusCardProps) {
  const [filterMode, setFilterMode] = useState<BatteryFilter>('all');
  const [sortOrder, setSortOrder] = useState<BatterySort>('lowest');
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeAllRooms, setScopeAllRooms] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [replacingEntityId, setReplacingEntityId] = useState<string | null>(null);

  // 24-Hour Battery Discharge Recharts State
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [chartTimeRange, setChartTimeRange] = useState<'24h' | '48h' | '7d'>('24h');
  const [isChartExpanded, setIsChartExpanded] = useState(true);

  // Vibrant Palette for Multi-Line Battery Telemetry
  const DEVICE_COLOR_PALETTE = useMemo(() => [
    '#f43f5e', // Rose (Critical)
    '#f59e0b', // Amber / Warning
    '#8b5cf6', // Violet
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#ec4899', // Pink
    '#eab308', // Yellow
    '#6366f1', // Indigo
    '#14b8a6', // Teal
  ], []);

  // Extract all IoT entities that report a battery level
  const batteryDevices = useMemo<BatteryDeviceInfo[]>(() => {
    return entities
      .filter((ent) => {
        // Must have battery defined and not be the giant home storage battery
        if (ent.entity_id === 'sensor.home_battery') return false;
        return typeof ent.attributes.battery === 'number';
      })
      .map((ent) => {
        const level = Number(ent.attributes.battery);
        const { alertLevel, statusLabel } = getBatteryAlertStatus(level);
        const chem = getDeviceBatteryChemistry(ent.entity_id);
        
        // Match with room
        const matchedRoom = rooms.find(r => r.entityIds.includes(ent.entity_id)) || 
          rooms.find(r => r.name.toLowerCase() === (ent.attributes.room || '').toLowerCase());

        return {
          entity_id: ent.entity_id,
          name: ent.attributes.friendly_name || ent.entity_id,
          roomName: matchedRoom ? matchedRoom.name : (ent.attributes.room || 'General'),
          roomId: matchedRoom ? matchedRoom.id : undefined,
          batteryLevel: level,
          alertLevel,
          statusLabel,
          batteryChemistry: chem.chemistry,
          voltage: chem.voltage,
          stateOfHealth: chem.defaultSoH,
          estimatedRuntime: estimateBatteryRuntime(level),
          icon: getDeviceTypeIcon(ent.entity_id),
          state: ent.state
        };
      });
  }, [entities, rooms]);

  // Filter based on active room, filter mode, and search query
  const scopedDevices = useMemo(() => {
    let list = batteryDevices;

    // Filter by room if specified and not scoped to all
    if (room && !scopeAllRooms) {
      list = list.filter(dev => dev.roomId === room.id || dev.roomName.toLowerCase() === room.name.toLowerCase());
    }

    // Filter by alert level
    if (filterMode === 'critical') {
      list = list.filter(dev => dev.batteryLevel < 15);
    } else if (filterMode === 'low') {
      list = list.filter(dev => dev.batteryLevel >= 15 && dev.batteryLevel <= 49);
    } else if (filterMode === 'healthy') {
      list = list.filter(dev => dev.batteryLevel >= 50);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(dev => 
        dev.name.toLowerCase().includes(q) ||
        dev.roomName.toLowerCase().includes(q) ||
        dev.entity_id.toLowerCase().includes(q) ||
        dev.batteryChemistry.toLowerCase().includes(q)
      );
    }

    // Sort order
    return [...list].sort((a, b) => {
      if (sortOrder === 'lowest') return a.batteryLevel - b.batteryLevel;
      if (sortOrder === 'highest') return b.batteryLevel - a.batteryLevel;
      if (sortOrder === 'room') return a.roomName.localeCompare(b.roomName);
      return a.name.localeCompare(b.name);
    });
  }, [batteryDevices, room, scopeAllRooms, filterMode, searchQuery, sortOrder]);

  // Aggregated Alert Statistics
  const stats = useMemo(() => {
    const relevantList = room && !scopeAllRooms 
      ? batteryDevices.filter(dev => dev.roomId === room.id || dev.roomName.toLowerCase() === room.name.toLowerCase())
      : batteryDevices;

    const total = relevantList.length;
    const criticalBelow15 = relevantList.filter(d => d.batteryLevel < 15);
    const lowWarning = relevantList.filter(d => d.batteryLevel >= 15 && d.batteryLevel <= 49);
    const healthy = relevantList.filter(d => d.batteryLevel >= 50);
    const avg = total > 0 ? Math.round(relevantList.reduce((acc, d) => acc + d.batteryLevel, 0) / total) : 0;

    return { 
      total, 
      criticalBelow15Count: criticalBelow15.length,
      criticalDevices: criticalBelow15,
      lowCount: lowWarning.length, 
      healthyCount: healthy.length, 
      avg 
    };
  }, [batteryDevices, room, scopeAllRooms]);

  // Auto-select critical & low devices initially, or top 3 lowest battery devices
  useEffect(() => {
    if (batteryDevices.length > 0 && selectedEntityIds.length === 0) {
      const criticals = batteryDevices.filter(d => d.batteryLevel < 15).map(d => d.entity_id);
      if (criticals.length > 0) {
        // Also add warning devices if only 1 critical
        const warnings = batteryDevices.filter(d => d.batteryLevel >= 15 && d.batteryLevel < 50).map(d => d.entity_id);
        setSelectedEntityIds(Array.from(new Set([...criticals, ...warnings.slice(0, 2)])));
      } else {
        // Pick the 3 lowest battery devices
        const sorted = [...batteryDevices].sort((a, b) => a.batteryLevel - b.batteryLevel);
        setSelectedEntityIds(sorted.slice(0, 3).map(d => d.entity_id));
      }
    }
  }, [batteryDevices, selectedEntityIds.length]);

  // Color mapping per device
  const deviceColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    batteryDevices.forEach((dev, idx) => {
      if (dev.batteryLevel < 15) {
        map[dev.entity_id] = '#f43f5e'; // Rose / Red (Critical)
      } else if (dev.batteryLevel < 50) {
        map[dev.entity_id] = idx % 2 === 0 ? '#f59e0b' : '#eab308'; // Amber / Yellow (Warning)
      } else {
        map[dev.entity_id] = DEVICE_COLOR_PALETTE[(idx + 2) % DEVICE_COLOR_PALETTE.length];
      }
    });
    return map;
  }, [batteryDevices, DEVICE_COLOR_PALETTE]);

  // Toggle entity selection for Recharts line chart
  const toggleDeviceSelection = (entityId: string) => {
    setSelectedEntityIds(prev => 
      prev.includes(entityId)
        ? prev.filter(id => id !== entityId)
        : [...prev, entityId]
    );
  };

  // Filtered devices actively plotted on the line chart
  const plottedDevices = useMemo(() => {
    return batteryDevices.filter(d => selectedEntityIds.includes(d.entity_id));
  }, [batteryDevices, selectedEntityIds]);

  // 24-hour / multi-period discharge trend curve dataset for Recharts
  const dischargeChartData = useMemo(() => {
    if (plottedDevices.length === 0) return [];

    const pointsCount = 9; // -24h, -21h, -18h, -15h, -12h, -9h, -6h, -3h, Now
    const totalHours = chartTimeRange === '24h' ? 24 : chartTimeRange === '48h' ? 48 : 168;
    const now = new Date();

    const data = [];
    for (let i = 0; i < pointsCount; i++) {
      const ratio = i / (pointsCount - 1); // 0 (past) -> 1 (now)
      const hoursAgo = Math.round((1 - ratio) * totalHours);
      const pointTime = new Date(now.getTime() - hoursAgo * 3600 * 1000);

      let timeLabel = '';
      if (hoursAgo === 0) {
        timeLabel = 'Now';
      } else if (chartTimeRange === '24h') {
        timeLabel = pointTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (chartTimeRange === '48h') {
        timeLabel = `-${hoursAgo}h`;
      } else {
        timeLabel = pointTime.toLocaleDateString([], { weekday: 'short' });
      }

      const row: Record<string, any> = {
        time: timeLabel,
        hoursAgo,
        formattedTime: pointTime.toLocaleString([], { 
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      };

      plottedDevices.forEach((dev) => {
        // Calculate realistic 24-hour degradation trajectory
        let hourlyDrain = 0.06;
        if (dev.entity_id.startsWith('vacuum.')) {
          hourlyDrain = 0.42;
        } else if (dev.entity_id.startsWith('lock.')) {
          hourlyDrain = 0.05;
        } else if (dev.entity_id.includes('doorbell')) {
          hourlyDrain = 0.12;
        } else if (dev.entity_id.includes('smoke')) {
          hourlyDrain = 0.015;
        }

        // If in critical state (<15%), simulate an accelerated drop leading into critical alert
        if (dev.batteryLevel < 15) {
          hourlyDrain = Math.max(hourlyDrain, (18 - dev.batteryLevel) / totalHours);
        }

        const totalDischarge = Math.min(
          100 - dev.batteryLevel,
          Math.max(1.5, hourlyDrain * totalHours)
        );

        // Historical value (higher in past, reaching exact dev.batteryLevel at ratio=1 / Now)
        const levelAtTime = dev.batteryLevel + totalDischarge * (1 - ratio);
        const roundedLevel = Math.min(100, Math.max(0, Math.round(levelAtTime * 10) / 10));

        row[dev.entity_id] = roundedLevel;
      });

      data.push(row);
    }

    return data;
  }, [plottedDevices, chartTimeRange]);

  // Trend summary calculations
  const dischargeMetrics = useMemo(() => {
    if (plottedDevices.length === 0) {
      return {
        avgDrain24h: 0,
        fastestDrainDevice: null,
        criticalCount: 0
      };
    }

    let maxDrain = 0;
    let fastestDev: BatteryDeviceInfo | null = null;
    let totalDrain = 0;

    plottedDevices.forEach(dev => {
      const drainRate = dev.batteryLevel < 15 ? 5.8 : dev.entity_id.includes('vacuum') ? 11.2 : 2.4;
      totalDrain += drainRate;
      if (drainRate > maxDrain) {
        maxDrain = drainRate;
        fastestDev = dev;
      }
    });

    const avgDrain = Math.round((totalDrain / plottedDevices.length) * 10) / 10;
    const criticals = plottedDevices.filter(d => d.batteryLevel < 15);

    return {
      avgDrain24h: avgDrain,
      fastestDrainDevice: fastestDev,
      criticalCount: criticals.length
    };
  }, [plottedDevices]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleServiceDevice = (entityId: string) => {
    setReplacingEntityId(entityId);
    setTimeout(() => {
      if (onReplaceBattery) {
        onReplaceBattery(entityId);
      }
      setReplacingEntityId(null);
    }, 400);
  };

  return (
    <motion.div
      layout
      id="battery-health-dashboard"
      className={`rounded-[32px] p-5 sm:p-7 border backdrop-blur-2xl transition-all relative overflow-hidden shadow-lg ${
        darkMode
          ? 'bg-slate-900/70 border-white/10 shadow-black/60'
          : 'bg-white/80 border-white shadow-slate-200/50'
      }`}
    >
      {/* Background Soft Glow */}
      <div 
        className="absolute -top-16 -right-16 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700"
        style={{
          background: stats.criticalBelow15Count > 0 
            ? 'radial-gradient(circle, rgba(244, 63, 94, 0.22) 0%, transparent 70%)'
            : stats.lowCount > 0
              ? 'radial-gradient(circle, rgba(251, 191, 36, 0.18) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)'
        }}
      />

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 pb-4 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-md ${
            stats.criticalBelow15Count > 0
              ? darkMode ? 'bg-rose-500/25 text-rose-300 border-rose-500/50 animate-bounce' : 'bg-rose-500 text-white border-rose-600'
              : stats.lowCount > 0
                ? darkMode ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-amber-50 text-amber-600 border-amber-200'
                : darkMode ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
          }`}>
            {stats.criticalBelow15Count > 0 ? (
              <BatteryLow size={22} className="animate-pulse" />
            ) : stats.lowCount > 0 ? (
              <BatteryMedium size={22} />
            ) : (
              <Battery size={22} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase tracking-wider block ${
                darkMode ? 'text-[#9D8BFF]' : 'text-[#7B61FF]'
              }`}>
                Fleet Diagnostics & Power Telemetry
              </span>
              {room && (
                <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold border ${
                  darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {scopeAllRooms ? 'All Rooms' : room.name}
                </span>
              )}
            </div>
            <h3 className={`text-lg sm:text-xl font-black tracking-tight mt-0.5 flex items-center gap-2 ${
              darkMode ? 'text-white' : 'text-slate-800'
            }`}>
              <span>Battery Health Monitoring</span>
              {stats.criticalBelow15Count > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse border border-rose-400">
                  {stats.criticalBelow15Count} Critical Alert (&lt;15%)
                </span>
              )}
            </h3>
          </div>
        </div>

        {/* Action Controls & Scope Switch */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-start flex-wrap">
          {room && (
            <button
              id="btn-toggle-battery-scope"
              onClick={() => setScopeAllRooms(!scopeAllRooms)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                scopeAllRooms
                  ? 'bg-[#7B61FF] text-white border-[#7B61FF]'
                  : darkMode
                    ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {scopeAllRooms ? `Show Only ${room.name}` : 'View All Rooms'}
            </button>
          )}

          {/* Quick Demo Test Trigger for <15% Alert */}
          {onSimulateLowBattery && (
            <button
              id="btn-simulate-low-battery"
              onClick={() => {
                const target = batteryDevices[0]?.entity_id || 'lock.front_door';
                onSimulateLowBattery(target);
              }}
              title="Test <15% Battery alert badge trigger"
              className={`text-[11px] font-extrabold px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
                stats.criticalBelow15Count > 0
                  ? darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                  : darkMode 
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25' 
                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <BatteryLow size={13} className="text-rose-400" />
              <span>Simulate &lt;15% Alert</span>
            </button>
          )}

          <button
            id="btn-refresh-battery-diagnostics"
            title="Refresh Battery Levels"
            onClick={handleRefresh}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              darkMode ? 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white' : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
            }`}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-[#7B61FF]' : ''} />
          </button>
        </div>
      </div>

      {/* ⚠️ CRITICAL LOW BATTERY (<15%) ACTION BANNER */}
      {stats.criticalBelow15Count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          id="critical-battery-alert-banner"
          className="mb-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-500/20 via-rose-600/15 to-amber-500/10 border-2 border-rose-500/60 shadow-lg shadow-rose-500/15 relative overflow-hidden z-10"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500 text-white shadow-md shadow-rose-500/40 shrink-0">
                <AlertTriangle size={20} className="animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-rose-400 tracking-tight uppercase">
                    Urgent Battery Notification (<span className="text-white">&lt; 15% Power</span>)
                  </h4>
                  <span className="bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                    Action Required
                  </span>
                </div>
                <p className={`text-xs mt-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  {stats.criticalBelow15Count} device{stats.criticalBelow15Count > 1 ? 's have' : ' has'} dropped below 15% charge and may go offline within 24–48 hours:
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {stats.criticalDevices.map(d => (
                    <span 
                      key={d.entity_id}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-200"
                    >
                      <BatteryLow size={12} className="text-rose-400" />
                      <span>{d.name} ({d.batteryLevel}%)</span>
                      <span className="text-[9px] text-rose-400 font-mono">[{d.batteryChemistry}]</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Replace All Critical Button */}
            <div className="shrink-0 w-full md:w-auto">
              <button
                id="btn-replace-all-critical-batteries"
                onClick={() => {
                  stats.criticalDevices.forEach(d => {
                    if (onReplaceBattery) onReplaceBattery(d.entity_id);
                  });
                }}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-md shadow-rose-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Wrench size={14} />
                <span>Replace / Recharge All (&lt;15%) &rarr;</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* COLOR-CODED ALERT SUMMARY METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 relative z-10">
        
        {/* Total Tracked Devices */}
        <div className={`p-3.5 rounded-2xl border ${
          darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-white/90 border-slate-100'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Fleet IoT Nodes</span>
            <Activity size={14} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {stats.total}
            </span>
            <span className="text-[10px] text-slate-400 font-bold">devices</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Fleet Avg: <b>{stats.avg}%</b> capacity</span>
        </div>

        {/* Red / Critical Devices (<15%) */}
        <button
          onClick={() => setFilterMode(filterMode === 'critical' ? 'all' : 'critical')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            filterMode === 'critical'
              ? 'ring-2 ring-rose-500 border-rose-500 bg-rose-500/25'
              : stats.criticalBelow15Count > 0
                ? darkMode ? 'bg-rose-950/30 border-rose-500/40 hover:bg-rose-950/50' : 'bg-rose-50/90 border-rose-300 hover:bg-rose-100'
                : darkMode ? 'bg-slate-950/50 border-slate-800 hover:bg-slate-950/70' : 'bg-white/90 border-slate-100 hover:bg-white'
          }`}
        >
          <div className="flex items-center justify-between text-rose-500 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Critical Alert</span>
            <AlertTriangle size={14} className={stats.criticalBelow15Count > 0 ? 'animate-bounce' : ''} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-black ${stats.criticalBelow15Count > 0 ? 'text-rose-400' : darkMode ? 'text-white' : 'text-slate-900'}`}>
              {stats.criticalBelow15Count}
            </span>
            <span className="text-[10px] text-rose-500 font-bold">&lt; 15%</span>
          </div>
          <span className="text-[10px] text-rose-400 mt-1 block font-bold">
            {stats.criticalBelow15Count > 0 ? 'Action required' : 'None critical'}
          </span>
        </button>

        {/* Yellow / Low Warning (15-49%) */}
        <button
          onClick={() => setFilterMode(filterMode === 'low' ? 'all' : 'low')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            filterMode === 'low'
              ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-500/25'
              : darkMode ? 'bg-amber-950/20 border-amber-500/25 hover:bg-amber-950/30' : 'bg-amber-50/70 border-amber-200/70 hover:bg-amber-50'
          }`}
        >
          <div className="flex items-center justify-between text-amber-500 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Low Warning</span>
            <BatteryWarning size={14} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {stats.lowCount}
            </span>
            <span className="text-[10px] text-amber-500 font-bold">15–49%</span>
          </div>
          <span className="text-[10px] text-amber-400/90 mt-1 block">Plan upcoming service</span>
        </button>

        {/* Green / Optimal Devices (50%+) */}
        <button
          onClick={() => setFilterMode(filterMode === 'healthy' ? 'all' : 'healthy')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            filterMode === 'healthy'
              ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-500/25'
              : darkMode ? 'bg-emerald-950/20 border-emerald-500/25 hover:bg-emerald-950/30' : 'bg-emerald-50/70 border-emerald-200/70 hover:bg-emerald-50'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-500 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Healthy</span>
            <CheckCircle2 size={14} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {stats.healthyCount}
            </span>
            <span className="text-[10px] text-emerald-500 font-bold">&ge; 50%</span>
          </div>
          <span className="text-[10px] text-emerald-400/90 mt-1 block">Peak voltage stability</span>
        </button>

      </div>

      {/* 📊 24-HOUR BATTERY DISCHARGE RECHARTS VISUALIZATION */}
      <div 
        id="battery-discharge-trend-chart-panel"
        className={`mb-6 rounded-3xl p-4 sm:p-6 border transition-all relative overflow-hidden ${
          darkMode 
            ? 'bg-slate-950/60 border-slate-800/90 text-slate-100 shadow-md shadow-black/40' 
            : 'bg-white/90 border-slate-200/90 text-slate-800 shadow-xs'
        }`}
      >
        {/* Chart Header & Controls */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#7B61FF]/15 text-[#7B61FF] border border-[#7B61FF]/30">
                <LineChartIcon size={16} />
              </span>
              <h4 className={`text-sm sm:text-base font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                24-Hour Battery Discharge Trend
              </h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                dischargeMetrics.criticalCount > 0
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                  : darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {plottedDevices.length} Device{plottedDevices.length !== 1 ? 's' : ''} Plotted
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Interactive historical discharge telemetry tracking voltage degradation, drain rate, and critical threshold drops.
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto justify-between md:justify-end flex-wrap">
            {/* Time Resolution Switcher */}
            <div className={`flex items-center p-1 rounded-xl border text-[11px] font-bold ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              {(['24h', '48h', '7d'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setChartTimeRange(t)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chartTimeRange === t
                      ? 'bg-[#7B61FF] text-white shadow-xs'
                      : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t === '24h' ? 'Last 24h' : t === '48h' ? 'Last 48h' : 'Last 7d'}
                </button>
              ))}
            </div>

            {/* Quick Series Preset Selectors */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const criticals = batteryDevices.filter(d => d.batteryLevel < 15).map(d => d.entity_id);
                  if (criticals.length > 0) {
                    setSelectedEntityIds(criticals);
                  } else {
                    const lowest = [...batteryDevices].sort((a,b) => a.batteryLevel - b.batteryLevel).slice(0, 2).map(d => d.entity_id);
                    setSelectedEntityIds(lowest);
                  }
                }}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                  darkMode 
                    ? 'bg-rose-950/30 text-rose-300 border-rose-500/30 hover:bg-rose-950/50' 
                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                }`}
              >
                Critical (&lt;15%)
              </button>

              <button
                onClick={() => {
                  const lowAndCrit = batteryDevices.filter(d => d.batteryLevel < 50).map(d => d.entity_id);
                  setSelectedEntityIds(lowAndCrit.length > 0 ? lowAndCrit : batteryDevices.slice(0, 4).map(d => d.entity_id));
                }}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                  darkMode 
                    ? 'bg-amber-950/30 text-amber-300 border-amber-500/30 hover:bg-amber-950/50' 
                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                }`}
              >
                Warning (&lt;50%)
              </button>

              <button
                onClick={() => {
                  if (selectedEntityIds.length === batteryDevices.length) {
                    setSelectedEntityIds([]);
                  } else {
                    setSelectedEntityIds(batteryDevices.map(d => d.entity_id));
                  }
                }}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                  darkMode 
                    ? 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {selectedEntityIds.length === batteryDevices.length ? 'Clear' : 'Select All'}
              </button>

              {/* Collapse / Expand */}
              <button
                onClick={() => setIsChartExpanded(!isChartExpanded)}
                title={isChartExpanded ? 'Collapse chart' : 'Expand chart'}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  darkMode ? 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white' : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
                }`}
              >
                {isChartExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Interactive Device Filter Chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {batteryDevices.map(dev => {
            const isSelected = selectedEntityIds.includes(dev.entity_id);
            const color = deviceColorMap[dev.entity_id] || '#7B61FF';
            const isBelow15 = dev.batteryLevel < 15;

            return (
              <button
                key={dev.entity_id}
                onClick={() => toggleDeviceSelection(dev.entity_id)}
                className={`text-[10.5px] font-bold px-2.5 py-1 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? darkMode
                      ? 'bg-slate-900 border-white/20 text-white shadow-xs'
                      : 'bg-white border-slate-300 text-slate-900 shadow-xs'
                    : darkMode
                      ? 'bg-slate-950/50 border-slate-800 text-slate-500 opacity-60 hover:opacity-100 hover:text-slate-300'
                      : 'bg-slate-100/60 border-slate-200 text-slate-400 opacity-70 hover:opacity-100 hover:text-slate-700'
                }`}
              >
                <span 
                  className="w-2.5 h-2.5 rounded-full transition-transform" 
                  style={{ 
                    backgroundColor: color,
                    transform: isSelected ? 'scale(1.15)' : 'scale(0.85)',
                    boxShadow: isSelected ? `0 0 8px ${color}80` : 'none'
                  }} 
                />
                <span className="truncate max-w-[130px]">{dev.name}</span>
                <span className={`font-mono text-[9.5px] ${isBelow15 ? 'text-rose-400 font-black' : isSelected ? (darkMode ? 'text-slate-300' : 'text-slate-700') : 'text-slate-400'}`}>
                  {dev.batteryLevel}%
                </span>
                {isSelected && (
                  <Check size={11} className="text-emerald-400" />
                )}
              </button>
            );
          })}
        </div>

        {isChartExpanded && (
          <div>
            {plottedDevices.length === 0 ? (
              <div className={`p-8 text-center rounded-2xl border ${
                darkMode ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <Activity size={24} className="mx-auto mb-2 text-[#7B61FF]" />
                <p className="text-xs font-bold">No devices selected to plot.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Click any device chip above to visualize its 24-hour battery discharge curve.</p>
                <button
                  onClick={() => {
                    const topCrit = batteryDevices.filter(d => d.batteryLevel < 15).map(d => d.entity_id);
                    setSelectedEntityIds(topCrit.length > 0 ? topCrit : batteryDevices.slice(0, 3).map(d => d.entity_id));
                  }}
                  className="mt-3 text-xs font-black text-white bg-[#7B61FF] hover:bg-[#684be3] px-3.5 py-1.5 rounded-xl cursor-pointer shadow-xs"
                >
                  Plot Critical &amp; Low Nodes
                </button>
              </div>
            ) : (
              <>
                {/* Discharge Telemetry Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-3.5 text-xs">
                  <div className={`p-2.5 rounded-xl border ${
                    darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Avg Drain ({chartTimeRange})</span>
                    <div className="flex items-center gap-1.5 mt-0.5 font-mono">
                      <TrendingDown size={14} className="text-amber-400" />
                      <span className="font-extrabold text-amber-400">-{dischargeMetrics.avgDrain24h}%</span>
                      <span className="text-[10px] text-slate-400">/ {chartTimeRange}</span>
                    </div>
                  </div>

                  <div className={`p-2.5 rounded-xl border ${
                    darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Fastest Drain Node</span>
                    <div className="flex items-center gap-1.5 mt-0.5 truncate">
                      <span className="font-bold truncate text-rose-400">
                        {dischargeMetrics.fastestDrainDevice ? dischargeMetrics.fastestDrainDevice.name : 'Stable'}
                      </span>
                    </div>
                  </div>

                  <div className={`col-span-2 sm:col-span-1 p-2.5 rounded-xl border ${
                    dischargeMetrics.criticalCount > 0
                      ? darkMode ? 'bg-rose-950/30 border-rose-500/40 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
                      : darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <span className="text-[10px] font-bold block uppercase tracking-wider opacity-80">Critical Threshold</span>
                    <div className="flex items-center gap-1.5 mt-0.5 font-bold">
                      <AlertTriangle size={13} className={dischargeMetrics.criticalCount > 0 ? 'text-rose-400 animate-bounce' : 'text-emerald-400'} />
                      <span className={dischargeMetrics.criticalCount > 0 ? 'text-rose-400 font-black' : 'text-emerald-400'}>
                        {dischargeMetrics.criticalCount > 0 ? `${dischargeMetrics.criticalCount} Below 15% Cutoff` : 'All Nodes Safe'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* RECHARTS LINE CHART CONTAINER */}
                <div className="h-[260px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={dischargeChartData}
                      margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} 
                        vertical={false}
                      />
                      <XAxis 
                        dataKey="time" 
                        stroke={darkMode ? '#94a3b8' : '#64748b'} 
                        fontSize={10.5} 
                        tickLine={false}
                        axisLine={{ stroke: darkMode ? '#334155' : '#e2e8f0' }}
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        ticks={[0, 15, 50, 75, 100]} 
                        unit="%" 
                        stroke={darkMode ? '#94a3b8' : '#64748b'} 
                        fontSize={10.5} 
                        tickLine={false}
                        axisLine={{ stroke: darkMode ? '#334155' : '#e2e8f0' }}
                      />
                      
                      {/* Critical Threshold (<15%) Reference Line */}
                      <ReferenceLine 
                        y={15} 
                        stroke="#f43f5e" 
                        strokeDasharray="4 4" 
                        strokeWidth={1.5}
                        label={{ 
                          value: 'Critical Threshold (<15%)', 
                          fill: '#f43f5e', 
                          fontSize: 9.5, 
                          fontWeight: 'bold',
                          position: 'insideBottomRight' 
                        }} 
                      />

                      {/* Low Warning Threshold (50%) Reference Line */}
                      <ReferenceLine 
                        y={50} 
                        stroke="#eab308" 
                        strokeDasharray="2 2" 
                        strokeWidth={1}
                        strokeOpacity={0.6}
                        label={{ 
                          value: 'Low Warning (50%)', 
                          fill: '#eab308', 
                          fontSize: 9, 
                          position: 'insideTopRight' 
                        }} 
                      />

                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const dataPoint = payload[0]?.payload;
                            return (
                              <div className={`p-3 rounded-2xl border shadow-xl backdrop-blur-md text-xs z-50 ${
                                darkMode 
                                  ? 'bg-slate-950/95 border-slate-700/80 text-white shadow-black/80' 
                                  : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300/60'
                              }`}>
                                <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-white/10 font-bold">
                                  <span className="flex items-center gap-1.5 text-slate-400">
                                    <Clock size={12} className="text-[#7B61FF]" />
                                    <span>{dataPoint?.formattedTime || label}</span>
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono">
                                    {label === 'Now' ? 'Current' : `${dataPoint?.hoursAgo}h ago`}
                                  </span>
                                </div>

                                <div className="space-y-1.5">
                                  {payload.map((item: any) => {
                                    const dev = batteryDevices.find(d => d.entity_id === item.dataKey);
                                    const val = item.value;
                                    const isBelow15 = val < 15;
                                    const diffFromNow = dev ? Math.round((val - dev.batteryLevel) * 10) / 10 : 0;

                                    return (
                                      <div key={item.dataKey} className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-1.5">
                                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                          <span className="font-bold truncate max-w-[130px]">{dev?.name || item.name}</span>
                                          {dev?.roomName && (
                                            <span className="text-[9px] text-slate-400">({dev.roomName})</span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 font-mono">
                                          <span className={`font-black ${isBelow15 ? 'text-rose-400' : darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                            {val}%
                                          </span>
                                          {label !== 'Now' && diffFromNow > 0 && (
                                            <span className="text-[9.5px] text-amber-400">
                                              (+{diffFromNow}%)
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }} 
                      />

                      {/* Dynamic Lines for Each Plotted Device */}
                      {plottedDevices.map((dev) => {
                        const color = deviceColorMap[dev.entity_id] || '#7B61FF';
                        return (
                          <Line
                            key={dev.entity_id}
                            type="monotone"
                            dataKey={dev.entity_id}
                            name={dev.name}
                            stroke={color}
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: color, strokeWidth: 1, stroke: darkMode ? '#0f172a' : '#ffffff' }}
                            activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2, fill: color }}
                            isAnimationActive={true}
                            animationDuration={600}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* FILTER, SEARCH & SORT CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 relative z-10 text-xs">
        
        {/* Filter Pills */}
        <div 
          role="tablist"
          className={`flex items-center p-1 rounded-xl border overflow-x-auto ${
            darkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-100/90 border-slate-200'
          }`}
        >
          {[
            { id: 'all', label: `All (${stats.total})` },
            { id: 'critical', label: `Critical <15% (${stats.criticalBelow15Count})`, isAlert: stats.criticalBelow15Count > 0 },
            { id: 'low', label: `Low 15-49% (${stats.lowCount})` },
            { id: 'healthy', label: `Healthy 50%+ (${stats.healthyCount})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id as BatteryFilter)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                filterMode === tab.id
                  ? 'bg-[#7B61FF] text-white shadow-xs'
                  : tab.isAlert
                    ? 'text-rose-400 font-black hover:text-rose-300'
                    : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
              {tab.isAlert && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />}
            </button>
          ))}
        </div>

        {/* Search and Sort */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-44">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search IoT device..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full text-[11px] font-medium pl-7 pr-2.5 py-1.5 rounded-xl border focus:outline-hidden ${
                darkMode 
                  ? 'bg-slate-950/80 border-slate-800 text-slate-200 focus:border-[#7B61FF]' 
                  : 'bg-white border-slate-200 text-slate-700 focus:border-[#7B61FF]'
              }`}
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              <ArrowUpDown size={11} />
            </span>
            <select
              id="select-battery-sort"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as BatterySort)}
              className={`text-[11px] font-bold py-1.5 px-2 rounded-xl border cursor-pointer focus:outline-hidden ${
                darkMode 
                  ? 'bg-slate-950/80 border-slate-800 text-slate-200 focus:border-[#7B61FF]' 
                  : 'bg-white border-slate-200 text-slate-700 focus:border-[#7B61FF]'
              }`}
            >
              <option value="lowest">Lowest Battery First (&lt;15% top)</option>
              <option value="highest">Highest Battery First</option>
              <option value="name">Device Name (A-Z)</option>
              <option value="room">Room Location</option>
            </select>
          </div>
        </div>
      </div>

      {/* COMPREHENSIVE BATTERY FLEET LIST */}
      {scopedDevices.length === 0 ? (
        <div className={`p-8 text-center rounded-2xl border ${
          darkMode ? 'bg-slate-950/40 border-slate-800 text-slate-400' : 'bg-white/50 border-slate-100 text-slate-500'
        }`}>
          <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-400 opacity-80" />
          <p className="text-sm font-bold">No IoT devices matching this filter or search query.</p>
          <button
            onClick={() => {
              setFilterMode('all');
              setSearchQuery('');
            }}
            className="mt-2 text-xs font-bold text-[#7B61FF] hover:underline cursor-pointer"
          >
            Clear filters & view all battery devices
          </button>
        </div>
      ) : (
        <div className="space-y-2.5 relative z-10 max-h-[440px] overflow-y-auto pr-1 scrollbar-thin">
          <AnimatePresence mode="popLayout">
            {scopedDevices.map((device) => {
              const Icon = device.icon;
              const { alertLevel, statusLabel, badgeBg, badgeBorder, textColor, barColor } = getBatteryAlertStatus(device.batteryLevel);
              const isBelow15 = device.batteryLevel < 15;

              return (
                <motion.div
                  layout
                  key={device.entity_id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                    isBelow15
                      ? darkMode
                        ? 'bg-rose-950/30 border-rose-500/50 shadow-md shadow-rose-950/40'
                        : 'bg-rose-50/90 border-rose-300 shadow-sm'
                      : alertLevel === 'low_warning'
                        ? darkMode
                          ? 'bg-amber-950/20 border-amber-500/30 hover:bg-amber-950/30'
                          : 'bg-amber-50/60 border-amber-200 hover:bg-amber-50'
                        : darkMode
                          ? 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-950/70'
                          : 'bg-white/80 border-slate-100 hover:bg-white shadow-2xs'
                  }`}
                >
                  {/* Left: Device Info & Icon */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      isBelow15
                        ? darkMode ? 'bg-rose-500/25 text-rose-300 border-rose-500/50 animate-pulse' : 'bg-rose-100 text-rose-600 border-rose-300'
                        : alertLevel === 'low_warning'
                          ? darkMode ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-amber-100 text-amber-600 border-amber-200'
                          : darkMode ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-emerald-100 text-emerald-600 border-emerald-200'
                    }`}>
                      <Icon size={19} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`text-xs sm:text-sm font-black truncate ${
                          darkMode ? 'text-white' : 'text-slate-800'
                        }`}>
                          {device.name}
                        </h4>
                        
                        {/* Scope/Room Badge */}
                        <span 
                          onClick={() => device.roomId && onSelectRoom && onSelectRoom(device.roomId)}
                          className={`text-[9.5px] px-2 py-0.5 rounded-md font-bold border transition-colors cursor-pointer ${
                            darkMode 
                              ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-[#7B61FF]' 
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-[#7B61FF]'
                          }`}
                        >
                          {device.roomName}
                        </span>

                        {/* Chemistry Type Badge */}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                          darkMode ? 'bg-slate-800/80 text-slate-400' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {device.batteryChemistry}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 text-[10.5px] text-slate-400 mt-1 flex-wrap">
                        <span className="font-mono">{device.voltage}</span>
                        <span>•</span>
                        <span className={isBelow15 ? 'text-rose-400 font-black' : ''}>
                          {device.estimatedRuntime}
                        </span>
                        <span>•</span>
                        <span>SoH: <b className="text-slate-300">{device.stateOfHealth}%</b></span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Color-Coded Alert Badge, Gauge Bar & Service Button */}
                  <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end shrink-0">
                    
                    {/* Status Pill Badge */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold border ${badgeBg} ${badgeBorder} ${textColor}`}>
                      {isBelow15 && <AlertTriangle size={12} className="animate-bounce" />}
                      {!isBelow15 && alertLevel === 'low_warning' && <AlertCircle size={12} />}
                      {alertLevel === 'optimal' && <CheckCircle2 size={12} />}
                      <span>{statusLabel}</span>
                    </div>

                    {/* Numerical Percentage + Mini Progress Bar */}
                    <div className="w-24 sm:w-28 text-right">
                      <div className="flex items-center justify-end gap-1.5 mb-1">
                        <span className={`text-xs font-mono font-black ${textColor}`}>
                          {device.batteryLevel}%
                        </span>
                      </div>

                      {/* Mini Bar */}
                      <div className="w-full h-1.5 rounded-full bg-slate-700/20 overflow-hidden">
                        <motion.div
                          className={`h-full ${barColor} rounded-full`}
                          initial={{ width: 0 }}
                          animate={{ width: `${device.batteryLevel}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                    </div>

                    {/* Toggle Plot on 24h Trend Chart Button */}
                    <button
                      type="button"
                      onClick={() => toggleDeviceSelection(device.entity_id)}
                      title={selectedEntityIds.includes(device.entity_id) ? "Remove from 24h discharge trend chart" : "Plot on 24h discharge trend chart"}
                      className={`p-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 cursor-pointer shrink-0 ${
                        selectedEntityIds.includes(device.entity_id)
                          ? darkMode
                            ? 'bg-[#7B61FF]/20 text-[#9D8BFF] border-[#7B61FF]/40 shadow-xs'
                            : 'bg-[#7B61FF]/10 text-[#7B61FF] border-[#7B61FF]/30 shadow-xs'
                          : darkMode
                            ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                            : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
                      }`}
                    >
                      <LineChartIcon size={13} />
                      <span className="hidden xl:inline text-[10px]">
                        {selectedEntityIds.includes(device.entity_id) ? 'Plotted' : 'Trend'}
                      </span>
                    </button>

                    {/* Service / Recharge Action Button */}
                    <button
                      id={`btn-service-battery-${device.entity_id}`}
                      onClick={() => handleServiceDevice(device.entity_id)}
                      disabled={replacingEntityId === device.entity_id}
                      title={isBelow15 ? "Replace battery immediately (Reset to 100%)" : "Recharge / Service battery"}
                      className={`p-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 cursor-pointer shrink-0 ${
                        isBelow15
                          ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-sm animate-pulse'
                          : darkMode
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {replacingEntityId === device.entity_id ? (
                        <RefreshCw size={13} className="animate-spin" />
                      ) : isBelow15 ? (
                        <>
                          <Wrench size={13} />
                          <span className="hidden sm:inline">Replace</span>
                        </>
                      ) : (
                        <>
                          <BatteryCharging size={13} className="text-emerald-400" />
                          <span className="hidden sm:inline">Recharge</span>
                        </>
                      )}
                    </button>

                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* FOOTER TIP */}
      <div className={`mt-5 pt-3.5 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] ${
        darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
      }`}>
        <span className="flex items-center gap-1.5">
          <Sparkles size={14} className="text-[#7B61FF]" />
          <span>Automated battery telemetry alerts trigger instantly when any device drops below 15%.</span>
        </span>
        {stats.criticalBelow15Count > 0 && (
          <span className="font-black text-rose-400 mt-1.5 sm:mt-0 flex items-center gap-1">
            <AlertTriangle size={12} className="animate-bounce" />
            <span>{stats.criticalBelow15Count} critical replacement{stats.criticalBelow15Count > 1 ? 's' : ''} needed</span>
          </span>
        )}
      </div>

    </motion.div>
  );
}
