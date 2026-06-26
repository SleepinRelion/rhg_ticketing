import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import App from './App.jsx';
import './index.css';

async function bootstrap() {
  try {
    const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
    const res = await fetch(`${API_BASE}/settings/public`);
    const config = await res.json();
    
    const root = document.documentElement;
    if (config.APP_BG_COLOR) root.style.setProperty('--app-bg-color', config.APP_BG_COLOR);
    if (config.APP_BG_IMAGE_URL) root.style.setProperty('--app-bg-image', `url(${config.APP_BG_IMAGE_URL})`);
    
    window.APP_LOGO_URL = config.APP_LOGO_URL || '/logo.png';
    window.APP_NAME = config.APP_NAME || 'IT Ticketing System';
    document.title = window.APP_NAME;
  } catch (err) {
    console.error('Failed to load public config', err);
    window.APP_LOGO_URL = '/logo.png';
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <SocketProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </SocketProvider>
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>
  );
}

bootstrap();
