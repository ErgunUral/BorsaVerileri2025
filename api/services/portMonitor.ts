import { Socket } from 'net';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  PortConfig,
  PortCheckResult,
  PortStatus,
  PortMonitorConfig,
  PortCheckOptions,
  PortMonitorEvent,
  EventType
} from '../types/portMonitor';

export class PortMonitorService extends EventEmitter {
  private config: PortMonitorConfig;
  private activeChecks: Map<string, boolean> = new Map();

  constructor(config?: Partial<PortMonitorConfig>) {
    super();
    this.config = {
      defaultTimeout: 5000,
      defaultInterval: 30000,
      maxConcurrentChecks: 10,
      retryAttempts: 3,
      retryDelay: 1000,
      alertThreshold: 3,
      ...config
    };
  }

  /**
   * TCP bağlantısı ile port erişilebilirlik kontrolü
   */
  async checkPort(
    host: string,
    port: number,
    options?: PortCheckOptions
  ): Promise<PortCheckResult> {
    const checkId = uuidv4();
    const timeout = options?.timeout || this.config.defaultTimeout;
    const retryAttempts = options?.retryAttempts || this.config.retryAttempts;
    const retryDelay = options?.retryDelay || this.config.retryDelay;

    const result: PortCheckResult = {
      id: checkId,
      portConfigId: '',
      host,
      port,
      status: PortStatus.OFFLINE,
      timestamp: new Date()
    };

    let lastError: string | undefined;
    const startTime = Date.now();

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        const isConnectable = await this.attemptConnection(host, port, timeout);
        
        if (isConnectable) {
          result.status = PortStatus.ONLINE;
          result.responseTime = Date.now() - startTime;
          break;
        } else {
          lastError = 'Connection failed';
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        
        if (error instanceof Error && error.message.includes('timeout')) {
          result.status = PortStatus.TIMEOUT;
        } else {
          result.status = PortStatus.ERROR;
        }
      }

      // Son deneme değilse bekle
      if (attempt < retryAttempts) {
        await this.delay(retryDelay);
      }
    }

    if (result.status !== PortStatus.ONLINE) {
      result.error = lastError || 'Unknown error';
    }

    // Event emit et
    this.emitPortEvent(result);

    return result;
  }

  /**
   * Port konfigürasyonu ile kontrol
   */
  async checkPortConfig(portConfig: PortConfig): Promise<PortCheckResult> {
    const result = await this.checkPort(
      portConfig.host,
      portConfig.port,
      {
        timeout: portConfig.timeout,
        retryAttempts: this.config.retryAttempts,
        retryDelay: this.config.retryDelay
      }
    );

    result.portConfigId = portConfig.id;
    return result;
  }

  /**
   * Çoklu port kontrolü
   */
  async checkMultiplePorts(
    portConfigs: PortConfig[],
    concurrency?: number
  ): Promise<PortCheckResult[]> {
    const maxConcurrency = concurrency || this.config.maxConcurrentChecks;
    const results: PortCheckResult[] = [];
    
    // Batch'lere böl
    for (let i = 0; i < portConfigs.length; i += maxConcurrency) {
      const batch = portConfigs.slice(i, i + maxConcurrency);
      const batchPromises = batch.map(config => this.checkPortConfig(config));
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Hata durumunda default result oluştur
          const config = batch[index];
          results.push({
            id: uuidv4(),
            portConfigId: config.id,
            host: config.host,
            port: config.port,
            status: PortStatus.ERROR,
            error: result.reason?.message || 'Check failed',
            timestamp: new Date()
          });
        }
      });
    }

    return results;
  }

  /**
   * TCP bağlantı denemesi
   */
  private attemptConnection(host: string, port: number, timeout: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const socket = new Socket();
      let isResolved = false;

      const cleanup = () => {
        if (!socket.destroyed) {
          socket.destroy();
        }
      };

      const handleSuccess = () => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          resolve(true);
        }
      };

      const handleError = (error: Error) => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          reject(error);
        }
      };

      // Timeout ayarla
      const timeoutId = setTimeout(() => {
        handleError(new Error(`Connection timeout after ${timeout}ms`));
      }, timeout);

      socket.setTimeout(timeout);

      socket.on('connect', () => {
        clearTimeout(timeoutId);
        handleSuccess();
      });

      socket.on('error', (error) => {
        clearTimeout(timeoutId);
        handleError(error);
      });

      socket.on('timeout', () => {
        clearTimeout(timeoutId);
        handleError(new Error(`Socket timeout after ${timeout}ms`));
      });

      try {
        socket.connect(port, host);
      } catch (error) {
        clearTimeout(timeoutId);
        handleError(error instanceof Error ? error : new Error('Connection failed'));
      }
    });
  }

  /**
   * Port event'i emit et
   */
  private emitPortEvent(result: PortCheckResult): void {
    let eventType: EventType;
    
    switch (result.status) {
      case PortStatus.ONLINE:
        eventType = EventType.PORT_ONLINE;
        break;
      case PortStatus.OFFLINE:
        eventType = EventType.PORT_OFFLINE;
        break;
      case PortStatus.TIMEOUT:
        eventType = EventType.PORT_TIMEOUT;
        break;
      case PortStatus.ERROR:
        eventType = EventType.PORT_ERROR;
        break;
      default:
        eventType = EventType.PORT_ERROR;
    }

    const event: PortMonitorEvent = {
      type: eventType,
      portConfigId: result.portConfigId,
      data: result,
      timestamp: new Date()
    };

    this.emit('portCheck', event);
    this.emit(eventType, event);
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Aktif kontrol sayısını al
   */
  getActiveCheckCount(): number {
    return this.activeChecks.size;
  }

  /**
   * Konfigürasyonu güncelle
   */
  updateConfig(newConfig: Partial<PortMonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Mevcut konfigürasyonu al
   */
  getConfig(): PortMonitorConfig {
    return { ...this.config };
  }

  /**
   * Servis durumunu al
   */
  getStatus() {
    return {
      activeChecks: this.activeChecks.size,
      config: this.config,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
  }
}

// Singleton instance
export const portMonitorService = new PortMonitorService();