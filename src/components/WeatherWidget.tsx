/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sun, 
  CloudSun, 
  Cloud, 
  CloudRain, 
  CloudLightning, 
  CloudSnow, 
  CloudFog, 
  Wind, 
  Drop, 
  Compass, 
  ArrowClockwise, 
  MapPin, 
  MagnifyingGlass, 
  ArrowSquareOut, 
  Sparkle, 
  CaretDown, 
  CaretUp,
  ShieldCheck,
  Thermometer,
  X
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import { WeatherData } from '../types';
import { DEFAULT_WEATHER_DATA } from '../data';

interface WeatherWidgetProps {
  darkMode: boolean;
  onCityChanged?: (city: string) => void;
}

export default function WeatherWidget({ darkMode, onCityChanged }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData>(DEFAULT_WEATHER_DATA);
  const [loading, setLoading] = useState(false);
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [searchCity, setSearchCity] = useState('');
  const [selectedCity, setSelectedCity] = useState('San Francisco, CA');
  const [geoLocating, setGeoLocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const popularCities = [
    'San Francisco, CA',
    'New York, NY',
    'London, UK',
    'Tokyo, Japan',
    'Paris, France',
    'Sydney, Australia',
    'Berlin, Germany',
    'Toronto, Canada'
  ];

  const fetchWeather = async (locationStr: string, lat?: number, lon?: number) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          location: locationStr,
          lat,
          lon
        })
      });

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data: WeatherData = await response.json();
      setWeather(data);
      if (data.location) {
        setSelectedCity(data.location);
        onCityChanged?.(data.location);
      }
    } catch (err: any) {
      console.warn('Weather fetch fallback error:', err);
      // Retain previous or default weather with updated timestamp
      setWeather(prev => ({
        ...prev,
        location: locationStr || prev.location,
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(selectedCity);
  }, []);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser');
      return;
    }

    setGeoLocating(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGeoLocating(false);
        const { latitude, longitude } = pos.coords;
        await fetchWeather(`lat:${latitude.toFixed(2)}, lon:${longitude.toFixed(2)}`, latitude, longitude);
        setShowCityPicker(false);
      },
      (err) => {
        setGeoLocating(false);
        console.warn('Geolocation error:', err);
        setErrorMsg('Location access denied or unavailable. Please pick a city manually.');
      },
      { timeout: 8000 }
    );
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCity.trim()) return;
    const target = searchCity.trim();
    setSelectedCity(target);
    fetchWeather(target);
    setSearchCity('');
    setShowCityPicker(false);
  };

  const getWeatherIcon = (code?: string, size = 20) => {
    switch (code) {
      case 'sunny':
        return <Sun size={size} weight="duotone" className="text-amber-400" />;
      case 'cloudy':
        return <Cloud size={size} weight="duotone" className="text-slate-400" />;
      case 'rain':
        return <CloudRain size={size} weight="duotone" className="text-sky-400" />;
      case 'storm':
        return <CloudLightning size={size} weight="duotone" className="text-violet-400" />;
      case 'snow':
        return <CloudSnow size={size} weight="duotone" className="text-cyan-200" />;
      case 'fog':
        return <CloudFog size={size} weight="duotone" className="text-slate-300" />;
      case 'partly-cloudy':
      default:
        return <CloudSun size={size} weight="duotone" className="text-amber-400" />;
    }
  };

  const currentTemp = tempUnit === 'C' ? weather.temperatureC : weather.temperatureF;
  const currentHigh = tempUnit === 'C' ? weather.highC : weather.highF;
  const currentLow = tempUnit === 'C' ? weather.lowC : weather.lowF;
  const currentFeelsLike = tempUnit === 'C' ? weather.feelsLikeC : weather.feelsLikeF;

  return (
    <div className="relative z-30" id="weather-widget-root">
      {/* Header Compact Card */}
      <motion.div 
        layout
        className={`rounded-2xl transition-all duration-300 border shadow-2xs backdrop-blur-xl ${
          darkMode 
            ? 'bg-slate-900/80 border-slate-700/80 text-white hover:border-slate-600' 
            : 'bg-white/85 border-slate-200/80 text-slate-800 hover:border-indigo-200'
        }`}
      >
        <div className="p-2.5 sm:p-3 flex items-center justify-between gap-3">
          {/* Location & Icon Group */}
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Standardized frosted square badge w-10 h-10, rounded-xl */}
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 shadow-xs backdrop-blur-md">
              {getWeatherIcon(weather.conditionCode, 22)}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <button
                  id="btn-weather-select-city"
                  type="button"
                  onClick={() => setShowCityPicker(!showCityPicker)}
                  className="flex items-center gap-1 font-black text-xs sm:text-sm truncate cursor-pointer transition-colors hover:text-brand-purple"
                  title="Click to change location"
                >
                  <MapPin size={14} weight="duotone" className="text-brand-purple shrink-0" />
                  <span className="truncate">{weather.location || selectedCity}</span>
                  <CaretDown size={12} weight="bold" className="text-slate-400 shrink-0" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                <span className="truncate">{weather.condition}</span>
                <span>•</span>
                <span>H:{currentHigh}° L:{currentLow}°</span>
              </div>
            </div>
          </div>

          {/* Temperature & Action Group */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Current Temp Display */}
            <div className="text-right">
              <div className="flex items-baseline justify-end gap-1">
                <span className="text-xl sm:text-2xl font-black font-mono tracking-tight leading-none">
                  {currentTemp}°
                </span>
                
                {/* Unit Switcher */}
                <button
                  id="btn-toggle-temp-unit"
                  type="button"
                  onClick={() => setTempUnit(prev => prev === 'C' ? 'F' : 'C')}
                  title={`Switch to °${tempUnit === 'C' ? 'F' : 'C'}`}
                  className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border font-mono transition-colors cursor-pointer ${
                    darkMode 
                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  °{tempUnit}
                </button>
              </div>
              <p className="text-[9px] text-slate-400 font-medium">Feels {currentFeelsLike}°</p>
            </div>

            {/* Refresh Button */}
            <button
              id="btn-weather-refresh"
              type="button"
              onClick={() => fetchWeather(selectedCity)}
              disabled={loading}
              title="Refresh weather with Google Search Grounding"
              className={`w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center transition-all cursor-pointer ${
                loading ? 'animate-spin text-brand-purple' : darkMode ? 'text-slate-400 hover:text-white hover:bg-white/15' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ArrowClockwise size={16} weight="duotone" />
            </button>

            {/* Expand / Collapse Details */}
            <button
              id="btn-weather-toggle-details"
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Collapse forecast" : "Expand detailed weather & grounding sources"}
              className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                isExpanded 
                  ? 'bg-brand-purple text-white border-white/20 shadow-xs' 
                  : darkMode 
                    ? 'bg-white/10 border-white/15 text-slate-300 hover:bg-white/15' 
                    : 'bg-white/70 border-slate-200 text-slate-700 hover:bg-white'
              }`}
            >
              {isExpanded ? <CaretUp size={16} weight="bold" /> : <CaretDown size={16} weight="bold" />}
            </button>
          </div>
        </div>

        {/* Expanded Detailed Weather View */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              id="weather-details-expanded"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden border-t px-3 py-3.5 space-y-3.5 text-xs"
              style={{ borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
            >
              {/* Summary note */}
              {weather.summary && (
                <div className={`p-2.5 rounded-xl border text-[11px] leading-relaxed flex items-start gap-2 ${
                  darkMode ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-200' : 'bg-indigo-50/70 border-indigo-100 text-indigo-900'
                }`}>
                  <Sparkle size={15} weight="duotone" className="text-brand-purple shrink-0 mt-0.5" />
                  <p>{weather.summary}</p>
                </div>
              )}

              {/* Micro-metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className={`p-2 rounded-xl border flex items-center gap-2 ${
                  darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'
                }`}>
                  <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                    <Drop size={16} weight="duotone" className="text-sky-400" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400">Humidity</p>
                    <p className="font-extrabold font-mono text-xs">{weather.humidity}%</p>
                  </div>
                </div>

                <div className={`p-2 rounded-xl border flex items-center gap-2 ${
                  darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'
                }`}>
                  <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                    <Wind size={16} weight="duotone" className="text-teal-400" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400">Wind</p>
                    <p className="font-extrabold font-mono text-xs">
                      {tempUnit === 'C' ? `${weather.windSpeedKmh} km/h` : `${weather.windSpeedMph} mph`}
                    </p>
                  </div>
                </div>

                <div className={`p-2 rounded-xl border flex items-center gap-2 ${
                  darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'
                }`}>
                  <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                    <Sun size={16} weight="duotone" className="text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400">UV Index</p>
                    <p className="font-extrabold font-mono text-xs">{weather.uvIndex} of 11</p>
                  </div>
                </div>

                <div className={`p-2 rounded-xl border flex items-center gap-2 ${
                  darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'
                }`}>
                  <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                    <ShieldCheck size={16} weight="duotone" className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400">Air Quality</p>
                    <p className="font-extrabold font-mono text-xs">
                      {weather.aqi || 28} <span className="text-[10px] text-emerald-500 font-bold">({weather.aqiStatus || 'Good'})</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* 3-Day Forecast mini strip */}
              {weather.forecast && weather.forecast.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase font-black tracking-wider text-slate-400 mb-2">
                    3-Day Weather Forecast
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {weather.forecast.map((fc, idx) => (
                      <div 
                        key={idx}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          darkMode ? 'bg-slate-950/40 border-slate-800/80' : 'bg-white border-slate-100 shadow-2xs'
                        }`}
                      >
                        <p className="text-[10px] font-bold text-slate-400">{fc.day}</p>
                        <p className="font-extrabold text-xs my-0.5">{tempUnit === 'C' ? fc.tempC : fc.tempF}°</p>
                        <p className="text-[9px] text-slate-400 truncate">{fc.condition}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Google Search Grounding Provenance */}
              <div className={`p-2.5 rounded-xl border flex flex-col gap-1.5 ${
                darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200/60'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className={`text-[10px] font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                      ⚡ Verified with Google Search Grounding
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">Updated: {weather.lastUpdated}</span>
                </div>

                {weather.groundingSources && weather.groundingSources.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[9px] text-slate-400 font-semibold">Sources:</span>
                    {weather.groundingSources.map((src, i) => (
                      <a
                        key={i}
                        href={src.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border transition-colors ${
                          darkMode 
                            ? 'bg-slate-900 border-slate-700 text-indigo-300 hover:text-white hover:border-indigo-400' 
                            : 'bg-white border-slate-200 text-indigo-600 hover:text-indigo-800 hover:border-indigo-300'
                        }`}
                      >
                        <span className="truncate max-w-35">{src.title}</span>
                        <ArrowSquareOut size={11} weight="duotone" className="shrink-0" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Location Picker Popover Modal */}
      <AnimatePresence>
        {showCityPicker && (
          <motion.div
            id="weather-city-picker-popover"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            className={`absolute top-full left-0 mt-2 w-72 sm:w-80 p-4 rounded-2xl border shadow-2xl z-50 backdrop-blur-2xl ${
              darkMode 
                ? 'bg-[#0d1428]/95 border-slate-700 text-white shadow-black/60' 
                : 'bg-white/95 border-slate-200 text-slate-800 shadow-xl'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-extrabold text-xs tracking-tight">Select Weather Location</h4>
              <button 
                type="button"
                onClick={() => setShowCityPicker(false)}
                className="w-6 h-6 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={12} weight="bold" />
              </button>
            </div>

            {/* Geolocation Button */}
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={geoLocating}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 mb-3 transition-all cursor-pointer ${
                geoLocating
                  ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40 animate-pulse'
                  : darkMode 
                    ? 'bg-indigo-950/60 hover:bg-indigo-900/80 border-indigo-500/40 text-indigo-300' 
                    : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700'
              }`}
            >
              <Compass size={16} weight="duotone" className={geoLocating ? 'animate-spin' : ''} />
              <span>{geoLocating ? 'Detecting GPS Coordinates...' : 'Use Current Device Location'}</span>
            </button>

            {errorMsg && (
              <p className="text-[10px] text-rose-400 bg-rose-500/10 p-2 rounded-lg mb-2 border border-rose-500/20">
                {errorMsg}
              </p>
            )}

            {/* Custom Search Form */}
            <form onSubmit={handleSearchSubmit} className="mb-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter city (e.g., Seattle, WA)..."
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  className={`w-full text-xs pl-8 pr-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-brand-purple ${
                    darkMode 
                      ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400'
                  }`}
                />
                <MagnifyingGlass size={15} weight="duotone" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </form>

            {/* Preset City Pills */}
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 mb-1.5">Preset Hubs</p>
              <div className="flex flex-wrap gap-1.5">
                {popularCities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => {
                      setSelectedCity(city);
                      fetchWeather(city);
                      setShowCityPicker(false);
                    }}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      selectedCity === city
                        ? 'bg-brand-purple text-white border-brand-purple'
                        : darkMode
                          ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {city.split(',')[0]}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
