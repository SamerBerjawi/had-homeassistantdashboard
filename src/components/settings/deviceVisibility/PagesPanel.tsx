/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Eye, EyeSlash, Lock, SidebarSimple } from '@phosphor-icons/react';
import { NAVIGATION_PAGES } from './shared';
import type { DeviceVisibilityState } from './useDeviceVisibilityState';

export default function PagesPanel({ s }: { s: DeviceVisibilityState }) {
  const {
    handleShowAllPages,
    handleTogglePageVisibility,
    hiddenPagesList,
    hiddenPagesSet,
    visiblePagesCount
  } = s;
  return (
    <div className="space-y-4">
      {/* Header Banner & Quick Controls */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white/70 dark:bg-black/25 border border-slate-200/90 dark:border-white/10 backdrop-blur-md shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                <SidebarSimple size={18} weight="bold" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">
                Navigation Menu Pages
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                {visiblePagesCount} of {NAVIGATION_PAGES.length} Visible
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
              Customize which pages appear in the sidebar and mobile navigation. Hidden pages are completely removed from navigation menus. Overview and Settings are required and stay permanently visible.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <button
              type="button"
              onClick={handleShowAllPages}
              disabled={hiddenPagesList.length === 0}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                hiddenPagesList.length > 0
                  ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20 shadow-xs cursor-pointer'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-white/5 cursor-not-allowed opacity-60'
              }`}
            >
              <Eye size={14} weight="bold" />
              <span>Show All Optional Pages</span>
            </button>
          </div>
        </div>
      </div>

      {/* Page Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {NAVIGATION_PAGES.map((page) => {
          const isHidden = hiddenPagesSet.has(page.id);
          const isMandatory = page.mandatory;
          const PageIcon = page.icon;

          return (
            <div
              key={page.id}
              className={`group relative p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                isHidden
                  ? 'bg-slate-50/60 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/5 opacity-75 hover:opacity-100'
                  : 'bg-white/80 dark:bg-white/[0.04] border-slate-200/90 dark:border-white/10 shadow-xs hover:shadow-md hover:border-cyan-500/30 dark:hover:border-cyan-500/30'
              }`}
            >
              {/* Top Row: Icon + Title + Mandatory Badge / Toggle Switch */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105"
                      style={{
                        backgroundColor: `${page.color}15`,
                        color: page.color,
                        borderColor: `${page.color}30`
                      }}
                    >
                      <PageIcon size={22} weight={isHidden ? 'regular' : 'bold'} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                          {page.label}
                        </h4>
                        {isMandatory && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-300/40 dark:border-white/10">
                            <Lock size={10} weight="bold" />
                            Required
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                        /{page.id}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Control or Lock */}
                  <div className="shrink-0 flex items-center">
                    {isMandatory ? (
                      <div
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500"
                        title="Required page cannot be hidden"
                      >
                        <Lock size={16} weight="bold" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!isHidden}
                        aria-label={`Toggle visibility of ${page.label}`}
                        onClick={() => handleTogglePageVisibility(page.id, isHidden)}
                        className={`w-12 h-6.5 rounded-full p-0.5 transition-colors duration-200 flex items-center cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-cyan-500/40 ${
                          !isHidden
                            ? 'bg-emerald-500 dark:bg-emerald-500 shadow-sm shadow-emerald-500/20 justify-end'
                            : 'bg-slate-300 dark:bg-slate-700 justify-start'
                        }`}
                      >
                        <motion.div
                          layout
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="w-5.5 h-5.5 rounded-full bg-white shadow-xs flex items-center justify-center"
                        >
                          {!isHidden ? (
                            <Eye size={12} weight="bold" className="text-emerald-600" />
                          ) : (
                            <EyeSlash size={12} weight="bold" className="text-slate-500" />
                          )}
                        </motion.div>
                      </button>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 mb-3">
                  {page.description}
                </p>
              </div>

              {/* Bottom Status Row */}
              <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 font-medium">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      !isHidden ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  <span className={!isHidden ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                    {!isHidden ? 'Visible in Navigation' : 'Hidden from Navigation'}
                  </span>
                </span>

                <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                  {isMandatory ? 'Permanent' : isHidden ? 'Inactive' : 'Active'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
