import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { resolveHAImageUrl } from '../services/haImageService';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getHAImageUrl(url?: string | null, serverUrl?: string | null): string {
  return resolveHAImageUrl(url, serverUrl);
}

/**
 * Safely sanitizes external and user/HA-supplied URLs.
 * Rejects javascript:, data:, vbscript:, and other dangerous executable protocols.
 * Allows http:, https:, mailto:, tel:, and relative URLs starting with / or #.
 */
export function sanitizeSafeUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '#';
  const trimmed = url.trim();
  if (!trimmed) return '#';

  // Allow safe relative paths
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed, 'https://had.local');
    const protocol = parsed.protocol.toLowerCase();
    if (protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:' || protocol === 'tel:') {
      return trimmed;
    }
  } catch {
    // Malformed URL
  }
  return '#';
}

export function safeOpenExternalUrl(url?: string): void {
  if (!url) return;
  const safe = sanitizeSafeUrl(url);
  if (safe === '#') return; // Reject dangerous protocols (javascript:, etc.)
  try {
    window.open(safe, '_blank', 'noopener,noreferrer');
  } catch {
    // fallback
  }
}

/**
 * Strips the area name from an entity's display name if it starts or ends with it.
 * E.g., "Bedroom Floor Lamp" in "Bedroom" -> "Floor Lamp"
 * "Kitchen - Ceiling Light" in "Kitchen" -> "Ceiling Light"
 * "Living Room TV" in "Living Room" -> "TV"
 */
export function formatEntityDisplayName(name: string, areaName?: string): string {
  if (!name) return '';
  if (!areaName || !areaName.trim()) return name;

  const trimmedArea = areaName.trim();
  const escapedArea = trimmedArea.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Match area name at the beginning (with separators like space, hyphen, colon, slash)
  const prefixRegex = new RegExp(`^${escapedArea}[\\s:–—\\-_/]+`, 'i');
  // Match area name at the end (e.g. "Lamp (Bedroom)" or "Lamp Bedroom")
  const suffixRegex = new RegExp(`[\\s:–—\\-_/]+(\\(${escapedArea}\\)|${escapedArea})$`, 'i');

  let clean = name.replace(prefixRegex, '').replace(suffixRegex, '').trim();

  // If the entity name was ONLY the area name (e.g. name = "Kitchen", area = "Kitchen"), don't make it empty
  if (!clean || clean.length < 2) {
    return name;
  }

  // Capitalize first character
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Formats an ISO string or timestamp to a compact relative time representation (e.g. "5m ago", "2h ago")
 */
export function formatRelativeTime(dateStrOrTs?: string | number | null): string {
  if (!dateStrOrTs) return 'Just now';
  try {
    const timeMs = typeof dateStrOrTs === 'number' ? dateStrOrTs : new Date(dateStrOrTs).getTime();
    if (isNaN(timeMs) || timeMs <= 0) return 'Just now';
    const diffMs = Date.now() - timeMs;
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'Just now';
  }
}
