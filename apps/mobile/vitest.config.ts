import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Pruebas de lógica pura (sin React Native). Configuración propia para no
// heredar la del POS web en la raíz del repo.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
