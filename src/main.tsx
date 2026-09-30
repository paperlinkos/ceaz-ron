import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './styles/main.css';

// Purge any stale legacy organization or target caches that held old 20 groups or < 129 churches
try {
  const orgCacheRaw = localStorage.getItem('ron_organizations_cache');
  if (orgCacheRaw) {
    const orgCache = JSON.parse(orgCacheRaw);
    if (!orgCache.churches || orgCache.churches.length < 129 || (orgCache.groups && orgCache.groups.length < 24)) {
      localStorage.removeItem('ron_organizations_cache');
      console.log('[Cache] Purged outdated organization cache to load fresh 129 Churches & 24 Groups.');
    }
  }
} catch {
  // ignore
}

try {
  const targetCacheRaw = localStorage.getItem('ron_local_targets_cache');
  if (targetCacheRaw) {
    const targets = JSON.parse(targetCacheRaw);
    if (!Array.isArray(targets) || targets.filter((t: any) => t.level === 'church').length < 129) {
      localStorage.removeItem('ron_local_targets_cache');
      console.log('[Cache] Purged outdated targets cache to load fresh 129 church targets.');
    }
  }
} catch {
  // ignore
}

// Register PWA service worker for offline support with immediate auto-refresh in production, unregister in dev
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister();
      }
    });
  } else {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('[PWA] New version detected; refreshing...');
        updateSW(true);
      },
      onOfflineReady() {
        console.log('[PWA] App is ready for offline usage!');
      },
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
