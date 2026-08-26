import React from 'react';
import { Sun, CloudRain, CloudSun, Cloud, Wind, Drop, ArrowUp, ArrowDown } from '@phosphor-icons/react';
import { CardConfig, WeatherBackdropType } from '../../../types/canvas';
import { HAEntity } from '../../../types';
import { DEFAULT_WEATHER_DATA } from '../../../data';
import WeatherBackdrop from '../WeatherBackdrop';

interface WeatherCardProps {
  config: CardConfig;
  entity?: HAEntity;
  backdropType?: WeatherBackdropType;
  onOpenModal: () => void;
}

export default function WeatherCard({
  config,
  entity,
  backdropType = 'auto',
  onOpenModal
}: WeatherCardProps) {
  const data = DEFAULT_WEATHER_DATA;
  const title = config.title || data.location;
  const condition = entity?.state ? entity.state : data.condition;
  const tempC = entity?.attributes?.temperature ?? data.temperatureC;

  return (
    <div className="relative w-full h-full p-4 flex flex-col justify-between overflow-hidden rounded-3xl">
      {/* Contained Animated Atmospheric Weather Backdrop */}
      <WeatherBackdrop
        isContained={true}
        backdropType={backdropType}
        weatherEntity={entity}
        darkMode={true}
      />

      {/* Atmospheric Contrast Overlay */}
      <div className="absolute inset-0 bg-black/25 pointer-events-none rounded-3xl" />

      {/* Top row */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <CloudSun
            size={26}
            weight="duotone"
            className="text-amber-300 drop-shadow-md shrink-0"
          />
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white truncate drop-shadow-sm">{title}</h4>
            <p className="text-[11px] text-slate-200 font-medium truncate capitalize drop-shadow-xs">{condition}</p>
          </div>
        </div>

        {/* High / Low pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/40 backdrop-blur-md border border-white/15 text-[11px] font-mono text-slate-200 shadow-sm">
          <span className="flex items-center text-amber-300">
            <ArrowUp size={11} weight="bold" />{data.highC}°
          </span>
          <span className="opacity-40">|</span>
          <span className="flex items-center text-cyan-300">
            <ArrowDown size={11} weight="bold" />{data.lowC}°
          </span>
        </div>
      </div>

      {/* Center: Large temperature + 3-day forecast pills */}
      <div className="relative z-10 flex items-center justify-between my-1">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black text-white font-mono tracking-tight leading-none drop-shadow-md">
            {tempC}°
          </span>
          <span className="text-xs text-slate-300 font-bold">C</span>
        </div>

        {/* 3-day mini forecast */}
        <div className="flex items-center gap-2">
          {data.forecast.map((f, i) => (
            <div
              key={i}
              className="flex flex-col items-center px-2 py-1 rounded-xl bg-black/40 backdrop-blur-md border border-white/15 text-center shadow-xs"
            >
              <span className="text-[9px] text-slate-300 font-bold uppercase">{f.day.slice(0, 3)}</span>
              <span className="text-xs font-bold text-white font-mono my-0.5">{f.highC}°</span>
              <span className="text-[9px] text-slate-300 font-mono">{f.lowC}°</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom stats: Wind & Humidity */}
      <div className="relative z-10 flex items-center justify-between text-[10px] text-slate-200 pt-1.5 border-t border-white/15">
        <span className="flex items-center gap-1 text-slate-200 font-medium">
          <Wind size={13} weight="duotone" className="text-sky-300" /> {data.windSpeedKmh} km/h
        </span>
        <span className="flex items-center gap-1 text-slate-200 font-medium">
          <Drop size={13} weight="duotone" className="text-cyan-300" /> {data.humidity}% Humidity
        </span>
      </div>
    </div>
  );
}
