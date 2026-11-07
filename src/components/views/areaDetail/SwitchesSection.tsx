/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Plug, AppWindow, Power, Lock, LockOpen, CaretRight } from '@phosphor-icons/react';
import { formatEntityDisplayName, formatRelativeTime } from '../../../lib/utils';
import SortableGrid from '../../layout/SortableGrid';
import GridTile from '../../layout/GridTile';
import { TelemetryLine } from '../../common/TelemetryBadge';
import SwitchTile from '../../tiles/SwitchTile';
import CompactTile from '../../tiles/CompactTile';
import { detectLockCapabilities } from '../../../services/lockClassification';
import type { AreaDetailState } from './useAreaDetailState';

export default function SwitchesSection({ s }: { s: AreaDetailState }) {
  const {
    activeSwitchesCount,
    area,
    darkMode,
    enrichedCovers,
    enrichedLocks,
    enrichedSwitches,
    getTileSpan,
    handleCoverCommand,
    handleToggleAllSwitches,
    handleToggleSwitch,
    onToggleLocks,
    openEntityDetails,
    sortedCovers,
    sortedLocks,
    sortedSwitches,
    switchLockCoverSpans,
    unlockedLocksCount
  } = s;
  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2">
          <Plug size={20} weight="duotone" className="text-indigo-500 dark:text-indigo-400" />
          <h3 className={`text-base font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Switches, Outlets & Access
          </h3>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            ({enrichedSwitches.length + enrichedLocks.length + enrichedCovers.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {enrichedSwitches.length > 0 && (
            <button
              type="button"
              onClick={handleToggleAllSwitches}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-sm ${
                darkMode
                  ? 'bg-white/5 hover:bg-white/10 text-slate-300'
                  : 'bg-white/95 hover:bg-white text-slate-800'
              }`}
            >
              <Power size={14} weight="bold" />
              <span>{activeSwitchesCount > 0 ? 'All Off' : 'All On'}</span>
            </button>
          )}
          {enrichedLocks.length > 0 && onToggleLocks && (
            <button
              type="button"
              onClick={() => onToggleLocks(area.areaId)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-sm ${
                unlockedLocksCount > 0
                  ? darkMode
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-amber-100 text-amber-950'
                  : darkMode
                  ? 'bg-white/5 hover:bg-white/10 text-slate-300'
                  : 'bg-white/95 hover:bg-white text-slate-800'
              }`}
            >
              <Lock size={14} weight="bold" />
              <span>{unlockedLocksCount > 0 ? 'Lock All' : 'Unlock All'}</span>
            </button>
          )}
        </div>
      </div>

      <SortableGrid items={[...sortedSwitches.map((s) => s.entity_id), ...sortedLocks.map((l) => l.entity_id), ...sortedCovers.map((c) => c.entity_id)]}>
        {sortedSwitches.map((sw) => {
          const isUnavailable = sw.state === 'unavailable' || sw.state === 'unknown';
          const span = getTileSpan(sw.entity_id, switchLockCoverSpans, 1);
          return (
            <GridTile
              key={sw.entity_id}
              id={sw.entity_id}
              colSpan={span.colSpan}
              rowSpan={span.rowSpan}
              tabletColSpan={span.tabletColSpan}
              desktopColSpan={span.desktopColSpan}
              colStart={span.colStart}
              tabletColStart={span.tabletColStart}
              desktopColStart={span.desktopColStart}
              isUnavailable={isUnavailable}
              onLongPress={() => openEntityDetails(sw.entity_id)}
            >
              <SwitchTile
                entity={sw}
                areaName={area.name}
                darkMode={darkMode}
                onToggle={handleToggleSwitch}
                onChevronClick={() => openEntityDetails(sw.entity_id)}
                onContextMenu={() => openEntityDetails(sw.entity_id)}
              />
            </GridTile>
          );
        })}

        {sortedLocks.map((lock) => {
          const isUnavailable = lock.state === 'unavailable' || lock.state === 'unknown';
          const caps = detectLockCapabilities(lock);
          const isLocked = caps.isLocked;
          const rawBattery = lock.attributes?.battery_level ?? lock.attributes?.battery;
          const lastChanged = formatRelativeTime(lock.last_changed || lock.last_updated);
          
          const subtitle = (
            <TelemetryLine
              items={[
                isLocked ? 'Locked' : 'Unlocked',
                rawBattery !== undefined ? { isBattery: true, batteryLevel: Math.round(rawBattery) } : null,
                lastChanged || null
              ]}
            />
          );

          const span = getTileSpan(lock.entity_id, switchLockCoverSpans, 1);
          return (
            <GridTile
              key={lock.entity_id}
              id={lock.entity_id}
              colSpan={span.colSpan}
              rowSpan={span.rowSpan}
              tabletColSpan={span.tabletColSpan}
              desktopColSpan={span.desktopColSpan}
              colStart={span.colStart}
              tabletColStart={span.tabletColStart}
              desktopColStart={span.desktopColStart}
              isUnavailable={isUnavailable}
              onLongPress={() => openEntityDetails(lock.entity_id)}
            >
              <CompactTile
                darkMode={darkMode}
                title={formatEntityDisplayName(lock.name, area.name)}
                subtitle={subtitle}
                isActive={!isLocked}
                accentColor={isLocked ? '#10b981' : '#f59e0b'}
                activeBorderColor={isLocked ? 'border-emerald-500/40' : 'border-amber-400/50'}
                onIconClick={() => openEntityDetails(lock.entity_id)}
                icon={
                  isLocked ? (
                    <Lock size={22} weight="fill" className="text-emerald-500 dark:text-emerald-400" />
                  ) : (
                    <LockOpen size={22} weight="bold" className="text-amber-500 dark:text-amber-400 animate-pulse" />
                  )
                }
                actionButton={
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEntityDetails(lock.entity_id);
                      }}
                      className={`h-8 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1 shrink-0 ${
                        isLocked
                          ? darkMode
                            ? 'bg-white/10 hover:bg-white/15 text-slate-300'
                            : 'bg-slate-900/[0.04] hover:bg-slate-900/[0.08] text-slate-700'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-xs'
                      }`}
                      title="Open Lock Controls"
                    >
                      <span>{isLocked ? 'Locked' : 'Unlocked'}</span>
                      <CaretRight size={14} weight="bold" />
                    </button>
                  </div>
                }
                onClick={() => openEntityDetails(lock.entity_id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openEntityDetails(lock.entity_id);
                }}
              />
            </GridTile>
          );
        })}

        {sortedCovers.map((cover) => {
          const isUnavailable = cover.state === 'unavailable' || cover.state === 'unknown';
          const pos = cover.attributes?.current_position;
          const rawBattery = cover.attributes?.battery_level ?? cover.attributes?.battery;
          const lastChanged = formatRelativeTime(cover.last_changed || cover.last_updated);
          
          const subtitle = (
            <TelemetryLine
              items={[
                pos !== undefined ? `${pos}% Open` : (cover.state || 'Closed'),
                rawBattery !== undefined ? { isBattery: true, batteryLevel: Math.round(rawBattery) } : null,
                lastChanged || null
              ]}
            />
          );

          const span = getTileSpan(cover.entity_id, switchLockCoverSpans, 1);
          return (
            <GridTile
              key={cover.entity_id}
              id={cover.entity_id}
              colSpan={span.colSpan}
              rowSpan={span.rowSpan}
              tabletColSpan={span.tabletColSpan}
              desktopColSpan={span.desktopColSpan}
              colStart={span.colStart}
              tabletColStart={span.tabletColStart}
              desktopColStart={span.desktopColStart}
              isUnavailable={isUnavailable}
              onLongPress={() => openEntityDetails(cover.entity_id)}
            >
              <CompactTile
                darkMode={darkMode}
                title={formatEntityDisplayName(cover.name, area.name)}
                subtitle={subtitle}
                icon={<AppWindow size={22} weight="duotone" className="text-purple-500 dark:text-purple-400" />}
                actionButton={
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleCoverCommand(cover, 'open_cover')}
                      className={`h-8 px-2.5 rounded-lg text-xs font-bold cursor-pointer active:scale-95 ${
                        darkMode ? 'bg-white/10 hover:bg-white/20 text-slate-200' : 'bg-slate-900/[0.04] hover:bg-slate-900/[0.08] text-slate-800'
                      }`}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCoverCommand(cover, 'close_cover')}
                      className={`h-8 px-2.5 rounded-lg text-xs font-bold cursor-pointer active:scale-95 ${
                        darkMode ? 'bg-white/10 hover:bg-white/20 text-slate-200' : 'bg-slate-900/[0.04] hover:bg-slate-900/[0.08] text-slate-800'
                      }`}
                    >
                      Close
                    </button>
                    <div
                      onClick={() => openEntityDetails(cover.entity_id)}
                      className="p-1.5 -mr-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
                      title="Open Device Details"
                     role="button" tabIndex={0} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.currentTarget.click(); } }}>
                      <CaretRight size={16} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                }
                onContextMenu={(e) => {
                  e.preventDefault();
                  openEntityDetails(cover.entity_id);
                }}
              />
            </GridTile>
          );
        })}
      </SortableGrid>
    </section>
  );
}
