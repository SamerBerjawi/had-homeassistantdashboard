/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Zap, TrendingDown, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { CardConfig } from '../../../types/canvas';
import { HAEntity } from '../../../types';

interface NordpoolCardProps {
  config: CardConfig;
  entity?: HAEntity;
  onOpenModal: () => void;
}

// 24h Spot Price Simulation Dataset (SE3 / Central EU zone)
const HOURLY_PRICES = [
  { hour: 0, price: 0.08 },
  { hour: 1, price: 0.07 },
  { hour: 2, price: 0.05 },
  { hour: 3, price: 0.04 }, // Lowest
  { hour: 4, price: 0.05 },
  { hour: 5, price: 0.07 },
  { hour: 6, price: 0.12 },
  { hour: 7, price: 0.18 },
  { hour: 8, price: 0.24 }, // Peak morning
  { hour: 9, price: 0.22 },
  { hour: 10, price: 0.16 },
  { hour: 11, price: 0.14 },
  { hour: 12, price: 0.13 },
  { hour: 13, price: 0.12 },
  { hour: 14, price: 0.14 },
  { hour: 15, price: 0.17 },
  { hour: 16, price: 0.21 },
  { hour: 17, price: 0.26 }, // Peak evening
  { hour: 18, price: 0.28 }, // Peak
  { hour: 19, price: 0.23 },
  { hour: 20, price: 0.18 },
  { hour: 21, price: 0.15 },
  { hour: 22, price: 0.11 },
  { hour: 23, price: 0.09 }
];

export default function NordpoolCard({
  config,
  entity,
  onOpenModal
}: NordpoolCardProps) {
  const currentHour = new Date().getHours();
  const currentPrice = HOURLY_PRICES[currentHour]?.price ?? 0.14;
  const minPrice = Math.min(...HOURLY_PRICES.map(p => p.price));
  const maxPrice = Math.max(...HOURLY_PRICES.map(p => p.price));
  const avgPrice = HOURLY_PRICES.reduce((s, p) => s + p.price, 0) / HOURLY_PRICES.length;
  
  const isCheap = currentPrice < avgPrice * 0.85;
  const isExpensive = currentPrice > avgPrice * 1.25;

  const title = config.title || 'Nordpool Spot Price';

  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* Top row: Title and Rating badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-400 flex items-center justify-center shadow-md shadow-amber-500/10">
            <Zap size={20} className="fill-amber-400/30" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white truncate">{title}</h4>
            <p className="text-[11px] text-slate-400 truncate">SE3 Spot Market</p>
          </div>
        </div>

        {/* Dynamic Status Pill */}
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
            isCheap
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : isExpensive
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
          }`}
        >
          {isCheap ? 'Cheap Rate' : isExpensive ? 'Peak Rate' : 'Normal Rate'}
        </span>
      </div>

      {/* Center: Large Current Price Display & 24h Trend Preview */}
      <div className="my-2">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white font-mono tracking-tight leading-none">
              {(currentPrice * 100).toFixed(1)}
            </span>
            <span className="text-xs text-slate-400 font-bold">c/kWh</span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-0.5">
            <TrendingDown size={12} /> -12% vs avg
          </span>
        </div>

        {/* 24-Hour Interactive Micro-Bar Graph */}
        <div className="flex items-end gap-1 h-9 mt-2 pt-1">
          {HOURLY_PRICES.map((p, idx) => {
            const isNow = idx === currentHour;
            const heightPct = Math.max(((p.price - minPrice) / (maxPrice - minPrice)) * 100, 15);
            const isBarCheap = p.price <= minPrice + 0.02;
            const isBarPeak = p.price >= maxPrice - 0.03;

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center group/bar relative"
                title={`${idx}:00 - ${(p.price * 100).toFixed(1)} c/kWh`}
              >
                <div
                  className={`w-full rounded-t-sm transition-all ${
                    isNow
                      ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                      : isBarCheap
                      ? 'bg-emerald-400/80 hover:bg-emerald-300'
                      : isBarPeak
                      ? 'bg-rose-400/80 hover:bg-rose-300'
                      : 'bg-white/20 hover:bg-white/40'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom info: Optimal charging window */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-white/10">
        <span className="flex items-center gap-1 text-slate-300">
          <Clock size={11} className="text-amber-400" /> Best Window: 02:00 - 05:00
        </span>
        <span className="font-mono text-slate-400">
          Min: {(minPrice * 100).toFixed(0)}c / Max: {(maxPrice * 100).toFixed(0)}c
        </span>
      </div>
    </div>
  );
}
