import { describe, expect, it } from 'vitest';
import { errorCode, errorMessage, errorMessageField } from '@/lib/errors';

describe('errorMessage (client)', () => {
  it('reads Error, string, message-bearing objects and anything else', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage('plain')).toBe('plain');
    expect(errorMessage({ message: 'obj' })).toBe('obj');
    expect(errorMessage({ message: 7 })).toBe('7');
    expect(errorMessage(42)).toBe('42');
    expect(errorMessage(undefined)).toBe('undefined');
    expect(errorMessage(null)).toBe('null');
  });
});

describe('errorCode (client)', () => {
  it('prefers the error code and falls back to the cause', () => {
    expect(errorCode({ code: 'ECONNRESET' })).toBe('ECONNRESET');
    expect(errorCode({ cause: { code: 'EPRIVATEADDR' } })).toBe('EPRIVATEADDR');
    expect(errorCode(Object.assign(new Error('x'), { cause: { code: 'UND_ERR_SOCKET' } }))).toBe('UND_ERR_SOCKET');
  });
  it('is undefined when there is no string code', () => {
    expect(errorCode(null)).toBeUndefined();
    expect(errorCode(undefined)).toBeUndefined();
    expect(errorCode(new Error('x'))).toBeUndefined();
    expect(errorCode({ code: 5 })).toBeUndefined();
  });
});

describe('errorMessageField', () => {
  it('behaves like err?.message for string messages', () => {
    expect(errorMessageField(new Error('boom'))).toBe('boom');
    expect(errorMessageField(new Error(''))).toBe('');
    expect(errorMessageField({ message: 'obj' })).toBe('obj');
  });
  it('is undefined for strings, nullish values and objects without a string message', () => {
    expect(errorMessageField('plain')).toBeUndefined();
    expect(errorMessageField(null)).toBeUndefined();
    expect(errorMessageField(undefined)).toBeUndefined();
    expect(errorMessageField(42)).toBeUndefined();
    expect(errorMessageField({})).toBeUndefined();
    expect(errorMessageField({ message: 7 })).toBeUndefined();
  });
});
