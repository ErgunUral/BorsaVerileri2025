import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import Redis from 'ioredis';

const sleep = promisify(setTimeout);

let redisProcess: ChildProcess | null = null;
let testRedisClient: Redis | null = null;

export default async function globalSetup() {
  console.log('🚀 Setting up test environment...');

  try {
    // Start Redis server for testing (if not already running)
    await startRedisServer();
    
    // Wait for Redis to be ready
    await waitForRedis();
    
    // Clear test database
    await clearTestDatabase();
    
    console.log('✅ Test environment setup complete');
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    throw error;
  }
}

async function startRedisServer() {
  try {
    // Try to connect to existing Redis instance
    const testClient = new Redis({
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });
    
    await testClient.ping();
    console.log('📡 Using existing Redis server');
    testClient.disconnect();
  } catch (error) {
    console.log('🔄 Starting Redis server for tests...');
    
    // Start Redis server
    redisProcess = spawn('redis-server', ['--port', '6379', '--save', ''], {
      stdio: 'pipe',
      detached: false,
    });
    
    if (redisProcess.stderr) {
      redisProcess.stderr.on('data', (data) => {
        console.error('Redis stderr:', data.toString());
      });
    }
    
    // Wait for Redis to start
    await sleep(2000);
  }
}

async function waitForRedis() {
  const maxRetries = 10;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      testRedisClient = new Redis({
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: 3,
    });
      
      await testRedisClient.ping();
      console.log('✅ Redis server is ready');
      return;
    } catch (error) {
      retries++;
      console.log(`⏳ Waiting for Redis... (${retries}/${maxRetries})`);
      await sleep(1000);
    }
  }
  
  throw new Error('Failed to connect to Redis server');
}

async function clearTestDatabase() {
  if (testRedisClient) {
    try {
      await testRedisClient.flushall();
      console.log('🧹 Test database cleared');
    } catch (error) {
      console.warn('⚠️ Failed to clear test database:', error);
    }
  }
}

// Store process references for cleanup
(global as any).__REDIS_PROCESS__ = redisProcess;
(global as any).__TEST_REDIS_CLIENT__ = testRedisClient;