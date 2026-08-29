# Homz Design System & Theme Specifications

## Core Philosophy: Modern Frosted Glassmorphism & Distinct Ambient Radiances
Both **Light Mode** and **Dark Mode** must look equally premium, tactile, and translucent. Every page in the application features distinctive, vibrant ambient glows that illuminate the background and shine through the frosted glass layers without muddying the canvas or reducing text readability.

---

## 1. Ambient Background Radiances & Distinct Page Themes

Every view has a curated, three-anchor ambient glow system (`glow1`, `glow2`, `glow3`) configured in `src/config/pageThemes.ts`:
- **Canvas Bases**:
  - **Light Mode**: Clean, airy neutral slate canvas `bg-[#f8fafc] text-slate-900`.
  - **Dark Mode**: Deep, modern slate-950 canvas `bg-slate-950 text-white`.
- **Glow Elements**:
  - Multi-bloom anchors (Top-Right, Bottom-Left, and Center) rendered with `blur-[100px] sm:blur-[140px]`.
  - **Light Mode Glows**: Luminous, airy pastel radiances (e.g. `bg-sky-400/35`, `bg-emerald-400/35`, `bg-amber-400/35`, `bg-purple-400/35`, `bg-indigo-400/35`) that give warmth and distinctive identity without muddying the clean light canvas.
  - **Dark Mode Glows**: Vivid, electric neon blooms (e.g. `dark:bg-sky-500/40`, `dark:bg-emerald-500/40`, `dark:bg-amber-500/40`, `dark:bg-purple-500/40`) that create deep cinematic contrast against black/slate-950.

---

## 2. Translucency & Glassmorphism Rules

To ensure the ambient color glows shine through the interface, all cards, panels, and toolbars MUST be translucent in both light and dark modes:

### Cards & Surfaces
- **Light Mode**: `bg-white/65 backdrop-blur-md border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]`
  - *Rule*: Never use opaque `bg-white` or solid `bg-slate-50` for container cards.
- **Dark Mode**: `bg-slate-900/40 dark:bg-black/45 backdrop-blur-md border border-white/10 shadow-lg`
- **Nested Inner Containers**:
  - Light: `bg-slate-900/[0.03] border border-slate-900/[0.06]`
  - Dark: `bg-white/[0.03] border border-white/[0.06]`

### Backdrop Blur Standard
- **Allowed Levels**: Standardize strictly on `backdrop-blur-sm` (4px–8px) or `backdrop-blur-md` (8px–12px).
- **Disallowed Levels**: Do NOT use heavy, cloudy `backdrop-blur-xl`, `2xl`, or `3xl`.
- **WebKit Cross-Browser Support**: All glass elements and `backdrop-blur` utilities have hardware-accelerated `-webkit-backdrop-filter` declarations in `src/index.css`.

### Segmented Sub-Tab Switchers & Filter Bars
- **Container**: `bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/[0.08] dark:border-white/10 backdrop-blur-md p-1.5 rounded-2xl`
- **Active Pill**: Bold, vibrant solid fill:
  - Cyan / Sky: `bg-cyan-500 text-slate-950 font-black shadow-sm`
  - Amber: `bg-amber-500 text-slate-950 font-black shadow-sm`
  - Emerald: `bg-emerald-500 text-slate-950 font-black shadow-sm`
  - Neutral: `bg-slate-900 text-white font-bold dark:bg-white dark:text-slate-950`
- **Inactive Pill**: `text-slate-700 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white`

---

## 3. Harmonious Status Color Tokens

Always use translucent tinted badges and high-contrast borders:

| Status | Dark Mode | Light Mode |
|---|---|---|
| **Success / Armed / Normal** | `bg-emerald-500/15 text-emerald-300 border-emerald-500/35` | `bg-emerald-50/90 text-emerald-900 border-emerald-200/80` |
| **Warning / Open / Motion / Amber** | `bg-amber-500/15 text-amber-300 border-amber-500/35` | `bg-amber-50/95 text-amber-950 border-amber-200/90 shadow-2xs` |
| **Danger / Alarm / Breach** | `bg-rose-500/20 text-rose-300 border-rose-500/40` | `bg-rose-50/90 text-rose-900 border-rose-200/80` |
| **Info / Tech / WebRTC** | `bg-cyan-500/15 text-cyan-300 border-cyan-500/35` | `bg-cyan-50/90 text-cyan-900 border-cyan-200/80` |
| **Night / Sleep Mode** | `bg-indigo-500/15 text-indigo-300 border-indigo-500/35` | `bg-indigo-50/90 text-indigo-900 border-indigo-200/80` |
| **Neutral / Inactive** | `bg-white/5 text-slate-300 border-white/10` | `bg-slate-900/[0.04] text-slate-700 border-slate-900/[0.08]` |

---

## 4. Typography & Contrast Guidelines

- **Primary Headings & Titles**: `text-slate-900 dark:text-white font-black tracking-tight`
- **Subtitles & Descriptions**: `text-slate-600 dark:text-slate-400 font-medium` (never washed-out `text-slate-400`/`text-slate-500` in light mode).
- **Muted Details & Timestamps**: `text-slate-500 dark:text-slate-400 font-medium`
- **Monospace Telemetry / Ports**: `font-mono font-bold text-xs`

---

## 5. Key Checkpoints for New Views & Components

1. **Translucency Check**: Check that card backgrounds use `bg-white/65` (light) and `bg-slate-900/40` or `bg-black/45` (dark) with `backdrop-blur-md` so that ambient page glows pass through.
2. **Contrast Check**: Ensure light mode text is crisp and legible (`text-slate-900` for titles, `text-slate-600` for subtitles).
3. **No Heavy Blurs**: Only use `backdrop-blur-sm` or `backdrop-blur-md`.
