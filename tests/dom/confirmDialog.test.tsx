// @vitest-environment jsdom
import './setup';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ConfirmDialog from '../../src/components/ui/ConfirmDialog';
import RootErrorBoundary from '../../src/components/RootErrorBoundary';

afterEach(cleanup);

function Harness({ onConfirm = vi.fn() }: { onConfirm?: () => void | Promise<void> }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>opener</button>
      <ConfirmDialog open={open} onClose={() => setOpen(false)} onConfirm={onConfirm} title="Do it?" confirmLabel="Yes do it" />
    </>
  );
}

describe('ConfirmDialog (UI-002, UI-012)', () => {
  it('is a labelled modal dialog and moves focus inside', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('opener'));
    const dialog = screen.getByRole('dialog', { name: 'Do it?' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('closes on Escape and returns focus to the opener', async () => {
    render(<Harness />);
    const opener = screen.getByText('opener');
    opener.focus();
    fireEvent.click(opener);
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it('keeps Tab inside the dialog', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('opener'));
    const dialog = screen.getByRole('dialog');
    const buttons = dialog.querySelectorAll('button');
    (buttons[buttons.length - 1] as HTMLElement).focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('runs onConfirm once and closes, even if it throws', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('boom'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<Harness onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('opener'));
    fireEvent.click(screen.getByText('Yes do it'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('RootErrorBoundary (REL-010)', () => {
  function Boom(): React.ReactElement {
    throw new Error('render failed');
  }

  it('shows the crash screen and needs a second click before wiping local data', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    localStorage.setItem('keep', 'me');
    render(
      <RootErrorBoundary>
        <Boom />
      </RootErrorBoundary>
    );
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    const reset = screen.getByText(/Reset Stored Cache/);
    fireEvent.click(reset);
    expect(localStorage.getItem('keep')).toBe('me');
    expect(screen.getByText(/Click again to confirm/)).toBeTruthy();
  });
});
