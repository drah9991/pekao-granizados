import { createRoot } from "react-dom/client";
import { initSentry } from "./lib/sentry";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for PWA
registerSW({ immediate: true });

// Initialize Sentry before anything else
initSentry();

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
});

// Utility to clear corrupted storage if needed (accessible via console)
(window as any).resetPekaoStorage = () => {
  localStorage.clear();
  sessionStorage.clear();
  indexedDB.deleteDatabase('pekao-offline-db');
  window.location.reload();
};

createRoot(document.getElementById("root")!).render(<App />);

