/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * IconFinderModal Component
 * Searchable, categorized modal to browse and select any of the 1,500+ Phosphor icons.
 * Features live synonym search, weight switcher, category filter pills,
 * and high-performance progressive rendering.
 * Can be rendered embedded (inside a parent modal like EntityCustomizerModal) or as a portal.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  MagnifyingGlass,
  X,
  Check,
  Sparkle,
  ArrowCounterClockwise,
  ArrowLeft,
  IconWeight
} from '@phosphor-icons/react';
import DynamicPhosphorIcon from './DynamicPhosphorIcon';
import {
  PHOSPHOR_CATEGORIES,
  searchPhosphorIcons,
  normalizePhosphorIconName
} from '../../lib/phosphorIconData';

export interface IconFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentIcon?: string | null;
  onSelectIcon: (iconName: string | null) => void;
  title?: string;
  subtitle?: string;
  accentColor?: string;
  embedded?: boolean;
}

const ICON_WEIGHTS: { id: IconWeight; label: string }[] = [
  { id: 'duotone', label: 'Duotone' },
  { id: 'regular', label: 'Regular' },
  { id: 'bold', label: 'Bold' },
  { id: 'fill', label: 'Fill' },
  { id: 'light', label: 'Light' }
];

const INITIAL_DISPLAY_COUNT = 96;
const BATCH_LOAD_COUNT = 96;

export function formatIconDisplayName(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, '$1 $2');
}

class IconErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.warn('[IconFinderModal] Error caught in icon grid:', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-2">
          <p className="text-sm text-rose-400 font-semibold">An issue occurred while rendering some icons.</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="px-3 py-1.5 text-xs rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function IconFinderModal({
  isOpen,
  onClose,
  currentIcon,
  onSelectIcon,
  title = 'Select Icon',
  subtitle = 'Search and choose from 1,500+ Phosphor icons',
  accentColor = '#0ea5e9',
  embedded = false
}: IconFinderModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('popular');
  const [selectedWeight, setSelectedWeight] = useState<IconWeight>('duotone');
  const [previewIcon, setPreviewIcon] = useState<string | null>(
    normalizePhosphorIconName(currentIcon) || null
  );
  const [displayLimit, setDisplayLimit] = useState(INITIAL_DISPLAY_COUNT);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPreviewIcon(normalizePhosphorIconName(currentIcon) || null);
      setSearchQuery('');
      setSelectedCategory('popular');
      setDisplayLimit(INITIAL_DISPLAY_COUNT);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, currentIcon]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset display limit on query or category change
  useEffect(() => {
    setDisplayLimit(INITIAL_DISPLAY_COUNT);
  }, [searchQuery, selectedCategory]);

  // Matching icons
  const matchedIcons = useMemo(() => {
    return searchPhosphorIcons(searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory]);

  const displayedIcons = useMemo(() => {
    return matchedIcons.slice(0, displayLimit);
  }, [matchedIcons, displayLimit]);

  const hasMore = displayLimit < matchedIcons.length;

  const handleApply = (iconName: string | null) => {
    onSelectIcon(iconName);
    onClose();
  };

  if (!isOpen) return null;

  // Content body (Header, Search, Categories, Grid, Footer)
  const modalContent = (
    <div className="flex flex-col h-full w-full min-h-0 overflow-hidden text-slate-900 dark:text-slate-100">
      {/* 1. Header */}
      <div className="p-3.5 sm:p-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {embedded && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-white/40 dark:bg-white/10 hover:bg-white/60 dark:hover:bg-white/20 border border-white/50 dark:border-white/10 text-slate-800 dark:text-slate-200 flex items-center gap-1 text-xs font-bold transition-all shrink-0 cursor-pointer"
              title="Back to Details"
            >
              <ArrowLeft size={16} weight="bold" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}

          <div
            className="w-10 h-10 rounded-xl sm:rounded-2xl flex items-center justify-center border shadow-xs shrink-0 transition-transform"
            style={{
              backgroundColor: `${accentColor}1a`,
              borderColor: `${accentColor}40`,
              color: accentColor
            }}
          >
            <DynamicPhosphorIcon
              name={previewIcon || 'Sparkle'}
              size={22}
              weight={selectedWeight}
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black text-slate-950 dark:text-white truncate">
              {title}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 truncate">
              {previewIcon ? `Selected: ${formatIconDisplayName(previewIcon)}` : subtitle}
            </p>
          </div>
        </div>

        {/* Weight Switcher (Desktop) & Close Button */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden md:flex items-center bg-white/30 dark:bg-white/5 border border-white/40 dark:border-white/10 rounded-xl p-0.5 text-xs font-semibold">
            {ICON_WEIGHTS.map(w => (
              <button
                key={w.id}
                type="button"
                onClick={() => setSelectedWeight(w.id)}
                className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                  selectedWeight === w.id
                    ? 'bg-sky-500 text-white font-bold shadow-xs'
                    : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/40 dark:bg-white/10 hover:bg-white/60 dark:hover:bg-white/20 border border-white/50 dark:border-white/10 text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Close"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* 2. Search Bar & Category Controls */}
      <div className="p-3.5 sm:p-4 pb-2.5 border-b border-black/10 dark:border-white/10 space-y-2.5 shrink-0">
        {/* Search Input */}
        <div className="relative flex items-center">
          <MagnifyingGlass
            size={17}
            weight="bold"
            className="absolute left-3.5 text-slate-500 dark:text-slate-400 pointer-events-none"
          />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search 1,500+ icons (e.g. living room, light, bed, fan, cctv)..."
            className="w-full pl-10 pr-24 py-2 rounded-2xl bg-white/40 dark:bg-black/30 border border-white/50 dark:border-white/10 focus:border-sky-500 focus:bg-white/60 dark:focus:bg-black/50 text-slate-950 dark:text-white placeholder:text-slate-500 text-xs sm:text-sm font-bold outline-none transition-all shadow-inner"
          />
          <div className="absolute right-2.5 flex items-center gap-1.5">
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 rounded-lg hover:bg-white/20 text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white text-xs cursor-pointer transition-colors"
                title="Clear search"
              >
                <X size={13} weight="bold" />
              </button>
            )}
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/40 dark:bg-white/10 text-slate-700 dark:text-slate-400 border border-white/40 dark:border-white/10">
              {matchedIcons.length}
            </span>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-semibold">
          {PHOSPHOR_CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  if (searchQuery) setSearchQuery('');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-500 text-white border-sky-400 shadow-xs font-bold'
                    : 'bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 border-white/50 dark:border-white/10 text-slate-800 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                <DynamicPhosphorIcon name={cat.icon} size={14} weight="bold" />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Icons Grid Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-4 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-white/10">
        <IconErrorBoundary>
          {matchedIcons.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 space-y-2.5">
              <div className="w-12 h-12 rounded-2xl bg-white/30 dark:bg-white/5 border border-white/40 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400">
                <MagnifyingGlass size={22} weight="duotone" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">No icons found</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 max-w-xs">
                  No Phosphor icons matched &ldquo;{searchQuery}&rdquo;. Try another keyword.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-3.5 py-1.5 rounded-xl bg-white/40 dark:bg-white/10 hover:bg-white/60 dark:hover:bg-white/15 border border-white/50 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white transition-all cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-2.5">
                {displayedIcons.map(iconName => {
                  const isSelected = previewIcon === iconName;
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setPreviewIcon(iconName)}
                      onDoubleClick={() => handleApply(iconName)}
                      title={formatIconDisplayName(iconName)}
                      className={`group relative p-2 sm:p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-center min-w-0 ${
                        isSelected
                          ? 'bg-sky-500/20 border-sky-500 text-sky-900 dark:text-sky-300 ring-2 ring-sky-500/40 shadow-sm scale-102 font-black'
                          : 'bg-white/30 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 border-white/40 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white font-bold'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-xs">
                          <Check size={10} weight="bold" />
                        </div>
                      )}
                      <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center transition-transform group-hover:scale-115 shrink-0">
                        <DynamicPhosphorIcon
                          name={iconName}
                          size={22}
                          weight={selectedWeight}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-center leading-tight line-clamp-2 break-words w-full px-0.5 min-h-[26px] flex items-center justify-center text-slate-800 dark:text-slate-200">
                        {formatIconDisplayName(iconName)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {hasMore && (
                <div className="pt-2 pb-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setDisplayLimit(prev => prev + BATCH_LOAD_COUNT)}
                    className="px-4 py-2 rounded-2xl bg-white/40 hover:bg-white/60 dark:bg-white/10 dark:hover:bg-white/15 border border-white/50 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white transition-all cursor-pointer flex items-center gap-2 active:scale-95 shadow-xs"
                  >
                    <span>Load More Icons ({matchedIcons.length - displayLimit} remaining)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </IconErrorBoundary>
      </div>

      {/* 4. Footer Bar */}
      <div className="p-3.5 sm:p-4 border-t border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPreviewIcon(null);
              handleApply(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/40 dark:bg-white/5 hover:bg-rose-500/20 hover:text-rose-700 dark:hover:text-rose-300 border border-white/50 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-400 transition-all cursor-pointer"
            title="Remove custom icon and use default"
          >
            <ArrowCounterClockwise size={13} weight="bold" />
            <span>Reset to Default</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-xl bg-white/40 hover:bg-white/60 dark:bg-white/10 dark:hover:bg-white/20 text-slate-900 dark:text-white border border-white/50 dark:border-white/10 transition-all cursor-pointer shadow-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleApply(previewIcon)}
            className="px-4 sm:px-5 py-1.5 text-xs sm:text-sm font-black rounded-xl bg-sky-600 hover:bg-sky-500 text-white shadow-md hover:shadow-sky-500/25 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <Check size={15} weight="bold" />
            <span>Select Icon</span>
          </button>
        </div>
      </div>
    </div>
  );

  // If embedded in a container (e.g. EntityCustomizerModal), render directly
  if (embedded) {
    return modalContent;
  }

  // Otherwise, render as a full-viewport modal via Portal
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/40 dark:bg-black/70 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: 'spring', damping: 26, stiffness: 350 }}
          className="relative w-full max-w-3xl h-[85vh] max-h-[85vh] flex flex-col bg-white/40 dark:bg-black/45 border border-white/60 dark:border-white/10 rounded-3xl shadow-2xl backdrop-blur-2xl text-slate-900 dark:text-slate-100 overflow-hidden isolate z-10"
        >
          {modalContent}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
