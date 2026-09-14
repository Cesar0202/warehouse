import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Purge any stale legacy localStorage catalog caches
try {
  localStorage.removeItem('app_custom_catalog_v2');
  localStorage.removeItem('app_custom_catalog_v1');
  localStorage.removeItem('app_custom_catalog');
  if ('caches' in window) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
} catch (e) {
  console.warn('Storage cleanup:', e);
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
