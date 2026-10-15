import React from 'react';
import { useDialogA11y } from '../../hooks/useDialogA11y';

interface DialogShellProps {
  /** Accessible name of the dialog */
  label: string;
  onClose: () => void;
  /** Classes for the full-screen scrim */
  overlayClassName?: string;
  /** Classes for the dialog card */
  className?: string;
  children: React.ReactNode;
}

/**
 * Overlay + card with dialog semantics for conditionally rendered inline modals (UI-002).
 * Rendering it only while the modal is open is enough: focus moves in on mount and is restored
 * on unmount.
 */
export default function DialogShell({
  label,
  onClose,
  overlayClassName = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs',
  className,
  children
}: DialogShellProps) {
  const ref = useDialogA11y({ open: true, onClose });
  return (
    <div className={overlayClassName} onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={className}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
