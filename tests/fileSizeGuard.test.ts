import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

// Keeps files small enough for humans and AI agents to edit safely (docs/AUDIT.md, AX).
// New files must stay under MAX_LINES. Existing large files may not grow past their baseline;
// when you split one, lower or delete its entry. Never raise a baseline: split the file instead.
const MAX_LINES = 800;
const BASELINE: Record<string, number> = {
  'src/data/mockRegistries.ts': 4026,
  'src/components/energy/PowerSourcesChart.tsx': 1453,
  'src/components/overview/useOverviewHeaderState.ts': 1347,
  'src/services/energyDataTransformer.ts': 1215,
  'src/hooks/useMobilityData.ts': 1196,
  'src/services/notificationsService.ts': 1187,
  'src/services/haWebSocket.ts': 1159,
  'src/components/modals/entity-controls/LightControlView.tsx': 1038,
  'src/components/views/system/ugreen/NasOverviewSection.tsx': 1037,
  'src/App.tsx': 1010,
  'src/services/configStorageService.ts': 995,
  'src/components/SettingsView.tsx': 942,
  'src/components/views/mobility/BikeTab.tsx': 931,
  'src/components/settings/deviceVisibility/useDeviceVisibilityState.tsx': 906,
  'src/hooks/useNetworkData.ts': 861,
  'src/components/modals/entity-controls/SensorHistoryView.tsx': 850,
  'src/components/overview/EnergySparklineCharts.tsx': 840,
  'src/components/views/mobility/CarEvTab.tsx': 816,
  'src/components/energy/EnergyDistributionCard.tsx': 809,
};

const ROOT = path.resolve(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

function lineCount(file: string): number {
  const text = readFileSync(file, 'utf8');
  return text === '' ? 0 : text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
}

describe('file size guard', () => {
  const files = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'server')), path.join(ROOT, 'server.ts')];

  it('no new file exceeds the limit and no baselined file grows', () => {
    const problems: string[] = [];
    for (const file of files) {
      const rel = path.relative(ROOT, file).split(path.sep).join('/');
      const lines = lineCount(file);
      const allowed = BASELINE[rel] ?? MAX_LINES;
      if (lines > allowed) problems.push(`${rel}: ${lines} lines (limit ${allowed})`);
    }
    expect(problems).toEqual([]);
  });

  it('baseline has no stale entries', () => {
    const stale = Object.keys(BASELINE).filter((rel) => {
      const full = path.join(ROOT, rel);
      try {
        return lineCount(full) <= MAX_LINES;
      } catch {
        return true;
      }
    });
    expect(stale).toEqual([]);
  });
});
