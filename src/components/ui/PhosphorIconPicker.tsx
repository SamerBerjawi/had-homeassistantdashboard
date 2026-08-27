/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as PhosphorIcons from '@phosphor-icons/react';
import { 
  House, 
  MagnifyingGlass,
  X,
  Check,
  ArrowCounterClockwise,
  Sparkle
} from '@phosphor-icons/react';

export type PhosphorIconWeight = 'duotone' | 'fill' | 'bold' | 'regular' | 'light' | 'thin';

export interface PhosphorIconItem {
  id: string;
  name: string;
  category: string;
  icon: PhosphorIcons.Icon;
}

// Dynamically index the COMPLETE Phosphor Icons collection (1,200+ icons from phosphoricons.com)
export const ALL_PHOSPHOR_ICONS: PhosphorIconItem[] = Object.entries(PhosphorIcons)
  .filter(([key, val]) => {
    return (
      typeof key === 'string' &&
      key.length > 1 &&
      key[0] === key[0].toUpperCase() &&
      !['IconContext', 'IconBase', 'Icon', 'SSR', 'IconProps', 'IconWeight'].includes(key) &&
      (typeof val === 'function' || typeof val === 'object')
    );
  })
  .map(([key, val]) => {
    // Format PascalCase into spaced title
    const formattedName = key.replace(/([A-Z])/g, ' $1').trim();
    
    // Categorize icons for convenient discovery
    let category = 'General & Utilities';
    const lower = key.toLowerCase();
    
    if (
      lower.includes('house') || lower.includes('build') || lower.includes('apartment') || 
      lower.includes('door') || lower.includes('garage') || lower.includes('warehouse') || 
      lower.includes('stairs') || lower.includes('elevator') || lower.includes('wall') || 
      lower.includes('castle') || lower.includes('store') || lower.includes('stack') || 
      lower.includes('grid') || lower.includes('squares') || lower.includes('tent') || lower.includes('room')
    ) {
      category = 'Home & Architecture';
    } else if (
      lower.includes('bed') || lower.includes('chair') || lower.includes('couch') || 
      lower.includes('armchair') || lower.includes('bath') || lower.includes('shower') || 
      lower.includes('toilet') || lower.includes('cook') || lower.includes('knife') || 
      lower.includes('fork') || lower.includes('kitchen') || lower.includes('lamp') || 
      lower.includes('desk') || lower.includes('rug') || lower.includes('table') || 
      lower.includes('towel') || lower.includes('book') || lower.includes('pillow') || lower.includes('coffee')
    ) {
      category = 'Rooms & Living';
    } else if (
      lower.includes('tree') || lower.includes('plant') || lower.includes('flower') || 
      lower.includes('leaf') || lower.includes('garden') || lower.includes('pool') || 
      lower.includes('swim') || lower.includes('car') || lower.includes('bicycle') || 
      lower.includes('boat') || lower.includes('mountain') || lower.includes('park') || 
      lower.includes('grass') || lower.includes('cactus') || lower.includes('patio')
    ) {
      category = 'Outdoors & Nature';
    } else if (
      lower.includes('sun') || lower.includes('cloud') || lower.includes('rain') || 
      lower.includes('drop') || lower.includes('wind') || lower.includes('fire') || 
      lower.includes('flame') || lower.includes('thermometer') || lower.includes('fan') || 
      lower.includes('snow') || lower.includes('weather') || lower.includes('temp') || 
      lower.includes('air') || lower.includes('umbrella') || lower.includes('tornado')
    ) {
      category = 'Climate & Weather';
    } else if (
      lower.includes('light') || lower.includes('bulb') || lower.includes('plug') || 
      lower.includes('volt') || lower.includes('power') || lower.includes('solar') || 
      lower.includes('battery') || lower.includes('flash') || lower.includes('gauge') || 
      lower.includes('meter') || lower.includes('cpu') || lower.includes('wifi') || 
      lower.includes('broadcast') || lower.includes('charging') || lower.includes('engine')
    ) {
      category = 'Energy & Power';
    } else if (
      lower.includes('shield') || lower.includes('lock') || lower.includes('key') || 
      lower.includes('camera') || lower.includes('cctv') || lower.includes('siren') || 
      lower.includes('bell') || lower.includes('alarm') || lower.includes('guard') || 
      lower.includes('eye') || lower.includes('fingerprint') || lower.includes('vault') || 
      lower.includes('warning') || lower.includes('detect')
    ) {
      category = 'Security & Access';
    } else if (
      lower.includes('tv') || lower.includes('television') || lower.includes('speaker') || 
      lower.includes('music') || lower.includes('sound') || lower.includes('headphone') || 
      lower.includes('radio') || lower.includes('phone') || lower.includes('desktop') || 
      lower.includes('laptop') || lower.includes('game') || lower.includes('controller') || 
      lower.includes('screen') || lower.includes('video') || lower.includes('audio')
    ) {
      category = 'Electronics & Media';
    }

    return {
      id: key,
      name: formattedName,
      category,
      icon: val as PhosphorIcons.Icon
    };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

export function getPhosphorIcon(iconId?: string): PhosphorIcons.Icon {
  if (!iconId) return House;
  
  // 1. Direct exact or lowercase match from the comprehensive catalog
  const found = ALL_PHOSPHOR_ICONS.find(i => i.id.toLowerCase() === iconId.toLowerCase());
  if (found) return found.icon;

  // 2. Direct lookup from PhosphorIcons named exports
  const direct = (PhosphorIcons as Record<string, any>)[iconId];
  if (direct && (typeof direct === 'function' || typeof direct === 'object')) {
    return direct as PhosphorIcons.Icon;
  }

  // 3. Fallback
  return House;
}

interface PhosphorIconPickerProps {
  isOpen: boolean;
  onClose: () => void;
  currentIconId: string;
  onSelectIcon: (iconId: string) => void;
  targetName: string;
  darkMode: boolean;
}

export function PhosphorIconPicker({
  isOpen,
  onClose,
  currentIconId,
  onSelectIcon,
  targetName,
  darkMode
}: PhosphorIconPickerProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [iconWeight, setIconWeight] = useState<PhosphorIconWeight>('duotone');

  const categories = useMemo(() => {
    return [
      'All', 
      'Home & Architecture', 
      'Rooms & Living', 
      'Outdoors & Nature', 
      'Climate & Weather', 
      'Energy & Power', 
      'Security & Access', 
      'Electronics & Media',
      'General & Utilities'
    ];
  }, []);

  const filteredIcons = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/[\s-_]/g, '');
    
    return ALL_PHOSPHOR_ICONS.filter(item => {
      // Category filter
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;

      // Fuzzy / Substring matching against icon ID, spaced name, and category
      const cleanId = item.id.toLowerCase();
      const cleanName = item.name.toLowerCase();
      const cleanCat = item.category.toLowerCase();

      return cleanId.includes(q) || cleanName.includes(q) || cleanCat.includes(q);
    });
  }, [search, selectedCategory]);

  const CurrentIconComponent = getPhosphorIcon(currentIconId);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Dimmed backdrop with 4px blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-[4px] cursor-pointer"
          />

          {/* Right Slide-over Sidebar with 4px glassmorphism blur */}
          <motion.aside
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className={`relative z-10 w-full max-w-md sm:max-w-lg h-full flex flex-col shadow-2xl border-l backdrop-blur-[4px] overflow-hidden ${
              darkMode 
                ? 'bg-slate-950/85 border-white/10 text-white' 
                : 'bg-white/90 border-black/10 text-slate-800'
            }`}
          >
            {/* Sidebar Header */}
            <div className="p-5 border-b border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-brand-purple/15 text-brand-purple border border-brand-purple/30 flex items-center justify-center shadow-xs">
                  <CurrentIconComponent size={26} weight={iconWeight} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold tracking-tight">Phosphor Icon Library</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-purple/15 text-brand-purple font-bold">
                      {ALL_PHOSPHOR_ICONS.length}+
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    Customize icon for <span className="font-bold text-brand-purple">{targetName}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors cursor-pointer"
                title="Close sidebar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search and Weight Toggle */}
            <div className="p-4 space-y-3 border-b border-slate-200/60 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 shrink-0">
              <div className="flex items-center gap-2">
                {/* Search Bar */}
                <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border text-xs shadow-xs flex-1 ${
                  darkMode ? 'bg-slate-900/90 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  <MagnifyingGlass size={16} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search all 1,200+ icons (e.g. swimming pool, solar, lamp, bed)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                    className="bg-transparent border-none outline-hidden placeholder-slate-400 text-xs w-full"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Weight selector (duotone default) */}
                <div className={`p-1 rounded-2xl flex items-center gap-1 border shadow-xs shrink-0 ${
                  darkMode ? 'bg-slate-900/90 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  {(['duotone', 'fill', 'bold', 'regular'] as PhosphorIconWeight[]).map(w => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setIconWeight(w)}
                      className={`px-2 py-1 rounded-xl text-[10px] font-bold capitalize transition-all cursor-pointer ${
                        iconWeight === w
                          ? 'bg-brand-purple text-white shadow-xs'
                          : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {w === 'duotone' ? '✨ Duo' : w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Categories Section with Smooth Horizontal Scrolling */}
              <div className="w-full overflow-x-auto scrollbar-none py-1 flex items-center gap-1.5 touch-pan-x cursor-grab active:cursor-grabbing">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer border ${
                      selectedCategory === cat
                        ? 'bg-brand-purple text-white border-brand-purple shadow-xs'
                        : darkMode
                          ? 'bg-slate-900/70 hover:bg-slate-800 border-slate-800 text-slate-300'
                          : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Icon Grid Area */}
            <div className="flex-1 p-4 overflow-y-auto min-h-0 grid grid-cols-3 sm:grid-cols-4 gap-2.5 content-start">
              {filteredIcons.slice(0, 300).map(item => {
                const IconComp = item.icon;
                const isSelected = item.id.toLowerCase() === currentIconId.toLowerCase();

                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      onSelectIcon(item.id);
                      onClose();
                    }}
                    title={`${item.name} (${item.id})`}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'bg-brand-purple/15 border-brand-purple text-brand-purple ring-2 ring-brand-purple/30 shadow-md'
                        : darkMode
                          ? 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700 text-slate-300'
                          : 'bg-slate-50/70 hover:bg-white border-slate-200/80 hover:border-slate-300 text-slate-700 shadow-xs'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110">
                      <IconComp size={28} weight={iconWeight} />
                    </div>

                    <span className="text-[10px] font-bold truncate max-w-full block leading-tight px-1 text-slate-400 group-hover:text-current">
                      {item.id}
                    </span>

                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-brand-purple text-white flex items-center justify-center shadow-xs">
                        <Check size={9} weight="bold" />
                      </div>
                    )}
                  </motion.button>
                );
              })}

              {filteredIcons.length === 0 && (
                <div className="col-span-full py-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                  <p>No icons found for "<span className="text-white font-bold">{search}</span>".</p>
                  <p className="text-[11px] text-slate-500">Try searching by general term (e.g. `house`, `pool`, `car`, `solar`).</p>
                </div>
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-slate-200/60 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onSelectIcon('');
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
                >
                  <ArrowCounterClockwise size={14} />
                  <span>Reset to Default</span>
                </button>

                <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                  Showing {Math.min(filteredIcons.length, 300)} of {filteredIcons.length}
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-brand-purple hover:bg-brand-purple-hover text-white text-xs font-bold shadow-md shadow-brand-purple/30 cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
