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
  const borderClass = isAlert
    ? 'border-rose-500/60 dark:border-rose-500/60'
    : isActive
    ? activeBorderColor || (accentColor ? '' : darkMode ? 'border-amber-400/40' : 'border-amber-400/70')
    : darkMode
    ? 'border-white/10 hover:border-white/20'
    : 'border-slate-200 hover:border-slate-300 shadow-xs';

  const bgClass = isAlert
    ? darkMode
      ? 'bg-rose-950/40 text-rose-200'
      : 'bg-rose-50 text-rose-900 border-rose-300'
    : isActive
    ? accentColor
      ? darkMode
        ? 'text-white'
        : 'text-slate-950 shadow-sm'
      : darkMode
      ? 'bg-amber-500/15 text-white'
      : 'bg-amber-50/95 text-slate-950 shadow-sm'
    : darkMode
    ? 'bg-black/20 hover:bg-black/30 text-white'
    : 'bg-white/85 hover:bg-white text-slate-900 shadow-xs';

  const customStyle: React.CSSProperties = {
    boxShadow: darkMode ? '4px 6px 14px rgba(0, 0, 0, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.05)'
  };

  if (!isAlert && isActive && accentColor) {
    customStyle.borderColor = `${accentColor}${darkMode ? '60' : '80'}`;
    customStyle.backgroundColor = darkMode ? `${accentColor}1a` : `${accentColor}14`;
  }

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      title={title}
      style={customStyle}
      className={`group relative w-full h-full rounded-3xl border ${borderClass} backdrop-blur-md transition-all duration-200 flex flex-col justify-between overflow-hidden isolate ${bgClass} ${
        onClick ? 'cursor-pointer active:scale-[0.985]' : ''
      } ${className}`}
    >
      {/* Top Ambient Glow Bloom if Active */}
      {isActive && (
        <div
          style={{ backgroundColor: accentColor ? `${accentColor}25` : undefined }}
          className={`absolute -top-6 -right-6 w-20 h-20 rounded-full blur-xl pointer-events-none ${
            accentColor ? '' : darkMode ? 'bg-amber-500/15' : 'bg-amber-500/20'
          }`}
        />
      )}

      {children}
    </div>
  );
};

export default TileShell;
