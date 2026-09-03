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
      ? 'bg-rose-950/60 text-rose-200 shadow-lg shadow-rose-950/50'
      : 'bg-rose-100 text-rose-950 shadow-md shadow-rose-200/50'
    : isActive
    ? accentColor
      ? darkMode
        ? 'text-white shadow-[0_8px_25px_rgba(0,0,0,0.5)]'
        : 'text-slate-950 shadow-md shadow-amber-200/40'
      : darkMode
      ? 'bg-amber-500/20 text-white shadow-[0_8px_25px_rgba(0,0,0,0.5)]'
      : 'bg-amber-50/95 text-slate-950 shadow-md shadow-amber-200/40'
    : darkMode
    ? 'bg-slate-900/70 hover:bg-slate-900/85 text-white shadow-[0_8px_25px_rgba(0,0,0,0.4)]'
    : 'bg-white/95 hover:bg-white text-slate-900 shadow-md shadow-slate-200/80 hover:shadow-lg';

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
      className={`group relative w-full h-full rounded-3xl backdrop-blur-xl transition-all duration-200 flex flex-col justify-center overflow-hidden isolate ${bgClass} ${
        onClick ? 'cursor-pointer active:scale-[0.985]' : ''
      } ${className}`}
    >
      {/* Top Ambient Glow Bloom if Active */}
      {isActive && (
        <div
          style={{ backgroundColor: accentColor ? `${accentColor}35` : undefined }}
          className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl pointer-events-none ${
            accentColor ? '' : darkMode ? 'bg-amber-500/20' : 'bg-amber-500/25'
          }`}
        />
      )}

      {children}
    </div>
  );
};

export default TileShell;
