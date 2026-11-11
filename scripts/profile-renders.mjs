// Render-count profiler (dev server only: needs a development React build).
// Usage: PORT=3920 ALLOW_MOCK_TOKENS=true npx tsx server.ts &  then  node scripts/profile-renders.mjs
// Counts component renders per commit via a stubbed React DevTools hook, in demo mode.
// Use dev numbers for relative comparisons only: absolute timings are 2-3x worse than production.
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:3920';
const hook = () => {
  const counts = {}; let commits = 0;
  const nameOf = (f) => { const t = f.type; if (!t) return null; if (typeof t === 'function') return t.displayName || t.name || 'Anonymous'; if (t.displayName) return t.displayName; if (t.render) return t.render.displayName || t.render.name || 'ForwardRef'; if (t.type) return (t.type.displayName || t.type.name || 'Memo'); return null; };
  const walk = (f) => { while (f) { if ([0, 11, 14, 15].includes(f.tag) && (f.flags & 1)) { const n = nameOf(f); if (n) counts[n] = (counts[n] || 0) + 1; } if (f.child) walk(f.child); f = f.sibling; } };
  window.__prof = { counts, get commits() { return commits; }, reset() { for (const k in counts) delete counts[k]; commits = 0; } };
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { supportsFiber: true, renderers: new Map(), inject() { return 1; }, onScheduleFiberRoot() {}, onCommitFiberUnmount() {}, onPostCommitFiberRoot() {}, checkDCE() {}, onCommitFiberRoot(id, root) { commits++; walk(root.current); } };
};
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(hook);
await page.goto(BASE + '/');
await page.getByRole('button', { name: /Explore Demo Dashboard/i }).first().click();
await page.waitForTimeout(4000);
const snap = async (label, ms, action) => {
  await page.evaluate(() => window.__prof.reset());
  if (action) await action();
  await page.waitForTimeout(ms);
  const r = await page.evaluate(() => ({ commits: window.__prof.commits, counts: window.__prof.counts }));
  const top = Object.entries(r.counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log(`\n== ${label}: ${r.commits} commits, ${Object.values(r.counts).reduce((a, b) => a + b, 0)} component renders`);
  for (const [n, c] of top) console.log(`   ${String(c).padStart(5)}  ${n}`);
};
await snap('idle overview 10s', 10000);
await snap('toggle edit mode', 1500, () => page.getByTitle(/Enable Edit Mode/i).click());
await snap('idle in edit mode 5s', 5000);
await page.getByTitle(/Exit Edit Mode/i).click().catch(() => {});
await snap('navigate to rooms', 3000, () => page.goto(BASE + '/rooms').then(() => {}));
await browser.close();
