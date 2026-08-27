import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getHAImageUrl(url?: string | null, serverUrl?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const base = serverUrl ? serverUrl.replace(/\/+$/, '') : '';
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}

export function safeOpenExternalUrl(url?: string): void {
  if (!url) return;
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    // fallback
  }
}
