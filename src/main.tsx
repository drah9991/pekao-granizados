import { createRoot } from "react-dom/client";
import { Buffer } from "buffer";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "@fontsource/orbitron/700.css";
import "@fontsource/orbitron/900.css";
import "@fontsource/caveat/400.css";
import "@fontsource/caveat/700.css";
import "@fontsource/permanent-marker/400.css";
import { initSentry } from "./lib/sentry";
import { initPostHog } from "./lib/posthog";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for PWA
registerSW({ immediate: true });

// Initialize telemetry/monitoring
initSentry();
initPostHog();

// Rate-limited auto reload helper for stale build chunks / HTML response errors
const handleChunkOrHtmlError = (reasonOrMessage?: string): boolean => {
  if (!reasonOrMessage) return false;
  const str = String(reasonOrMessage);
  const isChunkError = 
    str.includes('Failed to fetch dynamically imported module') ||
    str.includes('is not a valid JavaScript MIME type') ||
    str.includes('Unexpected token \'<\'') ||
    str.includes('Unexpected token <') ||
    str.includes('ChunkLoadError');

  if (isChunkError) {
    const lastReload = sessionStorage.getItem('pekao_last_chunk_reload');
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem('pekao_last_chunk_reload', now.toString());
      console.warn('Stale build chunk or HTML fallback error detected, reloading page...', str);
      window.location.reload();
      return true;
    }
  }
  return false;
};

// Global handler for Vite dynamic import errors (e.g., when a new version is deployed)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error, reloading page to get new assets...', event);
  handleChunkOrHtmlError('Failed to fetch dynamically imported module');
});

// Global error handler for uncaught runtime errors
window.addEventListener('error', (event) => {
  const msg = event.message || event.error?.message || '';
  if (handleChunkOrHtmlError(msg)) {
    event.preventDefault();
  }
});

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  const reasonMsg = event.reason?.message || event.reason?.name || String(event.reason || '');
  if (handleChunkOrHtmlError(reasonMsg)) {
    event.preventDefault();
    return;
  }
  console.error('Unhandled Promise Rejection:', event.reason);
});

// Utility to clear corrupted storage if needed (accessible via console)
(window as unknown as Record<string, unknown>).resetPekaoStorage = () => {
  localStorage.clear();
  sessionStorage.clear();
  indexedDB.deleteDatabase('pekao-offline-db');
  window.location.reload();
};

createRoot(document.getElementById("root")!).render(<App />);

