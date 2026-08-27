/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

/**
 * Procedural Monocrystalline Photovoltaic Solar Panel Texture
 */
export function getSolarPanelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // 1. Dark Monocrystalline Silicon Base
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#060D1E');
  grad.addColorStop(0.5, '#0B1A36');
  grad.addColorStop(1, '#081329');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // 2. Solar Cell Grid (6 columns x 10 rows)
  const cols = 6;
  const rows = 10;
  const cellW = 512 / cols;
  const cellH = 512 / rows;

  ctx.strokeStyle = 'rgba(2, 132, 199, 0.4)';
  ctx.lineWidth = 1.5;

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const x = c * cellW;
      const y = r * cellH;

      // Cell border with slight bevel
      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);
      ctx.strokeRect(x + 2, y + 2, cellW - 4, cellH - 4);

      // Micro Busbars (Thin silver conductor lines)
      ctx.fillStyle = 'rgba(226, 232, 240, 0.45)';
      ctx.fillRect(x + cellW * 0.25, y + 2, 1, cellH - 4);
      ctx.fillRect(x + cellW * 0.5, y + 2, 1, cellH - 4);
      ctx.fillRect(x + cellW * 0.75, y + 2, 1, cellH - 4);

      // Horizontal micro fingers
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      for (let f = 4; f < cellH - 4; f += 8) {
        ctx.fillRect(x + 3, y + f, cellW - 6, 0.75);
      }
    }
  }

  // Outer Aluminum Silver Frame Border
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 508, 508);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural Natural Cedar / Oak Wood Grain Texture
 */
export function getWoodGrainTexture(darkMode: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = darkMode ? '#78350F' : '#D97706';
  ctx.fillRect(0, 0, 512, 512);

  // Wood grain stripes
  for (let y = 0; y < 512; y += 3) {
    const alpha = 0.08 + Math.sin(y * 0.1) * 0.05 + (Math.random() * 0.05);
    ctx.fillStyle = darkMode ? `rgba(69, 26, 3, ${alpha})` : `rgba(180, 83, 9, ${alpha})`;
    ctx.fillRect(0, y, 512, 2);
  }

  // Subtle wood knots
  for (let k = 0; k < 4; k++) {
    const kx = 100 + k * 110;
    const ky = 80 + k * 120;
    ctx.beginPath();
    ctx.ellipse(kx, ky, 24, 8, Math.PI / 12, 0, Math.PI * 2);
    ctx.fillStyle = darkMode ? 'rgba(45, 17, 2, 0.25)' : 'rgba(146, 64, 14, 0.25)';
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural Architectural Lap Siding Texture for Walls
 */
export function getLapSidingTexture(darkMode: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const baseColor = darkMode ? '#273344' : '#F1F5F9';
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  const plankHeight = 32;
  for (let y = 0; y < 512; y += plankHeight) {
    // Top highlight on each plank
    ctx.fillStyle = darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect(0, y, 512, 2);

    // Bottom shadow bevel on each plank
    ctx.fillStyle = darkMode ? 'rgba(0, 0, 0, 0.35)' : 'rgba(148, 163, 184, 0.4)';
    ctx.fillRect(0, y + plankHeight - 2, 512, 2);

    // Subtle surface noise
    for (let x = 0; x < 512; x += 16) {
      if (Math.random() > 0.6) {
        ctx.fillStyle = darkMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.02)';
        ctx.fillRect(x, y + 2, 12, plankHeight - 4);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural Architectural Stone Paver Texture
 */
export function getPaverTexture(darkMode: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = darkMode ? '#334155' : '#E2E8F0';
  ctx.fillRect(0, 0, 512, 512);

  const paverW = 64;
  const paverH = 32;

  ctx.strokeStyle = darkMode ? '#1E293B' : '#94A3B8';
  ctx.lineWidth = 2;

  for (let r = 0; r < 512 / paverH; r++) {
    const offset = (r % 2) * (paverW / 2);
    for (let c = -1; c < (512 / paverW) + 1; c++) {
      const x = c * paverW + offset;
      const y = r * paverH;

      ctx.strokeRect(x, y, paverW, paverH);

      // Paver grain noise
      if (Math.random() > 0.4) {
        ctx.fillStyle = darkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';
        ctx.fillRect(x + 2, y + 2, paverW - 4, paverH - 4);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural Standing-Seam Metal Roof Texture
 */
export function getMetalRoofTexture(darkMode: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = darkMode ? '#1E293B' : '#475569';
  ctx.fillRect(0, 0, 512, 512);

  const seamSpacing = 32;
  for (let x = 0; x < 512; x += seamSpacing) {
    // Raised seam shadow & highlight
    ctx.fillStyle = darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(x, 0, 2, 512);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(x + 2, 0, 2, 512);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural Lawn / Grass Texture
 */
export function getLawnTexture(darkMode: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = darkMode ? '#0B111A' : '#E2E8F0';
  ctx.fillRect(0, 0, 512, 512);

  // Soft organic grass blade noise
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const len = 2 + Math.random() * 4;
    ctx.strokeStyle = darkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(34, 197, 94, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 2, y - len);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
