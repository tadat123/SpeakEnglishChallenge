import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { installClientApiFallback } from './utils/clientApiFallback';
import './index.css';

installClientApiFallback();

// Tự động tải lại trang khi có phiên bản mới làm thay đổi hash file JavaScript của Vite
window.addEventListener('vite:preloadError', () => {
  console.warn('[PWA Update] Phát hiện lỗi nạp module phiên bản cũ. Đang tự động tải lại...');
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
