/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Lightbulb, ToggleRight, Fan, DoorOpen, FrameCorners, ShieldCheck, Power, MusicNotes, PersonSimpleWalk, Drop, Flame, Broom, PencilSimpleLine, ArrowCounterClockwise, CheckCircle, Eye, EyeSlash, House, SquaresFour, Plus, PlusCircle } from '@phosphor-icons/react';
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { OverviewTileVisibilityMode } from '../../types/userConfig';
import OverviewSortableTile from './OverviewSortableTile';
import PersonAvatar from '../ui/PersonAvatar';
import AdaptiveSectionTabs from '../common/AdaptiveSectionTabs';
import CameraStreamModal from '../views/security/CameraStreamModal';
import OverviewTileContent from './tiles/OverviewTileContent';
import { useOverviewHeaderState } from './useOverviewHeaderState';


// Lazy-loaded interactive slide-over drawers (loaded on first open)
const UsersPresenceModal = React.lazy(() => import('./modals/UsersPresenceModal'));
const LightsOverviewModal = React.lazy(() => import('./modals/LightsOverviewModal'));
const SwitchesOverviewModal = React.lazy(() => import('./modals/SwitchesOverviewModal'));
const FansOverviewModal = React.lazy(() => import('./modals/FansOverviewModal'));
const OpeningsOverviewModal = React.lazy(() => import('./modals/OpeningsOverviewModal'));
const AlarmKeypadModal = React.lazy(() => import('./modals/AlarmKeypadModal'));
const ArmAwayConfirmModal = React.lazy(() => import('./modals/ArmAwayConfirmModal'));
const MediaOverviewDrawer = React.lazy(() => import('./modals/MediaOverviewDrawer'));
const SensorsOverviewDrawer = React.lazy(() => import('./modals/SensorsOverviewDrawer'));
const VacuumsOverviewDrawer = React.lazy(() => import('./modals/VacuumsOverviewDrawer'));
const WeatherOverviewDrawer = React.lazy(() => import('../weather/WeatherOverviewDrawer'));
const WidgetsDrawer = React.lazy(() => import('./modals/WidgetsDrawer'));

interface OverviewHeaderProps {
  darkMode?: boolean;
}

export default function OverviewHeader({ darkMode = true }: OverviewHeaderProps) {
  const s = useOverviewHeaderState(darkMode);
  const {
    activeFans,
    activeId,
    activeLeaks,
    activeMedia,
    activeMotion,
    activeOverviewTab,
    activeSmoke,
    activeVacuums,
    activeZoneUsers,
    alarmDetails,
    alarmEntity,
    currentTileOrder,
    displayTiles,
    doorSensors,
    drawerOpen,
    fanEntities,
    flushPendingSave,
    getPersonZoneDetails,
    getTileClickHandler,
    handleAddAllWidgets,
    handleAddWidget,
    handleConfirmArmAway,
    handleDragCancel,
    handleDragEnd,
    handleDragStart,
    handleMoveTile,
    handleRemoveWidget,
    handleResetLayout,
    handleSetTileMode,
    handleToggleBadges,
    handleToggleHiddenFromAll,
    handleToggleHide,
    handleToggleSize,
    hasAnyActiveBadge,
    hiddenFromAllSet,
    hiddenTilesSet,
    hideBadges,
    isAlarmArmed,
    isArmAwayModalOpen,
    isCameraModalOpen,
    isEditMode,
    isPlayingMedia,
    isVacuumCleaning,
    isWidgetDrawerOpen,
    leakSensors,
    lightEntities,
    mediaEntities,
    motionSensors,
    onLights,
    onSwitches,
    openDoors,
    openDoorsDrawer,
    openSensorsDrawer,
    openUsersDrawer,
    openWindows,
    openWindowsDrawer,
    openedDrawers,
    openingsTab,
    otherContactSensors,
    overviewTabs,
    playingMediaEntities,
    playingSongTitle,
    selectedCameraForModal,
    selectedUser,
    sensors,
    sensorsTab,
    setActiveOverviewTab,
    setDrawerOpen,
    setEditMode,
    setIsArmAwayModalOpen,
    setIsCameraModalOpen,
    setIsWidgetDrawerOpen,
    smokeSensors,
    switchEntities,
    tileSizes,
    updateEntityState,
    userEntities,
    vacuumEntities,
    windowSensors
  } = s;
  let activeOverlayChild: React.ReactNode = null;

  return (
    <section aria-label="House Telemetry and Fast Controls" className="space-y-4 mb-6">
      {/* ============================================================= */}
      {/* 1. STATUS PILLS BAR (ONLY ACTIVE BADGES IN EXACT ORDER)      */}
      {/* ============================================================= */}
      {!hideBadges && hasAnyActiveBadge ? (
        <div className="flex flex-wrap items-center gap-2 animate-fadeIn">
          {/* 1.1 USERS IN KNOWN ZONES (HOME & KNOWN ZONES) */}
          {activeZoneUsers.map((user) => {
            const firstName = user.name.split(' ')[0];
            const { isHome, zoneName } = getPersonZoneDetails(user);

            return (
              <button
                key={user.entity_id}
                type="button"
                onClick={() => openUsersDrawer(user)}
                className={`h-8.5 pl-1 pr-2.5 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs select-none whitespace-nowrap shrink-0 ${
                  isHome
                    ? darkMode
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-emerald-500/15 text-emerald-800'
                    : darkMode
                    ? 'bg-sky-500/15 text-sky-300'
                    : 'bg-sky-500/15 text-sky-800'
                }`}
                title={`${user.name}: ${isHome ? 'At Home' : `In ${zoneName} Zone`}`}
              >
                <PersonAvatar
                  name={user.name}
                  entity_picture={user.attributes?.entity_picture}
                  state={user.state}
                  isHome={isHome}
                  inZone={!isHome}
                  size="sm"
                  showPresenceDot={false}
                  className="w-6 h-6 shrink-0"
                />
                <span className="whitespace-nowrap">
                  {isHome ? firstName : `${firstName} (${zoneName})`}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isHome ? 'bg-emerald-500' : 'bg-sky-500'}`} />
              </button>
            );
          })}

          {/* 1.2 LIGHTS BADGE (ONLY WHEN ACTIVE) */}
          {onLights.length > 0 && (
            <button
              type="button"
              onClick={() => setDrawerOpen('lights')}
              className={`h-8.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
                darkMode
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-amber-500/15 text-amber-900'
              }`}
            >
              <Lightbulb size={16} weight="fill" className="text-amber-500 shrink-0" />
              <span className="whitespace-nowrap">{onLights.length} Lights</span>
            </button>
          )}

          {/* 1.3 SWITCHES BADGE (ONLY WHEN ACTIVE) */}
          {onSwitches.length > 0 && (
            <button
              type="button"
              onClick={() => setDrawerOpen('switches')}
              className={`h-8.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
                darkMode
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-emerald-500/15 text-emerald-900'
              }`}
            >
              <ToggleRight size={16} weight="duotone" className="text-emerald-500 shrink-0" />
              <span className="whitespace-nowrap">{onSwitches.length} Switches</span>
            </button>
          )}

          {/* 1.4 FANS BADGE (ONLY WHEN ACTIVE) */}
          {activeFans.length > 0 && (
            <button
              type="button"
              onClick={() => setDrawerOpen('fans')}
              className={`h-8.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
                darkMode
                  ? 'bg-cyan-500/15 text-cyan-300'
                  : 'bg-cyan-500/15 text-cyan-900'
              }`}
            >
              <Fan size={16} weight="duotone" className="text-cyan-500 shrink-0 animate-spin" style={{ animationDuration: '3s' }} />
              <span className="whitespace-nowrap">{activeFans.length} Fans</span>
            </button>
          )}

          {/* 1.5 VACUUM ROBOTS BADGE (ONLY WHEN CLEANING) */}
          {isVacuumCleaning && (
            <button
              type="button"
              onClick={() => setDrawerOpen('vacuums')}
              className={`h-8.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
                darkMode
                  ? 'bg-teal-500/15 text-teal-300'
                  : 'bg-teal-500/15 text-teal-900'
              }`}
            >
              <Broom size={16} weight="duotone" className="text-teal-500 shrink-0" />
              <span className="whitespace-nowrap">{activeVacuums.length} Cleaning</span>
            </button>
          )}

          {/* 1.6 ALARM BADGE (ONLY WHEN ARMED) */}
          {isAlarmArmed && (
            <button
              type="button"
              onClick={() => setDrawerOpen('alarm')}
              className={`h-8.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
                alarmDetails.bg
              } ${alarmDetails.text}`}
            >
              <ShieldCheck size={16} weight="duotone" className="shrink-0" />
              <span className="whitespace-nowrap">{alarmDetails.label}</span>
            </button>
          )}

          {/* 1.7 DOORS BADGE (ONLY WHEN OPEN) */}
          {openDoors.length > 0 && (
            <button
              type="button"
              onClick={openDoorsDrawer}
              className={`h-8.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
                darkMode
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-amber-500/15 text-amber-900'
              }`}
            >
              <DoorOpen size={16} weight="duotone" className="text-amber-500 shrink-0" />
              <span className="whitespace-nowrap">{openDoors.length} Doors</span>
            </button>
          )}

          {/* 1.8 WINDOWS BADGE (ONLY WHEN OPEN) */}
          {openWindows.length > 0 && (
            <button
              type="button"
              onClick={openWindowsDrawer}
              className={`h-8.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
                darkMode
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-amber-500/15 text-amber-900'
              }`}
            >
              <FrameCorners size={16} weight="duotone" className="text-amber-500 shrink-0" />
              <span className="whitespace-nowrap">{openWindows.length} Windows</span>
            </button>
          )}

          {/* 1.9 MOTION BADGE (ONLY WHEN DETECTED) */}
          {activeMotion.length > 0 && (
            <button
              type="button"
              onClick={() => openSensorsDrawer('motion')}
              className={`h-8.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
                darkMode
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-amber-500/15 text-amber-900'
              }`}
            >
              <PersonSimpleWalk size={16} weight="duotone" className="text-amber-500 shrink-0" />
              <span className="whitespace-nowrap">{activeMotion.length} Motion</span>
            </button>
          )}

          {/* 1.10 LEAKAGE BADGE (ONLY WHEN DETECTED) */}
          {activeLeaks.length > 0 && (
            <button
              type="button"
              onClick={() => openSensorsDrawer('leak')}
              className={`h-8.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
                darkMode
                  ? 'bg-rose-500/15 text-rose-300'
                  : 'bg-rose-500/15 text-rose-900'
              }`}
            >
              <Drop size={16} weight="duotone" className="text-rose-500 shrink-0 animate-pulse" />
              <span className="whitespace-nowrap">{activeLeaks.length} Leaks</span>
            </button>
          )}

          {/* 1.11 SMOKE BADGE (ONLY WHEN DETECTED) */}
          {activeSmoke.length > 0 && (
            <button
              type="button"
              onClick={() => openSensorsDrawer('smoke')}
              className={`h-8.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 ${
                darkMode
                  ? 'bg-rose-500/15 text-rose-300'
                  : 'bg-rose-500/15 text-rose-900'
              }`}
            >
              <Flame size={16} weight="duotone" className="text-rose-500 shrink-0 animate-pulse" />
              <span className="whitespace-nowrap">{activeSmoke.length} Smoke</span>
            </button>
          )}

          {/* 1.12 AUDIO / MEDIA BADGE (ALWAYS AT THE END - CAN BE LONG & OCCUPY FULL ROW) */}
          {isPlayingMedia && (
            <button
              type="button"
              onClick={() => setDrawerOpen('media')}
              className={`h-8.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs max-w-full shrink-0 ${
                darkMode
                  ? 'bg-purple-500/15 text-purple-300'
                  : 'bg-purple-500/15 text-purple-900'
              }`}
              title={
                playingMediaEntities.length === 1
                  ? `Playing: ${playingSongTitle || 'Audio'}`
                  : `${playingMediaEntities.length} speakers currently playing`
              }
            >
              <MusicNotes size={16} weight="duotone" className="text-purple-500 shrink-0" />
              <span className="truncate max-w-[260px] sm:max-w-xs md:max-w-md">
                {playingMediaEntities.length === 1
                  ? (playingSongTitle || 'Playing Audio')
                  : `${playingMediaEntities.length} Playing`}
              </span>
            </button>
          )}
        </div>
      ) : isEditMode && hideBadges ? (
        <div className="w-full px-3.5 py-2.5 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <EyeSlash size={15} weight="bold" className="shrink-0" />
            <span className="font-semibold">Overview status badges are hidden</span>
          </div>
          <button
            type="button"
            onClick={handleToggleBadges}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/30 transition-all cursor-pointer"
          >
            Show Badges
          </button>
        </div>
      ) : null}

      {/* Overview Category Tabs (All, Lights, Energy, Security, Climate, etc.) */}
      <div className="w-full flex items-center justify-between gap-3 pt-0.5 animate-fadeIn">
        <AdaptiveSectionTabs
          tabs={overviewTabs}
          activeTab={activeOverviewTab}
          onChange={(tabId) => setActiveOverviewTab(tabId)}
          darkMode={darkMode}
        />
      </div>

      {/* Overview Customization Header / Action Banner */}
      {isEditMode ? (
        <div className="w-full p-3 sm:p-3.5 rounded-2xl bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/30 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <PencilSimpleLine size={18} weight="bold" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Customize Overview Tiles</span>
                <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-300">
                  Edit Mode
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400">
                Drag or use arrows to reorganize • Toggle 1×/2× width • Tap eye to show or hide
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Add Widgets Button */}
            <button
              type="button"
              onClick={() => setIsWidgetDrawerOpen(true)}
              className="h-7 px-3 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              title="Open widget library to add or customize widgets"
            >
              <PlusCircle size={14} weight="bold" />
              <span>Add Widgets</span>
              {hiddenTilesSet.size > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[11px] font-black">
                  +{hiddenTilesSet.size}
                </span>
              )}
            </button>

            {/* Badges visibility toggle */}
            <button
              type="button"
              onClick={handleToggleBadges}
              className={`h-7 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                hideBadges
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                  : 'bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300'
              }`}
              title={hideBadges ? 'Show overview status badges' : 'Hide overview status badges'}
            >
              {hideBadges ? <Eye size={13} weight="bold" /> : <EyeSlash size={13} weight="bold" />}
              <span>{hideBadges ? 'Show Badges' : 'Hide Badges'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetLayout}
              className="h-7 px-2.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 transition-all cursor-pointer flex items-center gap-1.5"
              title="Reset tiles to default order and 1x width"
            >
              <ArrowCounterClockwise size={13} weight="bold" />
              <span>Reset Layout</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                setEditMode(false);
                await flushPendingSave();
              }}
              className="h-7 px-3 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <CheckCircle size={14} weight="bold" />
              <span>Done</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* ============================================================= */}
      {/* 2. BENTO TILES GRID (BORDERLESS 4-COLS MOBILE / ADAPTIVE)    */}
      {/* ============================================================= */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={displayTiles} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {displayTiles.map((tileId, index) => {
              const isHidden = hiddenTilesSet.has(tileId);
              const isHiddenFromAll = hiddenFromAllSet.has(tileId);
              const tileVisibilityMode: OverviewTileVisibilityMode = isHidden
                ? 'all_off'
                : isHiddenFromAll
                ? 'tab_only'
                : 'all_on';
              const is2x = tileSizes[tileId] === '2x' || (tileSizes[tileId] === undefined && (tileId === 'weather' || tileId === 'weather_hourly'));
              const canMoveLeft = index > 0;
              const canMoveRight = index < displayTiles.length - 1;

              const tileElement = (
                <OverviewSortableTile
                  key={tileId}
                  id={tileId}
                  isEditMode={isEditMode}
                  visibilityMode={tileVisibilityMode}
                  isHidden={isHidden}
                  isHiddenFromAll={isHiddenFromAll}
                  is2x={is2x}
                  canMoveLeft={canMoveLeft}
                  canMoveRight={canMoveRight}
                  onMoveLeft={() => handleMoveTile(tileId, 'left')}
                  onMoveRight={() => handleMoveTile(tileId, 'right')}
                  onToggleHide={() => handleToggleHide(tileId)}
                  onToggleSize={() => handleToggleSize(tileId)}
                  onToggleHiddenFromAll={() => handleToggleHiddenFromAll(tileId)}
                  onSetVisibilityMode={(mode) => handleSetTileMode(tileId, mode)}
                  onClick={getTileClickHandler(tileId)}
                >
                  <OverviewTileContent s={s} tileId={tileId} is2x={is2x} />
                </OverviewSortableTile>
              );

              if (activeId === tileId) {
                activeOverlayChild = React.cloneElement(tileElement, { isOverlay: true });
              }

              return tileElement;
            })}

            {displayTiles.length === 0 && (
              <div className="col-span-full w-full py-16 flex flex-col items-center justify-center text-center p-6 rounded-3xl bg-slate-100/50 dark:bg-white/[0.02] border border-dashed border-slate-300/80 dark:border-white/10">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center mb-3">
                  <SquaresFour size={24} weight="duotone" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                  No widgets on this view
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  Add widgets from the library or switch tabs to see your active dashboard cards.
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsWidgetDrawerOpen(true)}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-sky-500 hover:bg-sky-400 text-white transition-all cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95"
                  >
                    <Plus size={14} weight="bold" />
                    <span>Add Widgets</span>
                  </button>
                  {activeOverviewTab !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setActiveOverviewTab('all')}
                      className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                    >
                      View All
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </SortableContext>

        {/* Elevated Floating Drag Preview Overlay */}
        <DragOverlay
          dropAnimation={{
            duration: 180,
            easing: 'cubic-bezier(0.2, 0, 0, 1)'
          }}
        >
          {activeId && activeOverlayChild ? (
            <div className="w-full h-full pointer-events-none scale-[1.03] shadow-2xl shadow-sky-500/30 ring-2 ring-sky-400 rounded-3xl opacity-95">
              {activeOverlayChild}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ============================================================= */}
      {/* 3. SLIDE-OVER RIGHT SIDEBARS                                  */}
      {/* ============================================================= */}
      <React.Suspense fallback={null}>
        {isWidgetDrawerOpen && (
          <WidgetsDrawer
            isOpen={isWidgetDrawerOpen}
            onClose={() => setIsWidgetDrawerOpen(false)}
            activeTileIds={currentTileOrder}
            hiddenTileIds={Array.from(hiddenTilesSet)}
            hiddenFromAllTileIds={Array.from(hiddenFromAllSet)}
            onAddWidget={handleAddWidget}
            onRemoveWidget={handleRemoveWidget}
            onToggleHiddenFromAll={handleToggleHiddenFromAll}
            onSetTileMode={handleSetTileMode}
            onAddAllWidgets={handleAddAllWidgets}
            onResetWidgets={handleResetLayout}
            darkMode={darkMode}
          />
        )}
        {openedDrawers['weather'] && (
          <WeatherOverviewDrawer
            isOpen={drawerOpen === 'weather'}
            onClose={() => setDrawerOpen(null)}
            darkMode={darkMode}
          />
        )}

        {openedDrawers['vacuums'] && (
          <VacuumsOverviewDrawer
            isOpen={drawerOpen === 'vacuums'}
            onClose={() => setDrawerOpen(null)}
            vacuums={vacuumEntities}
            darkMode={darkMode}
          />
        )}

        {openedDrawers['users'] && (
          <UsersPresenceModal
            isOpen={drawerOpen === 'users'}
            onClose={() => setDrawerOpen(null)}
            users={userEntities}
            selectedUser={selectedUser}
            darkMode={darkMode}
          />
        )}

        {openedDrawers['lights'] && (
          <LightsOverviewModal
            isOpen={drawerOpen === 'lights'}
            onClose={() => setDrawerOpen(null)}
            lights={lightEntities}
            onUpdateEntity={updateEntityState}
            darkMode={darkMode}
          />
        )}

        {openedDrawers['switches'] && (
          <SwitchesOverviewModal
            isOpen={drawerOpen === 'switches'}
            onClose={() => setDrawerOpen(null)}
            switches={switchEntities}
            onUpdateEntity={updateEntityState}
            darkMode={darkMode}
          />
        )}

        {openedDrawers['fans'] && (
          <FansOverviewModal
            isOpen={drawerOpen === 'fans'}
            onClose={() => setDrawerOpen(null)}
            fans={fanEntities}
            onUpdateEntity={updateEntityState}
            darkMode={darkMode}
          />
        )}

        {(openedDrawers['doors'] || openedDrawers['windows']) && (
          <OpeningsOverviewModal
            isOpen={drawerOpen === 'doors' || drawerOpen === 'windows'}
            onClose={() => setDrawerOpen(null)}
            doorSensors={doorSensors}
            windowSensors={windowSensors}
            otherContactSensors={otherContactSensors}
            initialTab={openingsTab}
            darkMode={darkMode}
          />
        )}

        {openedDrawers['sensors'] && (
          <SensorsOverviewDrawer
            isOpen={drawerOpen === 'sensors'}
            onClose={() => setDrawerOpen(null)}
            motionSensors={motionSensors}
            leakSensors={leakSensors}
            smokeSensors={smokeSensors}
            initialTab={sensorsTab}
            darkMode={darkMode}
          />
        )}

        {openedDrawers['alarm'] && (
          <AlarmKeypadModal
            isOpen={drawerOpen === 'alarm'}
            onClose={() => setDrawerOpen(null)}
            alarmEntity={alarmEntity}
            onUpdateEntity={updateEntityState}
            darkMode={darkMode}
          />
        )}

        {isArmAwayModalOpen && (
          <ArmAwayConfirmModal
            isOpen={isArmAwayModalOpen}
            onClose={() => setIsArmAwayModalOpen(false)}
            onConfirm={handleConfirmArmAway}
            alarmName={alarmEntity?.name || alarmEntity?.attributes?.friendly_name || 'Security Guard'}
            darkMode={darkMode}
          />
        )}

        {openedDrawers['media'] && (
          <MediaOverviewDrawer
            isOpen={drawerOpen === 'media'}
            onClose={() => setDrawerOpen(null)}
            mediaPlayers={mediaEntities}
            activeEntity={activeMedia}
            onUpdateEntity={(entityId, newState, attrs) => {
              updateEntityState(entityId, newState, attrs);
            }}
            darkMode={darkMode}
          />
        )}

        {isCameraModalOpen && (
          <CameraStreamModal
            isOpen={isCameraModalOpen}
            onClose={() => setIsCameraModalOpen(false)}
            camera={selectedCameraForModal}
            darkMode={darkMode}
          />
        )}
      </React.Suspense>
    </section>
  );
}
