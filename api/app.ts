/**
 * This is a API server
 */

import express, { type Request, type Response, type NextFunction }  from 'express';
import cors from 'cors';
// import path from 'path';
import dotenv from 'dotenv';
// import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import stockRoutes from './routes/stocks.js';
import logRoutes from './routes/logs.js';
import portMonitorRoutes from './routes/portMonitor.js';
import { performanceMiddleware } from './middleware/monitoring.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// for esm mode
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// load env
dotenv.config();


const app: express.Application = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Performance monitoring middleware
app.use(performanceMiddleware);

/**
 * API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/port-monitor', portMonitorRoutes);

/**
 * health
 */
app.use('/api/health', (_req: Request, res: Response, _next: NextFunction): void => {
  res.status(200).json({
    success: true,
    message: 'ok'
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler middleware
app.use(errorHandler);

export default app;