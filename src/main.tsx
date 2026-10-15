import { StrictMode } from 'react';
import { MotionConfig } from 'motion/react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
// Self-hosted variable fonts (same origin, precached) instead of a render-blocking Google Fonts request
import '@fontsource-variable/plus-jakarta-sans/wght.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { ConfigProvider } from './contexts/ConfigContext';
import { EntityPopupProvider } from './contexts/EntityPopupContext';
import { EditModeProvider } from './contexts/EditModeContext';
import RootErrorBoundary from './components/RootErrorBoundary';
// Surface errors that no boundary can catch (async code, event handlers) in the console (REL-010)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Global] Unhandled promise rejection:', event.reason);
  });
  window.addEventListener('error', (event) => {
    console.error('[Global] Uncaught error:', event.error || event.message);
  });
}

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

  // Reload once to pick up a new deployment's chunks. If that didn't fix it, let the error reach
  // the error boundary instead of reloading forever.
  const PRELOAD_RELOAD_KEY = 'had_preload_error_reload_at';
  window.addEventListener('vite:preloadError', (event) => {
    let lastReloadAt = 0;
    try {
      lastReloadAt = Number(sessionStorage.getItem(PRELOAD_RELOAD_KEY) || 0);
      if (Date.now() - lastReloadAt < 30_000) return;
      sessionStorage.setItem(PRELOAD_RELOAD_KEY, String(Date.now()));
    } catch {
      // Without storage we can't tell a first failure from a loop, so don't auto-reload
      return;
    }
    event.preventDefault();
    window.location.reload();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <ConfigProvider>
            <EditModeProvider>
              <EntityPopupProvider>
                <App />
              </EntityPopupProvider>
            </EditModeProvider>
          </ConfigProvider>
        </AuthProvider>
      </MotionConfig>
    </RootErrorBoundary>
  </StrictMode>,
);
