import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeEnergyDatabase, initEnergyDatabase, queryStatistics } from '../server/services/energyDbService';
import { EnergySyncService } from '../server/services/energySyncService';

let dataDir: string;

beforeAll(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'had-energy-test-'));
  initEnergyDatabase(dataDir);
});

afterAll(() => {
  closeEnergyDatabase();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

const HOUR = 60 * 60 * 1000;
const series = (count: number, startMs: number) =>
  Array.from({ length: count }, (_, i) => ({ start: startMs + i * HOUR, end: startMs + (i + 1) * HOUR, mean: i }));

describe('statistics ingestion', () => {
  it('stores large uploads completely when they are split into chunks', async () => {
    const start = Date.UTC(2026, 0, 1);
    // 12,345 rows: more than two 5,000-row chunks, with one sensor spanning a chunk boundary
    const statistics = {
      'sensor.a': series(7000, start),
      'sensor.b': series(4000, start),
      'sensor.c': series(1345, start)
    };

    const result = await EnergySyncService.ingestBatch({ statistics, periodType: 'hour' });
    expect(result).toMatchObject({ success: true, insertedCount: 12345, entitiesUpdated: 3 });

    const stored = queryStatistics(['sensor.a', 'sensor.b', 'sensor.c'], start, start + 8000 * HOUR, 'hour');
    expect(stored['sensor.a']).toHaveLength(7000);
    expect(stored['sensor.b']).toHaveLength(4000);
    expect(stored['sensor.c']).toHaveLength(1345);
    expect(stored['sensor.a'][6999].mean).toBe(6999);
  });

  it('is idempotent when the same rows are sent again', async () => {
    const start = Date.UTC(2026, 5, 1);
    const statistics = { 'sensor.repeat': series(10, start) };
    await EnergySyncService.ingestBatch({ statistics, periodType: 'hour' });
    await EnergySyncService.ingestBatch({ statistics, periodType: 'hour' });
    expect(queryStatistics(['sensor.repeat'], start, start + 20 * HOUR, 'hour')['sensor.repeat']).toHaveLength(10);
  });
});
