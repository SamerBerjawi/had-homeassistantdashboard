/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HAArea, HADevice, HAEntityRegistryEntry, HAFloor, HAState } from '../types';
import { MOCK_AREAS, MOCK_DEVICES, MOCK_ENTITY_REGISTRY, MOCK_FLOORS, MOCK_STATES } from '../data/mockRegistries';

export type HAConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'auth_failed' | 'error';

export interface HAWebSocketCallbacks {
  onStatusChange: (status: HAConnectionStatus, errorMsg?: string) => void;
  onRegistriesLoaded: (payload: {
    areas: HAArea[];
    devices: HADevice[];
    entityRegistry: HAEntityRegistryEntry[];
    floors: HAFloor[];
    states: Record<string, HAState>;
  }) => void;
  onStateChanged: (entityId: string, newState: HAState) => void;
  onLogMessage: (type: 'info' | 'service_call' | 'state_changed' | 'warning' | 'error', msg: string, details?: any) => void;
}

class HAWebSocketClient {
  private socket: WebSocket | null = null;
  private messageId = 1;
  private pendingRequests = new Map<number, { resolve: (res: any) => void; reject: (err: any) => void }>();
  private callbacks: HAWebSocketCallbacks | null = null;
  private status: HAConnectionStatus = 'disconnected';
  private currentUrl = '';
  private currentToken = '';
  private isDemoMode = true;
  private reconnectTimer: any = null;

  public init(callbacks: HAWebSocketCallbacks) {
    this.callbacks = callbacks;
  }

  public setDemoMode(demo: boolean) {
    this.isDemoMode = demo;
    if (demo) {
      this.disconnect();
      this.loadDemoRegistries();
    }
  }

  public getStatus(): HAConnectionStatus {
    return this.status;
  }

  public isDemo(): boolean {
    return this.isDemoMode;
  }

  public loadDemoRegistries() {
    this.status = 'connected';
    this.callbacks?.onStatusChange('connected');
    this.callbacks?.onLogMessage('info', 'Loaded Home Assistant Registries from Auto-Layout Graph Ingestion Engine (Demo/Simulated Mode)');
    this.callbacks?.onRegistriesLoaded({
      areas: [...MOCK_AREAS],
      devices: [...MOCK_DEVICES],
      entityRegistry: [...MOCK_ENTITY_REGISTRY],
      floors: [...MOCK_FLOORS],
      states: { ...MOCK_STATES }
    });
  }

  public connect(url: string, token: string) {
    if (this.isDemoMode) {
      this.loadDemoRegistries();
      return;
    }

    this.currentUrl = url;
    this.currentToken = token;
    this.disconnect();

    this.status = 'connecting';
    this.callbacks?.onStatusChange('connecting');
    this.callbacks?.onLogMessage('info', `Connecting to WebSocket: ${url}`);

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.callbacks?.onLogMessage('info', 'WebSocket TCP connection opened. Awaiting auth challenge...');
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingMessage(data);
        } catch (e: any) {
          this.callbacks?.onLogMessage('error', `Failed to parse WS frame: ${e.message}`);
        }
      };

      this.socket.onerror = (err) => {
        this.status = 'error';
        this.callbacks?.onStatusChange('error', 'WebSocket connection error');
        this.callbacks?.onLogMessage('error', 'WebSocket connection error occurred', err);
      };

      this.socket.onclose = () => {
        if (this.status !== 'disconnected') {
          this.status = 'disconnected';
          this.callbacks?.onStatusChange('disconnected');
          this.callbacks?.onLogMessage('warning', 'WebSocket connection closed');
        }
      };
    } catch (err: any) {
      this.status = 'error';
      this.callbacks?.onStatusChange('error', err.message);
      this.callbacks?.onLogMessage('error', `Failed to initialize WebSocket: ${err.message}`);
    }
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.status = 'disconnected';
    this.callbacks?.onStatusChange('disconnected');
  }

  private handleIncomingMessage(msg: any) {
    if (msg.type === 'auth_required') {
      this.callbacks?.onLogMessage('info', 'Received auth_required challenge. Sending bearer token...');
      this.socket?.send(JSON.stringify({
        type: 'auth',
        access_token: this.currentToken
      }));
      return;
    }

    if (msg.type === 'auth_ok') {
      this.status = 'connected';
      this.callbacks?.onStatusChange('connected');
      this.callbacks?.onLogMessage('info', `Authentication successful! Home Assistant version: ${msg.ha_version || '2026.x'}`);
      this.fetchAllRegistries();
      return;
    }

    if (msg.type === 'auth_invalid') {
      this.status = 'auth_failed';
      this.callbacks?.onStatusChange('auth_failed', msg.message || 'Invalid Access Token');
      this.callbacks?.onLogMessage('error', `Authentication failed: ${msg.message}`);
      return;
    }

    if (msg.type === 'result') {
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        this.pendingRequests.delete(msg.id);
        if (msg.success) {
          pending.resolve(msg.result);
        } else {
          pending.reject(msg.error);
        }
      }
      return;
    }

    if (msg.type === 'event' && msg.event?.event_type === 'state_changed') {
      const { entity_id, new_state } = msg.event.data;
      if (entity_id && new_state) {
        this.callbacks?.onStateChanged(entity_id, new_state);
        this.callbacks?.onLogMessage('state_changed', `State updated: ${entity_id} -> ${new_state.state}`, new_state.attributes);
      }
    }
  }

  private async fetchAllRegistries() {
    try {
      this.callbacks?.onLogMessage('info', 'Querying Home Assistant Area, Device, Entity, Floor registries and live states...');
      
      const [areas, devices, entityRegistry, floors, statesList] = await Promise.all([
        this.sendRequest<HAArea[]>('config/area_registry/list').catch(() => []),
        this.sendRequest<HADevice[]>('config/device_registry/list').catch(() => []),
        this.sendRequest<HAEntityRegistryEntry[]>('config/entity_registry/list').catch(() => []),
        this.sendRequest<HAFloor[]>('config/floor_registry/list').catch(() => []),
        this.sendRequest<HAState[]>('get_states').catch(() => [])
      ]);

      const statesMap: Record<string, HAState> = {};
      for (const s of statesList) {
        statesMap[s.entity_id] = s;
      }

      this.callbacks?.onRegistriesLoaded({
        areas,
        devices,
        entityRegistry,
        floors,
        states: statesMap
      });

      // Subscribe to events
      this.sendRequest('subscribe_events', { event_type: 'state_changed' });
      this.callbacks?.onLogMessage('info', `Ingested ${areas.length} areas, ${devices.length} devices, ${entityRegistry.length} entity registry entries, and ${statesList.length} live states.`);
    } catch (e: any) {
      this.callbacks?.onLogMessage('error', `Failed to fetch HA registries: ${e.message}`);
    }
  }

  public sendRequest<T = any>(type: string, extra: Record<string, any> = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.isDemoMode) {
        // Handle mock responses in demo mode
        resolve(null as any);
        return;
      }

      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket is not connected'));
        return;
      }

      const id = this.messageId++;
      const payload = { id, type, ...extra };
      this.pendingRequests.set(id, { resolve, reject });
      this.socket.send(JSON.stringify(payload));
    });
  }

  public async callService(
    domain: string,
    service: string,
    serviceData: Record<string, any> = {},
    target: { entity_id?: string | string[]; area_id?: string | string[]; device_id?: string | string[] } = {}
  ): Promise<any> {
    this.callbacks?.onLogMessage('service_call', `call_service -> ${domain}.${service}`, { serviceData, target });

    if (this.isDemoMode) {
      // In demo mode, we simulate service call response immediately
      return Promise.resolve({ success: true });
    }

    return this.sendRequest('call_service', {
      domain,
      service,
      service_data: serviceData,
      target
    });
  }
}

export const haWebSocketService = new HAWebSocketClient();
