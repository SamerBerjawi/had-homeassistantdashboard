import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushAsync } from './helpers/fakeHomeAssistantSocket';

// --- Browser stand-ins ---------------------------------------------------------------------

class FakePeerConnection extends EventTarget {
  static instances: FakePeerConnection[] = [];
  iceGatheringState: RTCIceGatheringState = 'gathering';
  iceConnectionState: RTCIceConnectionState = 'new';
  connectionState: RTCPeerConnectionState = 'new';
  localDescription: { sdp: string } | null = null;
  closed = false;
  ontrack: ((event: any) => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;

  constructor() {
    super();
    FakePeerConnection.instances.push(this);
  }
  addTransceiver() {}
  async createOffer() {
    return { type: 'offer', sdp: 'offer-sdp' };
  }
  async setLocalDescription(desc: { sdp: string }) {
    this.localDescription = desc;
    // A host candidate shows up quickly; STUN candidates would take much longer
    setTimeout(() => {
      const event = new Event('icecandidate') as any;
      event.candidate = { candidate: 'host' };
      this.dispatchEvent(event);
    }, 10);
  }
  async setRemoteDescription() {}
  close() {
    this.closed = true;
  }
  deliverMedia() {
    this.connectionState = 'connected';
    this.ontrack?.({ streams: [{ id: 'media' }] });
  }
}

let visibility: DocumentVisibilityState = 'visible';
let documentEvents = new EventTarget();
const storage = new Map<string, string>();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
  FakePeerConnection.instances = [];
  visibility = 'visible';
  documentEvents = new EventTarget(); // fresh per test: each test imports its own manager
  storage.clear();
  (globalThis as any).RTCPeerConnection = FakePeerConnection;
  (globalThis as any).RTCSessionDescription = class {
    constructor(init: unknown) {
      Object.assign(this, init);
    }
  };
  (globalThis as any).localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key)
  };
  (globalThis as any).document = {
    get visibilityState() {
      return visibility;
    },
    addEventListener: documentEvents.addEventListener.bind(documentEvents),
    createElement: () => ({ muted: false, playsInline: false, autoplay: false, play: () => Promise.resolve() })
  };
  (globalThis as any).window = { addEventListener: () => {} };
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ sdp: 'answer-sdp' }), { status: 200 })));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function loadManager() {
  vi.resetModules();
  // hls.js without MSE support: the manager falls back to native HLS playback
  vi.doMock('../src/lib/loadHls', () => ({ loadHls: async () => ({ isSupported: () => false }) }));
  const { cameraStreamManager } = await import('../src/services/cameraStreamManager');
  return cameraStreamManager;
}

function subscribe(manager: Awaited<ReturnType<typeof loadManager>>) {
  const states: any[] = [];
  const unsubscribe = manager.subscribe('front_door', { rtspUrl: 'rtsp://cam/front', preferProtocol: 'auto' }, (s) => states.push(s));
  return { states, latest: () => states[states.length - 1], unsubscribe };
}

const setVisibility = (state: DocumentVisibilityState) => {
  visibility = state;
  documentEvents.dispatchEvent(new Event('visibilitychange'));
};

describe('cameraStreamManager', () => {
  it('sends the WebRTC offer shortly after the first ICE candidate instead of waiting for STUN', async () => {
    const manager = await loadManager();
    subscribe(manager);
    await vi.advanceTimersByTimeAsync(200);
    expect(fetch).toHaveBeenCalledWith('/api/cameras/front_door/webrtc', expect.objectContaining({ method: 'POST' }));
  });

  it('falls back to HLS and remembers when WebRTC media never arrives', async () => {
    const manager = await loadManager();
    const { latest } = subscribe(manager);
    await vi.advanceTimersByTimeAsync(200 + 4500);
    await flushAsync();
    expect(latest()).toMatchObject({ status: 'streaming', streamType: 'hls' });
    expect(Number(storage.get('had_webrtc_unreachable_until'))).toBeGreaterThan(Date.now());

    // The next camera skips WebRTC entirely
    (fetch as any).mockClear();
    const second = manager.subscribe('garage', { rtspUrl: 'rtsp://cam/garage', preferProtocol: 'auto' }, () => {});
    await flushAsync();
    expect(fetch).not.toHaveBeenCalledWith('/api/cameras/garage/webrtc', expect.anything());
    second();
  });

  it('does not mark WebRTC unreachable when a working connection drops', async () => {
    const manager = await loadManager();
    subscribe(manager);
    await vi.advanceTimersByTimeAsync(200);
    const pc = FakePeerConnection.instances[0];
    pc.deliverMedia();
    pc.iceConnectionState = 'disconnected';
    pc.oniceconnectionstatechange?.();
    expect(storage.has('had_webrtc_unreachable_until')).toBe(false);
  });

  it('pauses streams while the page is hidden and resumes when visible', async () => {
    const manager = await loadManager();
    const { latest } = subscribe(manager);
    await vi.advanceTimersByTimeAsync(200);
    FakePeerConnection.instances[0].deliverMedia();
    expect(latest()).toMatchObject({ status: 'streaming', streamType: 'webrtc' });

    setVisibility('hidden');
    await vi.advanceTimersByTimeAsync(15000);
    expect(FakePeerConnection.instances[0].closed).toBe(true);
    expect(latest()).toMatchObject({ status: 'idle', streamType: 'snapshot' });

    setVisibility('visible');
    await vi.advanceTimersByTimeAsync(200);
    expect(FakePeerConnection.instances).toHaveLength(2);
    expect(latest().status).toBe('connecting');
  });

  it('keeps streaming through a brief hide', async () => {
    const manager = await loadManager();
    const { latest } = subscribe(manager);
    await vi.advanceTimersByTimeAsync(200);
    FakePeerConnection.instances[0].deliverMedia();
    setVisibility('hidden');
    await vi.advanceTimersByTimeAsync(5000);
    setVisibility('visible');
    await vi.advanceTimersByTimeAsync(20000);
    expect(FakePeerConnection.instances[0].closed).toBe(false);
    expect(latest().status).toBe('streaming');
  });
});
