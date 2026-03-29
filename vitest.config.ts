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
    forks: {
      workerResponseTimeout: 300000, // 5 minutes
      execArgv: ['--max-old-space-size=4096'],
    },
    testTimeout: 120000,
    hookTimeout: 120000,
    maxWorkers: 1,
    minWorkers: 1,
    isolate: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
