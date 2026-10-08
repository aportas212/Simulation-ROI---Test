/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Chemins relatifs : le site fonctionne aussi dans un sous-dossier (GitHub Pages, intranet…)
  base: './',
  build: {
    rollupOptions: {
      output: { manualChunks: { charts: ['recharts'] } },
    },
    // Recharts pèse ~500 kB minifié : chargé dans un chunk dédié
    chunkSizeWarningLimit: 700,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
