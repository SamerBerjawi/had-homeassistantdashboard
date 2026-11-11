// @vitest-environment jsdom
import './setup';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SyncStatusBadge from '../../src/components/ui/SyncStatusBadge';

afterEach(cleanup);

describe('SyncStatusBadge', () => {
  it('shows nothing but keeps the live region mounted while synced', () => {
    render(<SyncStatusBadge status="synced" />);
    const region = screen.getByRole('status');
    expect(region.textContent).toBe('');
    expect(region.getAttribute('aria-live')).toBe('polite');
  });

  it('announces syncing', () => {
    render(<SyncStatusBadge status="syncing" />);
    expect(screen.getByRole('status').textContent).toContain('Syncing');
  });

  it('offers retry when offline and includes the last sync time', () => {
    const onRetry = vi.fn();
    render(<SyncStatusBadge status="offline_fallback" lastSuccessfulSync="2026-11-11T10:00:00Z" onRetry={onRetry} />);
    expect(screen.getByText('Offline (Cached)')).toBeTruthy();
    expect(document.querySelector('[title*="2026-11-11"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows a save failure with a retry', () => {
    const onRetry = vi.fn();
    render(<SyncStatusBadge status="error" onRetry={onRetry} />);
    expect(screen.getByText('Changes not saved')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('does not render a retry button without a handler', () => {
    render(<SyncStatusBadge status="error" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
