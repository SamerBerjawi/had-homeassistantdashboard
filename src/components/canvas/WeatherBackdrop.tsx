/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WeatherBackdropType } from '../../types/canvas';
import { HAEntity } from '../../types';

interface WeatherBackdropProps {
  backdropType?: WeatherBackdropType;
  weatherEntity?: HAEntity;
  darkMode?: boolean;
  isContained?: boolean;
  className?: string;
}

export default function WeatherBackdrop({
  backdropType = 'auto',
  weatherEntity,
  darkMode = true,
  isContained = true,
  className = ''
}: WeatherBackdropProps) {
  // Resolve effective condition
  const effectiveType = useMemo<Exclude<WeatherBackdropType, 'auto'>>(() => {
    if (backdropType !== 'auto') {
      return backdropType;
    }

    if (!weatherEntity) {
      return darkMode ? 'starry-night' : 'sunny';
    }

    const state = (weatherEntity.state || '').toLowerCase();
    const condCode = (weatherEntity.attributes?.conditionCode || '').toLowerCase();

    if (state.includes('rain') || condCode.includes('rain') || state.includes('drizzle')) {
      return 'rain';
    }
    if (state.includes('storm') || condCode.includes('storm') || state.includes('lightning')) {
      return 'storm';
    }
    if (state.includes('snow') || condCode.includes('snow') || state.includes('flurry')) {
      return 'snow';
    }
    if (state.includes('cloud') || condCode.includes('cloudy') || condCode.includes('partly')) {
      return condCode.includes('partly') ? 'partly-cloudy' : 'cloudy';
    }
    if (state.includes('clear-night') || state.includes('night')) {
      return 'starry-night';
    }
    return darkMode ? 'starry-night' : 'sunny';
  }, [backdropType, weatherEntity, darkMode]);

  // Generate random rain streaks
  const rainDrops = useMemo(() => {
    return Array.from({ length: 32 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
      duration: `${0.6 + Math.random() * 0.5}s`,
      height: `${18 + Math.random() * 26}px`,
      opacity: 0.25 + Math.random() * 0.65
    }));
  }, []);

  // Generate random stars
  const stars = useMemo(() => {
    return Array.from({ length: 35 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 85}%`,
      size: `${1.2 + Math.random() * 2}px`,
      delay: `${Math.random() * 4}s`,
      duration: `${2 + Math.random() * 3}s`
    }));
  }, []);

  // Generate snow flakes
  const snowflakes = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 4}s`,
      duration: `${3.5 + Math.random() * 4}s`,
      size: `${2.5 + Math.random() * 3.5}px`,
      opacity: 0.35 + Math.random() * 0.6
    }));
  }, []);

  const wrapperClass = isContained
    ? `absolute inset-0 pointer-events-none overflow-hidden rounded-3xl z-0 transition-colors duration-700 ${className}`
    : `fixed inset-0 pointer-events-none overflow-hidden z-0 transition-colors duration-1000 ${className}`;

  return (
    <div className={wrapperClass}>
      <AnimatePresence mode="wait">
        {effectiveType === 'sunny' && (
          <motion.div
            key="sunny"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            {/* Radiant Sun Glow in Top Corner */}
            <div className="absolute -top-32 -right-32 w-160 h-160 rounded-full bg-linear-to-br from-amber-400/25 via-orange-500/15 to-transparent blur-[120px]" />
            <div className="absolute top-10 right-20 w-72 h-72 rounded-full bg-amber-300/20 blur-[80px] animate-[sun-flare-pulse_12s_infinite_ease-in-out]" />
            <div className="absolute -bottom-20 left-10 w-120 h-120 rounded-full bg-indigo-500/10 blur-[130px]" />
            
            {/* Subtle floating sunbeams */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-amber-200/10 via-transparent to-transparent" />
          </motion.div>
        )}

        {effectiveType === 'partly-cloudy' && (
          <motion.div
            key="partly-cloudy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            {/* Sun flare behind clouds */}
            <div className="absolute top-0 right-1/4 w-120 h-120 rounded-full bg-amber-400/20 blur-[100px]" />
            
            {/* Volumetric Clouds */}
            <div className="absolute top-10 -left-20 w-150 h-75 bg-slate-300/15 rounded-full blur-[70px] animate-[cloud-drift-slow_35s_infinite_linear]" />
            <div className="absolute top-40 -right-25 w-175 h-87.5 bg-slate-200/20 rounded-full blur-[90px] animate-[cloud-drift-slow_45s_infinite_linear_reverse]" />
            <div className="absolute bottom-10 left-1/3 w-125 h-62.5 bg-indigo-300/10 rounded-full blur-[80px]" />
          </motion.div>
        )}

        {effectiveType === 'cloudy' && (
          <motion.div
            key="cloudy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            <div className="absolute inset-0 bg-linear-to-b from-slate-800/25 via-slate-900/15 to-transparent" />
            <div className="absolute -top-12.5 left-[-10%] w-[120%] h-112.5 bg-slate-600/20 rounded-full blur-[100px] animate-[cloud-drift-slow_40s_infinite_linear]" />
            <div className="absolute top-[30%] right-[-10%] w-full h-100 bg-slate-500/15 rounded-full blur-[120px] animate-[cloud-drift-slow_50s_infinite_linear_reverse]" />
          </motion.div>
        )}

        {effectiveType === 'rain' && (
          <motion.div
            key="rain"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            {/* Moody Rain Ambient Glow */}
            <div className="absolute inset-0 bg-linear-to-b from-cyan-950/30 via-slate-900/25 to-slate-950/40" />
            
            {/* Animated Rain Streaks */}
            <div className="absolute inset-0 overflow-hidden">
              {rainDrops.map(drop => (
                <div
                  key={drop.id}
                  className="absolute w-[1.5px] bg-linear-to-b from-transparent via-cyan-300 to-white/90 rounded-full"
                  style={{
                    left: drop.left,
                    top: '-60px',
                    height: drop.height,
                    opacity: drop.opacity,
                    animation: `rain-fall ${drop.duration} infinite linear ${drop.delay}`
                  }}
                />
              ))}
            </div>

            {/* Bottom Mist Splash Accent */}
            <div className="absolute bottom-0 inset-x-0 h-36 bg-linear-to-t from-cyan-900/20 to-transparent blur-xl" />
          </motion.div>
        )}

        {effectiveType === 'storm' && (
          <motion.div
            key="storm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            {/* Dark Storm Atmosphere */}
            <div className="absolute inset-0 bg-linear-to-b from-indigo-950/50 via-slate-950/60 to-[#060810]" />
            
            {/* Lightning Flash Overlay */}
            <div className="absolute inset-0 bg-white/25 pointer-events-none animate-[lightning-flash_8s_infinite]" />
            <div className="absolute -top-20 left-1/4 w-125 h-75 bg-indigo-500/25 rounded-full blur-[100px] animate-[lightning-flash_6s_infinite]" />

            {/* Heavy Rain Streaks */}
            <div className="absolute inset-0 overflow-hidden">
              {rainDrops.map(drop => (
                <div
                  key={drop.id}
                  className="absolute w-0.5 bg-linear-to-b from-transparent via-indigo-200 to-white rounded-full"
                  style={{
                    left: drop.left,
                    top: '-60px',
                    height: `${parseInt(drop.height) * 1.3}px`,
                    opacity: drop.opacity,
                    animation: `rain-fall ${parseFloat(drop.duration) * 0.75}s infinite linear ${drop.delay}`
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {effectiveType === 'snow' && (
          <motion.div
            key="snow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            <div className="absolute inset-0 bg-linear-to-b from-blue-950/20 via-slate-900/15 to-transparent" />
            
            {/* Falling Snowflakes */}
            {snowflakes.map(flake => (
              <div
                key={flake.id}
                className="absolute rounded-full bg-white blur-[0.5px]"
                style={{
                  left: flake.left,
                  top: '-20px',
                  width: flake.size,
                  height: flake.size,
                  opacity: flake.opacity,
                  animation: `rain-fall ${flake.duration} infinite ease-in ${flake.delay}`
                }}
              />
            ))}
          </motion.div>
        )}

        {effectiveType === 'starry-night' && (
          <motion.div
            key="starry-night"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            {/* Deep Cosmic Gradient */}
            <div className="absolute inset-0 bg-linear-to-br from-[#060814] via-[#090D21] to-[#04060E]" />
            <div className="absolute top-10 left-1/3 w-150 h-100 bg-indigo-600/10 rounded-full blur-[140px]" />
            <div className="absolute bottom-10 right-10 w-125 h-87.5 bg-brand-purple/10 rounded-full blur-[150px]" />

            {/* Glowing Moon Halo */}
            <div className="absolute top-12 right-24 w-32 h-32 rounded-full bg-blue-100/10 blur-[45px]" />
            <div className="absolute top-16 right-28 w-16 h-16 rounded-full bg-radial from-white/30 to-white/5 border border-white/20 shadow-[0_0_40px_rgba(255,255,255,0.2)]" />

            {/* Star Field */}
            {stars.map(star => (
              <div
                key={star.id}
                className="absolute rounded-full bg-white"
                style={{
                  left: star.left,
                  top: star.top,
                  width: star.size,
                  height: star.size,
                  animation: `star-twinkle ${star.duration} infinite ease-in-out ${star.delay}`
                }}
              />
            ))}

            {/* Occasional Meteor Streak */}
            <div className="absolute top-12 left-20 w-35 h-[1.5px] bg-linear-to-r from-transparent via-cyan-200 to-white blur-[0.5px] animate-[meteor-streak_9s_infinite_ease-in]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
