/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Standard Tile (2x2 Grid Units)
 * Multi-control tile format for lights with brightness sliders,
 * climate controls, and rich telemetry metrics.
 */

import React from 'react';
import TileShell from './TileShell';

interface StandardTileProps {
  darkMode?: boolean;
  title: string;
  subtitle?: React.ReactNode;
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

export const StandardTile: React.FC<StandardTileProps> = ({
  darkMode = true,
  title,
  subtitle,
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
      className={`p-3.5 sm:p-4 min-h-[148px] justify-between gap-2.5 ${className}`}
    >
      {/* Top Row: Icon, Title, and Action/Toggle */}
      <div className="flex items-start justify-between gap-2 relative z-10">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
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
              className={`text-sm font-bold truncate leading-snug ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              {title}
            </h4>
            {subtitle && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1 leading-normal font-medium flex items-center">
                {subtitle}
              </div>
            )}
          </div>
        </div>

        {headerAction && <div className="shrink-0 flex items-center">{headerAction}</div>}
      </div>

      {/* Middle Body Content (e.g. Sliders, Steppers, Metrics) */}
      {children && <div className="relative z-10 my-auto py-0.5">{children}</div>}

      {/* Bottom Footer Content (e.g. Mode Badges, Sub-controls) */}
      {footer && (
        <div className="relative z-10 pt-1.5 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-between gap-2">
          {footer}
        </div>
      )}
    </TileShell>
  );
};

export default StandardTile;
