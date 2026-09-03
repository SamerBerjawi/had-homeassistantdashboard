/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import * as PhosphorIcons from '@phosphor-icons/react';
import { HouseLine, IconProps } from '@phosphor-icons/react';
import { normalizePhosphorIconName } from '../../lib/phosphorIconData';

interface DynamicPhosphorIconProps extends IconProps {
  name?: string | null;
  fallback?: React.ComponentType<IconProps>;
}

function isValidIconComponent(comp: any): boolean {
  if (!comp) return false;
  if (typeof comp === 'function') return true;
  if (
    typeof comp === 'object' &&
    comp.$$typeof &&
    (comp.$$typeof === Symbol.for('react.forward_ref') ||
     comp.$$typeof === Symbol.for('react.memo') ||
     (typeof comp.$$typeof === 'symbol' && comp.$$typeof.toString().includes('react.forward_ref')) ||
     (typeof comp.$$typeof === 'symbol' && comp.$$typeof.toString().includes('react.memo')))
  ) {
    return true;
  }
  return false;
}

export default function DynamicPhosphorIcon({
  name,
  fallback = HouseLine,
  ...props
}: DynamicPhosphorIconProps) {
  const FallbackComponent = fallback;

  if (!name || typeof name !== 'string') {
    return <FallbackComponent {...props} />;
  }

  try {
    const normalized = normalizePhosphorIconName(name);
    const IconComponent = normalized
      ? (PhosphorIcons as Record<string, any>)[normalized]
      : (PhosphorIcons as Record<string, any>)[name];

    if (isValidIconComponent(IconComponent)) {
      const Component = IconComponent;
      return <Component {...props} />;
    }
  } catch {
    // Graceful fallback on any runtime error
  }

  return <FallbackComponent {...props} />;
}
