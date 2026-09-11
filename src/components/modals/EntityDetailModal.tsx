import React, { useState, useMemo, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Copy,
  Check,
  Info,
  SlidersHorizontal,
  Lightbulb,
  Thermometer,
  SpeakerHigh,
  AppWindow,
  Plug,
  Pulse,
  Fan,
  Lock,
  Broom,
  VideoCamera,
  Cpu,
  Clock,
  MapPin,
  Buildings,
  Tag,
  MagnifyingGlass,
  Warning,
  PencilSimple
} from '@phosphor-icons/react';
import { useEntityPopup } from '../../contexts/EntityPopupContext';
import { useUserConfig } from '../../contexts/ConfigContext';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { HAEntity } from '../../types';
import { formatRelativeTime } from '../../lib/utils';
import DynamicPhosphorIcon from '../ui/DynamicPhosphorIcon';
import EntityCustomizerModal from './EntityCustomizerModal';
import LightControlView from './entity-controls/LightControlView';
import ClimateControlView from './entity-controls/ClimateControlView';
import MediaPlayerControlView from './entity-controls/MediaPlayerControlView';
import CoverControlView from './entity-controls/CoverControlView';
import SwitchControlView from './entity-controls/SwitchControlView';
import SensorHistoryView from './entity-controls/SensorHistoryView';
import VacuumControlView from './entity-controls/VacuumControlView';
import LockControlView from './entity-controls/LockControlView';
import FanControlView from './entity-controls/FanControlView';
import CameraControlView from './entity-controls/CameraControlView';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ControlErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[EntityDetailModal] Control view error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export default function EntityDetailModal() {
  const { isOpen, selectedEntityId, closeEntityDetails } = useEntityPopup();
  const { config } = useUserConfig();
  const darkMode = config?.theme?.mode !== 'light';
  const { states, entityRegistry, devices, areas, floors } = useAutoLayoutStore();

  const [copied, setCopied] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [attributeFilter, setAttributeFilter] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [customizerOpen, setCustomizerOpen] = useState(false);

  // Track window resize to switch modal vs bottom drawer mode on mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeEntityDetails();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeEntityDetails]);

  // Fallback entity if states not yet hydrated
  const entity: HAEntity | null = useMemo(() => {
    if (!selectedEntityId) return null;
    if (states && states[selectedEntityId]) {
      return states[selectedEntityId] as unknown as HAEntity;
    }
    return {
      entity_id: selectedEntityId,
      state: 'unknown',
      attributes: { friendly_name: selectedEntityId }
    };
  }, [selectedEntityId, states]);

  const domain = selectedEntityId ? selectedEntityId.split('.')[0] : 'sensor';

  // Safe Metadata resolution
  const metadata = useMemo(() => {
    if (!selectedEntityId) return null;

    const regList = Array.isArray(entityRegistry) ? entityRegistry : [];
    const devList = Array.isArray(devices) ? devices : [];
    const areaList = Array.isArray(areas) ? areas : [];
    const floorList = Array.isArray(floors) ? floors : [];

    const regEntry = regList.find((e) => e.entity_id === selectedEntityId);
    const deviceId = regEntry?.device_id;
    const areaId = regEntry?.area_id;

    const matchedDevice = deviceId ? devList.find((d) => d.id === deviceId) : null;
    const resolvedAreaId = areaId || matchedDevice?.area_id;
    const matchedArea = resolvedAreaId
      ? areaList.find((a) => a.area_id === resolvedAreaId)
      : null;
    const floorId = matchedArea?.floor_id;
    const matchedFloor = floorId
      ? floorList.find((f) => f.floor_id === floorId)
      : null;

    return {
      entityId: selectedEntityId,
      deviceName: matchedDevice?.name_by_user || matchedDevice?.name || null,
      manufacturer: matchedDevice?.manufacturer || null,
      model: matchedDevice?.model || null,
      areaName: matchedArea?.name || 'Unassigned Area',
      floorName: matchedFloor?.name || null
    };
  }, [selectedEntityId, entityRegistry, devices, areas, floors]);

  const handleCopyEntityId = () => {
    if (selectedEntityId) {
      try {
        navigator.clipboard.writeText(selectedEntityId);
      } catch {
        // Fallback copy
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Domain visual styling and icons
  const domainTheme = useMemo(() => {
    switch (domain) {
      case 'light':
        return {
          icon: Lightbulb,
          color: darkMode ? 'text-amber-400' : 'text-amber-500',
          badgeBg: darkMode ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'bg-amber-100/80 border-amber-300/70 text-amber-600',
          glow: darkMode ? 'drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]' : ''
        };
      case 'climate':
        return {
          icon: Thermometer,
          color: darkMode ? 'text-orange-400' : 'text-orange-500',
          badgeBg: darkMode ? 'bg-orange-500/15 border-orange-500/30 text-orange-300' : 'bg-orange-100/80 border-orange-300/70 text-orange-600',
          glow: darkMode ? 'drop-shadow-[0_0_12px_rgba(249,115,22,0.6)]' : ''
        };
      case 'media_player':
        return {
          icon: SpeakerHigh,
          color: darkMode ? 'text-purple-400' : 'text-purple-600',
          badgeBg: darkMode ? 'bg-purple-500/15 border-purple-500/30 text-purple-300' : 'bg-purple-100/80 border-purple-300/70 text-purple-600',
          glow: darkMode ? 'drop-shadow-[0_0_12px_rgba(168,85,247,0.6)]' : ''
        };
      case 'cover':
        return {
          icon: AppWindow,
          color: darkMode ? 'text-indigo-400' : 'text-indigo-600',
          badgeBg: darkMode ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300' : 'bg-indigo-100/80 border-indigo-300/70 text-indigo-600',
          glow: darkMode ? 'drop-shadow-[0_0_12px_rgba(99,102,241,0.6)]' : ''
        };
      case 'switch':
      case 'outlet':
      case 'input_boolean':
        return {
          icon: Plug,
          color: darkMode ? 'text-emerald-400' : 'text-emerald-600',
          badgeBg: darkMode ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-emerald-100/80 border-emerald-300/70 text-emerald-600',
          glow: darkMode ? 'drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]' : ''
        };
      case 'fan':
        return {
          icon: Fan,
          color: darkMode ? 'text-cyan-400' : 'text-cyan-600',
          badgeBg: darkMode ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300' : 'bg-cyan-100/80 border-cyan-300/70 text-cyan-600',
          glow: darkMode ? 'drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]' : ''
        };
      case 'lock':
        return {
          icon: Lock,
          color: darkMode ? 'text-emerald-400' : 'text-emerald-600',
          badgeBg: darkMode ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-emerald-100/80 border-emerald-300/70 text-emerald-600',
          glow: darkMode ? 'drop-shadow-[0_0_12px_rgba(52,211,153,0.6)]' : ''
        };
      case 'vacuum':
        return {
          icon: Broom,
          color: darkMode ? 'text-teal-400' : 'text-teal-600',
          badgeBg: darkMode ? 'bg-teal-500/15 border-teal-500/30 text-teal-300' : 'bg-teal-100/80 border-teal-300/70 text-teal-600',
          glow: darkMode ? 'drop-shadow-[0_0_12px_rgba(45,212,191,0.6)]' : ''
        };
      case 'camera':
        return {
          icon: VideoCamera,
          color: darkMode ? 'text-blue-400' : 'text-blue-600',
          badgeBg: darkMode ? 'bg-blue-500/15 border-blue-500/30 text-blue-300' : 'bg-blue-100/80 border-blue-300/70 text-blue-600',
          glow: darkMode ? 'drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]' : ''
        };
      default:
        return {
          icon: Pulse,
          color: darkMode ? 'text-cyan-400' : 'text-cyan-600',
          badgeBg: darkMode ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300' : 'bg-cyan-100/80 border-cyan-300/70 text-cyan-600',
          glow: darkMode ? 'drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]' : ''
        };
    }
  }, [domain, darkMode]);

  const HeaderIcon = domainTheme.icon;

  // Filtered raw attributes - REMOVING friendly_name since it's already shown in title
  const rawAttributes = useMemo(() => {
    if (!entity?.attributes) return [];
    // Exclude redundant attributes (friendly_name is already in the header title)
    const entries = Object.entries(entity.attributes).filter(
      ([k]) => k !== 'friendly_name'
    );
    if (!attributeFilter.trim()) return entries;
    const q = attributeFilter.toLowerCase();
    return entries.filter(
      ([k, v]) => k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q)
    );
  }, [entity?.attributes, attributeFilter]);

  const entityTitle = entity?.attributes?.friendly_name || selectedEntityId;

  return (
    <AnimatePresence>
      {isOpen && entity && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Translucent Backdrop: Crystal / Apple HIG 4px blur filter & gentle scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={closeEntityDetails}
            className={`fixed inset-0 backdrop-blur-sm transition-opacity cursor-pointer ${
              darkMode ? 'bg-black/50' : 'bg-black/25'
            }`}
          />

          {/* Sidebar Drawer Container: Exact Health page outer container tokens */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10 pointer-events-none z-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320, mass: 0.8 }}
              className={`pointer-events-auto w-screen max-w-full sm:max-w-xl md:max-w-2xl h-screen flex flex-col justify-between overflow-hidden backdrop-blur-xl transition-all relative ${
                darkMode
                  ? 'bg-black/20 text-slate-100 border-l border-white/5 shadow-2xl shadow-black/50'
                  : 'bg-white/20 text-slate-900 border-l border-slate-200/50 shadow-2xl'
              }`}
            >
              {/* Top Mobile Grab Handle */}
              <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0" aria-hidden="true">
                <div className={`w-10 h-1 rounded-full ${darkMode ? 'bg-white/20' : 'bg-black/20'}`} />
              </div>

              {/* Ambient Top Gradient Glow (matching Health page accent) */}
              <div
                className="absolute top-0 left-0 right-0 h-36 pointer-events-none -z-1 opacity-50"
                style={{
                  background: darkMode
                    ? `linear-gradient(to bottom, ${domain === 'climate' ? '#f59e0b15' : domain === 'fan' ? '#06b6d415' : '#38bdf815'}, transparent)`
                    : `linear-gradient(to bottom, ${domain === 'climate' ? '#f59e0b10' : domain === 'fan' ? '#06b6d410' : '#38bdf810'}, transparent)`
                }}
              />

              {/* Header matching Health page section style */}
              <div className="p-5 sm:p-6 border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between bg-gradient-to-r from-primary-500/5 to-transparent shrink-0">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md transition-transform hover:scale-105 border ${domainTheme.badgeBg}`}
                  >
                    {(entity as any)?.icon || entity?.attributes?.icon ? (
                      <DynamicPhosphorIcon
                        name={(entity as any)?.icon || entity?.attributes?.icon}
                        size={24}
                        weight="duotone"
                        className={domainTheme.color}
                      />
                    ) : (
                      <HeaderIcon size={24} weight="duotone" className={domainTheme.color} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
                        {entityTitle}
                      </h2>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider border ${domainTheme.badgeBg}`}
                      >
                        {entity.state}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                      <MapPin size={13} weight="bold" className="shrink-0" />
                      <span className="truncate">{metadata?.areaName || 'Unassigned Area'}</span>
                      {metadata?.floorName && (
                        <>
                          <span>•</span>
                          <span className="truncate">{metadata.floorName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCustomizerOpen(true)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    title="Customize entity"
                  >
                    <PencilSimple size={16} weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={closeEntityDetails}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    aria-label="Close drawer"
                  >
                    <X size={18} weight="bold" />
                  </button>
                </div>
              </div>

              {/* Scrollable Content Body */}
              <div
                className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin ${
                  darkMode ? 'scrollbar-thumb-white/10' : 'scrollbar-thumb-slate-200'
                }`}
              >
              {/* Domain-Specific Interactive Control View with Error Boundary */}
              <ControlErrorBoundary
                fallback={
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-center gap-2.5">
                    <Warning size={20} weight="fill" className="shrink-0 text-amber-500" />
                    <span>Control panel encountered an unexpected state. Use the diagnostics below.</span>
                  </div>
                }
              >
                {domain === 'light' ? (
                  <LightControlView entity={entity} darkMode={darkMode} />
                ) : domain === 'climate' ? (
                  <ClimateControlView entity={entity} darkMode={darkMode} />
                ) : domain === 'media_player' ? (
                  <MediaPlayerControlView entity={entity} darkMode={darkMode} />
                ) : domain === 'cover' ? (
                  <CoverControlView entity={entity} darkMode={darkMode} />
                ) : domain === 'lock' ? (
                  <LockControlView entity={entity} darkMode={darkMode} />
                ) : domain === 'fan' ? (
                  <FanControlView entity={entity} darkMode={darkMode} />
                ) : domain === 'camera' ? (
                  <CameraControlView entity={entity} />
                ) : domain === 'vacuum' ? (
                  <VacuumControlView entity={entity} darkMode={darkMode} />
                ) : domain === 'switch' || domain === 'outlet' || domain === 'input_boolean' ? (
                  <SwitchControlView entity={entity} darkMode={darkMode} />
                ) : (
                  <SensorHistoryView entity={entity} darkMode={darkMode} />
                )}
              </ControlErrorBoundary>

              {/* Diagnostic & Technical Attributes Accordion */}
              <div className={`pt-2 border-t ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setShowDiagnostics(!showDiagnostics)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                    darkMode
                      ? 'bg-slate-800/40 hover:bg-slate-800/70 border-white/10 text-slate-300'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={15} weight="duotone" className="text-cyan-500" />
                    <span>Device Information & Attributes</span>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-500 font-bold">
                    {showDiagnostics ? 'Hide ▲' : 'Show ▼'}
                  </span>
                </button>

                <AnimatePresence>
                  {showDiagnostics && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden space-y-3 pt-3"
                    >
                      {/* Metadata Summary */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div
                          className={`p-3 rounded-2xl border space-y-0.5 ${
                            darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200/80 shadow-xs'
                          }`}
                        >
                          <div className={`flex items-center gap-1 text-[10px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            <Tag size={12} weight="bold" />
                            <span>Entity ID</span>
                          </div>
                          <div className={`font-mono text-[11px] truncate select-all font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`} title={selectedEntityId || ''}>
                            {selectedEntityId}
                          </div>
                        </div>

                        <div
                          className={`p-3 rounded-2xl border space-y-0.5 ${
                            darkMode ? 'bg-white/5 border-white/10' : 'bg-white/50 border-black/5 shadow-xs'
                          }`}
                        >
                          <div className={`flex items-center gap-1 text-[10px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            <Cpu size={12} weight="bold" />
                            <span>Hardware Device</span>
                          </div>
                          <div className={`font-semibold text-xs truncate ${darkMode ? 'text-white' : 'text-slate-900'}`} title={metadata?.deviceName || 'Virtual'}>
                            {metadata?.deviceName || 'Virtual / Template'}
                          </div>
                        </div>

                        <div
                          className={`p-3 rounded-2xl border space-y-0.5 ${
                            darkMode ? 'bg-white/5 border-white/10' : 'bg-white/50 border-black/5 shadow-xs'
                          }`}
                        >
                          <div className={`flex items-center gap-1 text-[10px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            <Buildings size={12} weight="bold" />
                            <span>Manufacturer</span>
                          </div>
                          <div className={`text-xs truncate font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                            {metadata?.manufacturer || 'Generic'}
                          </div>
                        </div>

                        <div
                          className={`p-3 rounded-2xl border space-y-0.5 ${
                            darkMode ? 'bg-white/5 border-white/10' : 'bg-white/50 border-black/5 shadow-xs'
                          }`}
                        >
                          <div className={`flex items-center gap-1 text-[10px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            <Clock size={12} weight="bold" />
                            <span>Last Changed</span>
                          </div>
                          <div className={`text-xs truncate font-mono font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                            {formatRelativeTime(entity.last_changed || entity.last_updated)}
                          </div>
                        </div>
                      </div>

                      {/* Raw Attributes Filter & Table */}
                      <div className="space-y-1.5">
                        <div className="relative">
                          <MagnifyingGlass
                            size={14}
                            weight="bold"
                            className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
                          />
                          <input
                            type="text"
                            placeholder="Filter attributes..."
                            value={attributeFilter}
                            onChange={(e) => setAttributeFilter(e.target.value)}
                            className={`w-full pl-8 pr-3 py-2 rounded-xl border text-xs placeholder:text-slate-400 focus:outline-hidden focus:border-cyan-400 font-mono transition-all ${
                              darkMode
                                ? 'bg-slate-800/80 border-white/10 text-white placeholder:text-slate-500'
                                : 'bg-white/60 border-black/5 text-slate-900 placeholder:text-slate-400'
                            }`}
                          />
                        </div>

                        {/* Raw Attributes Table (without friendly_name) */}
                        <div
                          className={`max-h-40 overflow-y-auto rounded-xl border p-1.5 space-y-0.5 font-mono text-[10px] scrollbar-thin ${
                            darkMode
                              ? 'border-white/10 bg-slate-950/60 scrollbar-thumb-white/10'
                              : 'border-black/5 bg-white/40 scrollbar-thumb-slate-300'
                          }`}
                        >
                          {rawAttributes.length === 0 ? (
                            <div className="p-2.5 text-center text-slate-400 text-xs font-sans">
                              No attributes matching filter.
                            </div>
                          ) : (
                            rawAttributes.map(([key, val]) => (
                              <div
                                key={key}
                                className={`flex items-start justify-between gap-2 p-1.5 rounded-lg transition-colors ${
                                  darkMode ? 'hover:bg-white/5' : 'hover:bg-black/[0.03]'
                                }`}
                              >
                                <span className={`font-bold shrink-0 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{key}:</span>
                                <span className={`text-right truncate max-w-56 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`} title={typeof val === 'object' ? JSON.stringify(val) : String(val)}>
                                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Sticky Drawer Footer matching Health page outer container tokens */}
            <div className="p-4 sm:p-5 border-t border-slate-200/50 dark:border-white/5 bg-white/20 dark:bg-black/20 backdrop-blur-xl flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <SlidersHorizontal size={14} weight="duotone" />
                <span>{showDiagnostics ? 'Hide Technical Info' : 'Technical Info'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyEntityId}
                  className="h-10 px-3.5 rounded-xl border border-black/5 dark:border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="Copy Entity ID"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span className="font-mono text-[11px]">{copied ? 'Copied' : selectedEntityId.split('.')[1] || 'Entity ID'}</span>
                </button>
                <button
                  type="button"
                  onClick={closeEntityDetails}
                  className="h-10 px-6 rounded-xl font-bold text-xs uppercase tracking-wider bg-white/10 hover:bg-white/15 dark:text-white transition-all cursor-pointer active:scale-95"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    )}

      {/* Entity Customizer Modal with Phosphor Icon Finder */}
      <EntityCustomizerModal
        isOpen={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        entityId={selectedEntityId}
        defaultName={entity?.attributes?.friendly_name || selectedEntityId || ''}
        defaultIcon={(entity as any)?.icon || entity?.attributes?.icon || ''}
        domain={domain}
        areaName={metadata?.areaName}
        floorName={metadata?.floorName}
      />
    </AnimatePresence>
  );
}
