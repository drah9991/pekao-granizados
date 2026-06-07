import { createRoot } from "react-dom/client";
import { Buffer } from "buffer";
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

// Global handler for Vite dynamic import errors (e.g., when a new version is deployed)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error, reloading page to get new assets...', event);
  window.location.reload();
});

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason && 
    event.reason.message && 
    (event.reason.message.includes('Failed to fetch dynamically imported module') ||
     event.reason.message.includes('is not a valid JavaScript MIME type') ||
     event.reason.name === 'ChunkLoadError')
  ) {
    console.warn('Chunk load error detected, reloading page...', event.reason);
    window.location.reload();
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

