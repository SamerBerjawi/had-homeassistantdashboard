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
  Warning
} from '@phosphor-icons/react';
import { useEntityPopup } from '../../contexts/EntityPopupContext';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { HAEntity } from '../../types';
import { formatRelativeTime } from '../../lib/utils';
import LightControlView from './entity-controls/LightControlView';
import ClimateControlView from './entity-controls/ClimateControlView';
import MediaPlayerControlView from './entity-controls/MediaPlayerControlView';
import CoverControlView from './entity-controls/CoverControlView';
import SwitchControlView from './entity-controls/SwitchControlView';
import SensorHistoryView from './entity-controls/SensorHistoryView';
import VacuumControlView from './entity-controls/VacuumControlView';

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
  const { states, entityRegistry, devices, areas, floors } = useAutoLayoutStore();

  const [copied, setCopied] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [attributeFilter, setAttributeFilter] = useState('');
  const [isMobile, setIsMobile] = useState(false);

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
          color: 'text-amber-400',
          badgeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
          glow: 'drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]'
        };
      case 'climate':
        return {
          icon: Thermometer,
          color: 'text-orange-400',
          badgeBg: 'bg-orange-500/15 border-orange-500/30 text-orange-300',
          glow: 'drop-shadow-[0_0_12px_rgba(249,115,22,0.6)]'
        };
      case 'media_player':
        return {
          icon: SpeakerHigh,
          color: 'text-purple-400',
          badgeBg: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
          glow: 'drop-shadow-[0_0_12px_rgba(168,85,247,0.6)]'
        };
      case 'cover':
        return {
          icon: AppWindow,
          color: 'text-indigo-400',
          badgeBg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300',
          glow: 'drop-shadow-[0_0_12px_rgba(99,102,241,0.6)]'
        };
      case 'switch':
      case 'outlet':
      case 'input_boolean':
        return {
          icon: Plug,
          color: 'text-emerald-400',
          badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
          glow: 'drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]'
        };
      case 'fan':
        return {
          icon: Fan,
          color: 'text-teal-400',
          badgeBg: 'bg-teal-500/15 border-teal-500/30 text-teal-300',
          glow: 'drop-shadow-[0_0_12px_rgba(45,212,191,0.6)]'
        };
      case 'lock':
        return {
          icon: Lock,
          color: 'text-emerald-400',
          badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
          glow: 'drop-shadow-[0_0_12px_rgba(52,211,153,0.6)]'
        };
      case 'vacuum':
        return {
          icon: Broom,
          color: 'text-teal-400',
          badgeBg: 'bg-teal-500/15 border-teal-500/30 text-teal-300',
          glow: 'drop-shadow-[0_0_12px_rgba(45,212,191,0.6)]'
        };
      case 'camera':
        return {
          icon: VideoCamera,
          color: 'text-blue-400',
          badgeBg: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
          glow: 'drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]'
        };
      default:
        return {
          icon: Pulse,
          color: 'text-cyan-400',
          badgeBg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
          glow: 'drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]'
        };
    }
  }, [domain]);

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
            onClick={closeEntityDetails}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl transition-all"
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
            className="relative w-full max-w-lg max-h-[92vh] sm:max-h-[85vh] flex flex-col bg-slate-900/95 border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl backdrop-blur-2xl text-slate-100 overflow-hidden isolate z-10"
          >
            {/* Mobile Drag Handle */}
            {isMobile && (
              <div className="w-full flex items-center justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
                <div className="w-12 h-1 rounded-full bg-white/25" />
              </div>
            )}

            {/* Top Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 ${domainTheme.badgeBg}`}
                >
                  <HeaderIcon size={22} weight="duotone" className={`${domainTheme.color} ${domainTheme.glow}`} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-white truncate leading-snug">
                    {entityTitle}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
                    <MapPin size={12} weight="bold" className="text-slate-400 shrink-0" />
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
                  onClick={handleCopyEntityId}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/10 active:scale-95"
                  title={copied ? 'Copied Entity ID!' : 'Copy Entity ID'}
                >
                  {copied ? <Check size={15} weight="bold" className="text-emerald-400" /> : <Copy size={15} weight="duotone" />}
                </button>

                <button
                  type="button"
                  onClick={() => setShowDiagnostics(!showDiagnostics)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer border active:scale-95 ${
                    showDiagnostics
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
                  }`}
                  title="Toggle Detailed Attributes"
                >
                  <Info size={15} weight="duotone" />
                </button>

                <button
                  type="button"
                  onClick={closeEntityDetails}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/10 active:scale-95 ml-1"
                  title="Close popup"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 scrollbar-thin scrollbar-thumb-white/10">
              {/* Domain-Specific Interactive Control View with Error Boundary */}
              <ControlErrorBoundary
                fallback={
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
                    <Warning size={20} weight="fill" className="shrink-0 text-amber-400" />
                    <span>Control panel encountered an unexpected state. Use the diagnostics below.</span>
                  </div>
                }
              >
                {domain === 'light' ? (
                  <LightControlView entity={entity} />
                ) : domain === 'climate' ? (
                  <ClimateControlView entity={entity} />
                ) : domain === 'media_player' ? (
                  <MediaPlayerControlView entity={entity} />
                ) : domain === 'cover' ? (
                  <CoverControlView entity={entity} />
                ) : domain === 'vacuum' ? (
                  <VacuumControlView entity={entity} />
                ) : domain === 'switch' || domain === 'outlet' || domain === 'input_boolean' ? (
                  <SwitchControlView entity={entity} />
                ) : (
                  <SensorHistoryView entity={entity} />
                )}
              </ControlErrorBoundary>

              {/* Diagnostic & Technical Attributes Accordion */}
              <div className="pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowDiagnostics(!showDiagnostics)}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-800/40 hover:bg-slate-800/70 border border-white/10 text-xs font-bold text-slate-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={15} weight="duotone" className="text-cyan-400" />
                    <span>Device Information & Attributes</span>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-400">
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
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-0.5">
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                            <Tag size={12} weight="bold" />
                            <span>Entity ID</span>
                          </div>
                          <div className="font-mono text-white text-[11px] truncate select-all" title={selectedEntityId || ''}>
                            {selectedEntityId}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-0.5">
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                            <Cpu size={12} weight="bold" />
                            <span>Hardware Device</span>
                          </div>
                          <div className="font-semibold text-white text-xs truncate" title={metadata?.deviceName || 'Virtual'}>
                            {metadata?.deviceName || 'Virtual / Template'}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-0.5">
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                            <Buildings size={12} weight="bold" />
                            <span>Manufacturer</span>
                          </div>
                          <div className="text-slate-200 text-xs truncate">
                            {metadata?.manufacturer || 'Generic'}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-0.5">
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                            <Clock size={12} weight="bold" />
                            <span>Last Changed</span>
                          </div>
                          <div className="text-slate-200 text-xs truncate font-mono">
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
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            type="text"
                            placeholder="Filter attributes..."
                            value={attributeFilter}
                            onChange={(e) => setAttributeFilter(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-800/80 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-cyan-400/60 transition-all font-mono"
                          />
                        </div>

                        {/* Raw Attributes Table (without friendly_name) */}
                        <div className="max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/60 p-1.5 space-y-0.5 font-mono text-[10px] scrollbar-thin scrollbar-thumb-white/10">
                          {rawAttributes.length === 0 ? (
                            <div className="p-2.5 text-center text-slate-500 text-xs font-sans">
                              No attributes matching filter.
                            </div>
                          ) : (
                            rawAttributes.map(([key, val]) => (
                              <div
                                key={key}
                                className="flex items-start justify-between gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                              >
                                <span className="text-cyan-400 font-bold shrink-0">{key}:</span>
                                <span className="text-slate-300 text-right truncate max-w-56" title={typeof val === 'object' ? JSON.stringify(val) : String(val)}>
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
    </AnimatePresence>
  );
}
