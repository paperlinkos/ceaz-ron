import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Tests run in "test" mode, where Vite does not load .env.production. The
  // Firebase SDK is initialised at module import, so an empty config would
  // crash every suite that touches a service. Feed tests the committed
  // production values so .env.production stays the single source of truth.
  const firebaseEnv =
    mode === 'test' ? loadEnv('production', process.cwd(), 'VITE_') : {};

  return {
    plugins: [
      react(),
      VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'favicon-*.png',
        'apple-touch-icon.png',
        'icons/*.png',
      ],
      manifest: {
        name: 'Reach Out Nigeria - Soul Winning Platform',
        short_name: 'RON Harvest',
        description: 'Live soul-winning recording platform for Reach Out Nigeria campaign',
        theme_color: '#071710',
        background_color: '#071710',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
      }),
    ],
    test: {
      env: firebaseEnv,
    },
  };
});
