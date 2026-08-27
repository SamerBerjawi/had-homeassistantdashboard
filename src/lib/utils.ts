import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { resolveHAImageUrl } from '../services/haImageService';

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
