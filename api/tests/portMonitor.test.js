// Port Monitor API Tests
const request = require('supertest');
const express = require('express');

// Mock services for testing
const MockPortMonitorService = jest.fn().mockImplementation(() => ({
  checkPort: jest.fn().mockResolvedValue({
    id: 'test-result-id',
    portConfigId: 'test-port-id',
    host: 'localhost',
    port: 8080,
    status: 'online',
    responseTime: 150,
    timestamp: new Date().toISOString()
  }),
  validatePortConfig: jest.fn(),
  getPortStats: jest.fn()
}));

const MockPortSchedulerService = jest.fn().mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  isRunning: jest.fn(),
  getStatus: jest.fn(),
  addJob: jest.fn().mockReturnValue(true),
  removeJob: jest.fn().mockReturnValue(true),
  getJobs: jest.fn().mockReturnValue([])
}));

const MockAlertService = jest.fn().mockImplementation(() => ({
  sendAlert: jest.fn(),
  getAlertHistory: jest.fn(),
  processPortCheckResult: jest.fn().mockResolvedValue({ alertSent: false })
}));

const MockReportingService = jest.fn().mockImplementation(() => ({
  generateReport: jest.fn(),
  getSystemSummary: jest.fn(),
  getSystemStats: jest.fn().mockResolvedValue({
    totalPorts: 5,
    onlinePorts: 4,
    offlinePorts: 1,
    totalChecks: 1000,
    successfulChecks: 850,
    failedChecks: 150,
    averageResponseTime: 200,
    uptime: 85.0
  }),
  getPortHistory: jest.fn().mockResolvedValue([])
}));

// Test app oluştur
const app = express();
app.use(express.json());

// Mock route handlers
app.post('/api/port-monitor/check', async (req, res) => {
  const { host, port, timeout } = req.body;
  const mockService = new MockPortMonitorService();
  const result = await mockService.checkPort(host, port, timeout);
  res.json({ success: true, data: result });
});

app.get('/api/port-monitor/stats', async (req, res) => {
  const mockService = new MockReportingService();
  const stats = await mockService.getSystemStats();
  res.json({ success: true, data: stats });
});

app.get('/api/port-monitor/scheduler/status', (req, res) => {
  res.json({ success: true, data: { running: true, jobCount: 3 } });
});

app.post('/api/port-monitor/scheduler/toggle', (req, res) => {
  res.json({ success: true, data: { running: false } });
});

// Test setup complete

describe('Port Monitor API Tests', () => {
  let mockPortMonitor;
  let mockScheduler;
  let mockAlertService;
  let mockReportingService;

  beforeEach(() => {
    // Mock instances oluştur
    mockPortMonitor = {
      checkPort: jest.fn(),
      checkPortConfig: jest.fn(),
      checkMultiplePorts: jest.fn(),
      getPortConfigs: jest.fn(),
      addPortConfig: jest.fn(),
      updatePortConfig: jest.fn(),
      deletePortConfig: jest.fn(),
      getPortConfig: jest.fn()
    };

    mockScheduler = {
      start: jest.fn(),
      stop: jest.fn(),
      isRunning: jest.fn(),
      addJob: jest.fn(),
      removeJob: jest.fn(),
      getJobs: jest.fn(),
      getStats: jest.fn()
    };

    mockAlertService = {
      processPortCheckResult: jest.fn(),
      getAlertHistory: jest.fn(),
      getAlertStats: jest.fn()
    };

    mockReportingService = {
      addPortCheckLog: jest.fn(),
      getPortCheckHistory: jest.fn(),
      getSystemStats: jest.fn(),
      generateReport: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/port-monitor/configs', () => {
    it('should create a new port configuration', async () => {
      const newConfig = {
        name: 'Test Port',
        host: 'localhost',
        port: 8080,
        timeout: 5000,
        retryCount: 3,
        retryDelay: 1000,
        enabled: true,
        tags: ['test']
      };

      const createdConfig = {
        id: 'test-id',
        ...newConfig,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockPortMonitor.addPortConfig.mockResolvedValue(createdConfig);

      const response = await request(app)
        .post('/api/port-monitor/configs')
        .send(newConfig)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(createdConfig);
      expect(mockPortMonitor.addPortConfig).toHaveBeenCalledWith(newConfig);
    });

    it('should return 400 for invalid port configuration', async () => {
      const invalidConfig = {
        name: '',
        host: 'localhost',
        port: 'invalid'
      };

      const response = await request(app)
        .post('/api/port-monitor/configs')
        .send(invalidConfig)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('validation');
    });
  });

  describe('POST /api/port-monitor/check/:id', () => {
    it('should perform manual port check', async () => {
      const portId = 'test-port-id';
      const checkResult = {
        id: 'check-id',
        portConfigId: portId,
        host: 'localhost',
        port: 8080,
        status: 'online',
        responseTime: 150,
        timestamp: new Date().toISOString()
      };

      mockPortMonitor.checkPortConfig.mockResolvedValue(checkResult);
      mockReportingService.addPortCheckLog.mockResolvedValue(true);
      mockAlertService.processPortCheckResult.mockResolvedValue(true);

      const response = await request(app)
        .post(`/api/port-monitor/check/${portId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(checkResult);
      expect(mockPortMonitor.checkPortConfig).toHaveBeenCalledWith(portId);
      expect(mockReportingService.addPortCheckLog).toHaveBeenCalledWith(checkResult);
      expect(mockAlertService.processPortCheckResult).toHaveBeenCalledWith(checkResult);
    });

    it('should return 404 for non-existent port', async () => {
      const portId = 'non-existent-id';
      mockPortMonitor.checkPortConfig.mockRejectedValue(new Error('Port configuration not found'));

      const response = await request(app)
        .post(`/api/port-monitor/check/${portId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /api/port-monitor/status', () => {
    it('should return system status with port statuses', async () => {
      const mockConfigs = [
        {
          id: 'port1',
          name: 'Test Port 1',
          host: 'localhost',
          port: 8080,
          enabled: true
        },
        {
          id: 'port2',
          name: 'Test Port 2',
          host: 'localhost',
          port: 8081,
          enabled: true
        }
      ];

      const mockSystemStats = {
        totalPorts: 2,
        onlinePorts: 1,
        offlinePorts: 1,
        totalChecks: 100,
        successfulChecks: 85,
        failedChecks: 15,
        averageResponseTime: 200,
        uptime: 85.0
      };

      const mockPortStatuses = [
        {
          config: mockConfigs[0],
          lastResult: {
            status: 'online',
            responseTime: 150,
            timestamp: new Date().toISOString()
          },
          isScheduled: true
        },
        {
          config: mockConfigs[1],
          lastResult: {
            status: 'offline',
            error: 'Connection refused',
            timestamp: new Date().toISOString()
          },
          isScheduled: true
        }
      ];

      mockPortMonitor.getPortConfigs.mockResolvedValue(mockConfigs);
      mockReportingService.getSystemStats.mockResolvedValue(mockSystemStats);
      mockScheduler.getJobs.mockResolvedValue(['port1', 'port2']);
      mockReportingService.getPortCheckHistory.mockResolvedValue({
        port1: [mockPortStatuses[0].lastResult],
        port2: [mockPortStatuses[1].lastResult]
      });

      const response = await request(app)
        .get('/api/port-monitor/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.systemStats).toEqual(mockSystemStats);
      expect(response.body.data.ports).toHaveLength(2);
      expect(response.body.data.ports[0].config.id).toBe('port1');
      expect(response.body.data.ports[0].lastResult.status).toBe('online');
    });
  });

  describe('POST /api/port-monitor/scheduler/start', () => {
    it('should start the scheduler', async () => {
      mockScheduler.start.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/port-monitor/scheduler/start')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('started');
      expect(mockScheduler.start).toHaveBeenCalled();
    });

    it('should handle scheduler start error', async () => {
      mockScheduler.start.mockRejectedValue(new Error('Scheduler already running'));

      const response = await request(app)
        .post('/api/port-monitor/scheduler/start')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already running');
    });
  });

  describe('POST /api/port-monitor/scheduler/stop', () => {
    it('should stop the scheduler', async () => {
      mockScheduler.stop.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/port-monitor/scheduler/stop')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('stopped');
      expect(mockScheduler.stop).toHaveBeenCalled();
    });
  });

  describe('GET /api/port-monitor/scheduler/status', () => {
    it('should return scheduler status', async () => {
      const mockStats = {
        isRunning: true,
        totalJobs: 5,
        activeJobs: 3,
        completedJobs: 100,
        failedJobs: 5,
        uptime: 3600000
      };

      mockScheduler.isRunning.mockReturnValue(true);
      mockScheduler.getStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/port-monitor/scheduler/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isRunning).toBe(true);
      expect(response.body.data.stats).toEqual(mockStats);
    });
  });

  describe('DELETE /api/port-monitor/configs/:id', () => {
    it('should delete port configuration', async () => {
      const portId = 'test-port-id';
      mockPortMonitor.deletePortConfig.mockResolvedValue(true);
      mockScheduler.removeJob.mockResolvedValue(true);

      const response = await request(app)
        .delete(`/api/port-monitor/configs/${portId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
      expect(mockPortMonitor.deletePortConfig).toHaveBeenCalledWith(portId);
      expect(mockScheduler.removeJob).toHaveBeenCalledWith(portId);
    });

    it('should return 404 for non-existent port configuration', async () => {
      const portId = 'non-existent-id';
      mockPortMonitor.deletePortConfig.mockRejectedValue(new Error('Port configuration not found'));

      const response = await request(app)
        .delete(`/api/port-monitor/configs/${portId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /api/port-monitor/reports/summary', () => {
    it('should return system summary report', async () => {
      const mockReport = {
        period: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        summary: {
          totalChecks: 1000,
          successfulChecks: 850,
          failedChecks: 150,
          averageResponseTime: 200,
          uptime: 85.0
        },
        portSummaries: [
          {
            portId: 'port1',
            name: 'Test Port 1',
            checks: 500,
            successRate: 90.0,
            averageResponseTime: 180
          }
        ],
        alerts: {
          total: 25,
          resolved: 20,
          pending: 5
        }
      };

      mockReportingService.generateReport.mockResolvedValue(mockReport);

      const response = await request(app)
        .get('/api/port-monitor/reports/summary')
        .query({ period: '24h' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockReport);
      expect(mockReportingService.generateReport).toHaveBeenCalledWith(
        expect.objectContaining({ period: '24h' })
      );
    });
  });
});

// Port Monitor Service Unit Tests
describe('PortMonitorService Unit Tests', () => {
  let portMonitor;

  beforeEach(() => {
    // Gerçek service instance oluştur (mock olmayan)
    jest.unmock('../services/portMonitor');
    const { PortMonitorService } = require('../services/portMonitor');
    portMonitor = new PortMonitorService();
  });

  describe('checkPort method', () => {
    it('should successfully check an open port', async () => {
      // Bu test gerçek bir port kontrolü yapar
      // Localhost'ta çalışan bir servis olduğunu varsayar
      const result = await portMonitor.checkPort('127.0.0.1', 22, 5000); // SSH portu genelde açık
      
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('responseTime');
      expect(result).toHaveProperty('timestamp');
      expect(['online', 'offline', 'timeout', 'error']).toContain(result.status);
    });

    it('should handle connection timeout', async () => {
      // Erişilemeyen bir IP ve port ile test
      const result = await portMonitor.checkPort('192.0.2.1', 12345, 1000);
      
      expect(result.status).toBe('timeout');
      expect(result).toHaveProperty('error');
      expect(result.responseTime).toBeGreaterThanOrEqual(1000);
    });

    it('should handle invalid host', async () => {
      const result = await portMonitor.checkPort('invalid-host-name-12345', 80, 5000);
      
      expect(['error', 'timeout']).toContain(result.status);
      expect(result).toHaveProperty('error');
    });
  });

  describe('validation methods', () => {
    it('should validate port configuration correctly', () => {
      const validConfig = {
        name: 'Test Port',
        host: 'localhost',
        port: 8080,
        timeout: 5000,
        retryCount: 3,
        retryDelay: 1000,
        enabled: true,
        tags: ['test']
      };

      expect(() => portMonitor.validatePortConfig(validConfig)).not.toThrow();
    });

    it('should reject invalid port numbers', () => {
      const invalidConfig = {
        name: 'Test Port',
        host: 'localhost',
        port: 70000, // Invalid port number
        timeout: 5000
      };

      expect(() => portMonitor.validatePortConfig(invalidConfig)).toThrow();
    });

    it('should reject empty host names', () => {
      const invalidConfig = {
        name: 'Test Port',
        host: '',
        port: 8080,
        timeout: 5000
      };

      expect(() => portMonitor.validatePortConfig(invalidConfig)).toThrow();
    });
  });
});

// Integration Tests
describe('Port Monitor Integration Tests', () => {
  let portMonitor;
  let scheduler;
  let alertService;
  let reportingService;

  beforeEach(() => {
    // Gerçek service instance'ları oluştur
    jest.unmock('../services/portMonitor');
    jest.unmock('../services/portScheduler');
    jest.unmock('../services/alertService');
    jest.unmock('../services/reportingService');

    const { PortMonitorService } = require('../services/portMonitor');
    const { PortSchedulerService } = require('../services/portScheduler');
    const { AlertService } = require('../services/alertService');
    const { ReportingService } = require('../services/reportingService');

    portMonitor = new PortMonitorService();
    reportingService = new ReportingService();
    alertService = new AlertService();
    scheduler = new PortSchedulerService(portMonitor, alertService, reportingService);
  });

  it('should complete full port monitoring workflow', async () => {
    // 1. Port konfigürasyonu ekle
    const config = {
      name: 'Integration Test Port',
      host: '127.0.0.1',
      port: 22,
      timeout: 5000,
      retryCount: 2,
      retryDelay: 1000,
      enabled: true,
      tags: ['integration-test']
    };

    const addedConfig = await portMonitor.addPortConfig(config);
    expect(addedConfig).toHaveProperty('id');
    expect(addedConfig.name).toBe(config.name);

    // 2. Port kontrolü yap
    const checkResult = await portMonitor.checkPortConfig(addedConfig.id);
    expect(checkResult).toHaveProperty('status');
    expect(checkResult.portConfigId).toBe(addedConfig.id);

    // 3. Sonucu logla
    await reportingService.addPortCheckLog(checkResult);

    // 4. Alert işle
    await alertService.processPortCheckResult(checkResult);

    // 5. Scheduler'a ekle
    await scheduler.addJob(addedConfig.id, '*/30 * * * * *'); // Her 30 saniyede

    // 6. Scheduler'ı başlat
    await scheduler.start();
    expect(scheduler.isRunning()).toBe(true);

    // 7. Kısa bir süre bekle
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 8. Scheduler'ı durdur
    await scheduler.stop();
    expect(scheduler.isRunning()).toBe(false);

    // 9. İstatistikleri kontrol et
    const stats = await reportingService.getSystemStats();
    expect(stats).toHaveProperty('totalChecks');
    expect(stats.totalChecks).toBeGreaterThan(0);

    // 10. Temizlik
    await scheduler.removeJob(addedConfig.id);
    await portMonitor.deletePortConfig(addedConfig.id);
  }, 15000); // 15 saniye timeout
});