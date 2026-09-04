/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Critical Emergency Hazard Alert Modal
 * Full-screen glassmorphic overlay with pulsating crimson hazard glow.
 * Overrides the kiosk UI until explicitly acknowledged by user.
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  Drop,
  Warning,
  ShieldWarning,
  Siren,
  MapPin,
  CheckCircle,
  ArrowSquareOut
} from '@phosphor-icons/react';
import { useAlertStore } from '../../store/useAlertStore';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';
import { isRainOrWeatherSensor } from '../../lib/entityClassifiers';

interface CriticalAlertModalProps {
  onNavigateArea?: (areaId: string) => void;
}

export const CriticalAlertModal: React.FC<CriticalAlertModalProps> = ({ onNavigateArea }) => {
  const { criticalAlert, acknowledgeCriticalAlert } = useAlertStore();
  const resolvedEntities = useAutoLayoutStore((s) => s.resolvedEntities);

  const targetEntity = criticalAlert?.entityId ? resolvedEntities[criticalAlert.entityId] : null;

  // Rain and weather sensors must never lock the kiosk in emergency modal mode
  useEffect(() => {
    if (criticalAlert) {
      if (isRainOrWeatherSensor({ 
        entity_id: criticalAlert.entityId, 
        name: `${criticalAlert.title} ${criticalAlert.message}`,
        attributes: targetEntity?.attributes 
      })) {
        acknowledgeCriticalAlert();
      }
    }
  }, [criticalAlert, targetEntity, acknowledgeCriticalAlert]);

  if (!criticalAlert) return null;

  const areaId = targetEntity?.area_id;

  const getHazardMeta = (sensorType: string) => {
    switch (sensorType) {
      case 'smoke':
        return {
          icon: <Flame size={48} weight="fill" className="text-rose-400" />,
          title: 'SMOKE DETECTED',
          glowColor: 'rgba(244, 63, 94, 0.45)',
          bgColor: 'from-rose-950/90 to-slate-950/95'
        };
      case 'gas':
        return {
          icon: <Warning size={48} weight="fill" className="text-amber-400" />,
          title: 'COMBUSTIBLE GAS DETECTED',
          glowColor: 'rgba(245, 158, 11, 0.45)',
          bgColor: 'from-amber-950/90 to-slate-950/95'
        };
      case 'co':
        return {
          icon: <ShieldWarning size={48} weight="fill" className="text-amber-400" />,
          title: 'CARBON MONOXIDE ALERT',
          glowColor: 'rgba(234, 88, 12, 0.45)',
          bgColor: 'from-orange-950/90 to-slate-950/95'
        };
      case 'moisture':
        return {
          icon: <Drop size={48} weight="fill" className="text-cyan-400" />,
          title: 'WATER LEAK DETECTED',
          glowColor: 'rgba(6, 182, 212, 0.45)',
          bgColor: 'from-cyan-950/90 to-slate-950/95'
        };
      case 'alarm':
        return {
          icon: <Siren size={48} weight="fill" className="text-rose-400" />,
          title: 'INTRUSION ALARM TRIGGERED',
          glowColor: 'rgba(244, 63, 94, 0.5)',
          bgColor: 'from-rose-950/90 to-slate-950/95'
        };
      default:
        return {
          icon: <ShieldWarning size={48} weight="fill" className="text-rose-400" />,
          title: 'SAFETY HAZARD DETECTED',
          glowColor: 'rgba(244, 63, 94, 0.45)',
          bgColor: 'from-rose-950/90 to-slate-950/95'
        };
    }
  };

  const meta = getHazardMeta(criticalAlert.sensorType);

  return (
    <AnimatePresence>
      <div
        role="alertdialog"
        aria-modal="true"
        className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6"
      >
        {/* Deep Backdrop with Hazard Pulse */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/85 backdrop-blur-2xl"
        />

        {/* Pulsating Radial Halo */}
        <div
          className="absolute inset-0 pointer-events-none animate-pulse"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${meta.glowColor} 0%, transparent 70%)`
          }}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`relative z-10 w-full max-w-lg rounded-3xl border-2 border-rose-500/80 bg-gradient-to-b ${meta.bgColor} p-6 sm:p-8 text-white shadow-[0_0_80px_rgba(244,63,94,0.35)] flex flex-col items-center text-center gap-5 overflow-hidden`}
        >
          {/* Animated Pulsing Icon Rings */}
          <div className="relative flex items-center justify-center">
            <div className="absolute w-24 h-24 rounded-full bg-rose-500/20 animate-ping" />
            <div className="relative w-20 h-20 rounded-2xl bg-rose-500/25 border border-rose-500/60 flex items-center justify-center shadow-lg">
              {meta.icon}
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-rose-300 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 inline-block animate-pulse">
              Emergency Safety Alert
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-2">
              {meta.title}
            </h2>
          </div>

          {/* Message Body */}
          <p className="text-sm sm:text-base text-rose-100/90 max-w-md leading-relaxed">
            {criticalAlert.message}
          </p>

          {/* Location Badge if Area Available */}
          {criticalAlert.areaName && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/20 text-xs font-semibold">
              <MapPin size={16} weight="fill" className="text-rose-400" />
              <span>Location: {criticalAlert.areaName}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="w-full flex flex-col sm:flex-row items-center gap-3 pt-3">
            {/* Primary: Acknowledge & Silence */}
            <button
              type="button"
              onClick={acknowledgeCriticalAlert}
              className="w-full flex-1 py-3.5 px-6 rounded-2xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 active:scale-95 text-white font-bold text-sm sm:text-base shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle size={20} weight="bold" />
              <span>Acknowledge & Silence</span>
            </button>

            {/* Optional Room Drilldown */}
            {areaId && onNavigateArea && (
              <button
                type="button"
                onClick={() => {
                  acknowledgeCriticalAlert();
                  onNavigateArea(areaId);
                }}
                className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-semibold text-sm border border-white/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>View Room</span>
                <ArrowSquareOut size={16} weight="bold" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CriticalAlertModal;
