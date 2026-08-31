import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { ConfigProvider } from './contexts/ConfigContext';
import { EntityPopupProvider } from './contexts/EntityPopupContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ConfigProvider>
        <EntityPopupProvider>
          <App />
        </EntityPopupProvider>
      </ConfigProvider>
    </AuthProvider>
  </StrictMode>,
);
