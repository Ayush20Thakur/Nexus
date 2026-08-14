import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('recharts') || id.includes('d3-')) return 'analytics';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('react-router-dom') || id.includes('zustand') || id.includes('axios')) return 'app-runtime';
          return undefined;
        },
      },
    },
  },
})
