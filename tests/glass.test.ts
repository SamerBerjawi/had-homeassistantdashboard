import { describe, expect, it } from 'vitest';
import { glass } from '@/lib/glass';

const roles = Object.entries(glass);
const tokens = (value: string) => value.split(/\s+/).filter(Boolean);

describe('glass surface roles', () => {
  it.each(roles)('%s has a backdrop blur', (_role, value) => {
    expect(tokens(value).some((t) => /^backdrop-blur-/.test(t))).toBe(true);
  });

  it.each(roles)('%s has light and dark background and border variants', (_role, value) => {
    const list = tokens(value);
    expect(list.some((t) => t.startsWith('bg-'))).toBe(true);
    expect(list.some((t) => t.startsWith('dark:bg-'))).toBe(true);
    expect(list.some((t) => /^border-/.test(t))).toBe(true);
    expect(list.some((t) => t.startsWith('dark:border-'))).toBe(true);
  });

  it.each(roles)('%s has no repeated classes and no stray whitespace', (_role, value) => {
    const list = tokens(value);
    expect(new Set(list).size).toBe(list.length);
    expect(value).toBe(list.join(' '));
  });

  it('roles are distinct', () => {
    const values = roles.map(([, value]) => [...tokens(value)].sort().join(' '));
    expect(new Set(values).size).toBe(values.length);
  });
});
