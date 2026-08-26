/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import { useCanvasStore } from '../../store/useCanvasStore';
import { HAEntity } from '../../types';

import CanvasHeader from './CanvasHeader';
import CardShell from './CardShell';
import CardCatalogDrawer from './CardCatalogDrawer';
import PinLockModal from './PinLockModal';

// Domain Cards
import LightCard from './cards/LightCard';
import ClimateCard from './cards/ClimateCard';
import NordpoolCard from './cards/NordpoolCard';
import EVChargingCard from './cards/EVChargingCard';
import WeatherCard from './cards/WeatherCard';
import MediaPlayerCard from './cards/MediaPlayerCard';
import VacuumCard from './cards/VacuumCard';
import CameraCard from './cards/CameraCard';
import SensorMetricCard from './cards/SensorMetricCard';
import SwitchPlugCard from './cards/SwitchPlugCard';
import SecurityLockCard from './cards/SecurityLockCard';

// Detail Modals
import LightDetailModal from './modals/LightDetailModal';
import ClimateDetailModal from './modals/ClimateDetailModal';
import NordpoolDetailModal from './modals/NordpoolDetailModal';
import EVChargingDetailModal from './modals/EVChargingDetailModal';
import MediaDetailModal from './modals/MediaDetailModal';
import VacuumDetailModal from './modals/VacuumDetailModal';
import CameraDetailModal from './modals/CameraDetailModal';
import GenericDetailModal from './modals/GenericDetailModal';

interface TunetCanvasViewProps {
  entities: HAEntity[];
  darkMode: boolean;
  onUpdateEntity: (entityId: string, newState: string, attributes?: Record<string, any>) => void;
  onAddToast: (toast: any) => void;
}

export default function TunetCanvasView({
  entities,
  darkMode,
  onUpdateEntity,
  onAddToast
}: TunetCanvasViewProps) {
  const {
    profiles,
    activeProfileId,
    isEditMode,
    isLocked,
    pinCode,
    weatherBackdrop,
    activeModalCardId,
    isCatalogOpen,
    isPinModalOpen,
    pinModalMode,
    setActiveProfileId,
    createProfile,
    deleteProfile,
    updateLayout,
    addCard,
    updateCard,
    removeCard,
    duplicateCard,
    toggleEditMode,
    setPinCode,
    unlockWithPin,
    openPinModal,
    closePinModal,
    setWeatherBackdrop,
    openCardModal,
    closeCardModal,
    openCatalog,
    closeCatalog,
    resetToDefaults,
    exportProfilesJson,
    importProfilesJson
  } = useCanvasStore();

  const currentProfile = profiles[activeProfileId] || { layout: [], cards: {} };
  const weatherEntity = entities.find(e => e.entity_id.startsWith('weather.'));
  const { width, containerRef } = useContainerWidth();

  // Entity map for instant lookup
  const entityMap = useMemo(() => {
    const map = new Map<string, HAEntity>();
    entities.forEach(e => map.set(e.entity_id, e));
    return map;
  }, [entities]);

  const getEntity = (entityId: string): HAEntity => {
    return entityMap.get(entityId) || {
      entity_id: entityId,
      state: 'off',
      attributes: { friendly_name: entityId.split('.')[1] || entityId }
    };
  };

  // Convert layout items to react-grid-layout format
  const rglLayout = useMemo(() => {
    return (currentProfile.layout || []).map(item => ({
      i: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: item.minW || 2,
      minH: item.minH || 2
    }));
  }, [currentProfile.layout]);

  // Handle grid drag / resize complete
  const handleLayoutChange = (newLayout: any[]) => {
    if (!isEditMode) return;
    updateLayout(newLayout.map(item => ({
      i: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: item.minW,
      minH: item.minH
    })));
  };

  // Render card widget based on its type
  const renderCardContent = (cardId: string) => {
    const config = currentProfile.cards[cardId];
    if (!config) return null;

    const entity = getEntity(config.entityId);

    switch (config.type) {
      case 'light':
        return (
          <LightCard
            config={config}
            entity={entity}
            onToggle={onUpdateEntity}
            onOpenModal={() => openCardModal(cardId)}
          />
        );
      case 'climate':
        return (
          <ClimateCard
            config={config}
            entity={entity}
            onUpdateEntity={onUpdateEntity}
            onOpenModal={() => openCardModal(cardId)}
          />
        );
      case 'nordpool':
        return (
          <NordpoolCard
            config={config}
            entity={entity}
            onOpenModal={() => openCardModal(cardId)}
          />
        );
      case 'ev_charging':
        return (
          <EVChargingCard
            config={config}
            entity={entity}
            onOpenModal={() => openCardModal(cardId)}
          />
        );
      case 'weather':
        return (
          <WeatherCard
            config={config}
            entity={entity}
            backdropType={weatherBackdrop}
            onOpenModal={() => openCardModal(cardId)}
          />
        );
      case 'media_player':
        return (
          <MediaPlayerCard
            config={config}
            entity={entity}
            onToggle={onUpdateEntity}
            onOpenModal={() => openCardModal(cardId)}
          />
        );
      case 'vacuum':
        return (
          <VacuumCard
            config={config}
            entity={entity}
            onToggle={onUpdateEntity}
            onOpenModal={() => openCardModal(cardId)}
          />
        );
      case 'camera':
        return (
          <CameraCard
            config={config}
            entity={entity}
            onOpenModal={() => openCardModal(cardId)}
          />
        );
      case 'switch':
        return (
          <SwitchPlugCard
            config={config}
            entity={entity}
            onToggle={onUpdateEntity}
            onOpenModal={() => openCardModal(cardId)}
          />
        );
      case 'lock':
        return (
          <SecurityLockCard
            config={config}
            entity={entity}
            onToggle={onUpdateEntity}
            onOpenModal={() => openCardModal(cardId)}
          />
        );
      case 'sensor':
      default:
        return (
          <SensorMetricCard
            config={config}
            entity={entity}
            onOpenModal={() => openCardModal(cardId)}
          />
        );
    }
  };

  // Active modal card config & entity
  const activeModalConfig = activeModalCardId ? currentProfile.cards[activeModalCardId] : null;
  const activeModalEntity = activeModalConfig ? getEntity(activeModalConfig.entityId) : null;

  return (
    <div className="relative w-full min-h-full flex-1 flex flex-col">
      {/* 1. Canvas Top Toolbar */}
      <CanvasHeader
        profiles={profiles}
        activeProfileId={activeProfileId}
        isEditMode={isEditMode}
        isLocked={isLocked}
        hasPinSet={Boolean(pinCode && pinCode.length >= 4)}
        weatherBackdrop={weatherBackdrop}
        cardCount={Object.keys(currentProfile.cards || {}).length}
        onSelectProfile={setActiveProfileId}
        onCreateProfile={(name) => createProfile(name, true)}
        onDeleteProfile={deleteProfile}
        onToggleEditMode={toggleEditMode}
        onOpenPinModal={openPinModal}
        onSelectWeatherBackdrop={setWeatherBackdrop}
        onOpenCatalog={openCatalog}
        onResetDefaults={resetToDefaults}
        onExportJson={() => {
          const json = exportProfilesJson();
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `tunet_profiles_${Date.now()}.json`;
          a.click();
          onAddToast({ type: 'success', title: 'Profiles Exported', message: 'Dashboard configuration saved to JSON.' });
        }}
        onImportJson={(json) => {
          const success = importProfilesJson(json);
          if (success) {
            onAddToast({ type: 'success', title: 'Profiles Imported', message: 'Dashboard profiles successfully loaded.' });
          } else {
            onAddToast({ type: 'warning', title: 'Import Failed', message: 'Invalid profile JSON structure.' });
          }
        }}
      />

      {/* 3. React Grid Layout Responsive Freeform Canvas */}
      <div ref={containerRef as any} className="flex-1 w-full relative z-10 pb-24">
        {width > 0 ? (
          <ResponsiveGridLayout
            width={width}
            className="layout"
            layouts={{ lg: rglLayout, md: rglLayout, sm: rglLayout, xs: rglLayout }}
            breakpoints={{ lg: 1200, md: 900, sm: 600, xs: 400 }}
            cols={{ lg: 12, md: 8, sm: 4, xs: 2 }}
            rowHeight={100}
            margin={[16, 16]}
            dragConfig={{ enabled: isEditMode, handle: '.canvas-drag-handle' }}
            resizeConfig={{ enabled: isEditMode }}
            onLayoutChange={handleLayoutChange}
            autoSize={true}
          >
            {(currentProfile.layout || []).map((item) => {
              const cardConfig = currentProfile.cards[item.i];
              if (!cardConfig) return null;

              return (
                <div key={item.i} className="w-full h-full">
                  <CardShell
                    config={cardConfig}
                    isEditMode={isEditMode}
                    onOpenModal={() => openCardModal(item.i)}
                    onRemove={() => removeCard(item.i)}
                    onDuplicate={() => duplicateCard(item.i)}
                  >
                    {renderCardContent(item.i)}
                  </CardShell>
                </div>
              );
            })}
          </ResponsiveGridLayout>
        ) : (
          <div className="w-full h-72 flex items-center justify-center text-slate-400 text-xs font-mono">
            Calibrating Canvas Grid Dimensions...
          </div>
        )}

        {/* Empty Canvas Placeholder */}
        {(!currentProfile.layout || currentProfile.layout.length === 0) && (
          <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-white/20 rounded-3xl bg-black/20 backdrop-blur-md max-w-md mx-auto my-12">
            <h4 className="text-base font-extrabold text-white mb-1">Canvas is Empty</h4>
            <p className="text-xs text-slate-400 mb-4">Click "Add Card" to populate your customizable smart home canvas.</p>
            <button
              onClick={openCatalog}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-indigo-600/30"
            >
              Open Card Catalog
            </button>
          </div>
        )}
      </div>

      {/* 4. Slide-Over Card Catalog Drawer */}
      <CardCatalogDrawer
        isOpen={isCatalogOpen}
        onClose={closeCatalog}
        availableEntities={entities}
        onAddCard={addCard}
      />

      {/* 5. 4-Digit PIN Lock Keypad Modal */}
      <PinLockModal
        isOpen={isPinModalOpen}
        mode={pinModalMode}
        onClose={closePinModal}
        onUnlock={unlockWithPin}
        onSetPin={setPinCode}
      />

      {/* 6. Rich Popup Modals on Card Click */}
      {activeModalConfig && activeModalEntity && (
        <>
          {activeModalConfig.type === 'light' && (
            <LightDetailModal
              isOpen={Boolean(activeModalCardId)}
              onClose={closeCardModal}
              entity={activeModalEntity}
              onUpdateEntity={onUpdateEntity}
            />
          )}

          {activeModalConfig.type === 'climate' && (
            <ClimateDetailModal
              isOpen={Boolean(activeModalCardId)}
              onClose={closeCardModal}
              entity={activeModalEntity}
              onUpdateEntity={onUpdateEntity}
            />
          )}

          {activeModalConfig.type === 'nordpool' && (
            <NordpoolDetailModal
              isOpen={Boolean(activeModalCardId)}
              onClose={closeCardModal}
            />
          )}

          {activeModalConfig.type === 'ev_charging' && (
            <EVChargingDetailModal
              isOpen={Boolean(activeModalCardId)}
              onClose={closeCardModal}
            />
          )}

          {activeModalConfig.type === 'media_player' && (
            <MediaDetailModal
              isOpen={Boolean(activeModalCardId)}
              onClose={closeCardModal}
              entity={activeModalEntity}
              onUpdateEntity={onUpdateEntity}
            />
          )}

          {activeModalConfig.type === 'vacuum' && (
            <VacuumDetailModal
              isOpen={Boolean(activeModalCardId)}
              onClose={closeCardModal}
              entity={activeModalEntity}
              onUpdateEntity={onUpdateEntity}
            />
          )}

          {activeModalConfig.type === 'camera' && (
            <CameraDetailModal
              isOpen={Boolean(activeModalCardId)}
              onClose={closeCardModal}
              cameraName={activeModalConfig.title}
            />
          )}

          {activeModalConfig.type !== 'light' &&
            activeModalConfig.type !== 'climate' &&
            activeModalConfig.type !== 'nordpool' &&
            activeModalConfig.type !== 'ev_charging' &&
            activeModalConfig.type !== 'media_player' &&
            activeModalConfig.type !== 'vacuum' &&
            activeModalConfig.type !== 'camera' && (
              <GenericDetailModal
                isOpen={Boolean(activeModalCardId)}
                onClose={closeCardModal}
                entity={activeModalEntity}
                onUpdateEntity={onUpdateEntity}
              />
            )}
        </>
      )}
    </div>
  );
}
