import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';

interface PerformanceMetrics {
  requestCount: number;
  totalResponseTime: number;
  averageResponseTime: number;
  slowRequests: number;
  errorCount: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  uptime: number;
}

interface RequestMetrics {
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
  userAgent?: string;
  ip: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private requestHistory: RequestMetrics[];
  private readonly maxHistorySize = 1000;
  private readonly slowRequestThreshold = 1000; // 1 second
  private startTime: number;
  private lastCpuUsage: NodeJS.CpuUsage;

  constructor() {
    this.metrics = {
      requestCount: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      errorCount: 0,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: 0
    };
    this.requestHistory = [];
    this.startTime = Date.now();
    this.lastCpuUsage = process.cpuUsage();

    // Update system metrics every 30 seconds
    setInterval(() => {
      this.updateSystemMetrics();
    }, 30000);
  }

  private updateSystemMetrics(): void {
    this.metrics.memoryUsage = process.memoryUsage();
    this.metrics.cpuUsage = process.cpuUsage(this.lastCpuUsage);
    this.metrics.uptime = Date.now() - this.startTime;
    this.lastCpuUsage = process.cpuUsage();
  }

  recordRequest(req: Request, res: Response, responseTime: number): void {
    this.metrics.requestCount++;
    this.metrics.totalResponseTime += responseTime;
    this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.requestCount;

    if (responseTime > this.slowRequestThreshold) {
      this.metrics.slowRequests++;
    }

    if (res.statusCode >= 400) {
      this.metrics.errorCount++;
    }

    const requestMetric: RequestMetrics = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      timestamp: new Date(),
      userAgent: req.get('User-Agent') || 'unknown',
      ip: req.ip || (req.socket && req.socket.remoteAddress) || 'unknown'
    };

    this.requestHistory.push(requestMetric);

    // Keep history size manageable
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory = this.requestHistory.slice(-this.maxHistorySize);
    }
  }

  getMetrics(): PerformanceMetrics {
    this.updateSystemMetrics();
    return { ...this.metrics };
  }

  getRequestHistory(limit: number = 100): RequestMetrics[] {
    return this.requestHistory.slice(-limit);
  }

  getSlowRequests(threshold: number = this.slowRequestThreshold): RequestMetrics[] {
    return this.requestHistory.filter(req => req.responseTime > threshold);
  }

  getErrorRequests(): RequestMetrics[] {
    return this.requestHistory.filter(req => req.statusCode >= 400);
  }

  reset(): void {
    this.metrics = {
      requestCount: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      errorCount: 0,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: 0
    };
    this.requestHistory = [];
    this.startTime = Date.now();
    this.lastCpuUsage = process.cpuUsage();
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Performance monitoring middleware
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = performance.now();

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(this: Response, chunk?: unknown, encoding?: BufferEncoding | (() => void), cb?: () => void): Response {
    const endTime = performance.now();
    const responseTime = endTime - startTime;

    // Record the request metrics
    performanceMonitor.recordRequest(req, res, responseTime);

    // Call original end method
    if (chunk !== undefined && typeof encoding === 'string') {
          return originalEnd.call(this, chunk, encoding as any, cb);
        } else if (chunk !== undefined) {
          return originalEnd.call(this, chunk, undefined as any, typeof encoding === 'function' ? encoding : cb);
        } else {
          return originalEnd.call(this, undefined as any, undefined as any, typeof encoding === 'function' ? encoding : cb);
        }
  };

  next();
};

// Health check middleware
export const healthCheck = (_req: Request, res: Response): void => {
  const metrics = performanceMonitor.getMetrics();
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: metrics.uptime,
    memory: {
      used: Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024),
      total: Math.round(metrics.memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(metrics.memoryUsage.external / 1024 / 1024)
    },
    requests: {
      total: metrics.requestCount,
      averageResponseTime: Math.round(metrics.averageResponseTime),
      slowRequests: metrics.slowRequests,
      errorCount: metrics.errorCount
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    }
  };

  // Determine health status
  if (metrics.averageResponseTime > 2000 || metrics.memoryUsage.heapUsed > 500 * 1024 * 1024) {
    health.status = 'degraded';
    res.status(503);
  } else {
    res.status(200);
  }

  res.json(health);
};

// Metrics endpoint
export const metricsEndpoint = (req: Request, res: Response): void => {
  const metrics = performanceMonitor.getMetrics();
  const limit = parseInt(req.query['limit'] as string) || 100;
  
  const response = {
    metrics,
    recentRequests: performanceMonitor.getRequestHistory(limit),
    slowRequests: performanceMonitor.getSlowRequests(),
    errorRequests: performanceMonitor.getErrorRequests()
  };

  res.json(response);
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const { method, originalUrl, ip } = req;
  const userAgent = req.get('User-Agent') || 'unknown';

  console.log(`[${new Date().toISOString()}] ${method} ${originalUrl} - ${ip} - ${userAgent}`);

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { statusCode } = res;
    
    console.log(
      `[${new Date().toISOString()}] ${method} ${originalUrl} - ${statusCode} - ${duration}ms`
    );
  });

  next();
};

export { PerformanceMetrics, RequestMetrics };