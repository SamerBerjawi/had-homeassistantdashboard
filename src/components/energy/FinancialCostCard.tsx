/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  CurrencyDollar, 
  TrendUp, 
  TrendDown, 
  Receipt, 
  Coins, 
  Sparkle,
  PiggyBank
} from '@phosphor-icons/react';
import { FinancialsEnergy, DailyTotalsEnergy } from './energyCalculator';

interface FinancialCostCardProps {
  financials: FinancialsEnergy;
  dailyTotals: DailyTotalsEnergy;
  darkMode?: boolean;
}

export default function FinancialCostCard({
  financials,
  dailyTotals,
  darkMode = true
}: FinancialCostCardProps) {
  const {
    importCost,
    exportEarnings,
    netCost,
    currency,
    importTariffPerKWh,
    exportTariffPerKWh
  } = financials;

  const isNetPositive = netCost <= 0; // Net earnings/savings

  return (
    <div className={`relative w-full rounded-3xl p-5 sm:p-7 border backdrop-blur-md transition-all duration-300 overflow-hidden flex flex-col justify-between ${
      darkMode 
        ? 'bg-black/60 border-white/10 text-white shadow-2xl' 
        : 'bg-white/70 border-slate-200/90 text-slate-900 shadow-lg'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shadow-xs">
            <PiggyBank size={22} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Financial Cost & Earnings
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Tariffs
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Real-time grid import expenditures vs feed-in revenue
            </p>
          </div>
        </div>
      </div>

      {/* Financial Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-4">
        
        {/* TILE 1: Grid Import Cost */}
        <div className={`p-4 rounded-2xl border transition-all ${
          darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 text-rose-500">
              <TrendUp size={16} /> Grid Import Cost
            </span>
            <span className="font-mono text-[11px]">{currency}{importTariffPerKWh}/kWh</span>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-slate-900 dark:text-white">
            {currency}{importCost.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {dailyTotals.gridImportKWh.toFixed(2)} kWh imported
          </p>
        </div>

        {/* TILE 2: Grid Export Revenue */}
        <div className={`p-4 rounded-2xl border transition-all ${
          darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-500">
              <TrendDown size={16} /> Export Revenue
            </span>
            <span className="font-mono text-[11px]">{currency}{exportTariffPerKWh}/kWh</span>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            +{currency}{exportEarnings.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {dailyTotals.gridExportKWh.toFixed(2)} kWh exported
          </p>
        </div>

        {/* TILE 3: Net Balance */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isNetPositive 
            ? 'bg-emerald-500/10 border-emerald-500/30' 
            : darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-700 dark:text-slate-300">Net Balance</span>
            <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded-md ${
              isNetPositive ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}>
              {isNetPositive ? 'Net Profit' : 'Net Expense'}
            </span>
          </div>
          <div className={`mt-2 text-2xl font-black font-mono ${
            isNetPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
          }`}>
            {isNetPositive ? `-${currency}${Math.abs(netCost).toFixed(2)}` : `${currency}${netCost.toFixed(2)}`}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {isNetPositive ? 'Solar earnings exceeded grid cost' : 'Combined daily balance'}
          </p>
        </div>

      </div>

      {/* Footer Info */}
      <div className={`pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs font-medium ${
        darkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-600'
      }`}>
        <div className="flex items-center gap-2">
          <Coins size={15} weight="duotone" className="text-amber-500" />
          <span>Estimated Solar Avoided Grid Cost: <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{currency}{(dailyTotals.solarConsumedKWh * importTariffPerKWh).toFixed(2)}</strong></span>
        </div>
      </div>
    </div>
  );
}
