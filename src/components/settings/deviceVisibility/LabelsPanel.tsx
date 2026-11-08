/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Tag, PaintBrush } from '@phosphor-icons/react';
import DynamicPhosphorIcon from '../../ui/DynamicPhosphorIcon';
import type { DeviceVisibilityState } from './useDeviceVisibilityState';

export default function LabelsPanel({ s }: { s: DeviceVisibilityState }) {
  const {
    labels,
    resolvedEntities,
    setEditingLabel
  } = s;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {labels.map(lbl => {
        const count = Object.values(resolvedEntities).filter(e => (e.labels || []).includes(lbl.label_id) || (e.labels || []).includes(lbl.name)).length;
        return (
          <div key={lbl.label_id} className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 shadow-2xs"
                  style={{
                    backgroundColor: `${lbl.color || '#6366f1'}1a`,
                    borderColor: `${lbl.color || '#6366f1'}40`,
                    color: lbl.color || '#6366f1'
                  }}
                >
                  <DynamicPhosphorIcon name={lbl.icon || 'Tag'} size={18} weight="duotone" />
                </div>
                <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">{lbl.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingLabel(lbl)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-sky-50 dark:bg-white/10 dark:hover:bg-sky-500/20 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 border border-slate-200 dark:border-white/10 transition-all cursor-pointer shadow-2xs shrink-0"
              >
                <PaintBrush size={13} weight="bold" />
                <span>Style</span>
              </button>
            </div>
            <p className="text-xs text-slate-500">{lbl.description || 'Home Assistant Tag'}</p>
            <span className="text-xs font-mono text-slate-400 block pt-1 font-semibold">{count} tagged entities</span>
          </div>
        );
      })}
    </div>
  );
}
