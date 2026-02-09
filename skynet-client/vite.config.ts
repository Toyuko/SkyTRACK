import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  optimizeDeps: {
    include: ['react-map-gl/mapbox', 'react-map-gl/maplibre', 'mapbox-gl', 'maplibre-gl'],
  },
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
});
