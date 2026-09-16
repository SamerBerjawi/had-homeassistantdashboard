/**
 * Test script for Year-over-Year comparison range calculation and bucket alignment
 */

const assert = require('assert');

// 1. Day shift test
function getDayShift(targetDate, yearDelta) {
  const compDate = new Date(targetDate);
  compDate.setFullYear(compDate.getFullYear() + yearDelta);
  const start = new Date(compDate.getFullYear(), compDate.getMonth(), compDate.getDate(), 0, 0, 0, 0);
  const end = new Date(compDate.getFullYear(), compDate.getMonth(), compDate.getDate(), 23, 59, 59, 999);
  return { start, end };
}

const curDay = new Date('2026-09-16T12:00:00');
const prevDay = getDayShift(curDay, -1);
assert.strictEqual(prevDay.start.getFullYear(), 2025);
assert.strictEqual(prevDay.start.getMonth(), 8); // Sep (0-indexed)
assert.strictEqual(prevDay.start.getDate(), 16);
console.log('✔ Day shift correctly targets 2025-09-16');

// 2. Week shift test (52 weeks / 364 days to align Monday to Monday)
function getWeekShift(curMonday, yearDelta) {
  const weeksShift = 52 * Math.abs(yearDelta) * (yearDelta < 0 ? -1 : 1);
  const start = new Date(curMonday.getTime() + weeksShift * 7 * 24 * 3600 * 1000);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 6 * 24 * 3600 * 1000 + (23 * 3600 + 59 * 60 + 59) * 1000 + 999);
  return { start, end };
}

const curWeekMonday = new Date('2026-08-31T00:00:00'); // Monday
assert.strictEqual(curWeekMonday.getDay(), 1); // 1 = Monday
const compWeek = getWeekShift(curWeekMonday, -1);
assert.strictEqual(compWeek.start.getDay(), 1); // Must still be Monday!
assert.strictEqual(compWeek.start.getFullYear(), 2025);
assert.strictEqual(compWeek.start.getMonth(), 8); // Sep 1, 2025
assert.strictEqual(compWeek.start.getDate(), 1);
console.log('✔ Week shift aligns Monday-to-Monday across 52 weeks (2026-08-31 Mon -> 2025-09-01 Mon)');

// 3. Month shift test
function getMonthShift(targetDate, yearDelta) {
  const compDate = new Date(targetDate);
  compDate.setFullYear(compDate.getFullYear() + yearDelta);
  const start = new Date(compDate.getFullYear(), compDate.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(compDate.getFullYear(), compDate.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

const compMonth = getMonthShift(new Date('2026-09-16'), -1);
assert.strictEqual(compMonth.start.getFullYear(), 2025);
assert.strictEqual(compMonth.start.getMonth(), 8);
assert.strictEqual(compMonth.start.getDate(), 1);
assert.strictEqual(compMonth.end.getDate(), 30); // 30 days in September
console.log('✔ Month shift correctly spans September 1 to 30, 2025');

// 4. Multi-year comparison availability
function getAvailableYears(currentYear) {
  const years = [];
  for (let y = currentYear - 1; y >= currentYear - 5; y--) {
    years.push(y);
  }
  return years;
}

const avail2026 = getAvailableYears(2026);
assert.deepStrictEqual(avail2026, [2025, 2024, 2023, 2022, 2021]);
console.log('✔ Available comparison years for 2026:', avail2026.join(', '));

// 5. Delta percentage calculation
function calcDelta(curr, prev) {
  if (!prev || prev === 0) {
    return curr > 0 ? 100 : 0;
  }
  return ((curr - prev) / prev) * 100;
}

assert.strictEqual(Math.round(calcDelta(24.5, 21.0)), 17);
assert.strictEqual(Math.round(calcDelta(14.2, 15.8)), -10);
assert.strictEqual(calcDelta(0, 0), 0);
assert.strictEqual(calcDelta(5, 0), 100);
console.log('✔ Delta calculations produce expected percentages');

console.log('All Energy Comparison tests passed successfully!');
