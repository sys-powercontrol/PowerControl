import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign Vite HMR websocket connection errors in development environment
if (typeof window !== 'undefined') {
  const isWsError = (err: any) => {
    if (!err) return false;
    const msg = typeof err === 'string' ? err : (err.message || err.reason || err.stack || String(err));
    const targetUrl = err.target?.url || err.srcElement?.url || '';
    return (
      msg.includes('WebSocket') ||
      msg.includes('websocket') ||
      msg.includes('vite') ||
      msg.includes('ws://') ||
      msg.includes('wss://') ||
      targetUrl.includes('ws://') ||
      targetUrl.includes('wss://') ||
      err.type === 'close' ||
      err.name === 'CloseEvent' ||
      err.constructor?.name === 'CloseEvent'
    );
  };

  window.addEventListener('error', (event) => {
    if (isWsError(event.error) || isWsError(event.message) || isWsError(event.target)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    if (isWsError(event.reason) || isWsError(event.target)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register Service Worker
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

