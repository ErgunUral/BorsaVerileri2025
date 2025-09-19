import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import stockRoutes from './routes/stocks.js';
import logRoutes from './routes/logs.js';
import portMonitorRoutes from './routes/portMonitor.js';
import { StockScraper } from './services/stockScraper.js';

import { FinancialCalculator } from './services/financialCalculator.js';
import apiProvider from './services/apiProvider.js';

import { securityHeaders, sanitizeInput } from './middleware/validation.js';
import { errorHandler, notFoundHandler, handleUnhandledRejection, handleUncaughtException } from './middleware/errorHandler.js';
import { performanceMiddleware, healthCheck, metricsEndpoint, requestLogger } from './middleware/monitoring.js';

const stockScraper = new StockScraper();
const financialCalculator = new FinancialCalculator();

// Load environment variables
dotenv.config();

const app = express();

const PORT = process.env['PORT'] || 3001;
const FRONTEND_URL = process.env['FRONTEND_URL'] || 'http://localhost:5173';
const NODE_ENV = process.env['NODE_ENV'] || 'development';

// Setup global error handlers
handleUnhandledRejection();
handleUncaughtException();

// Rate Limiter
const rateLimiter = new RateLimiterMemory({
  points: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100'),
  duration: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000') / 1000,
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

// Rate limiting middleware
app.use(async (req, res, next) => {
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
app.use('/api/logs', logRoutes);
app.use('/api/port-monitor', portMonitorRoutes);

// Health and monitoring routes
app.get('/api/health', healthCheck);
app.get('/api/metrics', metricsEndpoint);

// Cache management routes
app.get('/api/cache/stats', (req, res) => {
  const { getCacheStats } = require('./middleware/cache.js');
  getCacheStats(req, res);
});

app.delete('/api/cache/clear', (_req, res) => {
  const { cache } = require('./middleware/cache.js');
  cache.clear();
  res.json({ success: true, message: 'Cache cleared successfully' });
});

app.delete('/api/cache/invalidate/:pattern', (req, res) => {
  const { cache } = require('./middleware/cache.js');
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
      auth: '/api/auth'
    },
    websocket: 'Socket.IO aktif',
    status: 'Çalışıyor'
  });
});

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

// Socket.IO functionality is handled by separate socket-server.ts

// Periodic data updates are handled by separate socket-server.ts

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('API Server kapatılıyor...');
  await stockScraper.closeBrowser();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 API Server ${PORT} portunda çalışıyor`);
  console.log(`📡 Socket.IO Server ayrı olarak 9876 portunda çalışıyor`);
});