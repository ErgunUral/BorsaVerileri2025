import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  Alert,
  AlertConfig,
  AlertType,
  AlertStatus,
  PortCheckResult,
  PortStatus,
  EventType
} from '../types/portMonitor';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export interface WebhookConfig {
  url: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;
  timeout: number;
}

export class AlertService extends EventEmitter {
  private alertConfigs: Map<string, AlertConfig> = new Map();
  private pendingAlerts: Map<string, Alert> = new Map();
  private alertHistory: Map<string, Alert[]> = new Map();
  private emailConfig?: EmailConfig;
  private webhookConfig?: WebhookConfig;
  private maxHistorySize: number = 1000;

  constructor() {
    super();
  }

  /**
   * Email konfigürasyonu ayarla
   */
  setEmailConfig(config: EmailConfig): void {
    this.emailConfig = config;
  }

  /**
   * Webhook konfigürasyonu ayarla
   */
  setWebhookConfig(config: WebhookConfig): void {
    this.webhookConfig = config;
  }

  /**
   * Alert konfigürasyonu ekle
   */
  addAlertConfig(config: Omit<AlertConfig, 'id' | 'createdAt'>): string {
    const alertConfig: AlertConfig = {
      ...config,
      id: uuidv4(),
      createdAt: new Date()
    };

    this.alertConfigs.set(alertConfig.id, alertConfig);
    console.log(`Alert config added: ${alertConfig.id} for port ${alertConfig.portConfigId}`);
    
    return alertConfig.id;
  }

  /**
   * Alert konfigürasyonu kaldır
   */
  removeAlertConfig(alertConfigId: string): boolean {
    const removed = this.alertConfigs.delete(alertConfigId);
    if (removed) {
      console.log(`Alert config removed: ${alertConfigId}`);
    }
    return removed;
  }

  /**
   * Port için alert konfigürasyonlarını al
   */
  getAlertConfigsForPort(portConfigId: string): AlertConfig[] {
    return Array.from(this.alertConfigs.values())
      .filter(config => config.portConfigId === portConfigId && config.enabled);
  }

  /**
   * Port check sonucunu işle ve gerekirse alert gönder
   */
  async processPortCheckResult(
    result: PortCheckResult,
    consecutiveFailures: number
  ): Promise<void> {
    const alertConfigs = this.getAlertConfigsForPort(result.portConfigId);
    
    for (const alertConfig of alertConfigs) {
      // Threshold kontrolü
      if (result.status !== PortStatus.ONLINE && consecutiveFailures >= alertConfig.threshold) {
        await this.sendAlert(alertConfig, result, consecutiveFailures);
      }
    }
  }

  /**
   * Alert gönder
   */
  private async sendAlert(
    alertConfig: AlertConfig,
    result: PortCheckResult,
    consecutiveFailures: number
  ): Promise<void> {
    const alert: Alert = {
      id: uuidv4(),
      alertConfigId: alertConfig.id,
      portConfigId: alertConfig.portConfigId,
      type: alertConfig.type,
      message: this.generateAlertMessage(alertConfig, result, consecutiveFailures),
      status: AlertStatus.PENDING,
      createdAt: new Date()
    };

    this.pendingAlerts.set(alert.id, alert);

    try {
      switch (alertConfig.type) {
        case AlertType.EMAIL:
          await this.sendEmailAlert(alert, alertConfig);
          break;
        case AlertType.WEBHOOK:
          await this.sendWebhookAlert(alert, alertConfig, result);
          break;
        case AlertType.LOG:
          this.sendLogAlert(alert);
          break;
        case AlertType.CONSOLE:
          this.sendConsoleAlert(alert);
          break;
        default:
          throw new Error(`Unsupported alert type: ${alertConfig.type}`);
      }

      alert.status = AlertStatus.SENT;
      alert.sentAt = new Date();
      
      console.log(`Alert sent successfully: ${alert.id} (${alertConfig.type})`);
      
      // Event emit et
      this.emit('alertSent', {
        type: EventType.ALERT_SENT,
        portConfigId: alert.portConfigId,
        data: alert,
        timestamp: new Date()
      });

    } catch (error) {
      alert.status = AlertStatus.FAILED;
      alert.error = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`Failed to send alert ${alert.id}:`, error);
      
      // Event emit et
      this.emit('alertFailed', {
        type: EventType.ALERT_FAILED,
        portConfigId: alert.portConfigId,
        data: { alert, error: alert.error },
        timestamp: new Date()
      });
    } finally {
      // Pending'den kaldır ve history'ye ekle
      this.pendingAlerts.delete(alert.id);
      this.addToHistory(alert);
    }
  }

  /**
   * Email alert gönder
   */
  private async sendEmailAlert(alert: Alert, alertConfig: AlertConfig): Promise<void> {
    if (!this.emailConfig) {
      throw new Error('Email configuration not set');
    }

    // Bu gerçek uygulamada nodemailer veya benzeri bir kütüphane kullanacak
    // Şimdilik mock implementation
    console.log(`📧 EMAIL ALERT: ${alert.message}`);
    console.log(`📧 Recipients: ${alertConfig.recipients.join(', ')}`);
    
    // Simulated email sending delay
    await this.delay(100);
  }

  /**
   * Webhook alert gönder
   */
  private async sendWebhookAlert(
    alert: Alert,
    alertConfig: AlertConfig,
    result: PortCheckResult
  ): Promise<void> {
    if (!this.webhookConfig) {
      throw new Error('Webhook configuration not set');
    }

    const payload = {
      alert: {
        id: alert.id,
        message: alert.message,
        timestamp: alert.createdAt.toISOString()
      },
      port: {
        host: result.host,
        port: result.port,
        status: result.status,
        error: result.error
      },
      config: {
        recipients: alertConfig.recipients
      }
    };

    // Bu gerçek uygulamada fetch veya axios kullanacak
    // Şimdilik mock implementation
    console.log(`🔗 WEBHOOK ALERT: ${this.webhookConfig.url}`);
    console.log(`🔗 Payload:`, JSON.stringify(payload, null, 2));
    
    // Simulated webhook sending delay
    await this.delay(200);
  }

  /**
   * Log alert gönder
   */
  private sendLogAlert(alert: Alert): void {
    console.log(`📝 LOG ALERT [${alert.createdAt.toISOString()}]: ${alert.message}`);
  }

  /**
   * Console alert gönder
   */
  private sendConsoleAlert(alert: Alert): void {
    console.warn(`🚨 CONSOLE ALERT: ${alert.message}`);
  }

  /**
   * Alert mesajı oluştur
   */
  private generateAlertMessage(
    alertConfig: AlertConfig,
    result: PortCheckResult,
    consecutiveFailures: number
  ): string {
    if (alertConfig.message) {
      return alertConfig.message
        .replace('{host}', result.host)
        .replace('{port}', result.port.toString())
        .replace('{status}', result.status)
        .replace('{error}', result.error || 'N/A')
        .replace('{failures}', consecutiveFailures.toString())
        .replace('{timestamp}', result.timestamp.toISOString());
    }

    return `Port ${result.host}:${result.port} is ${result.status.toUpperCase()}. ` +
           `Consecutive failures: ${consecutiveFailures}. ` +
           `Error: ${result.error || 'N/A'}. ` +
           `Timestamp: ${result.timestamp.toISOString()}`;
  }

  /**
   * Alert'i history'ye ekle
   */
  private addToHistory(alert: Alert): void {
    if (!this.alertHistory.has(alert.portConfigId)) {
      this.alertHistory.set(alert.portConfigId, []);
    }

    const history = this.alertHistory.get(alert.portConfigId)!;
    history.push(alert);

    // History boyutunu sınırla
    if (history.length > this.maxHistorySize) {
      history.splice(0, history.length - this.maxHistorySize);
    }
  }

  /**
   * Port için alert history'sini al
   */
  getAlertHistory(portConfigId: string, limit?: number): Alert[] {
    const history = this.alertHistory.get(portConfigId) || [];
    
    if (limit && limit > 0) {
      return history.slice(-limit);
    }
    
    return [...history];
  }

  /**
   * Tüm alert konfigürasyonlarını al
   */
  getAllAlertConfigs(): AlertConfig[] {
    return Array.from(this.alertConfigs.values());
  }

  /**
   * Alert konfigürasyonu al
   */
  getAlertConfig(alertConfigId: string): AlertConfig | null {
    return this.alertConfigs.get(alertConfigId) || null;
  }

  /**
   * Alert konfigürasyonu güncelle
   */
  updateAlertConfig(
    alertConfigId: string,
    updates: Partial<Omit<AlertConfig, 'id' | 'createdAt'>>
  ): boolean {
    const config = this.alertConfigs.get(alertConfigId);
    if (!config) {
      return false;
    }

    Object.assign(config, updates);
    console.log(`Alert config updated: ${alertConfigId}`);
    
    return true;
  }

  /**
   * Pending alert'leri al
   */
  getPendingAlerts(): Alert[] {
    return Array.from(this.pendingAlerts.values());
  }

  /**
   * Alert istatistiklerini al
   */
  getStats() {
    const totalConfigs = this.alertConfigs.size;
    const enabledConfigs = Array.from(this.alertConfigs.values())
      .filter(config => config.enabled).length;
    const pendingAlerts = this.pendingAlerts.size;
    const totalAlerts = Array.from(this.alertHistory.values())
      .reduce((sum, history) => sum + history.length, 0);
    const sentAlerts = Array.from(this.alertHistory.values())
      .flat()
      .filter(alert => alert.status === AlertStatus.SENT).length;
    const failedAlerts = Array.from(this.alertHistory.values())
      .flat()
      .filter(alert => alert.status === AlertStatus.FAILED).length;

    return {
      totalConfigs,
      enabledConfigs,
      pendingAlerts,
      totalAlerts,
      sentAlerts,
      failedAlerts,
      successRate: totalAlerts > 0 ? (sentAlerts / totalAlerts) * 100 : 0
    };
  }

  /**
   * Test alert gönder
   */
  async sendTestAlert(alertConfigId: string): Promise<void> {
    const alertConfig = this.alertConfigs.get(alertConfigId);
    if (!alertConfig) {
      throw new Error(`Alert config not found: ${alertConfigId}`);
    }

    const testResult: PortCheckResult = {
      id: uuidv4(),
      portConfigId: alertConfig.portConfigId,
      host: 'test.example.com',
      port: 80,
      status: PortStatus.OFFLINE,
      error: 'Test alert',
      timestamp: new Date()
    };

    await this.sendAlert(alertConfig, testResult, alertConfig.threshold);
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * History boyutunu ayarla
   */
  setMaxHistorySize(size: number): void {
    this.maxHistorySize = Math.max(1, size);
  }
}

// Singleton instance
export const alertService = new AlertService();