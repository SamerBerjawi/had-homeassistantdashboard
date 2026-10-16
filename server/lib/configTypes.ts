/**
 * Shapes of the persisted dashboard config that the server itself reads or rewrites. Everything
 * else is opaque JSON that is validated structurally (see security.ts) and merged, never typed
 * field by field (REL-012).
 */
export type JsonObject = { [key: string]: unknown };

export interface CameraSourceJson extends JsonObject {
  id?: string;
  haEntityId?: string;
  name?: string;
  rtspUrl?: string;
}

export interface ServerConfig extends JsonObject {
  version?: number;
  updatedAt?: string;
  cameras?: JsonObject & { sources?: Record<string, CameraSourceJson> };
  canvas?: JsonObject & { pinCode?: string };
}

export interface PersistedConfig {
  config: ServerConfig;
  serverVersion: number;
}

export const isJsonObject = (v: unknown): v is JsonObject =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
