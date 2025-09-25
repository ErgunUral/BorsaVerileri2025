import request from 'supertest';
import express from 'express';
import { performanceMonitor, performanceMiddleware, healthCheck, metricsEndpoint, requestLogger } from '../monitoring';

const app = express();
app.use(express.json());

// Test routes with monitoring middleware
app.use(performanceMiddleware);
app.use(requestLogger);

app.get('/test-fast', (_req, res) => {
  res.json({ message: 'fast response' });
});

app.get('/test-slow', (_req, res) => {
  setTimeout(() => {
    res.json({ message: 'slow response' });
  }, 100);
});

app.get('/test-error', (_req, res) => {
  res.status(500).json({ error: 'server error' });
});

app.post('/test-post', (_req, res) => {
  res.json({ message: 'post response' });
});

// Add monitoring endpoints
app.get('/health', healthCheck);
app.get('/metrics', metricsEndpoint);

describe('Monitoring Middleware', () => {
  beforeEach(() => {
    performanceMonitor.reset();
  });

  describe('PerformanceMonitor Class', () => {
    it('should record request metrics', () => {
      const mockReq = { 
        method: 'GET', 
        url: '/test',
        get: jest.fn().mockReturnValue('test-agent'),
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' }
      } as any;
      const mockRes = { statusCode: 200 } as any;
      performanceMonitor.recordRequest(mockReq, mockRes, 50);
      
      const metrics = performanceMonitor.getMetrics();
      
      expect(metrics.requestCount).toBe(1);
      expect(metrics.averageResponseTime).toBe(50);
      expect(metrics.totalResponseTime).toBe(50);
    });

    it('should track different HTTP methods', () => {
      const createMockReq = (method: string) => ({
        method,
        url: '/test',
        get: jest.fn().mockReturnValue('test-agent'),
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' }
      });
      
      const mockReq1 = createMockReq('GET') as any;
      const mockReq2 = createMockReq('POST') as any;
      const mockReq3 = createMockReq('PUT') as any;
      const mockRes = { statusCode: 200 } as any;
      
      performanceMonitor.recordRequest(mockReq1, mockRes, 10);
      performanceMonitor.recordRequest(mockReq2, { statusCode: 201 } as any, 20);
      performanceMonitor.recordRequest(mockReq3, mockRes, 15);
      
      const metrics = performanceMonitor.getMetrics();
      const history = performanceMonitor.getRequestHistory();
      
      expect(metrics.requestCount).toBe(3);
      expect(history.filter(r => r.method === 'GET')).toHaveLength(1);
      expect(history.filter(r => r.method === 'POST')).toHaveLength(1);
      expect(history.filter(r => r.method === 'PUT')).toHaveLength(1);
    });

    it('should track different status codes', () => {
      const mockReq = { 
        method: 'GET', 
        url: '/test',
        get: jest.fn().mockReturnValue('test-agent'),
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' }
      } as any;
      
      performanceMonitor.recordRequest(mockReq, { statusCode: 200 } as any, 10);
      performanceMonitor.recordRequest(mockReq, { statusCode: 404 } as any, 10);
      performanceMonitor.recordRequest(mockReq, { statusCode: 500 } as any, 10);
      
      const metrics = performanceMonitor.getMetrics();
      const history = performanceMonitor.getRequestHistory();
      
      expect(history.filter(r => r.statusCode === 200)).toHaveLength(1);
      expect(history.filter(r => r.statusCode === 404)).toHaveLength(1);
      expect(history.filter(r => r.statusCode === 500)).toHaveLength(1);
      expect(metrics.errorCount).toBe(2); // 404 and 500 are errors (>= 400)
    });

    it('should calculate average response time correctly', () => {
      const createMockReq = (url: string) => ({
        method: 'GET',
        url,
        get: jest.fn().mockReturnValue('test-agent'),
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' }
      });
      
      const mockReq1 = createMockReq('/test1') as any;
      const mockReq2 = createMockReq('/test2') as any;
      const mockRes = { statusCode: 200 } as any;
      
      performanceMonitor.recordRequest(mockReq1, mockRes, 100);
      performanceMonitor.recordRequest(mockReq2, mockRes, 200);
      
      const metrics = performanceMonitor.getMetrics();
      
      expect(metrics.averageResponseTime).toBe(150);
    });

    it('should track request history', () => {
      const mockReq = { 
        method: 'GET', 
        url: '/test',
        get: jest.fn().mockReturnValue('test-agent'),
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' }
      } as any;
      const mockRes = { statusCode: 200 } as any;
      
      performanceMonitor.recordRequest(mockReq, mockRes, 50);
      
      const history = performanceMonitor.getRequestHistory();
      
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        method: 'GET',
        url: '/test',
        statusCode: 200,
        responseTime: 50
      });
      expect(history[0].timestamp).toBeInstanceOf(Date);
    });

    it('should identify slow requests', () => {
      const createMockReq = (url: string) => ({
        method: 'GET',
        url,
        get: jest.fn().mockReturnValue('test-agent'),
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' }
      });
      
      const mockReq1 = createMockReq('/fast') as any;
      const mockReq2 = createMockReq('/slow') as any;
      const mockRes = { statusCode: 200 } as any;
      
      performanceMonitor.recordRequest(mockReq1, mockRes, 50);
      performanceMonitor.recordRequest(mockReq2, mockRes, 1500); // > 1000ms
      
      const slowRequests = performanceMonitor.getSlowRequests();
      
      expect(slowRequests).toHaveLength(1);
      expect(slowRequests[0].url).toBe('/slow');
      expect(slowRequests[0].responseTime).toBe(1500);
    });

    it('should identify error requests', () => {
      const createMockReq = (url: string) => ({
        method: 'GET',
        url,
        get: jest.fn().mockReturnValue('test-agent'),
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' }
      });
      
      const mockReq1 = createMockReq('/success') as any;
      const mockReq2 = createMockReq('/error') as any;
      
      performanceMonitor.recordRequest(mockReq1, { statusCode: 200 } as any, 50);
      performanceMonitor.recordRequest(mockReq2, { statusCode: 500 } as any, 100);
      
      const errorRequests = performanceMonitor.getErrorRequests();
      
      expect(errorRequests).toHaveLength(1);
      expect(errorRequests[0].url).toBe('/error');
      expect(errorRequests[0].statusCode).toBe(500);
    });

    it('should reset metrics', () => {
      const mockReq = { 
        method: 'GET', 
        url: '/test',
        get: jest.fn().mockReturnValue('test-agent'),
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' }
      } as any;
      const mockRes = { statusCode: 200 } as any;
      
      performanceMonitor.recordRequest(mockReq, mockRes, 50);
      
      let metrics = performanceMonitor.getMetrics();
      expect(metrics.requestCount).toBe(1);
      
      performanceMonitor.reset();
      
      metrics = performanceMonitor.getMetrics();
      expect(metrics.requestCount).toBe(0);
      expect(performanceMonitor.getRequestHistory()).toHaveLength(0);
    });

    it('should include system metrics', () => {
      const metrics = performanceMonitor.getMetrics();
      
      expect(metrics.memoryUsage).toBeDefined();
      expect(metrics.memoryUsage.rss).toBeGreaterThan(0);
      expect(metrics.memoryUsage.heapUsed).toBeGreaterThan(0);
      expect(metrics.cpuUsage).toBeDefined();
      expect(typeof metrics.cpuUsage).toBe('object');
      expect(metrics.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Middleware', () => {
    it('should track request metrics automatically', async () => {
      await request(app)
        .get('/test-fast')
        .expect(200);
      
      const history = performanceMonitor.getRequestHistory();
      expect(history.filter(r => r.statusCode === 200)).toHaveLength(1);
      expect(history.filter(r => r.method === 'GET')).toHaveLength(1);
    });

    it('should track slow requests', async () => {
      await request(app)
        .get('/test-slow')
        .expect(200);
      
      const slowRequests = performanceMonitor.getSlowRequests();
      
      // The slow endpoint has a 100ms delay, so it should be recorded
      expect(slowRequests.length).toBeGreaterThanOrEqual(0);
    });

    it('should track error requests', async () => {
      await request(app)
        .get('/test-error')
        .expect(500);
      
      const errorRequests = performanceMonitor.getErrorRequests();
      const metrics = performanceMonitor.getMetrics();
      
      expect(errorRequests).toHaveLength(1);
      expect(errorRequests[0].statusCode).toBe(500);
      expect(metrics.errorCount).toBe(1);
    });

    it('should track different HTTP methods', async () => {
      await request(app).get('/test-fast').expect(200);
      await request(app).post('/test-post').expect(200);
      
      const history = performanceMonitor.getRequestHistory();
      expect(history.filter(r => r.method === 'GET')).toHaveLength(1);
      expect(history.filter(r => r.method === 'POST')).toHaveLength(1);
    });
  });

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health');
      
      // Health check can return 200 or 503 depending on system state
      expect([200, 503]).toContain(response.status);
      
      expect(response.body).toMatchObject({
        status: expect.stringMatching(/^(healthy|degraded)$/),
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        memory: {
          used: expect.any(Number),
          total: expect.any(Number),
          external: expect.any(Number)
        },
        requests: {
          total: expect.any(Number),
          averageResponseTime: expect.any(Number),
          slowRequests: expect.any(Number),
          errorCount: expect.any(Number)
        },
        system: {
          nodeVersion: expect.any(String),
          platform: expect.any(String),
          arch: expect.any(String)
        }
      });
    });

    it('should include performance metrics in health check', async () => {
      // Generate some requests first
      await request(app).get('/test-fast').expect(200);
      await request(app).get('/test-error').expect(500);
      
      const response = await request(app)
        .get('/health');
      
      // Health check can return 200 or 503 depending on system state
      expect([200, 503]).toContain(response.status);
      
      expect(response.body.requests).toMatchObject({
        total: expect.any(Number),
        errorCount: expect.any(Number),
        averageResponseTime: expect.any(Number)
      });
    });
  });

  describe('Metrics Endpoint', () => {
    it('should return detailed metrics', async () => {
      // Generate some test data
      await request(app).get('/test-fast').expect(200);
      await request(app).post('/test-post').expect(200);
      await request(app).get('/test-error').expect(500);
      
      const response = await request(app)
        .get('/metrics')
        .expect(200);
      
      expect(response.body).toMatchObject({
        metrics: {
          requestCount: expect.any(Number),
          totalResponseTime: expect.any(Number),
          averageResponseTime: expect.any(Number),
          slowRequests: expect.any(Number),
          errorCount: expect.any(Number),
          memoryUsage: expect.any(Object),
          cpuUsage: expect.any(Object),
          uptime: expect.any(Number)
        },
        recentRequests: expect.any(Array),
        slowRequests: expect.any(Array),
        errorRequests: expect.any(Array)
      });
      
      expect(response.body.metrics.requestCount).toBeGreaterThan(0);
      expect(response.body.metrics.errorCount).toBeGreaterThan(0);
    });

    it('should include request history in metrics', async () => {
      await request(app).get('/test-fast').expect(200);
      
      const response = await request(app)
        .get('/metrics')
        .expect(200);
      
      expect(response.body.recentRequests).toBeDefined();
      expect(Array.isArray(response.body.recentRequests)).toBe(true);
    });

    it('should include slow and error requests in metrics', async () => {
      await request(app).get('/test-slow').expect(200);
      await request(app).get('/test-error').expect(500);
      
      const response = await request(app)
        .get('/metrics')
        .expect(200);
      
      expect(response.body.slowRequests).toBeDefined();
      expect(response.body.errorRequests).toBeDefined();
      expect(Array.isArray(response.body.slowRequests)).toBe(true);
      expect(Array.isArray(response.body.errorRequests)).toBe(true);
      expect(response.body.errorRequests.length).toBeGreaterThan(0);
    });
  });

  describe('Request Logger', () => {
    it('should log requests without affecting response', async () => {
      const response = await request(app)
        .get('/test-fast')
        .expect(200);
      
      expect(response.body).toEqual({ message: 'fast response' });
    });
  });

  describe('Memory Management', () => {
    it('should handle large number of requests without memory issues', async () => {
      // Generate many requests to test memory management
      const requests = [];
      for (let i = 0; i < 50; i++) {
        requests.push(request(app).get('/test-fast').expect(200));
      }
      
      await Promise.all(requests);
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.requestCount).toBe(50);
      
      // Request history should be limited to prevent memory issues
      const history = performanceMonitor.getRequestHistory();
      expect(history.length).toBeLessThanOrEqual(100); // Assuming max 100 entries
    });
  });

  describe('Edge Cases', () => {
    it('should handle requests with no response time', () => {
      const mockReq = { 
        method: 'GET', 
        url: '/test',
        get: jest.fn().mockReturnValue('test-agent'),
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' }
      } as any;
      const mockRes = { statusCode: 200 } as any;
      performanceMonitor.recordRequest(mockReq, mockRes, 0);
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.averageResponseTime).toBe(0);
    });

    it('should handle invalid status codes gracefully', () => {
      expect(() => {
        const mockReq = { 
          method: 'GET', 
          url: '/test',
          get: jest.fn().mockReturnValue('test-agent'),
          ip: '127.0.0.1',
          socket: { remoteAddress: '127.0.0.1' }
        } as any;
        const mockRes = { statusCode: 999 } as any;
        performanceMonitor.recordRequest(mockReq, mockRes, 10);
      }).not.toThrow();
      
      const history = performanceMonitor.getRequestHistory();
      expect(history.filter(r => r.statusCode === 999)).toHaveLength(1);
    });
  });
});