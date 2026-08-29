/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Searchable Phosphor Icon Picker Modal with categorized presets,
 * fuzzy search filter, and instant dynamic Phosphor icon preview.
 */

import React, { useState, useMemo } from 'react';
import {
  MagnifyingGlass,
  X,
  Check,
  HouseLine
} from '@phosphor-icons/react';
import DynamicPhosphorIcon from './DynamicPhosphorIcon';
import * as PhosphorIcons from '@phosphor-icons/react';

export const PHOSPHOR_ICON_CATALOG: { category: string; icons: string[] }[] = [
  {
    category: 'Rooms & Spaces',
    icons: [
      'Armchair', 'Bed', 'CookingPot', 'Desktop', 'Bathtub', 'FilmSlate',
      'DoorOpen', 'Door', 'HouseLine', 'House', 'Buildings', 'Tree',
      'Car', 'Books', 'Shower', 'Toilet', 'Television', 'Oven',
      'Refrigerator', 'Garage', 'SwimmingPool', 'Flower', 'Plant',
      'Baby', 'Barbell', 'Warehouse', 'Package', 'Briefcase', 'Archive'
    ]
  },
  {
    category: 'Architecture & Structure',
    icons: [
      'Stairs', 'Stack', 'ArrowsVertical', 'Compass', 'Columns',
      'Wall', 'Buildings', 'City', 'Castle', 'Church', 'Storefront',
      'Bridge', 'Warehouse', 'Tent', 'Lighthouse'
    ]
  },
  {
    category: 'Furniture & Decor',
    icons: [
      'Chair', 'Desk', 'Table', 'Lamp', 'Curtains', 'CoatHanger',
      'Towel', 'FrameCorners', 'Sparkle', 'PaintBrush', 'PencilRuler',
      'Rug', 'Clock', 'Hourglass', 'Shield', 'ShieldCheck'
    ]
  },
  {
    category: 'Climate & Comfort',
    icons: [
      'Thermometer', 'Drop', 'Sun', 'Moon', 'Cloud', 'CloudSun',
      'Snowflake', 'Flame', 'Fire', 'Wind', 'Fan', 'Waves',
      'Gauge', 'Lightning', 'Power'
    ]
  },
  {
    category: 'Media & Electronics',
    icons: [
      'SpeakerHigh', 'SpeakerSimpleHigh', 'MusicNotes', 'Headphones',
      'Radio', 'Camera', 'VideoCamera', 'GameController', 'Robot',
      'Plug', 'WifiHigh', 'Broadcast', 'Cpu', 'HardDrives'
    ]
  },
  {
    category: 'Security & Access',
    icons: [
      'Lock', 'LockOpen', 'LockKey', 'Key', 'Vault', 'Eye',
      'Bell', 'Warning', 'ShieldWarning', 'Siren', 'IdentificationCard'
    ]
  },
  {
    category: 'Outdoor & Vehicles',
    icons: [
      'Tree', 'Plant', 'Flower', 'Car', 'Bicycle', 'Motorcycle',
      'Airplane', 'Boat', 'SunHorizon', 'MoonStars', 'Path'
    ]
  }
];

// Flat list of all curated icons
const ALL_CURATED_ICONS = Array.from(
  new Set(PHOSPHOR_ICON_CATALOG.flatMap((c) => c.icons))
);

// All valid PascalCase icon names from the library
const ALL_PHOSPHOR_EXPORTS = Object.keys(PhosphorIcons).filter(
  (k) =>
    k[0] === k[0].toUpperCase() &&
    !k.includes('Context') &&
    !k.includes('Provider') &&
    typeof (PhosphorIcons as any)[k] === 'object'
);

interface IconPickerModalProps {
  isOpen: boolean;
  currentIcon?: string | null;
  onSelectIcon: (iconName: string) => void;
  onClose: () => void;
  darkMode?: boolean;
  accentColor?: string;
  title?: string;
}

export default function IconPickerModal({
  isOpen,
  currentIcon,
  onSelectIcon,
  onClose,
  darkMode = true,
  accentColor = '#6366f1',
  title = 'Choose an Icon'
}: IconPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filteredIcons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    if (!q) {
      if (selectedCategory === 'All') {
        return ALL_CURATED_ICONS;
      }
      const cat = PHOSPHOR_ICON_CATALOG.find((c) => c.category === selectedCategory);
      return cat ? cat.icons : ALL_CURATED_ICONS;
    }

    // Search across all phosphor exports for deep search
    const matches = ALL_PHOSPHOR_EXPORTS.filter((name) =>
      name.toLowerCase().includes(q)
    );

    // If query matches exact or starts with, sort those first
    matches.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      if (aLower === q) return -1;
      if (bLower === q) return 1;
      if (aLower.startsWith(q) && !bLower.startsWith(q)) return -1;
      if (!aLower.startsWith(q) && bLower.startsWith(q)) return 1;
      return a.localeCompare(b);
    });

    return matches.slice(0, 120); // Cap at top 120 for instant rendering
  }, [searchQuery, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div
        className={`w-full max-w-xl max-h-[85vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden isolate ${
          darkMode ? 'bg-slate-900 border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="p-5 pb-3 border-b border-white/10 dark:border-white/10 border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <DynamicPhosphorIcon
              name={currentIcon || 'HouseLine'}
              size={22}
              weight="duotone"
              style={{ color: accentColor }}
            />
            <div>
              <h3 className="text-base font-black tracking-tight">{title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Search Phosphor icon library
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 pb-2 space-y-3">
          <div className="relative flex items-center">
            <MagnifyingGlass
              size={18}
              weight="bold"
              className="absolute left-3.5 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search icons (e.g. Bed, Stairs, Thermometer, Lamp, Car...)"
              autoFocus
              className={`w-full pl-10 pr-10 py-2.5 rounded-2xl text-xs font-semibold focus:outline-hidden transition-all border ${
                darkMode
                  ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-white/30'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-400'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={14} weight="bold" />
              </button>
            )}
          </div>

          {/* Category Filter Pills (when not searching) */}
          {!searchQuery && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 touch-scroll-container">
              <button
                type="button"
                onClick={() => setSelectedCategory('All')}
                className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
                  selectedCategory === 'All'
                    ? 'bg-indigo-500 text-white border-indigo-400 shadow-xs'
                    : darkMode
                    ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                }`}
              >
                All
              </button>
              {PHOSPHOR_ICON_CATALOG.map((cat) => (
                <button
                  key={cat.category}
                  type="button"
                  onClick={() => setSelectedCategory(cat.category)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
                    selectedCategory === cat.category
                      ? 'bg-indigo-500 text-white border-indigo-400 shadow-xs'
                      : darkMode
                      ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                  }`}
                >
                  {cat.category}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Icon Grid */}
        <div className="flex-1 overflow-y-auto p-4 pt-1 touch-scroll-container max-h-[50vh]">
          {filteredIcons.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 gap-2">
              <HouseLine size={32} weight="duotone" className="opacity-40" />
              <p className="text-xs font-semibold">No matching Phosphor icons found for "{searchQuery}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5">
              {filteredIcons.map((iconName) => {
                const isSelected = currentIcon === iconName;

                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => {
                      onSelectIcon(iconName);
                      onClose();
                    }}
                    title={iconName}
                    className={`p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 border transition-all cursor-pointer active:scale-95 group relative ${
                      isSelected
                        ? 'bg-indigo-500/25 border-indigo-500 text-indigo-400 shadow-md scale-[1.03]'
                        : darkMode
                        ? 'bg-white/[0.04] hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <DynamicPhosphorIcon
                      name={iconName}
                      fallback={HouseLine}
                      size={22}
                      weight={isSelected ? 'fill' : 'duotone'}
                      className="group-hover:scale-110 transition-transform"
                    />
                    <span className="text-[9px] font-semibold truncate max-w-full text-center">
                      {iconName}
                    </span>
                    {isSelected && (
                      <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                        <Check size={9} weight="bold" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 dark:border-white/10 border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            {filteredIcons.length} icons available
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
