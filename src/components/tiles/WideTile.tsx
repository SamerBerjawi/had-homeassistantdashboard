/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Wide Tile (4x2 Grid Units)
 * Media player hero card, camera live preview, and high-density telemetry charts.
 */

import React from 'react';
import TileShell from './TileShell';

interface WideTileProps {
  darkMode?: boolean;
  title: string;
  subtitle?: React.ReactNode;
  backdropImage?: string;
  icon: React.ReactNode;
  isActive?: boolean;
  isAlert?: boolean;
  accentColor?: string;
  activeBorderColor?: string;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  onIconClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  className?: string;
}

export const WideTile: React.FC<WideTileProps> = ({
  darkMode = true,
  title,
  subtitle,
  backdropImage,
  icon,
  isActive = false,
  isAlert = false,
  accentColor,
  activeBorderColor,
  headerAction,
  footer,
  children,
  onClick,
  onIconClick,
  onContextMenu,
  className = ''
}) => {
  return (
    <TileShell
      darkMode={darkMode}
      isActive={isActive}
      isAlert={isAlert}
      accentColor={accentColor}
      activeBorderColor={activeBorderColor}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`p-4 min-h-[148px] justify-between gap-2.5 ${className}`}
    >
      {/* Background Hero Picture / Album Art */}
      {backdropImage && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none rounded-3xl opacity-20 dark:opacity-25 group-hover:opacity-30 transition-opacity duration-500">
          <img
            src={backdropImage}
            alt=""
            className="w-full h-full object-cover rounded-3xl blur-[1px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent dark:block hidden rounded-3xl" />
        </div>
      )}

      {/* Top Row: Icon, Title, and Action Controls */}
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {onIconClick ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onIconClick();
              }}
              title="Open Device Details"
              className="shrink-0 flex items-center justify-center min-w-[36px] min-h-[36px] rounded-xl hover:bg-white/10 dark:hover:bg-white/10 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              {icon}
            </button>
          ) : (
            <div className="shrink-0 flex items-center justify-center min-w-[36px] min-h-[36px]">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <h4
              className={`text-sm sm:text-base font-bold truncate leading-snug ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              {title}
            </h4>
            {subtitle && (
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1 leading-normal font-medium flex items-center">
                {subtitle}
              </div>
            )}
          </div>
        </div>

        {headerAction && <div className="shrink-0 flex items-center">{headerAction}</div>}
      </div>

      {/* Middle Body */}
      {children && <div className="relative z-10 my-auto py-0.5">{children}</div>}

      {/* Bottom Footer Content */}
      {footer && (
        <div className="relative z-10 pt-2 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-between gap-2">
          {footer}
        </div>
      )}
    </TileShell>
  );
};

export default WideTile;
