// TEAM P03 | STEP P03-058 | Review this file, then remove this marker only.
import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/styles/globals.css';
// Side-effect import: initialises i18next and sets <html lang dir> before the
// first render, so the very first paint is already in the right direction.
import '@/i18n';
import { App } from './App';
import { clearRecoveryUrlMarker } from '@/lib/moduleRecovery';

// Vite emits this event when a deployment references a missing hashed chunk.
// lazyWithRetry owns the retry/recovery sequence; do not reload here immediately.
if (typeof window !== 'undefined') {
    window.addEventListener('vite:preloadError', (event) => {
        event.preventDefault();
        // The lazy import will reject as well and is retried by lazyWithRetry.
        // Prevent Vite from turning the preload warning into an uncaught error.
    });
}
clearRecoveryUrlMarker();
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode>
    <App />
  </React.StrictMode>);
