/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useMemo, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Float } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import {
  ArrowsClockwise,
  Eye,
  Sun,
  Moon,
  Sparkle,
  Lightning,
  HouseLine
} from '@phosphor-icons/react';
import { RealtimeEnergy, DailyTotalsEnergy } from './energyCalculator';
import {
  getSolarPanelTexture,
  getWoodGrainTexture,
  getLapSidingTexture,
  getPaverTexture,
  getMetalRoofTexture,
  getLawnTexture
} from './threeTextures';

interface FusionSolarHouseFlowProps {
  realtime: RealtimeEnergy;
  dailyTotals: DailyTotalsEnergy;
  darkMode?: boolean;
}

/**
 * Animated 3D Energy Flow Path along CatmullRomCurve3
 */
function EnergyFlowPath({
  curve,
  color,
  speed = 1.0,
  active = true,
  reverse = false,
  particleCount = 5,
  tubeRadius = 0.032
}: {
  curve: THREE.CatmullRomCurve3;
  color: string;
  speed?: number;
  active?: boolean;
  reverse?: boolean;
  particleCount?: number;
  tubeRadius?: number;
}) {
  const particlesRef = useRef<THREE.Group>(null);

  // Fixed conduit wire geometry
  const tubeGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 64, tubeRadius, 8, false);
  }, [curve, tubeRadius]);

  // Points along the curve
  const particleOffsets = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => i / particleCount);
  }, [particleCount]);

  useFrame((_, delta) => {
    if (!particlesRef.current || !active) return;

    particlesRef.current.children.forEach((child, i) => {
      let t = particleOffsets[i];
      const direction = reverse ? -1 : 1;
      t = (t + delta * speed * 0.45 * direction) % 1.0;
      if (t < 0) t += 1.0;
      particleOffsets[i] = t;

      const pt = curve.getPointAt(t);
      child.position.copy(pt);
    });
  });

  return (
    <group>
      {/* Conduit Wire */}
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial
          color="#334155"
          transparent
          opacity={0.5}
          roughness={0.6}
        />
      </mesh>

      {/* Pulsing Energy Photons */}
      {active && (
        <group ref={particlesRef}>
          {particleOffsets.map((_, idx) => (
            <mesh key={idx}>
              <sphereGeometry args={[0.072, 12, 12]} />
              <meshBasicMaterial color={color} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

/**
 * Stylized Low-Poly Isometric Tree
 */
function LowPolyTree({ position, scale = 1, darkMode }: { position: [number, number, number]; scale?: number; darkMode: boolean }) {
  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.7, 6]} />
        <meshStandardMaterial color="#78350F" roughness={0.9} />
      </mesh>
      {/* Layer 1 Foliage */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <coneGeometry args={[0.5, 0.7, 6]} />
        <meshStandardMaterial
          color={darkMode ? "#065F46" : "#10B981"}
          roughness={0.7}
        />
      </mesh>
      {/* Layer 2 Foliage */}
      <mesh position={[0, 1.25, 0]} castShadow>
        <coneGeometry args={[0.38, 0.6, 6]} />
        <meshStandardMaterial
          color={darkMode ? "#047857" : "#34D399"}
          roughness={0.7}
        />
      </mesh>
      {/* Layer 3 Foliage */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <coneGeometry args={[0.25, 0.45, 6]} />
        <meshStandardMaterial
          color={darkMode ? "#059669" : "#6EE7B7"}
          roughness={0.7}
        />
      </mesh>
    </group>
  );
}

/**
 * Modern Low-Poly Electric Vehicle (EV)
 */
function LowPolyEV({ position, rotation, darkMode }: { position: [number, number, number]; rotation: [number, number, number]; darkMode: boolean }) {
  return (
    <group position={position} rotation={rotation} scale={0.75}>
      {/* Car Body */}
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[1.3, 0.36, 2.4]} />
        <meshStandardMaterial
          color={darkMode ? "#E2E8F0" : "#0F172A"}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>

      {/* Cabin / Roof & Windshield */}
      <mesh position={[0, 0.58, -0.15]} castShadow>
        <boxGeometry args={[1.1, 0.32, 1.3]} />
        <meshStandardMaterial
          color="#0F172A"
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Windshield Glass Tint */}
      <mesh position={[0, 0.58, 0.52]} rotation={[Math.PI / 6, 0, 0]}>
        <planeGeometry args={[1.05, 0.34]} />
        <meshStandardMaterial
          color="#38BDF8"
          transparent
          opacity={0.7}
          roughness={0.1}
        />
      </mesh>

      {/* Headlights (Cyan/White Glow) */}
      <mesh position={[-0.45, 0.3, 1.21]}>
        <planeGeometry args={[0.22, 0.08]} />
        <meshBasicMaterial color="#38BDF8" />
      </mesh>
      <mesh position={[0.45, 0.3, 1.21]}>
        <planeGeometry args={[0.22, 0.08]} />
        <meshBasicMaterial color="#38BDF8" />
      </mesh>

      {/* Taillights (Red LED Strip) */}
      <mesh position={[0, 0.32, -1.21]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.15, 0.06]} />
        <meshBasicMaterial color="#EF4444" />
      </mesh>

      {/* Wheels */}
      {[-0.68, 0.68].map((x, xi) =>
        [-0.75, 0.75].map((z, zi) => (
          <group key={`${xi}-${zi}`} position={[x, 0.16, z]} rotation={[0, 0, Math.PI / 2]}>
            {/* Rubber Tire */}
            <mesh castShadow>
              <cylinderGeometry args={[0.2, 0.2, 0.12, 16]} />
              <meshStandardMaterial color="#0F172A" roughness={0.9} />
            </mesh>
            {/* Alloy Rim */}
            <mesh position={[0, x > 0 ? 0.05 : -0.05, 0]}>
              <cylinderGeometry args={[0.13, 0.13, 0.04, 8]} />
              <meshStandardMaterial color="#CBD5E1" metalness={0.8} roughness={0.2} />
            </mesh>
          </group>
        ))
      )}

      {/* Glowing Green Charging Port Indicator */}
      <mesh position={[0.66, 0.38, -0.6]}>
        <circleGeometry args={[0.035, 12]} />
        <meshBasicMaterial color="#10B981" />
      </mesh>
    </group>
  );
}

/**
 * Modern Garden Bollard Pathway Light
 */
function GardenBollardLight({ position, darkMode }: { position: [number, number, number]; darkMode: boolean }) {
  return (
    <group position={position}>
      {/* Metal Post */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.3, 8]} />
        <meshStandardMaterial color="#1E293B" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Glowing Lamp Head */}
      <mesh position={[0, 0.31, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.05, 8]} />
        <meshStandardMaterial
          color="#FDE047"
          emissive="#FDE047"
          emissiveIntensity={darkMode ? 2.5 : 0.8}
        />
      </mesh>
      {/* Warm Ground Glow */}
      <pointLight
        position={[0, 0.32, 0]}
        color="#FDE047"
        intensity={darkMode ? 0.4 : 0.15}
        distance={1.5}
      />
    </group>
  );
}

/**
 * 3D Low-Poly House Mesh Architecture with Textures
 */
function LowPolyHouse({
  realtime,
  darkMode
}: {
  realtime: RealtimeEnergy;
  darkMode: boolean;
}) {
  const { solarPower, homeConsumption, batterySoC, batteryPower, gridPower } = realtime;

  // Procedural Textures
  const solarTexture = useMemo(() => getSolarPanelTexture(), []);
  const woodTexture = useMemo(() => getWoodGrainTexture(darkMode), [darkMode]);
  const sidingTexture = useMemo(() => getLapSidingTexture(darkMode), [darkMode]);
  const paverTexture = useMemo(() => getPaverTexture(darkMode), [darkMode]);
  const roofTexture = useMemo(() => getMetalRoofTexture(darkMode), [darkMode]);
  const lawnTexture = useMemo(() => getLawnTexture(darkMode), [darkMode]);

  // Window glow intensity scales with home load
  const windowGlowIntensity = Math.min(3.8, Math.max(0.9, homeConsumption * 1.6));
  const isSolarActive = solarPower > 0.05;
  const isBatteryCharging = batteryPower < -0.05;
  const isBatteryDischarging = batteryPower > 0.05;
  const isGridExporting = gridPower < -0.05;
  const isGridImporting = gridPower > 0.05;

  // Battery bar segment count (5 segments)
  const filledBars = Math.max(1, Math.min(5, Math.ceil((batterySoC / 100) * 5)));

  // -------------------------------------------------------------
  // 3D CURVES CONNECTING HARDWARE COMPONENTS
  // -------------------------------------------------------------
  const solarToInverterCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.4, 2.7, 0.4),
      new THREE.Vector3(-1.85, 2.2, 0.5),
      new THREE.Vector3(-1.85, 1.2, 0.5),
      new THREE.Vector3(-1.85, 0.75, 0.4)
    ]);
  }, []);

  const inverterToBatteryCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.85, 0.6, 0.4),
      new THREE.Vector3(-2.1, 0.6, 0.4),
      new THREE.Vector3(-2.3, 0.6, 0.4)
    ]);
  }, []);

  const inverterToHouseCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.85, 0.6, 0.4),
      new THREE.Vector3(-1.2, 0.6, 0.4),
      new THREE.Vector3(-0.6, 0.6, 0.6),
      new THREE.Vector3(0.0, 0.7, 0.0)
    ]);
  }, []);

  const inverterToGridCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.85, 0.5, 0.4),
      new THREE.Vector3(-1.85, 0.05, 0.8),
      new THREE.Vector3(-0.8, 0.05, 1.8),
      new THREE.Vector3(1.2, 0.05, 2.5)
    ]);
  }, []);

  // Wallbox EV charger to EV car port curve
  const wallboxToEvCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.6, 0.75, 1.25),
      new THREE.Vector3(1.5, 0.4, 1.6),
      new THREE.Vector3(1.5, 0.32, 2.1)
    ]);
  }, []);

  return (
    <group position={[0, -0.65, 0]}>

      {/* --------------------------------------------------------- */}
      {/* 1. HOUSE MAIN BODY (Gable Left Wing)                      */}
      {/* --------------------------------------------------------- */}
      <mesh position={[-1.2, 1.0, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.0, 2.0, 2.4]} />
        <meshStandardMaterial
          map={sidingTexture}
          roughness={darkMode ? 0.75 : 0.45}
        />
      </mesh>

      {/* Siding Corner Trims */}
      {[-2.21, -0.19].map((x, i) => (
        <mesh key={i} position={[x, 1.0, 1.21]}>
          <boxGeometry args={[0.06, 2.0, 0.06]} />
          <meshStandardMaterial color={darkMode ? "#1E293B" : "#CBD5E1"} roughness={0.5} />
        </mesh>
      ))}

      {/* 2. GABLE ROOF (Left Sloped Roof with Monocrystalline PV)  */}
      <group position={[-1.2, 2.0, 0]}>
        {/* Sloped Roof Left */}
        <mesh position={[-0.55, 0.45, 0]} rotation={[0, 0, Math.PI / 4.5]} castShadow>
          <boxGeometry args={[1.5, 0.1, 2.6]} />
          <meshStandardMaterial map={roofTexture} roughness={0.5} metalness={0.4} />
        </mesh>
        {/* Sloped Roof Right */}
        <mesh position={[0.55, 0.45, 0]} rotation={[0, 0, -Math.PI / 4.5]} castShadow>
          <boxGeometry args={[1.5, 0.1, 2.6]} />
          <meshStandardMaterial map={roofTexture} roughness={0.5} metalness={0.4} />
        </mesh>

        {/* Chimney with Exhaust Vent */}
        <group position={[0.4, 0.8, -0.6]}>
          <mesh castShadow>
            <boxGeometry args={[0.25, 0.6, 0.25]} />
            <meshStandardMaterial color={darkMode ? "#1E293B" : "#64748B"} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.31, 0]}>
            <boxGeometry args={[0.28, 0.04, 0.28]} />
            <meshStandardMaterial color="#0F172A" roughness={0.5} />
          </mesh>
        </group>

        {/* High-Resolution Photovoltaic Solar Array Panels on Roof */}
        <group position={[-0.58, 0.53, 0]} rotation={[0, 0, Math.PI / 4.5]}>
          {/* Aluminum Under-mount Rails */}
          {[-0.2, 0.2].map((x, ri) => (
            <mesh key={ri} position={[x, -0.01, 0]}>
              <boxGeometry args={[0.04, 0.02, 2.3]} />
              <meshStandardMaterial color="#94A3B8" metalness={0.9} roughness={0.2} />
            </mesh>
          ))}

          {/* 6 High-Fidelity Solar Modules */}
          {[-0.75, 0, 0.75].map((z, zi) =>
            [-0.3, 0.3].map((x, xi) => (
              <group key={`${zi}-${xi}`} position={[x, 0.02, z]}>
                {/* Panel Silicon Wafer Face */}
                <mesh castShadow>
                  <boxGeometry args={[0.54, 0.025, 0.68]} />
                  <meshStandardMaterial
                    map={solarTexture}
                    metalness={0.85}
                    roughness={0.15}
                    emissive="#0284C7"
                    emissiveIntensity={isSolarActive ? 0.35 : 0.02}
                  />
                </mesh>
                {/* Silver Anodized Aluminum Edge Frame */}
                <mesh position={[0, 0.015, 0]}>
                  <boxGeometry args={[0.55, 0.01, 0.69]} />
                  <meshStandardMaterial color="#CBD5E1" metalness={0.9} roughness={0.2} />
                </mesh>
              </group>
            ))
          )}
        </group>
      </group>

      {/* 3. RIGHT WING: MODERN GARAGE & OVERHANG */}
      <mesh position={[1.0, 0.85, 0.1]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 1.7, 2.2]} />
        <meshStandardMaterial map={sidingTexture} roughness={darkMode ? 0.7 : 0.4} />
      </mesh>
      {/* Flat Overhang Roof with Wood Fascia */}
      <group position={[1.0, 1.75, 0.1]}>
        <mesh castShadow>
          <boxGeometry args={[2.4, 0.12, 2.4]} />
          <meshStandardMaterial map={roofTexture} roughness={0.6} />
        </mesh>
        {/* Wood Eaves Accent */}
        <mesh position={[0, -0.06, 1.21]}>
          <boxGeometry args={[2.4, 0.04, 0.02]} />
          <meshStandardMaterial map={woodTexture} roughness={0.6} />
        </mesh>
      </group>

      {/* Garage Slatted Door */}
      <mesh position={[1.1, 0.75, 1.21]}>
        <planeGeometry args={[1.6, 1.3]} />
        <meshStandardMaterial color={darkMode ? "#1E293B" : "#475569"} roughness={0.6} />
      </mesh>

      {/* Driveway Pavers */}
      <mesh position={[1.1, 0.01, 2.3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.7, 1.8]} />
        <meshStandardMaterial map={paverTexture} roughness={0.9} />
      </mesh>

      {/* Parked EV in the Driveway */}
      <LowPolyEV
        position={[1.1, 0.01, 2.2]}
        rotation={[0, 0, 0]}
        darkMode={darkMode}
      />

      {/* Wallbox Smart EV Charger on Garage Wall */}
      <group position={[1.6, 0.8, 1.22]}>
        {/* Charger Enclosure */}
        <mesh castShadow>
          <boxGeometry args={[0.18, 0.24, 0.08]} />
          <meshStandardMaterial color="#0F172A" metalness={0.5} roughness={0.3} />
        </mesh>
        {/* LED Ring Indicator */}
        <mesh position={[0, 0.04, 0.045]}>
          <circleGeometry args={[0.035, 16]} />
          <meshBasicMaterial color="#10B981" />
        </mesh>
        {/* Charging Cable Holster */}
        <mesh position={[0, -0.06, 0.045]}>
          <boxGeometry args={[0.06, 0.06, 0.04]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      </group>

      {/* 4. FRONT ENTRANCE, PERGOLA & WARM GLOWING DOOR */}
      {/* Modern Natural Cedar Pergola Slats over Porch */}
      <group position={[-0.2, 1.5, 1.4]}>
        {[-0.35, -0.15, 0.05, 0.25].map((x, i) => (
          <mesh key={i} position={[x, 0, 0]} castShadow>
            <boxGeometry args={[0.04, 0.04, 0.65]} />
            <meshStandardMaterial map={woodTexture} roughness={0.55} />
          </mesh>
        ))}
        {/* Pergola Support Beam */}
        <mesh position={[-0.05, -0.04, 0.3]}>
          <boxGeometry args={[0.75, 0.04, 0.04]} />
          <meshStandardMaterial map={woodTexture} roughness={0.55} />
        </mesh>
      </group>

      {/* Entrance Glass Door with Warm Curtains & Sidelight */}
      <group position={[-0.2, 0.7, 1.21]}>
        {/* Door Frame */}
        <mesh>
          <planeGeometry args={[0.82, 1.32]} />
          <meshStandardMaterial color="#0F172A" roughness={0.4} />
        </mesh>
        {/* Glowing Translucent Glass Panel */}
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[0.74, 1.24]} />
          <meshStandardMaterial
            color="#F59E0B"
            emissive="#F59E0B"
            emissiveIntensity={windowGlowIntensity}
            transparent
            opacity={0.88}
          />
        </mesh>
      </group>

      {/* Interior Warm Light Source */}
      <pointLight
        position={[-0.2, 0.8, 0.6]}
        color="#F59E0B"
        intensity={windowGlowIntensity * 3.2}
        distance={4.5}
      />

      {/* Large Living Room Picture Window on Left Wing */}
      <group position={[-1.2, 0.75, 1.21]}>
        {/* Window Frame */}
        <mesh>
          <planeGeometry args={[0.9, 0.7]} />
          <meshStandardMaterial color="#0F172A" roughness={0.3} />
        </mesh>
        {/* Glass Pane */}
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[0.82, 0.62]} />
          <meshStandardMaterial
            color="#F59E0B"
            emissive="#F59E0B"
            emissiveIntensity={windowGlowIntensity * 0.9}
            transparent
            opacity={0.85}
          />
        </mesh>
      </group>

      {/* Porch Steps & Garden Stepping Pavers */}
      <mesh position={[-0.2, 0.1, 1.45]} receiveShadow>
        <boxGeometry args={[1.1, 0.2, 0.4]} />
        <meshStandardMaterial map={paverTexture} roughness={0.85} />
      </mesh>
      <mesh position={[-0.2, 0.03, 1.75]} receiveShadow>
        <boxGeometry args={[1.3, 0.08, 0.35]} />
        <meshStandardMaterial map={paverTexture} roughness={0.85} />
      </mesh>

      {/* Stepping Stones leading through the lawn */}
      {[-0.1, 0.2, 0.5, 0.8].map((z, idx) => (
        <mesh key={idx} position={[-0.2 + (idx % 2 === 0 ? 0.05 : -0.05), 0.01, 2.0 + z * 0.5]} receiveShadow>
          <boxGeometry args={[0.55, 0.02, 0.3]} />
          <meshStandardMaterial map={paverTexture} roughness={0.9} />
        </mesh>
      ))}

      {/* 4 Garden Bollard Pathway Lights */}
      <GardenBollardLight position={[-0.6, 0, 1.8]} darkMode={darkMode} />
      <GardenBollardLight position={[-0.6, 0, 2.5]} darkMode={darkMode} />
      <GardenBollardLight position={[0.2, 0, 1.8]} darkMode={darkMode} />
      <GardenBollardLight position={[0.2, 0, 2.5]} darkMode={darkMode} />

      {/* 5. WALL-MOUNTED HARDWARE: INVERTER & SEGMENTED BATTERY */}
      {/* Hybrid Inverter Box with Display */}
      <group position={[-1.85, 0.65, 0.4]}>
        <mesh castShadow>
          <boxGeometry args={[0.18, 0.34, 0.3]} />
          <meshStandardMaterial color="#FFFFFF" metalness={0.4} roughness={0.2} />
        </mesh>
        {/* LCD Screen on Inverter */}
        <mesh position={[-0.095, 0.04, 0]}>
          <planeGeometry args={[0.12, 0.08]} />
          <meshStandardMaterial color="#0F172A" emissive="#0284C7" emissiveIntensity={0.5} />
        </mesh>
        {/* Status LEDs */}
        <mesh position={[-0.095, -0.06, -0.05]}>
          <circleGeometry args={[0.012, 8]} />
          <meshBasicMaterial color="#10B981" />
        </mesh>
        <mesh position={[-0.095, -0.06, 0.05]}>
          <circleGeometry args={[0.012, 8]} />
          <meshBasicMaterial color="#38BDF8" />
        </mesh>
      </group>

      {/* Segmented Lithium Battery Storage (LUNA2000 / Powerwall Style) */}
      <group position={[-2.3, 0.65, 0.4]}>
        {/* Tempered Glass Outer Casing */}
        <mesh>
          <boxGeometry args={[0.16, 0.72, 0.36]} />
          <meshStandardMaterial
            color="#0F172A"
            transparent
            opacity={0.82}
            roughness={0.15}
            metalness={0.6}
          />
        </mesh>
        {/* Aluminum Top Accent Cap */}
        <mesh position={[0, 0.37, 0]}>
          <boxGeometry args={[0.17, 0.03, 0.37]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* 5 Stacked Glowing Battery Cell Segments */}
        {[0, 1, 2, 3, 4].map(barIdx => {
          const isIlluminated = barIdx < filledBars;
          return (
            <mesh key={barIdx} position={[0.02, -0.25 + barIdx * 0.125, 0]}>
              <boxGeometry args={[0.14, 0.095, 0.3]} />
              <meshStandardMaterial
                color={isIlluminated ? "#10B981" : "#1E293B"}
                emissive={isIlluminated ? "#10B981" : "#000000"}
                emissiveIntensity={isIlluminated ? 1.6 : 0.0}
              />
            </mesh>
          );
        })}
      </group>

      {/* 6. GROUND PLATFORM & SCENIC FOLIAGE */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <cylinderGeometry args={[4.5, 4.7, 0.1, 48]} />
        <meshStandardMaterial
          map={lawnTexture}
          roughness={0.95}
        />
      </mesh>

      {/* Low-Poly Evergreen Trees */}
      <LowPolyTree position={[-2.5, 0, -1.8]} scale={0.9} darkMode={darkMode} />
      <LowPolyTree position={[-2.9, 0, 1.8]} scale={0.75} darkMode={darkMode} />
      <LowPolyTree position={[2.8, 0, -1.5]} scale={1.1} darkMode={darkMode} />
      <LowPolyTree position={[3.2, 0, 1.5]} scale={0.85} darkMode={darkMode} />

      {/* --------------------------------------------------------- */}
      {/* 7. ENERGY PACKET FLOW CURVES                              */}
      {/* --------------------------------------------------------- */}
      {/* Solar -> Inverter */}
      <EnergyFlowPath
        curve={solarToInverterCurve}
        color="#F59E0B"
        speed={Math.max(1.0, solarPower * 0.8)}
        active={isSolarActive}
      />

      {/* Inverter <-> Battery */}
      <EnergyFlowPath
        curve={inverterToBatteryCurve}
        color="#10B981"
        speed={1.4}
        active={isBatteryCharging || isBatteryDischarging}
        reverse={isBatteryDischarging}
      />

      {/* Inverter -> Home Demand */}
      <EnergyFlowPath
        curve={inverterToHouseCurve}
        color="#F59E0B"
        speed={Math.max(1.0, homeConsumption * 0.9)}
        active={homeConsumption > 0.05}
      />

      {/* Inverter <-> Grid */}
      <EnergyFlowPath
        curve={inverterToGridCurve}
        color={isGridExporting ? "#10B981" : "#0284C7"}
        speed={Math.max(1.0, Math.abs(gridPower) * 0.8)}
        active={isGridExporting || isGridImporting}
        reverse={isGridImporting}
      />

      {/* Wallbox to EV Charging Conduit */}
      <EnergyFlowPath
        curve={wallboxToEvCurve}
        color="#10B981"
        speed={1.3}
        active={homeConsumption > 1.2}
      />

      {/* --------------------------------------------------------- */}
      {/* 8. FLOATING 3D HTML BADGES (<Html center>)                */}
      {/* --------------------------------------------------------- */}

      {/* PV BADGE (Anchored above rooftop solar array) */}
      <Html position={[-1.2, 3.2, 0.2]} center distanceFactor={8.5}>
        <div className="flex flex-col items-center pointer-events-none select-none">
          <div className={`flex flex-col items-center px-3.5 py-1.5 rounded-2xl backdrop-blur-xl border shadow-xl transition-all ${darkMode
              ? 'bg-black/75 border-amber-500/40 text-white shadow-amber-500/10'
              : 'bg-white/85 border-amber-400 text-slate-900 shadow-slate-300'
            }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">PV Solar</span>
            <span className="text-sm font-black font-mono tracking-tight">
              {solarPower.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">kW</span>
            </span>
          </div>
          <div className="w-0.5 h-6 bg-amber-500/50 mt-0.5" />
        </div>
      </Html>

      {/* HOME DEMAND BADGE (Anchored above main living space) */}
      <Html position={[1.0, 2.5, 0.1]} center distanceFactor={8.5}>
        <div className="flex flex-col items-center pointer-events-none select-none">
          <div className={`flex flex-col items-center px-3.5 py-1.5 rounded-2xl backdrop-blur-xl border shadow-xl transition-all ${darkMode
              ? 'bg-black/75 border-purple-500/40 text-white shadow-purple-500/10'
              : 'bg-white/85 border-purple-400 text-slate-900 shadow-slate-300'
            }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500">Home Demand</span>
            <span className="text-sm font-black font-mono tracking-tight">
              {homeConsumption.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">kW</span>
            </span>
          </div>
          <div className="w-0.5 h-6 bg-purple-500/50 mt-0.5" />
        </div>
      </Html>

      {/* BATTERY STORAGE BADGE (Anchored next to battery pack) */}
      <Html position={[-2.85, 0.65, 0.4]} center distanceFactor={8.5}>
        <div className="flex flex-col items-end pointer-events-none select-none pr-1">
          <div className={`flex flex-col items-start px-3 py-1.5 rounded-2xl backdrop-blur-xl border shadow-xl transition-all ${darkMode
              ? 'bg-black/75 border-emerald-500/40 text-white shadow-emerald-500/10'
              : 'bg-white/85 border-emerald-400 text-slate-900 shadow-slate-300'
            }`}>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Battery</span>
              <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono">
                {batterySoC}%
              </span>
            </div>
            <span className="text-xs font-black font-mono tracking-tight mt-0.5">
              {Math.abs(batteryPower).toFixed(2)} <span className="text-[9px] font-normal text-slate-400">kW</span>
            </span>
          </div>
        </div>
      </Html>

      {/* GRID FLOW BADGE (Anchored near grid path terminal) */}
      <Html position={[1.5, 0.4, 2.5]} center distanceFactor={8.5}>
        <div className="flex flex-col items-center pointer-events-none select-none">
          <div className={`flex flex-col items-center px-3.5 py-1.5 rounded-2xl backdrop-blur-xl border shadow-xl transition-all ${darkMode
              ? 'bg-black/75 border-sky-500/40 text-white shadow-sky-500/10'
              : 'bg-white/85 border-sky-400 text-slate-900 shadow-slate-300'
            }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500">
              {gridPower < 0 ? 'Grid Export' : 'Grid Import'}
            </span>
            <span className="text-xs font-black font-mono tracking-tight">
              {Math.abs(gridPower).toFixed(2)} <span className="text-[9px] font-normal text-slate-400">kW</span>
            </span>
          </div>
          <div className="w-0.5 h-4 bg-sky-500/50 mt-0.5" />
        </div>
      </Html>

    </group>
  );
}

export default function FusionSolarHouseFlow({
  realtime,
  dailyTotals,
  darkMode = true
}: FusionSolarHouseFlowProps) {
  const [autoRotate, setAutoRotate] = useState(false);
  const controlsRef = useRef<any>(null);

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  return (
    <div className={`relative w-full rounded-3xl p-4 sm:p-6 border backdrop-blur-xl transition-all duration-300 overflow-hidden flex flex-col justify-between min-h-[480px] sm:min-h-[530px] ${darkMode
        ? 'bg-black/60 border-white/10 text-white shadow-2xl'
        : 'bg-white/70 border-slate-200/90 text-slate-900 shadow-lg'
      }`}>
      {/* Top Controls Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-black tracking-tight uppercase text-slate-800 dark:text-slate-200">
            3D Energy Flow Visualizer
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto Rotate Toggle */}
          <button
            type="button"
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${autoRotate
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                : darkMode
                  ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
          >
            <Sparkle size={13} weight={autoRotate ? "fill" : "regular"} />
            <span>Auto Rotate</span>
          </button>

          {/* Reset Camera View */}
          <button
            type="button"
            onClick={handleResetCamera}
            title="Reset Camera View"
            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${darkMode
                ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
          >
            <ArrowsClockwise size={14} />
          </button>
        </div>
      </div>

      {/* 3D React Three Fiber Canvas */}
      <div className="relative w-full h-full min-h-[410px] sm:min-h-[450px] select-none">
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
            Loading 3D Visualizer...
          </div>
        }>
          <Canvas
            shadows
            camera={{ position: [8.5, 6.5, 8.5], fov: 36 }}
            className="w-full h-full"
            gl={{ antialias: true, alpha: true }}
          >
            {/* Daylight / Studio Lighting Setup */}
            <ambientLight intensity={darkMode ? 0.55 : 1.1} />
            <directionalLight
              position={[9, 14, 7]}
              intensity={darkMode ? 1.3 : 1.6}
              color={darkMode ? "#FFFFFF" : "#FFFBEB"}
              castShadow
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
              shadow-camera-far={25}
              shadow-camera-left={-6}
              shadow-camera-right={6}
              shadow-camera-top={6}
              shadow-camera-bottom={-6}
            />
            <pointLight
              position={[-6, 7, -6]}
              intensity={darkMode ? 0.4 : 0.6}
              color={darkMode ? "#38BDF8" : "#93C5FD"}
            />

            {/* Floating Isometric 3D House */}
            <Float speed={1.1} rotationIntensity={0.06} floatIntensity={0.12}>
              <LowPolyHouse realtime={realtime} darkMode={darkMode} />
            </Float>

            {/* Orbit Controls with smooth damping */}
            <OrbitControls
              ref={controlsRef}
              autoRotate={autoRotate}
              autoRotateSpeed={1.0}
              enablePan={false}
              minPolarAngle={Math.PI / 6}
              maxPolarAngle={Math.PI / 2.25}
              minDistance={6}
              maxDistance={14}
              dampingFactor={0.05}
            />

            {/* Post-Processing Bloom for Glowing Elements */}
            <EffectComposer>
              <Bloom
                luminanceThreshold={0.5}
                luminanceSmoothing={0.3}
                intensity={darkMode ? 1.2 : 0.6}
              />
            </EffectComposer>
          </Canvas>
        </Suspense>
      </div>

      {/* Bottom Summary Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-white/10 text-[11px] font-medium text-slate-500 dark:text-slate-400 z-10">
        <span>Inverter Output: <strong className="text-amber-500 font-bold">{realtime.solarPower.toFixed(2)} kW</strong></span>
        <span>Autarky Rate: <strong className="text-emerald-500 font-bold">{dailyTotals.autarkyRate.toFixed(2)}%</strong></span>
      </div>
    </div>
  );
}
