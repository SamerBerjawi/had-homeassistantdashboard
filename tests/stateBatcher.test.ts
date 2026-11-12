import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStateBatcher } from '../src/store/autoLayout/stateBatcher';

describe('createStateBatcher', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const setup = () => {
    const applied: Array<Record<string, number>> = [];
    const b = createStateBatcher<number>((m) => applied.push(Object.fromEntries(m)), 250, () => Date.now());
    return { applied, b };
  };

  it('applies an isolated event immediately', () => {
    const { applied, b } = setup();
    b.push('a', 1);
    expect(applied).toEqual([{ a: 1 }]);
  });

  it('coalesces a burst into the leading event plus one trailing batch, last write wins', () => {
    const { applied, b } = setup();
    b.push('a', 1);
    b.push('a', 2);
    b.push('b', 3);
    b.push('a', 4);
    expect(applied).toEqual([{ a: 1 }]);
    vi.advanceTimersByTime(250);
    expect(applied).toEqual([{ a: 1 }, { a: 4, b: 3 }]);
  });

  it('applies again immediately once the window has passed', () => {
    const { applied, b } = setup();
    b.push('a', 1);
    vi.advanceTimersByTime(300);
    b.push('a', 2);
    expect(applied).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it('flush applies pending now; clear drops it', () => {
    const { applied, b } = setup();
    b.push('a', 1);
    b.push('b', 2);
    b.flush();
    expect(applied).toEqual([{ a: 1 }, { b: 2 }]);
    b.push('c', 3);
    b.clear();
    vi.advanceTimersByTime(500);
    expect(applied).toHaveLength(2);
  });
});
