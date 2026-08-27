/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface AnimatedWeatherBackdropProps {
  condition?: string | null;
  isNight?: boolean;
  darkMode?: boolean;
  className?: string;
}

export default function AnimatedWeatherBackdrop({
  condition,
  isNight = false,
  darkMode = true,
  className = ''
}: AnimatedWeatherBackdropProps) {
  const norm = (condition || '').toLowerCase().trim().replace(/_/g, '-');

  const isRain = norm.includes('rain') || norm.includes('drizzle') || norm.includes('pouring') || norm.includes('shower');
  const isThunder = norm.includes('lightning') || norm.includes('thunder');
  const isSnow = norm.includes('snow') || norm.includes('flurr') || norm.includes('ice') || norm.includes('hail');
  const isClear = norm === 'sunny' || norm === 'clear' || norm === 'clear-night';
  const isCloudy = norm.includes('cloud') || norm.includes('overcast');
  const isWind = norm.includes('wind') || norm.includes('breez');
  const isFog = norm.includes('fog') || norm.includes('mist') || norm.includes('haze');

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none z-0 ${className}`}>
      {/* ------------------------------------------------------------- */}
      {/* 1. SUNNY / CLEAR DAY: Radiant Animated Solar Corona & Rays     */}
      {/* ------------------------------------------------------------- */}
      {isClear && !isNight && (
        <div className="absolute inset-0">
          <div className={`absolute inset-0 ${
            darkMode 
              ? 'bg-gradient-to-b from-amber-500/20 via-sky-500/10 to-transparent'
              : 'bg-gradient-to-b from-sky-400/20 via-amber-300/25 to-amber-100/30'
          }`} />
          
          {/* Pulsing Solar Core */}
          <div className={`absolute -top-16 -right-16 w-80 h-80 rounded-full blur-3xl animate-weather-sun-pulse ${
            darkMode
              ? 'bg-gradient-to-br from-amber-400/40 via-yellow-500/25 to-transparent'
              : 'bg-gradient-to-br from-amber-400/50 via-yellow-400/35 to-transparent'
          }`} />
          
          {/* Continuous Rotating Solar Rays */}
          <div className="absolute -top-28 -right-28 w-96 h-96 rounded-full bg-[conic-gradient(from_0deg,rgba(251,191,36,0.3)_0deg,transparent_45deg,rgba(245,158,11,0.25)_90deg,transparent_135deg,rgba(251,191,36,0.3)_180deg,transparent_225deg,rgba(245,158,11,0.25)_270deg,transparent_315deg,rgba(251,191,36,0.3)_360deg)] blur-xl animate-weather-sun-spin" />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. CLEAR NIGHT: Shimmering Twinkling Starfield                */}
      {/* ------------------------------------------------------------- */}
      {(isNight || norm === 'clear-night') && !isRain && !isSnow && !isThunder && (
        <div className="absolute inset-0">
          <div className="absolute -top-12 -right-12 w-72 h-72 rounded-full bg-indigo-500/25 blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/75 via-slate-950/85 to-slate-950/95" />
          
          {/* Twinkling Starfield */}
          <div className="absolute top-5 left-10 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_#fff] animate-weather-star-1" />
          <div className="absolute top-12 left-1/3 w-2 h-2 bg-sky-200 rounded-full shadow-[0_0_10px_#bae6fd] animate-weather-star-2" />
          <div className="absolute top-8 right-24 w-1.5 h-1.5 bg-indigo-200 rounded-full shadow-[0_0_8px_#c7d2fe] animate-weather-star-3" />
          <div className="absolute top-28 left-20 w-1 h-1 bg-white rounded-full animate-weather-star-2" />
          <div className="absolute top-20 right-1/3 w-2 h-2 bg-amber-100 rounded-full shadow-[0_0_10px_#fef3c7] animate-weather-star-1" />
          <div className="absolute top-36 right-16 w-1.5 h-1.5 bg-white rounded-full animate-weather-star-3" />
          <div className="absolute top-16 right-10 w-2 h-2 bg-cyan-200 rounded-full shadow-[0_0_8px_#a5f3fc] animate-weather-star-2" />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. CLOUDY / PARTLY CLOUDY: Drifting Atmosphere Cumulus Clouds */}
      {/* ------------------------------------------------------------- */}
      {isCloudy && !isRain && !isThunder && !isSnow && (
        <div className="absolute inset-0">
          <div className={`absolute inset-0 ${
            darkMode
              ? 'bg-gradient-to-b from-slate-700/25 via-slate-900/40 to-slate-950/75'
              : 'bg-gradient-to-b from-sky-200/50 via-slate-200/40 to-white/70'
          }`} />
          
          {/* Drifting Cloud Formations */}
          <div className={`absolute -top-12 -left-16 w-96 h-52 rounded-full blur-2xl animate-weather-cloud-slow ${
            darkMode ? 'bg-slate-300/15' : 'bg-sky-300/25'
          }`} />
          <div className={`absolute top-6 -right-20 w-96 h-56 rounded-full blur-3xl animate-weather-cloud-fast ${
            darkMode ? 'bg-sky-400/15' : 'bg-slate-400/20'
          }`} />
          <div className="absolute top-20 left-10 w-80 h-36 rounded-full bg-slate-400/15 blur-xl animate-weather-cloud-slow" />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. RAIN / POURING: Continuous Cascading Rain Streaks          */}
      {/* ------------------------------------------------------------- */}
      {isRain && !isThunder && (
        <div className="absolute inset-0">
          <div className={`absolute inset-0 ${
            darkMode
              ? 'bg-gradient-to-b from-blue-950/75 via-slate-950/85 to-slate-950'
              : 'bg-gradient-to-b from-sky-300/45 via-blue-200/35 to-slate-100/80'
          }`} />
          <div className={`absolute -top-10 inset-x-0 h-44 blur-2xl ${
            darkMode ? 'bg-blue-500/20' : 'bg-sky-400/25'
          }`} />

          {/* Continuous Cascading Raindrop Streaks */}
          <div className="absolute inset-0 overflow-hidden">
            <span className={`absolute left-[12%] w-[1.5px] h-16 bg-gradient-to-b from-transparent ${darkMode ? 'via-sky-300' : 'via-blue-500'} to-transparent animate-weather-rain-1`} />
            <span className={`absolute left-[24%] w-[2px] h-20 bg-gradient-to-b from-transparent ${darkMode ? 'via-blue-200' : 'via-sky-500'} to-transparent animate-weather-rain-2`} />
            <span className={`absolute left-[38%] w-[1.5px] h-14 bg-gradient-to-b from-transparent ${darkMode ? 'via-sky-200' : 'via-blue-400'} to-transparent animate-weather-rain-3`} />
            <span className={`absolute left-[52%] w-[2px] h-24 bg-gradient-to-b from-transparent ${darkMode ? 'via-blue-300' : 'via-sky-600'} to-transparent animate-weather-rain-4`} />
            <span className={`absolute left-[66%] w-[1.5px] h-18 bg-gradient-to-b from-transparent ${darkMode ? 'via-sky-300' : 'via-blue-500'} to-transparent animate-weather-rain-1`} />
            <span className={`absolute left-[78%] w-[2px] h-20 bg-gradient-to-b from-transparent ${darkMode ? 'via-blue-200' : 'via-sky-400'} to-transparent animate-weather-rain-3`} />
            <span className={`absolute left-[90%] w-[1.5px] h-16 bg-gradient-to-b from-transparent ${darkMode ? 'via-sky-100' : 'via-blue-500'} to-transparent animate-weather-rain-2`} />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. THUNDERSTORM: Heavy Rain + Intermittent Lightning Strobes  */}
      {/* ------------------------------------------------------------- */}
      {isThunder && (
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-950/80 via-slate-950/90 to-black" />
          
          {/* Lightning Flash Overlay */}
          <div className="absolute inset-0 bg-amber-200/25 animate-weather-lightning pointer-events-none" />
          <div className="absolute -top-12 -right-12 w-88 h-88 rounded-full bg-purple-500/30 blur-3xl animate-pulse" style={{ animationDuration: '3s' }} />

          {/* Heavy Cascading Rain Streaks */}
          <div className="absolute inset-0 overflow-hidden">
            <span className="absolute left-[15%] w-[2px] h-24 bg-gradient-to-b from-transparent via-amber-200 to-transparent animate-weather-rain-2" />
            <span className="absolute left-[35%] w-[2px] h-28 bg-gradient-to-b from-transparent via-purple-200 to-transparent animate-weather-rain-4" />
            <span className="absolute left-[58%] w-[2px] h-24 bg-gradient-to-b from-transparent via-sky-200 to-transparent animate-weather-rain-1" />
            <span className="absolute left-[82%] w-[2px] h-28 bg-gradient-to-b from-transparent via-blue-200 to-transparent animate-weather-rain-3" />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. SNOW / FLURRIES: Swaying Drifting Snowflakes               */}
      {/* ------------------------------------------------------------- */}
      {isSnow && (
        <div className="absolute inset-0">
          <div className={`absolute inset-0 ${
            darkMode
              ? 'bg-gradient-to-b from-cyan-950/65 via-slate-900/85 to-slate-950'
              : 'bg-gradient-to-b from-sky-200/50 via-cyan-100/40 to-slate-100/80'
          }`} />
          <div className={`absolute -top-8 -left-8 w-80 h-80 rounded-full blur-3xl animate-pulse ${
            darkMode ? 'bg-cyan-400/20' : 'bg-sky-400/25'
          }`} style={{ animationDuration: '5s' }} />

          {/* Swaying Falling Snowflakes */}
          <div className="absolute inset-0 overflow-hidden">
            <span className="absolute left-[15%] w-2 h-2 bg-white rounded-full shadow-[0_0_6px_#fff] blur-[0.4px] animate-weather-snow-1" />
            <span className={`absolute left-[32%] w-3 h-3 rounded-full blur-[0.6px] animate-weather-snow-2 ${
              darkMode ? 'bg-cyan-100 shadow-[0_0_8px_#cffafe]' : 'bg-white shadow-[0_0_8px_#bae6fd]'
            }`} />
            <span className="absolute left-[54%] w-2 h-2 bg-white rounded-full shadow-[0_0_6px_#fff] blur-[0.4px] animate-weather-snow-3" />
            <span className={`absolute left-[72%] w-2.5 h-2.5 rounded-full blur-[0.5px] animate-weather-snow-4 ${
              darkMode ? 'bg-sky-100 shadow-[0_0_8px_#e0f2fe]' : 'bg-cyan-100 shadow-[0_0_8px_#bae6fd]'
            }`} />
            <span className="absolute left-[88%] w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_6px_#fff] animate-weather-snow-1" />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. WINDY / BREEZY: Flowing Aerodynamic Wind Streamlines       */}
      {/* ------------------------------------------------------------- */}
      {isWind && (
        <div className="absolute inset-0">
          <div className={`absolute inset-0 ${
            darkMode
              ? 'bg-gradient-to-b from-teal-950/60 via-slate-900/75 to-slate-950'
              : 'bg-gradient-to-b from-teal-200/40 via-sky-100/35 to-slate-100/80'
          }`} />
          <div className={`absolute -top-12 -right-12 w-80 h-64 rounded-full blur-3xl animate-pulse ${
            darkMode ? 'bg-teal-400/20' : 'bg-teal-300/30'
          }`} style={{ animationDuration: '6s' }} />
          
          {/* Flowing Wind Streamlines */}
          <div className={`absolute top-10 left-0 w-48 h-[2px] bg-gradient-to-r from-transparent ${darkMode ? 'via-teal-300/60' : 'via-teal-600/50'} to-transparent blur-[0.5px] animate-weather-wind-1`} />
          <div className={`absolute top-20 left-0 w-64 h-[2px] bg-gradient-to-r from-transparent ${darkMode ? 'via-sky-300/60' : 'via-sky-600/50'} to-transparent blur-[0.5px] animate-weather-wind-2`} />
          <div className={`absolute top-32 left-0 w-52 h-[2px] bg-gradient-to-r from-transparent ${darkMode ? 'via-teal-200/50' : 'via-teal-500/40'} to-transparent blur-[0.5px] animate-weather-wind-3`} />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. FOG / MIST: Floating Frosted Haze Layers                   */}
      {/* ------------------------------------------------------------- */}
      {isFog && (
        <div className="absolute inset-0">
          <div className={`absolute inset-0 ${
            darkMode
              ? 'bg-gradient-to-b from-slate-800/75 via-slate-900/85 to-slate-950'
              : 'bg-gradient-to-b from-slate-300/50 via-slate-200/40 to-slate-100/80'
          }`} />
          <div className="absolute top-4 inset-x-0 h-36 bg-slate-300/20 blur-2xl animate-weather-cloud-slow" />
          <div className="absolute bottom-4 inset-x-0 h-36 bg-slate-400/20 blur-3xl animate-weather-cloud-fast" />
        </div>
      )}

      {/* Bottom Vignette for Crisp Contrast */}
      <div className={`absolute inset-0 pointer-events-none ${
        darkMode
          ? 'bg-gradient-to-t from-slate-950/80 via-transparent to-transparent'
          : 'bg-gradient-to-t from-white/70 via-transparent to-transparent'
      }`} />
    </div>
  );
}
