/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import DialogShell from '../../ui/DialogShell';
import { Tag, ShieldCheck } from '@phosphor-icons/react';
import IconPickerField from '../../ui/IconPickerField';
import { PRESET_COLORS } from './shared';
import type { DeviceVisibilityState } from './useDeviceVisibilityState';

export default function EditLabelModal({ s }: { s: DeviceVisibilityState }) {
  const {
    addToast,
    editingLabel,
    flushPendingSave,
    setEditingLabel,
    updateConfig,
    updateLabel
  } = s;
  if (!editingLabel) return null;
  return (
    <DialogShell label="Edit label style" onClose={() => setEditingLabel(null)} overlayClassName="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 space-y-4 shadow-2xl">
        <h4 className="text-base font-bold text-slate-900 dark:text-white">Edit Label Style: {editingLabel.name}</h4>
        <div className="space-y-3">
          <IconPickerField
            label="Label Icon"
            value={editingLabel.icon}
            defaultValue="Tag"
            onChange={newIcon => setEditingLabel({ ...editingLabel, icon: newIcon || 'Tag' })}
            accentColor={editingLabel.color || '#6366f1'}
            quickPresets={['Tag', 'Bookmark', 'Hash', 'Star', 'Heart', 'ShieldCheck', 'Flag', 'Sparkle']}
            modalTitle={`Select Icon for Label: ${editingLabel.name}`}
            modalSubtitle="Choose any Phosphor icon for this tag"
          />
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Accent Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEditingLabel({ ...editingLabel, color: c })}
                  className={`w-7 h-7 rounded-full border-2 ${editingLabel.color === c ? 'scale-110 border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setEditingLabel(null)} className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-white/10">Cancel</button>
          <button
            type="button"
            onClick={async () => {
              updateLabel(editingLabel.label_id, { icon: editingLabel.icon, color: editingLabel.color });
              await updateConfig(prev => ({
                ...prev,
                labels: {
                  ...(prev.labels || {}),
                  [editingLabel.label_id]: {
                    ...(prev.labels?.[editingLabel.label_id] || {}),
                    icon: editingLabel.icon,
                    color: editingLabel.color,
                    name: editingLabel.name
                  }
                }
              }));
              await flushPendingSave();
              setEditingLabel(null);
              addToast?.({ type: 'success', title: 'Label Saved', message: `Updated ${editingLabel.name} and synced to NAS.` });
            }}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-sky-500 text-white cursor-pointer hover:bg-sky-400 transition-colors"
          >
            Save
          </button>
        </div>
      </DialogShell>
  );
}
