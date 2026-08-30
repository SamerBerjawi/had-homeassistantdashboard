/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Receipt, ArrowDownRight, ArrowUpRight } from '@phosphor-icons/react';
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

  return (
    <div
      className={`w-full rounded-3xl p-5 sm:p-6 border backdrop-blur-xl transition-all duration-300 relative flex flex-col justify-between shadow-2xl ${
        darkMode
          ? 'bg-slate-900/80 border-white/10 text-white'
          : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-200/80'
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-2xl border ${
              darkMode
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
            }`}
          >
            <Receipt size={18} weight="fill" />
          </div>
          <div>
            <h3 className={`text-sm font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Cost & Compensation Summary
            </h3>
            <p className={`text-[11px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Financial breakdown based on Home Assistant tariffs
            </p>
          </div>
        </div>

        {/* Net Cost Chip */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Net Cost:</span>
          <div
            className={`px-3 py-1.5 rounded-2xl border font-mono font-black text-xs ${
              netCost <= 0
                ? darkMode
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : darkMode
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-amber-50 border-amber-200 text-amber-700'
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
            <tr className={`border-b font-bold uppercase text-[10px] ${darkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
              <th className="pb-2.5">Energy Source</th>
              <th className="pb-2.5 text-right">Energy / Volume</th>
              <th className="pb-2.5 text-right">Cost / Compensation</th>
            </tr>
          </thead>
          <tbody className={`divide-y font-mono ${darkMode ? 'divide-white/5' : 'divide-slate-200'}`}>
            {sources.map((src, idx) => (
              <tr key={idx} className={`transition-colors ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                <td className={`py-2.5 font-sans font-medium flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  {src.type === 'grid_import' && <ArrowDownRight size={14} className="text-sky-500" />}
                  {src.type === 'grid_export' && <ArrowUpRight size={14} className="text-indigo-500" />}
                  <span>{src.name}</span>
                </td>
                <td className={`py-2.5 text-right font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  {src.energyVal.toFixed(2)} {src.unit}
                </td>
                <td className="py-2.5 text-right font-bold">
                  {src.costOrCompensation !== null ? (
                    <span className={src.type === 'grid_export' ? 'text-emerald-500' : darkMode ? 'text-slate-200' : 'text-slate-800'}>
                      {src.type === 'grid_export' ? '-' : '+'}
                      {src.costOrCompensation.toFixed(2)} {currency}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-sans text-[11px]">Unmetered tariff</span>
                  )}
                </td>
              </tr>
            ))}

            {/* Standing Charges */}
            {standingCharge > 0 && (
              <tr className={`transition-colors ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                <td className={`py-2.5 font-sans font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  Fixed Daily Standing Charge
                </td>
                <td className="py-2.5 text-right text-slate-400 font-sans text-[11px]">
                  Daily base fee
                </td>
                <td className={`py-2.5 text-right font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  +{standingCharge.toFixed(2)} {currency}
                </td>
              </tr>
            )}
          </tbody>

          {/* Net Cost Footer Row */}
          <tfoot>
            <tr className={`border-t-2 font-bold ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
              <td className={`pt-3 font-sans ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Total Net Cost</td>
              <td className="pt-3" />
              <td
                className={`pt-3 text-right font-mono text-sm ${
                  netCost <= 0 ? 'text-emerald-500' : 'text-amber-500'
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
