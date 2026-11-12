import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Palette,
  Sparkle,
  ThermometerSimple
} from '@phosphor-icons/react';
import { HAEntity } from '../../../types';
import { useAutoLayoutStore } from '../../../store/useAutoLayoutStore';
import { useShallow } from 'zustand/react/shallow';
import {
  detectLightCapabilities,
  kelvinToRgb,
  LightCapabilities
} from '../../../services/lightClassification';
import { hueToRgb, rgbToHue, DESIGNER_COLORS } from '../../../services/lightColor';
import { SCENE_PRESETS, type TabOption } from './light/lightPresets';
import LightHeader from './light/LightHeader';
import LampHero from './light/LampHero';
import BrightnessSection from './light/BrightnessSection';
import LightTabBar from './light/LightTabBar';
import WarmthPanel from './light/WarmthPanel';
import ColorPanel from './light/ColorPanel';
import ScenesPanel from './light/ScenesPanel';

interface LightControlViewProps {
  entity: HAEntity;
  darkMode?: boolean;
  customIcon?: string | null;
}

export default function LightControlView({ entity, darkMode = true, customIcon }: LightControlViewProps) {
  const { callHAService, updateEntityState } = useAutoLayoutStore(useShallow((s) => ({ callHAService: s.callHAService, updateEntityState: s.updateEntityState })));

  const caps: LightCapabilities = useMemo(() => {
    return detectLightCapabilities(entity);
  }, [entity]);

  // Strict capability detection:
  // - Warmth: only if light supports color temperature
  // - Color: only if light supports color (RGB, HS, XY)
  // - Scenes: only if light supports effects or native scene presets
  const supportsWarmth = caps.supportsColorTemp;
  const supportsColor = caps.supportsColor;
  const supportsScenes = Boolean(caps.supportsEffects && caps.effectList && caps.effectList.length > 0);

  const availableTabs = useMemo<TabOption[]>(() => {
    const tabs: TabOption[] = [];
    if (supportsWarmth) {
      tabs.push({ id: 'tone', label: 'Warmth', icon: ThermometerSimple });
    }
    if (supportsColor) {
      tabs.push({ id: 'color', label: 'Color', icon: Palette });
    }
    if (supportsScenes) {
      tabs.push({ id: 'scenes', label: 'Scenes', icon: Sparkle });
    }
    return tabs;
  }, [supportsWarmth, supportsColor, supportsScenes]);

  const isOn = caps.isOn;
  const [brightness, setBrightness] = useState<number>(caps.brightnessPct);
  const [selectedColor, setSelectedColor] = useState<string>(caps.displayColor);
  const [colorTempKelvin, setColorTempKelvin] = useState<number>(caps.colorTempKelvin || 3500);
  const [activeEffect, setActiveEffect] = useState<string>(caps.effect || '');

  // Active sub-control tab: automatically default to first available tab
  const [activeTab, setActiveTab] = useState<'tone' | 'color' | 'scenes'>(() => {
    if (supportsWarmth) return 'tone';
    if (supportsColor) return 'color';
    if (supportsScenes) return 'scenes';
    return 'tone';
  });

  // Track dragging state for modern scale animations
  const [isDraggingBrightness, setIsDraggingBrightness] = useState(false);
  const [isDraggingKelvin, setIsDraggingKelvin] = useState(false);
  const [isDraggingHue, setIsDraggingHue] = useState(false);

  // Fallback tab if current active tab is not in available tabs
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some((t) => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  // Current hue (0-360) for rainbow spectrum slider
  const [currentHue, setCurrentHue] = useState<number>(() => {
    if (caps.rgbColor) {
      return rgbToHue(caps.rgbColor[0], caps.rgbColor[1], caps.rgbColor[2]);
    }
    return 40;
  });

  // Sync state with HA entity updates
  useEffect(() => {
    setBrightness(caps.brightnessPct);
    setSelectedColor(caps.displayColor);
    if (caps.colorTempKelvin) {
      setColorTempKelvin(caps.colorTempKelvin);
    }
    if (caps.rgbColor) {
      setCurrentHue(rgbToHue(caps.rgbColor[0], caps.rgbColor[1], caps.rgbColor[2]));
    }
    if (caps.effect) {
      setActiveEffect(caps.effect);
    }
  }, [caps]);

  // Dynamic light color for lamp illustration & ambient glows
  const lampIlluminationColor = useMemo(() => {
    if (!isOn) return 'transparent';
    if (caps.supportsColor && selectedColor) return selectedColor;
    if (caps.supportsColorTemp && colorTempKelvin) return kelvinToRgb(colorTempKelvin);
    return '#f59e0b'; // Warm amber default
  }, [isOn, caps, selectedColor, colorTempKelvin]);

  // Master Power Toggle
  const handleToggle = useCallback(() => {
    const nextState = isOn ? 'off' : 'on';
    const nextBrightnessPct = nextState === 'on' ? (brightness > 0 ? brightness : 75) : 0;
    const haBrightness255 = Math.round((nextBrightnessPct / 100) * 255);

    if (caps.supportsBrightness) {
      updateEntityState(entity.entity_id, nextState, {
        ...entity.attributes,
        brightness: nextState === 'on' ? haBrightness255 : 0
      });

      callHAService(
        'light',
        nextState === 'on' ? 'turn_on' : 'turn_off',
        nextState === 'on' ? { brightness: haBrightness255 } : {},
        { entity_id: entity.entity_id }
      );
    } else {
      updateEntityState(entity.entity_id, nextState, {
        ...entity.attributes
      });

      callHAService(
        'light',
        nextState === 'on' ? 'turn_on' : 'turn_off',
        {},
        { entity_id: entity.entity_id }
      );
    }
  }, [isOn, brightness, caps, entity, updateEntityState, callHAService]);

  // Adjust Brightness
  const handleBrightnessChange = useCallback((val: number) => {
    const safeVal = Math.max(0, Math.min(100, Math.round(val)));
    setBrightness(safeVal);
    const haBrightness255 = Math.round((safeVal / 100) * 255);
    const nextState = safeVal > 0 ? 'on' : 'off';

    updateEntityState(entity.entity_id, nextState, {
      ...entity.attributes,
      brightness: haBrightness255
    });

    if (safeVal > 0) {
      callHAService(
        'light',
        'turn_on',
        { brightness: haBrightness255 },
        { entity_id: entity.entity_id }
      );
    } else {
      callHAService('light', 'turn_off', {}, { entity_id: entity.entity_id });
    }
  }, [entity, updateEntityState, callHAService]);

  // Stepper increment / decrement
  const handleStepBrightness = (delta: number) => {
    const target = Math.max(0, Math.min(100, brightness + delta));
    handleBrightnessChange(target);
  };

  // Adjust White Temperature (Kelvin)
  const handleKelvinChange = (kelvin: number) => {
    const safeKelvin = Math.round(kelvin);
    setColorTempKelvin(safeKelvin);
    const rgbStr = kelvinToRgb(safeKelvin);
    setSelectedColor(rgbStr);

    updateEntityState(entity.entity_id, 'on', {
      ...entity.attributes,
      color_temp_kelvin: safeKelvin
    });

    callHAService(
      'light',
      'turn_on',
      { color_temp_kelvin: safeKelvin },
      { entity_id: entity.entity_id }
    );
  };

  // Adjust Rainbow Hue
  const handleHueChange = (hue: number) => {
    const safeHue = Math.max(0, Math.min(360, Math.round(hue)));
    setCurrentHue(safeHue);
    const [r, g, b] = hueToRgb(safeHue);
    const rgbHex = `rgb(${r}, ${g}, ${b})`;
    setSelectedColor(rgbHex);

    updateEntityState(entity.entity_id, 'on', {
      ...entity.attributes,
      rgb_color: [r, g, b]
    });

    callHAService('light', 'turn_on', { rgb_color: [r, g, b] }, { entity_id: entity.entity_id });
  };

  // Select Designer Color Swatch
  const handleSelectColorSwatch = (swatch: (typeof DESIGNER_COLORS)[0]) => {
    setSelectedColor(swatch.hex);
    setCurrentHue(rgbToHue(swatch.rgb[0], swatch.rgb[1], swatch.rgb[2]));

    updateEntityState(entity.entity_id, 'on', {
      ...entity.attributes,
      rgb_color: swatch.rgb
    });

    callHAService('light', 'turn_on', { rgb_color: swatch.rgb }, { entity_id: entity.entity_id });
  };

  // Apply Effect / Scene
  const handleSelectEffect = (effect: string) => {
    setActiveEffect(effect);
    updateEntityState(entity.entity_id, 'on', {
      ...entity.attributes,
      effect
    });
    callHAService('light', 'turn_on', { effect }, { entity_id: entity.entity_id });
  };

  // Apply Scene Preset
  const handleApplyScene = (scene: (typeof SCENE_PRESETS)[0]) => {
    setBrightness(scene.brightness);
    const haBrightness255 = Math.round((scene.brightness / 100) * 255);

    if (scene.kelvin && caps.supportsColorTemp) {
      setColorTempKelvin(scene.kelvin);
      const rgbStr = kelvinToRgb(scene.kelvin);
      setSelectedColor(rgbStr);

      updateEntityState(entity.entity_id, 'on', {
        ...entity.attributes,
        brightness: haBrightness255,
        color_temp_kelvin: scene.kelvin
      });

      callHAService(
        'light',
        'turn_on',
        { brightness: haBrightness255, color_temp_kelvin: scene.kelvin },
        { entity_id: entity.entity_id }
      );
    } else if (scene.rgb && caps.supportsColor) {
      setSelectedColor(`rgb(${scene.rgb.join(',')})`);
      setCurrentHue(rgbToHue(scene.rgb[0], scene.rgb[1], scene.rgb[2]));

      updateEntityState(entity.entity_id, 'on', {
        ...entity.attributes,
        brightness: haBrightness255,
        rgb_color: scene.rgb
      });

      callHAService(
        'light',
        'turn_on',
        { brightness: haBrightness255, rgb_color: scene.rgb },
        { entity_id: entity.entity_id }
      );
    } else {
      updateEntityState(entity.entity_id, 'on', {
        ...entity.attributes,
        brightness: haBrightness255
      });

      callHAService(
        'light',
        'turn_on',
        { brightness: haBrightness255 },
        { entity_id: entity.entity_id }
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Ultra-Modern Slider Pointer Scrubbing Logic
  // ---------------------------------------------------------------------------
  const brightnessTrackRef = useRef<HTMLDivElement>(null);
  const kelvinTrackRef = useRef<HTMLDivElement>(null);
  const hueTrackRef = useRef<HTMLDivElement>(null);

  const startDrag = (
    e: React.PointerEvent<HTMLDivElement>,
    trackRef: React.RefObject<HTMLDivElement | null>,
    callback: (ratio: number) => void,
    setDragState: (dragging: boolean) => void
  ) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragState(true);
    const track = trackRef.current;
    if (!track) return;

    const updateFromPointer = (clientX: number) => {
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      callback(ratio);
    };

    updateFromPointer(e.clientX);

    const onPointerMove = (ev: PointerEvent) => {
      updateFromPointer(ev.clientX);
    };

    const onPointerUp = (ev: PointerEvent) => {
      setDragState(false);
      try {
        e.currentTarget.releasePointerCapture(ev.pointerId);
      } catch {}
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Glass card tokens
  const glassCardStyle = darkMode
    ? 'bg-black/20 text-white shadow-[4px_6px_12px_rgba(0,0,0,0.15)] border border-white/5 backdrop-blur-xl'
    : 'bg-white/35 text-slate-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/40 backdrop-blur-xl';

  const roomName = entity.attributes.room || entity.attributes.area || 'Living Room';
  const lightName = entity.attributes.friendly_name || 'Smart Pendant Lamp';

  // Dynamic beam opacity mapped with brightness
  const beamOpacity = isOn ? Math.max(0.18, (brightness / 100) * 0.72) : 0;

  // Has any sub-control sections available
  const hasSubControls = availableTabs.length > 0;

  return (
    <div className="space-y-4 select-none">
      {/* ========================================================================= */}
      {/* 1. TOP MINIMALIST HEADER & POWER SWITCH                                   */}
      {/* ========================================================================= */}
      <LightHeader
        customIcon={customIcon}
        isOn={isOn}
        roomName={roomName}
        lightName={lightName}
        handleToggle={handleToggle}
        darkMode={darkMode}
        lampIlluminationColor={lampIlluminationColor}
      />

      {/* ========================================================================= */}
      {/* 2. PENDANT LAMP HERO WITH CONICAL LIGHT BEAM                              */}
      {/* ========================================================================= */}
      <LampHero
        glassCardStyle={glassCardStyle}
        handleToggle={handleToggle}
        isOn={isOn}
        lampIlluminationColor={lampIlluminationColor}
        brightness={brightness}
        beamOpacity={beamOpacity}
        darkMode={darkMode}
        caps={caps}
      />

      {/* ========================================================================= */}
      {/* 3. MODERN CONTROLS CARD (Modern Sliders & Strict Feature Display)         */}
      {/* ========================================================================= */}
      <div className={`p-5 rounded-3xl space-y-5 ${glassCardStyle}`}>
        {/* Brightness Section (only if light supports brightness) */}
        {caps.supportsBrightness && (
          <BrightnessSection
            brightnessTrackRef={brightnessTrackRef}
            startDrag={startDrag}
            handleBrightnessChange={handleBrightnessChange}
            setIsDraggingBrightness={setIsDraggingBrightness}
            darkMode={darkMode}
            isOn={isOn}
            brightness={brightness}
            lampIlluminationColor={lampIlluminationColor}
            isDraggingBrightness={isDraggingBrightness}
            handleStepBrightness={handleStepBrightness}
          />
        )}

        {/* ===================================================================== */}
        {/* SUB-CONTROLS: ONLY VISIBLE IF ENTITY SUPPORTS WARMTH, COLOR, OR SCENES*/}
        {/* ===================================================================== */}
        {hasSubControls && (
          <div className="border-t border-slate-200/60 dark:border-white/5 pt-4 space-y-4">
            {/* Mode Tab Bar: only shown if MORE THAN 1 mode is supported */}
            {availableTabs.length > 1 && (
              <LightTabBar
                darkMode={darkMode}
                availableTabs={availableTabs}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            )}

            {/* TAB 1: WHITE TEMPERATURE (Only if light supports Color Temp) */}
            {(activeTab === 'tone' || availableTabs.length === 1 && supportsWarmth) && supportsWarmth && (
              <WarmthPanel
                colorTempKelvin={colorTempKelvin}
                kelvinTrackRef={kelvinTrackRef}
                caps={caps}
                startDrag={startDrag}
                handleKelvinChange={handleKelvinChange}
                setIsDraggingKelvin={setIsDraggingKelvin}
                isDraggingKelvin={isDraggingKelvin}
                darkMode={darkMode}
              />
            )}

            {/* TAB 2: CHROMATIC COLOR (Only if light supports Color) */}
            {(activeTab === 'color' || availableTabs.length === 1 && supportsColor) && supportsColor && (
              <ColorPanel
                selectedColor={selectedColor}
                hueTrackRef={hueTrackRef}
                startDrag={startDrag}
                handleHueChange={handleHueChange}
                setIsDraggingHue={setIsDraggingHue}
                currentHue={currentHue}
                isDraggingHue={isDraggingHue}
                handleSelectColorSwatch={handleSelectColorSwatch}
              />
            )}

            {/* TAB 3: SCENES & DYNAMIC EFFECTS (Only if light supports Effects/Scenes) */}
            {(activeTab === 'scenes' || availableTabs.length === 1 && supportsScenes) && supportsScenes && (
              <ScenesPanel
                activeEffect={activeEffect}
                caps={caps}
                handleSelectEffect={handleSelectEffect}
                darkMode={darkMode}
                supportsColor={supportsColor}
                supportsWarmth={supportsWarmth}
                handleApplyScene={handleApplyScene}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
