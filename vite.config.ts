import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.ico',
          'favicon.svg',
          'apple-touch-icon.png',
          'icons/*.png',
          'splash/*.png',
        ],
        manifest: {
          name: 'HOMZ • Smart Home Dashboard',
          short_name: 'HOMZ',
          description: 'Automated Living Smart Home Assistant Dashboard',
          theme_color: '#000000',
          background_color: '#000000',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'standalone'],
          start_url: '/',
          scope: '/',
          orientation: 'any',
          categories: ['smart home', 'utilities', 'lifestyle'],
          icons: [
            {
              src: '/icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/icon-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/icons/apple-touch-icon.png',
              sizes: '180x180',
              type: 'image/png',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MiB to cache full app shell and icon bundle
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
          // Explicitly exclude API, WebSocket, auth, camera streams, and WebRTC from Workbox navigation & runtime caching
          navigateFallbackDenylist: [
            /^\/api/,
            /^\/auth/,
            /^\/manifest\.json/,
            /^\/websocket/,
            /^\/webrtc/,
            /^\/go2rtc/,
            /^\/media\//,
          ],
          runtimeCaching: [
            {
              // Live Home Assistant API, streams, and WebSocket must NEVER be cached
              urlPattern: ({ url }) =>
                url.pathname.startsWith('/api') ||
                url.pathname.startsWith('/auth') ||
                url.pathname.startsWith('/websocket') ||
                url.pathname.startsWith('/webrtc') ||
                url.pathname.startsWith('/go2rtc'),
              handler: 'NetworkOnly',
            },
            {
              // External web fonts
              urlPattern: ({ url }) =>
                url.origin === 'https://fonts.googleapis.com' ||
                url.origin === 'https://fonts.gstatic.com',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
            {
              // Static app images (excluding camera proxy streams)
              urlPattern: ({ request, url }) =>
                request.destination === 'image' &&
                !url.pathname.includes('/camera_proxy') &&
                !url.pathname.includes('/image_proxy') &&
                !url.pathname.startsWith('/api'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'homz-static-images',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-motion': ['motion'],
            'vendor-visx': [
              '@visx/shape',
              '@visx/scale',
              '@visx/curve',
              '@visx/gradient',
              '@visx/grid',
              '@visx/group',
              '@visx/pattern',
              '@visx/responsive',
              '@visx/sankey',
              '@visx/event',
            ],
            'vendor-zustand': ['zustand'],
            'vendor-phosphor': ['@phosphor-icons/react'],
          },
        },
      },
    },
  };
});
