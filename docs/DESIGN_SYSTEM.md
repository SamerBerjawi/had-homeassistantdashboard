# Design system

The full visual blueprint (frosted glass, bento grid, 4-row metric tiles, frameless charts, ambient glows) is `.agents/rules/design_system.md`. Read it before building UI. This file adds the rules learned in the audit.

## Shared building blocks (use these, do not re-create them)
- `components/ui/ViewLoadingState`, `ViewEmptyState`, `ViewErrorState`: every async view needs loading, empty and error (with retry) states.
- `components/ui/SyncStatusBadge`: the single place config sync state is shown (syncing, offline cache, changes not saved).
- `components/ui/ConfirmDialog`, `DialogShell`: all confirmations and modals (labelled, focus trapped, Escape restores focus).
- `BentoCard`, `BentoGrid`: grid and card shells.

## Accessibility rules (enforced by `tests/e2e/i-accessibility`)
- Every visible button has an accessible name. Icon-only controls get `aria-label`; text hidden on small screens must stay available to screen readers (`sr-only sm:not-sr-only`).
- Dialogs: `role="dialog"`, `aria-modal`, a label, focus trapped, Escape closes (except the sign-in gate).
- Visible focus indicator, even on `outline-none` controls. No text under 11 px. Honour `prefers-reduced-motion`. Never block zoom in the viewport meta.
- Status changes use a polite live region (`role="status"`).

## Known gap
The frosted-glass class strings (`backdrop-blur-*`, `bg-white/65`, ...) are repeated in about 140 places. A `GlassSurface` primitive would remove the drift but needs a design decision on its variants first. Do not start it without agreeing the variants (card level 1/2/3 from the blueprint).
