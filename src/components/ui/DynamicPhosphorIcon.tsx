/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import * as PhosphorIcons from '@phosphor-icons/react';
import { HouseLine, Stairs, IconProps } from '@phosphor-icons/react';

interface DynamicPhosphorIconProps extends IconProps {
  name?: string | null;
  fallback?: React.ComponentType<IconProps>;
}

export default function DynamicPhosphorIcon({
  name,
  fallback = HouseLine,
  ...props
}: DynamicPhosphorIconProps) {
  if (!name) {
    const FallbackComponent = fallback;
    return <FallbackComponent {...props} />;
  }

  // Remove whitespace or dashes if any to match PascalCase
  const cleanName = name.replace(/[\s-_]/g, '');
  const IconComponent = (PhosphorIcons as Record<string, any>)[cleanName] || (PhosphorIcons as Record<string, any>)[name];

  if (IconComponent && (typeof IconComponent === 'function' || typeof IconComponent === 'object')) {
    const Component = IconComponent;
    return <Component {...props} />;
  }

  const FallbackComponent = fallback;
  return <FallbackComponent {...props} />;
}
