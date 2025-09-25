import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import stockRoutes from './routes/stocks';
import bulkRoutes from './routes/bulk';
import schedulerRoutes from './routes/scheduler';
import errorHandlingRoutes from './routes/errorHandling';
import realTimePollingRoutes from './routes/realTimePolling';
import cacheRoutes from './routes/cache';
import redisRoutes from './routes/redis';
import loggingRoutes from './routes/logging';
import websocketRoutes from './routes/websocket';
import stocksRoutes from './routes/stocks';
import { wsManager } from './routes/websocket';
import { RealTimeDataService } from './services/realTimeDataService';
import { AdvancedLoggerService } from './services/advancedLoggerService';
import { ErrorHandlingService } from './services/errorHandlingService';
import realtimeRoutes from './routes/realtime';
import logRoutes from './routes/logs';
import portMonitorRoutes from './routes/portMonitor';
import tradingSignalsRoutes from './routes/tradingSignals';
import aiPatternsRoutes from './routes/aiPatterns';
import dataManagementRoutes from './routes/dataManagement';
import StockScraper from './services/stockScraper';
import { bulkDataService } from './services/bulkDataService';
import { getSchedulerService } from './services/schedulerService';
import { getRealTimePollingService } from './services/realTimePollingService';
import { RedisService } from './services/redisService';
import { DataSourceService } from './services/dataSourceService';
import logger from './utils/logger';

import { FinancialCalculator } from './services/financialCalculator';
import apiProvider from './services/apiProvider';

import { securityHeaders, sanitizeInput } from './middleware/validation';
import { errorHandler as errorHandlerMiddleware, notFoundHandler, handleUnhandledRejection, handleUncaughtException } from './middleware/errorHandler';
import { performanceMiddleware, healthCheck, metricsEndpoint, requestLogger } from './middleware/monitoring';
import { getCacheStats, cache } from './middleware/cache';

const stockScraper = new StockScraper();
const financialCalculator = new FinancialCalculator();

// Initialize services
const schedulerService = getSchedulerService(bulkDataService);

// Start auto-updates and scheduler
bulkDataService.startAutoUpdate();
schedulerService.start();

// Initialize Redis service
// Initialize services
const advancedLogger = new AdvancedLoggerService();
const redisService = new RedisService(logger);
const errorHandler = new ErrorHandlingService(advancedLogger, redisService);
const dataSourceService = new DataSourceService(advancedLogger, redisService, errorHandler);
const redisConnected = await redisService.connect();
if (redisConnected) {
  logger.info('Redis service connected successfully');
} else {
  logger.warn('Redis service connection failed, continuing without Redis cache');
}

// Services are already initialized above

// Initialize and start real-time polling service
const realTimePollingService = getRealTimePollingService();
realTimePollingService.start();

// Load environment variables
dotenv.config();

const app = express();

const PORT = process.env['PORT'] || 3001;
const FRONTEND_URL = process.env['FRONTEND_URL'] || 'http://localhost:5173';
const NODE_ENV = process.env['NODE_ENV'] || 'development';

// Setup global error handlers
handleUnhandledRejection();
handleUncaughtException();

// Rate Limiter - More permissive settings for development
const rateLimiter = new RateLimiterMemory({
  points: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '1000'), // Increased from 100 to 1000
  duration: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '60000') / 1000, // Reduced from 15 minutes to 1 minute
});

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Performance and logging middleware
app.use(performanceMiddleware);
app.use(requestLogger);

// Custom security headers
app.use(securityHeaders);

// Input sanitization
app.use(sanitizeInput);

// Rate limiting middleware - Skip for health and metrics endpoints
app.use(async (req, res, next) => {
  // Skip rate limiting for health and metrics endpoints
  if (req.path === '/health' || req.path === '/api/health' || req.path === '/api/metrics' || req.path === '/api/cache/stats') {
    return next();
  }
  
  try {
    await rateLimiter.consume(req.ip || 'unknown');
    next();
  } catch (rejRes) {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.round((rejRes as any).msBeforeNext / 1000)
    });
  }
});

// CORS Configuration
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = NODE_ENV === 'production' 
      ? [FRONTEND_URL] 
      : [FRONTEND_URL, 'http://localhost:3000', 'http://localhost:8765', 'http://127.0.0.1:8765'];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400 // 24 hours
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (_req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    environment: process.env['NODE_ENV'] || 'development',
    version: process.env['npm_package_version'] || '1.0.0',
    memory: process.memoryUsage(),
    providers: {} // Will be populated by provider health checks
  };
  
  try {
    res.status(200).json(healthCheck);
  } catch (error) {
    healthCheck.message = 'ERROR';
    res.status(503).json(healthCheck);
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/bulk', bulkRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/error-handling', errorHandlingRoutes);
app.use('/api/polling', realTimePollingRoutes);
app.use('/api/cache', cacheRoutes);
app.use('/api/redis', redisRoutes);
app.use('/api/logging', loggingRoutes);
app.use('/api/websocket', websocketRoutes);
app.use('/api/stocks', stocksRoutes);
app.use('/api/realtime', realtimeRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/port-monitor', portMonitorRoutes);
app.use('/api/trading-signals', tradingSignalsRoutes);
app.use('/api/ai-patterns', aiPatternsRoutes);
app.use('/api/data-management', dataManagementRoutes);

// Health and monitoring routes
app.get('/api/health', healthCheck);
app.get('/api/metrics', metricsEndpoint);

// Cache management routes
app.get('/api/cache/stats', getCacheStats);

app.delete('/api/cache/clear', (_req, res) => {
  cache.clear();
  res.json({ success: true, message: 'Cache cleared successfully' });
});

app.delete('/api/cache/invalidate/:pattern', (req, res) => {
  const { pattern } = req.params;
  const stats = cache.getStats();
  const keysToDelete = stats.keys.filter((key: string) => key.includes(pattern));
  keysToDelete.forEach((key: string) => cache.delete(key));
  res.json({ 
    success: true, 
    message: `Invalidated ${keysToDelete.length} cache entries matching pattern '${pattern}'`,
    deletedKeys: keysToDelete
  });
});

// Ana sayfa
app.get('/', (_req, res) => {
  res.json({
    message: 'Borsa Hisse Mali Tablo Analiz Sistemi API',
    version: '1.0.0',
    endpoints: {
      stocks: '/api/stocks',
    realtime: '/api/realtime',
      bulk: '/api/bulk',
      scheduler: '/api/scheduler',
      errorHandling: '/api/error-handling',
      polling: '/api/polling',
      auth: '/api/auth',
      cache: '/api/cache',
      redis: '/api/redis',
  logging: '/api/logging',
  websocket: '/api/websocket',
  stocks: '/api/stocks'
    },
    websocket: 'Socket.IO aktif',
    status: 'Çalışıyor'
  });
});

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandlerMiddleware);

// Socket.IO functionality is handled by separate socket-server.ts

// Periodic data updates are handled by separate socket-server.ts

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('API Server kapatılıyor...');
  await stockScraper.closeBrowser();
  process.exit(0);
});

const server = app.listen(PORT, async () => { 
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📈 API endpoints available at: http://localhost:${PORT}/api`);
  console.log(`🔄 Real-time polling active`);
  console.log(`⚡ Socket.IO server ready`);
  
  // Initialize WebSocket server
  wsManager.initialize(server);
  console.log(`🌐 WebSocket server initialized at ws://localhost:${PORT}/ws/stocks`);
  
  // Start real-time data service
  try {
    const realTimeService = new RealTimeDataService(advancedLogger, redisService, errorHandler);
    await realTimeService.start();
    logger.info('Real-time data service started');
  } catch (error) {
    logger.error('Failed to start real-time data service:', error);
  }
});