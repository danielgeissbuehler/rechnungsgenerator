import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/rechnungsgenerator/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
