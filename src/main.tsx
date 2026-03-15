import { createRoot } from "react-dom/client";
import { Buffer } from "buffer";
import App from "./App.tsx";
import "./index.css";

// Force Buffer global for third-party libraries
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
  window.global = window;
}

createRoot(document.getElementById("root")!).render(<App />);
