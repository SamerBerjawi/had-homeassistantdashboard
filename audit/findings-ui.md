# UI Consistency & Accessibility Findings

Scope: UI consistency and accessibility only. No application code was modified. Evidence comes from reading code and from grep and a JSX scan script (`scratch/ui-scan.cjs`, outside the repo). **No browser, screen reader or Lighthouse run was done**, so responsive and runtime keyboard behaviour is in "Unverified". Counts are line- or tag-level matches and are approximate.

## Intended design system (what deviations are measured against)

Sources: `.agents/rules/design_system.md`, `CLAUDE.md` (line 60) and `src/index.css`.

- **Stack:** Tailwind v4 utilities with `cn()` and `class-variance-authority`. Plus Jakarta Sans and JetBrains Mono via `@theme`. Dark mode is the default (`<html class="dark">`), with a `.dark` variant on every surface.
- **Tokens:** `@theme` defines only brand colors (`--color-brand-*`, `--color-glass-white`) and fonts. Chart tokens (`--chart-*`) are defined in `:root`. There are no spacing, radius, or semantic color tokens. The rules file specifies raw Tailwind classes instead (`rounded-3xl` for sections, `rounded-2xl` for tiles).
- **Surfaces:** frosted glass (`bg-white/60 dark:bg-black/20 backdrop-blur-xl`, borders `slate-200/60` / `white/5`). Three elevation layers. No opaque cards. `.glass-depth-card` in `index.css` is the CSS-class version.
- **Layout:** 12-column bento grid (`grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6`), 4-row metric tiles, frameless charts, ambient radiances.
- **Primitives:** `components/ui/*` (`ViewEmptyState`, `ViewLoadingState`, `CustomDropdown`, `BentoCard`...), `components/base/*` (react-aria / untitledui-derived checkbox, radio, toggle, tooltip, dropdown, avatar, badges), and `components/ui/button.tsx` (shadcn/base-ui).
- **In practice** the design system is a prose rulebook plus per-component Tailwind strings. It has no enforced token layer.

## Summary

| ID | Title | Severity | Effort |
|---|---|---|---|
| UI-001 | Viewport blocks pinch-zoom | High | S |
| UI-002 | Most overlays lack dialog semantics, Escape and focus management | High | M |
| UI-003 | Icon-only buttons with no accessible name | High | S |
| UI-004 | Form labels not associated with inputs | Medium | S |
| UI-005 | Clickable `div`/`span` elements with no keyboard support | Medium | M |
| UI-006 | Focus indicators are suppressed on many controls | Medium | M |
| UI-007 | Text this small is widespread: 1,403 uses of `text-[Npx]` at 8–11 px | Medium | M |
| UI-008 | Low-contrast placeholder and helper text on dark surfaces | Medium | S |
| UI-009 | No `prefers-reduced-motion` handling | Medium | S |
| UI-010 | 739 hardcoded hex colors bypass the theme | Medium | L |
| UI-011 | Two competing button/primitive layers; `ui/button.tsx` is dead and contradicts the style | Medium | M |
| UI-012 | Four near-duplicate confirmation modals; 25 hand-rolled overlays | Medium | L |
| UI-013 | Loading and empty states are ad hoc, not using the shared components | Low | M |
| UI-014 | Tailwind theme aliases are misspelled (`----chart-*`) | Low | S |
| UI-015 | Design rules contradict themselves and the code | Low | S |
| UI-016 | Inconsistent copy and terminology | Low | S |

---

### UI-001 Viewport blocks pinch-zoom
- Severity: High
- Location: `index.html:5`
- Evidence: `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />`
- Impact: Low-vision users cannot zoom on mobile and tablet. This fails WCAG 1.4.4 (Resize text), and combined with the 8–11 px text in UI-007 it makes the app hard to read. The app is also installed as a PWA on phones and wall tablets.
- Suggested fix: Remove `maximum-scale` and `user-scalable=no`. If double-tap zoom is the concern, use `touch-action: manipulation` on controls.
- Effort: S

### UI-002 Most overlays lack dialog semantics, Escape and focus management
- Severity: High
- Location: 25 files that use `fixed inset-0` (list below). Only `CriticalAlertModal.tsx:105-106` has `role="alertdialog" aria-modal="true"`. No file has `role="dialog"`.
- Evidence: A per-file scan for Escape/keydown handling and focus handling (focus calls, `aria-modal`, dialog roles):
  - 18 of the 25 files have **neither** an Escape handler nor any focus handling, including `AuthModal`, `PinLockModal`, `ClimateConfirmModal`, `UnlockConfirmModal`, `ActionConfirmModal`, `EntityCustomizerModal`, `VehicleCustomizerModal`, `CameraStreamModal`, `AlertDrawer`, `CardCatalogDrawer` and `IntegrationDetailDrawer`. Some of these 25 matches are non-dialogs, such as `AmbientBackground`, `RootErrorBoundary` and `App.tsx`.
  - 6 have an Escape or keydown handler (`EntityDetailModal`, `DetailsRightDrawer`, `ArmAwayConfirmModal`, `IconFinderModal`, `CardModalContainer`, and `CanvasHeader` for focus only). Only `IconFinderModal`, `CriticalAlertModal` and `CanvasHeader` move focus at all.
  - No focus trap or focus restore was found anywhere in these files.
  - `@base-ui/react` and `react-aria-components` are already dependencies.
- Impact: Keyboard and screen-reader users can tab into the page behind an open modal, are not told a dialog opened, and cannot dismiss most dialogs with Escape. The PIN lock and sign-in modals are the entry path to the app.
- Suggested fix: Build one `Modal`/`Drawer` primitive on base-ui `Dialog` or react-aria `Modal`, which gives role, `aria-modal`, focus trap, Escape and focus restore. Migrate the 18+ overlays to it. This is the same work as UI-012.
- Effort: M

### UI-003 Icon-only buttons with no accessible name
- Severity: High
- Location: 36 buttons with no `aria-label`, `title` or text, found by the JSX scan. Examples:
  - `auth/AuthModal.tsx:123` (close) and `:292`
  - `canvas/PinLockModal.tsx:104` (close)
  - `canvas/CanvasHeader.tsx:294`
  - `canvas/CardCatalogDrawer.tsx:257`
  - `canvas/cards/SecurityLockCard.tsx:49`
  - `canvas/cards/VacuumCard.tsx:64`
  - `canvas/modals/GenericDetailModal.tsx:56`, `MediaDetailModal.tsx:327`, `VacuumDetailModal.tsx:75`
  - `integrations/IntegrationDetailDrawer.tsx:229`, `:302`
- Evidence:
  ```tsx
  <button type="button" onClick={closeAuthModal} className="absolute top-6 right-6 p-2 ...">
    <X size={20} weight="bold" />
  </button>
  ```
  There are 694 `<button` tags and only 45 `aria-label` attributes in `src`. The scan can miss buttons whose name comes from dynamic children, so 36 is a floor on what it detected, not a complete count.
- Impact: Screen readers announce "button" with no purpose, including on the close buttons of every modal and the lock/vacuum controls.
- Suggested fix: Add `aria-label` to each. A shared `IconButton` that requires a `label` prop would prevent a recurrence.
- Effort: S

### UI-004 Form labels not associated with inputs
- Severity: Medium
- Location: `auth/AuthModal.tsx:212-224` (HA URL) and `:271-276` (token), plus 55 `<input>` tags overall
- Evidence: `<label className="block text-xs ...">Home Assistant Instance URL</label>` followed by a sibling `<input type="text" ...>`. The label has no `htmlFor` and does not wrap the input; the input has no `id` or `aria-label` (it only has a `placeholder`). Across `src` there are 38 `<label>` tags and 0 `htmlFor`. 55 `<input>` tags have no `id`, `aria-label` or `aria-labelledby`. Some of those are wrapped in a `<label>`, so not all are failures. I did not classify each.
- Impact: Screen readers read these fields without names, and clicking the label does not focus the input. This hits the very first screen a new user sees.
- Suggested fix: Use `htmlFor`/`id` (via `useId`) or wrap inputs in the label. A shared `Field` component would enforce it.
- Effort: S

### UI-005 Clickable `div`/`span` elements with no keyboard support
- Severity: Medium
- Location: 82 non-interactive elements with `onClick` and no `role`, `tabIndex` or key handler. Examples: `Sidebar.tsx:166` (the brand logo, which navigates to Overview), `Sidebar.tsx:372`, `canvas/CanvasHeader.tsx:127,137,249`, `canvas/CardShell.tsx:95`, `canvas/cards/CameraCard.tsx:28`, `canvas/cards/MediaPlayerCard.tsx:132`, `camera/CameraFeed.tsx:206`.
- Evidence:
  ```tsx
  <div key={p.id} onClick={() => { onSelectProfile(p.id); setShowProfileMenu(false); }} ...>
  ```
  `CanvasHeader.tsx:137` is the profile-switch menu item. Across `src` there is 1 `role="button"`, 2 `tabIndex` and 1 `onKeyDown`. Some matches are backdrop-dismiss overlays (such as `Sidebar.tsx:372`), where `onClick` on a non-interactive element is acceptable if Escape also works. Some of the 82 are probably that, so treat the figure as an upper bound.
- Impact: Keyboard-only and switch users cannot activate these, including switching dashboard profiles and opening cameras and cards.
- Suggested fix: Use `<button>` (or `role="button" tabIndex={0}` plus Enter/Space handling where nesting forbids a button).
- Effort: M

### UI-006 Focus indicators are suppressed on many controls
- Severity: Medium
- Location: 28 `outline-none` and 15 `focus-visible`/`focus:ring` occurrences across `src`. Example: `AuthModal.tsx:223`: `focus:outline-none focus:ring-2 focus:ring-sky-500`. A ring is provided there. By contrast `PinLockModal.tsx:104` (the close button) and `CanvasHeader.tsx:137` have no focus style at all.
- Evidence: 694 buttons versus 15 focus-style occurrences. Buttons with no `focus-visible` class fall back on the browser default outline, which is acceptable. The risk is the `outline-none` cases with no replacement. I did not check each of the 28 for a replacement ring.
- Impact: Keyboard users lose track of focus in places where the default outline is removed and nothing replaces it.
- Suggested fix: Add one global `:focus-visible` rule in `index.css`, and require a visible replacement wherever `outline-none` is used.
- Effort: M

### UI-007 Text this small is widespread
- Severity: Medium
- Location: Across `src`: `text-[8px]` to `text-[11px]` occurs 1,403 times, including 279 at 8–9 px. Example: `AuthModal.tsx:205` (`text-[9px]`), `:286` (`text-[10px]` helper text), `:228` (`text-[11px]` helper text).
- Evidence: grep counts. 1,284 `text-[Npx]` arbitrary sizes in total, and the Tailwind scale is bypassed instead.
- Impact: Hard to read at arm's length on a wall tablet or on phones, and it cannot be fixed by the user (UI-001). The sizes bypass the type scale, so there is no single place to adjust.
- Suggested fix: Define a type scale in `@theme` (for example `--text-micro`) with a minimum of 11–12 px. Replace the arbitrary sizes in bulk.
- Effort: M

### UI-008 Low-contrast placeholder and helper text on dark surfaces
- Severity: Medium
- Location: `AuthModal.tsx:223` (`placeholder-slate-500`), `:276` (`placeholder-slate-600`), and the `text-slate-400` helper text on `bg-slate-900/90`.
- Evidence: Contrast computed by hand from the Tailwind palette, not measured in a browser:
  - `slate-600` (#475569) on a near-black background is about 2.3:1.
  - `slate-500` (#64748b) is about 3.7:1.
  - Both are below the 4.5:1 minimum for normal text (WCAG 1.4.3). `text-white/30`-style opacity text was not measured.
- Impact: Hints and placeholders in the sign-in form are hard to read for low-vision users.
- Suggested fix: Use at least `slate-400` for placeholders on dark surfaces, then verify with a contrast checker.
- Effort: S

### UI-009 No `prefers-reduced-motion` handling
- Severity: Medium
- Location: `src` and `index.html`: 0 occurrences of `prefers-reduced-motion`. The app uses motion/framer-motion, `animate-spin`, `BorderBeam`, `NumberTicker`, blurred radiances and a pulsing hazard overlay.
- Evidence: grep count 0.
- Impact: Users with vestibular disorders cannot turn the motion down (WCAG 2.3.3).
- Suggested fix: Wrap the app in motion's `<MotionConfig reducedMotion="user">` and add a CSS media query that disables decorative animations.
- Effort: S

### UI-010 739 hardcoded hex colors bypass the theme
- Severity: Medium
- Location: 739 hex literals in `src/**/*.tsx` (including mock or demo data, which I did not separate out). Largest by directory: `views` 249, `overview` 117, `modals` 96, `energy` 89, `settings` 56, `ui` 42. A further 28 are Tailwind arbitrary colors (`bg-[#...]`). The design rules file itself uses `bg-[#f8fafc]`.
- Evidence: grep counts. `@theme` defines only five brand colors, and the app uses `sky`/`cyan`/`slate`/`rose` utilities directly, so there is no semantic layer (success, warning, danger, surface).
- Impact: A theme change or a contrast fix means editing hundreds of files, and light and dark variants can drift apart.
- Suggested fix: Add semantic tokens to `@theme` and migrate by directory, starting with `views`. Some hex values are legitimate (device or brand colors from Home Assistant data), so classify them first.
- Effort: L

### UI-011 Two competing button/primitive layers; `ui/button.tsx` is dead and contradicts the style
- Severity: Medium
- Location: `src/components/ui/button.tsx`; `src/components/base/*`
- Evidence:
  - `ui/button.tsx` (shadcn/base-ui) has 0 importers. It is styled with `rounded-none`, `h-8` and `text-xs`, which contradicts the app's `rounded-2xl` look. Meanwhile there are 694 raw `<button>` elements, each with its own long class string (compare `AuthModal.tsx:123`, `:292` and `PinLockModal.tsx:104`).
  - The `base/*` primitives (checkbox, radio, toggle, dropdown, avatar) each have only 1–2 importers, while `Toggle`/`Switch` components are re-implemented in `SwitchTile`, `DeviceVisibilitySection`, `AreaDetailView`, `OverviewHeader`, `SwitchControlView` and others. Dropdowns: `CustomDropdown` (9 importers) versus `base/dropdown` (1 importer).
  - Three icon libraries are in use (`@phosphor-icons/react`, `@untitledui/icons`, lucide per CLAUDE.md), so stroke weights vary.
- Impact: Buttons, toggles and dropdowns look and behave differently across pages. Fixes such as UI-003 and UI-006 have to be repeated at every call site.
- Suggested fix: Pick one `Button` and one `Toggle` and one `Dropdown`, restyle `ui/button.tsx` to the app look, and migrate gradually. Delete the unused primitives.
- Effort: M

### UI-012 Four near-duplicate confirmation modals; 25 hand-rolled overlays
- Severity: Medium
- Location: `overview/modals/ArmAwayConfirmModal.tsx` (253 lines), `mobility/UnlockConfirmModal.tsx` (165), `mobility/ClimateConfirmModal.tsx` (141), `views/mobility/ActionConfirmModal.tsx` (154) — 713 lines in total.
- Evidence: All four are confirm/cancel dialogs. Only one (`ArmAwayConfirmModal`) handles Escape. Overall 25 files build their own `fixed inset-0` overlay with differing z-indexes (for example `z-[10000]` in `CriticalAlertModal`), backdrops and radii. `PinLockModal`, `AuthModal` and `CriticalAlertModal` each use their own panel styling (`bg-slate-900/90` and `/95`).
- Impact: Inconsistent confirmation UX and accessibility (UI-002), and each fix needs repeating. Layering is controlled only by magic z-index numbers.
- Suggested fix: One `ConfirmDialog` (title, body, tone, confirm label) on a shared `Modal` primitive, with a z-index scale in the theme.
- Effort: L

### UI-013 Loading and empty states are ad hoc, not using the shared components
- Severity: Low
- Location: `ui/ViewLoadingState.tsx` (8 importers) and `ui/ViewEmptyState.tsx` (8 importers) versus 51 inline `animate-spin` spinners and about 20 hand-written "No … found/available/yet" strings in `components`.
- Evidence: grep counts. Error copy varies too: "Failed to …" appears in many forms with no shared error component (11 plain "Error" labels).
- Impact: The look and the wording of loading, empty and error states differ page to page. There is no `role="status"`/`aria-live` on most of them (3 uses of `aria-live`/`role="alert"`/`role="status"` in all of `src`), so screen readers are not told when content loads or an action fails.
- Suggested fix: Use the two shared states everywhere, add `role="status"`, and add `aria-live="polite"` to `NotificationToast`.
- Effort: M

### UI-014 Tailwind theme aliases are misspelled (`----chart-*`)
- Severity: Low
- Location: `src/index.css:498-505`
- Evidence:
  ```css
  --color-chart-marker-background: var(----chart-marker-background);
  --color-chart-label: var(----chart-label);
  --color-chart-scale-01: var(----chart-scale-01);
  ```
  Four dashes, but the variables are defined as `--chart-*` in `:root`. The utilities that use these (for example `text-chart-label` in `charts/chart-stat-flow.tsx:117`, `live-y-axis.tsx:215`, `live-x-axis.tsx:119`) resolve to an undefined variable.
- Impact: Those classes get no color and fall back to the inherited text color. I did not render the charts to see the visual difference. `chart-context.tsx` reads `var(--chart-marker-*)` directly, so it is unaffected.
- Suggested fix: Replace `----` with `--` on those eight lines.
- Effort: S

### UI-015 Design rules contradict themselves and the code
- Severity: Low
- Location: `.agents/rules/design_system.md` vs `src/index.css` (`.glass-depth-card`) vs `AuthModal.tsx`
- Evidence: The rules specify a bordered glass surface (`border border-slate-200/60 ... rounded-3xl`), while `.glass-depth-card` has `border: none` and `border-radius: 24px` with 20% alpha backgrounds. `CLAUDE.md` says "no opaque card backgrounds", yet `AuthModal` uses `bg-slate-900/90`/`95`, near opaque. Spacing and radii are written as literal values in the prose, not tokens.
- Impact: Contributors have no single answer to "what does a card look like", so new screens drift.
- Suggested fix: Decide on one surface spec and encode it as utilities or tokens, then update the rules file to point at them.
- Effort: S

### UI-016 Inconsistent copy and terminology
- Severity: Low
- Location: `auth/AuthModal.tsx:305` ("Connect via LLAT"), `auth/DemoBanner.tsx:46` ("Connect Live HA"), `settings/ConnectionWebSocketSection.tsx:207` ("Connect with Home Assistant"), `:265` ("Connect WebSocket"); the same wording problem appears in `AuthModal.tsx:212` ("Home Assistant Instance URL").
- Evidence: The same action is phrased four ways, and "HA", "Home Assistant" and "LLAT" are used interchangeably with the unexplained abbreviation "LLAT" as a button label. Confirm/dismiss labels vary: "Cancel" (3), "Close" (1), "Done" (2), "Back" (3), "Remove" (4), "Delete" (1) with no clear rule for when each is used. A grep for common misspellings found nothing.
- Impact: Users may not understand "LLAT", and the wording makes the product feel inconsistent.
- Suggested fix: Pick a glossary (say "Long-lived access token", "Home Assistant") and a rule for dismiss vs destructive labels.
- Effort: S

---

## Checked and found sound
- Images: 55 `<img>` tags counted, and `alt=` appears with 53 of them (a loose multi-line scan, so verify), 6 intentionally empty (`alt=""`).
- `lang="en"` is set on `<html>`. The app has `<main>` (1) and `<nav>` (3) landmarks.
- Dark/light variants exist on the shared surfaces, and the safe-area insets are handled in `index.css`.
- `CriticalAlertModal` has correct `role="alertdialog"` and `aria-modal`.
- `base/*` and `ui/CustomDropdown` give the app some reusable primitives to build on.

## Unverified
- Responsive behaviour at mobile widths was not checked in a browser. Static signs are 85 fixed-width classes (`w-[…px]` or `min-w-[…px]`) in `components`. The ones I saw (blurred decorative blobs in `AuthModal`, `FullScreenLoadingPage`) are decorative and not layout-breaking. `html, body` are `overflow: hidden`, so any overflowing page cannot scroll the body.
- Heading structure: only 3 `<h1>` were found, and I did not check the hierarchy per view.
- Color contrast was computed by hand for a few cases only. No automated check (axe, Lighthouse) was run.
- Actual keyboard tab order, screen-reader output and touch target sizes were not tested at runtime.
- Whether the `----chart-*` typo (UI-014) changes what renders was not checked visually.
- Some of the 82 clickable elements (UI-005), 55 inputs (UI-004) and 36 buttons (UI-003) may be named or wrapped by means my scan did not detect.
- Copy review covered only auth, settings and common button labels, not every view.

## Coverage
- Covered: design tokens and `index.css`, rules file, shared primitives, modal/overlay patterns, forms and labels, button and input accessibility, motion, viewport, loading/empty/error patterns, and copy in auth and settings.
- Not covered: runtime keyboard, screen-reader and responsive testing, per-view heading and landmark structure, complete copy review, and the charts' visual output.
