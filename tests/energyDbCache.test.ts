import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let dir = '';
let svc: typeof import('../server/services/energyDbService');

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'had-energy-'));
  svc = await import('../server/services/energyDbService');
  svc.initEnergyDatabase(dir);
});

afterAll(() => {
  svc.closeEnergyDatabase();
  fs.rmSync(dir, { recursive: true, force: true });
});

const entry = (start: number) => ({ start, end: start + 3600_000, change: 1, sum: start, mean: null, min: null, max: null, state: null });

describe('energy DB status/entities cache (PERF-004)', () => {
  it('returns the cached object until a write invalidates it', () => {
    svc.upsertStatisticsBatch({ 'sensor.a': [entry(1_700_000_000_000)] }, 'hour');
    const first = svc.getEnergyDbStatus();
    expect(first.totalRecords).toBe(1);
    expect(svc.getEnergyDbStatus()).toBe(first);

    svc.upsertStatisticsBatch({ 'sensor.a': [entry(1_700_003_600_000)], 'sensor.b': [entry(1_700_000_000_000)] }, 'hour');
    const second = svc.getEnergyDbStatus();
    expect(second).not.toBe(first);
    expect(second.totalRecords).toBe(3);
    expect(second.distinctEntities).toBe(2);
  });

  it('refreshes the entity list after writes', () => {
    const before = svc.getStoredEntities();
    expect(svc.getStoredEntities()).toBe(before);
    svc.upsertStatisticsBatch({ 'sensor.c': [entry(1_700_000_000_000)] }, 'hour');
    const after = svc.getStoredEntities();
    expect(after.map((e) => e.statisticId)).toContain('sensor.c');
  });
});

describe('index cleanup (PERF-006)', () => {
  it('does not create the unused idx_energy_range index', () => {
    const rows = svc.getDatabase().prepare("SELECT name FROM sqlite_master WHERE type='index'").all() as Array<{ name: string }>;
    expect(rows.map((r) => r.name)).not.toContain('idx_energy_range');
    expect(rows.map((r) => r.name)).toContain('idx_energy_query');
  });
});
