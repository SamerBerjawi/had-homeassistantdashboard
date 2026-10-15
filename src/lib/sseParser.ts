/**
 * Minimal Server-Sent Events parser for fetch() streams, so the config stream can authenticate
 * with an Authorization header instead of a query-string token (SEC-013).
 */
export interface SseMessage {
  event: string;
  data: string;
}

export class SseParser {
  private buffer = '';

  /** Feed decoded text; returns the complete messages it finished. */
  push(chunk: string): SseMessage[] {
    this.buffer += chunk.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const messages: SseMessage[] = [];
    let boundary = this.buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const raw = this.buffer.slice(0, boundary);
      this.buffer = this.buffer.slice(boundary + 2);
      const message = SseParser.parseBlock(raw);
      if (message) messages.push(message);
      boundary = this.buffer.indexOf('\n\n');
    }
    return messages;
  }

  private static parseBlock(block: string): SseMessage | null {
    let event = 'message';
    const data: string[] = [];
    let hasField = false;
    for (const line of block.split('\n')) {
      if (!line || line.startsWith(':')) continue; // comment / keep-alive
      const colon = line.indexOf(':');
      const field = colon === -1 ? line : line.slice(0, colon);
      let value = colon === -1 ? '' : line.slice(colon + 1);
      if (value.startsWith(' ')) value = value.slice(1);
      if (field === 'event') {
        event = value;
        hasField = true;
      } else if (field === 'data') {
        data.push(value);
        hasField = true;
      }
    }
    return hasField ? { event, data: data.join('\n') } : null;
  }
}
