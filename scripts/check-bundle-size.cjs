/**
 * Fails the build when the client bundle grows past its budget. Sizes are Brotli-compressed
 * bytes (what the server actually sends, see compress-dist.cjs); images count at full size.
 *
 * Usage: node scripts/check-bundle-size.cjs [distDir]
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const distDir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'dist'));
const assetsDir = path.join(distDir, 'assets');
const KB = 1024;

const BUDGETS = {
  mainJs: 280 * KB, // entry chunk alone
  startupJs: 320 * KB, // entry plus every chunk it imports statically (278 KB measured after PERF-002, ~15% headroom)
  mainCss: 45 * KB,
  anyChunk: 200 * KB, // any single lazily loaded chunk
  precache: 2 * 1024 * KB, // everything the service worker downloads on install
};

const brotliSize = (file) =>
  fs.existsSync(`${file}.br`)
    ? fs.statSync(`${file}.br`).size
    : zlib.brotliCompressSync(fs.readFileSync(file)).length;
const fmt = (bytes) => `${(bytes / KB).toFixed(1)} KB`;

const failures = [];
const report = [];
const checkBudget = (label, size, budget) => {
  report.push(`${size > budget ? '✗' : '✓'} ${label}: ${fmt(size)} (budget ${fmt(budget)})`);
  if (size > budget) failures.push(label);
};

// The entry chunk is the one index.html loads as a module script
const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');
const entryJs = indexHtml.match(/<script[^>]+type="module"[^>]+src="\/?(assets\/[^"]+\.js)"/)?.[1];
const entryCss = indexHtml.match(/<link[^>]+rel="stylesheet"[^>]+href="\/?(assets\/[^"]+\.css)"/)?.[1];
if (!entryJs) {
  console.error('Could not find the entry script in dist/index.html');
  process.exit(1);
}
checkBudget(`main JS (${path.basename(entryJs)})`, brotliSize(path.join(distDir, entryJs)), BUDGETS.mainJs);
if (entryCss) {
  checkBudget(`main CSS (${path.basename(entryCss)})`, brotliSize(path.join(distDir, entryCss)), BUDGETS.mainCss);
}

// Everything reachable from the entry through static imports is on the critical path (PERF-001).
// Dynamic import("...") calls are lazy and not followed.
const staticImports = (file) => {
  const code = fs.readFileSync(file, 'utf-8');
  const found = new Set();
  for (const m of code.matchAll(/(?:^|[;}\s])(?:import|export)\s*(?:[^'"()]*?\bfrom\s*)?["'](\.\/[^"']+\.js)["']/g)) {
    found.add(m[1]);
  }
  return [...found];
};
const startupFiles = new Set([entryJs]);
const queue = [entryJs];
while (queue.length) {
  const current = queue.pop();
  for (const rel of staticImports(path.join(distDir, current))) {
    const resolved = path.posix.join(path.posix.dirname(current), rel);
    if (!startupFiles.has(resolved) && fs.existsSync(path.join(distDir, resolved))) {
      startupFiles.add(resolved);
      queue.push(resolved);
    }
  }
}
const startupSize = [...startupFiles].reduce((sum, f) => sum + brotliSize(path.join(distDir, f)), 0);
checkBudget(`startup JS (${startupFiles.size} chunks)`, startupSize, BUDGETS.startupJs);

let largest = { name: '', size: 0 };
for (const name of fs.readdirSync(assetsDir)) {
  if (!name.endsWith('.js') || `assets/${name}` === entryJs) continue;
  const size = brotliSize(path.join(assetsDir, name));
  if (size > largest.size) largest = { name, size };
}
checkBudget(`largest lazy chunk (${largest.name})`, largest.size, BUDGETS.anyChunk);

const swPath = path.join(distDir, 'sw.js');
if (fs.existsSync(swPath)) {
  const urls = [...fs.readFileSync(swPath, 'utf-8').matchAll(/url:"([^"]+)"/g)].map((m) => m[1]);
  const total = urls.reduce((sum, url) => {
    const file = path.join(distDir, url);
    if (!fs.existsSync(file)) return sum;
    return sum + (fs.existsSync(`${file}.br`) ? fs.statSync(`${file}.br`).size : fs.statSync(file).size);
  }, 0);
  checkBudget(`service worker precache (${urls.length} files)`, total, BUDGETS.precache);
}

console.log(report.join('\n'));
if (failures.length) {
  console.error(`\nBundle budget exceeded: ${failures.join(', ')}`);
  process.exit(1);
}
