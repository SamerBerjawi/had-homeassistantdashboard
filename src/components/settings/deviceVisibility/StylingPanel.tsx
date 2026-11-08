/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HouseLine, PaintBrush, Armchair } from '@phosphor-icons/react';
import type { DeviceVisibilityState } from './useDeviceVisibilityState';

export default function StylingPanel({ s }: { s: DeviceVisibilityState }) {
  const {
    areas,
    floors,
    renderIconByName,
    setEditingArea,
    setEditingFloor
  } = s;
  return (
    <div className="space-y-6">
      {floors.map(floor => {
        const floorRooms = areas.filter(a => a.floor_id === floor.floor_id);

        return (
          <div
            key={floor.floor_id}
            className="rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/2 overflow-hidden shadow-xs space-y-3"
          >
            {/* Floor Header Bar with Floor Customization Trigger */}
            <div className="p-4 sm:p-5 bg-slate-100/90 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xs shrink-0"
                  style={{
                    backgroundColor: `${floor.color || '#0ea5e9'}1a`,
                    borderColor: `${floor.color || '#0ea5e9'}40`,
                    color: floor.color || '#0ea5e9'
                  }}
                >
                  {renderIconByName(floor.icon || 'Stairs', 22)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      {floor.name}
                    </h4>
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                      Level {floor.level ?? 0}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {floorRooms.length} Living Area{floorRooms.length === 1 ? '' : 's'} assigned
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingFloor(floor)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-white/10 hover:bg-sky-50 dark:hover:bg-sky-500/20 text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs"
              >
                <PaintBrush size={16} weight="bold" />
                <span>Customize Floor</span>
              </button>
            </div>

            {/* Rooms Grid inside Floor */}
            <div className="p-4 sm:p-5 pt-1">
              {floorRooms.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 italic rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                  No rooms assigned to {floor.name} yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {floorRooms.map(area => (
                    <div
                      key={area.area_id}
                      className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/4 flex items-center justify-between shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 shadow-2xs"
                          style={{
                            backgroundColor: `${area.color || '#6366f1'}1a`,
                            borderColor: `${area.color || '#6366f1'}40`,
                            color: area.color || '#6366f1'
                          }}
                        >
                          {renderIconByName(area.icon || 'Armchair', 20)}
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                            {area.name}
                          </h5>
                          <span className="text-xs font-mono text-slate-400 truncate block">
                            {area.area_id}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditingArea(area)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-white/10 dark:hover:bg-indigo-500/20 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-white/10 transition-all cursor-pointer shadow-2xs shrink-0 ml-2"
                      >
                        <PaintBrush size={14} weight="bold" />
                        <span>Style</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* 2. UNASSIGNED FLOOR ROOMS */}
      {areas.filter(a => !a.floor_id).length > 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-white/15 bg-slate-50/30 dark:bg-white/1 overflow-hidden shadow-xs space-y-3">
          <div className="p-4 sm:p-5 bg-slate-100/70 dark:bg-white/4 border-b border-slate-200 dark:border-white/10 flex items-center gap-3">
            <HouseLine size={24} weight="duotone" className="text-slate-400 shrink-0" />
            <div>
              <h4 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-200">
                Unassigned Floor Rooms ({areas.filter(a => !a.floor_id).length})
              </h4>
              <span className="text-xs text-slate-500 font-medium">
                Rooms without an assigned floor in Home Assistant
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-5 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {areas.filter(a => !a.floor_id).map(area => (
              <div
                key={area.area_id}
                className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/4 flex items-center justify-between shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 shadow-2xs"
                    style={{
                      backgroundColor: `${area.color || '#6366f1'}1a`,
                      borderColor: `${area.color || '#6366f1'}40`,
                      color: area.color || '#6366f1'
                    }}
                  >
                    {renderIconByName(area.icon || 'Armchair', 20)}
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                      {area.name}
                    </h5>
                    <span className="text-xs font-mono text-slate-400 truncate block">
                      {area.area_id}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingArea(area)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-white/10 dark:hover:bg-indigo-500/20 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-white/10 transition-all cursor-pointer shadow-2xs shrink-0 ml-2"
                >
                  <PaintBrush size={14} weight="bold" />
                  <span>Style</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
