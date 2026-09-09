/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Slide-over detail drawer for Integrations, HACS components, and Add-ons.
 * Provides in-depth device and entity inspection, live reloading,
 * update changelogs, and official documentation links.
 */

import React, { useState, useMemo } from 'react';
import { 
  X, 
  ArrowSquareOut, 
  ArrowsClockwise, 
  Cpu, 
  HardDrives, 
  Lightning, 
  Check, 
  Warning, 
  DownloadSimple, 
  GitFork,
  SlidersHorizontal,
  MagnifyingGlass,
  Info,
  ShieldCheck,
  House,
  ToggleLeft,
  ToggleRight,
  Power
} from '@phosphor-icons/react';
import { IntegrationItem } from '../../types/integrations';
import IntegrationIcon from '../notifications/IntegrationIcon';
import { integrationsService } from '../../services/integrationsService';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { ResolvedEntity, HADevice } from '../../types';

interface IntegrationDetailDrawerProps {
  integration: IntegrationItem | null;
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

type DetailTab = 'overview' | 'devices' | 'entities';

export default function IntegrationDetailDrawer({
  integration,
  isOpen,
  onClose,
  darkMode = true
}: IntegrationDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [deviceSearch, setDeviceSearch] = useState('');
  const [entitySearch, setEntitySearch] = useState('');
  const [isReloading, setIsReloading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [reloadSuccess, setReloadSuccess] = useState<boolean | null>(null);

  const rawAreas = useAutoLayoutStore(s => s.rawAreas);
  const updateEntityState = useAutoLayoutStore(s => s.updateEntityState);
  const callHAService = useAutoLayoutStore(s => s.callHAService);

  const areasMap = useMemo(() => {
    const map: Record<string, string> = {};
    (rawAreas || []).forEach(a => {
      map[a.area_id] = a.name;
    });
    return map;
  }, [rawAreas]);

  if (!isOpen || !integration) return null;

  // Filtered devices
  const filteredDevices = integration.devices.filter(d => {
    if (!deviceSearch.trim()) return true;
    const q = deviceSearch.toLowerCase();
    const name = (d.name_by_user || d.name || '').toLowerCase();
    const mfg = (d.manufacturer || '').toLowerCase();
    const model = (d.model || '').toLowerCase();
    return name.includes(q) || mfg.includes(q) || model.includes(q);
  });

  // Filtered entities
  const filteredEntities = integration.entities.filter(e => {
    if (!entitySearch.trim()) return true;
    const q = entitySearch.toLowerCase();
    const name = (e.name || e.entity_id || '').toLowerCase();
    return name.includes(q) || e.entity_id.toLowerCase().includes(q) || e.domain.includes(q);
  });

  // Handle Reload
  const handleReload = async () => {
    if (isReloading) return;
    setIsReloading(true);
    setReloadSuccess(null);
    const success = await integrationsService.reloadIntegration(
      integration.configEntryId || integration.id,
      integration.configEntryIds
    );
    setIsReloading(false);
    setReloadSuccess(success);
    setTimeout(() => setReloadSuccess(null), 3000);
  };

  // Handle Update Install
  const handleUpdate = async () => {
    if (isUpdating || !integration.updateEntityId) return;
    setIsUpdating(true);
    await integrationsService.installUpdate(integration.updateEntityId);
    setTimeout(() => setIsUpdating(false), 2000);
  };

  // Quick entity toggle
  const handleToggleEntity = async (entity: ResolvedEntity) => {
    const isCurrentlyOn = entity.state === 'on';
    const targetState = isCurrentlyOn ? 'off' : 'on';
    const domain = entity.domain;
    if (['light', 'switch', 'fan', 'input_boolean'].includes(domain)) {
      updateEntityState(entity.entity_id, targetState);
      await callHAService(domain, isCurrentlyOn ? 'turn_off' : 'turn_on', { entity_id: entity.entity_id });
    }
  };

  // Category visual badge
  const categoryConfig = {
    official: { label: 'Official Integration', bg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30' },
    hacs: { label: 'HACS Community', bg: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30' },
    addon: { label: 'Supervisor Add-on', bg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' }
  }[integration.category];

  // IoT class friendly name
  const iotClassLabels: Record<string, string> = {
    local_push: 'Local Push (Zero Latency)',
    local_polling: 'Local Polling',
    cloud_push: 'Cloud Push',
    cloud_polling: 'Cloud Polling',
    calculated: 'Internal Helper',
    assumed_state: 'Assumed State'
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn" 
      />

      {/* Drawer Panel */}
      <div className={`relative w-full max-w-xl h-full flex flex-col z-10 shadow-2xl overflow-hidden transition-transform animate-slideInRight ${
        darkMode ? 'bg-slate-900/95 text-white border-l border-white/10' : 'bg-slate-50/95 text-slate-900 border-l border-slate-200'
      }`}>
        
        {/* Header Bar */}
        <div className={`px-6 py-5 flex items-center justify-between border-b ${
          darkMode ? 'border-white/10 bg-slate-900/80' : 'border-slate-200/80 bg-white/80'
        } backdrop-blur-md`}>
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 p-2 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 shadow-sm">
              <IntegrationIcon domain={integration.iconDomain || integration.domain} size="md" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight truncate">{integration.name}</h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                domain: {integration.domain}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close integration drawer"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              darkMode ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-200/60 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Status / Category Quick Bar */}
        <div className={`px-6 py-3 flex flex-wrap items-center gap-2 border-b ${
          darkMode ? 'border-white/5 bg-slate-950/40' : 'border-slate-200/50 bg-slate-100/50'
        }`}>
          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${categoryConfig.bg}`}>
            {categoryConfig.label}
          </span>
          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
            integration.state === 'loaded' || integration.state === 'running'
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
          }`}>
            ● {integration.state.toUpperCase()}
          </span>
          {integration.version && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-500/10 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
              v{integration.version}
            </span>
          )}
          {integration.iotClass && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-500/10 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
              {iotClassLabels[integration.iotClass] || integration.iotClass}
            </span>
          )}
        </div>

        {/* Update Available Callout */}
        {integration.hasUpdate && (
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <DownloadSimple size={20} weight="bold" className="text-amber-600 dark:text-amber-300 animate-bounce" />
              </div>
              <div>
                <p className="text-xs font-black">Update Available</p>
                <p className="text-[11px] opacity-80">
                  {integration.version ? `v${integration.version}` : 'Current'} → <strong className="underline">{integration.latestVersion || 'Latest'}</strong>
                </p>
              </div>
            </div>
            {integration.updateEntityId && (
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-transform active:scale-95 shadow-sm shrink-0 flex items-center gap-1.5"
              >
                {isUpdating ? <ArrowsClockwise size={14} className="animate-spin" /> : <DownloadSimple size={14} weight="bold" />}
                <span>{isUpdating ? 'Installing...' : 'Install Update'}</span>
              </button>
            )}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-6 pt-4 flex gap-2 border-b border-slate-200/80 dark:border-white/10">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-xs font-black uppercase tracking-wider transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Info size={16} weight="bold" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('devices')}
            className={`pb-3 text-xs font-black uppercase tracking-wider transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'devices'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <HardDrives size={16} weight="bold" />
            <span>Devices ({integration.devicesCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('entities')}
            className={`pb-3 text-xs font-black uppercase tracking-wider transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'entities'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Cpu size={16} weight="bold" />
            <span>Entities ({integration.entitiesCount})</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: OVERVIEW & ACTIONS */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Description */}
              <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Description</h3>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                  {integration.description || 'No detailed description provided by integration manifest.'}
                </p>
                {integration.authors && integration.authors.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-white/10 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Maintained by:</span>
                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      {integration.authors.join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleReload}
                  disabled={isReloading}
                  className={`p-3.5 rounded-2xl border flex items-center justify-center gap-2 font-bold text-xs transition-all active:scale-95 shadow-sm ${
                    reloadSuccess === true
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : reloadSuccess === false
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      : darkMode
                      ? 'bg-white/10 hover:bg-white/15 text-white border-white/10'
                      : 'bg-white hover:bg-slate-100 text-slate-900 border-slate-200'
                  }`}
                >
                  <ArrowsClockwise size={16} weight="bold" className={isReloading ? 'animate-spin' : ''} />
                  <span>{isReloading ? 'Reloading...' : reloadSuccess === true ? 'Reloaded!' : 'Reload Integration'}</span>
                </button>

                {integration.documentationUrl && (
                  <a
                    href={integration.documentationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-3.5 rounded-2xl border flex items-center justify-center gap-2 font-bold text-xs transition-all active:scale-95 shadow-sm ${
                      darkMode ? 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border-indigo-500/30' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                    }`}
                  >
                    <span>View Documentation</span>
                    <ArrowSquareOut size={16} weight="bold" />
                  </a>
                )}
              </div>

              {/* Metrics Breakdown Bento */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Devices</span>
                  <div className="text-2xl font-black mt-1 font-mono">{integration.devicesCount}</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Hardware units paired</p>
                </div>
                <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Entities</span>
                  <div className="text-2xl font-black mt-1 font-mono">{integration.entitiesCount}</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Telemetry endpoints</p>
                </div>
              </div>

              {/* Domain Breakdown */}
              {Object.keys(integration.domainBreakdown).length > 0 && (
                <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">Entity Type Breakdown</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(integration.domainBreakdown).map(([dom, count]) => (
                      <span key={dom} className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-500/10 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center gap-1.5">
                        <span className="font-mono text-indigo-500 dark:text-indigo-400 font-bold">{count}</span>
                        <span>{dom}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CONNECTED DEVICES */}
          {activeTab === 'devices' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="relative">
                <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter devices by name, manufacturer, model..."
                  value={deviceSearch}
                  onChange={(e) => setDeviceSearch(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border outline-none transition-all ${
                    darkMode
                      ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-indigo-500'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
                  }`}
                />
              </div>

              {filteredDevices.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  {integration.devices.length === 0 ? 'No physical devices registered to this integration.' : 'No devices match your search.'}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredDevices.map(dev => {
                    const areaName = dev.area_id ? areasMap[dev.area_id] : null;
                    return (
                      <div
                        key={dev.id}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                          darkMode ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-white border-slate-200 hover:border-slate-300'
                        } transition-colors`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold truncate">{dev.name_by_user || dev.name || 'Unnamed Device'}</h4>
                            {areaName && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-700 dark:text-slate-300">
                                {areaName}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {[dev.manufacturer, dev.model].filter(Boolean).join(' • ') || 'Hardware Device'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CONNECTED ENTITIES */}
          {activeTab === 'entities' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="relative">
                <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter entities by name, domain, ID..."
                  value={entitySearch}
                  onChange={(e) => setEntitySearch(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border outline-none transition-all ${
                    darkMode
                      ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-indigo-500'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
                  }`}
                />
              </div>

              {filteredEntities.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  {integration.entities.length === 0 ? 'No entities linked to this integration.' : 'No entities match your search.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredEntities.map(entity => {
                    const isSwitchable = ['light', 'switch', 'fan', 'input_boolean'].includes(entity.domain);
                    const isOn = entity.state === 'on';

                    return (
                      <div
                        key={entity.entity_id}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                          darkMode ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-white border-slate-200 hover:border-slate-300'
                        } transition-colors`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold truncate">{entity.name || entity.entity_id}</h4>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                              {entity.domain}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                            {entity.entity_id}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                            isOn 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                              : 'bg-slate-500/15 text-slate-400 border border-slate-200 dark:border-white/10'
                          }`}>
                            {entity.state}
                          </span>
                          {isSwitchable && (
                            <button
                              onClick={() => handleToggleEntity(entity)}
                              className={`p-1.5 rounded-xl border transition-all active:scale-95 ${
                                isOn
                                  ? 'bg-indigo-500 text-white border-indigo-600'
                                  : darkMode
                                  ? 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:text-slate-900'
                              }`}
                              title={`Toggle ${entity.name}`}
                            >
                              <Power size={14} weight="bold" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
