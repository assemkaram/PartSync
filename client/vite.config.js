// TEAM P03 | STEP P03-066 | Review this file, then remove this marker only.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiTarget = process.env.API_PROXY_TARGET || 'http://127.0.0.1:3001';

export default defineConfig({
  plugins: [react()],
  cacheDir: '.vite',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    open: false,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: false,
        secure: false,
        timeout: 60_000,
        proxyTimeout: 60_000,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: false,
        secure: false,
        timeout: 60_000,
        proxyTimeout: 60_000,
      },
    },
  },
  optimizeDeps: {
    include: [
      'react', 'react-dom', 'react-dom/client', 'react/jsx-runtime',
      'react/jsx-dev-runtime', 'react-router-dom', '@tanstack/react-query',
      'zustand', 'zustand/middleware', 'zustand/middleware/immer', 'immer',
      'framer-motion', 'lucide-react', 'sonner', 'nanoid',
      'clsx', 'tailwind-merge', 'class-variance-authority', 'three',
      '@react-three/fiber', '@react-three/drei', '@supabase/supabase-js',
    ],
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 950,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          data: ['@tanstack/react-query', 'zustand', 'immer'],
          icons: ['lucide-react'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
