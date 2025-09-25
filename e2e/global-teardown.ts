import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...');
  
  // Clean up any test data or resources
  // You can add cleanup logic here
  
  console.log('✅ E2E test environment cleanup complete');
}

export default globalTeardown;