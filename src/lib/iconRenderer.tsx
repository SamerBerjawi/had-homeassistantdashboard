/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Stairs,
  House,
  Buildings,
  Tree,
  Shield,
  Armchair,
  Bed,
  CookingPot,
  Desktop,
  Bathtub,
  FilmSlate,
  Car,
  Books,
  DoorOpen,
  Lightbulb,
  HouseLine,
  Compass,
  Sparkle,
  Stack,
  ArrowsVertical,
  Couch,
  Television,
  Coffee,
  Garage,
  Flame,
  Fan,
  SpeakerHigh
} from '@phosphor-icons/react';

export const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Stairs,
  House,
  Buildings,
  Tree,
  Shield,
  Armchair,
  Bed,
  CookingPot,
  Desktop,
  Bathtub,
  FilmSlate,
  Car,
  Books,
  DoorOpen,
  Lightbulb,
  HouseLine,
  Compass,
  Sparkle,
  Stack,
  ArrowsVertical,
  Couch,
  Television,
  Coffee,
  Garage,
  Flame,
  Fan,
  SpeakerHigh
};

export function renderPhosphorIcon(
  iconName?: string | null,
  size = 18,
  className = '',
  style?: React.CSSProperties
) {
  if (!iconName) {
    return <HouseLine size={size} weight="duotone" className={className} style={style} />;
  }

  // Check direct lookup
  const cleanName = iconName.replace(/^ph-/, '').replace(/^mdi:/, '').trim();
  const IconComponent = ICON_MAP[cleanName] || ICON_MAP[iconName];

  if (IconComponent) {
    return <IconComponent size={size} weight="duotone" className={className} style={style} />;
  }

  // Fallback matching
  const lower = cleanName.toLowerCase();
  if (lower.includes('stair') || lower.includes('floor') || lower.includes('level')) {
    return <Stairs size={size} weight="duotone" className={className} style={style} />;
  }
  if (lower.includes('bed') || lower.includes('sleep')) {
    return <Bed size={size} weight="duotone" className={className} style={style} />;
  }
  if (lower.includes('bath') || lower.includes('wash') || lower.includes('shower')) {
    return <Bathtub size={size} weight="duotone" className={className} style={style} />;
  }
  if (lower.includes('cook') || lower.includes('kitchen') || lower.includes('dine') || lower.includes('dining')) {
    return <CookingPot size={size} weight="duotone" className={className} style={style} />;
  }
  if (lower.includes('desk') || lower.includes('office') || lower.includes('work')) {
    return <Desktop size={size} weight="duotone" className={className} style={style} />;
  }
  if (lower.includes('living') || lower.includes('couch') || lower.includes('armchair') || lower.includes('salon')) {
    return <Armchair size={size} weight="duotone" className={className} style={style} />;
  }
  if (lower.includes('movie') || lower.includes('cinema') || lower.includes('media') || lower.includes('tv')) {
    return <FilmSlate size={size} weight="duotone" className={className} style={style} />;
  }
  if (lower.includes('garden') || lower.includes('patio') || lower.includes('yard') || lower.includes('tree') || lower.includes('outdoor')) {
    return <Tree size={size} weight="duotone" className={className} style={style} />;
  }
  if (lower.includes('garage') || lower.includes('car') || lower.includes('driveway')) {
    return <Car size={size} weight="duotone" className={className} style={style} />;
  }

  return <HouseLine size={size} weight="duotone" className={className} style={style} />;
}
