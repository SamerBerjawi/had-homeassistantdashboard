import React from 'react';
import {
  SquaresFour,
  Armchair,
  Lightning,
  ShieldCheck,
  MusicNotes,
  HardDrives,
  ShareNetwork,
  Car,
  Heartbeat,
  Broom,
  GitFork,
  GearSix
} from '@phosphor-icons/react';

export interface PageThemeConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  color: string;           // Icon text color class
  accentHex: string;       // Primary accent hex code
  glow1: string;           // Ambient blob 1 class
  glow2: string;           // Ambient blob 2 class
  glow3: string;           // Ambient blob 3 class
  activeSidebarDark: string;
  activeSidebarLight: string;
  indicator: string;
}

export const PAGE_THEMES: Record<string, PageThemeConfig> = {
  overview: {
    id: 'overview',
    title: 'Overview',
    subtitle: '',
    icon: SquaresFour,
    color: 'text-sky-500 dark:text-sky-400',
    accentHex: '#38bdf8',
    glow1: 'bg-sky-400 dark:bg-sky-500',
    glow2: 'bg-indigo-400 dark:bg-indigo-600',
    glow3: 'bg-blue-400 dark:bg-cyan-500',
    activeSidebarDark: 'bg-gradient-to-r from-sky-500/15 to-indigo-500/10 text-white border border-sky-400/30 shadow-[0_0_15px_-3px_rgba(56,189,248,0.2)]',
    activeSidebarLight: 'bg-gradient-to-r from-sky-500/10 to-indigo-500/5 text-sky-950 border border-sky-500/25 shadow-[0_0_15px_-3px_rgba(56,189,248,0.15)]',
    indicator: 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]'
  },
  rooms: {
    id: 'rooms',
    title: 'Rooms & Areas',
    subtitle: 'Explore live telemetry, lighting controls, climate targets, and appliances organized room by room.',
    icon: Armchair,
    color: 'text-indigo-500 dark:text-indigo-400',
    accentHex: '#6366f1',
    glow1: 'bg-indigo-400 dark:bg-indigo-500',
    glow2: 'bg-violet-400 dark:bg-violet-600',
    glow3: 'bg-purple-400 dark:bg-fuchsia-600',
    activeSidebarDark: 'bg-gradient-to-r from-indigo-500/20 to-violet-500/15 text-white border border-indigo-400/30 shadow-[0_0_15px_-3px_rgba(99,102,241,0.25)]',
    activeSidebarLight: 'bg-gradient-to-r from-indigo-500/15 to-violet-500/10 text-indigo-950 border border-indigo-500/30 shadow-[0_0_15px_-3px_rgba(99,102,241,0.2)]',
    indicator: 'bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]'
  },
  energy: {
    id: 'energy',
    title: 'Energy & Power',
    subtitle: '',
    icon: Lightning,
    color: 'text-amber-500 dark:text-amber-400',
    accentHex: '#f59e0b',
    glow1: 'bg-amber-400 dark:bg-amber-500',
    glow2: 'bg-orange-400 dark:bg-orange-600',
    glow3: 'bg-yellow-400 dark:bg-amber-600',
    activeSidebarDark: 'bg-gradient-to-r from-amber-500/20 to-orange-500/15 text-white border border-amber-400/30 shadow-[0_0_15px_-3px_rgba(245,158,11,0.25)]',
    activeSidebarLight: 'bg-gradient-to-r from-amber-500/15 to-orange-500/10 text-amber-950 border border-amber-500/30 shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]',
    indicator: 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
  },
  security: {
    id: 'security',
    title: 'Security & Safety',
    subtitle: '',
    icon: ShieldCheck,
    color: 'text-emerald-500 dark:text-emerald-400',
    accentHex: '#10b981',
    glow1: 'bg-emerald-400 dark:bg-emerald-500',
    glow2: 'bg-teal-400 dark:bg-teal-600',
    glow3: 'bg-cyan-400 dark:bg-emerald-600',
    activeSidebarDark: 'bg-gradient-to-r from-emerald-500/20 to-teal-500/15 text-white border border-emerald-400/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.25)]',
    activeSidebarLight: 'bg-gradient-to-r from-emerald-500/15 to-teal-500/10 text-emerald-950 border border-emerald-500/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]',
    indicator: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
  },
  media: {
    id: 'media',
    title: 'Media & Audio',
    subtitle: 'Control whole-home audio playback, smart TV devices, streaming apps, and Apple TV remotes.',
    icon: MusicNotes,
    color: 'text-purple-500 dark:text-purple-400',
    accentHex: '#a855f7',
    glow1: 'bg-purple-400 dark:bg-purple-500',
    glow2: 'bg-fuchsia-400 dark:bg-fuchsia-600',
    glow3: 'bg-pink-400 dark:bg-purple-600',
    activeSidebarDark: 'bg-gradient-to-r from-purple-500/20 to-fuchsia-500/15 text-white border border-purple-400/30 shadow-[0_0_15px_-3px_rgba(168,85,247,0.25)]',
    activeSidebarLight: 'bg-gradient-to-r from-purple-500/15 to-fuchsia-500/10 text-purple-950 border border-purple-500/30 shadow-[0_0_15px_-3px_rgba(168,85,247,0.2)]',
    indicator: 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]'
  },
  system: {
    id: 'system',
    title: 'System & Diagnostics',
    subtitle: '',
    icon: HardDrives,
    color: 'text-cyan-600 dark:text-cyan-400',
    accentHex: '#06b6d4',
    glow1: 'bg-cyan-400 dark:bg-cyan-500',
    glow2: 'bg-blue-400 dark:bg-blue-600',
    glow3: 'bg-sky-400 dark:bg-teal-600',
    activeSidebarDark: 'bg-gradient-to-r from-cyan-500/20 to-blue-500/15 text-white border border-cyan-400/30 shadow-[0_0_15px_-3px_rgba(6,182,212,0.25)]',
    activeSidebarLight: 'bg-gradient-to-r from-cyan-500/15 to-blue-500/10 text-cyan-950 border border-cyan-500/30 shadow-[0_0_15px_-3px_rgba(6,182,212,0.2)]',
    indicator: 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
  },
  network: {
    id: 'network',
    title: 'Network & Connectivity',
    subtitle: '',
    icon: ShareNetwork,
    color: 'text-sky-600 dark:text-sky-400',
    accentHex: '#0ea5e9',
    glow1: 'bg-sky-400 dark:bg-sky-500',
    glow2: 'bg-blue-400 dark:bg-blue-600',
    glow3: 'bg-indigo-400 dark:bg-cyan-600',
    activeSidebarDark: 'bg-gradient-to-r from-sky-500/20 to-blue-500/15 text-white border border-sky-400/30 shadow-[0_0_15px_-3px_rgba(14,165,233,0.25)]',
    activeSidebarLight: 'bg-gradient-to-r from-sky-500/15 to-blue-500/10 text-sky-950 border border-sky-500/30 shadow-[0_0_15px_-3px_rgba(14,165,233,0.2)]',
    indicator: 'bg-sky-400 shadow-[0_0_8px_rgba(14,165,233,0.8)]'
  },
  mobility: {
    id: 'mobility',
    title: 'Mobility & Vehicles',
    subtitle: '',
    icon: Car,
    color: 'text-emerald-600 dark:text-emerald-400',
    accentHex: '#10b981',
    glow1: 'bg-emerald-400 dark:bg-emerald-500',
    glow2: 'bg-lime-400 dark:bg-teal-600',
    glow3: 'bg-teal-400 dark:bg-emerald-600',
    activeSidebarDark: 'bg-gradient-to-r from-emerald-500/20 to-lime-500/15 text-white border border-emerald-400/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.25)]',
    activeSidebarLight: 'bg-gradient-to-r from-emerald-500/15 to-lime-500/10 text-emerald-950 border border-emerald-500/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]',
    indicator: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
  },
  health: {
    id: 'health',
    title: 'Health & Vitals',
    subtitle: '',
    icon: Heartbeat,
    color: 'text-rose-500 dark:text-rose-400',
    accentHex: '#f43f5e',
    glow1: 'bg-rose-400 dark:bg-rose-500',
    glow2: 'bg-pink-400 dark:bg-pink-600',
    glow3: 'bg-red-400 dark:bg-rose-600',
    activeSidebarDark: 'bg-gradient-to-r from-rose-500/20 to-pink-500/15 text-white border border-rose-400/30 shadow-[0_0_15px_-3px_rgba(244,63,94,0.25)]',
    activeSidebarLight: 'bg-gradient-to-r from-rose-500/15 to-pink-500/10 text-rose-950 border border-rose-500/30 shadow-[0_0_15px_-3px_rgba(244,63,94,0.2)]',
    indicator: 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
  },
  vacuums: {
    id: 'vacuums',
    title: 'Vacuums & Cleaning',
    subtitle: 'Manage robotic vacuum routines, dock station controls, cleaning zones, and cordless stick batteries.',
    icon: Broom,
    color: 'text-teal-600 dark:text-teal-400',
    accentHex: '#14b8a6',
    glow1: 'bg-teal-400 dark:bg-teal-500',
    glow2: 'bg-cyan-400 dark:bg-cyan-600',
    glow3: 'bg-emerald-400 dark:bg-teal-600',
    activeSidebarDark: 'bg-gradient-to-r from-teal-500/20 to-cyan-500/15 text-white border border-teal-400/30 shadow-[0_0_15px_-3px_rgba(20,184,166,0.25)]',
    activeSidebarLight: 'bg-gradient-to-r from-teal-500/15 to-cyan-500/10 text-teal-950 border border-teal-500/30 shadow-[0_0_15px_-3px_rgba(20,184,166,0.2)]',
    indicator: 'bg-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.8)]'
  },
  automations: {
    id: 'automations',
    title: 'Automations & Scenes',
    subtitle: '',
    icon: GitFork,
    color: 'text-violet-500 dark:text-violet-400',
    accentHex: '#8b5cf6',
    glow1: 'bg-violet-400 dark:bg-violet-500',
    glow2: 'bg-purple-400 dark:bg-purple-600',
    glow3: 'bg-indigo-400 dark:bg-violet-600',
    activeSidebarDark: 'bg-gradient-to-r from-violet-500/20 to-purple-500/15 text-white border border-violet-400/30 shadow-[0_0_15px_-3px_rgba(139,92,246,0.25)]',
    activeSidebarLight: 'bg-gradient-to-r from-violet-500/15 to-purple-500/10 text-violet-950 border border-violet-500/30 shadow-[0_0_15px_-3px_rgba(139,92,246,0.2)]',
    indicator: 'bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.8)]'
  },
  settings: {
    id: 'settings',
    title: 'Settings & Setup',
    subtitle: '',
    icon: GearSix,
    color: 'text-slate-500 dark:text-slate-400',
    accentHex: '#94a3b8',
    glow1: 'bg-slate-400 dark:bg-slate-500',
    glow2: 'bg-indigo-400 dark:bg-slate-700',
    glow3: 'bg-sky-400 dark:bg-indigo-950',
    activeSidebarDark: 'bg-gradient-to-r from-slate-500/20 to-zinc-500/15 text-white border border-slate-400/30 shadow-[0_0_15px_-3px_rgba(148,163,184,0.25)]',
    activeSidebarLight: 'bg-gradient-to-r from-slate-500/15 to-zinc-500/10 text-slate-950 border border-slate-500/30 shadow-[0_0_15px_-3px_rgba(148,163,184,0.2)]',
    indicator: 'bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.8)]'
  }
};
