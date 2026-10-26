import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    // Los tests no deben depender del .env (en CI no existe, y el local apunta a
    // producción): el cliente de Supabase se crea con valores ficticios.
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
    },
    setupFiles: ['./src/test/setup.ts'],
    // _shared: reglas puras de las edge functions (sin imports de Deno), testeables aquí.
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'supabase/functions/_shared/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      '.kilo/**',
      'tmp_package/**',
      'e2e/**',
      '**/*.spec.ts',
      '**/bun:test**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'src/main.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
