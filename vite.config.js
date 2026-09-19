import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Still dummy data, but worklists/reports/pipelines/borrower updates now
// round-trip through a tiny SQLite-backed server (see server/index.js) so
// they survive a reload. /api proxies to it in dev.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    proxy: { '/api': 'http://localhost:4000' },
  },
  preview: { port: 4180 },
});
