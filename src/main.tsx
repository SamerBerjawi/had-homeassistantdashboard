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
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ConfigProvider>
        <EditModeProvider>
          <EntityPopupProvider>
            <App />
          </EntityPopupProvider>
        </EditModeProvider>
      </ConfigProvider>
    </AuthProvider>
  </StrictMode>,
);
