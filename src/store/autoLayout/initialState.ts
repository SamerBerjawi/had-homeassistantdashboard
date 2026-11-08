/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SecurityOverviewState, OverviewSummaryState } from '../../types';

export const INITIAL_SECURITY_OVERVIEW: SecurityOverviewState = {
  locks: [],
  openDoorsWindows: [],
  activeMotionSensors: [],
  cameras: []
};

export const INITIAL_OVERVIEW_SUMMARY: OverviewSummaryState = {
  peopleHome: 2,
  peopleAway: 0,
  totalPeople: 2,
  lightsOnCount: 0,
  totalLightsCount: 0,
  fansOnCount: 0,
  totalFansCount: 0,
  doorsOpenCount: 0,
  totalDoorsCount: 0,
  windowsOpenCount: 0,
  totalWindowsCount: 0,
  openOpeningsCount: 0,
  alarmState: 'armed_home',
  activeMediaCount: 0,
  totalMediaCount: 0,
  activeClimatesCount: 0,
  activeSwitchesCount: 0,
  totalPowerWatts: 0
};
