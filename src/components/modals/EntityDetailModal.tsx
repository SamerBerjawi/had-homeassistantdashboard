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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Glassmorphic Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeEntityDetails}
            className={`fixed inset-0 backdrop-blur-md transition-colors ${
              darkMode ? 'bg-slate-950/80' : 'bg-slate-900/40'
            }`}
          />

          {/* Modal / Mobile Bottom Drawer */}
          <motion.div
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 16 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            drag={isMobile ? 'y' : false}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 300) {
                closeEntityDetails();
              }
            }}
            className={`relative w-full max-w-lg max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl backdrop-blur-md overflow-hidden isolate z-10 transition-colors ${
              darkMode
                ? 'bg-slate-900/90 text-slate-100 border border-white/10 shadow-[4px_6px_20px_rgba(0,0,0,0.45)]'
                : 'bg-white/95 text-slate-900 border border-slate-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.15)]'
            }`}
          >
            {/* Mobile Drag Handle */}
            {isMobile && (
              <div className="w-full flex items-center justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
                <div className={`w-12 h-1 rounded-full ${darkMode ? 'bg-white/25' : 'bg-slate-300'}`} />
              </div>
            )}

            {/* Top Header */}
            <div
              className={`flex items-center justify-between px-5 py-4 border-b shrink-0 transition-colors ${
                darkMode ? 'border-white/10' : 'border-slate-100'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${domainTheme.badgeBg}`}
                >
                  {(entity as any)?.icon || entity?.attributes?.icon ? (
                    <DynamicPhosphorIcon
                      name={(entity as any)?.icon || entity?.attributes?.icon}
                      size={22}
                      weight="duotone"
                      className={`${domainTheme.color} ${domainTheme.glow}`}
                    />
                  ) : (
                    <HeaderIcon size={22} weight="duotone" className={`${domainTheme.color} ${domainTheme.glow}`} />
                  )}
                </div>
                <div className="min-w-0">
                  <h3
                    className={`text-base font-extrabold truncate leading-snug ${
                      darkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {entityTitle}
                  </h3>
                  <div
                    className={`flex items-center gap-1.5 text-xs truncate ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    <MapPin size={12} weight="bold" className="shrink-0" />
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

              {/* Header Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setCustomizerOpen(true)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer border active:scale-95 ${
                    darkMode
                      ? 'bg-white/5 hover:bg-sky-500/20 hover:text-sky-300 text-slate-300 border-white/10'
                      : 'bg-slate-100 hover:bg-sky-50 hover:text-sky-600 text-slate-600 border-slate-200/80'
                  }`}
                  title="Customize entity name, icon & visibility"
                >
                  <PencilSimple size={15} weight="bold" />
                </button>

                <button
                  type="button"
                  onClick={handleCopyEntityId}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer border active:scale-95 ${
                    darkMode
                      ? 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-200/80'
                  }`}
                  title={copied ? 'Copied Entity ID!' : 'Copy Entity ID'}
                >
                  {copied ? <Check size={15} weight="bold" className="text-emerald-500" /> : <Copy size={15} weight="duotone" />}
                </button>

                <button
                  type="button"
                  onClick={() => setShowDiagnostics(!showDiagnostics)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer border active:scale-95 ${
                    showDiagnostics
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                      : darkMode
                      ? 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-200/80'
                  }`}
                  title="Toggle Detailed Attributes"
                >
                  <Info size={15} weight="duotone" />
                </button>

                <button
                  type="button"
                  onClick={closeEntityDetails}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer border active:scale-95 ml-1 ${
                    darkMode
                      ? 'bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white border-white/10'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 border-slate-200/80'
                  }`}
                  title="Close popup"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div
              className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 scrollbar-thin ${
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
                            darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200/80 shadow-xs'
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
                            darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200/80 shadow-xs'
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
                            darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200/80 shadow-xs'
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
                                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                            }`}
                          />
                        </div>

                        {/* Raw Attributes Table (without friendly_name) */}
                        <div
                          className={`max-h-40 overflow-y-auto rounded-xl border p-1.5 space-y-0.5 font-mono text-[10px] scrollbar-thin ${
                            darkMode
                              ? 'border-white/10 bg-slate-950/60 scrollbar-thumb-white/10'
                              : 'border-slate-200 bg-slate-50 scrollbar-thumb-slate-200'
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
                                  darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-100'
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
          </motion.div>
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
