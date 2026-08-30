/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CurrencyDollar, Receipt, ArrowDownRight, ArrowUpRight } from '@phosphor-icons/react';
import { TransformedFinancials } from '../../services/energyDataTransformer';

interface EnergySourcesTableCardProps {
  financials: TransformedFinancials;
  darkMode?: boolean;
}

export default function EnergySourcesTableCard({
  financials,
  darkMode = true
}: EnergySourcesTableCardProps) {
  const { sources = [], standingCharge = 0, netCost = 0, currency = '€' } = financials;

  const hasCosts = sources.some((s) => s.costOrCompensation !== null) || standingCharge > 0;

  return (
    <div
      className={`w-full rounded-3xl p-5 sm:p-6 border backdrop-blur-xl transition-all duration-300 relative flex flex-col justify-between ${
        darkMode
          ? 'bg-slate-900/80 border-white/10 text-white shadow-2xl'
          : 'bg-white/90 border-slate-200/80 text-slate-900 shadow-xl'
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Receipt size={18} weight="fill" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold tracking-tight">Cost & Compensation Summary</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Financial breakdown based on Home Assistant tariffs
            </p>
          </div>
        </div>

        {/* Net Cost Chip */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Net Cost:</span>
          <div
            className={`px-3 py-1.5 rounded-2xl border font-mono font-black text-xs ${
              netCost <= 0
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
            }`}
          >
            {netCost.toFixed(2)} {currency}
          </div>
        </div>
      </div>

      {/* Sources Table */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-slate-400 font-bold uppercase text-[10px]">
              <th className="pb-2.5">Energy Source</th>
              <th className="pb-2.5 text-right">Energy / Volume</th>
              <th className="pb-2.5 text-right">Cost / Compensation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {sources.map((src, idx) => (
              <tr key={idx} className="hover:bg-white/5 transition-colors">
                <td className="py-2.5 font-sans font-medium text-slate-200 flex items-center gap-2">
                  {src.type === 'grid_import' && <ArrowDownRight size={14} className="text-sky-400" />}
                  {src.type === 'grid_export' && <ArrowUpRight size={14} className="text-indigo-400" />}
                  <span>{src.name}</span>
                </td>
                <td className="py-2.5 text-right text-slate-300 font-bold">
                  {src.energyVal.toFixed(2)} {src.unit}
                </td>
                <td className="py-2.5 text-right font-bold">
                  {src.costOrCompensation !== null ? (
                    <span className={src.type === 'grid_export' ? 'text-emerald-400' : 'text-slate-200'}>
                      {src.type === 'grid_export' ? '-' : '+'}
                      {src.costOrCompensation.toFixed(2)} {currency}
                    </span>
                  ) : (
                    <span className="text-slate-500 font-sans text-[11px]">Unmetered tariff</span>
                  )}
                </td>
              </tr>
            ))}

            {/* Standing Charges */}
            {standingCharge > 0 && (
              <tr className="hover:bg-white/5 transition-colors">
                <td className="py-2.5 font-sans font-medium text-slate-200">
                  Fixed Daily Standing Charge
                </td>
                <td className="py-2.5 text-right text-slate-500 font-sans text-[11px]">
                  Daily base fee
                </td>
                <td className="py-2.5 text-right font-bold text-slate-200">
                  +{standingCharge.toFixed(2)} {currency}
                </td>
              </tr>
            )}
          </tbody>

          {/* Net Cost Footer Row */}
          <tfoot>
            <tr className="border-t-2 border-white/10 font-bold">
              <td className="pt-3 font-sans text-slate-200">Total Net Cost</td>
              <td className="pt-3" />
              <td
                className={`pt-3 text-right font-mono text-sm ${
                  netCost <= 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {netCost.toFixed(2)} {currency}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
