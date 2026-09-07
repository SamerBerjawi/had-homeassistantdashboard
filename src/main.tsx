import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { ConfigProvider } from './contexts/ConfigContext';
import { EntityPopupProvider } from './contexts/EntityPopupContext';
import { EditModeProvider } from './contexts/EditModeContext';

// Register service worker for installable PWA and offline caching support
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  let refreshing = false;
  let hasExistingController = Boolean(navigator.serviceWorker.controller);

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Only reload if an existing active controller was replaced by a background update
    if (hasExistingController && !refreshing) {
      refreshing = true;
      window.location.reload();
    }
    hasExistingController = true;
  });

  registerSW({ immediate: true });
}

import RootErrorBoundary from './components/RootErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <AuthProvider>
        <ConfigProvider>
          <EditModeProvider>
            <EntityPopupProvider>
              <App />
            </EntityPopupProvider>
          </EditModeProvider>
        </ConfigProvider>
      </AuthProvider>
    </RootErrorBoundary>
  </StrictMode>,
);
