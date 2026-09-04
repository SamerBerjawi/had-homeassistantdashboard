# Homz / Apple Health Design System Blueprint & Architecture Guide

A production-grade, highly tactile design system guide synthesized from the **Apple Health & Vitals** dashboard and the modern **Homz frosted glassmorphic** design language. 

Designed for direct portability into SaaS analytics, IoT cockpits, DevOps monitoring, fintech dashboards, and ambient web applications.

---

## 1. Core Visual Philosophy

| Pillar | Principle | Implementation Rule |
|---|---|---|
| **Frosted Glassmorphism** | Translucent surfaces that allow vibrant ambient blooms to shine through without reducing text legibility. | Never use solid opaque backgrounds for cards (`bg-white` or `bg-slate-900`). Standardize strictly on `bg-white/65` (light) and `bg-slate-900/40` or `bg-black/20` to `bg-black/45` (dark) with `backdrop-blur-md` (8px–12px). |
| **Panoramic Bento Grid** | Predictable, balanced visual rhythm with zero vertical dead space. | 3-column desktop layout (`grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start` where each primary column is `lg:col-span-4`). All columns start top-aligned with independent internal flex wrapping. |
| **4-Row Metric Micro-Tile Rhythm** | Information hierarchy designed to prevent cognitive clutter and avoid icon/badge collision. | Every metric card follows a strict 4-row vertical flow: **1) Status & Icon**, **2) Full-Width Title**, **3) Hero Metric & Delta**, and **4) Footer Ribbon & Sparkline**. |
| **Frameless Micro-Data Visualizations** | Charts and graphs feel like integral graphical ink, not foreign embedded boxes. | Remove chart borders, container backgrounds, and heavy axes. Charts use negative vertical margins (`-my-1`), subtle 3-tick Y-axes, and soft dotted grid lines (`stroke="rgba(255,255,255,0.05)"`). |
| **Ambient Radiances** | Warm, contextual lighting anchors that give life to the canvas. | A 3-point radial lighting anchor system (`top-right`, `center`, `bottom-left`) with `blur-[100px] sm:blur-[140px]` calibrated for both high-contrast dark mode and luminous pastel light mode. |

---

## 2. Canvas & Ambient Radiance System

Every application view or page canvas uses a fixed background layer with 3 calibrated lighting anchors:

```tsx
// Canvas Structure
<div className="relative min-h-screen w-full bg-[#f8fafc] text-slate-900 dark:bg-slate-950 dark:text-white overflow-x-hidden">
  {/* Ambient Radiances Container (Fixed / Absolute behind content) */}
  <div className="pointer-events-none fixed inset-0 overflow-hidden isolate z-0">
    {/* Glow 1: Top-Right (Primary Identity) */}
    <div className="absolute -top-32 -right-32 w-96 h-96 sm:w-[32rem] sm:h-[32rem] rounded-full bg-rose-400/25 dark:bg-rose-500/20 blur-[120px] sm:blur-[160px]" />
    
    {/* Glow 2: Center (Secondary Accent) */}
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 sm:w-[28rem] sm:h-[28rem] rounded-full bg-cyan-400/20 dark:bg-cyan-500/15 blur-[120px] sm:blur-[140px]" />
    
    {/* Glow 3: Bottom-Left (Atmospheric Anchor) */}
    <div className="absolute -bottom-32 -left-32 w-96 h-96 sm:w-[32rem] sm:h-[32rem] rounded-full bg-purple-400/25 dark:bg-purple-600/20 blur-[120px] sm:blur-[160px]" />
  </div>

  {/* Page Content */}
  <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
    {/* View Content */}
  </main>
</div>
```

---

## 3. Surface & Elevation Hierarchy

Standardize container glassmorphism across 3 strict layers:

### Level 1: Primary Section Containers (Bento Columns)
- **Light Mode**: `bg-white/60 dark:bg-black/20 backdrop-blur-xl border border-slate-200/60 dark:border-white/5 rounded-3xl p-4 sm:p-5 shadow-[4px_6px_12px_rgba(0,0,0,0.06)] dark:shadow-[4px_6px_12px_rgba(0,0,0,0.25)]`
- **Purpose**: Groups a domain area (e.g. Activity, Cardiovascular, Storage Pools, Fleet Telemetry).

### Level 2: Metric Tiles (Inner Bento Tiles)
- **Light Mode**: `bg-white/80 hover:bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 transition-all duration-200 shadow-xs hover:shadow-md`
- **Dark Mode**: `bg-white/[0.04] hover:bg-white/[0.07] backdrop-blur-md border border-white/10 rounded-2xl p-3.5 sm:p-4 transition-all duration-200 shadow-xs hover:shadow-md`

### Level 3: Nested Data Wells & Sub-Containers
- **Light Mode**: `bg-slate-900/[0.03] border border-slate-900/[0.06] rounded-xl p-2.5`
- **Dark Mode**: `bg-white/[0.03] border border-white/[0.06] rounded-xl p-2.5`

> [!IMPORTANT]
> **Backdrop Filter Rule**: Avoid heavy, opaque blurs (`backdrop-blur-2xl` or `3xl`) on cards as they degrade GPU performance and turn the background mud-grey. Stick strictly to `backdrop-blur-md` (8px–12px) or `backdrop-blur-xl` on top-level outer cards.

---

## 4. The 4-Row Metric Micro-Card Anatomy

Every metric card (vital stat, sensor value, cloud resource, stock ticker) is constructed using this battle-tested 4-row layout:

```tsx
<div className="relative p-3.5 sm:p-4 rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 backdrop-blur-md transition-all flex flex-col justify-between select-none group">
  <div>
    {/* ROW 1: Icon on Left, Status Badge on Right (never overlap) */}
    <div className="flex items-center justify-between gap-2">
      <div
        className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 border"
        style={{
          backgroundColor: `${accentColor}18`, // ~10% fill
          borderColor: `${accentColor}35`,     // ~20% border
          color: accentColor,
        }}
      >
        <Icon size={17} weight="duotone" />
      </div>

      <AnimatedBadge variant={statusVariant}>
        {statusLabel}
      </AnimatedBadge>
    </div>

    {/* ROW 2: Metric Title (Full width, no badge crowding) */}
    <div className="mt-2.5 min-w-0">
      <h3 className="text-xs font-bold text-slate-800 dark:text-white truncate">
        {metricTitle}
      </h3>
    </div>

    {/* ROW 3: Big Metric Value, Unit & Change Delta Indicator */}
    <div className="flex items-baseline justify-between gap-1.5 mt-1">
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
          {formattedValue}
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 shrink-0">
          {unit}
        </span>
      </div>

      {changePercent !== undefined && (
        <div className={`flex items-center text-[11px] font-bold shrink-0 ${changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
          {changePercent >= 0 ? <CaretUp size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />}
          <span>{Math.abs(changePercent)}%</span>
        </div>
      )}
    </div>
  </div>

  {/* ROW 4: Subtle Footer Divider, Min/Max/Total & Mini SVG Sparkline */}
  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2 overflow-hidden">
    <div className="min-w-0 flex-1 text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate">
      Min: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{minVal}</strong> · Max: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{maxVal}</strong>
    </div>

    {/* Mini SVG Sparkline */}
    <div className="shrink-0 w-14 h-5 overflow-hidden">
      <svg viewBox="0 0 70 24" className="w-full h-full block">
        <polyline
          fill="none"
          stroke={accentColor}
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={sparkPoints}
        />
      </svg>
    </div>
  </div>
</div>
```

---

## 5. Concentric Activity Rings & Circular Gauges

When displaying multi-dimensional completion or quota rates (e.g. Move/Exercise/Stand, CPU/RAM/Disk, Storage Tiers):

### SVG Concentric Architecture
- **Coordinates**: Single SVG centered at `size / 2` with `transform -rotate-90`.
- **Drop Shadows**: `filter drop-shadow-[0_0_12px_rgba(accent,0.25)]`.
- **Gradients**: Use 2-stop linear gradients per ring (`#FF2D55` to `#FF6B8B`, `#A3F900` to `#30D158`, `#04C7DD` to `#007AFF`).
- **Stroke Width**: `9.5px` stroke with `strokeLinecap="round"` on foreground circles.
- **Track Rings**: Background circles with identical radius and `10%` to `15%` opacity (`#FF2D5515`).

```tsx
<svg width={114} height={114} className="transform -rotate-90 filter drop-shadow-[0_0_12px_rgba(255,45,85,0.25)]">
  <defs>
    <linearGradient id="moveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#FF2D55" />
      <stop offset="100%" stopColor="#FF6B8B" />
    </linearGradient>
  </defs>

  {/* Background Track */}
  <circle cx={57} cy={57} r={47} fill="none" stroke="#FF2D5522" strokeWidth={9.5} />
  
  {/* Active Progress Ring */}
  <circle
    cx={57}
    cy={57}
    r={47}
    fill="none"
    stroke="url(#moveGrad)"
    strokeWidth={9.5}
    strokeLinecap="round"
    strokeDasharray={2 * Math.PI * 47}
    strokeDashoffset={2 * Math.PI * 47 * (1 - Math.min(1, progressRatio))}
    className="transition-all duration-700 ease-out"
  />
</svg>
```

---

## 6. Frameless Micro-Charts Integration

Avoid putting charts inside separate opaque sub-boxes. Integrate line and bar charts directly into the parent card:

- **Height**: Ultra-compact (`h-24 sm:h-28`).
- **Margins**: `-my-1` with minimal internal padding (`margin={{ top: 6, right: 6, bottom: 16, left: 24 }}`).
- **Grid Lines**: `strokeDasharray="3,3"` with very low contrast (`rgba(255,255,255,0.05)` or `rgba(0,0,0,0.05)`).
- **Y-Axis**: Maximum 3 ticks (`numTicks={3}`) with muted typography (`text-[10px] fill-slate-400`).
- **Tooltip**: Frameless floating card with `backdrop-blur-md bg-slate-950/85 text-white border border-white/10 rounded-xl p-2 text-xs shadow-xl`.

---

## 7. Semantic Color Palette & Badges

| Token / State | Light Mode Fill & Border | Dark Mode Fill & Border | Accent Hex |
|---|---|---|---|
| **Optimal / Health / Pass** | `bg-emerald-50 text-emerald-900 border-emerald-200/80` | `bg-emerald-500/15 text-emerald-300 border-emerald-500/35` | `#10B981` |
| **Elevated / Alert / Danger** | `bg-rose-50 text-rose-900 border-rose-200/80` | `bg-rose-500/15 text-rose-300 border-rose-500/35` | `#EF4444` |
| **Low / Warning / Attention** | `bg-amber-50 text-amber-950 border-amber-200/90` | `bg-amber-500/15 text-amber-300 border-amber-500/35` | `#F59E0B` |
| **Normal / Info / Tech** | `bg-cyan-50 text-cyan-900 border-cyan-200/80` | `bg-cyan-500/15 text-cyan-300 border-cyan-500/35` | `#06B6D4` |
| **Sleep / Night / Vitals** | `bg-purple-50 text-purple-900 border-purple-200/80` | `bg-purple-500/15 text-purple-300 border-purple-500/35` | `#AF52DE` |
| **Neutral / Idle** | `bg-slate-900/[0.04] text-slate-700 border-slate-900/[0.08]` | `bg-white/5 text-slate-300 border-white/10` | `#64748B` |

---

## 8. Zero-State / Empty Onboarding Pattern

When user data or sensors are disconnected, render a guided zero-state rather than a barren white screen or empty box:

1. **Center Card**: Elevated glass modal (`max-w-2xl rounded-3xl p-6 sm:p-8 backdrop-blur-2xl border border-white/10 shadow-2xl`).
2. **Animated Border Beam**: High-end continuous multi-color gradient shimmer (`colorFrom="#FF2D55" colorTo="#AF52DE"`).
3. **3-Step Progression Grid**: Micro-cards explaining **Step 1: Connect**, **Step 2: Authorize**, and **Step 3: Track**.
4. **Interactive Demo Preview Escape Hatch**: A prominent `"Explore with Interactive Demo"` button that immediately populates the UI with demo fixtures so stakeholders can preview the interface.

---

## 9. Typography Rules

- **Display & Large Telemetry Numbers**: `font-mono font-black text-2xl sm:text-3xl tracking-tight text-slate-900 dark:text-white`. Always use tabular numbers (`font-mono`) so numbers don't jitter when updating.
- **Card & Section Headings**: `font-black tracking-wider uppercase text-sm text-slate-900 dark:text-white`.
- **Subtitles**: `text-xs text-slate-600 dark:text-slate-400 font-medium`.
- **Micro-Labels & Statistics**: `text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider`.
- **Dashes for Missing Data**: Never display `NaN`, `null`, `undefined`, or synthetic fake numbers. When missing, render `--` in `text-slate-400 font-mono font-black`.

---

## 10. Checklist for Building New Views & Applications

- [ ] **Ambient Glows**: Configured 3 ambient background radiances (`blur-[120px]`) behind a translucent canvas.
- [ ] **No Opaque Cards**: Checked that container cards use `bg-white/60` (light) and `bg-black/20` or `bg-slate-900/40` (dark).
- [ ] **Clean Blur Levels**: Strictly using `backdrop-blur-md` on tiles and `backdrop-blur-xl` on main section cards.
- [ ] **4-Row Card Rhythm**: Icon & status badge in row 1, title in row 2, big number & unit in row 3, sparkline & bounds in row 4.
- [ ] **Frameless Charts**: Micro-charts have zero container borders/backgrounds and blend directly into the parent card.
- [ ] **Responsive Breakpoints**: 1 column on mobile, 2 columns on tablet, 3 columns on desktop (`grid-cols-1 md:grid-cols-2 lg:grid-cols-12`).
