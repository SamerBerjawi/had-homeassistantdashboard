/**
 * Writes Brotli (.br) and gzip (.gz) copies of the built client assets so the server can send
 * them precompressed. Brotli at maximum quality is far too slow to run per request, but the
 * output is ~20% smaller than gzip and is computed once here.
 *
 * Usage: node scripts/compress-dist.cjs [distDir]
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const distDir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'dist'));
const COMPRESSIBLE = /\.(js|css|html|svg|json|webmanifest|txt|xml|ico)$/i;
const MIN_BYTES = 1024;
const SKIP = new Set(['server.cjs']);

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

let files = 0;
let rawBytes = 0;
let brBytes = 0;
let gzBytes = 0;
for (const file of walk(distDir)) {
  if (!COMPRESSIBLE.test(file) || SKIP.has(path.basename(file))) continue;
  const data = fs.readFileSync(file);
  if (data.length < MIN_BYTES) continue;

  const br = zlib.brotliCompressSync(data, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: data.length,
    },
  });
  const gz = zlib.gzipSync(data, { level: zlib.constants.Z_BEST_COMPRESSION });
  fs.writeFileSync(`${file}.br`, br);
  fs.writeFileSync(`${file}.gz`, gz);

  files++;
  rawBytes += data.length;
  brBytes += br.length;
  gzBytes += gz.length;
}

const mb = (n) => (n / 1024 / 1024).toFixed(2);
console.log(
  `Precompressed ${files} files: ${mb(rawBytes)} MB raw -> ${mb(brBytes)} MB brotli / ${mb(gzBytes)} MB gzip`
);
