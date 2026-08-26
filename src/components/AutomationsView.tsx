/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Workflow, 
  Play, 
  Plus, 
  Power, 
  Clock, 
  Sun, 
  Moon, 
  ShieldAlert, 
  Zap, 
  Lightbulb, 
  Thermometer, 
  Bot, 
  Check, 
  ChevronRight, 
  Sparkles, 
  Sliders, 
  Bell, 
  CheckCircle2, 
  Trash2,
  Calendar,
  Layers,
  ArrowRight,
  Star,
  Sunrise,
  Coffee,
  BedDouble,
  Tv
} from 'lucide-react';
import { HAEntity, Room } from '../types';
import { useAutoLayoutStore } from '../store/useAutoLayoutStore';

export interface SceneTileItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  starred: boolean;
  active: boolean;
}

const DEFAULT_SCENES: SceneTileItem[] = [
  { id: 'scene.morning_glow', name: 'Morning Glow', icon: 'Sunrise', color: 'from-amber-500 to-orange-600', starred: true, active: false },
  { id: 'scene.calm_zen', name: 'Calm Zen Focus', icon: 'Sparkles', color: 'from-purple-500 to-indigo-600', starred: true, active: true },
  { id: 'scene.work_focus', name: 'Studio Daylight', icon: 'Sun', color: 'from-sky-500 to-blue-600', starred: false, active: false },
  { id: 'scene.cinema_night', name: 'Cinema Ambiance', icon: 'Tv', color: 'from-rose-500 to-pink-600', starred: true, active: false },
  { id: 'scene.away_secure', name: 'Away Perimeter Arm', icon: 'ShieldAlert', color: 'from-red-600 to-rose-700', starred: false, active: false },
  { id: 'scene.night_slumber', name: 'Night Slumber', icon: 'Moon', color: 'from-slate-700 to-indigo-950', starred: false, active: false }
];

export interface AutomationItem {
  id: string;
  name: string;
  description: string;
  category: 'lighting' | 'climate' | 'security' | 'energy' | 'convenience';
  enabled: boolean;
  trigger: {
    type: 'time' | 'sun' | 'sensor' | 'state' | 'geo';
    description: string;
  };
  condition?: string;
  action: {
    entityId: string;
    targetState: string;
    description: string;
  };
  lastTriggered?: string;
  runsToday: number;
}

const INITIAL_AUTOMATIONS: AutomationItem[] = [
  {
    id: 'auto_motion_nightlight',
    name: 'Hallway Motion Nightlight',
    description: 'Illuminate entryway to 15% warm amber when motion is detected after sunset.',
    category: 'lighting',
    enabled: true,
    trigger: {
      type: 'sensor',
      description: 'Living Room Motion PIR detects motion'
    },
    condition: 'After 10:00 PM & Ambient Light < 50 lux',
    action: {
      entityId: 'light.hallway_entry',
      targetState: 'on',
      description: 'Turn on Entryway light at 15% brightness'
    },
    lastTriggered: '12 min ago',
    runsToday: 4
  },
  {
    id: 'auto_morning_brew',
    name: 'Sunrise Rise & Shine Routine',
    description: 'Gradually brighten bedroom light, warm AC to 22°C, and power on smart espresso machine.',
    category: 'convenience',
    enabled: true,
    trigger: {
      type: 'time',
      description: 'Every weekday at 07:00 AM'
    },
    condition: 'Home mode is set to Occupied',
    action: {
      entityId: 'switch.coffee_maker',
      targetState: 'on',
      description: 'Activate espresso maker and soft bedroom lighting'
    },
    lastTriggered: 'Today, 7:00 AM',
    runsToday: 1
  },
  {
    id: 'auto_away_security',
    name: 'Away Perimeter Arm & Energy Guard',
    description: 'Arm front door lock, set AC inverter to Eco mode (18°C), and turn off all non-essential lights.',
    category: 'security',
    enabled: true,
    trigger: {
      type: 'state',
      description: 'Front Door Nest Lock locked from outside'
    },
    condition: 'No presence detected for 10 minutes',
    action: {
      entityId: 'lock.front_door',
      targetState: 'locked',
      description: 'Arm security keypad and disengage heating'
    },
    lastTriggered: 'Today, 8:15 AM',
    runsToday: 1
  },
  {
    id: 'auto_solar_excess',
    name: 'Solar Surplus Microgrid Battery Diverter',
    description: 'When solar output exceeds 4.5 kW, divert excess clean energy to powerwall and trigger dishwasher wash cycle.',
    category: 'energy',
    enabled: true,
    trigger: {
      type: 'sensor',
      description: 'Solar array production > 4.5 kW'
    },
    condition: 'Tesla Battery SoC > 80%',
    action: {
      entityId: 'switch.dishwasher',
      targetState: 'on',
      description: 'Engage high-efficiency dishwasher eco cycle'
    },
    lastTriggered: 'Yesterday, 1:30 PM',
    runsToday: 2
  },
  {
    id: 'auto_sunset_ambience',
    name: 'Dusk Ambient Cinema Glow',
    description: 'Activate subtle purple TV backlight accent and close bedroom blinds.',
    category: 'lighting',
    enabled: true,
    trigger: {
      type: 'sun',
      description: 'Sun drops 5° below horizon'
    },
    action: {
      entityId: 'light.living_room_accent',
      targetState: 'on',
      description: 'Set TV Backlight LED to 45% Purple'
    },
    lastTriggered: 'Yesterday, 7:48 PM',
    runsToday: 1
  },
  {
    id: 'auto_vacuum_sweep',
    name: 'Daily Autonomous Vacuum Sweep',
    description: 'Launch Roborock S10 to vacuum living spaces while occupants are away.',
    category: 'convenience',
    enabled: false,
    trigger: {
      type: 'time',
      description: 'Daily at 11:30 AM'
    },
    condition: 'All occupants are Away',
    action: {
      entityId: 'vacuum.bedroom',
      targetState: 'on',
      description: 'Initiate vacuum full map clean cycle'
    },
    lastTriggered: '3 days ago',
    runsToday: 0
  }
];

interface AutomationsViewProps {
  entities: HAEntity[];
  rooms: Room[];
  onTriggerAutomation: (automation: AutomationItem) => void;
  darkMode: boolean;
}

export default function AutomationsView({
  entities,
  rooms,
  onTriggerAutomation,
  darkMode
}: AutomationsViewProps) {
  const { callHAService } = useAutoLayoutStore();
  const [scenes, setScenes] = useState<SceneTileItem[]>(DEFAULT_SCENES);
  const [automations, setAutomations] = useState<AutomationItem[]>(INITIAL_AUTOMATIONS);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [executingSceneId, setExecutingSceneId] = useState<string | null>(null);

  // New automation form fields
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<'lighting' | 'climate' | 'security' | 'energy' | 'convenience'>('lighting');
  const [newTriggerType, setNewTriggerType] = useState<'time' | 'sensor' | 'sun' | 'state'>('time');
  const [newTriggerDesc, setNewTriggerDesc] = useState('Daily at 08:00 AM');
  const [newActionEntity, setNewActionEntity] = useState('light.living_room_main');
  const [newActionTarget, setNewActionTarget] = useState('on');

  const filteredAutomations = automations.filter(auto => {
    if (activeCategory === 'all') return true;
    return auto.category === activeCategory;
  });

  const toggleStarScene = (sceneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, starred: !s.starred } : s));
  };

  const handleRunScene = (scene: SceneTileItem) => {
    setExecutingSceneId(scene.id);
    setScenes(prev => prev.map(s => ({ ...s, active: s.id === scene.id })));
    callHAService('scene', 'turn_on', {}, { entity_id: scene.id });

    setTimeout(() => {
      setExecutingSceneId(null);
    }, 1200);
  };

  const toggleAutomationState = (id: string) => {
    setAutomations(prev => prev.map(a => {
      if (a.id === id) {
        return { ...a, enabled: !a.enabled };
      }
      return a;
    }));
  };

  const handleRunNow = (automation: AutomationItem) => {
    setExecutingId(automation.id);
    onTriggerAutomation(automation);

    setAutomations(prev => prev.map(a => {
      if (a.id === automation.id) {
        return { ...a, lastTriggered: 'Just now', runsToday: a.runsToday + 1 };
      }
      return a;
    }));

    setTimeout(() => {
      setExecutingId(null);
    }, 1200);
  };

  const handleCreateAutomation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const targetEnt = entities.find(ent => ent.entity_id === newActionEntity);
    const actionDesc = `Turn ${newActionTarget.toUpperCase()} ${targetEnt?.attributes.friendly_name || newActionEntity}`;

    const newAuto: AutomationItem = {
      id: `auto_${Date.now()}`,
      name: newName.trim(),
      description: newDesc.trim() || 'Custom created smart automation sequence.',
      category: newCategory,
      enabled: true,
      trigger: {
        type: newTriggerType,
        description: newTriggerDesc
      },
      action: {
        entityId: newActionEntity,
        targetState: newActionTarget,
        description: actionDesc
      },
      lastTriggered: 'Not triggered yet',
      runsToday: 0
    };

    setAutomations([newAuto, ...automations]);
    setShowCreateModal(false);
    setNewName('');
    setNewDesc('');
  };

  const handleDeleteAutomation = (id: string) => {
    setAutomations(prev => prev.filter(a => a.id !== id));
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'lighting': return <Lightbulb size={16} className="text-amber-400" />;
      case 'climate': return <Thermometer size={16} className="text-sky-400" />;
      case 'security': return <ShieldAlert size={16} className="text-rose-400" />;
      case 'energy': return <Zap size={16} className="text-[#9D8BFF]" />;
      case 'convenience':
      default:
        return <Sparkles size={16} className="text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col min-h-0">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className={`text-xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              Smart Automations & Routines
            </h2>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
              darkMode ? 'bg-indigo-950/60 border-indigo-800/40 text-[#9D8BFF]' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
            }`}>
              {automations.filter(a => a.enabled).length} Active
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Event-driven triggers, sensor thresholds, and scheduled device sequences
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-create-automation"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#7B61FF] hover:bg-[#684be3] text-white text-xs font-bold shadow-md shadow-[#7B61FF]/30 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Create Automation</span>
          </button>
        </div>
      </div>

      {/* Quick-Run Action Scenes Grid */}
      <div className={`p-4 sm:p-5 rounded-3xl border shadow-xs ${
        darkMode ? 'bg-slate-900/60 border-white/[0.1] backdrop-blur-md' : 'bg-white/80 border-black/[0.06] backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
      }`}>
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Sparkles size={16} />
            </span>
            <div>
              <h3 className={`text-sm font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Quick-Run Scenes & Atmosphere Tiles
              </h3>
              <p className="text-[10px] text-slate-400">One-tap multi-room state presets with instant feedback</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-slate-400">
            {scenes.filter(s => s.starred).length} Pinned Favorites
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {scenes.map(scene => {
            const isExecuting = executingSceneId === scene.id;
            return (
              <motion.div
                key={scene.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleRunScene(scene)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between group shadow-xs ${
                  scene.active
                    ? 'bg-gradient-to-br ' + scene.color + ' text-white border-white/30 shadow-md'
                    : darkMode
                      ? 'bg-slate-950/60 border-slate-800 hover:border-indigo-500/40 text-slate-200'
                      : 'bg-slate-50 border-slate-200 hover:border-indigo-300 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                    scene.active ? 'bg-white/25 text-white' : 'bg-indigo-500/15 text-indigo-400'
                  }`}>
                    {isExecuting ? <Check size={14} className="animate-bounce" /> : <Play size={12} />}
                  </div>

                  <button
                    onClick={(e) => toggleStarScene(scene.id, e)}
                    className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                    title={scene.starred ? 'Remove favorite' : 'Pin to favorites'}
                  >
                    <Star size={13} className={scene.starred ? 'fill-amber-400 text-amber-400' : ''} />
                  </button>
                </div>

                <div>
                  <h4 className="text-xs font-black tracking-tight truncate">{scene.name}</h4>
                  <span className={`text-[9px] font-bold ${scene.active ? 'text-white/80' : 'text-slate-400'}`}>
                    {isExecuting ? 'Triggering...' : scene.active ? 'Active Now' : 'Tap to Activate'}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 touch-scroll-container">
        {[
          { id: 'all', label: 'All Routines' },
          { id: 'lighting', label: 'Lighting' },
          { id: 'climate', label: 'Climate' },
          { id: 'security', label: 'Security' },
          { id: 'energy', label: 'Energy & Solar' },
          { id: 'convenience', label: 'Convenience' }
        ].map(cat => {
          const isSel = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                isSel
                  ? 'bg-[#7B61FF] text-white border-[#7B61FF] shadow-sm shadow-[#7B61FF]/30'
                  : darkMode
                    ? 'bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Automations Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredAutomations.map(auto => {
          const isExecuting = executingId === auto.id;
          return (
            <motion.div
              key={auto.id}
              layout
              className={`rounded-3xl p-5 sm:p-6 border transition-all relative overflow-hidden flex flex-col justify-between shadow-xs ${
                auto.enabled
                  ? darkMode 
                    ? 'bg-slate-900/70 border-white/[0.1] hover:border-[#7B61FF]/40 backdrop-blur-md' 
                    : 'bg-white/80 border-black/[0.06] hover:border-[#7B61FF]/40 backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
                  : darkMode
                    ? 'bg-slate-950/40 border-white/[0.05] opacity-70'
                    : 'bg-slate-100/60 border-black/[0.04] opacity-70'
              }`}
            >
              <div>
                {/* Header: Category Icon + Title + Enable Toggle */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-xs ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
                    }`}>
                      {getCategoryIcon(auto.category)}
                    </div>
                    <div>
                      <h3 className={`font-extrabold text-base leading-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        {auto.name}
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 capitalize">
                        {auto.category} Automation
                      </span>
                    </div>
                  </div>

                  {/* Enable / Disable Toggle Switch */}
                  <button
                    onClick={() => toggleAutomationState(auto.id)}
                    className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer relative shadow-inner ${
                      auto.enabled ? 'bg-[#7B61FF]' : darkMode ? 'bg-slate-800' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                        auto.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {auto.description}
                </p>

                {/* Logic Visual Flow (Trigger -> Condition -> Action) */}
                <div className={`p-3.5 rounded-2xl border space-y-2 mb-4 font-mono text-[11px] ${
                  darkMode ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-50 border-slate-200/70'
                }`}>
                  {/* Trigger */}
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                      darkMode ? 'bg-indigo-950 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      TRIGGER
                    </span>
                    <span className="truncate text-slate-300 font-sans text-xs">
                      {auto.trigger.description}
                    </span>
                  </div>

                  {/* Condition if exists */}
                  {auto.condition && (
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                        darkMode ? 'bg-amber-950 text-amber-300' : 'bg-amber-100 text-amber-700'
                      }`}>
                        IF
                      </span>
                      <span className="truncate text-slate-400 font-sans text-xs">
                        {auto.condition}
                      </span>
                    </div>
                  )}

                  {/* Action */}
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                      darkMode ? 'bg-emerald-950 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      DO
                    </span>
                    <span className="truncate text-slate-300 font-sans text-xs font-semibold">
                      {auto.action.description}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer: Last Triggered + Run Now Action */}
              <div className={`flex items-center justify-between pt-3 border-t text-xs ${
                darkMode ? 'border-slate-800' : 'border-slate-100'
              }`}>
                <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                  <Clock size={12} />
                  <span>Last run: <strong className={darkMode ? 'text-slate-300' : 'text-slate-600'}>{auto.lastTriggered || 'Never'}</strong></span>
                  <span>•</span>
                  <span>{auto.runsToday} today</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteAutomation(auto.id)}
                    title="Delete automation"
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      darkMode ? 'hover:bg-slate-800 text-slate-500 hover:text-rose-400' : 'hover:bg-slate-100 text-slate-400 hover:text-rose-600'
                    }`}
                  >
                    <Trash2 size={14} />
                  </button>

                  <button
                    onClick={() => handleRunNow(auto)}
                    disabled={isExecuting}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                      isExecuting
                        ? 'bg-emerald-600 text-white'
                        : darkMode
                          ? 'bg-slate-800 hover:bg-[#7B61FF] text-slate-200 hover:text-white border border-slate-700'
                          : 'bg-indigo-50 hover:bg-[#7B61FF] text-indigo-700 hover:text-white border border-indigo-100'
                    }`}
                  >
                    {isExecuting ? (
                      <>
                        <CheckCircle2 size={13} className="animate-bounce" />
                        <span>Executed</span>
                      </>
                    ) : (
                      <>
                        <Play size={12} fill="currentColor" />
                        <span>Run Now</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* CREATE AUTOMATION MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col ${
                darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${
                    darkMode ? 'bg-indigo-950 text-[#9D8BFF]' : 'bg-indigo-100 text-indigo-600'
                  }`}>
                    <Workflow size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold leading-tight">Create Smart Automation</h3>
                    <p className="text-[11px] text-slate-400">Configure trigger conditions and target hardware actions</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCreateAutomation} className="space-y-4 py-4 overflow-y-auto touch-scroll-container pr-1">
                {/* Automation Name */}
                <div>
                  <label className="text-xs font-bold block mb-1">Automation Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cinema Night Mode, Sunset Front Porch Light"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border outline-hidden ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-[#7B61FF]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#7B61FF]'
                    }`}
                  />
                </div>

                {/* Category Selector */}
                <div>
                  <label className="text-xs font-bold block mb-1">Category</label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {(['lighting', 'climate', 'security', 'energy', 'convenience'] as const).map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewCategory(cat)}
                        className={`p-2 rounded-xl text-[10px] font-bold capitalize border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          newCategory === cat
                            ? 'bg-[#7B61FF] text-white border-[#7B61FF]'
                            : darkMode
                              ? 'bg-slate-950 border-slate-800 text-slate-400'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        {getCategoryIcon(cat)}
                        <span>{cat}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trigger Setup */}
                <div className={`p-3.5 rounded-2xl border space-y-3 ${
                  darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200/80'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-500 text-white">
                      1. Trigger
                    </span>
                    <span className="text-xs font-bold">When this happens:</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'time', label: 'Time Schedule', icon: Clock },
                      { id: 'sun', label: 'Sunrise / Sunset', icon: Sun },
                      { id: 'sensor', label: 'Sensor Trigger', icon: Zap },
                      { id: 'state', label: 'Device State Change', icon: Sliders }
                    ].map(t => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setNewTriggerType(t.id as any);
                            if (t.id === 'time') setNewTriggerDesc('Daily at 08:00 AM');
                            if (t.id === 'sun') setNewTriggerDesc('When Sun Sets');
                            if (t.id === 'sensor') setNewTriggerDesc('Motion detected in room');
                            if (t.id === 'state') setNewTriggerDesc('Front Door Lock unlocked');
                          }}
                          className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border cursor-pointer ${
                            newTriggerType === t.id
                              ? 'bg-[#7B61FF] text-white border-[#7B61FF]'
                              : darkMode
                                ? 'bg-slate-900 border-slate-800 text-slate-300'
                                : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <Icon size={14} />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="text"
                    required
                    value={newTriggerDesc}
                    onChange={(e) => setNewTriggerDesc(e.target.value)}
                    placeholder="Describe trigger condition"
                    className={`w-full px-3 py-1.5 rounded-xl text-xs font-mono border outline-hidden ${
                      darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Action Setup */}
                <div className={`p-3.5 rounded-2xl border space-y-3 ${
                  darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200/80'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500 text-white">
                      2. Action
                    </span>
                    <span className="text-xs font-bold">Perform this action:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold block mb-1 text-slate-400">Target Device</label>
                      <select
                        value={newActionEntity}
                        onChange={(e) => setNewActionEntity(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-medium border outline-hidden ${
                          darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        {entities.map(ent => (
                          <option key={ent.entity_id} value={ent.entity_id}>
                            {ent.attributes.friendly_name} ({ent.entity_id})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold block mb-1 text-slate-400">Command</label>
                      <select
                        value={newActionTarget}
                        onChange={(e) => setNewActionTarget(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-medium border outline-hidden ${
                          darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <option value="on">Turn ON</option>
                        <option value="off">Turn OFF</option>
                        <option value="locked">Lock Device</option>
                        <option value="unlocked">Unlock Device</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-bold block mb-1">Optional Summary Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of what this automation achieves..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border outline-hidden resize-none ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-[#7B61FF]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#7B61FF]'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                      darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#7B61FF] hover:bg-[#684be3] text-white text-xs font-bold shadow-md shadow-[#7B61FF]/30 cursor-pointer"
                  >
                    Save & Enable
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
