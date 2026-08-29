/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  X, 
  GearSix, 
  Sun, 
  BatteryCharging, 
  Plug, 
  House, 
  Check, 
  ArrowsClockwise, 
  MagnifyingGlass,
  Sparkle,
  SlidersHorizontal,
  Info
} from '@phosphor-icons/react';
import { EnergyEntityMappingConfig, BoundEntityInfo, parsePowerToKW, parseEnergyToKWh } from './energyCalculator';

interface EnergyEntitySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  states: Record<string, any>;
  boundEntities: BoundEntityInfo;
  entityOverrides: EnergyEntityMappingConfig;
  onSaveOverrides: (newOverrides: EnergyEntityMappingConfig) => void;
  onResetToAutoDetect: () => void;
  darkMode?: boolean;
}

interface MappingFieldDef {
  key: keyof EnergyEntityMappingConfig;
  label: string;
  category: 'solar' | 'battery' | 'grid' | 'home';
  icon: any;
  iconColor: string;
  unit: string;
  description: string;
  autoDetectedKey: keyof BoundEntityInfo;
}

const FIELDS: MappingFieldDef[] = [
  {
    key: 'solarPowerEntity',
    label: 'Solar PV Active Power',
    category: 'solar',
    icon: Sun,
    iconColor: 'text-amber-500',
    unit: 'kW / W',
    description: 'Instant solar production from inverter or rooftop panels',
    autoDetectedKey: 'solarPower'
  },
  {
    key: 'solarEnergyTodayEntity',
    label: 'Solar Daily Energy Yield',
    category: 'solar',
    icon: Sun,
    iconColor: 'text-amber-500',
    unit: 'kWh',
    description: 'Cumulative solar kWh generation for today',
    autoDetectedKey: 'solarEnergyToday'
  },
  {
    key: 'batterySocEntity',
    label: 'Battery State of Charge',
    category: 'battery',
    icon: BatteryCharging,
    iconColor: 'text-emerald-500',
    unit: '%',
    description: 'Home battery percentage state of charge',
    autoDetectedKey: 'batterySoc'
  },
  {
    key: 'batteryPowerEntity',
    label: 'Battery Active Power Flow',
    category: 'battery',
    icon: BatteryCharging,
    iconColor: 'text-emerald-500',
    unit: 'kW / W (+ discharge, - charge)',
    description: 'Signed power flow into or out of battery bank',
    autoDetectedKey: 'batteryPower'
  },
  {
    key: 'gridPowerEntity',
    label: 'Grid Active Power Meter',
    category: 'grid',
    icon: Plug,
    iconColor: 'text-sky-500',
    unit: 'kW / W (+ import, - export)',
    description: 'Main smart meter power reading',
    autoDetectedKey: 'gridPower'
  },
  {
    key: 'gridImportEnergyTodayEntity',
    label: 'Grid Energy Imported Today',
    category: 'grid',
    icon: Plug,
    iconColor: 'text-sky-500',
    unit: 'kWh',
    description: 'Total kWh pulled from the grid today',
    autoDetectedKey: 'gridImportEnergyToday'
  },
  {
    key: 'gridExportEnergyTodayEntity',
    label: 'Grid Energy Exported Today',
    category: 'grid',
    icon: Plug,
    iconColor: 'text-indigo-500',
    unit: 'kWh',
    description: 'Total kWh fed back into the grid today',
    autoDetectedKey: 'gridExportEnergyToday'
  },
  {
    key: 'homeConsumptionPowerEntity',
    label: 'Home Total Consumption Power',
    category: 'home',
    icon: House,
    iconColor: 'text-purple-500',
    unit: 'kW / W',
    description: 'Live whole-house active power load (optional, auto-calculated if blank)',
    autoDetectedKey: 'homeConsumptionPower'
  },
  {
    key: 'homeConsumptionEnergyTodayEntity',
    label: 'Home Total Energy Used Today',
    category: 'home',
    icon: House,
    iconColor: 'text-purple-500',
    unit: 'kWh',
    description: 'Total household kWh consumed today',
    autoDetectedKey: 'homeConsumptionEnergyToday'
  }
];

export default function EnergyEntitySettingsModal({
  isOpen,
  onClose,
  states,
  boundEntities,
  entityOverrides,
  onSaveOverrides,
  onResetToAutoDetect,
  darkMode = true
}: EnergyEntitySettingsModalProps) {
  const [formData, setFormData] = useState<EnergyEntityMappingConfig>(entityOverrides);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'solar' | 'battery' | 'grid' | 'home'>('all');

  // List of all sensor entities in Home Assistant
  const allSensorEntityIds = useMemo(() => {
    return Object.keys(states || [])
      .filter(id => id.startsWith('sensor.') || id.startsWith('input_number.'))
      .sort();
  }, [states]);

  if (!isOpen) return null;

  const handleFieldChange = (key: keyof EnergyEntityMappingConfig, val: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: val.trim() || undefined
    }));
  };

  const handleSave = () => {
    onSaveOverrides(formData);
    onClose();
  };

  const handleReset = () => {
    setFormData({});
    onResetToAutoDetect();
    onClose();
  };

  const filteredFields = FIELDS.filter(f => {
    if (activeCategory !== 'all' && f.category !== activeCategory) return false;
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q) || f.description.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`relative w-full max-w-3xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden backdrop-blur-md transition-all ${
          darkMode 
            ? 'bg-[#0F141C]/95 border-white/15 text-white' 
            : 'bg-white/95 border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-200/60 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shadow-xs">
              <SlidersHorizontal size={22} weight="duotone" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Energy Entity Mapping
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Verify and assign your Home Assistant sensors for Solar, Battery, Grid, and Home Demand
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-2xl border transition-all cursor-pointer ${
              darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Category Tabs & Filter */}
        <div className="px-5 sm:px-6 py-3 border-b border-slate-200/60 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-black/5 dark:bg-white/5">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(['all', 'solar', 'battery', 'grid', 'home'] as const).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                  activeCategory === cat
                    ? darkMode
                      ? 'bg-white text-black shadow-md'
                      : 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter fields..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border outline-hidden transition-all ${
                darkMode 
                  ? 'bg-black/40 border-white/10 text-white placeholder-slate-500 focus:border-amber-500' 
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500'
              }`}
            />
          </div>
        </div>

        {/* Fields List */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {filteredFields.map(field => {
            const Icon = field.icon;
            const currentOverride = formData[field.key] || '';
            const detectedEntity = boundEntities[field.autoDetectedKey];
            const liveState = states[currentOverride || detectedEntity];

            return (
              <div 
                key={field.key}
                className={`p-4 rounded-2xl border transition-all ${
                  darkMode ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl bg-white/10 ${field.iconColor}`}>
                      <Icon size={18} weight="duotone" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {field.label}
                        </span>
                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md bg-white/10 text-slate-400">
                          {field.unit}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                        {field.description}
                      </p>
                    </div>
                  </div>

                  {/* Live Value Indicator */}
                  {liveState && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{liveState.state} {liveState.attributes?.unit_of_measurement || ''}</span>
                    </div>
                  )}
                </div>

                {/* Entity Selector Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      list={`list-${field.key}`}
                      placeholder={detectedEntity ? `Auto-detected: ${detectedEntity}` : 'e.g. sensor.solar_power'}
                      value={currentOverride}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                      className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono border outline-hidden transition-all ${
                        darkMode 
                          ? 'bg-black/50 border-white/10 text-white placeholder-slate-500 focus:border-amber-500' 
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500'
                      }`}
                    />
                    <datalist id={`list-${field.key}`}>
                      {allSensorEntityIds.map(entId => (
                        <option key={entId} value={entId}>
                          {states[entId]?.attributes?.friendly_name || entId}
                        </option>
                      ))}
                    </datalist>

                    {currentOverride && (
                      <button
                        type="button"
                        onClick={() => handleFieldChange(field.key, '')}
                        className="px-2.5 py-2 rounded-xl text-[11px] font-bold border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>
                      {currentOverride ? (
                        <strong className="text-amber-500">Custom override active</strong>
                      ) : (
                        <span>Currently bound to: <strong className="text-slate-300 dark:text-slate-300">{detectedEntity}</strong></span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-5 sm:p-6 border-t border-slate-200/60 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-black/10 dark:bg-white/5">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-slate-400/30 text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer transition-all"
          >
            <ArrowsClockwise size={14} />
            <span>Reset All to Auto-Detect</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-white/5 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 cursor-pointer transition-all"
            >
              <Check size={15} weight="bold" />
              <span>Apply & Save Mappings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
