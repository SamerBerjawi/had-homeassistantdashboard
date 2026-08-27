/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { RealtimeEnergy, DailyTotalsEnergy } from './energyCalculator';

interface FusionSolarHouseFlowProps {
  realtime: RealtimeEnergy;
  dailyTotals: DailyTotalsEnergy;
  darkMode?: boolean;
}

export default function FusionSolarHouseFlow({
  realtime,
  dailyTotals,
  darkMode = true
}: FusionSolarHouseFlowProps) {
  const {
    solarPower,
    gridPower,
    batteryPower,
    batterySoC,
    homeConsumption
  } = realtime;

  // Flow speeds based on wattage magnitude
  const isSolarGenerating = solarPower > 0.05;
  const isBatteryActive = Math.abs(batteryPower) > 0.02;
  const isGridActive = Math.abs(gridPower) > 0.05;
  const isHomeActive = homeConsumption > 0.05;

  const solarSpeed = useMemo(() => Math.max(1.2, 4.0 - Math.min(3.0, solarPower * 0.8)), [solarPower]);
  const gridSpeed = useMemo(() => Math.max(1.2, 4.0 - Math.min(3.0, Math.abs(gridPower) * 0.8)), [gridPower]);
  const homeSpeed = useMemo(() => Math.max(1.2, 4.0 - Math.min(3.0, homeConsumption * 0.8)), [homeConsumption]);

  // Battery bar fill segments (5 bars total)
  const filledBars = Math.max(1, Math.min(5, Math.ceil((batterySoC / 100) * 5)));

  return (
    <div className={`relative w-full rounded-3xl p-6 sm:p-8 border backdrop-blur-xl transition-all duration-300 overflow-hidden flex flex-col justify-between min-h-[460px] sm:min-h-[520px] ${
      darkMode 
        ? 'bg-black/60 border-white/10 text-white shadow-2xl' 
        : 'bg-white/70 border-slate-200/90 text-slate-900 shadow-lg'
    }`}>
      {/* ------------------------------------------------------------- */}
      {/* 2.5D ISOMETRIC HOUSE ILLUSTRATION WITH CONDUIT PULSES          */}
      {/* ------------------------------------------------------------- */}
      <div className="relative w-full h-full min-h-[380px] sm:min-h-[440px] flex items-center justify-center select-none">
        
        <svg 
          viewBox="0 0 700 620" 
          className="w-full h-full max-w-[620px] overflow-visible"
        >
          <defs>
            {/* Solar Panel Dark Mesh Pattern */}
            <pattern id="solarGrid" width="12" height="6" patternUnits="userSpaceOnUse">
              <rect width="12" height="6" fill="#18202F" stroke="#28354D" strokeWidth="0.75" />
            </pattern>

            {/* Neon Green Glow Filter */}
            <filter id="neonPulse" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur1" />
              <feGaussianBlur stdDeviation="7" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Warm Entrance Light Gradient */}
            <linearGradient id="warmDoorLight" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#FEF3C7" stopOpacity="0.4" />
            </linearGradient>

            {/* Inverter Box Gradient */}
            <linearGradient id="inverterMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#D8DDE6" />
            </linearGradient>
          </defs>

          {/* ========================================================= */}
          {/* ISOMETRIC HOUSE 3D GEOMETRY                               */}
          {/* ========================================================= */}

          {/* 1. Ground Shadow */}
          <polygon points="40,500 320,380 660,490 380,610" fill="rgba(0,0,0,0.4)" opacity="0.6" />

          {/* 2. Left House Body (Gable Wall with Vertical Charcoal Siding) */}
          <polygon 
            points="120,480 340,390 340,160 120,250" 
            fill="#3B4048" 
            stroke="#2A2E35" 
            strokeWidth="1.5" 
          />
          {/* Siding lines */}
          {[140, 160, 180, 200, 220, 240, 260, 280, 300, 320].map((x, i) => (
            <line 
              key={i} 
              x1={x} 
              y1={250 - (i * 8)} 
              x2={x} 
              y2={480 - (i * 8)} 
              stroke="#2C3139" 
              strokeWidth="1" 
              opacity="0.6" 
            />
          ))}

          {/* 3. Sloped Gable Roof with Solar PV Panels */}
          <polygon 
            points="120,250 340,160 260,95 40,185" 
            fill="#1E232A" 
            stroke="#2F3642" 
            strokeWidth="2" 
          />
          {/* Solar Panel Layer on Roof */}
          <polygon 
            points="115,242 325,158 250,102 50,182" 
            fill="url(#solarGrid)" 
            stroke="#475569" 
            strokeWidth="1.5" 
          />
          {/* Blue solar reflection sheen */}
          <polygon 
            points="60,180 180,132 230,172 110,220" 
            fill="rgba(56, 189, 248, 0.08)" 
          />

          {/* 4. Roof Overhang & Gable Triangular Face */}
          <polygon 
            points="340,160 480,225 340,290" 
            fill="#4A505A" 
            stroke="#2F353E" 
            strokeWidth="1.5" 
          />
          <polygon 
            points="340,160 480,225 480,410 340,345" 
            fill="#3F454F" 
            stroke="#2F353E" 
            strokeWidth="1.5" 
          />

          {/* 5. Right Flat Roof Garage & Entrance Overhang */}
          <polygon 
            points="340,345 480,410 650,335 510,270" 
            fill="#525964" 
            stroke="#3B414A" 
            strokeWidth="1.5" 
          />
          <polygon 
            points="480,410 650,335 650,470 480,545" 
            fill="#3A3F47" 
            stroke="#2A2E35" 
            strokeWidth="1.5" 
          />

          {/* 6. Garage Door (Right) */}
          <polygon 
            points="530,385 640,338 640,460 530,510" 
            fill="#2F333A" 
            stroke="#23272D" 
            strokeWidth="1.5" 
          />
          {[0, 1, 2, 3, 4].map(idx => (
            <line 
              key={idx} 
              x1={530} 
              y1={410 + idx * 20} 
              x2={640} 
              y2={363 + idx * 20} 
              stroke="#22262C" 
              strokeWidth="1" 
            />
          ))}

          {/* 7. Warm Light Glass Entrance Door & Steps */}
          <polygon 
            points="420,380 475,405 475,490 420,465" 
            fill="url(#warmDoorLight)" 
            stroke="#F59E0B" 
            strokeWidth="1" 
            style={{ filter: 'drop-shadow(0 0 12px rgba(245, 158, 11, 0.4))' }}
          />
          {/* Glass Door Dividers */}
          <line x1="447" y1="392" x2="447" y2="478" stroke="#78350F" strokeWidth="1.5" />

          {/* Steps */}
          <polygon points="390,480 475,442 505,455 420,495" fill="#4B525D" />
          <polygon points="380,495 470,455 495,467 405,510" fill="#3D434D" />
          <polygon points="370,510 465,468 485,478 390,522" fill="#2E333B" />

          {/* ========================================================= */}
          {/* ELECTRICAL HARDWARE ON LEFT WALL                          */}
          {/* ========================================================= */}

          {/* 1. BATTERY ENCLOSURE & GREEN GLOWING CELLS */}
          <g transform="translate(160, 360)">
            {/* Translucent Glass Outer Box */}
            <rect 
              x="0" 
              y="0" 
              width="50" 
              height="115" 
              rx="6" 
              fill="rgba(16, 185, 129, 0.12)" 
              stroke="rgba(255, 255, 255, 0.4)" 
              strokeWidth="1.5" 
              style={{ filter: 'drop-shadow(0 0 16px rgba(16, 185, 129, 0.35))' }}
            />

            {/* 5 Stacked Battery Segments (Glowing Green) */}
            {[0, 1, 2, 3, 4].map(barIdx => {
              const isFilled = 4 - barIdx < filledBars;
              return (
                <rect
                  key={barIdx}
                  x="5"
                  y={6 + barIdx * 21}
                  width="40"
                  height="18"
                  rx="3"
                  fill={isFilled ? "#10B981" : "rgba(255,255,255,0.08)"}
                  stroke={isFilled ? "#34D399" : "rgba(255,255,255,0.15)"}
                  strokeWidth="1"
                  style={{
                    filter: isFilled ? 'drop-shadow(0 0 6px #10B981)' : undefined
                  }}
                />
              );
            })}

            {/* Battery SoC Text (White "100" on bottom segment) */}
            <text
              x="25"
              y="104"
              textAnchor="middle"
              className="text-[13px] font-black font-mono fill-white select-none"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}
            >
              {batterySoC}
            </text>
          </g>

          {/* 2. CENTRAL HYBRID INVERTER BOX */}
          <g transform="translate(245, 355)">
            <rect 
              x="0" 
              y="0" 
              width="45" 
              height="45" 
              rx="10" 
              fill="url(#inverterMetal)" 
              stroke="#CBD5E1" 
              strokeWidth="1.5" 
              style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}
            />
            {/* Center Pill / Indicator Notch */}
            <rect x="15" y="20" width="15" height="5" rx="2.5" fill="#0F172A" />
          </g>

          {/* 3. Small Junction Box (Right of Inverter) */}
          <g transform="translate(305, 365)">
            <rect x="0" y="0" width="22" height="18" rx="4" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" />
          </g>

          {/* ========================================================= */}
          {/* ENERGY FLOW CONDUIT LINES & NEON PARTICLES                */}
          {/* ========================================================= */}

          {/* Base Conduit Tracks */}
          {/* Vertical PV to Inverter */}
          <line x1="267" y1="180" x2="267" y2="355" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
          {/* Battery to Inverter */}
          <line x1="210" y1="378" x2="245" y2="378" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
          {/* Inverter to Junction Box */}
          <line x1="290" y1="375" x2="305" y2="375" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
          {/* Junction Box to Home (into wall) */}
          <line x1="327" y1="374" x2="385" y2="368" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
          {/* Junction Box down to Grid */}
          <path d="M 316 383 L 316 455 Q 316 465, 326 468 L 360 476" fill="none" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />

          {/* GLOWING NEON GREEN ACTIVE FLOW LINES */}
          {/* 1. Rooftop PV -> Inverter (Vertical Green Stream) */}
          {isSolarGenerating && (
            <line 
              x1="267" y1="180" x2="267" y2="355" 
              stroke="#10B981" 
              strokeWidth="3.5" 
              strokeLinecap="round" 
              strokeDasharray="6, 8"
              className="animate-[dash_linear_infinite]"
              style={{
                animationDuration: `${solarSpeed}s`,
                filter: 'url(#neonPulse)'
              }}
            />
          )}

          {/* 2. Battery Flow (Battery <-> Inverter) */}
          {isBatteryActive && (
            <line 
              x1="210" y1="378" x2="245" y2="378" 
              stroke="#10B981" 
              strokeWidth="3.5" 
              strokeLinecap="round" 
              strokeDasharray="6, 8"
              className="animate-[dash_linear_infinite]"
              style={{
                filter: 'url(#neonPulse)'
              }}
            />
          )}

          {/* 3. Inverter to Home Entrance Flow */}
          {isHomeActive && (
            <line 
              x1="327" y1="374" x2="385" y2="368" 
              stroke="#10B981" 
              strokeWidth="3.5" 
              strokeLinecap="round" 
              strokeDasharray="6, 8"
              className="animate-[dash_linear_infinite]"
              style={{
                animationDuration: `${homeSpeed}s`,
                filter: 'url(#neonPulse)'
              }}
            />
          )}

          {/* 4. Inverter to Ground / Grid Flow */}
          {isGridActive && (
            <path 
              d="M 316 383 L 316 455 Q 316 465, 326 468 L 360 476" 
              fill="none" 
              stroke="#10B981" 
              strokeWidth="3.5" 
              strokeLinecap="round" 
              strokeDasharray="6, 8"
              className="animate-[dash_linear_infinite]"
              style={{
                animationDuration: `${gridSpeed}s`,
                filter: 'url(#neonPulse)'
              }}
            />
          )}

          {/* ========================================================= */}
          {/* FLOATING TYPOGRAPHY LABELS & THIN INDICATOR HAIRLINES     */}
          {/* ========================================================= */}

          {/* 1. PV (Top Left above roof) */}
          <g transform="translate(180, 50)">
            <text x="0" y="0" textAnchor="middle" className="text-sm font-semibold fill-slate-400 dark:fill-slate-400 select-none">
              PV
            </text>
            <text x="0" y="24" textAnchor="middle" className="text-2xl font-black font-mono fill-slate-900 dark:fill-white select-none">
              {solarPower.toFixed(2)} <tspan className="text-xs font-normal font-sans fill-slate-400">kW</tspan>
            </text>
            {/* Thin hairline pointing to solar panels */}
            <line x1="0" y1="34" x2="0" y2="105" stroke="rgba(255,255,255,0.25)" strokeWidth="0.75" />
          </g>

          {/* 2. HOME (Top Right above house) */}
          <g transform="translate(470, 50)">
            <text x="0" y="0" textAnchor="middle" className="text-sm font-semibold fill-slate-400 dark:fill-slate-400 select-none">
              Home
            </text>
            <text x="0" y="24" textAnchor="middle" className="text-2xl font-black font-mono fill-slate-900 dark:fill-white select-none">
              {homeConsumption.toFixed(2)} <tspan className="text-xs font-normal font-sans fill-slate-400">kW</tspan>
            </text>
            {/* Thin hairline pointing to house roof */}
            <line x1="0" y1="34" x2="0" y2="280" stroke="rgba(255,255,255,0.25)" strokeWidth="0.75" />
          </g>

          {/* 3. BATTERY (Bottom Left below battery pack) */}
          <g transform="translate(185, 520)">
            <text x="0" y="0" textAnchor="middle" className="text-sm font-semibold fill-slate-400 dark:fill-slate-400 select-none">
              Battery
            </text>
            <text x="0" y="24" textAnchor="middle" className="text-2xl font-black font-mono fill-slate-900 dark:fill-white select-none">
              {Math.abs(batteryPower).toFixed(2)} <tspan className="text-xs font-normal font-sans fill-slate-400">kW</tspan>
            </text>
          </g>

          {/* 4. GRID (Bottom Right near steps conduit) */}
          <g transform="translate(440, 520)">
            <text x="0" y="0" textAnchor="middle" className="text-sm font-semibold fill-slate-400 dark:fill-slate-400 select-none">
              Grid
            </text>
            <text x="0" y="24" textAnchor="middle" className="text-2xl font-black font-mono fill-slate-900 dark:fill-white select-none">
              {Math.abs(gridPower).toFixed(2)} <tspan className="text-xs font-normal font-sans fill-slate-400">kW</tspan>
            </text>
            {/* Thin hairline pointing to grid conduit near steps */}
            <path d="M 0 0 C 0 -15, -60 -25, -75 -40" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.75" />
          </g>
        </svg>

      </div>
    </div>
  );
}
