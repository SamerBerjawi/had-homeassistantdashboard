# Rules for AI agents working on this repo

Optimise for long-term maintainability over speed. Preserve behaviour. Make the smallest safe change.

1. Read `CLAUDE.md`, `docs/ARCHITECTURE.md` and the relevant section of `docs/STATE_MACHINE.md` first.
2. After any change run `npm run lint && npm test`. For server, auth, camera or config changes also run the matching `scripts/test-*.ts` (`test-token-security.ts`, `test-auth-trust.ts`, `test-camera-pipeline.ts`, `test-persistence-regression.ts`).
3. Never touch: `dist/`, `data/`, `.env*`, `scratch/` outputs, legacy token/URL keys in `authStorage.ts`, `/api/energy/*` aliases.
4. Auth, token and SSRF code is security-sensitive. Do not weaken checks, add `?token=` support, or forward the HA token to non-HA hosts.
5. Do not grow files over about 800 lines (`tests/fileSizeGuard.test.ts` enforces it: new files max 800, existing large files cannot grow past their baseline; lower the baseline when you split one). Extract pure logic into a tested module (the pattern used for the store, integrations and sensor classification splits) and leave the original as a thin composer.
6. New async views must use `ViewLoadingState`, `ViewEmptyState` and `ViewErrorState`.
7. New UI follows `.agents/rules/design_system.md`: frosted glass, no opaque cards, dark and light variants.
8. Prefer `unknown` over `any`. Do not add `@ts-ignore`.
9. Put business rules in `src/services` or `server/services`, not in components or route handlers, and add a unit test.
10. State with three or more related booleans becomes a discriminated union.
11. Record non-obvious decisions in `docs/DECISIONS.md`. Business rules live in `docs/DOMAIN_RULES.md`; UI rules in `docs/DESIGN_SYSTEM.md`.
