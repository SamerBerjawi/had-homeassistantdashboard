/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import type { IconProps } from '@phosphor-icons/react';
import { HouseLine } from '@phosphor-icons/react';
import { normalizePhosphorIconName } from '../../lib/phosphorIconData';

interface DynamicPhosphorIconProps extends IconProps {
  name?: string | null;
  fallback?: React.ComponentType<IconProps>;
}

// Module-level cache so icons resolve synchronously once loaded
let phosphorModulePromise: Promise<Record<string, any>> | null = null;
let phosphorIconsRecord: Record<string, any> | null = null;

function loadPhosphorIcons(): Promise<Record<string, any>> {
  if (!phosphorModulePromise) {
    phosphorModulePromise = import('@phosphor-icons/react').then((mod) => {
      phosphorIconsRecord = mod;
      return mod;
    });
  }
  return phosphorModulePromise;
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

  const normalized = name && typeof name === 'string' ? normalizePhosphorIconName(name) || name : null;
  const synchronousIcon = normalized && phosphorIconsRecord ? (phosphorIconsRecord[normalized] || phosphorIconsRecord[name!]) : null;
  const [loadedIcon, setLoadedIcon] = useState<any>(synchronousIcon);

  useEffect(() => {
    if (!normalized) return;
    if (synchronousIcon && isValidIconComponent(synchronousIcon)) return;

    let isMounted = true;
    loadPhosphorIcons().then((mod) => {
      if (!isMounted) return;
      const comp = mod[normalized] || mod[name!];
      if (isValidIconComponent(comp)) {
        setLoadedIcon(() => comp);
      }
    }).catch(() => {
      // Fallback handled by return
    });

    return () => {
      isMounted = false;
    };
  }, [normalized, name, synchronousIcon]);

  if (!name || typeof name !== 'string') {
    return <FallbackComponent {...props} />;
  }

  const ActiveComponent = synchronousIcon && isValidIconComponent(synchronousIcon)
    ? synchronousIcon
    : (loadedIcon && isValidIconComponent(loadedIcon) ? loadedIcon : null);

  if (ActiveComponent) {
    return <ActiveComponent {...props} />;
  }

  return <FallbackComponent {...props} />;
}
