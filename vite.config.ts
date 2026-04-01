import { defineConfig } from 'vite';

export default defineConfig({
  base: '/svg-editor/',
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
