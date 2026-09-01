import React from 'react';
import { create } from 'zustand';

interface EntityPopupState {
  isOpen: boolean;
  selectedEntityId: string | null;
  openEntityDetails: (entityId: string) => void;
  closeEntityDetails: () => void;
}

export const useEntityPopupStore = create<EntityPopupState>((set) => ({
  isOpen: false,
  selectedEntityId: null,
  openEntityDetails: (entityId: string) => {
    if (!entityId) return;
    set({ selectedEntityId: entityId, isOpen: true });
  },
  closeEntityDetails: () => {
    set({ isOpen: false });
    setTimeout(() => {
      set({ selectedEntityId: null });
    }, 200);
  }
}));

export function useEntityPopup() {
  return useEntityPopupStore();
}

export function EntityPopupProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

