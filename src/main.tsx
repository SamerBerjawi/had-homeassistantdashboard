import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { ConfigProvider } from './contexts/ConfigContext';
import { EntityPopupProvider } from './contexts/EntityPopupContext';
import { EditModeProvider } from './contexts/EditModeContext';
import RootErrorBoundary from './components/RootErrorBoundary';
// Automatically reload when a new service worker version is installed and takes control,
// or when stale asset chunks fail to load after a deployment
if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }

  window.addEventListener('vite:preloadError', () => {
    window.location.reload();
  });
}

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
