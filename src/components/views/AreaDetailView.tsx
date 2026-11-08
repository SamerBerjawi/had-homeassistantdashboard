/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dedicated Area Detail Drill-Down View
 * Categorized device sections with category titles, bulk master actions,
 * granular sensor sub-grouping (Entry, Motion, Environmental, Safety, Energy, Battery),
 * automatic companion battery sensor pairing & deduplication, and Phosphor battery icons.
 */

import React from 'react';
import { HouseLine } from '@phosphor-icons/react';
import MediaOverviewDrawer from '../overview/modals/MediaOverviewDrawer';
import ViewEmptyState from '../ui/ViewEmptyState';
import AdaptiveSectionTabs from '../common/AdaptiveSectionTabs';
import { useAreaDetailState } from './areaDetail/useAreaDetailState';
import type { AreaDetailViewProps } from './areaDetail/shared';
import LightsSection from './areaDetail/LightsSection';
import ClimateFansSection from './areaDetail/ClimateFansSection';
import SwitchesSection from './areaDetail/SwitchesSection';
import MediaSection from './areaDetail/MediaSection';
import SensorsSection from './areaDetail/SensorsSection';
import { DomainTab } from './areaDetail/shared';

export default function AreaDetailView(props: AreaDetailViewProps) {
  const s = useAreaDetailState(props);
  const {
    activeDomainTab,
    activeMediaDrawerEntity,
    area,
    darkMode,
    domainTabs,
    enrichedClimates,
    enrichedCovers,
    enrichedFans,
    enrichedLights,
    enrichedLocks,
    enrichedSwitches,
    enrichedVacuums,
    entities,
    sensorsCount,
    setActiveDomainTab,
    setActiveMediaDrawerEntity,
    totalEntityCount,
    updateEntityState
  } = s;

  if (totalEntityCount === 0) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center pb-24 md:pb-8">
        <ViewEmptyState
          icon={HouseLine}
          title={`No Devices in ${area.name}`}
          badgeText="Empty Room"
          description={`No smart devices, lights, sensors, or switches are currently assigned to ${area.name}. Assign entities to this area in Home Assistant.`}
          configPath={`Settings → Areas & Zones → Areas → ${area.name}`}
          darkMode={darkMode}
        />
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col gap-6 animate-fadeIn pb-24 md:pb-8 relative">
      {/* Ambient Room Wallpaper Backdrop */}
      {(area.picture || area.backgroundImageUrl) && (
        <div className="absolute -top-6 -left-6 -right-6 h-64 -z-10 overflow-hidden pointer-events-none opacity-15 dark:opacity-20 mask-[linear-gradient(to_bottom,black_50%,transparent)]">
          <img
            src={area.picture || area.backgroundImageUrl}
            alt={area.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover blur-sm scale-105"
          />
        </div>
      )}

      {/* Top Floating Filter Bar */}
      <div className="w-full max-w-full min-w-0">
        <AdaptiveSectionTabs
          tabs={domainTabs}
          activeTab={activeDomainTab}
          onChange={(tab) => setActiveDomainTab(tab as DomainTab)}
          darkMode={darkMode}
        />
      </div>

      {/* 1. LIGHTING CATEGORY */}
      {(activeDomainTab === 'all' || activeDomainTab === 'lights') && enrichedLights.length > 0 && <LightsSection s={s} />}

      {/* 2. CLIMATE & FANS CATEGORY */}
      {(activeDomainTab === 'all' || activeDomainTab === 'climate') && (enrichedClimates.length > 0 || enrichedFans.length > 0) && <ClimateFansSection s={s} />}

      {/* 3. SWITCHES, LOCKS & COVERS CATEGORY */}
      {(activeDomainTab === 'all' || activeDomainTab === 'switches') && (enrichedSwitches.length > 0 || enrichedLocks.length > 0 || enrichedCovers.length > 0) && <SwitchesSection s={s} />}

      {/* 4. MEDIA & PLAYERS CATEGORY */}
      {(activeDomainTab === 'all' || activeDomainTab === 'media') && (entities.mediaPlayers.length > 0 || (enrichedVacuums?.length || 0) > 0 || (entities.cameras?.length || 0) > 0) && <MediaSection s={s} />}

      {/* 5. GRANULAR SENSORS BY TYPE */}
      {(activeDomainTab === 'all' || activeDomainTab === 'sensors') && sensorsCount > 0 && <SensorsSection s={s} />}

      {/* Media Player Sidebar Drawer */}
      {activeMediaDrawerEntity && (
        <MediaOverviewDrawer
          isOpen={Boolean(activeMediaDrawerEntity)}
          onClose={() => setActiveMediaDrawerEntity(null)}
          mediaPlayers={entities.mediaPlayers}
          activeEntity={activeMediaDrawerEntity}
          darkMode={darkMode}
          onUpdateEntity={updateEntityState}
        />
      )}
    </div>
  );
}
