import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { installClientApiFallback } from './utils/clientApiFallback';
import './index.css';

installClientApiFallback();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
