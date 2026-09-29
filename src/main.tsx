import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './styles/main.css';

// Register PWA service worker for offline support
if ('serviceWorker' in navigator) {
  registerSW({
    onNeedRefresh() {
      console.log('[PWA] New content available; please refresh.');
    },
    onOfflineReady() {
      console.log('[PWA] App is ready for offline usage!');
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
