/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * IconFinderModal Component
 * Searchable, categorized modal to browse and select any of the 1,500+ Phosphor icons.
 * Features live synonym search, weight switcher, category filter pills,
 * and high-performance progressive rendering.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MagnifyingGlass,
  X,
  Check,
  Sparkle,
  ArrowCounterClockwise,
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
  accentColor = '#0ea5e9'
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: 'spring', damping: 26, stiffness: 350 }}
          className="relative w-full max-w-3xl max-h-[92vh] sm:max-h-[85vh] flex flex-col bg-slate-900 border border-white/15 rounded-3xl shadow-2xl backdrop-blur-2xl text-slate-100 overflow-hidden isolate z-10"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 shrink-0 bg-slate-900/90">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xs shrink-0 transition-transform"
                style={{
                  backgroundColor: `${accentColor}1a`,
                  borderColor: `${accentColor}40`,
                  color: accentColor
                }}
              >
                <DynamicPhosphorIcon
                  name={previewIcon || 'Sparkle'}
                  size={24}
                  weight={selectedWeight}
                />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-black text-white truncate">
                  {title}
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  {previewIcon ? `Selected: ${previewIcon}` : subtitle}
                </p>
              </div>
            </div>

            {/* Weight Switcher (Desktop) & Close Button */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5 text-xs font-semibold">
                {ICON_WEIGHTS.map(w => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setSelectedWeight(w.id)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      selectedWeight === w.id
                        ? 'bg-white/15 text-white font-bold shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                title="Close"
              >
                <X size={18} weight="bold" />
              </button>
            </div>
          </div>

          {/* Search Bar & Category Controls */}
          <div className="p-4 sm:p-5 pb-3 border-b border-white/10 space-y-3 bg-slate-900/50 shrink-0">
            {/* Search Input */}
            <div className="relative flex items-center">
              <MagnifyingGlass
                size={18}
                weight="bold"
                className="absolute left-3.5 text-slate-400 pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search 1,500+ icons (e.g. living room, light, bed, fan, cctv)..."
                className="w-full pl-10 pr-24 py-2.5 rounded-2xl bg-white/5 border border-white/10 focus:border-sky-500 focus:bg-white/8 text-white placeholder-slate-400 text-xs sm:text-sm font-medium outline-none transition-all"
              />
              <div className="absolute right-2.5 flex items-center gap-1.5">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white text-xs cursor-pointer transition-colors"
                    title="Clear search"
                  >
                    <X size={14} weight="bold" />
                  </button>
                )}
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/10 text-slate-400">
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
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
                    }`}
                  >
                    <DynamicPhosphorIcon name={cat.icon} size={14} weight="bold" />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Icons Grid Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 scrollbar-thin scrollbar-thumb-white/10 min-h-[300px]">
            <IconErrorBoundary>
              {matchedIcons.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                    <MagnifyingGlass size={26} weight="duotone" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">No icons found</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      No Phosphor icons matched &ldquo;{searchQuery}&rdquo;. Try another term or keyword.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-all cursor-pointer"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 sm:gap-2.5">
                    {displayedIcons.map(iconName => {
                      const isSelected = previewIcon === iconName;
                      return (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setPreviewIcon(iconName)}
                          onDoubleClick={() => handleApply(iconName)}
                          title={iconName}
                          className={`group relative p-2.5 sm:p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-center ${
                            isSelected
                              ? 'bg-sky-500/25 border-sky-400 text-sky-300 ring-2 ring-sky-500/50 scale-102 shadow-md'
                              : 'bg-white/4 hover:bg-white/10 border-white/8 hover:border-white/20 text-slate-300 hover:text-white'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-xs">
                              <Check size={10} weight="bold" />
                            </div>
                          )}
                          <div className="w-8 h-8 flex items-center justify-center transition-transform group-hover:scale-115">
                            <DynamicPhosphorIcon
                              name={iconName}
                              size={24}
                              weight={selectedWeight}
                            />
                          </div>
                          <span className="text-[10px] font-medium truncate w-full px-0.5 block leading-tight">
                            {iconName}
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
                        className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs sm:text-sm font-bold text-white transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                      >
                        <span>Load More Icons ({matchedIcons.length - displayLimit} remaining)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </IconErrorBoundary>
          </div>

          {/* Footer Bar */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPreviewIcon(null);
                  handleApply(null);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 border border-white/10 text-xs font-semibold text-slate-400 transition-all cursor-pointer"
                title="Remove custom icon and use default"
              >
                <ArrowCounterClockwise size={14} weight="bold" />
                <span>Reset to Default</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleApply(previewIcon)}
                className="px-5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-sky-500 hover:bg-sky-400 text-white shadow-md hover:shadow-sky-500/25 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Check size={16} weight="bold" />
                <span>Select Icon</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
