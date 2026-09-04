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
    if (config.APP_BG_IMAGE_URL) {
      // Add a dynamic overlay that respects the current theme
      root.style.setProperty('--app-bg-image', `linear-gradient(var(--overlay-start, rgba(18, 18, 18, 0.90)), var(--overlay-end, rgba(18, 18, 18, 0.98))), url("${config.APP_BG_IMAGE_URL}")`);
    }
    
    if (config.APP_THEME) {
      root.setAttribute('data-theme', config.APP_THEME);

      const themeColors = {
        light: '#f8fafc',
        ocean: '#020617',
        midnight: '#0f0a18',
        default: '#121212'
      };
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', themeColors[config.APP_THEME] || themeColors.default);
      }
    }
    
    window.APP_LOGO_URL = config.APP_LOGO_URL || '/logo.png';
    window.APP_NAME = config.APP_NAME || 'IT Ticketing System';
    window.APP_BG_IMAGE_URL = config.APP_BG_IMAGE_URL || '';
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
            <ToastProvider>
              <SocketProvider>
                <App />
              </SocketProvider>
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>
  );
}

bootstrap();
