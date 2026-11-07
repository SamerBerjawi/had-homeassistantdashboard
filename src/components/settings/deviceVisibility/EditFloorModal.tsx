/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import DialogShell from '../../ui/DialogShell';
import IconPickerField from '../../ui/IconPickerField';
import { FLOOR_ICON_OPTIONS, PRESET_COLORS } from './shared';
import type { DeviceVisibilityState } from './useDeviceVisibilityState';

export default function EditFloorModal({ s }: { s: DeviceVisibilityState }) {
  const {
    addToast,
    editingFloor,
    flushPendingSave,
    setEditingFloor,
    updateConfig,
    updateFloor
  } = s;
  if (!editingFloor) return null;
  return (
    <DialogShell label="Edit floor style" onClose={() => setEditingFloor(null)} overlayClassName="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 space-y-4 shadow-2xl">
        <h4 className="text-base font-bold text-slate-900 dark:text-white">Edit Floor Style: {editingFloor.name}</h4>
        <div className="space-y-3">
          <IconPickerField
            label="Floor Icon"
            value={editingFloor.icon}
            defaultValue="Stairs"
            onChange={newIcon => setEditingFloor({ ...editingFloor, icon: newIcon || 'Stairs' })}
            accentColor={editingFloor.color || '#0ea5e9'}
            quickPresets={FLOOR_ICON_OPTIONS}
            modalTitle={`Select Icon for Floor: ${editingFloor.name}`}
            modalSubtitle="Choose any Phosphor icon for this floor level"
          />
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Accent Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEditingFloor({ ...editingFloor, color: c })}
                  className={`w-7 h-7 rounded-full border-2 ${editingFloor.color === c ? 'scale-110 border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setEditingFloor(null)} className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-white/10">Cancel</button>
          <button
            type="button"
            onClick={async () => {
              updateFloor(editingFloor.floor_id, { icon: editingFloor.icon, color: editingFloor.color });
              await updateConfig(prev => ({
                ...prev,
                floors: {
                  ...(prev.floors || {}),
                  [editingFloor.floor_id]: {
                    ...(prev.floors?.[editingFloor.floor_id] || {}),
                    icon: editingFloor.icon,
                    color: editingFloor.color,
                    name: editingFloor.name
                  }
                }
              }));
              await flushPendingSave();
              setEditingFloor(null);
              addToast?.({ type: 'success', title: 'Floor Saved', message: `Updated ${editingFloor.name} and synced to NAS.` });
            }}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-sky-500 text-white cursor-pointer hover:bg-sky-400 transition-colors"
          >
            Save
          </button>
        </div>
      </DialogShell>
  );
}
