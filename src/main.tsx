import { createRoot } from "react-dom/client";
import { Buffer } from "buffer";
import { initSentry } from "./lib/sentry";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for PWA
registerSW({ immediate: true });

// Initialize Sentry before anything else
initSentry();

createRoot(document.getElementById("root")!).render(<App />);
