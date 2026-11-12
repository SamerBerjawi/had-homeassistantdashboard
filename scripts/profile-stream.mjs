// Render-count profiler under a simulated live entity stream (dev server, demo mode).
// Usage: PORT=3920 ALLOW_MOCK_TOKENS=true npx tsx server.ts &  then  RATE=10 node scripts/profile-stream.mjs
// Feeds RATE state_changed events/second through the same callback the HA WebSocket uses
// (haWebSocketService.callbacks.onStateChanged) for existing demo sensors, for SECONDS seconds,
// and reports commits and component renders per page. Dev numbers are for relative comparison.
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://localhost:3920';
const RATE = Number(process.env.RATE || 10);
const SECONDS = Number(process.env.SECONDS || 15);
const PAGES = (process.env.PAGES || '/,/energy,/rooms,/mobility').split(',');
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
const startStream = (rate) => page.evaluate(async (rate) => {
  const { haWebSocketService } = await import('/src/services/haWebSocket.ts');
  const { useAutoLayoutStore } = await import('/src/store/useAutoLayoutStore.ts');
  const ids = Object.keys(useAutoLayoutStore.getState().states).filter((id) => id.startsWith('sensor.'));
  window.__sent = 0;
  window.__streamTimer = setInterval(() => {
    const id = ids[Math.floor(Math.random() * ids.length)];
    const cur = useAutoLayoutStore.getState().states[id];
    const n = parseFloat(cur.state);
    const next = { ...cur, state: Number.isFinite(n) ? String(+(n + (Math.random() - 0.5)).toFixed(2)) : cur.state, last_changed: new Date().toISOString(), last_updated: new Date().toISOString() };
    haWebSocketService.callbacks.onStateChanged(id, next);
    window.__sent++;
  }, 1000 / rate);
  return ids.length;
}, rate);
const stopStream = () => page.evaluate(() => { clearInterval(window.__streamTimer); return window.__sent; });
for (const path of PAGES) {
  await page.goto(BASE + path).catch(() => {});
  await page.waitForTimeout(3500);
  if (path !== PAGES[0]) { const b = page.getByRole('button', { name: /Explore Demo Dashboard/i }).first(); if (await b.count()) { await b.click(); await page.waitForTimeout(3000); } }
  await page.evaluate(() => window.__prof.reset());
  await page.waitForTimeout(5000);
  const idle = await page.evaluate(() => ({ c: window.__prof.commits, r: Object.values(window.__prof.counts).reduce((a, b) => a + b, 0) }));
  await page.evaluate(() => window.__prof.reset());
  const sensors = await startStream(RATE);
  await page.waitForTimeout(SECONDS * 1000);
  const sent = await stopStream();
  const r = await page.evaluate(() => ({ commits: window.__prof.commits, counts: window.__prof.counts }));
  const total = Object.values(r.counts).reduce((a, b) => a + b, 0);
  console.log(`\n== ${path}: idle(5s) ${idle.c} commits/${idle.r} renders | stream ${RATE}/s x ${SECONDS}s (${sent} events, ${sensors} sensors): ${r.commits} commits, ${total} renders (${(total / sent).toFixed(1)} renders/event)`);
  for (const [n, c] of Object.entries(r.counts).sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`   ${String(c).padStart(6)}  ${n}`);
}
await browser.close();
