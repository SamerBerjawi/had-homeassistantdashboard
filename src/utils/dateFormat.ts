/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Parses diverse date inputs including:
 * - Date objects
 * - Unix timestamps in seconds (e.g. 1725867384) or milliseconds
 * - Stringified Unix timestamps (e.g. "1725867384")
 * - ISO 8601 strings (e.g. "2026-09-09T08:28:35.123456+00:00")
 * - Space-separated datetime strings (e.g. "2026-09-09 10:28:35")
 */
export function parseFlexibleDate(input?: string | number | Date | null): Date | null {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;

  if (typeof input === 'number') {
    // If Unix timestamp in seconds (e.g. 10 digits < 1e11), convert to milliseconds
    const ms = input < 1e11 ? input * 1000 : input;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed || trimmed.toLowerCase() === 'unavailable') return null;

    // Check if numeric string representing seconds or milliseconds
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const num = parseFloat(trimmed);
      const ms = num < 1e11 ? num * 1000 : num;
      const d = new Date(ms);
      if (!isNaN(d.getTime())) return d;
    }

    // Direct parse for standard ISO strings
    let d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;

    // Fallback: replace space with 'T' (e.g. "2026-09-09 10:28:35")
    if (trimmed.includes(' ')) {
      d = new Date(trimmed.replace(' ', 'T'));
      if (!isNaN(d.getTime())) return d;
    }
  }

  return null;
}

export interface LastUpdatedDetail {
  formatted: string;     // e.g. "Today at 10:28 AM" or "Sep 9 at 10:28 AM"
  relative: string;      // e.g. "Just now", "5m ago", "2h ago", "Yesterday"
  full: string;          // e.g. "Sep 9, 2026 at 10:28 AM"
  timeOnly: string;      // e.g. "10:28 AM"
  dateOnly: string;      // e.g. "Today", "Yesterday", "Sep 9, 2026"
  combined: string;      // e.g. "Today at 10:28 AM (5m ago)"
}

export function getLastUpdatedDetail(dateInput?: string | number | Date | null): LastUpdatedDetail | null {
  const date = parseFlexibleDate(dateInput);
  if (!date) return null;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Relative string
  let relative = 'Just now';
  if (diffSec < -5) {
    relative = 'In the future';
  } else if (diffSec < 60) {
    relative = 'Just now';
  } else if (diffMin < 60) {
    relative = `${diffMin}m ago`;
  } else if (diffHours < 24 && diffDays === 0) {
    relative = `${diffHours}h ago`;
  } else if (diffDays === 1) {
    relative = '1d ago';
  } else {
    relative = `${diffDays}d ago`;
  }

  // Time string (e.g. "10:28 AM")
  const timeOnly = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const isCurrentYear = date.getFullYear() === now.getFullYear();

  let dateOnly = '';
  let formatted = '';

  if (isToday) {
    dateOnly = 'Today';
    formatted = `Today at ${timeOnly}`;
  } else if (isYesterday) {
    dateOnly = 'Yesterday';
    formatted = `Yesterday at ${timeOnly}`;
  } else if (isCurrentYear) {
    dateOnly = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    formatted = `${dateOnly} at ${timeOnly}`;
  } else {
    dateOnly = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    formatted = `${dateOnly} at ${timeOnly}`;
  }

  const fullDate = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  const full = `${fullDate} at ${timeOnly}`;

  // Combined with relative hint for quick readability
  const combined = diffMin < 60 && diffSec >= 0
    ? `${formatted} (${relative})`
    : formatted;

  return {
    formatted,
    relative,
    full,
    timeOnly,
    dateOnly,
    combined
  };
}

/**
 * Formats a raw timestamp or date string into a highly readable, human-friendly string.
 * Always includes the date and time so the user knows exactly when the update occurred.
 * 
 * Examples:
 * - "Today at 10:28 AM (5m ago)" or "Today at 10:28 AM"
 * - "Yesterday at 8:15 PM"
 * - "Sep 9 at 10:28 AM"
 */
export function formatLastUpdated(
  dateInput?: string | number | Date | null,
  options: { includeRelative?: boolean } = { includeRelative: false }
): string {
  if (!dateInput) return 'Unavailable';

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return 'Unavailable';
    if (trimmed.toLowerCase() === 'just now') return 'Just now';
    if (trimmed.toLowerCase() === 'unavailable') return 'Unavailable';
  }

  const detail = getLastUpdatedDetail(dateInput);
  if (!detail) {
    return String(dateInput);
  }

  return options.includeRelative ? detail.combined : detail.formatted;
}

