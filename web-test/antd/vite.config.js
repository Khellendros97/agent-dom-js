import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    fs: { allow: ['../..'] },
  },
  resolve: {
    alias: {
      'agent-dom-js': new URL('../../dist/agent-dom-js.js', import.meta.url).pathname,
    },
  },
});
