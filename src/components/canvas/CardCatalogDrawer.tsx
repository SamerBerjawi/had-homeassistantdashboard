/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  X, 
  Search, 
  Lightbulb, 
  Thermometer, 
  Zap, 
  Car, 
  CloudSun, 
  Music, 
  Bot, 
  Camera, 
  Activity, 
  Power, 
  Lock, 
  LayoutGrid,
  Check
} from 'lucide-react';
import { CardConfig, DashboardLayoutItem } from '../../types/canvas';
import { HAEntity } from '../../types';

interface CardCatalogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  availableEntities: HAEntity[];
  onAddCard: (config: CardConfig, layoutItem?: Partial<DashboardLayoutItem>) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All Cards', icon: LayoutGrid },
  { id: 'light', label: 'Lighting', icon: Lightbulb },
  { id: 'climate', label: 'Climate', icon: Thermometer },
  { id: 'nordpool', label: 'Nordpool / Energy', icon: Zap },
  { id: 'ev_charging', label: 'EV Charging', icon: Car },
  { id: 'weather', label: 'Weather', icon: CloudSun },
  { id: 'media_player', label: 'Media & Sonos', icon: Music },
  { id: 'vacuum', label: 'Vacuums', icon: Bot },
  { id: 'camera', label: 'Cameras', icon: Camera },
  { id: 'sensor', label: 'Sensors', icon: Activity },
  { id: 'switch', label: 'Switches', icon: Power },
  { id: 'lock', label: 'Security', icon: Lock }
];

const CARD_TEMPLATES: {
  type: string;
  defaultTitle: string;
  domain: string;
  defaultW: number;
  defaultH: number;
  description: string;
}[] = [
  {
    type: 'weather',
    defaultTitle: 'Atmospheric Radar',
    domain: 'weather',
    defaultW: 4,
    defaultH: 2,
    description: 'Real-time weather conditions, 3-day forecast, and atmospheric radar'
  },
  {
    type: 'nordpool',
    defaultTitle: 'Nordpool Spot Price',
    domain: 'sensor',
    defaultW: 4,
    defaultH: 2,
    description: '24h energy price trend, cheapest charging window, and tariff alerts'
  },
  {
    type: 'ev_charging',
    defaultTitle: 'Tesla EV Connector',
    domain: 'sensor',
    defaultW: 4,
    defaultH: 2,
    description: 'Battery state-of-charge gauge, charging power kW, and range added'
  },
  {
    type: 'light',
    defaultTitle: 'Ambient Lighting',
    domain: 'light',
    defaultW: 2,
    defaultH: 2,
    description: 'Quick toggle, brightness bar, chromatic RGB picker, and atmosphere moods'
  },
  {
    type: 'climate',
    defaultTitle: 'Smart Thermostat',
    domain: 'climate',
    defaultW: 4,
    defaultH: 2,
    description: 'Target temperature stepper, ambient temperature, and HVAC modes'
  },
  {
    type: 'media_player',
    defaultTitle: 'Sonos Whole-Home Audio',
    domain: 'media_player',
    defaultW: 4,
    defaultH: 2,
    description: 'Album artwork glow, volume slider, track scrubbing, and speaker grouping'
  },
  {
    type: 'vacuum',
    defaultTitle: 'Robot Vacuum Cleaner',
    domain: 'vacuum',
    defaultW: 4,
    defaultH: 2,
    description: 'Clean cycle trigger, return-to-dock, and suction power modes'
  },
  {
    type: 'camera',
    defaultTitle: 'Perimeter Live Stream',
    domain: 'camera',
    defaultW: 4,
    defaultH: 2,
    description: 'Live snapshot stream, intercom broadcast, and snapshot archiver'
  },
  {
    type: 'switch',
    defaultTitle: 'Smart Power Relay',
    domain: 'switch',
    defaultW: 2,
    defaultH: 2,
    description: 'Smart socket toggle with real-time wattage power draw measurement'
  },
  {
    type: 'lock',
    defaultTitle: 'Smart Deadbolt Security',
    domain: 'lock',
    defaultW: 2,
    defaultH: 2,
    description: 'Secure motorized deadbolt lock/unlock and alarm monitoring'
  },
  {
    type: 'sensor',
    defaultTitle: 'Telemetry Metric Gauge',
    domain: 'sensor',
    defaultW: 4,
    defaultH: 2,
    description: 'Power, solar, temperature, or humidity metric gauge with 24h history'
  }
];

export default function CardCatalogDrawer({
  isOpen,
  onClose,
  availableEntities,
  onAddCard
}: CardCatalogDrawerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [selectedTemplate, setSelectedTemplate] = useState<typeof CARD_TEMPLATES[0]>(CARD_TEMPLATES[0]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<{ w: number; h: number }>({ w: 4, h: 2 });

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return CARD_TEMPLATES.filter(t => {
      const matchesCat = selectedCategory === 'all' || t.type === selectedCategory;
      const matchesSearch = searchQuery === '' || 
        t.defaultTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Filter compatible entities for currently selected template
  const matchingEntities = useMemo(() => {
    return availableEntities.filter(e => {
      if (selectedTemplate.domain === 'weather') return e.entity_id.startsWith('weather.');
      if (selectedTemplate.domain === 'light') return e.entity_id.startsWith('light.');
      if (selectedTemplate.domain === 'climate') return e.entity_id.startsWith('climate.');
      if (selectedTemplate.domain === 'media_player') return e.entity_id.startsWith('media_player.');
      if (selectedTemplate.domain === 'vacuum') return e.entity_id.startsWith('vacuum.');
      if (selectedTemplate.domain === 'switch') return e.entity_id.startsWith('switch.');
      if (selectedTemplate.domain === 'lock') return e.entity_id.startsWith('lock.');
      if (selectedTemplate.type === 'nordpool') return e.entity_id.includes('nordpool') || e.entity_id.includes('price') || e.entity_id.includes('solar') || e.entity_id.startsWith('sensor.');
      if (selectedTemplate.type === 'ev_charging') return e.entity_id.includes('ev') || e.entity_id.includes('battery') || e.entity_id.startsWith('sensor.');
      return true;
    });
  }, [availableEntities, selectedTemplate]);

  // Auto-select first matching entity when template changes
  React.useEffect(() => {
    if (matchingEntities.length > 0) {
      setSelectedEntityId(matchingEntities[0].entity_id);
    } else {
      setSelectedEntityId(selectedTemplate.domain + '.default');
    }
    setSelectedSize({ w: selectedTemplate.defaultW, h: selectedTemplate.defaultH });
    setCustomTitle(selectedTemplate.defaultTitle);
  }, [selectedTemplate, matchingEntities]);

  const handlePlaceCard = () => {
    const newConfig: CardConfig = {
      id: `card_${selectedTemplate.type}_${Date.now()}`,
      type: selectedTemplate.type,
      entityId: selectedEntityId,
      title: customTitle.trim() || selectedTemplate.defaultTitle
    };

    onAddCard(newConfig, {
      w: selectedSize.w,
      h: selectedSize.h,
      minW: selectedSize.w >= 4 ? 3 : 2,
      minH: selectedSize.h
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="relative w-full max-w-xl h-full bg-slate-900/95 backdrop-blur-2xl border-l border-white/15 shadow-2xl text-white flex flex-col z-10"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center">
                  <Plus size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Add Card to Canvas</h3>
                  <p className="text-xs text-slate-400">Select card template & connect Home Assistant entity</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search and Category Filters */}
            <div className="p-4 border-b border-white/10 space-y-3">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search card templates or entities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-hidden focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon size={13} />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Drawer Body (Card Templates List & Configuration) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* 1. Template Selector */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-300 block">1. Choose Card Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredTemplates.map((template) => {
                    const isSelected = selectedTemplate.type === template.type;
                    return (
                      <button
                        key={template.type}
                        onClick={() => setSelectedTemplate(template)}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg ring-1 ring-indigo-500'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white">{template.defaultTitle}</span>
                          {isSelected && <Check size={14} className="text-indigo-400" />}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight">{template.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Target Home Assistant Entity Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">2. Target Home Assistant Entity</label>
                {matchingEntities.length > 0 ? (
                  <select
                    value={selectedEntityId}
                    onChange={(e) => setSelectedEntityId(e.target.value)}
                    className="w-full p-3 rounded-xl bg-black/50 border border-white/15 text-white text-xs font-mono focus:outline-hidden focus:border-indigo-500"
                  >
                    {matchingEntities.map((ent) => (
                      <option key={ent.entity_id} value={ent.entity_id} className="bg-slate-900 text-white">
                        {ent.attributes?.friendly_name || ent.entity_id} ({ent.entity_id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={selectedEntityId}
                    onChange={(e) => setSelectedEntityId(e.target.value)}
                    placeholder="Enter entity ID (e.g. sensor.living_room_temp)"
                    className="w-full p-3 rounded-xl bg-black/50 border border-white/15 text-white text-xs font-mono focus:outline-hidden focus:border-indigo-500"
                  />
                )}
              </div>

              {/* 3. Custom Title Override */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">3. Card Title (Optional)</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Living Room Ceiling Light"
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* 4. Canvas Dimension Preset Selector */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-300 block">4. Grid Span Preset</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Compact (2x2)', w: 2, h: 2 },
                    { label: 'Medium (4x2)', w: 4, h: 2 },
                    { label: 'Wide (6x2)', w: 6, h: 2 },
                    { label: 'Large (6x3)', w: 6, h: 3 }
                  ].map((size) => {
                    const isSelected = selectedSize.w === size.w && selectedSize.h === size.h;
                    return (
                      <button
                        key={size.label}
                        onClick={() => setSelectedSize({ w: size.w, h: size.h })}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-400 font-bold shadow-md'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-[11px] block">{size.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Drawer Footer Action */}
            <div className="p-5 border-t border-white/10 bg-slate-950/60 flex items-center justify-between gap-3">
              <button
                onClick={onClose}
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handlePlaceCard}
                className="flex-1 py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm transition-all cursor-pointer shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus size={18} />
                <span>Place on Canvas</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
