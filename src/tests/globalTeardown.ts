export default async function globalTeardown() {
  console.log('🧹 Starting global test teardown...');

  try {
    // Clean up test environment variables
    delete process.env['NODE_ENV'];
    delete process.env['PORT'];
    delete process.env['API_PORT'];
    delete process.env['LOG_LEVEL'];
    delete process.env['MOCK_EXTERNAL_SERVICES'];
    delete process.env['DB_NAME'];
    
    // Clean up any test files or temporary data
    // (Add cleanup logic here if needed)
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    console.log('✅ Global test teardown completed successfully');
  } catch (error) {
    console.error('❌ Global test teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}