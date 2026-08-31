import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // INTEGRATION: proxy same-origin /api calls straight to the
      // SmartRail backend during local development, so the default
      // `getBaseUrl() -> '/api'` fallback in src/services/api.ts
      // "just works" without needing VITE_API_URL set and without
      // hitting any CORS issues in dev. In production, set
      // VITE_API_URL to the deployed backend's URL instead (see
      // .env.example) — this proxy only applies to `vite`/`vite dev`.
      proxy: {
        '/api': {
          target: process.env.BACKEND_URL || 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  };
});
