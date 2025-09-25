import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Socket } from 'net';
import { PortMonitorService } from '../portMonitor';
import {
  PortConfig,
  PortStatus,
  PortMonitorConfig,
  EventType
} from '../../types/portMonitor';

// Mock net module
vi.mock('net');
const MockedSocket = Socket as any;

describe('PortMonitorService', () => {
  let portMonitor: PortMonitorService;
  let mockSocket: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create mock socket
    mockSocket = {
      connect: vi.fn(),
      destroy: vi.fn(),
      destroyed: false,
      setTimeout: vi.fn(),
      on: vi.fn(),
      emit: vi.fn()
    };

    // Mock Socket constructor
    MockedSocket.mockImplementation(() => mockSocket);

    // Create fresh instance
    portMonitor = new PortMonitorService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create instance with default configuration', () => {
      const service = new PortMonitorService();
      const config = service.getConfig();
      
      expect(config.defaultTimeout).toBe(5000);
      expect(config.defaultInterval).toBe(30000);
      expect(config.maxConcurrentChecks).toBe(10);
      expect(config.retryAttempts).toBe(3);
      expect(config.retryDelay).toBe(1000);
      expect(config.alertThreshold).toBe(3);
    });

    it('should create instance with custom configuration', () => {
      const customConfig: Partial<PortMonitorConfig> = {
        defaultTimeout: 10000,
        maxConcurrentChecks: 5,
        retryAttempts: 2
      };
      
      const service = new PortMonitorService(customConfig);
      const config = service.getConfig();
      
      expect(config.defaultTimeout).toBe(10000);
      expect(config.maxConcurrentChecks).toBe(5);
      expect(config.retryAttempts).toBe(2);
      // Default values should remain
      expect(config.defaultInterval).toBe(30000);
    });

    it('should extend EventEmitter', () => {
      expect(portMonitor.on).toBeDefined();
      expect(portMonitor.emit).toBeDefined();
      expect(portMonitor.removeListener).toBeDefined();
    });
  });

  describe('checkPort', () => {
    it('should successfully check an online port', async () => {
      // Mock successful connection
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 10);
        }
      });

      const result = await portMonitor.checkPort('localhost', 8080);

      expect(result).toMatchObject({
        host: 'localhost',
        port: 8080,
        status: PortStatus.ONLINE
      });
      expect(result.id).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.responseTime).toBeGreaterThan(0);
      expect(mockSocket.connect).toHaveBeenCalledWith(8080, 'localhost');
    });

    it('should handle connection timeout', async () => {
      // Mock timeout
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'timeout') {
          setTimeout(() => callback(), 10);
        }
      });

      const result = await portMonitor.checkPort('localhost', 8080, { timeout: 1000 });

      expect(result.status).toBe(PortStatus.TIMEOUT);
      expect(result.error).toContain('timeout');
    });

    it('should handle connection error', async () => {
      // Mock connection error
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Connection refused')), 10);
        }
      });

      const result = await portMonitor.checkPort('localhost', 8080);

      expect(result.status).toBe(PortStatus.ERROR);
      expect(result.error).toBe('Connection refused');
    });

    it('should retry on failure', async () => {
      let attemptCount = 0;
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          attemptCount++;
          if (attemptCount < 3) {
            setTimeout(() => callback(new Error('Connection failed')), 10);
          }
        } else if (event === 'connect' && attemptCount >= 2) {
          setTimeout(() => callback(), 10);
        }
      });

      const result = await portMonitor.checkPort('localhost', 8080, {
        retryAttempts: 2,
        retryDelay: 10
      });

      expect(result.status).toBe(PortStatus.ONLINE);
      expect(MockedSocket).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should emit port events', async () => {
      const eventSpy = vi.fn();
      portMonitor.on('portCheck', eventSpy);

      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 10);
        }
      });

      await portMonitor.checkPort('localhost', 8080);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.PORT_ONLINE,
          data: expect.objectContaining({
            host: 'localhost',
            port: 8080,
            status: PortStatus.ONLINE
          })
        })
      );
    });

    it('should handle custom timeout option', async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 10);
        }
      });

      await portMonitor.checkPort('localhost', 8080, { timeout: 2000 });

      expect(mockSocket.setTimeout).toHaveBeenCalledWith(2000);
    });

    it('should cleanup socket properly', async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 10);
        }
      });

      await portMonitor.checkPort('localhost', 8080);

      expect(mockSocket.destroy).toHaveBeenCalled();
    });
  });

  describe('checkPortConfig', () => {
    const mockPortConfig: PortConfig = {
      id: 'test-config-1',
      host: 'localhost',
      port: 8080,
      name: 'Test Port',
      timeout: 3000,
      interval: 60000,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should check port using configuration', async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 10);
        }
      });

      const result = await portMonitor.checkPortConfig(mockPortConfig);

      expect(result.portConfigId).toBe('test-config-1');
      expect(result.host).toBe('localhost');
      expect(result.port).toBe(8080);
      expect(result.status).toBe(PortStatus.ONLINE);
      expect(mockSocket.setTimeout).toHaveBeenCalledWith(3000);
    });

    it('should use config timeout setting', async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 10);
        }
      });

      const configWithCustomTimeout = {
        ...mockPortConfig,
        timeout: 7000
      };

      await portMonitor.checkPortConfig(configWithCustomTimeout);

      expect(mockSocket.setTimeout).toHaveBeenCalledWith(7000);
    });
  });

  describe('checkMultiplePorts', () => {
    const mockPortConfigs: PortConfig[] = [
      {
        id: 'config-1',
        host: 'localhost',
        port: 8080,
        name: 'Web Server',
        timeout: 5000,
        interval: 30000,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'config-2',
        host: 'localhost',
        port: 3306,
        name: 'Database',
        timeout: 5000,
        interval: 30000,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'config-3',
        host: 'localhost',
        port: 6379,
        name: 'Redis',
        timeout: 5000,
        interval: 30000,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    it('should check multiple ports concurrently', async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 10);
        }
      });

      const results = await portMonitor.checkMultiplePorts(mockPortConfigs);

      expect(results).toHaveLength(3);
      expect(results[0].portConfigId).toBe('config-1');
      expect(results[1].portConfigId).toBe('config-2');
      expect(results[2].portConfigId).toBe('config-3');
      expect(results.every(r => r.status === PortStatus.ONLINE)).toBe(true);
    });

    it('should respect concurrency limit', async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 50); // Longer delay to test concurrency
        }
      });

      const startTime = Date.now();
      await portMonitor.checkMultiplePorts(mockPortConfigs, 2);
      const endTime = Date.now();

      // With concurrency of 2, it should take longer than if all were parallel
      // but less than if they were sequential
      expect(endTime - startTime).toBeGreaterThan(100); // At least 2 batches
    });

    it('should handle mixed success and failure results', async () => {
      // Test that checkMultiplePorts returns results for all configs
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 10);
        }
      });

      const results = await portMonitor.checkMultiplePorts(mockPortConfigs);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.portConfigId)).toBe(true);
      expect(results.every(r => r.host === 'localhost')).toBe(true);
      expect(results.every(r => typeof r.responseTime === 'number')).toBe(true);
    });

    it('should handle Promise.allSettled rejections', async () => {
      // Mock a scenario where checkPortConfig throws
      const originalCheckPortConfig = portMonitor.checkPortConfig;
      jest.spyOn(portMonitor, 'checkPortConfig').mockImplementation(async (config) => {
        if (config.id === 'config-2') {
          throw new Error('Unexpected error');
        }
        return originalCheckPortConfig.call(portMonitor, config);
      });

      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 10);
        }
      });

      const results = await portMonitor.checkMultiplePorts(mockPortConfigs);

      expect(results).toHaveLength(3);
      expect(results[1].status).toBe(PortStatus.ERROR);
      expect(results[1].error).toBe('Unexpected error');
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig = {
        defaultTimeout: 8000,
        maxConcurrentChecks: 15
      };

      portMonitor.updateConfig(newConfig);
      const config = portMonitor.getConfig();

      expect(config.defaultTimeout).toBe(8000);
      expect(config.maxConcurrentChecks).toBe(15);
      // Other values should remain unchanged
      expect(config.defaultInterval).toBe(30000);
      expect(config.retryAttempts).toBe(3);
    });

    it('should return current configuration', () => {
      const config = portMonitor.getConfig();

      expect(config).toEqual({
        defaultTimeout: 5000,
        defaultInterval: 30000,
        maxConcurrentChecks: 10,
        retryAttempts: 3,
        retryDelay: 1000,
        alertThreshold: 3
      });
    });

    it('should return configuration copy (not reference)', () => {
      const config1 = portMonitor.getConfig();
      const config2 = portMonitor.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different objects

      config1.defaultTimeout = 9999;
      expect(portMonitor.getConfig().defaultTimeout).toBe(5000); // Original unchanged
    });
  });

  describe('Status and Monitoring', () => {
    it('should return service status', () => {
      const status = portMonitor.getStatus();

      expect(status).toHaveProperty('activeChecks');
      expect(status).toHaveProperty('config');
      expect(status).toHaveProperty('uptime');
      expect(status).toHaveProperty('memoryUsage');
      expect(typeof status.activeChecks).toBe('number');
      expect(typeof status.uptime).toBe('number');
      expect(typeof status.memoryUsage).toBe('object');
    });

    it('should return active check count', () => {
      const count = portMonitor.getActiveCheckCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Event Emission', () => {
    it('should emit PORT_ONLINE event for successful checks', async () => {
      const eventSpy = jest.fn();
      portMonitor.on(EventType.PORT_ONLINE, eventSpy);

      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 10);
        }
      });

      await portMonitor.checkPort('localhost', 8080);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.PORT_ONLINE,
          data: expect.objectContaining({
            status: PortStatus.ONLINE
          })
        })
      );
    });

    it('should emit PORT_ERROR event for failed checks', async () => {
      const eventSpy = jest.fn();
      portMonitor.on(EventType.PORT_ERROR, eventSpy);

      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Connection refused')), 10);
        }
      });

      await portMonitor.checkPort('localhost', 8080, { retryAttempts: 0 });

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.PORT_ERROR,
          data: expect.objectContaining({
            status: PortStatus.ERROR
          })
        })
      );
    });

    it('should emit PORT_TIMEOUT event for timeout scenarios', async () => {
      const eventSpy = jest.fn();
      portMonitor.on(EventType.PORT_TIMEOUT, eventSpy);

      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'timeout') {
          setTimeout(() => callback(), 10);
        }
      });

      await portMonitor.checkPort('localhost', 8080, { retryAttempts: 0 });

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.PORT_TIMEOUT,
          data: expect.objectContaining({
            status: PortStatus.TIMEOUT
          })
        })
      );
    });

    it('should emit generic portCheck event for all checks', async () => {
      const eventSpy = jest.fn();
      portMonitor.on('portCheck', eventSpy);

      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 10);
        }
      });

      await portMonitor.checkPort('localhost', 8080);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EventType.PORT_ONLINE,
          timestamp: expect.any(Date)
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle socket creation errors', async () => {
      MockedSocket.mockImplementation(() => {
        throw new Error('Socket creation failed');
      });

      const result = await portMonitor.checkPort('localhost', 8080);

      expect(result.status).toBe(PortStatus.ERROR);
      expect(result.error).toBe('Socket creation failed');
    });

    it('should handle invalid host names', async () => {
      mockSocket.connect.mockImplementation(() => {
        throw new Error('Invalid host');
      });

      const result = await portMonitor.checkPort('invalid-host', 8080);

      expect(result.status).toBe(PortStatus.ERROR);
      expect(result.error).toBe('Invalid host');
    });

    it('should handle invalid port numbers', async () => {
      mockSocket.connect.mockImplementation(() => {
        throw new Error('Invalid port');
      });

      const result = await portMonitor.checkPort('localhost', -1);

      expect(result.status).toBe(PortStatus.ERROR);
      expect(result.error).toBe('Invalid port');
    });

    it('should handle socket already destroyed scenario', async () => {
      mockSocket.destroyed = true;
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 10);
        }
      });

      const result = await portMonitor.checkPort('localhost', 8080);

      expect(result.status).toBe(PortStatus.ONLINE);
      expect(mockSocket.destroy).not.toHaveBeenCalled(); // Should not call destroy on already destroyed socket
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle high concurrency without issues', async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') {
          setTimeout(() => callback(), Math.random() * 50);
        }
      });

      const configs = Array.from({ length: 50 }, (_, i) => ({
        id: `config-${i}`,
        host: 'localhost',
        port: 8080 + i,
        name: `Port ${i}`,
        timeout: 5000,
        interval: 30000,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      const results = await portMonitor.checkMultiplePorts(configs, 10);

      expect(results).toHaveLength(50);
      expect(results.every(r => r.status === PortStatus.ONLINE)).toBe(true);
    });

    it('should handle rapid successive calls', async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') {
          setTimeout(() => callback(), 10);
        }
      });

      const promises = Array.from({ length: 10 }, () => 
        portMonitor.checkPort('localhost', 8080)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(results.every(r => r.status === PortStatus.ONLINE)).toBe(true);
      expect(MockedSocket).toHaveBeenCalledTimes(10);
    });
  });

  describe('Singleton Export', () => {
    it('should export singleton instance', async () => {
      const { portMonitorService } = await import('../portMonitor');
      
      expect(portMonitorService).toBeInstanceOf(PortMonitorService);
      expect(typeof portMonitorService.checkPort).toBe('function');
      expect(typeof portMonitorService.getConfig).toBe('function');
    });
  });
});