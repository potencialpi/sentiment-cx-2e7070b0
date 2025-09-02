import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    timeout: 30000,
    environment: 'jsdom', // Changed to jsdom for React component testing
    setupFiles: ['./tests/setup.js'],
    globals: true,
    include: ['tests/**/*.test.{js,ts,tsx}'], // Added tsx support
    exclude: ['node_modules', 'dist', 'build', 'tests/e2e-complete-flow.test.js'],
    watch: false,
    run: true,
    reporter: 'verbose',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        'build/',
        '**/*.d.ts',
        'vite.config.ts',
        'vitest.config.js'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
});