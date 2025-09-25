import Redis from 'ioredis';
import logger from '../utils/logger';

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
  keepAlive: number;
  family: number;
  keyPrefix?: string;
}

interface RedisStats {
  connected: boolean;
  uptime: number;
  totalConnections: number;
  commandsProcessed: number;
  memoryUsage: string;
  keyspaceHits: number;
  keyspaceMisses: number;
  hitRate: number;
  evictedKeys: number;
  expiredKeys: number;
  connectedClients: number;
  usedMemoryPeak: string;
  lastSaveTime: number;
}

class RedisService {
  private client: Redis | null = null;
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 5;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private config: RedisConfig;
  private stats = {
    operations: 0,
    errors: 0,
    hits: 0,
    misses: 0,
    sets: 0,
    gets: 0,
    deletes: 0,
    connectionTime: 0
  };

  constructor(config?: Partial<RedisConfig>) {
    const baseConfig: RedisConfig = {
      host: process.env['REDIS_HOST'] || 'localhost',
      port: parseInt(process.env['REDIS_PORT'] || '6379'),
      db: parseInt(process.env['REDIS_DB'] || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4
    };
    
    if (process.env['REDIS_PASSWORD']) {
      baseConfig.password = process.env['REDIS_PASSWORD'];
    }
    
    if (process.env['REDIS_KEY_PREFIX']) {
      baseConfig.keyPrefix = process.env['REDIS_KEY_PREFIX'];
    } else {
      baseConfig.keyPrefix = 'borsa:';
    }
    
    this.config = {
      ...baseConfig,
      ...config
    };
  }

  async connect(): Promise<boolean> {
    if (this.isConnected && this.client) {
      return true;
    }

    try {
      const startTime = Date.now();
      
      const redisOptions: any = {
        host: this.config.host,
        port: this.config.port,
        db: this.config.db,
        maxRetriesPerRequest: this.config.maxRetriesPerRequest,
        lazyConnect: this.config.lazyConnect,
        keepAlive: this.config.keepAlive,
        family: this.config.family
      };
      
      if (this.config.password) {
        redisOptions.password = this.config.password;
      }
      
      if (this.config.keyPrefix) {
        redisOptions.keyPrefix = this.config.keyPrefix;
      }
      
      this.client = new Redis(redisOptions);

      // Event listeners
      this.client.on('connect', () => {
        this.isConnected = true;
        this.connectionAttempts = 0;
        this.stats.connectionTime = Date.now() - startTime;
        logger.info(`Redis connected to ${this.config.host}:${this.config.port}`);
      });

      this.client.on('error', (error) => {
        this.isConnected = false;
        this.stats.errors++;
        logger.error('Redis connection error:', error);
        this.scheduleReconnect();
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis connection closed');
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });

      await this.client.connect();
      return true;
    } catch (error) {
      this.connectionAttempts++;
      logger.error(`Redis connection attempt ${this.connectionAttempts} failed:`, error as Error);
      
      if (this.connectionAttempts < this.maxConnectionAttempts) {
        this.scheduleReconnect();
      } else {
        logger.error('Max Redis connection attempts reached');
      }
      
      return false;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = Math.min(1000 * Math.pow(2, this.connectionAttempts), 30000);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
    
    this.isConnected = false;
    logger.info('Redis disconnected');
  }

  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    if (!this.isReady()) {
      logger.warn('Redis not connected, attempting to reconnect...');
      await this.connect();
      if (!this.isReady()) {
        return false;
      }
    }

    try {
      this.stats.operations++;
      this.stats.sets++;
      
      const serializedValue = JSON.stringify(value);
      
      if (ttlSeconds) {
        await this.client!.setex(key, ttlSeconds, serializedValue);
      } else {
        await this.client!.set(key, serializedValue);
      }
      
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('Redis SET error:', error as Error);
      return false;
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isReady()) {
      logger.warn('Redis not connected, attempting to reconnect...');
      await this.connect();
      if (!this.isReady()) {
        return null;
      }
    }

    try {
      this.stats.operations++;
      this.stats.gets++;
      
      const value = await this.client!.get(key);
      
      if (value === null) {
        this.stats.misses++;
        return null;
      }
      
      this.stats.hits++;
      return JSON.parse(value);
    } catch (error) {
      this.stats.errors++;
      this.stats.misses++;
      logger.error('Redis GET error:', error as Error);
      return null;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      this.stats.operations++;
      this.stats.deletes++;
      
      const result = await this.client!.del(key);
      return result > 0;
    } catch (error) {
      this.stats.errors++;
      logger.error('Redis DEL error:', error as Error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      this.stats.operations++;
      const result = await this.client!.exists(key);
      return result === 1;
    } catch (error) {
      this.stats.errors++;
      logger.error('Redis EXISTS error:', error as Error);
      return false;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      this.stats.operations++;
      const result = await this.client!.expire(key, seconds);
      return result === 1;
    } catch (error) {
      this.stats.errors++;
      logger.error('Redis EXPIRE error:', error as Error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    if (!this.isReady()) {
      return -1;
    }

    try {
      this.stats.operations++;
      return await this.client!.ttl(key);
    } catch (error) {
      this.stats.errors++;
      logger.error('Redis TTL error:', error as Error);
      return -1;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.isReady()) {
      return [];
    }

    try {
      this.stats.operations++;
      return await this.client!.keys(pattern);
    } catch (error) {
      this.stats.errors++;
      logger.error('Redis KEYS error:', error as Error);
      return [];
    }
  }

  async flushdb(): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      this.stats.operations++;
      await this.client!.flushdb();
      logger.warn('Redis database flushed');
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('Redis FLUSHDB error:', error as Error);
      return false;
    }
  }

  async mget(keys: string[]): Promise<(any | null)[]> {
    if (!this.isReady() || keys.length === 0) {
      return [];
    }

    try {
      this.stats.operations++;
      this.stats.gets += keys.length;
      
      const values = await this.client!.mget(...keys);
      
      return values.map(value => {
        if (value === null) {
          this.stats.misses++;
          return null;
        }
        this.stats.hits++;
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      });
    } catch (error) {
      this.stats.errors++;
      this.stats.misses += keys.length;
      logger.error('Redis MGET error:', error as Error);
      return new Array(keys.length).fill(null);
    }
  }

  async mset(keyValuePairs: Record<string, any>, ttlSeconds?: number): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      this.stats.operations++;
      const keys = Object.keys(keyValuePairs);
      this.stats.sets += keys.length;
      
      const serializedPairs: string[] = [];
      for (const [key, value] of Object.entries(keyValuePairs)) {
        serializedPairs.push(key, JSON.stringify(value));
      }
      
      await this.client!.mset(...serializedPairs);
      
      if (ttlSeconds) {
        const pipeline = this.client!.pipeline();
        keys.forEach(key => {
          pipeline.expire(key, ttlSeconds);
        });
        await pipeline.exec();
      }
      
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('Redis MSET error:', error as Error);
      return false;
    }
  }

  async getStats(): Promise<RedisStats | null> {
    if (!this.isReady()) {
      return null;
    }

    try {
      const info = await this.client!.info();
      const lines = info.split('\r\n');
      const stats: any = {};
      
      lines.forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          stats[key] = value;
        }
      });

      const keyspaceHits = parseInt(stats.keyspace_hits || '0');
      const keyspaceMisses = parseInt(stats.keyspace_misses || '0');
      const totalKeyspaceOps = keyspaceHits + keyspaceMisses;
      
      return {
        connected: this.isConnected,
        uptime: parseInt(stats.uptime_in_seconds || '0'),
        totalConnections: parseInt(stats.total_connections_received || '0'),
        commandsProcessed: parseInt(stats.total_commands_processed || '0'),
        memoryUsage: stats.used_memory_human || '0B',
        keyspaceHits,
        keyspaceMisses,
        hitRate: totalKeyspaceOps > 0 ? (keyspaceHits / totalKeyspaceOps) * 100 : 0,
        evictedKeys: parseInt(stats.evicted_keys || '0'),
        expiredKeys: parseInt(stats.expired_keys || '0'),
        connectedClients: parseInt(stats.connected_clients || '0'),
        usedMemoryPeak: stats.used_memory_peak_human || '0B',
        lastSaveTime: parseInt(stats.rdb_last_save_time || '0')
      };
    } catch (error) {
      this.stats.errors++;
      logger.error('Redis INFO error:', error as Error);
      return null;
    }
  }

  getLocalStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
      : 0;

    return {
      ...this.stats,
      hitRate: parseFloat(hitRate.toFixed(2)),
      connected: this.isConnected,
      connectionAttempts: this.connectionAttempts
    };
  }

  resetLocalStats(): void {
    this.stats = {
      operations: 0,
      errors: 0,
      hits: 0,
      misses: 0,
      sets: 0,
      gets: 0,
      deletes: 0,
      connectionTime: this.stats.connectionTime
    };
  }

  getConfig(): RedisConfig {
    return { ...this.config };
  }

  async ping(): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      const result = await this.client!.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis PING error:', error as Error);
      return false;
    }
  }

  // Stock-specific helper methods
  async setStockData(symbol: string, data: any, ttlSeconds: number = 30): Promise<boolean> {
    return this.set(`stock:${symbol}`, data, ttlSeconds);
  }

  async getStockData(symbol: string): Promise<any | null> {
    return this.get(`stock:${symbol}`);
  }

  async setBulkStockData(stockData: Record<string, any>, ttlSeconds: number = 30): Promise<boolean> {
    const keyValuePairs: Record<string, any> = {};
    for (const [symbol, data] of Object.entries(stockData)) {
      keyValuePairs[`stock:${symbol}`] = data;
    }
    return this.mset(keyValuePairs, ttlSeconds);
  }

  async getBulkStockData(symbols: string[]): Promise<Record<string, any>> {
    const keys = symbols.map(symbol => `stock:${symbol}`);
    const values = await this.mget(keys);
    
    const result: Record<string, any> = {};
    symbols.forEach((symbol, index) => {
      if (values[index] !== null) {
        result[symbol] = values[index];
      }
    });
    
    return result;
  }

  async invalidateStockData(symbol: string): Promise<boolean> {
    return this.del(`stock:${symbol}`);
  }

  async invalidateAllStockData(): Promise<boolean> {
    try {
      const keys = await this.keys('stock:*');
      if (keys.length === 0) {
        return true;
      }
      
      const pipeline = this.client!.pipeline();
      keys.forEach(key => pipeline.del(key));
      await pipeline.exec();
      
      return true;
    } catch (error) {
      logger.error('Error invalidating all stock data:', error as Error);
      return false;
    }
  }
}

// Singleton instance
let redisService: RedisService | null = null;

export function getRedisService(): RedisService {
  if (!redisService) {
    redisService = new RedisService();
  }
  return redisService;
}

export { RedisService, RedisConfig, RedisStats };