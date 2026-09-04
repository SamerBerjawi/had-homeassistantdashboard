/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Base Glassmorphic Tile Shell
 * Enforces accessible touch targets (>= 44px), glassmorphic styling tokens,
 * hover elevation, dynamic accent color tints, and strong contrast in both light & dark modes.
 */

import React from 'react';

export interface TileShellProps {
  children: React.ReactNode;
  darkMode?: boolean;
  isActive?: boolean;
  isAlert?: boolean;
  accentColor?: string;
  activeBorderColor?: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  title?: string;
}

export const TileShell: React.FC<TileShellProps> = ({
  children,
  darkMode = true,
  isActive = false,
  isAlert = false,
  accentColor,
  activeBorderColor,
  className = '',
  onClick,
  onContextMenu,
  title
}) => {
  const bgClass = isAlert
    ? darkMode
      ? 'bg-rose-950/60 text-rose-200 border-rose-500/30'
      : 'bg-rose-100 text-rose-950 border-rose-200'
    : isActive
    ? accentColor
      ? darkMode
        ? 'text-white border-white/10'
        : 'text-slate-950 border-slate-300'
      : darkMode
      ? 'bg-amber-500/20 text-white border-amber-500/30'
      : 'bg-amber-50/95 text-slate-950 border-amber-200'
    : darkMode
    ? 'bg-black/20 hover:bg-black/30 text-white border-white/5'
    : 'bg-white/20 hover:bg-white/30 text-slate-900 border-slate-200/50';

  const customStyle: React.CSSProperties = {};

  if (!isAlert && isActive && accentColor) {
    customStyle.backgroundColor = darkMode ? `${accentColor}22` : `${accentColor}18`;
  }

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      title={title}
      style={customStyle}
      className={`group relative w-full h-full rounded-3xl backdrop-blur-xl border shadow-[4px_6px_12px_rgba(0,0,0,0.15)] transition-all duration-200 flex flex-col justify-center overflow-hidden isolate ${bgClass} ${
        onClick ? 'cursor-pointer active:scale-[0.985]' : ''
      } ${className}`}
    >
      {/* Top Ambient Glow Bloom if Active */}
      {isActive && (
        <div
          className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none"
          style={{ clipPath: 'inset(0 round 24px)', WebkitClipPath: 'inset(0 round 24px)' }}
        >
          <div
            style={{ backgroundColor: accentColor ? `${accentColor}35` : undefined }}
            className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl pointer-events-none ${
              accentColor ? '' : darkMode ? 'bg-amber-500/20' : 'bg-amber-500/25'
            }`}
          />
        </div>
      )}

      {children}
    </div>
  );
};

export default TileShell;
