/**
 * This is a API server
 */

import express, { type Request, type Response, type NextFunction }  from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
// import path from 'path';
import dotenv from 'dotenv';
// import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import stockRoutes from './routes/stocks.js';
import logRoutes from './routes/logs.js';
import portMonitorRoutes from './routes/portMonitor.js';
import technicalAnalysisRoutes from './routes/technicalAnalysis.js';
import patternRecognitionRoutes from './routes/patternRecognition.js';
import advancedPatternsRoutes from './routes/advancedPatterns.js';
import tradingSignalsRoutes from './routes/tradingSignals.js';
import aiPatternsRoutes from './routes/aiPatterns.js';
import figmaRoutes from './routes/figma';
import componentMappingRoutes from './routes/componentMapping';
import dataManagementRoutes from './routes/dataManagement.js';
import logger, { requestLogger, errorLogger } from './utils/logger.js';
import { performanceMiddleware, healthCheck, metricsEndpoint } from './middleware/monitoring.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { getCacheStats } from './middleware/cache.js';

// for esm mode
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// load env
dotenv.config();


const app: express.Application = express();
const PORT = process.env.PORT || 3001;

// Logging middleware (en başta olmalı)
app.use(requestLogger);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Performance monitoring middleware
app.use(performanceMiddleware);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/portfolio-monitor', portMonitorRoutes);
app.use('/api/technical-analysis', technicalAnalysisRoutes);
app.use('/api/pattern-recognition', patternRecognitionRoutes);
app.use('/api/advanced-patterns', advancedPatternsRoutes);
app.use('/api/trading-signals', tradingSignalsRoutes);
app.use('/api/ai-patterns', aiPatternsRoutes);
app.use('/api/figma', figmaRoutes);
app.use('/api/component-mapping', componentMappingRoutes);
app.use('/api/data-management', dataManagementRoutes);

/**
 * Health and monitoring endpoints
 */
app.get('/api/health', healthCheck);
app.get('/api/metrics', metricsEndpoint);
app.get('/api/cache/stats', getCacheStats);

// 404 handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorLogger);
app.use((err: any, req: any, res: any, next: any) => {
  logger.error('Unhandled error', err, {
    url: req.url,
    method: req.method,
    requestId: req.requestId
  });
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Error handler middleware
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

export default app;