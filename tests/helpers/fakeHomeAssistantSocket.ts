/**
 * Minimal stand-in for a Home Assistant WebSocket: answers auth, results and pings, and lets
 * tests push events. Install with installFakeSocket() before importing haWebSocket.
 */
export interface FakeSocketOptions {
  /** Reply to subscribe_entities (with this snapshot) or reject it as an older HA would */
  entitySnapshot?: Record<string, { s: string; a?: Record<string, unknown>; c?: string; lc: number; lu?: number }> | null;
  states?: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>;
}

export class FakeHomeAssistantSocket {
  static OPEN = 1;
  static instances: FakeHomeAssistantSocket[] = [];
  static options: FakeSocketOptions = {};

  readyState = 0;
  sent: any[] = [];
  closed = false;
  autoPong = true;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(public url: string) {
    FakeHomeAssistantSocket.instances.push(this);
  }

  open() {
    this.readyState = 1;
    this.onopen?.();
    this.receive({ type: 'auth_required' });
  }

  receive(msg: unknown) {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }

  send(raw: string) {
    const msg = JSON.parse(raw);
    this.sent.push(msg);
    const { entitySnapshot = null, states = [] } = FakeHomeAssistantSocket.options;

    if (msg.type === 'auth') return this.receive({ type: 'auth_ok', ha_version: '2026.10.0' });
    if (msg.type === 'ping') {
      if (this.autoPong) this.receive({ id: msg.id, type: 'pong' });
      return;
    }
    if (msg.type === 'subscribe_entities') {
      if (!entitySnapshot) {
        return this.receive({ id: msg.id, type: 'result', success: false, error: { code: 'unknown_command', message: 'Unknown command.' } });
      }
      this.receive({ id: msg.id, type: 'result', success: true, result: null });
      return this.receive({ id: msg.id, type: 'event', event: { a: entitySnapshot } });
    }
    if (msg.type === 'get_states') return this.receive({ id: msg.id, type: 'result', success: true, result: states });
    if (msg.type === 'never_answered') return;
    this.receive({ id: msg.id, type: 'result', success: true, result: String(msg.type).endsWith('/list') ? [] : null });
  }

  close() {
    this.closed = true;
    this.readyState = 3;
  }
}

export function installFakeSocket(options: FakeSocketOptions = {}) {
  FakeHomeAssistantSocket.instances = [];
  FakeHomeAssistantSocket.options = options;
  (globalThis as any).WebSocket = FakeHomeAssistantSocket;
}

export const latestSocket = () => FakeHomeAssistantSocket.instances[FakeHomeAssistantSocket.instances.length - 1];

/** Let queued promise callbacks run (works with fake timers, which don't fake setImmediate) */
export async function flushAsync(rounds = 5) {
  for (let i = 0; i < rounds; i++) await new Promise((resolve) => setImmediate(resolve));
}
