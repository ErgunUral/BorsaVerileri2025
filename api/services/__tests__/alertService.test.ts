import { AlertService, EmailConfig, WebhookConfig } from '../alertService';
import {
  AlertType,
  AlertStatus,
  PortCheckResult,
  PortStatus,
  EventType
} from '../../types/portMonitor';

describe('AlertService', () => {
  let alertService: AlertService;
  let mockEmailConfig: EmailConfig;
  let mockWebhookConfig: WebhookConfig;
  let mockPortCheckResult: PortCheckResult;

  beforeEach(() => {
    alertService = new AlertService();
    
    mockEmailConfig = {
      host: 'smtp.test.com',
      port: 587,
      secure: false,
      auth: {
        user: 'test@example.com',
        pass: 'password123'
      },
      from: 'alerts@example.com'
    };

    mockWebhookConfig = {
      url: 'https://webhook.test.com/alerts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token123'
      },
      timeout: 5000
    };

    mockPortCheckResult = {
      id: 'check-123',
      portConfigId: 'port-123',
      host: 'example.com',
      port: 80,
      status: PortStatus.OFFLINE,
      error: 'Connection refused',
      timestamp: new Date()
    };

    // Suppress console logs during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Configuration Management', () => {
    test('should set email configuration', () => {
      alertService.setEmailConfig(mockEmailConfig);
      expect(alertService['emailConfig']).toEqual(mockEmailConfig);
    });

    test('should set webhook configuration', () => {
      alertService.setWebhookConfig(mockWebhookConfig);
      expect(alertService['webhookConfig']).toEqual(mockWebhookConfig);
    });
  });

  describe('Alert Configuration Management', () => {
    test('should add alert configuration', () => {
      const configData = {
        portConfigId: 'port-123',
        type: AlertType.EMAIL,
        enabled: true,
        threshold: 3,
        recipients: ['admin@example.com'],
        message: 'Port {host}:{port} is down'
      };

      const _configId = alertService.addAlertConfig(configData);

      expect(_configId).toBeDefined();
      expect(typeof _configId).toBe('string');
      
      const savedConfig = alertService.getAlertConfig(_configId);
      expect(savedConfig).toBeDefined();
      expect(savedConfig!.portConfigId).toBe(configData.portConfigId);
      expect(savedConfig!.type).toBe(configData.type);
      expect(savedConfig!.enabled).toBe(configData.enabled);
      expect(savedConfig!.threshold).toBe(configData.threshold);
      expect(savedConfig!.recipients).toEqual(configData.recipients);
      expect(savedConfig!.message).toBe(configData.message);
      expect(savedConfig!.createdAt).toBeInstanceOf(Date);
    });

    test('should remove alert configuration', () => {
      const _configId = alertService.addAlertConfig({
        portConfigId: 'port-123',
        type: AlertType.LOG,
        enabled: true,
        threshold: 2,
        recipients: []
      });

      const removed = alertService.removeAlertConfig(_configId);
      expect(removed).toBe(true);
      
      const config = alertService.getAlertConfig(_configId);
      expect(config).toBeNull();
    });

    test('should return false when removing non-existent configuration', () => {
      const removed = alertService.removeAlertConfig('non-existent-id');
      expect(removed).toBe(false);
    });

    test('should get alert configurations for port', () => {
      const portConfigId = 'port-123';
      
      // Add enabled config
      alertService.addAlertConfig({
        portConfigId,
        type: AlertType.EMAIL,
        enabled: true,
        threshold: 3,
        recipients: ['admin@example.com']
      });

      // Add disabled config
      alertService.addAlertConfig({
        portConfigId,
        type: AlertType.WEBHOOK,
        enabled: false,
        threshold: 2,
        recipients: []
      });

      // Add config for different port
      alertService.addAlertConfig({
        portConfigId: 'port-456',
        type: AlertType.LOG,
        enabled: true,
        threshold: 1,
        recipients: []
      });

      const configs = alertService.getAlertConfigsForPort(portConfigId);
      expect(configs).toHaveLength(1);
      expect(configs[0].type).toBe(AlertType.EMAIL);
      expect(configs[0].enabled).toBe(true);
    });

    test('should update alert configuration', () => {
      const _configId = alertService.addAlertConfig({
        portConfigId: 'port-123',
        type: AlertType.EMAIL,
        enabled: true,
        threshold: 3,
        recipients: ['admin@example.com']
      });

      const updated = alertService.updateAlertConfig(_configId, {
        threshold: 5,
        enabled: false,
        recipients: ['admin@example.com', 'ops@example.com']
      });

      expect(updated).toBe(true);
      
      const config = alertService.getAlertConfig(_configId);
      expect(config!.threshold).toBe(5);
      expect(config!.enabled).toBe(false);
      expect(config!.recipients).toEqual(['admin@example.com', 'ops@example.com']);
    });

    test('should return false when updating non-existent configuration', () => {
      const updated = alertService.updateAlertConfig('non-existent-id', {
        threshold: 5
      });
      expect(updated).toBe(false);
    });

    test('should get all alert configurations', () => {
      alertService.addAlertConfig({
        portConfigId: 'port-123',
        type: AlertType.EMAIL,
        enabled: true,
        threshold: 3,
        recipients: ['admin@example.com']
      });

      alertService.addAlertConfig({
        portConfigId: 'port-456',
        type: AlertType.WEBHOOK,
        enabled: false,
        threshold: 2,
        recipients: []
      });

      const allConfigs = alertService.getAllAlertConfigs();
      expect(allConfigs).toHaveLength(2);
    });
  });

  describe('Alert Processing', () => {
    test('should process port check result and send alert when threshold is met', async () => {
      alertService.addAlertConfig({
        portConfigId: 'port-123',
        type: AlertType.LOG,
        enabled: true,
        threshold: 2,
        recipients: []
      });

      const consecutiveFailures = 3;
      
      await alertService.processPortCheckResult(mockPortCheckResult, consecutiveFailures);
      
      const history = alertService.getAlertHistory('port-123');
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe(AlertStatus.SENT);
    });

    test('should not send alert when threshold is not met', async () => {
      alertService.addAlertConfig({
        portConfigId: 'port-123',
        type: AlertType.LOG,
        enabled: true,
        threshold: 5,
        recipients: []
      });

      const consecutiveFailures = 3;
      
      await alertService.processPortCheckResult(mockPortCheckResult, consecutiveFailures);
      
      const history = alertService.getAlertHistory('port-123');
      expect(history).toHaveLength(0);
    });

    test('should not send alert when port is online', async () => {
      alertService.addAlertConfig({
        portConfigId: 'port-123',
        type: AlertType.LOG,
        enabled: true,
        threshold: 1,
        recipients: []
      });

      const onlineResult = {
        ...mockPortCheckResult,
        status: PortStatus.ONLINE
      };
      
      await alertService.processPortCheckResult(onlineResult, 5);
      
      const history = alertService.getAlertHistory('port-123');
      expect(history).toHaveLength(0);
    });
  });

  describe('Alert Types', () => {
    test('should send email alert', async () => {
      alertService.setEmailConfig(mockEmailConfig);
      
      alertService.addAlertConfig({
        portConfigId: 'port-123',
        type: AlertType.EMAIL,
        enabled: true,
        threshold: 1,
        recipients: ['admin@example.com']
      });

      await alertService.processPortCheckResult(mockPortCheckResult, 2);
      
      const history = alertService.getAlertHistory('port-123');
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe(AlertType.EMAIL);
      expect(history[0].status).toBe(AlertStatus.SENT);
    });

    test('should fail email alert when configuration is missing', async () => {
      alertService.addAlertConfig({
        portConfigId: 'port-123',
        type: AlertType.EMAIL,
        enabled: true,
        threshold: 1,
        recipients: ['admin@example.com']
      });

      await alertService.processPortCheckResult(mockPortCheckResult, 2);
      
      const history = alertService.getAlertHistory('port-123');
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe(AlertStatus.FAILED);
      expect(history[0].error).toBe('Email configuration not set');
    });

    test('should send webhook alert', async () => {
      alertService.setWebhookConfig(mockWebhookConfig);
      
      alertService.addAlertConfig({
        portConfigId: 'port-123',
        type: AlertType.WEBHOOK,
        enabled: true,
        threshold: 1,
        recipients: ['webhook-endpoint']
      });

      await alertService.processPortCheckResult(mockPortCheckResult, 2);
      
      const history = alertService.getAlertHistory('port-123');
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe(AlertType.WEBHOOK);
      expect(history[0].status).toBe(AlertStatus.SENT);
    });

    test('should fail webhook alert when configuration is missing', async () => {
      alertService.addAlertConfig({
        portConfigId: 'port-123',
        type: AlertType.WEBHOOK,
        enabled: true,
        threshold: 1,
        recipients: []
      });

      await alertService.processPortCheckResult(mockPortCheckResult, 2);
      
      const history = alertService.getAlertHistory('port-123');
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe(AlertStatus.FAILED);
      expect(history[0].error).toBe('Webhook configuration not set');
    });

    test('should send log alert', async () => {
      alertService.addAlertConfig({
        portConfigId: 'port-123',
        type: AlertType.LOG,
        enabled: true,
        threshold: 1,
        recipients: []
      });

      await alertService.processPortCheckResult(mockPortCheckResult, 2);
      
      const history = alertService.getAlertHistory('port-123');
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe(AlertType.LOG);
      expect(history[0].status).toBe(AlertStatus.SENT);
    });

    test('should send console alert', async () => {
      alertService.addAlertConfig({
        portConfigId: 'port-123',
        type: AlertType.CONSOLE,
        enabled: true,
        threshold: 1,
        recipients: []
      });

      await alertService.processPortCheckResult(mockPortCheckResult, 2);
      
      const history = alertService.getAlertHistory('port-123');
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe(AlertType.CONSOLE);
      expect(history[0].status).toBe(AlertStatus.SENT);
    });
  });

  describe('Alert Message Generation', () => {
    test('should generate custom alert message with placeholders', async () => {
      const customMessage = 'Alert: {host}:{port} is {status}. Failures: {failures}. Error: {error}. Time: {timestamp}';
      
      alertService.addAlertConfig({
        portConfigId: 'port-123',
        type: AlertType.LOG,
        enabled: true,
        threshold: 1,
        recipients: [],
        message: customMessage
      });

      await alertService.processPortCheckResult(mockPortCheckResult, 3);
      
      const history = alertService.getAlertHistory('port-123');
      expect(history).toHaveLength(1);
      
      const alertMessage = history[0].message;
      expect(alertMessage).toContain('example.com:80');
      expect(alertMessage).toContain('offline');
      expect(alertMessage).toContain('Failures: 3');
      expect(alertMessage).toContain('Connection refused');
    });

    test('should generate default alert message when no custom message provided', async () => {
      alertService.addAlertConfig({
        portConfigId: 'port-123',
        type: AlertType.LOG,
        enabled: true,
        threshold: 1,
        recipients: []
      });

      await alertService.processPortCheckResult(mockPortCheckResult, 2);
      
      const history = alertService.getAlertHistory('port-123');
      expect(history).toHaveLength(1);
      
      const alertMessage = history[0].message;
      expect(alertMessage).toContain('Port example.com:80 is OFFLINE');
      expect(alertMessage).toContain('Consecutive failures: 2');
    });
  });

  describe('Alert History Management', () => {
    test('should get alert history for port', async () => {
      alertService.addAlertConfig({
        portConfigId: 'port-123',
        type: AlertType.LOG,
        enabled: true,
        threshold: 1,
        recipients: []
      });

      // Send multiple alerts
      await alertService.processPortCheckResult(mockPortCheckResult, 2);
      await alertService.processPortCheckResult(mockPortCheckResult, 3);
      
      const history = alertService.getAlertHistory('port-123');
      expect(history).toHaveLength(2);
    });

    test('should get limited alert history', async () => {
      alertService.addAlertConfig({
        portConfigId: 'port-123',
        type: AlertType.LOG,
        enabled: true,
        threshold: 1,
        recipients: []
      });

      // Send multiple alerts
      for (let i = 0; i < 5; i++) {
        await alertService.processPortCheckResult(mockPortCheckResult, 2);
      }
      
      const limitedHistory = alertService.getAlertHistory('port-123', 3);
      expect(limitedHistory).toHaveLength(3);
      
      const fullHistory = alertService.getAlertHistory('port-123');
      expect(fullHistory).toHaveLength(5);
    });

    test('should return empty history for non-existent port', () => {
      const history = alertService.getAlertHistory('non-existent-port');
      expect(history).toHaveLength(0);
    });

    test('should limit history size', async () => {
      alertService.setMaxHistorySize(3);
      
      alertService.addAlertConfig({
        portConfigId: 'port-123',
        type: AlertType.LOG,
        enabled: true,
        threshold: 1,
        recipients: []
      });

      // Send more alerts than max history size
      for (let i = 0; i < 5; i++) {
        await alertService.processPortCheckResult(mockPortCheckResult, 2);
      }
      
      const history = alertService.getAlertHistory('port-123');
      expect(history).toHaveLength(3);
    });
  });

  describe('Pending Alerts', () => {
    test('should get pending alerts', () => {
      const pendingAlerts = alertService.getPendingAlerts();
      expect(Array.isArray(pendingAlerts)).toBe(true);
    });
  });

  describe('Statistics', () => {
    test('should get alert statistics', async () => {
      // Add configurations
      alertService.addAlertConfig({
        portConfigId: 'port-123',
        type: AlertType.LOG,
        enabled: true,
        threshold: 1,
        recipients: []
      });

      alertService.addAlertConfig({
        portConfigId: 'port-456',
        type: AlertType.EMAIL,
        enabled: false,
        threshold: 2,
        recipients: ['admin@example.com']
      });

      // Send some alerts
      await alertService.processPortCheckResult(mockPortCheckResult, 2);
      
      const stats = alertService.getStats();
      
      expect(stats.totalConfigs).toBe(2);
      expect(stats.enabledConfigs).toBe(1);
      expect(stats.totalAlerts).toBe(1);
      expect(stats.sentAlerts).toBe(1);
      expect(stats.failedAlerts).toBe(0);
      expect(stats.successRate).toBe(100);
    });

    test('should calculate success rate correctly with failed alerts', async () => {
      // Add email config without setting email configuration (will fail)
      alertService.addAlertConfig({
        portConfigId: 'port-123',
        type: AlertType.EMAIL,
        enabled: true,
        threshold: 1,
        recipients: ['admin@example.com']
      });

      await alertService.processPortCheckResult(mockPortCheckResult, 2);
      
      const stats = alertService.getStats();
      
      expect(stats.totalAlerts).toBe(1);
      expect(stats.sentAlerts).toBe(0);
      expect(stats.failedAlerts).toBe(1);
      expect(stats.successRate).toBe(0);
    });
  });

  describe('Test Alert', () => {
    test('should send test alert', async () => {
      const configId = alertService.addAlertConfig({
        portConfigId: 'port-123',
        type: AlertType.LOG,
        enabled: true,
        threshold: 2,
        recipients: []
      });

      await alertService.sendTestAlert(configId);
      
      const history = alertService.getAlertHistory('port-123');
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe(AlertStatus.SENT);
    });

    test('should throw error when sending test alert for non-existent config', async () => {
      await expect(alertService.sendTestAlert('non-existent-id'))
        .rejects.toThrow('Alert config not found: non-existent-id');
    });
  });

  describe('Event Emission', () => {
    test('should emit alertSent event when alert is sent successfully', async () => {
      const alertSentSpy = jest.fn();
      alertService.on('alertSent', alertSentSpy);
      
      alertService.addAlertConfig({
        portConfigId: 'port-123',
        type: AlertType.LOG,
        enabled: true,
        threshold: 1,
        recipients: []
      });

      await alertService.processPortCheckResult(mockPortCheckResult, 2);
      
      expect(alertSentSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: EventType.ALERT_SENT,
        portConfigId: 'port-123',
        data: expect.any(Object),
        timestamp: expect.any(Date)
      }));
    });

    test('should emit alertFailed event when alert fails', async () => {
      const alertFailedSpy = jest.fn();
      alertService.on('alertFailed', alertFailedSpy);
      
      // Add email config without setting email configuration (will fail)
      alertService.addAlertConfig({
        portConfigId: 'port-123',
        type: AlertType.EMAIL,
        enabled: true,
        threshold: 1,
        recipients: ['admin@example.com']
      });

      await alertService.processPortCheckResult(mockPortCheckResult, 2);
      
      expect(alertFailedSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: EventType.ALERT_FAILED,
        portConfigId: 'port-123',
        data: expect.objectContaining({
          alert: expect.any(Object),
          error: 'Email configuration not set'
        }),
        timestamp: expect.any(Date)
      }));
    });
  });

  describe('Configuration Validation', () => {
    test('should handle unsupported alert type', async () => {
      // Manually create an invalid alert config to test error handling
      const invalidConfig = {
        id: 'invalid-123',
        portConfigId: 'port-123',
        type: 'INVALID_TYPE' as AlertType,
        enabled: true,
        threshold: 1,
        recipients: [],
        createdAt: new Date()
      };

      alertService['alertConfigs'].set(invalidConfig.id, invalidConfig);

      await alertService.processPortCheckResult(mockPortCheckResult, 2);
      
      const history = alertService.getAlertHistory('port-123');
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe(AlertStatus.FAILED);
      expect(history[0].error).toContain('Unsupported alert type');
    });
  });

  describe('Max History Size', () => {
    test('should set max history size with minimum value of 1', () => {
      alertService.setMaxHistorySize(0);
      expect(alertService['maxHistorySize']).toBe(1);
      
      alertService.setMaxHistorySize(-5);
      expect(alertService['maxHistorySize']).toBe(1);
      
      alertService.setMaxHistorySize(100);
      expect(alertService['maxHistorySize']).toBe(100);
    });
  });
});