/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EntityCustomizerModal Component
 * Allows users to customize an entity's friendly display name, custom Phosphor icon,
 * and visibility preferences. Synced to remote config and live auto-layout store.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Check,
  Eye,
  EyeSlash,
  ArrowCounterClockwise,
  PencilSimple,
  SlidersHorizontal,
  MapPin
} from '@phosphor-icons/react';
import IconPickerField from '../ui/IconPickerField';
import DynamicPhosphorIcon from '../ui/DynamicPhosphorIcon';
import { useUserConfig } from '../../contexts/ConfigContext';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { normalizePhosphorIconName } from '../../lib/phosphorIconData';

export interface EntityCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: string | null;
  defaultName?: string;
  defaultIcon?: string;
  domain?: string;
  areaName?: string;
  floorName?: string;
  addToast?: (toast: any) => void;
}

const DOMAIN_QUICK_ICONS: Record<string, string[]> = {
  light: ['Lightbulb', 'LightbulbFilament', 'Lamp', 'Sun', 'Sparkle'],
  switch: ['Plug', 'Power', 'Lightning', 'ToggleRight'],
  climate: ['Thermometer', 'ThermometerHot', 'ThermometerCold', 'Wind', 'Fan', 'AirConditioner'],
  fan: ['Fan', 'Wind', 'AirConditioner'],
  cover: ['AppWindow', 'Window', 'Curtains', 'Blinds', 'Garage'],
  lock: ['Lock', 'LockOpen', 'LockKey', 'Key', 'Shield'],
  media_player: ['SpeakerHigh', 'Television', 'MusicNote', 'Headphones'],
  camera: ['VideoCamera', 'Webcam', 'Cctv', 'SecurityCamera'],
  vacuum: ['Broom', 'Robot', 'Sparkle'],
  binary_sensor: ['Door', 'DoorOpen', 'AppWindow', 'PersonSimpleWalk', 'Drop', 'Fire', 'ShieldCheck'],
  sensor: ['Gauge', 'Thermometer', 'Drop', 'Lightning', 'BatteryMedium', 'WifiHigh']
};

export default function EntityCustomizerModal({
  isOpen,
  onClose,
  entityId,
  defaultName = '',
  defaultIcon = '',
  domain = 'sensor',
  areaName,
  floorName,
  addToast
}: EntityCustomizerModalProps) {
  const { config, updateConfig, flushPendingSave } = useUserConfig();
  const { resolvedEntities, entityCustomizations, setEntityHidden } = useAutoLayoutStore();

  const resolved = entityId ? resolvedEntities[entityId] : null;
  const storeCustom = entityId ? entityCustomizations[entityId] : null;

  const currentConfigCustom = entityId && config?.entities?.customizations?.[entityId];
  const currentConfigIcon = entityId && config?.entities?.iconOverrides?.[entityId];
  const currentConfigName = entityId && config?.entities?.nameOverrides?.[entityId];

  const initialName =
    currentConfigCustom?.customName ||
    currentConfigName ||
    storeCustom?.customName ||
    resolved?.name ||
    defaultName ||
    entityId ||
    '';

  const initialIcon =
    currentConfigCustom?.customIcon ||
    currentConfigCustom?.icon ||
    currentConfigIcon ||
    storeCustom?.customIcon ||
    storeCustom?.icon ||
    resolved?.icon ||
    defaultIcon ||
    '';

  const isHiddenInitially =
    currentConfigCustom?.hidden ??
    storeCustom?.hidden ??
    resolved?.hidden ??
    (entityId ? config?.entities?.hiddenEntityIds?.includes(entityId) : false);

  const [customName, setCustomName] = useState<string>(initialName);
  const [customIcon, setCustomIcon] = useState<string | null>(initialIcon || null);
  const [isHidden, setIsHidden] = useState<boolean>(Boolean(isHiddenInitially));
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && entityId) {
      setCustomName(initialName);
      setCustomIcon(normalizePhosphorIconName(initialIcon) || null);
      setIsHidden(Boolean(isHiddenInitially));
    }
  }, [isOpen, entityId, initialName, initialIcon, isHiddenInitially]);

  if (!isOpen || !entityId) return null;

  const quickIcons = DOMAIN_QUICK_ICONS[domain] || DOMAIN_QUICK_ICONS.sensor;

  const handleSave = async () => {
    if (!entityId) return;
    setIsSaving(true);
    try {
      const finalName = customName.trim();
      const finalIcon = customIcon ? customIcon.trim() : null;

      // 1. Update config state
      await updateConfig(prev => {
        const nextCustomizations = { ...(prev.entities?.customizations || {}) };
        const nextNameOverrides = { ...(prev.entities?.nameOverrides || {}) };
        const nextIconOverrides = { ...(prev.entities?.iconOverrides || {}) };
        let nextHiddenIds = [...(prev.entities?.hiddenEntityIds || [])];

        nextCustomizations[entityId] = {
          ...(nextCustomizations[entityId] || {}),
          customName: finalName || undefined,
          name: finalName || undefined,
          customIcon: finalIcon || undefined,
          icon: finalIcon || undefined,
          hidden: isHidden
        };

        if (finalName) {
          nextNameOverrides[entityId] = finalName;
        } else {
          delete nextNameOverrides[entityId];
        }

        if (finalIcon) {
          nextIconOverrides[entityId] = finalIcon;
        } else {
          delete nextIconOverrides[entityId];
        }

        if (isHidden) {
          if (!nextHiddenIds.includes(entityId)) nextHiddenIds.push(entityId);
        } else {
          nextHiddenIds = nextHiddenIds.filter(id => id !== entityId);
        }

        return {
          ...prev,
          entities: {
            ...prev.entities,
            customizations: nextCustomizations,
            nameOverrides: nextNameOverrides,
            iconOverrides: nextIconOverrides,
            hiddenEntityIds: nextHiddenIds
          }
        };
      });

      // 2. Update live in-memory store
      setEntityHidden(entityId, isHidden);
      useAutoLayoutStore.setState(prev => {
        const nextResolved = { ...prev.resolvedEntities };
        if (nextResolved[entityId]) {
          nextResolved[entityId] = {
            ...nextResolved[entityId],
            name: finalName || nextResolved[entityId].name,
            icon: finalIcon || nextResolved[entityId].icon,
            hidden: isHidden
          };
        }
        return {
          resolvedEntities: nextResolved,
          entityCustomizations: {
            ...prev.entityCustomizations,
            [entityId]: {
              ...(prev.entityCustomizations[entityId] || {}),
              customName: finalName,
              customIcon: finalIcon || undefined,
              hidden: isHidden
            }
          }
        };
      });

      await flushPendingSave();

      addToast?.({
        type: 'success',
        title: 'Entity Customized',
        message: `Saved customizations for ${finalName || entityId}`
      });

      onClose();
    } catch (err) {
      console.error('Failed to save entity customizations:', err);
      addToast?.({
        type: 'error',
        title: 'Save Failed',
        message: 'Could not persist entity customizations.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: 'spring', damping: 26, stiffness: 350 }}
          className="relative w-full max-w-lg p-5 sm:p-6 bg-slate-900/85 rounded-3xl shadow-[4px_6px_20px_rgba(0,0,0,0.35)] backdrop-blur-md text-slate-100 space-y-5 isolate z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                <DynamicPhosphorIcon name={customIcon || defaultIcon || 'SlidersHorizontal'} size={22} weight="duotone" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-black text-white truncate">
                  Customize Entity
                </h3>
                <span className="text-xs font-mono text-slate-400 truncate block">
                  {entityId}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X size={16} weight="bold" />
            </button>
          </div>

          {/* Location details */}
          {(areaName || floorName) && (
            <div className="p-3 rounded-2xl bg-white/5 flex items-center gap-2 text-xs text-slate-400 font-medium">
              <MapPin size={15} weight="duotone" className="text-sky-400 shrink-0" />
              <span>Assigned to:</span>
              <strong className="text-white font-bold">{areaName || 'Unassigned Area'}</strong>
              {floorName && (
                <>
                  <span>•</span>
                  <span className="text-slate-300">{floorName}</span>
                </>
              )}
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Custom Name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  Friendly Display Name
                </label>
                {customName !== defaultName && defaultName && (
                  <button
                    type="button"
                    onClick={() => setCustomName(defaultName)}
                    className="text-[11px] font-semibold text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <ArrowCounterClockwise size={12} weight="bold" />
                    <span>Reset Name</span>
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <PencilSimple size={16} weight="bold" className="absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder={defaultName || entityId}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 focus:border-sky-500 focus:bg-white/8 text-white text-xs sm:text-sm font-medium outline-none transition-all"
                />
              </div>
            </div>

            {/* Phosphor Icon Picker */}
            <IconPickerField
              label="Entity Phosphor Icon"
              value={customIcon}
              defaultValue={defaultIcon || 'Sparkle'}
              onChange={iconName => setCustomIcon(iconName)}
              accentColor="#0ea5e9"
              quickPresets={quickIcons}
              modalTitle={`Select Icon for ${customName || entityId}`}
              modalSubtitle="Choose any Phosphor icon to represent this entity"
            />

            {/* Visibility Toggle */}
            <div className="p-3.5 rounded-2xl bg-white/5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-bold text-white block">
                  Dashboard Visibility
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {isHidden ? 'Hidden from overview cards and rooms' : 'Visible on dashboard layouts'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsHidden(!isHidden)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  !isHidden
                    ? 'bg-emerald-500/20 text-emerald-300 shadow-xs'
                    : 'bg-white/10 text-slate-400'
                }`}
              >
                {!isHidden ? <Eye size={15} weight="bold" /> : <EyeSlash size={15} weight="bold" />}
                <span>{!isHidden ? 'Visible' : 'Hidden'}</span>
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-sky-500 hover:bg-sky-400 text-white shadow-md hover:shadow-sky-500/25 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <Check size={16} weight="bold" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
