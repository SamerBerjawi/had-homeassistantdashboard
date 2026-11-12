import React from 'react';
import { Sun, Sparkle, Moon, Flame } from '@phosphor-icons/react';

const SCENE_PRESETS = [
  { id: 'natural', name: 'Natural', desc: 'Daylight Read', icon: Sun, kelvin: 4500, brightness: 80, rgb: [255, 245, 230] },
  { id: 'cozy', name: 'Cozy', desc: 'Warm Evening', icon: Flame, kelvin: 2400, brightness: 50, rgb: [254, 215, 170] },
  { id: 'night', name: 'Night', desc: 'Soft Restful', icon: Moon, kelvin: 2000, brightness: 15, rgb: [254, 243, 199] },
  { id: 'party', name: 'Party', desc: 'Vibrant Accent', icon: Sparkle, kelvin: null, brightness: 85, rgb: [168, 85, 247] }
];

interface TabOption {
  id: 'tone' | 'color' | 'scenes';
  label: string;
  icon: React.ComponentType<{ size?: number; weight?: any; className?: string }>;
}

// Pointer-scrub starter shared by the brightness, kelvin and hue sliders.
type StartDrag = (
  e: React.PointerEvent<HTMLDivElement>,
  trackRef: React.RefObject<HTMLDivElement | null>,
  callback: (ratio: number) => void,
  setDragState: (dragging: boolean) => void
) => void;

export { SCENE_PRESETS };
export type { TabOption, StartDrag };
