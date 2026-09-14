import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { ConfigProvider } from './contexts/ConfigContext';
import { EntityPopupProvider } from './contexts/EntityPopupContext';
import { EditModeProvider } from './contexts/EditModeContext';
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
