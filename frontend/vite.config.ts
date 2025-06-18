import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const baseUrl = 'https://z9fc2elwe2.execute-api.us-east-1.amazonaws.com/prod';

console.log(`Vite is proxying localhost:3000/api to ${baseUrl}/api.`);
console.log(
  'To connect to your deployed API, update packages/frontend/vite.config.ts.baseUrl'
);

// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/prod/' : '/',
  build: {
    outDir: '../dist/backend/Static/static',
    emptyOutDir: true,
  },
  define: {
    'process.env': {},
    global: {},
  },
  plugins: [react()],
  server: {
    open: true,
    port: 3000,
    proxy: {
      '/api': {
        target: baseUrl,
        changeOrigin: true,
      },
    },
  },
});
