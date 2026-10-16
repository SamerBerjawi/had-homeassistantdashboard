import { describe, expect, it } from 'vitest';
import { SseParser } from '../src/lib/sseParser';

describe('SseParser (SEC-013)', () => {
  it('parses named events', () => {
    const p = new SseParser();
    expect(p.push('event: config_updated\ndata: {"serverVersion":4}\n\n')).toEqual([
      { event: 'config_updated', data: '{"serverVersion":4}' }
    ]);
  });
  it('handles chunk boundaries inside a message', () => {
    const p = new SseParser();
    expect(p.push('event: ping\nda')).toEqual([]);
    expect(p.push('ta: 1\n\nevent: config_updated\ndata: {}\n\n')).toEqual([
      { event: 'ping', data: '1' },
      { event: 'config_updated', data: '{}' }
    ]);
  });
  it('defaults to message, joins multi-line data, ignores comments and CRLF', () => {
    const p = new SseParser();
    expect(p.push(': keep-alive\r\n\r\ndata: a\r\ndata: b\r\n\r\n')).toEqual([{ event: 'message', data: 'a\nb' }]);
  });
});
