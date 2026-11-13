import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

/**
 * Prueba de arranque: compila la app como en producción (chunks, terser, PWA),
 * la sirve con `vite preview` y la abre en Chromium. Ver e2e/smoke/app-boot.spec.ts.
 *
 * No necesita secretos: Supabase apunta a una URL local que no responde. Las
 * variables del proceso tienen prioridad sobre los .env, así que en local
 * tampoco se toca la base de producción.
 */
export default defineConfig({
  testDir: "./e2e/smoke",
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 5 * 60 * 1000,
    env: {
      VITE_SUPABASE_URL: "http://127.0.0.1:54321",
      VITE_SUPABASE_PUBLISHABLE_KEY: "smoke-test-key",
    },
  },
});
