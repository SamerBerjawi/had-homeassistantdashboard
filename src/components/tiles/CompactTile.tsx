/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Compact Tile (2x1 Grid Units)
 * Ultra-dense tile format for switches, locks, and binary sensors.
 * Ensures touch target >= 44x44px for primary buttons and generous title/info spacing.
 */

import React from 'react';
import TileShell from './TileShell';

interface CompactTileProps {
  darkMode?: boolean;
  title: string;
  subtitle?: React.ReactNode;
  icon: React.ReactNode;
  isActive?: boolean;
  isAlert?: boolean;
  accentColor?: string;
  activeBorderColor?: string;
  badge?: React.ReactNode;
  actionButton?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  onIconClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const CompactTile: React.FC<CompactTileProps> = ({
  darkMode = true,
  title,
  subtitle,
  icon,
  isActive = false,
  isAlert = false,
  accentColor,
  activeBorderColor,
  badge,
  actionButton,
  onClick,
  onIconClick,
  onContextMenu
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
      className={`p-3 sm:p-3.5 ${badge ? 'min-h-[84px] justify-between' : 'min-h-[72px] justify-center'}`}
    >
      <div className={`flex flex-col justify-between h-full w-full relative z-10 ${badge ? 'gap-1.5' : ''}`}>
        {/* Main Row: Icon + Title & Subtitle + Optional Action Button */}
        <div className="flex items-center justify-between gap-2 min-w-0 w-full">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {onIconClick ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onIconClick();
                }}
                title="Open Device Details"
                className="shrink-0 flex items-center justify-center min-w-[32px] min-h-[32px] rounded-xl hover:bg-white/10 dark:hover:bg-white/10 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                {icon}
              </button>
            ) : (
              <div className="shrink-0 flex items-center justify-center min-w-[32px] min-h-[32px]">
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <h4
                className={`text-xs sm:text-sm font-bold truncate leading-tight ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                {title}
              </h4>
              {subtitle && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 leading-tight font-medium flex items-center">
                  {subtitle}
                </div>
              )}
            </div>
          </div>

          {/* Action button if present */}
          {actionButton && (
            <div className="flex items-center shrink-0">
              {actionButton}
            </div>
          )}
        </div>

        {/* Separate bottom line for Sensor / Status Badge */}
        {badge && (
          <div className="flex items-center justify-start w-full pt-0.5">
            {badge}
          </div>
        )}
      </div>
    </TileShell>
  );
};

export default CompactTile;
