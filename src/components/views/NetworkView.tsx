import React from 'react';
import { ShareNetwork, WifiHigh, Broadcast, Globe, TreeStructure, ShieldCheck, Devices } from '@phosphor-icons/react';

interface ViewProps {
  darkMode?: boolean;
}

export default function NetworkView({ darkMode = true }: ViewProps) {
  return (
    <div className="w-full flex-1 flex flex-col">
      {/* 4-column mobile grid / adaptive desktop grid container */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-3.5 sm:gap-4.5">
        <div className="col-span-4 sm:col-span-6 md:col-span-8 lg:col-span-12 p-8 sm:p-12 rounded-3xl backdrop-blur-xl border flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[360px] bg-slate-900/40 dark:bg-slate-900/40 border-white/10 dark:border-white/10">
          <div className="w-16 h-16 rounded-3xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shadow-lg shadow-sky-500/10 mb-4">
            <ShareNetwork size={32} weight="duotone" />
          </div>

          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight mb-1.5">
            Network & Connectivity
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
            Monitor local gateway health, Wi-Fi signal strengths, connected Zigbee and Matter IoT mesh nodes, and active network bandwidth.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-slate-300">
              <WifiHigh size={15} weight="duotone" className="text-sky-400" />
              <span>Wi-Fi Network</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-slate-300">
              <Devices size={15} weight="duotone" className="text-indigo-400" />
              <span>Connected IoT Clients</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-slate-300">
              <Broadcast size={15} weight="duotone" className="text-amber-400" />
              <span>Zigbee & Matter</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-slate-300">
              <TreeStructure size={15} weight="duotone" className="text-emerald-400" />
              <span>Gateway Ping</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
