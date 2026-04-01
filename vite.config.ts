import { defineConfig } from 'vite';

export default defineConfig({
  base: '/svg-editor/',
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
