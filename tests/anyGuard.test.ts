import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

// Ratchet for explicit `any` and TS suppression comments (docs/AI_RULES.md rule 8).
// Counts matching lines across src/, server/ and server.ts (tests/ excluded), the same way as
//   grep -rnE ":\s*any\b|\bas any\b|<any>|any\[\]|@ts-ignore|@ts-expect-error" src server server.ts
// The count may only go down. When you remove some, lower BASELINE_ANY to the new count.
// Never raise it: use `unknown` plus narrowing, generics or a real type instead.
const BASELINE_ANY = 55;

const PATTERN = /:\s*any\b|\bas any\b|<any>|any\[\]|@ts-ignore|@ts-expect-error/;
const ROOT = path.resolve(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

function countAny(): { total: number; perFile: Record<string, number> } {
  const files = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'server')), path.join(ROOT, 'server.ts')];
  const perFile: Record<string, number> = {};
  let total = 0;
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n');
    const hits = lines.filter((line) => PATTERN.test(line)).length;
    if (hits > 0) {
      perFile[path.relative(ROOT, file).split(path.sep).join('/')] = hits;
      total += hits;
    }
  }
  return { total, perFile };
}

describe('explicit any guard', () => {
  const { total, perFile } = countAny();

  it('does not add explicit any or ts suppression comments', () => {
    const top = Object.entries(perFile)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([file, n]) => `${file}: ${n}`)
      .join('\n');
    expect(total, `explicit any count ${total} exceeds BASELINE_ANY ${BASELINE_ANY}. Top files:\n${top}`).toBeLessThanOrEqual(BASELINE_ANY);
  });

  it('baseline is not stale', () => {
    expect(total, `explicit any count is ${total}, below BASELINE_ANY ${BASELINE_ANY}: lower BASELINE_ANY to ${total} in tests/anyGuard.test.ts`).toBe(BASELINE_ANY);
  });
});
