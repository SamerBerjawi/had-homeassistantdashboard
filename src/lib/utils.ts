import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { resolveHAImageUrl } from '../services/haImageService';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getHAImageUrl(url?: string | null, serverUrl?: string | null): string {
  return resolveHAImageUrl(url, serverUrl);
}

export function safeOpenExternalUrl(url?: string): void {
  if (!url) return;
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
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
