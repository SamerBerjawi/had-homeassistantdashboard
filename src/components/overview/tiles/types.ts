/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { OverviewHeaderState } from '../useOverviewHeaderState';

/** Props shared by every Overview tile body. `s` is the state bag built by useOverviewHeaderState. */
export interface TileProps {
  s: OverviewHeaderState;
  tileId: string;
  is2x: boolean;
}
