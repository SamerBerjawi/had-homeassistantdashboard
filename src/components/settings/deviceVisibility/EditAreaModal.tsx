/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import DialogShell from '../../ui/DialogShell';
import { Armchair } from '@phosphor-icons/react';
import IconPickerField from '../../ui/IconPickerField';
import { AREA_ICON_OPTIONS, PRESET_COLORS } from './shared';
import type { DeviceVisibilityState } from './useDeviceVisibilityState';

export default function EditAreaModal({ s }: { s: DeviceVisibilityState }) {
  const {
    addToast,
    editingArea,
    flushPendingSave,
    setEditingArea,
    updateArea,
    updateConfig
  } = s;
  if (!editingArea) return null;
  return (
    <DialogShell label="Edit area style" onClose={() => setEditingArea(null)} overlayClassName="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 space-y-4 shadow-2xl">
        <h4 className="text-base font-bold text-slate-900 dark:text-white">Edit Area Style: {editingArea.name}</h4>
        <div className="space-y-3">
          <IconPickerField
            label="Area Icon"
            value={editingArea.icon}
            defaultValue="Armchair"
            onChange={newIcon => setEditingArea({ ...editingArea, icon: newIcon || 'Armchair' })}
            accentColor={editingArea.color || '#6366f1'}
            quickPresets={AREA_ICON_OPTIONS}
            modalTitle={`Select Icon for Area: ${editingArea.name}`}
            modalSubtitle="Choose any Phosphor icon for this living space"
          />
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Accent Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEditingArea({ ...editingArea, color: c })}
                  className={`w-7 h-7 rounded-full border-2 ${editingArea.color === c ? 'scale-110 border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setEditingArea(null)} className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-white/10">Cancel</button>
          <button
            type="button"
            onClick={async () => {
              updateArea(editingArea.area_id, { icon: editingArea.icon, color: editingArea.color });
              await updateConfig(prev => ({
                ...prev,
                rooms: {
                  ...(prev.rooms || {}),
                  areaOverrides: {
                    ...(prev.rooms?.areaOverrides || {}),
                    [editingArea.area_id]: {
                      ...(prev.rooms?.areaOverrides?.[editingArea.area_id] || {}),
                      icon: editingArea.icon,
                      customIcon: editingArea.icon,
                      color: editingArea.color,
                      customColor: editingArea.color,
                      name: editingArea.name
                    }
                  }
                },
                areas: {
                  ...(prev.areas || {}),
                  [editingArea.area_id]: {
                    ...(prev.areas?.[editingArea.area_id] || {}),
                    icon: editingArea.icon,
                    customIcon: editingArea.icon,
                    color: editingArea.color,
                    customColor: editingArea.color,
                    name: editingArea.name
                  }
                }
              }));
              await flushPendingSave();
              setEditingArea(null);
              addToast?.({ type: 'success', title: 'Area Saved', message: `Updated ${editingArea.name} and synced to NAS.` });
            }}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-500 text-white cursor-pointer hover:bg-indigo-400 transition-colors"
          >
            Save
          </button>
        </div>
      </DialogShell>
  );
}
