import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { installClientApiFallback } from './utils/clientApiFallback';
import { antiF12Security } from './utils/antiF12Security';
import './index.css';

// Kích hoạt lá chắn bảo mật chống F12, Inspect, View-Source & Gian Lận
antiF12Security.init();

installClientApiFallback();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
