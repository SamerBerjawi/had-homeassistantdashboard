/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Thin adapter kept for existing call sites; the markup lives in the shared ConfirmDialog (UI-012).
 */

import React from 'react';
import ConfirmDialog, { ConfirmTone } from '../../ui/ConfirmDialog';

interface ActionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmText: string;
  confirmColor?: ConfirmTone;
  icon?: React.ReactNode;
  entityName?: string;
  darkMode?: boolean;
  isLoading?: boolean;
}

export function ActionConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  confirmColor = 'cyan',
  icon,
  entityName,
  darkMode = true,
  isLoading = false
}: ActionConfirmModalProps) {
  return (
    <ConfirmDialog
      open={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      description={description}
      confirmLabel={confirmText}
      tone={confirmColor}
      icon={icon}
      subtitle={entityName}
      darkMode={darkMode}
      isLoading={isLoading}
    />
  );
}
