/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Zap, Clock, TrendingDown, TrendingUp, Sparkles, CheckCircle2, DollarSign } from 'lucide-react';
import CardModalContainer from './CardModalContainer';

interface NordpoolDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FULL_DAY_PRICES = [
  { hour: '00:00', price: 0.08, status: 'cheap' },
  { hour: '01:00', price: 0.07, status: 'cheap' },
  { hour: '02:00', price: 0.05, status: 'cheap' },
  { hour: '03:00', price: 0.04, status: 'lowest' },
  { hour: '04:00', price: 0.05, status: 'cheap' },
  { hour: '05:00', price: 0.07, status: 'cheap' },
  { hour: '06:00', price: 0.12, status: 'normal' },
  { hour: '07:00', price: 0.18, status: 'normal' },
  { hour: '08:00', price: 0.24, status: 'peak' },
  { hour: '09:00', price: 0.22, status: 'peak' },
  { hour: '10:00', price: 0.16, status: 'normal' },
  { hour: '11:00', price: 0.14, status: 'normal' },
  { hour: '12:00', price: 0.13, status: 'normal' },
  { hour: '13:00', price: 0.12, status: 'normal' },
  { hour: '14:00', price: 0.14, status: 'normal' },
  { hour: '15:00', price: 0.17, status: 'normal' },
  { hour: '16:00', price: 0.21, status: 'peak' },
  { hour: '17:00', price: 0.26, status: 'peak' },
  { hour: '18:00', price: 0.28, status: 'peak' },
  { hour: '19:00', price: 0.23, status: 'peak' },
  { hour: '20:00', price: 0.18, status: 'normal' },
  { hour: '21:00', price: 0.15, status: 'normal' },
  { hour: '22:00', price: 0.11, status: 'cheap' },
  { hour: '23:00', price: 0.09, status: 'cheap' }
];

export default function NordpoolDetailModal({
  isOpen,
  onClose
}: NordpoolDetailModalProps) {
  const currentHour = new Date().getHours();
  const [selectedHour, setSelectedHour] = useState<number>(currentHour);

  const selectedData = FULL_DAY_PRICES[selectedHour] || FULL_DAY_PRICES[0];
  const minPrice = Math.min(...FULL_DAY_PRICES.map(p => p.price));
  const maxPrice = Math.max(...FULL_DAY_PRICES.map(p => p.price));
  const avgPrice = FULL_DAY_PRICES.reduce((sum, p) => sum + p.price, 0) / FULL_DAY_PRICES.length;

  return (
    <CardModalContainer
      isOpen={isOpen}
      onClose={onClose}
      title="Nordpool Spot Energy Market"
      subtitle="SE3 Price Area • 24-Hour Spot Tariff"
      icon={<Zap size={22} className="text-amber-400 fill-amber-400" />}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* KPI Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[11px] text-slate-400 block mb-1">Current Price</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-amber-400 font-mono">
                {(FULL_DAY_PRICES[currentHour].price * 100).toFixed(1)}
              </span>
              <span className="text-[10px] text-slate-400">c/kWh</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[11px] text-emerald-300 block mb-1">Lowest Rate</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {(minPrice * 100).toFixed(1)}
              </span>
              <span className="text-[10px] text-emerald-300">c/kWh</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
            <span className="text-[11px] text-rose-300 block mb-1">Peak Rate</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-rose-400 font-mono">
                {(maxPrice * 100).toFixed(1)}
              </span>
              <span className="text-[10px] text-rose-300">c/kWh</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[11px] text-slate-400 block mb-1">24h Average</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-200 font-mono">
                {(avgPrice * 100).toFixed(1)}
              </span>
              <span className="text-[10px] text-slate-400">c/kWh</span>
            </div>
          </div>
        </div>

        {/* 24-Hour Interactive Full Bar Chart */}
        <div className="p-4 sm:p-5 rounded-3xl bg-black/40 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              24-Hour Price Trajectory
            </h4>
            <span className="text-xs text-amber-300 font-mono font-bold">
              Inspecting {selectedData.hour}: {(selectedData.price * 100).toFixed(1)} c/kWh
            </span>
          </div>

          <div className="flex items-end gap-1.5 h-36 pt-4">
            {FULL_DAY_PRICES.map((item, idx) => {
              const isNow = idx === currentHour;
              const isSelected = idx === selectedHour;
              const heightPct = Math.max(((item.price - minPrice) / (maxPrice - minPrice)) * 100, 18);
              const isLowest = item.status === 'lowest';
              const isCheap = item.status === 'cheap';
              const isPeak = item.status === 'peak';

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedHour(idx)}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                >
                  <div
                    className={`w-full rounded-t-md transition-all duration-200 ${
                      isSelected
                        ? 'ring-2 ring-white scale-y-105'
                        : ''
                    } ${
                      isNow
                        ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.7)]'
                        : isLowest
                        ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]'
                        : isCheap
                        ? 'bg-emerald-500/80 hover:bg-emerald-400'
                        : isPeak
                        ? 'bg-rose-500/80 hover:bg-rose-400'
                        : 'bg-indigo-500/60 hover:bg-indigo-400'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className={`text-[8px] mt-1 font-mono ${isSelected ? 'text-white font-bold' : 'text-slate-500'}`}>
                    {idx % 3 === 0 ? idx : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Smart Appliance Scheduling Recommendations */}
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h5 className="text-xs font-bold text-white">Recommended EV & Heat Pump Window</h5>
              <p className="text-[11px] text-emerald-300">
                02:00 &ndash; 05:00 provides consecutive lowest rates (avg 4.3 c/kWh).
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-500/30 shrink-0">
            Save ~64%
          </span>
        </div>
      </div>
    </CardModalContainer>
  );
}
