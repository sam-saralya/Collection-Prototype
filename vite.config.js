import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Pure static prototype — no proxy, no backend. Everything is dummy data.
export default defineConfig({
  plugins: [react()],
  server: { port: 5180 },
  preview: { port: 4180 },
});
