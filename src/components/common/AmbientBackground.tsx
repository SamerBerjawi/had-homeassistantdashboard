import React, { useState, useEffect } from 'react';
import { PageThemeConfig } from '../../config/pageThemes';

interface AmbientBackgroundProps {
  theme: PageThemeConfig;
  darkMode: boolean;
}

/**
 * Builds mathematically seamless CSS radial gradient blooms.
 * Eliminates rasterization tile clipping and box artifacts caused by high-radius Gaussian blur filters.
 */
function buildGradientString(theme: PageThemeConfig, darkMode: boolean): string {
  const primary = theme.glowGradients?.primary || theme.accentHex || '#38bdf8';
  const secondary = theme.glowGradients?.secondary || '#818cf8';
  const tertiary = theme.glowGradients?.tertiary || primary;

  if (darkMode) {
    return [
      `radial-gradient(circle min(75vw, 850px) at 92% 8%, ${primary}34 0%, ${primary}12 42%, transparent 75%)`,
      `radial-gradient(circle min(70vw, 750px) at 8% 92%, ${secondary}2a 0%, ${secondary}0e 42%, transparent 75%)`,
      `radial-gradient(circle min(55vw, 600px) at 50% 45%, ${tertiary}1c 0%, ${tertiary}06 35%, transparent 70%)`
    ].join(', ');
  } else {
    return [
      `radial-gradient(circle min(75vw, 850px) at 92% 8%, ${primary}1c 0%, ${primary}08 42%, transparent 75%)`,
      `radial-gradient(circle min(70vw, 750px) at 8% 92%, ${secondary}16 0%, ${secondary}05 42%, transparent 75%)`,
      `radial-gradient(circle min(55vw, 600px) at 50% 45%, ${tertiary}0f 0%, ${tertiary}03 35%, transparent 70%)`
    ].join(', ');
  }
}

export default function AmbientBackground({ theme, darkMode }: AmbientBackgroundProps) {
  const currentGradient = buildGradientString(theme, darkMode);
  const [layers, setLayers] = useState<{ id: string; gradient: string }[]>([
    { id: `${theme.id}-${darkMode ? 'd' : 'l'}`, gradient: currentGradient }
  ]);

  useEffect(() => {
    const newId = `${theme.id}-${darkMode ? 'd' : 'l'}`;
    setLayers(prev => {
      const last = prev[prev.length - 1];
      if (last && last.id === newId) return prev;
      return [
        { ...last },
        { id: newId, gradient: currentGradient }
      ];
    });

    const timer = setTimeout(() => {
      setLayers([{ id: newId, gradient: currentGradient }]);
    }, 750);

    return () => clearTimeout(timer);
  }, [theme.id, darkMode, currentGradient]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {layers.map((layer, index) => {
        const isTop = index === layers.length - 1;
        return (
          <div
            key={layer.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              isTop ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              backgroundImage: layer.gradient,
            }}
          />
        );
      })}
    </div>
  );
}
