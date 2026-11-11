import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

// Token storage must stay inside src/services/authStorage.ts (SEC audit C5): no other file may
// touch the legacy `ha_token` / `had_ha_auth_tokens` localStorage keys directly.
const ROOT = path.resolve(__dirname, '../src');
const ALLOWED = new Set([path.join(ROOT, 'services/authStorage.ts')]);
const FORBIDDEN = [/['"`]ha_token['"`]/, /['"`]had_ha_auth_tokens['"`]/];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

describe('auth token storage boundary', () => {
  it('no source file outside authStorage.ts reads or writes legacy token keys', () => {
    const offenders = walk(ROOT)
      .filter((f) => !ALLOWED.has(f))
      .filter((f) => {
        const src = readFileSync(f, 'utf8');
        return FORBIDDEN.some((re) => re.test(src));
      })
      .map((f) => path.relative(ROOT, f));
    expect(offenders).toEqual([]);
  });
});
