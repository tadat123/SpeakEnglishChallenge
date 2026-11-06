import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

const buildTimestamp = new Date().toISOString();
const buildId = Date.now().toString();

function pwaUpdatePlugin() {
  return {
    name: 'pwa-update-plugin',
    transformIndexHtml(html: string) {
      const metaTags = `
    <!-- PWA Cache & Build Versioning -->
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
    <meta name="app-build-time" content="${buildTimestamp}" />
    <meta name="app-build-id" content="${buildId}" />`;
      return html.replace('</head>', `${metaTags}\n  </head>`);
    },
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(distDir)) return;

      // 1. Tạo file version.json để PWA client có thể ping kiểm tra phiên bản mới cực nhanh (0.5KB)
      const versionData = {
        version: '1.0.1',
        buildTime: buildTimestamp,
        buildId: buildId,
      };
      fs.writeFileSync(
        path.join(distDir, 'version.json'),
        JSON.stringify(versionData, null, 2),
        'utf-8'
      );

      // 2. Cập nhật dist/sw.js để thay đổi byte checksum, kích hoạt Service Worker update của trình duyệt
      const swDistPath = path.join(distDir, 'sw.js');
      if (fs.existsSync(swDistPath)) {
        let swContent = fs.readFileSync(swDistPath, 'utf-8');
        swContent = swContent.replace(/__BUILD_TIMESTAMP__/g, buildTimestamp);
        swContent = swContent.replace(/__BUILD_ID__/g, buildId);

        const header = `// Speak Right 2026 PWA Service Worker - Build: ${buildTimestamp} (${buildId})\n`;
        if (!swContent.startsWith('// Speak Right 2026 PWA Service Worker')) {
          swContent = header + swContent;
        }
        fs.writeFileSync(swDistPath, swContent, 'utf-8');
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), pwaUpdatePlugin()],
  define: {
    __APP_BUILD_TIME__: JSON.stringify(buildTimestamp),
    __APP_BUILD_ID__: JSON.stringify(buildId),
    __APP_VERSION__: JSON.stringify('1.0.1'),
  },
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
