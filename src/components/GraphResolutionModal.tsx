/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Network,
  Layers,
  Cpu,
  Boxes,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Eye,
  EyeOff,
  Filter,
  Search,
  ArrowRight,
  Database,
  RefreshCw,
  Sliders,
  Shield,
  Wifi,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';
import { ResolutionSource } from '../types';

interface GraphResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
}

export default function GraphResolutionModal({ isOpen, onClose, darkMode }: GraphResolutionModalProps) {
  const {
    areas,
    devices,
    floors,
    resolvedEntities,
    resolvedAreas,
    resolvedFloors,
    unassignedEntities,
    metrics,
    reassignEntityArea,
    recomputeGraph,
    isLiveMode,
    setLiveMode,
    serverUrl,
    haToken
  } = useAutoLayoutStore();

  const [activeTab, setActiveTab] = useState<'graph' | 'registries' | 'connection'>('graph');
  const [sourceFilter, setSourceFilter] = useState<'all' | ResolutionSource | 'diagnostic'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  // Connection settings state
  const [inputUrl, setInputUrl] = useState(serverUrl);
  const [inputToken, setInputToken] = useState(haToken);
  const [showToken, setShowToken] = useState(false);

  if (!isOpen) return null;

  const entityList = Object.values(resolvedEntities);
  const filteredEntities = entityList.filter(e => {
    if (sourceFilter === 'diagnostic') {
      if (!e.isDiagnostic) return false;
    } else if (sourceFilter !== 'all') {
      if (e.resolutionSource !== sourceFilter) return false;
    }

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return (
        e.entity_id.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        e.domain.toLowerCase().includes(q) ||
        (e.area?.name && e.area.name.toLowerCase().includes(q)) ||
        (e.device?.name && e.device.name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const selectedEntity = selectedEntityId ? resolvedEntities[selectedEntityId] : null;

  const handleConnectLive = (e: React.FormEvent) => {
    e.preventDefault();
    setLiveMode(true, inputUrl, inputToken);
  };

  const handleResetDemo = () => {
    setLiveMode(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto backdrop-blur-md bg-black/60">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className={`w-full max-w-6xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden backdrop-blur-2xl transition-all ${
            darkMode ? 'bg-slate-900/95 border-white/[0.12] text-white shadow-black/70' : 'bg-white/95 border-black/[0.08] text-slate-900 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8)]'
          }`}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7B61FF] to-indigo-500 text-white flex items-center justify-center shadow-md shadow-[#7B61FF]/25">
                <Network size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black tracking-tight">
                    Automatic HA Graph Resolution Engine
                  </h3>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    Zero YAML Required
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  Dynamic entity-to-area topology ingestion, device inheritance, and floor resolution.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className={`p-2 rounded-2xl transition-colors cursor-pointer ${
                  darkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Metric Badges Ribbon */}
          {metrics && (
            <div className={`px-6 py-3 border-b flex flex-wrap items-center gap-4 text-xs font-semibold ${
              darkMode ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-center gap-1.5">
                <Layers size={14} className="text-[#7B61FF]" />
                <span>{metrics.totalFloors} Floors</span>
              </div>
              <span className="text-slate-500">•</span>
              <div className="flex items-center gap-1.5">
                <Boxes size={14} className="text-indigo-400" />
                <span>{metrics.totalAreas} Areas</span>
              </div>
              <span className="text-slate-500">•</span>
              <div className="flex items-center gap-1.5">
                <Cpu size={14} className="text-blue-400" />
                <span>{metrics.totalDevices} Devices</span>
              </div>
              <span className="text-slate-500">•</span>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span className="text-emerald-500 font-bold">{metrics.resolvedDirectCount} Direct Match</span>
              </div>
              <span className="text-slate-500">•</span>
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" />
                <span className="text-amber-500 font-bold">{metrics.resolvedInheritedCount} Inherited via Device</span>
              </div>
              <span className="text-slate-500">•</span>
              <div className="flex items-center gap-1.5">
                <HelpCircle size={14} className="text-slate-400" />
                <span className="text-slate-400">{metrics.unassignedEntitiesCount} Unassigned Pool</span>
              </div>
            </div>
          )}

          {/* Sub-Navigation Tabs */}
          <div className="px-6 pt-4 flex items-center gap-2 border-b border-slate-200/50 dark:border-slate-800/80">
            {[
              { id: 'graph', label: 'Entity Resolution Tree', icon: Network },
              { id: 'registries', label: 'Raw HA Registries', icon: Database },
              { id: 'connection', label: 'HA WebSocket Endpoint', icon: Wifi }
            ].map(tab => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2.5 rounded-t-2xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all border-b-2 ${
                    isSelected
                      ? 'border-[#7B61FF] text-[#7B61FF] bg-[#7B61FF]/10'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            {/* TAB 1: GRAPH RESOLUTION EXPLORER */}
            {activeTab === 'graph' && (
              <div className="space-y-6">
                {/* Search & Filter Toolbar */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="relative w-full md:w-80">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={e => setSearchFilter(e.target.value)}
                      placeholder="Search entities, areas, devices..."
                      className={`w-full pl-10 pr-4 py-2 rounded-2xl text-xs outline-none border transition-all ${
                        darkMode ? 'bg-slate-950/70 border-slate-800 text-white focus:border-[#7B61FF]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#7B61FF]'
                      }`}
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
                    {[
                      { id: 'all', label: `All (${entityList.length})` },
                      { id: 'direct_entity_area', label: 'Direct Area Match' },
                      { id: 'inherited_device_area', label: 'Device Inherited' },
                      { id: 'unassigned', label: 'Unassigned' },
                      { id: 'diagnostic', label: 'Diagnostics' }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setSourceFilter(f.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                          sourceFilter === f.id
                            ? 'bg-[#7B61FF] text-white border-[#7B61FF]'
                            : darkMode
                              ? 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table of Resolved Graph */}
                <div className={`rounded-2xl border overflow-hidden ${
                  darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className={`border-b font-extrabold uppercase tracking-wider text-[10px] ${
                        darkMode ? 'bg-slate-900/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}>
                        <tr>
                          <th className="p-3.5">Entity & Domain</th>
                          <th className="p-3.5">Assigned Area</th>
                          <th className="p-3.5">Floor Level</th>
                          <th className="p-3.5">Hardware Device</th>
                          <th className="p-3.5">Resolution Logic</th>
                          <th className="p-3.5">Live State</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/80 font-medium">
                        {filteredEntities.slice(0, 50).map(ent => (
                          <tr
                            key={ent.entity_id}
                            className={`transition-colors ${
                              selectedEntityId === ent.entity_id
                                ? darkMode ? 'bg-[#7B61FF]/15' : 'bg-indigo-50'
                                : darkMode ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="p-3.5">
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-100 block truncate max-w-[200px]">
                                  {ent.name}
                                </span>
                                <span className="font-mono text-[10px] text-slate-400 block truncate">
                                  {ent.entity_id}
                                </span>
                              </div>
                            </td>

                            <td className="p-3.5">
                              {ent.area ? (
                                <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-[#7B61FF]" />
                                  <span>{ent.area.name}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Unassigned</span>
                              )}
                            </td>

                            <td className="p-3.5">
                              {ent.floor ? (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  {ent.floor.name}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            <td className="p-3.5">
                              {ent.device ? (
                                <div>
                                  <span className="font-semibold block truncate max-w-[150px]">
                                    {ent.device.name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block">
                                    {ent.device.manufacturer || 'Generic'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400">Virtual / Direct</span>
                              )}
                            </td>

                            <td className="p-3.5">
                              {ent.resolutionSource === 'direct_entity_area' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                  Direct match (entity.area_id)
                                </span>
                              )}
                              {ent.resolutionSource === 'inherited_device_area' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                  Inherited (device.area_id)
                                </span>
                              )}
                              {ent.resolutionSource === 'unassigned' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-500 border border-slate-500/30">
                                  Unassigned Pool
                                </span>
                              )}
                              {ent.isDiagnostic && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-400 ml-1">
                                  Diagnostic
                                </span>
                              )}
                            </td>

                            <td className="p-3.5">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                                ent.state === 'on' || ent.state === 'playing' || ent.state === 'cleaning' || ent.state === 'locked'
                                  ? 'bg-emerald-500/20 text-emerald-500'
                                  : ent.state === 'off'
                                    ? 'bg-slate-500/20 text-slate-400'
                                    : 'bg-[#7B61FF]/20 text-[#7B61FF] dark:text-[#9D8BFF]'
                              }`}>
                                {ent.state}
                              </span>
                            </td>

                            <td className="p-3.5 text-right">
                              <select
                                value={ent.area_id || ''}
                                onChange={e => reassignEntityArea(ent.entity_id, e.target.value || null)}
                                className={`text-[11px] font-bold px-2 py-1 rounded-xl border outline-none cursor-pointer ${
                                  darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-700'
                                }`}
                              >
                                <option value="">Unassigned</option>
                                {areas.map(a => (
                                  <option key={a.area_id} value={a.area_id}>
                                    {a.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: RAW HA REGISTRIES */}
            {activeTab === 'registries' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Area Registry */}
                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        1. Area Registry ({areas.length} Areas)
                      </h4>
                      <span className="text-[10px] font-mono text-indigo-400">config/area_registry/list</span>
                    </div>
                    <pre className="text-[11px] font-mono p-3 rounded-xl bg-slate-950 text-slate-300 overflow-x-auto max-h-52 border border-slate-800">
                      {JSON.stringify(areas, null, 2)}
                    </pre>
                  </div>

                  {/* Device Registry */}
                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        2. Device Registry ({devices.length} Devices)
                      </h4>
                      <span className="text-[10px] font-mono text-indigo-400">config/device_registry/list</span>
                    </div>
                    <pre className="text-[11px] font-mono p-3 rounded-xl bg-slate-950 text-slate-300 overflow-x-auto max-h-52 border border-slate-800">
                      {JSON.stringify(devices, null, 2)}
                    </pre>
                  </div>

                  {/* Floor Registry */}
                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        3. Floor Registry ({floors.length} Floors)
                      </h4>
                      <span className="text-[10px] font-mono text-indigo-400">config/floor_registry/list</span>
                    </div>
                    <pre className="text-[11px] font-mono p-3 rounded-xl bg-slate-950 text-slate-300 overflow-x-auto max-h-52 border border-slate-800">
                      {JSON.stringify(floors, null, 2)}
                    </pre>
                  </div>

                  {/* Entity Registry Snapshot */}
                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        4. Entity Registry Snapshot
                      </h4>
                      <span className="text-[10px] font-mono text-indigo-400">config/entity_registry/list</span>
                    </div>
                    <pre className="text-[11px] font-mono p-3 rounded-xl bg-slate-950 text-slate-300 overflow-x-auto max-h-52 border border-slate-800">
                      {JSON.stringify(Object.values(resolvedEntities).slice(0, 5), null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CONNECTION CONFIG */}
            {activeTab === 'connection' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className={`p-6 rounded-3xl border ${
                  darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-[#7B61FF] flex items-center justify-center">
                      <Wifi size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold">Connect to Live Home Assistant Instance</h4>
                      <p className="text-xs text-slate-400">
                        Enter your Home Assistant WebSocket API endpoint and Long-Lived Access Token.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleConnectLive} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Home Assistant WebSocket URL
                      </label>
                      <input
                        type="text"
                        value={inputUrl}
                        onChange={e => setInputUrl(e.target.value)}
                        placeholder="wss://homeassistant.local:8123/api/websocket"
                        className={`w-full px-4 py-2.5 rounded-2xl text-xs font-mono border outline-none ${
                          darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Long-Lived Access Token (Bearer)
                      </label>
                      <div className="relative">
                        <input
                          type={showToken ? 'text' : 'password'}
                          value={inputToken}
                          onChange={e => setInputToken(e.target.value)}
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                          className={`w-full pl-4 pr-10 py-2.5 rounded-2xl text-xs font-mono border outline-none ${
                            darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowToken(!showToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        >
                          {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleResetDemo}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                          !isLiveMode
                            ? 'bg-emerald-500 text-white border-emerald-400'
                            : darkMode ? 'bg-slate-900 text-slate-300 border-slate-700' : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {!isLiveMode ? '✓ Demo Mode Active' : 'Switch to Demo Mode'}
                      </button>

                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-2xl text-xs font-extrabold bg-[#7B61FF] hover:bg-[#684be3] text-white shadow-md transition-all cursor-pointer"
                      >
                        Connect & Re-Ingest Registries
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
