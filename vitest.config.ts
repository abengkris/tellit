import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    pool: 'forks',
    // @ts-ignore
    poolOptions: {
      forks: {
        workerResponseTimeout: 120000,
      },
    },
    testTimeout: 60000,
    hookTimeout: 60000,
    maxWorkers: 2,
    minWorkers: 1,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
