import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { quasar, transformAssetUrls } from '@quasar/vite-plugin';

export default defineConfig({
  plugins: [
    vue({ template: { transformAssetUrls } }),
    quasar(),
  ],
  server: {
    fs: { allow: ['../..'] },
  },
  resolve: {
    alias: {
      'agent-dom-js': new URL('../../dist/agent-dom-js.js', import.meta.url).pathname,
    },
  },
});
