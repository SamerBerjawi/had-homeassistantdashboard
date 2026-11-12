/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Groups the Home Assistant entities the Overview header shows (people, lights, switches, fans,
 * media, vacuums, weather, cameras, binary sensors) and resolves where a person is.
 */

import type { HAZone, ResolvedEntity } from '../../types';
import type { UserDashboardConfig } from '../../types/userConfig';
import { classifyBinarySensors } from '../../lib/entityClassifiers';
import { getConfiguredRtspCameras } from '../../lib/cameraSources';

export function classifyOverviewEntities(
  domainGroups: Record<string, ResolvedEntity[]>,
  resolvedEntities: Record<string, ResolvedEntity> | undefined,
  cameraSources: UserDashboardConfig['cameras']['sources'] | undefined
) {
  const isVisible = (e: ResolvedEntity) => !e.hidden && !e.disabled_by;
  const allBinary: ResolvedEntity[] = (domainGroups['binary_sensor'] || []).filter(isVisible);
  const userEntitiesLocal = [...(domainGroups['person'] || []), ...(domainGroups['device_tracker'] || [])].filter(isVisible);
  const lightEntitiesLocal = (domainGroups['light'] || []).filter(isVisible);
  const switchEntitiesLocal = (domainGroups['switch'] || []).filter(isVisible);
  const fanEntitiesLocal = (domainGroups['fan'] || []).filter(isVisible);
  const mediaEntitiesLocal = (domainGroups['media_player'] || []).filter(isVisible);
  const rawVacuums = (domainGroups['vacuum'] || []).filter((v) => !v.disabled_by);
  const vacuumEntitiesLocal = rawVacuums.length > 0
    ? rawVacuums
    : Object.values(resolvedEntities || {}).filter(
        (e) => (e.entity_id?.startsWith('vacuum.') || e.domain === 'vacuum') && !e.disabled_by
      );
  const weatherEntitiesLocal = (domainGroups['weather'] || []).filter(isVisible);
  const surveillanceCamerasLocal = getConfiguredRtspCameras(
    cameraSources,
    domainGroups['camera'] || []
  );

  const {
    doorSensors: doors,
    windowSensors: windows,
    motionSensors: motions,
    leakSensors: leaks,
    smokeSensors: smokes,
    otherContactSensors: otherContacts
  } = classifyBinarySensors(allBinary);

  const activeMed = mediaEntitiesLocal.find((m) => m.state === 'playing') || mediaEntitiesLocal[0];
  const playingMediaList = mediaEntitiesLocal.filter((m) => m.state === 'playing');
  const activeVacList = vacuumEntitiesLocal.filter(
    (v) => (v.state || '').toLowerCase() === 'cleaning' || (v.state || '').toLowerCase() === 'on'
  );

  return {
    doorSensors: doors,
    windowSensors: windows,
    motionSensors: motions,
    leakSensors: leaks,
    smokeSensors: smokes,
    otherContactSensors: otherContacts,
    activeMedia: activeMed,
    playingMediaEntities: playingMediaList,
    userEntities: userEntitiesLocal,
    lightEntities: lightEntitiesLocal,
    switchEntities: switchEntitiesLocal,
    fanEntities: fanEntitiesLocal,
    mediaEntities: mediaEntitiesLocal,
    vacuumEntities: vacuumEntitiesLocal,
    weatherEntities: weatherEntitiesLocal,
    surveillanceCameras: surveillanceCamerasLocal,
    homeUsers: userEntitiesLocal.filter((u) => u.state === 'home'),
    onLights: lightEntitiesLocal.filter((l) => l.state === 'on'),
    onSwitches: switchEntitiesLocal.filter((s) => s.state === 'on'),
    activeFans: fanEntitiesLocal.filter((f) => f.state === 'on'),
    activeVacuums: activeVacList,
    openDoors: doors.filter((d) => d.state === 'on'),
    openWindows: windows.filter((w) => w.state === 'on'),
    activeMotion: motions.filter((m) => m.state === 'on'),
    activeLeaks: leaks.filter((l) => l.state === 'on' || l.state === 'wet' || l.state === 'detected'),
    activeSmoke: smokes.filter((s) => s.state === 'on' || s.state === 'detected' || s.state === 'smoke')
  };
}

export type OverviewEntityGroups = ReturnType<typeof classifyOverviewEntities>;

// Resolves person zone presence (Home, named zone, or away)
export function resolvePersonZoneDetails(user: ResolvedEntity, resolvedZones: HAZone[] | undefined) {
  const rawState = (user.state || '').trim();
  const s = rawState.toLowerCase();
  const isHome = s === 'home';
  const isAway = !s || s === 'not_home' || s === 'away' || s === 'unavailable' || s === 'unknown';

  if (isAway) {
    return { isInKnownZone: false, isHome: false, zoneName: '' };
  }

  if (isHome) {
    return { isInKnownZone: true, isHome: true, zoneName: 'Home' };
  }

  // Match against resolvedZones if available
  const matchedZone = resolvedZones?.find(
    (z) => z.name.toLowerCase() === s ||
           z.entity_id.toLowerCase() === `zone.${s}` ||
           z.entity_id.toLowerCase().replace('zone.', '') === s.replace(/\s+/g, '_')
  );

  const zoneName = matchedZone?.name || rawState;
  return { isInKnownZone: true, isHome: false, zoneName };
}
