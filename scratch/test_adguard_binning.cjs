// Test AdGuard Home statistics canonical slot grid binning and alignment
const assert = require('assert');

function binSeries(records, stepMs) {
  const slotMap = new Map();
  if (!records || records.length === 0) return slotMap;

  const sorted = records
    .map(r => {
      const raw = r.start;
      const t = typeof raw === 'number' ? (raw > 1e11 ? raw : raw * 1000) : new Date(raw).getTime();
      return {
        time: t,
        change: typeof r.change === 'number' && !isNaN(r.change) ? Math.max(0, r.change) : null,
        sum: typeof r.sum === 'number' && !isNaN(r.sum) ? r.sum : null,
        state: typeof r.state === 'number' && !isNaN(r.state) ? r.state : null,
        mean: typeof r.mean === 'number' && !isNaN(r.mean) ? r.mean : null
      };
    })
    .filter(r => !isNaN(r.time))
    .sort((a, b) => a.time - b.time);

  const hasExplicitChange = sorted.some(r => r.change !== null && r.change > 0);

  if (hasExplicitChange) {
    for (const r of sorted) {
      const nearestSlot = Math.round(r.time / stepMs) * stepMs;
      const delta = r.change !== null ? r.change : 0;
      slotMap.set(nearestSlot, (slotMap.get(nearestSlot) || 0) + delta);
    }
  } else {
    let prevVal = null;
    for (const r of sorted) {
      const nearestSlot = Math.round(r.time / stepMs) * stepMs;
      const curr = r.sum !== null ? r.sum : (r.state !== null ? r.state : (r.mean !== null ? r.mean : 0));
      if (prevVal !== null) {
        let delta = curr - prevVal;
        if (delta < 0) delta = 0;
        slotMap.set(nearestSlot, (slotMap.get(nearestSlot) || 0) + delta);
      }
      prevVal = curr;
    }
  }

  // Gap filling
  const recordedSlots = Array.from(slotMap.keys()).sort((a, b) => a - b);
  let lastSlot = null;
  for (const s of recordedSlots) {
    const val = slotMap.get(s) || 0;
    if (lastSlot !== null) {
      const gap = Math.round((s - lastSlot) / stepMs);
      if (gap > 1 && gap <= 6 && val > 0) {
        const perSlot = val / gap;
        for (let fill = lastSlot + stepMs; fill <= s; fill += stepMs) {
          slotMap.set(fill, perSlot);
        }
      }
    }
    lastSlot = s;
  }

  return slotMap;
}

// 1. Test explicit change records with sub-second polling drift
const stepMs = 3600 * 1000;
const baseT = new Date('2026-09-15T12:00:00Z').getTime();

const totalRecords = [
  { start: baseT + 500, change: 1200 },
  { start: baseT + 3600000 + 1200, change: 1450 },
  { start: baseT + 7200000 + 800, change: 980 }
];

const blockedRecords = [
  { start: baseT + 1500, change: 240 },
  { start: baseT + 3600000 + 2200, change: 310 },
  { start: baseT + 7200000 + 1800, change: 190 }
];

const totalMap = binSeries(totalRecords, stepMs);
const blockedMap = binSeries(blockedRecords, stepMs);

assert.strictEqual(totalMap.get(baseT), 1200, 'Total for slot 0 must be 1200');
assert.strictEqual(totalMap.get(baseT + 3600000), 1450, 'Total for slot 1 must be 1450');
assert.strictEqual(blockedMap.get(baseT), 240, 'Blocked for slot 0 must be 240');
assert.strictEqual(blockedMap.get(baseT + 3600000), 310, 'Blocked for slot 1 must be 310');

// 2. Test accumulative counter delta calculation (sum/state)
const accumulativeRecords = [
  { start: baseT, sum: 10000 },
  { start: baseT + 3600000, sum: 11500 },
  { start: baseT + 7200000, sum: 12300 }
];
const accumMap = binSeries(accumulativeRecords, stepMs);
assert.strictEqual(accumMap.get(baseT + 3600000), 1500, 'Delta should be 11500 - 10000 = 1500');
assert.strictEqual(accumMap.get(baseT + 7200000), 800, 'Delta should be 12300 - 11500 = 800');

console.log('All AdGuard slot-binning and delta calculation tests passed!');
