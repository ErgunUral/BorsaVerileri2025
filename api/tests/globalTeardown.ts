import { ChildProcess } from 'child_process';
import Redis from 'ioredis';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');

  try {
    // Close Redis client
    const testRedisClient = (global as any).__TEST_REDIS_CLIENT__ as Redis;
    if (testRedisClient) {
      await testRedisClient.quit();
      console.log('✅ Redis client disconnected');
    }

    // Stop Redis process if we started it
    const redisProcess = (global as any).__REDIS_PROCESS__ as ChildProcess;
    if (redisProcess && !redisProcess.killed) {
      redisProcess.kill('SIGTERM');
      
      // Wait for process to exit
      await new Promise<void>((resolve) => {
        redisProcess.on('exit', () => {
          console.log('✅ Redis server stopped');
          resolve();
        });
        
        // Force kill after 5 seconds
        setTimeout(() => {
          if (!redisProcess.killed) {
            redisProcess.kill('SIGKILL');
            console.log('🔪 Redis server force killed');
          }
          resolve();
        }, 5000);
      });
    }

    console.log('✅ Test environment cleanup complete');
  } catch (error) {
    console.error('❌ Error during test cleanup:', error);
  }
}