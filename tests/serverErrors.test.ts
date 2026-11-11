import { describe, expect, it } from 'vitest';
import { errorCode, errorMessage } from '../server/lib/errors';

describe('errorMessage', () => {
  it('reads Error, string, message-bearing objects and anything else', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage('plain')).toBe('plain');
    expect(errorMessage({ message: 'obj' })).toBe('obj');
    expect(errorMessage(42)).toBe('42');
    expect(errorMessage(undefined)).toBe('undefined');
  });
});

describe('errorCode', () => {
  it('prefers the error code and falls back to the cause (undici wraps network errors)', () => {
    expect(errorCode({ code: 'ECONNRESET' })).toBe('ECONNRESET');
    expect(errorCode({ cause: { code: 'EPRIVATEADDR' } })).toBe('EPRIVATEADDR');
    expect(errorCode(Object.assign(new Error('x'), { cause: { code: 'UND_ERR_SOCKET' } }))).toBe('UND_ERR_SOCKET');
  });
  it('is undefined when there is no string code', () => {
    expect(errorCode(null)).toBeUndefined();
    expect(errorCode(new Error('x'))).toBeUndefined();
    expect(errorCode({ code: 5 })).toBeUndefined();
  });
});
