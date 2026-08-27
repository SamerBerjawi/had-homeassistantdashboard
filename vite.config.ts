import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
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
