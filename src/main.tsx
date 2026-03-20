import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { log } from '@/lib/logger';

// ─── Global unhandled error handler ──────────────────────────────────────────
// Catches synchronous runtime errors that escape all try/catch and error boundaries.
window.addEventListener('error', (event) => {
  log.error(
    event.message ?? 'Uncaught runtime error',
    {
      layer: 'Runtime',
      component: 'window.onerror',
      fn: event.filename
        ? `${event.filename}:${event.lineno}:${event.colno}`
        : undefined,
    },
    event.error
  );
});

// ─── Global unhandled promise rejection handler ───────────────────────────────
// Catches async errors not handled by a .catch() or try/catch in an async function.
window.addEventListener('unhandledrejection', (event) => {
  log.error(
    'Unhandled promise rejection',
    {
      layer: 'Runtime',
      component: 'window.onunhandledrejection',
    },
    event.reason
  );
  // Suppress the browser's default "Uncaught (in promise)" noise — we already logged it.
  event.preventDefault();
});

createRoot(document.getElementById('root')!).render(<App />);
