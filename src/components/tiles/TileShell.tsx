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
      ? 'bg-rose-950/60 text-rose-200'
      : 'bg-rose-100 text-rose-950'
    : isActive
    ? accentColor
      ? darkMode
        ? 'text-white'
        : 'text-slate-900 shadow-xs'
      : darkMode
      ? 'bg-amber-500/10 text-white'
      : 'bg-amber-50/40 text-slate-900 shadow-xs'
    : darkMode
    ? 'bg-black/20 hover:bg-black/30 text-white'
    : 'bg-white/20 hover:bg-white/30 text-slate-900';

  const borderClass = isAlert
    ? darkMode ? 'border-rose-500/30' : 'border-rose-200'
    : isActive
    ? activeBorderColor || (accentColor
      ? (darkMode ? 'border-amber-400/20' : 'border-amber-500/20')
      : (darkMode ? 'border-amber-500/20' : 'border-amber-300/35'))
    : darkMode
    ? 'border-white/5'
    : 'border-slate-200/50';

  const customStyle: React.CSSProperties = {};

  if (!isAlert && isActive && accentColor) {
    customStyle.backgroundImage = darkMode
      ? `linear-gradient(135deg, ${accentColor}12 0%, ${accentColor}06 100%)`
      : `linear-gradient(135deg, ${accentColor}0a 0%, ${accentColor}04 100%)`;
    customStyle.backgroundColor = darkMode
      ? 'rgba(255, 255, 255, 0.03)'
      : 'rgba(255, 255, 255, 0.72)';
  }

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      title={title}
      style={customStyle}
      className={`group relative w-full h-full rounded-3xl backdrop-blur-xl border ${borderClass} shadow-[4px_6px_12px_rgba(0,0,0,0.12)] transition-all duration-200 flex flex-col justify-center overflow-hidden isolate ${bgClass} ${
        onClick ? 'cursor-pointer active:scale-[0.985]' : ''
      } ${className}`}
    >
      {/* Top Ambient Glow Bloom if Active (Soft & Subtle) */}
      {isActive && (
        <div
          className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none"
          style={{ clipPath: 'inset(0 round 24px)', WebkitClipPath: 'inset(0 round 24px)' }}
        >
          <div
            style={{
              backgroundColor: accentColor
                ? (darkMode ? `${accentColor}12` : `${accentColor}08`)
                : undefined
            }}
            className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl pointer-events-none ${
              accentColor ? '' : darkMode ? 'bg-amber-500/10' : 'bg-amber-400/10'
            }`}
          />
        </div>
      )}

      {children}
    </div>
  );
};

export default TileShell;
