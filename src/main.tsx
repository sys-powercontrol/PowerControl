import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign Vite HMR websocket connection errors in development environment
if (typeof window !== 'undefined') {
  const ignoreErrors = [
    'WebSocket connection to',
    'failed to connect to websocket',
    'WebSocket closed without opened',
    '[vite]',
  ];

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    const errStack = event.error?.stack || '';
    const errMsg = event.error?.message || '';
    if (
      ignoreErrors.some(sub => 
        msg.includes(sub) || 
        errStack.includes(sub) || 
        errMsg.includes(sub)
      )
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason?.message || String(reason || '');
    const stack = reason?.stack || '';
    if (
      ignoreErrors.some(sub => 
        msg.includes(sub) || 
        stack.includes(sub)
      )
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

