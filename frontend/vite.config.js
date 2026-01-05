import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.js',
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
  proxy: {
    '/auth': {
      target: 'http://localhost:5000',
      changeOrigin: true,
      secure: false,
    },
    '/api': {
      target: 'http://localhost:5000', 
      changeOrigin: true,
      secure: false,
    },
    '/audio': {
      target: 'http://localhost:5000',
      changeOrigin: true,
      secure: false,
    },
  },
},

});
