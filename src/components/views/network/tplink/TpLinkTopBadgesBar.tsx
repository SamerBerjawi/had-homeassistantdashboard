/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  WifiHigh,
  Broadcast,
  Radio,
  LockKey,
  QrCode,
  Check,
  Copy,
  X,
  ArrowsClockwise
} from '@phosphor-icons/react';
import { TpLinkRouterMetrics } from '../../../../types/network';

interface TpLinkTopBadgesBarProps {
  wifiSwitches: TpLinkRouterMetrics['wifiSwitches'];
  onToggleSwitch: (entityId: string, currentState: boolean) => void;
  darkMode?: boolean;
}

export const TpLinkTopBadgesBar: React.FC<TpLinkTopBadgesBarProps> = ({
  wifiSwitches,
  onToggleSwitch,
  darkMode = true
}) => {
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);

  const guestSsid = wifiSwitches.guest24Ghz.ssid || 'Antigravity-Guest';
  const guestPass = wifiSwitches.guest24Ghz.key || 'WelcomeGuest2026!';
  const qrString = `WIFI:S:${guestSsid};T:WPA;P:${guestPass};;`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    qrString
  )}`;

  const handleCopyGuestPass = () => {
    navigator.clipboard.writeText(guestPass);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="w-full flex items-center justify-between flex-wrap gap-2.5 pb-1">
      {/* Horizontal Badges Controls Bar in Overview Badge Style */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 2.4 GHz Host Badge */}
        <button
          type="button"
          onClick={() =>
            onToggleSwitch(
              wifiSwitches.host24Ghz.entityId || 'switch.archer_ax55_wifi_2_4g',
              wifiSwitches.host24Ghz.enabled
            )
          }
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm ${
            wifiSwitches.host24Ghz.enabled
              ? darkMode
                ? 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                : 'bg-sky-50 border-sky-300 text-sky-700'
              : darkMode
              ? 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
              : 'bg-slate-100 border-slate-200 text-slate-500'
          }`}
        >
          <WifiHigh size={15} weight={wifiSwitches.host24Ghz.enabled ? 'bold' : 'regular'} />
          <span>Host 2.4G</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              wifiSwitches.host24Ghz.enabled ? 'bg-sky-400 animate-pulse' : 'bg-slate-400 opacity-40'
            }`}
          />
        </button>

        {/* 5 GHz Host Badge */}
        <button
          type="button"
          onClick={() =>
            onToggleSwitch(
              wifiSwitches.host5Ghz.entityId || 'switch.archer_ax55_wifi_5g',
              wifiSwitches.host5Ghz.enabled
            )
          }
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm ${
            wifiSwitches.host5Ghz.enabled
              ? darkMode
                ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
                : 'bg-indigo-50 border-indigo-300 text-indigo-700'
              : darkMode
              ? 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
              : 'bg-slate-100 border-slate-200 text-slate-500'
          }`}
        >
          <WifiHigh size={15} weight={wifiSwitches.host5Ghz.enabled ? 'bold' : 'regular'} />
          <span>Host 5G</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              wifiSwitches.host5Ghz.enabled ? 'bg-indigo-400 animate-pulse' : 'bg-slate-400 opacity-40'
            }`}
          />
        </button>

        {/* Wi-Fi 6E (6 GHz) Badge */}
        <button
          type="button"
          onClick={() =>
            onToggleSwitch(
              wifiSwitches.host6Ghz?.entityId || 'switch.archer_ax55_wifi_6g',
              wifiSwitches.host6Ghz?.enabled ?? true
            )
          }
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm ${
            wifiSwitches.host6Ghz?.enabled
              ? darkMode
                ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                : 'bg-purple-50 border-purple-300 text-purple-700'
              : darkMode
              ? 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
              : 'bg-slate-100 border-slate-200 text-slate-500'
          }`}
        >
          <Broadcast size={15} weight={wifiSwitches.host6Ghz?.enabled ? 'bold' : 'regular'} />
          <span>Host 6G (6E)</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              wifiSwitches.host6Ghz?.enabled ? 'bg-purple-400 animate-pulse' : 'bg-slate-400 opacity-40'
            }`}
          />
        </button>

        {/* IoT 2.4G Isolated Badge */}
        <button
          type="button"
          onClick={() =>
            onToggleSwitch(
              wifiSwitches.iot24Ghz?.entityId || wifiSwitches.iotNetwork?.entityId || 'switch.archer_ax55_iot_wifi_2_4g',
              wifiSwitches.iot24Ghz?.enabled ?? wifiSwitches.iotNetwork?.enabled ?? true
            )
          }
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm ${
            wifiSwitches.iot24Ghz?.enabled || wifiSwitches.iotNetwork?.enabled
              ? darkMode
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-amber-50 border-amber-300 text-amber-700'
              : darkMode
              ? 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
              : 'bg-slate-100 border-slate-200 text-slate-500'
          }`}
        >
          <LockKey size={14} />
          <span>IoT Wi-Fi</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              wifiSwitches.iot24Ghz?.enabled || wifiSwitches.iotNetwork?.enabled ? 'bg-amber-400' : 'bg-slate-400 opacity-40'
            }`}
          />
        </button>

        {/* Guest 2.4G & 5G Badge */}
        <div className="flex items-center rounded-xl border overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() =>
              onToggleSwitch(
                wifiSwitches.guest24Ghz.entityId || 'switch.archer_ax55_guest_wifi_2_4g',
                wifiSwitches.guest24Ghz.enabled
              )
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              wifiSwitches.guest24Ghz.enabled
                ? darkMode
                  ? 'bg-rose-500/15 text-rose-400'
                  : 'bg-rose-50 text-rose-700'
                : darkMode
                ? 'bg-white/5 text-slate-500 hover:text-slate-300'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            <Radio size={15} weight={wifiSwitches.guest24Ghz.enabled ? 'bold' : 'regular'} />
            <span>Guest Wi-Fi</span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                wifiSwitches.guest24Ghz.enabled ? 'bg-rose-400 animate-pulse' : 'bg-slate-400 opacity-40'
              }`}
            />
          </button>
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            title="Open Guest Wi-Fi QR Code"
            className={`px-2 py-1.5 border-l transition-all cursor-pointer ${
              darkMode
                ? 'bg-white/5 border-white/10 hover:bg-white/10 text-rose-400'
                : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-rose-600'
            }`}
          >
            <QrCode size={14} />
          </button>
        </div>

        {/* Router Data Fetching Switch Badge */}
        <button
          type="button"
          onClick={() =>
            wifiSwitches.routerDataFetching?.entityId &&
            onToggleSwitch(
              wifiSwitches.routerDataFetching.entityId,
              wifiSwitches.routerDataFetching.enabled
            )
          }
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm ${
            wifiSwitches.routerDataFetching?.enabled
              ? darkMode
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-emerald-50 border-emerald-300 text-emerald-700'
              : darkMode
              ? 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
              : 'bg-slate-100 border-slate-200 text-slate-500'
          }`}
        >
          <ArrowsClockwise size={14} />
          <span>Polling</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              wifiSwitches.routerDataFetching?.enabled ? 'bg-emerald-400' : 'bg-slate-400 opacity-40'
            }`}
          />
        </button>
      </div>

      {/* Guest Wi-Fi QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xs rounded-3xl bg-slate-900 border border-white/20 p-5 shadow-2xl flex flex-col items-center text-center">
            <div className="w-full flex items-center justify-between pb-2 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <QrCode size={16} />
                <span>Guest Wi-Fi QR Code</span>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-3 bg-white rounded-2xl shadow-inner my-2">
              <img src={qrCodeUrl} alt="Guest Wi-Fi QR Code" className="w-40 h-40 object-contain" />
            </div>

            <p className="text-[11px] text-slate-300 mt-1 mb-3">
              Scan with phone camera to connect instantly to <strong>{guestSsid}</strong>
            </p>

            <div className="w-full flex items-center justify-between px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-xs">
              <div className="text-left">
                <span className="text-[9px] text-slate-400 block">Password:</span>
                <span className="font-mono font-bold text-white">{guestPass}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyGuestPass}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer"
              >
                {copiedKey ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
