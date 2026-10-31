import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    // Tắt hoàn toàn source maps ở môi trường Production (Chống soi mã nguồn TypeScript gốc)
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1200,
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
