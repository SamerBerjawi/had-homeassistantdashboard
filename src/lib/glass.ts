// Frosted-glass surface materials (background, border, blur, shadow) shared across views.
// Shape, spacing and layout (rounded-*, p-*, flex, ...) stay at the call site: cn(glass.tile, 'rounded-2xl p-4').
// Values mirror what the code already renders; see .agents/rules/design_system.md (Glass surface roles).
// Keep each value a full literal string so the Tailwind scanner picks the classes up.
export const glass = {
  /** Primary section container (bento column / page section). */
  panel:
    'backdrop-blur-xl bg-white/20 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 shadow-[4px_6px_12px_rgba(0,0,0,0.15)]',
  /** Inner tile or stat row nested inside a panel. */
  tile: 'bg-white/20 dark:bg-black/20 border border-slate-200/40 dark:border-white/5 backdrop-blur-sm',
  /** Form inputs, segmented controls and settings sub-cards. */
  field: 'bg-white/60 dark:bg-black/25 backdrop-blur-md border border-slate-200/80 dark:border-white/10',
  /** Small telemetry chips on overview tiles. */
  chip: 'bg-white/50 dark:bg-black/30 backdrop-blur-xs border border-white/30 dark:border-white/10',
  /** Icon well on overview tiles. */
  iconWell: 'bg-white/70 dark:bg-black/30 backdrop-blur-md border border-white/80 dark:border-white/10',
} as const;

export type GlassRole = keyof typeof glass;
