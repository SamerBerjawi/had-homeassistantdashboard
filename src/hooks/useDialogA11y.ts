import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogA11yOptions {
  open: boolean;
  onClose?: () => void;
  /** Escape closes the dialog. Set false for dialogs that must not be dismissed (the auth gate). */
  closeOnEscape?: boolean;
}

/**
 * Dialog behaviour that the hand-rolled overlays were missing (UI-002): focus moves into the
 * dialog, Tab stays inside it, Escape closes it, and focus returns to the opener afterwards.
 * Attach the returned ref to the dialog container and give it role="dialog" aria-modal="true".
 */
export function useDialogA11y<T extends HTMLElement = HTMLDivElement>({
  open,
  onClose,
  closeOnEscape = true
}: DialogA11yOptions) {
  const ref = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const container = ref.current;

    // Focus the first control, or the container itself, without stealing focus from an autofocused input
    if (container && !container.contains(document.activeElement)) {
      const first = container.querySelector<HTMLElement>(FOCUSABLE);
      (first || container).focus({ preventScroll: true });
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape) {
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab' || !container) return;
      const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (focusables.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [open, closeOnEscape]);

  return ref;
}
