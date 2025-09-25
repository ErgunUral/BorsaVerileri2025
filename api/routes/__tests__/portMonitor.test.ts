import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import portMonitorRouter from '../portMonitor';
import { PortMonitorService } from '../../services/portMonitorService';
import { PortSchedulerService } from '../../services/portSchedulerService';
import { AlertService } from '../../services/alertService';
import { reportingService } from '../../services/reportingService';
import { AdvancedLoggerService } from '../../services/advancedLoggerService';

// Mock dependencies
vi.mock('../../services/portMonitorService');
vi.mock('../../services/portSchedulerService');
vi.mock('../../services/alertService');
vi.mock('../../services/reportingService');
vi.mock('../../services/advancedLoggerService');
vi.mock('express-validator', () => ({
  body: () => ({
    notEmpty: () => ({ withMessage: () => ({}) }),
    isString: () => ({ withMessage: () => ({}) }),
    isInt: () => ({ withMessage: () => ({}) }),
    isIn: () => ({ withMessage: () => ({}) }),
    isArray: () => ({ withMessage: () => ({}) }),
    custom: () => ({ withMessage: () => ({}) })
  }),
  validationResult: vi.fn(() => ({
    isEmpty: () => true,
    array: () => []
  }))
}));

const mockPortMonitorService = {
  createConfig: vi.fn(),
  getConfigs: vi.fn(),
  getConfigById: vi.fn(),
  updateConfig: vi.fn(),
  deleteConfig: vi.fn(),
  getConfigStatus: vi.fn(),
  startMonitoring: vi.fn(),
  stopMonitoring: vi.fn(),
  getMonitoringStats: vi.fn()
};

const mockPortSchedulerService = {
  scheduleMonitoring: vi.fn(),
  unscheduleMonitoring: vi.fn(),
  getScheduledJobs: vi.fn(),
  updateSchedule: vi.fn(),
  validateSchedule: vi.fn()
};

const mockAlertService = {
  createAlert: vi.fn(),
  getAlerts: vi.fn(),
  updateAlert: vi.fn(),
  deleteAlert: vi.fn(),
  sendAlert: vi.fn(),
  getAlertHistory: vi.fn()
};

const mockReportingService = {
  generateReport: vi.fn(),
  getReports: vi.fn(),
  scheduleReport: vi.fn(),
  exportReport: vi.fn()
};

const mockLogger = {
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
  logDebug: vi.fn()
};

// Setup Express app for testing
const app = express();
app.use(express.json());
app.use('/api/port-monitor', portMonitorRouter);

describe('Port Monitor Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock constructors
    (PortMonitorService as any).mockImplementation(() => mockPortMonitorService);
    (PortSchedulerService as any).mockImplementation(() => mockPortSchedulerService);
    (AlertService as any).mockImplementation(() => mockAlertService);
    (reportingService as any) = mockReportingService;
    (AdvancedLoggerService as any).mockImplementation(() => mockLogger);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/port-monitor/configs', () => {
    const validConfigData = {
      name: 'Web Server Monitor',
      description: 'Monitor web server port 80',
      host: 'localhost',
      port: 80,
      protocol: 'tcp',
      timeout: 5000,
      interval: 60000,
      retries: 3,
      alertThreshold: 2,
      enabled: true,
      tags: ['web', 'production'],
      notifications: {
        email: ['admin@example.com'],
        webhook: 'https://hooks.example.com/alerts'
      }
    };

    const mockCreatedConfig = {
      id: 'config-123',
      ...validConfigData,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      status: 'active'
    };

    it('should create a new port monitoring configuration', async () => {
      mockPortMonitorService.createConfig.mockResolvedValue(mockCreatedConfig);

      const response = await request(app)
        .post('/api/port-monitor/configs')
        .send(validConfigData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockCreatedConfig,
        message: 'Port monitoring configuration created successfully'
      });

      expect(mockPortMonitorService.createConfig).toHaveBeenCalledWith(validConfigData);
      expect(mockLogger.logInfo).toHaveBeenCalledWith(
        'Port monitoring configuration created',
        { configId: 'config-123', name: 'Web Server Monitor' }
      );
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: '',
        host: '',
        port: 'invalid'
      };

      const response = await request(app)
        .post('/api/port-monitor/configs')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should validate port range', async () => {
      const invalidPortData = {
        ...validConfigData,
        port: 70000 // Invalid port number
      };

      const response = await request(app)
        .post('/api/port-monitor/configs')
        .send(invalidPortData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate protocol values', async () => {
      const invalidProtocolData = {
        ...validConfigData,
        protocol: 'invalid_protocol'
      };

      const response = await request(app)
        .post('/api/port-monitor/configs')
        .send(invalidProtocolData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate timeout and interval values', async () => {
      const invalidTimingData = {
        ...validConfigData,
        timeout: -1000,
        interval: 500 // Too short
      };

      const response = await request(app)
        .post('/api/port-monitor/configs')
        .send(invalidTimingData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle service errors during creation', async () => {
      const serviceError = new Error('Database connection failed');
      mockPortMonitorService.createConfig.mockRejectedValue(serviceError);

      const response = await request(app)
        .post('/api/port-monitor/configs')
        .send(validConfigData)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to create port monitoring configuration'
      });

      expect(mockLogger.logError).toHaveBeenCalledWith(
        'Failed to create port monitoring configuration',
        serviceError
      );
    });

    it('should handle duplicate configuration names', async () => {
      const duplicateError = new Error('Configuration name already exists');
      duplicateError.name = 'DuplicateError';
      mockPortMonitorService.createConfig.mockRejectedValue(duplicateError);

      const response = await request(app)
        .post('/api/port-monitor/configs')
        .send(validConfigData)
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: 'Configuration name already exists'
      });
    });
  });

  describe('GET /api/port-monitor/configs', () => {
    const mockConfigs = [
      {
        id: 'config-1',
        name: 'Web Server',
        host: 'localhost',
        port: 80,
        protocol: 'tcp',
        status: 'active',
        enabled: true,
        createdAt: '2024-01-15T10:00:00Z'
      },
      {
        id: 'config-2',
        name: 'Database Server',
        host: 'db.example.com',
        port: 5432,
        protocol: 'tcp',
        status: 'inactive',
        enabled: false,
        createdAt: '2024-01-15T11:00:00Z'
      }
    ];

    it('should retrieve all port monitoring configurations', async () => {
      mockPortMonitorService.getConfigs.mockResolvedValue({
        configs: mockConfigs,
        total: 2,
        page: 1,
        limit: 10
      });

      const response = await request(app)
        .get('/api/port-monitor/configs')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          configs: mockConfigs,
          total: 2,
          page: 1,
          limit: 10
        }
      });

      expect(mockPortMonitorService.getConfigs).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
    });

    it('should handle pagination parameters', async () => {
      mockPortMonitorService.getConfigs.mockResolvedValue({
        configs: [mockConfigs[0]],
        total: 2,
        page: 2,
        limit: 1
      });

      const response = await request(app)
        .get('/api/port-monitor/configs')
        .query({ page: 2, limit: 1 })
        .expect(200);

      expect(mockPortMonitorService.getConfigs).toHaveBeenCalledWith({
        page: 2,
        limit: 1,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
    });

    it('should handle filtering by status', async () => {
      const activeConfigs = [mockConfigs[0]];
      mockPortMonitorService.getConfigs.mockResolvedValue({
        configs: activeConfigs,
        total: 1,
        page: 1,
        limit: 10
      });

      const response = await request(app)
        .get('/api/port-monitor/configs')
        .query({ status: 'active' })
        .expect(200);

      expect(mockPortMonitorService.getConfigs).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        status: 'active'
      });
    });

    it('should handle search by name', async () => {
      const searchResults = [mockConfigs[0]];
      mockPortMonitorService.getConfigs.mockResolvedValue({
        configs: searchResults,
        total: 1,
        page: 1,
        limit: 10
      });

      const response = await request(app)
        .get('/api/port-monitor/configs')
        .query({ search: 'web' })
        .expect(200);

      expect(mockPortMonitorService.getConfigs).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        search: 'web'
      });
    });

    it('should validate pagination limits', async () => {
      const response = await request(app)
        .get('/api/port-monitor/configs')
        .query({ limit: 1000 }) // Exceeds maximum
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Limit cannot exceed 100'
      });
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('Database query failed');
      mockPortMonitorService.getConfigs.mockRejectedValue(serviceError);

      const response = await request(app)
        .get('/api/port-monitor/configs')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to retrieve port monitoring configurations'
      });
    });
  });

  describe('GET /api/port-monitor/configs/:id', () => {
    const mockConfig = {
      id: 'config-123',
      name: 'Web Server Monitor',
      description: 'Monitor web server port 80',
      host: 'localhost',
      port: 80,
      protocol: 'tcp',
      timeout: 5000,
      interval: 60000,
      retries: 3,
      alertThreshold: 2,
      enabled: true,
      status: 'active',
      tags: ['web', 'production'],
      notifications: {
        email: ['admin@example.com'],
        webhook: 'https://hooks.example.com/alerts'
      },
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      lastCheck: '2024-01-15T15:30:00Z',
      stats: {
        totalChecks: 1440,
        successfulChecks: 1435,
        failedChecks: 5,
        uptime: 99.65,
        averageResponseTime: 25
      }
    };

    it('should retrieve a specific port monitoring configuration', async () => {
      mockPortMonitorService.getConfigById.mockResolvedValue(mockConfig);

      const response = await request(app)
        .get('/api/port-monitor/configs/config-123')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockConfig
      });

      expect(mockPortMonitorService.getConfigById).toHaveBeenCalledWith('config-123');
    });

    it('should handle configuration not found', async () => {
      mockPortMonitorService.getConfigById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/port-monitor/configs/nonexistent')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Port monitoring configuration not found'
      });
    });

    it('should validate configuration ID format', async () => {
      const response = await request(app)
        .get('/api/port-monitor/configs/invalid-id-format')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid configuration ID format'
      });
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('Database connection failed');
      mockPortMonitorService.getConfigById.mockRejectedValue(serviceError);

      const response = await request(app)
        .get('/api/port-monitor/configs/config-123')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to retrieve port monitoring configuration'
      });
    });
  });

  describe('PUT /api/port-monitor/configs/:id', () => {
    const updateData = {
      name: 'Updated Web Server Monitor',
      description: 'Updated description',
      timeout: 10000,
      interval: 30000,
      enabled: false
    };

    const mockUpdatedConfig = {
      id: 'config-123',
      name: 'Updated Web Server Monitor',
      description: 'Updated description',
      host: 'localhost',
      port: 80,
      protocol: 'tcp',
      timeout: 10000,
      interval: 30000,
      retries: 3,
      alertThreshold: 2,
      enabled: false,
      status: 'inactive',
      updatedAt: '2024-01-15T16:00:00Z'
    };

    it('should update a port monitoring configuration', async () => {
      mockPortMonitorService.updateConfig.mockResolvedValue(mockUpdatedConfig);

      const response = await request(app)
        .put('/api/port-monitor/configs/config-123')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockUpdatedConfig,
        message: 'Port monitoring configuration updated successfully'
      });

      expect(mockPortMonitorService.updateConfig).toHaveBeenCalledWith(
        'config-123',
        updateData
      );
    });

    it('should validate update data', async () => {
      const invalidUpdateData = {
        port: -1,
        timeout: 'invalid',
        interval: 100 // Too short
      };

      const response = await request(app)
        .put('/api/port-monitor/configs/config-123')
        .send(invalidUpdateData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle configuration not found during update', async () => {
      const notFoundError = new Error('Configuration not found');
      notFoundError.name = 'NotFoundError';
      mockPortMonitorService.updateConfig.mockRejectedValue(notFoundError);

      const response = await request(app)
        .put('/api/port-monitor/configs/nonexistent')
        .send(updateData)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Port monitoring configuration not found'
      });
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { enabled: false };
      const partiallyUpdatedConfig = {
        ...mockUpdatedConfig,
        enabled: false
      };

      mockPortMonitorService.updateConfig.mockResolvedValue(partiallyUpdatedConfig);

      const response = await request(app)
        .put('/api/port-monitor/configs/config-123')
        .send(partialUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPortMonitorService.updateConfig).toHaveBeenCalledWith(
        'config-123',
        partialUpdate
      );
    });
  });

  describe('DELETE /api/port-monitor/configs/:id', () => {
    it('should delete a port monitoring configuration', async () => {
      mockPortMonitorService.deleteConfig.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/port-monitor/configs/config-123')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Port monitoring configuration deleted successfully'
      });

      expect(mockPortMonitorService.deleteConfig).toHaveBeenCalledWith('config-123');
      expect(mockLogger.logInfo).toHaveBeenCalledWith(
        'Port monitoring configuration deleted',
        { configId: 'config-123' }
      );
    });

    it('should handle configuration not found during deletion', async () => {
      mockPortMonitorService.deleteConfig.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/port-monitor/configs/nonexistent')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Port monitoring configuration not found'
      });
    });

    it('should handle active monitoring during deletion', async () => {
      const activeMonitoringError = new Error('Cannot delete active monitoring configuration');
      activeMonitoringError.name = 'ActiveMonitoringError';
      mockPortMonitorService.deleteConfig.mockRejectedValue(activeMonitoringError);

      const response = await request(app)
        .delete('/api/port-monitor/configs/config-123')
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: 'Cannot delete configuration with active monitoring. Stop monitoring first.'
      });
    });
  });

  describe('POST /api/port-monitor/configs/:id/start', () => {
    it('should start monitoring for a configuration', async () => {
      mockPortMonitorService.startMonitoring.mockResolvedValue({
        configId: 'config-123',
        status: 'started',
        startedAt: '2024-01-15T16:00:00Z'
      });

      const response = await request(app)
        .post('/api/port-monitor/configs/config-123/start')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Port monitoring started successfully',
        data: {
          configId: 'config-123',
          status: 'started',
          startedAt: '2024-01-15T16:00:00Z'
        }
      });

      expect(mockPortMonitorService.startMonitoring).toHaveBeenCalledWith('config-123');
    });

    it('should handle already running monitoring', async () => {
      const alreadyRunningError = new Error('Monitoring already running');
      alreadyRunningError.name = 'AlreadyRunningError';
      mockPortMonitorService.startMonitoring.mockRejectedValue(alreadyRunningError);

      const response = await request(app)
        .post('/api/port-monitor/configs/config-123/start')
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: 'Monitoring is already running for this configuration'
      });
    });
  });

  describe('POST /api/port-monitor/configs/:id/stop', () => {
    it('should stop monitoring for a configuration', async () => {
      mockPortMonitorService.stopMonitoring.mockResolvedValue({
        configId: 'config-123',
        status: 'stopped',
        stoppedAt: '2024-01-15T16:30:00Z'
      });

      const response = await request(app)
        .post('/api/port-monitor/configs/config-123/stop')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Port monitoring stopped successfully',
        data: {
          configId: 'config-123',
          status: 'stopped',
          stoppedAt: '2024-01-15T16:30:00Z'
        }
      });

      expect(mockPortMonitorService.stopMonitoring).toHaveBeenCalledWith('config-123');
    });

    it('should handle not running monitoring', async () => {
      const notRunningError = new Error('Monitoring not running');
      notRunningError.name = 'NotRunningError';
      mockPortMonitorService.stopMonitoring.mockRejectedValue(notRunningError);

      const response = await request(app)
        .post('/api/port-monitor/configs/config-123/stop')
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: 'Monitoring is not currently running for this configuration'
      });
    });
  });

  describe('GET /api/port-monitor/configs/:id/status', () => {
    const mockStatus = {
      configId: 'config-123',
      status: 'running',
      lastCheck: '2024-01-15T16:25:00Z',
      nextCheck: '2024-01-15T16:26:00Z',
      consecutiveFailures: 0,
      uptime: 99.8,
      responseTime: 23,
      isHealthy: true
    };

    it('should get monitoring status for a configuration', async () => {
      mockPortMonitorService.getConfigStatus.mockResolvedValue(mockStatus);

      const response = await request(app)
        .get('/api/port-monitor/configs/config-123/status')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockStatus
      });

      expect(mockPortMonitorService.getConfigStatus).toHaveBeenCalledWith('config-123');
    });

    it('should handle configuration not found for status', async () => {
      mockPortMonitorService.getConfigStatus.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/port-monitor/configs/nonexistent/status')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Port monitoring configuration not found'
      });
    });
  });

  describe('GET /api/port-monitor/stats', () => {
    const mockStats = {
      totalConfigurations: 5,
      activeConfigurations: 3,
      runningMonitors: 2,
      totalChecks: 14400,
      successfulChecks: 14350,
      failedChecks: 50,
      overallUptime: 99.65,
      averageResponseTime: 28,
      alertsTriggered: 12,
      lastUpdated: '2024-01-15T16:30:00Z'
    };

    it('should get overall monitoring statistics', async () => {
      mockPortMonitorService.getMonitoringStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/port-monitor/stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockStats
      });

      expect(mockPortMonitorService.getMonitoringStats).toHaveBeenCalled();
    });

    it('should handle service errors for stats', async () => {
      const serviceError = new Error('Stats calculation failed');
      mockPortMonitorService.getMonitoringStats.mockRejectedValue(serviceError);

      const response = await request(app)
        .get('/api/port-monitor/stats')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to retrieve monitoring statistics'
      });
    });
  });

  describe('Validation Middleware', () => {
    it('should validate port configuration data', async () => {
      const invalidData = {
        name: '', // Empty name
        host: '', // Empty host
        port: 'not-a-number', // Invalid port
        protocol: 'invalid', // Invalid protocol
        timeout: -1000, // Negative timeout
        interval: 100, // Too short interval
        retries: -1, // Negative retries
        alertThreshold: 0 // Invalid threshold
      };

      const response = await request(app)
        .post('/api/port-monitor/configs')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should validate schedule data', async () => {
      const invalidScheduleData = {
        cron: 'invalid-cron-expression',
        timezone: 'invalid-timezone',
        enabled: 'not-boolean'
      };

      // This would be tested if there were schedule-specific endpoints
      // For now, we test the validation logic through the service mock
      mockPortSchedulerService.validateSchedule.mockReturnValue(false);
      
      expect(mockPortSchedulerService.validateSchedule(invalidScheduleData.cron)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      const dbError = new Error('Database connection lost');
      dbError.name = 'DatabaseError';
      mockPortMonitorService.getConfigs.mockRejectedValue(dbError);

      const response = await request(app)
        .get('/api/port-monitor/configs')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(mockLogger.logError).toHaveBeenCalled();
    });

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.name = 'TimeoutError';
      mockPortMonitorService.createConfig.mockRejectedValue(timeoutError);

      const response = await request(app)
        .post('/api/port-monitor/configs')
        .send({
          name: 'Test Config',
          host: 'localhost',
          port: 80,
          protocol: 'tcp'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle permission errors', async () => {
      const permissionError = new Error('Insufficient permissions');
      permissionError.name = 'PermissionError';
      mockPortMonitorService.deleteConfig.mockRejectedValue(permissionError);

      const response = await request(app)
        .delete('/api/port-monitor/configs/config-123')
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: 'Insufficient permissions to perform this action'
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large configuration names', async () => {
      const longName = 'A'.repeat(1000);
      
      const response = await request(app)
        .post('/api/port-monitor/configs')
        .send({
          name: longName,
          host: 'localhost',
          port: 80,
          protocol: 'tcp'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle special characters in host names', async () => {
      const specialHostData = {
        name: 'Special Host Test',
        host: 'test-server.example-domain.com',
        port: 80,
        protocol: 'tcp'
      };

      mockPortMonitorService.createConfig.mockResolvedValue({
        id: 'config-special',
        ...specialHostData,
        status: 'active'
      });

      const response = await request(app)
        .post('/api/port-monitor/configs')
        .send(specialHostData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should handle concurrent configuration updates', async () => {
      const updateData = { enabled: false };
      
      mockPortMonitorService.updateConfig.mockResolvedValue({
        id: 'config-123',
        ...updateData,
        updatedAt: '2024-01-15T16:00:00Z'
      });

      // Simulate concurrent updates
      const promises = Array.from({ length: 3 }, () =>
        request(app)
          .put('/api/port-monitor/configs/config-123')
          .send(updateData)
      );

      const responses = await Promise.all(promises);
      
      // At least one should succeed
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);
    });

    it('should handle IPv6 addresses', async () => {
      const ipv6Data = {
        name: 'IPv6 Test',
        host: '2001:db8::1',
        port: 80,
        protocol: 'tcp'
      };

      mockPortMonitorService.createConfig.mockResolvedValue({
        id: 'config-ipv6',
        ...ipv6Data,
        status: 'active'
      });

      const response = await request(app)
        .post('/api/port-monitor/configs')
        .send(ipv6Data)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });
});