/**
 * Runs the end-to-end suites in scripts/test-*.ts one at a time (several start a server on a
 * fixed port, so they can't run in parallel) and fails if any of them fails.
 *
 * Usage: node scripts/run-integration-tests.cjs [name-filter]
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const filter = process.argv[2] || '';
const scriptsDir = __dirname;
const suites = fs
  .readdirSync(scriptsDir)
  .filter((name) => /^test-.*\.ts$/.test(name) && name.includes(filter))
  .sort();

const failed = [];
for (const suite of suites) {
  const started = Date.now();
  console.log(`\n▶ ${suite}`);
  const result = spawnSync('npx', ['tsx', path.join(scriptsDir, suite)], {
    stdio: 'inherit',
    timeout: 5 * 60 * 1000,
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (result.status === 0) {
    console.log(`✓ ${suite} (${seconds}s)`);
  } else {
    console.log(`✗ ${suite} (${seconds}s, exit ${result.status ?? result.signal})`);
    failed.push(suite);
  }
}

console.log(`\n${suites.length - failed.length}/${suites.length} integration suites passed`);
if (failed.length) {
  console.error(`Failed: ${failed.join(', ')}`);
  process.exit(1);
}
