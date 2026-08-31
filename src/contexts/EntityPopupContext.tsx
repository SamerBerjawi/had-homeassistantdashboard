import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface EntityPopupContextType {
  isOpen: boolean;
  selectedEntityId: string | null;
  openEntityDetails: (entityId: string) => void;
  closeEntityDetails: () => void;
}

const EntityPopupContext = createContext<EntityPopupContextType | undefined>(undefined);

export function EntityPopupProvider({ children }: { children: React.ReactNode }) {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const openEntityDetails = useCallback((entityId: string) => {
    if (!entityId) return;
    setSelectedEntityId(entityId);
    setIsOpen(true);
  }, []);

  const closeEntityDetails = useCallback(() => {
    setIsOpen(false);
    // Retain selectedEntityId briefly during exit animation, or clear immediately
    setTimeout(() => {
      setSelectedEntityId(null);
    }, 200);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      selectedEntityId,
      openEntityDetails,
      closeEntityDetails
    }),
    [isOpen, selectedEntityId, openEntityDetails, closeEntityDetails]
  );

  return (
    <EntityPopupContext.Provider value={value}>
      {children}
    </EntityPopupContext.Provider>
  );
}

export function useEntityPopup(): EntityPopupContextType {
  const context = useContext(EntityPopupContext);
  if (!context) {
    throw new Error('useEntityPopup must be used within an EntityPopupProvider');
  }
  return context;
}
