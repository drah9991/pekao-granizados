import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: mode === 'staging' ? 8085 : 8080,
  },
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'placeholder.svg', 'pwa-192.png', 'pwa-512.png'],
      manifest: {
        name: 'Pekao Central',
        short_name: 'Pekao Central',
        description: 'Punto de Venta Multi-Tenant SaaS',
        theme_color: '#0F1117',
        background_color: '#0F1117',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      }
    }),
    // Bundle analyzer (only in analyze mode)
    mode === 'analyze' ? visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html'
    }) : null
  ].filter(Boolean),
  build: {
    chunkSizeWarningLimit: 2000,
    sourcemap: mode === 'production' ? false : true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunking for better caching
          if (id.includes('node_modules')) {
            // Charts libraries (large)
            if (id.includes('recharts') || id.includes('d3')) return 'vendor-charts';

            // Animation library
            if (id.includes('framer-motion')) return 'vendor-motion';

            // Export libraries (PDF, Excel)
            if (id.includes('jspdf') || id.includes('xlsx')) return 'vendor-exports';

            // UI Component libraries
            if (id.includes('@radix-ui')) return 'vendor-ui';

            // React core
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }

            // Supabase
            if (id.includes('@supabase') || id.includes('postgrest-js')) return 'vendor-supabase';

            // React Query
            if (id.includes('@tanstack/react-query')) return 'vendor-query';

            // Other large vendors
            return 'vendor';
          }
        }
      }
    },
    // Optimize deps
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
