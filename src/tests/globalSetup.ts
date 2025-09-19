export default async function globalSetup() {
  console.log('🚀 Starting global test setup...');

  try {
    // Set test environment variables
    process.env['NODE_ENV'] = 'test';
    process.env['PORT'] = '0'; // Use random available port
    process.env['API_PORT'] = '0';
    process.env['LOG_LEVEL'] = 'error'; // Reduce log noise during tests
    
    // Mock external services
    process.env['MOCK_EXTERNAL_SERVICES'] = 'true';
    
    // Database setup for tests (if needed)
    process.env['DB_NAME'] = 'test_port_monitor';
    
    console.log('✅ Global test setup completed successfully');
  } catch (error) {
    console.error('❌ Global test setup failed:', error);
    throw error;
  }
}