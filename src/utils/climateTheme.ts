import React from 'react';
import {
  Flame,
  Snowflake,
  Sparkle,
  Fan,
  Drop,
  Power,
  Thermometer,
  IconProps
} from '@phosphor-icons/react';

export type ClimateMode = 'heat' | 'cool' | 'auto' | 'heat_cool' | 'fan_only' | 'fan' | 'dry' | 'eco' | 'off' | string;

export interface ClimateModeTheme {
  id: string;
  name: string;
  isOff: boolean;
  icon: React.ComponentType<IconProps>;
  iconClass: string;
  iconDropShadow: string;
  textClass: string;
  bgLight: string;
  bgDark: string;
  borderLight: string;
  borderDark: string;
  badgeBgLight: string;
  badgeBgDark: string;
  badgeBorderLight: string;
  badgeBorderDark: string;
  badgeTextLight: string;
  badgeTextDark: string;
  stepperBtnBg: string;
  stepperBtnHover: string;
  stepperBtnShadow: string;
  sliderAccent: string;
  actionText: string;
}

export function normalizeClimateMode(rawMode?: string): string {
  if (!rawMode) return 'off';
  const m = rawMode.toLowerCase().trim();
  if (m === 'heating' || m === 'heat') return 'heat';
  if (m === 'cooling' || m === 'cool') return 'cool';
  if (m === 'auto' || m === 'heat_cool' || m === 'heat-cool') return 'auto';
  if (m === 'fan_only' || m === 'fan' || m === 'vent') return 'fan_only';
  if (m === 'dry' || m === 'dehumidify') return 'dry';
  if (m === 'eco') return 'eco';
  if (m === 'off' || m === 'idle' || m === 'standby' || m === 'unavailable') return 'off';
  return m;
}

export function getClimateModeTheme(rawMode?: string, entityState?: string): ClimateModeTheme {
  // If state is explicitly off or mode normalized to off
  const normalized = normalizeClimateMode(rawMode || entityState);
  const isOff = normalized === 'off' || entityState === 'off';

  if (isOff) {
    return {
      id: 'off',
      name: 'Off',
      isOff: true,
      icon: Flame,
      iconClass: 'text-slate-400',
      iconDropShadow: '',
      textClass: 'text-slate-400',
      bgLight: 'bg-white/40 hover:bg-white/60 text-slate-800',
      bgDark: 'bg-black/20 hover:bg-black/30 text-white',
      borderLight: 'border-slate-200/80',
      borderDark: 'border-white/10',
      badgeBgLight: 'bg-slate-100',
      badgeBgDark: 'bg-white/5',
      badgeBorderLight: 'border-slate-200',
      badgeBorderDark: 'border-white/10',
      badgeTextLight: 'text-slate-600',
      badgeTextDark: 'text-slate-400',
      stepperBtnBg: 'bg-slate-700 dark:bg-white/15',
      stepperBtnHover: 'hover:bg-slate-600 dark:hover:bg-white/25',
      stepperBtnShadow: '',
      sliderAccent: 'accent-slate-400',
      actionText: 'System Standby'
    };
  }

  switch (normalized) {
    case 'heat':
      return {
        id: 'heat',
        name: 'Heat',
        isOff: false,
        icon: Flame,
        iconClass: 'text-orange-500 dark:text-orange-400 animate-pulse',
        iconDropShadow: 'drop-shadow-[0_0_10px_rgba(249,115,22,0.65)]',
        textClass: 'text-orange-600 dark:text-orange-400',
        bgLight: 'bg-linear-to-br from-orange-500/15 to-rose-500/10 text-slate-900',
        bgDark: 'bg-linear-to-br from-orange-500/20 to-rose-500/15 text-white',
        borderLight: 'border-orange-300/80',
        borderDark: 'border-orange-500/40',
        badgeBgLight: 'bg-orange-100',
        badgeBgDark: 'bg-orange-500/20',
        badgeBorderLight: 'border-orange-300',
        badgeBorderDark: 'border-orange-500/30',
        badgeTextLight: 'text-orange-800',
        badgeTextDark: 'text-orange-300',
        stepperBtnBg: 'bg-orange-500',
        stepperBtnHover: 'hover:bg-orange-400',
        stepperBtnShadow: 'shadow-sm shadow-orange-500/40',
        sliderAccent: 'accent-orange-500',
        actionText: 'Heating active'
      };

    case 'cool':
      return {
        id: 'cool',
        name: 'Cool',
        isOff: false,
        icon: Snowflake,
        iconClass: 'text-cyan-500 dark:text-cyan-400',
        iconDropShadow: 'drop-shadow-[0_0_10px_rgba(6,182,212,0.65)]',
        textClass: 'text-cyan-600 dark:text-cyan-400',
        bgLight: 'bg-linear-to-br from-cyan-500/15 to-blue-500/10 text-slate-900',
        bgDark: 'bg-linear-to-br from-cyan-500/20 to-blue-500/15 text-white',
        borderLight: 'border-cyan-300/80',
        borderDark: 'border-cyan-500/40',
        badgeBgLight: 'bg-cyan-100',
        badgeBgDark: 'bg-cyan-500/20',
        badgeBorderLight: 'border-cyan-300',
        badgeBorderDark: 'border-cyan-500/30',
        badgeTextLight: 'text-cyan-800',
        badgeTextDark: 'text-cyan-300',
        stepperBtnBg: 'bg-cyan-500',
        stepperBtnHover: 'hover:bg-cyan-400',
        stepperBtnShadow: 'shadow-sm shadow-cyan-500/40',
        sliderAccent: 'accent-cyan-500',
        actionText: 'Cooling active'
      };

    case 'auto':
      return {
        id: 'auto',
        name: 'Auto',
        isOff: false,
        icon: Sparkle,
        iconClass: 'text-emerald-500 dark:text-emerald-400',
        iconDropShadow: 'drop-shadow-[0_0_10px_rgba(16,185,129,0.65)]',
        textClass: 'text-emerald-600 dark:text-emerald-400',
        bgLight: 'bg-linear-to-br from-emerald-500/15 to-teal-500/10 text-slate-900',
        bgDark: 'bg-linear-to-br from-emerald-500/20 to-teal-500/15 text-white',
        borderLight: 'border-emerald-300/80',
        borderDark: 'border-emerald-500/40',
        badgeBgLight: 'bg-emerald-100',
        badgeBgDark: 'bg-emerald-500/20',
        badgeBorderLight: 'border-emerald-300',
        badgeBorderDark: 'border-emerald-500/30',
        badgeTextLight: 'text-emerald-800',
        badgeTextDark: 'text-emerald-300',
        stepperBtnBg: 'bg-emerald-500',
        stepperBtnHover: 'hover:bg-emerald-400',
        stepperBtnShadow: 'shadow-sm shadow-emerald-500/40',
        sliderAccent: 'accent-emerald-500',
        actionText: 'Auto regulating'
      };

    case 'fan_only':
      return {
        id: 'fan_only',
        name: 'Fan',
        isOff: false,
        icon: Fan,
        iconClass: 'text-teal-500 dark:text-teal-400 animate-spin [animation-duration:3s]',
        iconDropShadow: 'drop-shadow-[0_0_10px_rgba(20,184,166,0.65)]',
        textClass: 'text-teal-600 dark:text-teal-400',
        bgLight: 'bg-linear-to-br from-teal-500/15 to-emerald-500/10 text-slate-900',
        bgDark: 'bg-linear-to-br from-teal-500/20 to-emerald-500/15 text-white',
        borderLight: 'border-teal-300/80',
        borderDark: 'border-teal-500/40',
        badgeBgLight: 'bg-teal-100',
        badgeBgDark: 'bg-teal-500/20',
        badgeBorderLight: 'border-teal-300',
        badgeBorderDark: 'border-teal-500/30',
        badgeTextLight: 'text-teal-800',
        badgeTextDark: 'text-teal-300',
        stepperBtnBg: 'bg-teal-500',
        stepperBtnHover: 'hover:bg-teal-400',
        stepperBtnShadow: 'shadow-sm shadow-teal-500/40',
        sliderAccent: 'accent-teal-500',
        actionText: 'Fan circulating'
      };

    case 'dry':
      return {
        id: 'dry',
        name: 'Dry',
        isOff: false,
        icon: Drop,
        iconClass: 'text-amber-500 dark:text-amber-400',
        iconDropShadow: 'drop-shadow-[0_0_10px_rgba(245,158,11,0.65)]',
        textClass: 'text-amber-600 dark:text-amber-400',
        bgLight: 'bg-linear-to-br from-amber-500/15 to-yellow-500/10 text-slate-900',
        bgDark: 'bg-linear-to-br from-amber-500/20 to-yellow-500/15 text-white',
        borderLight: 'border-amber-300/80',
        borderDark: 'border-amber-500/40',
        badgeBgLight: 'bg-amber-100',
        badgeBgDark: 'bg-amber-500/20',
        badgeBorderLight: 'border-amber-300',
        badgeBorderDark: 'border-amber-500/30',
        badgeTextLight: 'text-amber-800',
        badgeTextDark: 'text-amber-300',
        stepperBtnBg: 'bg-amber-500',
        stepperBtnHover: 'hover:bg-amber-400',
        stepperBtnShadow: 'shadow-sm shadow-amber-500/40',
        sliderAccent: 'accent-amber-500',
        actionText: 'Dehumidifying'
      };

    case 'eco':
      return {
        id: 'eco',
        name: 'Eco',
        isOff: false,
        icon: Sparkle,
        iconClass: 'text-emerald-500 dark:text-emerald-400',
        iconDropShadow: 'drop-shadow-[0_0_10px_rgba(16,185,129,0.65)]',
        textClass: 'text-emerald-600 dark:text-emerald-400',
        bgLight: 'bg-linear-to-br from-emerald-500/15 to-teal-500/10 text-slate-900',
        bgDark: 'bg-linear-to-br from-emerald-500/20 to-teal-500/15 text-white',
        borderLight: 'border-emerald-300/80',
        borderDark: 'border-emerald-500/40',
        badgeBgLight: 'bg-emerald-100',
        badgeBgDark: 'bg-emerald-500/20',
        badgeBorderLight: 'border-emerald-300',
        badgeBorderDark: 'border-emerald-500/30',
        badgeTextLight: 'text-emerald-800',
        badgeTextDark: 'text-emerald-300',
        stepperBtnBg: 'bg-emerald-500',
        stepperBtnHover: 'hover:bg-emerald-400',
        stepperBtnShadow: 'shadow-sm shadow-emerald-500/40',
        sliderAccent: 'accent-emerald-500',
        actionText: 'Eco Mode active'
      };

    default:
      return {
        id: normalized,
        name: normalized.charAt(0).toUpperCase() + normalized.slice(1),
        isOff: false,
        icon: Thermometer,
        iconClass: 'text-sky-500 dark:text-sky-400',
        iconDropShadow: 'drop-shadow-[0_0_10px_rgba(56,189,248,0.65)]',
        textClass: 'text-sky-600 dark:text-sky-400',
        bgLight: 'bg-linear-to-br from-sky-500/15 to-blue-500/10 text-slate-900',
        bgDark: 'bg-linear-to-br from-sky-500/20 to-blue-500/15 text-white',
        borderLight: 'border-sky-300/80',
        borderDark: 'border-sky-500/40',
        badgeBgLight: 'bg-sky-100',
        badgeBgDark: 'bg-sky-500/20',
        badgeBorderLight: 'border-sky-300',
        badgeBorderDark: 'border-sky-500/30',
        badgeTextLight: 'text-sky-800',
        badgeTextDark: 'text-sky-300',
        stepperBtnBg: 'bg-sky-500',
        stepperBtnHover: 'hover:bg-sky-400',
        stepperBtnShadow: 'shadow-sm shadow-sky-500/40',
        sliderAccent: 'accent-sky-500',
        actionText: `${normalized} mode`
      };
  }
}
