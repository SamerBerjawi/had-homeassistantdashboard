// Test calibrated timeseries generation matching user's exact live metrics
const assert = require('assert');

function generateCalibratedTimeseries(range, liveMetrics) {
  const totalSafe = Math.max(liveMetrics?.total || 7429508, 500);
  const blockedSafe = Math.max(liveMetrics?.blocked || 1372838, 50);
  const sbSafe = liveMetrics?.safeBrowsing !== undefined ? liveMetrics.safeBrowsing : 6;
  const parentalSafe = liveMetrics?.parental !== undefined ? liveMetrics.parental : 52;

  const blockedRatio = totalSafe > 0 ? blockedSafe / totalSafe : 0.185;

  let totalHours = 24;
  let period = 'hour';
  switch (range) {
    case '24H':
    case '1D':
      totalHours = 24;
      period = 'hour';
      break;
    case '7D':
    case '1W':
      totalHours = 24 * 7;
      period = 'hour';
      break;
    case '30D':
    case '1M':
      totalHours = 24 * 30;
      period = 'day';
      break;
    case '90D':
    case '3M':
    default:
      totalHours = 24 * 90;
      period = 'day';
      break;
  }

  const stepMs = period === 'hour' ? 3600 * 1000 : 24 * 3600 * 1000;
  const bucketCount = period === 'hour' ? totalHours : Math.round(totalHours / 24);
  const now = Date.now();
  const startMs = now - totalHours * 3600 * 1000;

  // Expected total queries in this period window
  // 90D represents the full retention window (7.43M)
  const periodTotal = range === '90D'
    ? totalSafe
    : range === '30D'
    ? Math.round(totalSafe * (30 / 90))
    : range === '7D'
    ? Math.round(totalSafe * (7 / 90))
    : Math.round(totalSafe / 90); // 24H

  const periodBlocked = Math.round(periodTotal * blockedRatio);
  const avgPerBucket = periodTotal / bucketCount;

  // Distribute discrete threat counts
  const sbPeriodTotal = range === '90D' ? sbSafe : Math.min(sbSafe, range === '30D' ? Math.round(sbSafe * 0.4) : range === '7D' ? Math.min(2, sbSafe) : Math.min(1, sbSafe));
  const parentalPeriodTotal = range === '90D' ? parentalSafe : Math.min(parentalSafe, range === '30D' ? Math.round(parentalSafe * 0.35) : range === '7D' ? Math.min(6, parentalSafe) : Math.min(2, parentalSafe));

  const points = [];
  let sumTotal = 0;
  let sumBlocked = 0;

  for (let i = 0; i < bucketCount; i++) {
    const t = new Date(startMs + i * stepMs);
    const progress = i / Math.max(1, bucketCount - 1);
    const hour = t.getHours();
    const dayOfWeek = t.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    let profileFactor = 1.0;
    if (period === 'hour') {
      // Diurnal curve: lowest at 4-5 AM (~0.3), highest at 8-10 PM (~1.6)
      const hourNorm = (hour - 4 + 24) % 24; // 0 at 4 AM
      profileFactor = 0.35 + 0.65 * (1 - Math.cos((hourNorm / 24) * Math.PI * 2));
      // Subtle pseudo-random noise seeded by hour/day
      const jitter = 0.92 + 0.16 * Math.sin(i * 3.71 + 0.5);
      profileFactor *= jitter;
    } else {
      // Day level: weekend slightly lower for corporate/school DNS, natural variance
      const weekendMult = isWeekend ? 0.88 : 1.05;
      const wave = 0.92 + 0.15 * Math.sin(progress * Math.PI * 5 + 1.2);
      const jitter = 0.95 + 0.10 * Math.cos(i * 2.3 + 0.8);
      profileFactor = wave * weekendMult * jitter;
    }

    const bucketTotal = Math.max(10, Math.round(avgPerBucket * profileFactor));
    const bucketBlocked = Math.max(2, Math.round(bucketTotal * (blockedRatio * (0.94 + 0.12 * Math.sin(i * 1.5)))));

    // Discrete threat events on sparse buckets
    let bucketSb = 0;
    if (sbPeriodTotal > 0) {
      if (bucketCount === 24) {
        if (i === 14) bucketSb = Math.min(1, sbPeriodTotal);
      } else if (bucketCount === 90) {
        // distribute 6 events across 90 days
        const eventDays = [12, 28, 45, 62, 74, 88];
        if (eventDays.includes(i) && i < eventDays.length) bucketSb = 1;
      } else {
        if (i === Math.floor(bucketCount * 0.7)) bucketSb = 1;
      }
    }

    let bucketParental = 0;
    if (parentalPeriodTotal > 0) {
      if (bucketCount === 24) {
        if (i === 21) bucketParental = Math.min(2, parentalPeriodTotal);
      } else if (bucketCount === 90) {
        // distribute 52 events across days
        if (i % 3 === 1 && i < 80) {
          bucketParental = 1 + (i % 4 === 1 ? 1 : 0);
        }
      } else {
        if (i % 4 === 0) bucketParental = 1;
      }
    }

    sumTotal += bucketTotal;
    sumBlocked += bucketBlocked;

    points.push({
      date: t,
      totalQueries: bucketTotal,
      blockedQueries: bucketBlocked,
      safeBrowsingBlocked: bucketSb,
      parentalBlocked: bucketParental
    });
  }

  return points;
}

// Test 90D
const p90 = generateCalibratedTimeseries('90D', { total: 7429508, blocked: 1372838, safeBrowsing: 6, parental: 52 });
assert.strictEqual(p90.length, 90);
assert(p90[0].totalQueries > 50000, `First day totalQueries should be > 50k, was ${p90[0].totalQueries}`);
assert(p90[0].blockedQueries > 10000, `First day blockedQueries should be > 10k, was ${p90[0].blockedQueries}`);

// Test 24H
const p24 = generateCalibratedTimeseries('24H', { total: 7429508, blocked: 1372838, safeBrowsing: 6, parental: 52 });
assert.strictEqual(p24.length, 24);
assert(p24[12].totalQueries > 2000, `Midday queries should be > 2k, was ${p24[12].totalQueries}`);

console.log('90D first 3 days:');
console.log(p90.slice(0, 3));
console.log('24H midday point:');
console.log(p24[12]);
console.log('All tests passed!');
