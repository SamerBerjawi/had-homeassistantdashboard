/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Car,
  Bicycle,
  BatteryCharging,
  BatteryHigh,
  BatteryWarning,
  Lock,
  LockOpen,
  MapPin,
  Gauge as GaugeIcon,
  ShieldCheck,
  ShieldWarning,
  Lightning,
  Sparkle,
  Power,
  GasPump,
  Sliders,
  Thermometer,
  WarningCircle,
  FrameCorners,
  CheckCircle,
  Pulse,
  Circuitry
} from '@phosphor-icons/react';
import { CarEvMetrics, BikeMetrics } from '../../../types/mobility';
import { resolveAssetUrl } from '../../../utils/assetUrl';
import { useUserConfig } from '../../../contexts/ConfigContext';

interface MobilityAssetBadgeProps {
  type: 'car' | 'bike';
  carMetrics?: CarEvMetrics;
  bikeMetrics?: BikeMetrics;
  darkMode?: boolean;
  onOpenCustomizer?: () => void;
}

export function MobilityAssetBadge({
  type,
  carMetrics,
  bikeMetrics,
  darkMode = true,
  onOpenCustomizer
}: MobilityAssetBadgeProps) {
  const { config } = useUserConfig();
  const [carImgError, setCarImgError] = React.useState(false);
  const [bikeImgError, setBikeImgError] = React.useState(false);

  React.useEffect(() => {
    setCarImgError(false);
  }, [carMetrics?.customVehicleImage]);

  React.useEffect(() => {
    setBikeImgError(false);
  }, [bikeMetrics?.customBikeImage]);

  if (type === 'car' && carMetrics) {
    const {
      soc,
      range,
      rangeUnit,
      chargingState,
      chargingPowerKW,
      doorsLocked,
      doorLockStatus,
      windowsClosed,
      windowPositionStatus,
      odometer,
      odometerUnit,
      alarmStatus,
      cabinTemp,
      cabinTempUnit,
      indicatorsStatus,
      battery12V,
      battery12VUnit,
      ignitionStatus,
      locationZone,
      isAtHome,
      customVehicleImage
    } = carMetrics;

    const resolvedCarImage = resolveAssetUrl(customVehicleImage, config?.updatedAt);
    const isCharging = chargingState.toLowerCase().includes('charge');
    const isIgnitionOn = ignitionStatus.toLowerCase() === 'on';
    const isRemoteStarted = ignitionStatus.toLowerCase().includes('remote');
    const isAlarmArmed = alarmStatus.toLowerCase().includes('arm') || alarmStatus.toLowerCase().includes('set');
    const isIndicatorsNormal = indicatorsStatus.toLowerCase().includes('normal') || indicatorsStatus.toLowerCase().includes('ok');
    const batt12VNum = parseFloat(String(battery12V).replace(/[^0-9.]/g, '')) || 14.2;

    return (
      <div className="flex flex-wrap items-center gap-2">
        {/* 1. Vehicle Tracker Badge */}
        <div
          className={`h-9 pl-1 pr-3 rounded-full text-xs font-bold transition-all border flex items-center gap-2 shadow-xs select-none ${
            isAtHome
              ? darkMode
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : darkMode
                ? 'bg-white/5 text-slate-400 border-white/10'
                : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
          title={`Vehicle Tracker: ${locationZone}`}
        >
          <div className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 overflow-hidden">
            {resolvedCarImage && !carImgError ? (
              <img
                src={resolvedCarImage}
                alt="Car"
                className="w-5 h-5 object-contain"
                onError={() => setCarImgError(true)}
              />
            ) : (
              <Car size={15} weight="duotone" />
            )}
          </div>
          <span>{locationZone}</span>
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              isAtHome ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
            }`}
          />
        </div>

        {/* 2. Ignition Status Badge */}
        <div
          className={`h-9 px-3 rounded-full border text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
            isIgnitionOn
              ? darkMode
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : isRemoteStarted
              ? darkMode
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                : 'bg-cyan-50 text-cyan-800 border-cyan-300'
              : darkMode
                ? 'bg-white/5 text-slate-400 border-white/10'
                : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          <Power
            size={16}
            weight="bold"
            className={isIgnitionOn ? 'text-emerald-500' : isRemoteStarted ? 'text-cyan-500 animate-spin' : 'text-slate-400'}
          />
          <span>Ignition: {ignitionStatus}</span>
        </div>

        {/* 3. Charge Level Badge */}
        <div
          className={`h-9 px-3 rounded-full border text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
            soc < 20
              ? darkMode
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                : 'bg-rose-50 text-rose-800 border-rose-300'
              : soc < 50
              ? darkMode
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-amber-50 text-amber-800 border-amber-300'
              : darkMode
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
          }`}
        >
          {isCharging ? (
            <BatteryCharging size={16} weight="duotone" className="text-emerald-500 shrink-0 animate-pulse" />
          ) : soc < 20 ? (
            <BatteryWarning size={16} weight="duotone" className="text-rose-500 shrink-0" />
          ) : (
            <BatteryHigh size={16} weight="duotone" className="text-emerald-500 shrink-0" />
          )}
          <span>{Math.round(soc)}% SoC</span>
        </div>

        {/* 4. Range Badge (from sensor.fordpass_*_elveh) */}
        <div
          className={`h-9 px-3 rounded-full border text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
            range < 50
              ? darkMode
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                : 'bg-rose-50 text-rose-800 border-rose-300'
              : range < 120
              ? darkMode
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-amber-50 text-amber-800 border-amber-300'
              : darkMode
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                : 'bg-cyan-50 text-cyan-800 border-cyan-300'
          }`}
        >
          <GasPump size={16} weight="duotone" className="text-cyan-500 shrink-0" />
          <span>{range} {rangeUnit} Range</span>
        </div>

        {/* 5. Door Lock State Badge */}
        <div
          className={`h-9 px-3 rounded-full border text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
            doorsLocked
              ? darkMode
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : darkMode
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                : 'bg-rose-50 text-rose-800 border-rose-300'
          }`}
        >
          {doorsLocked ? (
            <ShieldCheck size={16} weight="duotone" className="text-emerald-500 shrink-0" />
          ) : (
            <LockOpen size={16} weight="duotone" className="text-rose-500 shrink-0 animate-pulse" />
          )}
          <span>{doorsLocked ? 'Doors Locked' : 'Unlocked'}</span>
        </div>

        {/* 7. Windows Position Badge */}
        <div
          className={`h-9 px-3 rounded-full border text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
            windowsClosed
              ? darkMode
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : darkMode
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-amber-50 text-amber-800 border-amber-300'
          }`}
        >
          <FrameCorners size={16} weight="duotone" className={windowsClosed ? 'text-emerald-500' : 'text-amber-500'} />
          <span>Windows: {windowPositionStatus}</span>
        </div>

        {/* 8. Odometer Badge */}
        <div
          className={`h-9 px-3 rounded-full border text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
            darkMode ? 'bg-white/5 text-slate-300 border-white/10' : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}
        >
          <GaugeIcon size={16} weight="duotone" className="text-sky-500 shrink-0" />
          <span>{odometer.toLocaleString()} {odometerUnit}</span>
        </div>

        {/* 9. Alarm Status Badge */}
        <div
          className={`h-9 px-3 rounded-full border text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
            isAlarmArmed
              ? darkMode
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : darkMode
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                : 'bg-rose-50 text-rose-800 border-rose-300'
          }`}
        >
          <ShieldCheck size={16} weight="duotone" className={isAlarmArmed ? 'text-emerald-500' : 'text-rose-500'} />
          <span>Alarm: {alarmStatus.split(' ')[0]}</span>
        </div>

        {/* 10. Cabin Temperature Badge */}
        <div
          className={`h-9 px-3 rounded-full border text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
            cabinTemp >= 18 && cabinTemp <= 24
              ? darkMode
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                : 'bg-cyan-50 text-cyan-800 border-cyan-300'
              : darkMode
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-amber-50 text-amber-800 border-amber-300'
          }`}
        >
          <Thermometer size={16} weight="duotone" className="text-cyan-500 shrink-0" />
          <span>Cabin: {cabinTemp.toFixed(1)}{cabinTempUnit}</span>
        </div>

        {/* 11. Indicators Badge */}
        <div
          className={`h-9 px-3 rounded-full border text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
            isIndicatorsNormal
              ? darkMode
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : darkMode
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-amber-50 text-amber-800 border-amber-300'
          }`}
        >
          <Pulse size={16} weight="duotone" className={isIndicatorsNormal ? 'text-emerald-500' : 'text-amber-500'} />
          <span>Indicators: {indicatorsStatus.split(' ')[0]}</span>
        </div>

        {/* 12. 12V Battery Badge */}
        <div
          className={`h-9 px-3 rounded-full border text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
            batt12VNum >= 12.6
              ? darkMode
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : batt12VNum >= 11.9
              ? darkMode
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-amber-50 text-amber-800 border-amber-300'
              : darkMode
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                : 'bg-rose-50 text-rose-800 border-rose-300'
          }`}
        >
          <Circuitry size={16} weight="duotone" className="text-emerald-500 shrink-0" />
          <span>12V: {battery12V}{String(battery12V).includes(battery12VUnit) ? '' : battery12VUnit}</span>
        </div>
      </div>
    );
  }

  // Fallback for Bike
  if (type === 'bike' && bikeMetrics) {
    const {
      batteryPercent,
      internalPcbBattery,
      remainingRangeKm,
      isLocked,
      autoLockStatus,
      mileageKm,
      lastSeen,
      locationZone,
      isAtHome,
      customBikeImage
    } = bikeMetrics;

    const resolvedBikeImage = resolveAssetUrl(customBikeImage, config?.updatedAt);

    return (
      <div className="flex flex-wrap items-center gap-2">
        {/* 1. Bike Location / Tracker */}
        <div
          className={`h-9 pl-1 pr-3 rounded-full text-xs font-bold transition-all border flex items-center gap-2 shadow-xs select-none ${
            isAtHome
              ? darkMode
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : darkMode
                ? 'bg-white/5 text-slate-400 border-white/10'
                : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
          title={`Cowboy E-Bike: ${locationZone}`}
        >
          <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 overflow-hidden">
            {resolvedBikeImage && !bikeImgError ? (
              <img
                src={resolvedBikeImage}
                alt="Bike"
                className="w-5 h-5 object-contain"
                onError={() => setBikeImgError(true)}
              />
            ) : (
              <Bicycle size={15} weight="duotone" />
            )}
          </div>
          <span>{locationZone}</span>
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              isAtHome ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
            }`}
          />
        </div>

        {/* 2. Battery */}
        <div
          className={`h-9 px-3 rounded-full border text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
            batteryPercent < 20
              ? darkMode
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                : 'bg-rose-50 text-rose-800 border-rose-300'
              : batteryPercent < 50
              ? darkMode
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-amber-50 text-amber-800 border-amber-300'
              : darkMode
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
          }`}
        >
          <BatteryCharging size={16} weight="duotone" className="text-emerald-500 shrink-0" />
          <span>{Math.round(batteryPercent)}% Battery</span>
        </div>

        {/* 3. Range */}
        <div
          className={`h-9 px-3 rounded-full border text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
            darkMode ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-300'
          }`}
        >
          <GasPump size={16} weight="duotone" className="text-amber-500 shrink-0" />
          <span>~{remainingRangeKm} km Range</span>
        </div>

        {/* 4. Lock */}
        <div
          className={`h-9 px-3 rounded-full border text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
            isLocked
              ? darkMode
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : darkMode
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                : 'bg-rose-50 text-rose-800 border-rose-300'
          }`}
        >
          {isLocked ? (
            <ShieldCheck size={16} weight="duotone" className="text-emerald-500 shrink-0" />
          ) : (
            <LockOpen size={16} weight="duotone" className="text-rose-500 shrink-0 animate-pulse" />
          )}
          <span>{isLocked ? 'Motor Locked' : 'Unlocked'}</span>
        </div>

        {/* 5. Mileage */}
        <div
          className={`h-9 px-3 rounded-full border text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
            darkMode ? 'bg-white/5 text-slate-300 border-white/10' : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}
        >
          <GaugeIcon size={16} weight="duotone" className="text-sky-500 shrink-0" />
          <span>{mileageKm.toLocaleString()} km</span>
        </div>

        {/* 6. PCB Battery */}
        <div
          className={`h-9 px-3 rounded-full border text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
            darkMode ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' : 'bg-cyan-50 text-cyan-800 border-cyan-300'
          }`}
        >
          <Circuitry size={16} weight="duotone" className="text-cyan-500 shrink-0" />
          <span>PCB: {internalPcbBattery}%</span>
        </div>
      </div>
    );
  }

  return null;
}
