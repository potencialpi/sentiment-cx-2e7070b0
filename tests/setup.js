/**
 * Test Setup Configuration
 * Configures the testing environment for E2E tests
 */

import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Global test setup
beforeAll(async () => {
  console.log('🔧 Configurando ambiente de teste...');
  
  // Set test timeout
  process.env.NODE_ENV = 'test';
  
  // Mock console methods if needed
  if (process.env.E2E_MOCK_MODE === 'true') {
    console.log('⚠️  Modo mock ativado - usando dados simulados');
  }
  
  console.log('✅ Ambiente de teste configurado');
});

// Global test cleanup
afterAll(async () => {
  console.log('🧹 Limpando ambiente de teste...');
  
  // Cleanup any global resources
  // This will be handled by individual test cleanup
  
  console.log('✅ Limpeza concluída');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});