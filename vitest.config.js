import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    timeout: 30000,
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    globals: true,
    include: ['tests/**/*.test.{js,ts}'],
    exclude: ['node_modules', 'dist', 'build'],
    watch: false,
    run: true,
    reporter: 'verbose'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
});