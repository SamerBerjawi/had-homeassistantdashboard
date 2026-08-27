import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolves a Home Assistant entity picture URL (handles relative /api/... and /local/... paths).
 */
export function getHAImageUrl(rawPath?: string | null, serverUrl?: string): string | undefined {
  if (!rawPath || typeof rawPath !== 'string' || !rawPath.trim()) return undefined;
  const trimmed = rawPath.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }
  if (trimmed.startsWith('/') && serverUrl) {
    try {
      const url = new URL(serverUrl);
      const protocol = url.protocol === 'wss:' ? 'https:' : url.protocol === 'ws:' ? 'http:' : url.protocol;
      return `${protocol}//${url.host}${trimmed}`;
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

/**
 * Safely opens an external URL in a new tab with noopener/noreferrer,
 * strictly validating http: and https: protocols to prevent script execution.
 */
export function safeOpenExternalUrl(url?: string | null): void {
  if (!url || typeof window === 'undefined') return;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    window.open(trimmed, '_blank', 'noopener,noreferrer');
  }
}

