# End-to-End Test Suite - Sentiment CX Platform

This document describes the comprehensive end-to-end test suite that validates the entire platform workflow from account purchase to survey analysis.

## Overview

The E2E test suite covers the complete user journey:

1. **Account Purchase Flow** - User selects plan, completes checkout, and payment processing
2. **Authentication & Login** - User authentication after successful purchase
3. **Survey Creation** - Creating surveys with questions and configuration
4. **Magic Link Generation** - Generating and distributing survey links to respondents
5. **Survey Response** - Respondents completing surveys via magic links
6. **Response Analysis** - Users viewing and analyzing collected responses

## Prerequisites

### Environment Variables

Before running the tests, ensure your `.env` file contains all required variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key

# Application Configuration
VITE_BASE_URL=http://localhost:8080
```

### Dependencies

Ensure all required dependencies are installed:

```bash
npm install
```

The test suite requires:
- Jest (testing framework)
- @supabase/supabase-js (database operations)
- node-fetch (HTTP requests)
- stripe (payment processing)

## Running the Tests

### Quick Start

```bash
# Run the complete end-to-end test suite
npm run test:e2e

# Run with verbose output
npm run test:e2e:verbose
```

### Manual Execution

```bash
# Direct execution of test runner
node run-e2e-test.js

# Using Jest directly
npx jest tests/e2e-complete-flow.test.js --verbose
```

## Test Structure

### Test Files

- `tests/e2e-complete-flow.test.js` - Main test suite with all test cases
- `tests/setup.js` - Jest configuration and test utilities
- `run-e2e-test.js` - Test runner script with environment validation
- `jest.config.js` - Jest configuration for E2E tests

### Test Components

#### 1. Test Utilities (`TestUtils`)

- **Database Operations**: User creation, cleanup, data validation
- **API Interactions**: HTTP requests, authentication, data submission
- **UI Simulation**: Form interactions, navigation, user actions
- **Payment Processing**: Stripe checkout simulation and validation

#### 2. Test Cases

**Account Purchase Flow**
- Plan selection validation
- Checkout process simulation
- Payment processing with Stripe
- Account activation verification

**Authentication & Login**
- User login after purchase
- Session management
- Profile data validation

**Survey Creation**
- Survey form submission
- Question configuration
- Database persistence validation

**Magic Link Generation**
- Link generation for respondents
- Email simulation
- Link validation and expiry

**Survey Response Submission**
- Respondent form completion
- Response data validation
- Database integrity checks

**Response Analysis**
- Data aggregation validation
- Analytics computation
- Report generation verification

## Test Configuration

### Timeouts

- **Individual Test Timeout**: 5 minutes (300,000ms)
- **Suite Timeout**: Configurable via Jest
- **API Request Timeout**: 30 seconds

### Test Data

- **Isolation**: Each test creates its own test data
- **Cleanup**: Automatic cleanup after each test
- **Randomization**: Unique identifiers to prevent conflicts

### Database Operations

- **Test Database**: Uses configured Supabase instance
- **Transactions**: Each test runs in isolation
- **Cleanup**: Comprehensive cleanup of test data

## Troubleshooting

### Common Issues

#### Environment Variables Missing
```
❌ Missing required environment variables:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
```

**Solution**: Check your `.env` file and ensure all required variables are set with valid values.

#### Test Timeouts
```
Timeout - Async callback was not invoked within the 300000 ms timeout
```

**Solution**: 
- Check network connectivity to Supabase and Stripe
- Verify API endpoints are responding
- Increase timeout if necessary

#### Database Connection Issues
```
Error: Failed to connect to Supabase
```

**Solution**:
- Verify Supabase URL and keys are correct
- Check Supabase project status
- Ensure RLS policies allow test operations

#### Stripe Integration Issues
```
Error: Invalid API key provided
```

**Solution**:
- Verify Stripe keys are correct and active
- Ensure test mode is enabled for development
- Check Stripe webhook configuration

### Debug Mode

Enable verbose logging:

```bash
# Set environment variable for detailed logs
VERBOSE_TESTS=true npm run test:e2e

# Or run with Jest verbose flag
npx jest tests/e2e-complete-flow.test.js --verbose --detectOpenHandles
```

## Test Results

### Success Output

```
✅ All tests passed successfully!

✅ The following flows were validated:
   • Account purchase and payment processing
   • User authentication and login
   • Survey creation and configuration
   • Magic link generation and distribution
   • Survey response submission
   • Response analysis and data integrity

🚀 Your platform is ready for production!
```

### Failure Output

```
❌ Tests failed with exit code: 1

🔧 Next steps:
   1. Review the test output above for specific failures
   2. Check your environment configuration
   3. Verify Supabase and Stripe integrations
   4. Fix any identified issues and run tests again
```

## Continuous Integration

### GitHub Actions

Example workflow configuration:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:e2e
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          VITE_STRIPE_PUBLISHABLE_KEY: ${{ secrets.STRIPE_PUBLISHABLE_KEY }}
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
```

## Best Practices

1. **Run tests in isolation** - Each test should be independent
2. **Clean up test data** - Always clean up after tests complete
3. **Use test-specific data** - Generate unique test data to avoid conflicts
4. **Monitor test performance** - Keep tests fast and efficient
5. **Regular maintenance** - Update tests as features evolve

## Support

For issues with the test suite:

1. Check this documentation first
2. Review test logs for specific error messages
3. Verify environment configuration
4. Check integration status (Supabase, Stripe)
5. Consult the main project documentation

---

**Note**: This test suite validates the complete platform functionality. Ensure all integrations are properly configured before running tests in production environments.