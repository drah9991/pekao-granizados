import { createRoot } from "react-dom/client";
import { Buffer } from "buffer";
import App from "./App.tsx";
import "./index.css";

// Polyfill Buffer for browser environment
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

createRoot(document.getElementById("root")!).render(<App />);
