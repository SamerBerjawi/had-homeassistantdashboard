/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import type { IconProps } from '@phosphor-icons/react';
import { HouseLine } from '@phosphor-icons/react';
import { normalizePhosphorIconName } from '../../lib/phosphorIconData';

interface DynamicPhosphorIconProps extends Omit<IconProps, 'name'> {
  name?: string | null;
  fallback?: React.ComponentType<IconProps>;
}

type IconComponent = React.ComponentType<IconProps>;

// One lazy chunk per icon: showing a user-chosen icon loads a few KB instead of the whole
// ~4 MB Phosphor library. Icons the app imports statically stay in the main bundle.
let iconLoadersPromise: Promise<typeof import('../../lib/phosphorIconLoaders')> | null = null;
const loadIconLoaders = () => {
  if (!iconLoadersPromise) {
    iconLoadersPromise = import('../../lib/phosphorIconLoaders').catch((err) => {
      iconLoadersPromise = null;
      throw err;
    });
  }
  return iconLoadersPromise;
};

// Module-level caches so an icon resolves synchronously once loaded anywhere in the app
const resolvedIcons = new Map<string, IconComponent | null>();
const pendingIcons = new Map<string, Promise<IconComponent | null>>();

function isValidIconComponent(comp: unknown): comp is IconComponent {
  if (!comp) return false;
  if (typeof comp === 'function') return true;
  const type = (comp as { $$typeof?: symbol }).$$typeof;
  return type === Symbol.for('react.forward_ref') || type === Symbol.for('react.memo');
}

function loadIcon(iconName: string): Promise<IconComponent | null> {
  if (resolvedIcons.has(iconName)) return Promise.resolve(resolvedIcons.get(iconName)!);
  const pending = pendingIcons.get(iconName);
  if (pending) return pending;

  const promise = loadIconLoaders()
    .then(({ getPhosphorIconLoader }) => {
      const loader = getPhosphorIconLoader(iconName);
      return loader ? loader() : null;
    })
    .then((mod) => {
      if (!mod) {
        resolvedIcons.set(iconName, null);
        return null;
      }
      const comp = mod[iconName] ?? mod[`${iconName}Icon`];
      const icon = isValidIconComponent(comp) ? comp : null;
      resolvedIcons.set(iconName, icon);
      return icon;
    })
    .catch(() => null) // Don't cache failures (e.g. offline); retry on next mount
    .finally(() => pendingIcons.delete(iconName));
  pendingIcons.set(iconName, promise);
  return promise;
}

export default function DynamicPhosphorIcon({
  name,
  fallback = HouseLine,
  ...props
}: DynamicPhosphorIconProps) {
  const FallbackComponent = fallback;

  const normalized = name && typeof name === 'string' ? normalizePhosphorIconName(name) || name : null;
  const cachedIcon = normalized ? resolvedIcons.get(normalized) : undefined;
  const [loadedIcon, setLoadedIcon] = useState<{ name: string; icon: IconComponent | null } | null>(null);

  useEffect(() => {
    if (!normalized || cachedIcon !== undefined) return;
    let isMounted = true;
    loadIcon(normalized).then((icon) => {
      if (isMounted) setLoadedIcon({ name: normalized, icon });
    });
    return () => {
      isMounted = false;
    };
  }, [normalized, cachedIcon]);

  const ActiveComponent =
    cachedIcon ?? (loadedIcon && loadedIcon.name === normalized ? loadedIcon.icon : null);

  if (ActiveComponent) {
    return <ActiveComponent {...props} />;
  }

  return <FallbackComponent {...props} />;
}
