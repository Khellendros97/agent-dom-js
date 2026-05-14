import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    fs: {
      allow: ['../..'],
    },
  },
  resolve: {
    alias: {
      'agent-dom-js': new URL('../../dist/agent-dom-js.js', import.meta.url).pathname,
    },
  },
});
