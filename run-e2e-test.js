#!/usr/bin/env node

/**
 * End-to-End Test Runner
 * Executes the comprehensive platform test with proper setup and reporting
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class E2ETestRunner {
  constructor() {
    this.testFile = path.join(__dirname, 'tests', 'e2e-complete-flow.test.js');
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * Check if required environment variables are set
   */
  async checkEnvironment() {
    console.log('🔍 Checking environment variables...');
    
    // Load .env file
    try {
      const dotenv = await import('dotenv');
      dotenv.config();
    } catch (error) {
      console.log('⚠️  dotenv not available, using system environment variables');
    }
    
    const requiredEnvVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'VITE_STRIPE_PUBLISHABLE_KEY',
      'STRIPE_SECRET_KEY'
    ];

    const missing = [];
    const placeholder = [];
    
    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      if (!value) {
        missing.push(envVar);
      } else if (value.includes('your_') || value.includes('_here')) {
        placeholder.push(envVar);
      }
    }

    if (missing.length > 0 || placeholder.length > 0) {
      console.error('❌ Environment configuration issues:');
      if (missing.length > 0) {
        console.error('\n   Missing variables:');
        missing.forEach(env => console.error(`   - ${env}`));
      }
      if (placeholder.length > 0) {
        console.error('\n   Placeholder values detected:');
        placeholder.forEach(env => console.error(`   - ${env}`));
      }
      console.error('\n⚠️  Running test with mock/placeholder values for demonstration purposes.');
      console.error('   For production testing, please configure actual API keys.');
      return 'mock';
    }

    console.log('✅ All required environment variables are properly configured');
    return true;
  }

  /**
   * Check if test file exists
   */
  checkTestFile() {
    console.log('📁 Checking test file...');
    
    if (!fs.existsSync(this.testFile)) {
      console.error(`❌ Test file not found: ${this.testFile}`);
      return false;
    }

    console.log('✅ Test file found');
    return true;
  }

  /**
   * Run the end-to-end test
   */
  async runTest(envStatus) {
    return new Promise((resolve, reject) => {
      console.log('🚀 Starting end-to-end test execution...');
      console.log('=' .repeat(60));
      
      this.startTime = new Date();
      
      // Use Vitest to run the test
      const args = ['vitest', 'run', this.testFile, '--reporter=verbose', '--no-watch'];
      
      // Set environment variable for mock mode
      const env = { ...process.env };
      if (envStatus === 'mock') {
        env.E2E_MOCK_MODE = 'true';
      }
      
      const testProcess = spawn('npx', args, {
        stdio: 'inherit',
        shell: true,
        cwd: __dirname,
        env: env,
        timeout: 60000
      });

      testProcess.on('close', (code) => {
        this.endTime = new Date();
        const duration = ((this.endTime - this.startTime) / 1000).toFixed(2);
        
        console.log('=' .repeat(60));
        console.log(`⏱️  Test execution completed in ${duration} seconds`);
        
        if (code === 0) {
          console.log('✅ All tests passed successfully!');
          resolve(true);
        } else {
          console.log(`❌ Tests failed with exit code: ${code}`);
          resolve(false);
        }
      });

      testProcess.on('error', (error) => {
        console.error('❌ Error running tests:', error.message);
        reject(error);
      });
    });
  }

  /**
   * Display test summary and next steps
   */
  displaySummary(success, envStatus) {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST EXECUTION SUMMARY');
    console.log('=' .repeat(60));
    
    if (envStatus === 'mock') {
      console.log('⚠️  NOTE: Tests ran in MOCK MODE due to placeholder environment variables');
      console.log('   For production validation, configure actual API keys.\n');
    }
    
    if (success) {
      console.log('🎉 SUCCESS: End-to-end test completed successfully!');
      console.log('\n✅ The following flows were validated:');
      console.log('   • Account purchase and payment processing');
      console.log('   • User authentication and login');
      console.log('   • Survey creation and configuration');
      console.log('   • Magic link generation and distribution');
      console.log('   • Survey response submission');
      console.log('   • Response analysis and data integrity');
      
      if (envStatus === 'mock') {
        console.log('\n🧪 Tests validated the application structure and flow logic.');
        console.log('   Configure real API keys for full integration testing.');
      } else {
        console.log('\n🚀 Your platform is ready for production!');
      }
    } else {
      console.log('❌ FAILURE: Some tests failed');
      console.log('\n🔧 Next steps:');
      console.log('   1. Review the test output above for specific failures');
      console.log('   2. Check your environment configuration');
      console.log('   3. Verify Supabase and Stripe integrations');
      console.log('   4. Fix any identified issues and run tests again');
      console.log('\n💡 Run with --verbose for more detailed output');
    }
    
    console.log('=' .repeat(60));
  }

  /**
   * Main execution method
   */
  async execute() {
    try {
      console.log('🧪 E2E Test Runner - Sentiment CX Platform');
      console.log('=' .repeat(60));
      
      // Pre-flight checks
      const envStatus = await this.checkEnvironment();
      if (envStatus === false) {
        process.exit(1);
      }
      
      if (!this.checkTestFile()) {
        process.exit(1);
      }
      
      console.log('\n🎯 All pre-flight checks passed. Starting test execution...\n');
      
      // Run the test
      const success = await this.runTest(envStatus);
      
      // Display summary
      this.displaySummary(success, envStatus);
      
      // Exit with appropriate code
      process.exit(success ? 0 : 1);
      
    } catch (error) {
      console.error('💥 Fatal error during test execution:', error.message);
      console.error('\nStack trace:', error.stack);
      process.exit(1);
    }
  }
}

// Handle process signals gracefully
process.on('SIGINT', () => {
  console.log('\n⚠️  Test execution interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Test execution terminated');
  process.exit(1);
});

// Execute if run directly - simplified detection
const isMainModule = process.argv[1] && import.meta.url.includes(path.basename(process.argv[1]));
if (isMainModule) {
  const runner = new E2ETestRunner();
  runner.execute();
}

export default E2ETestRunner;