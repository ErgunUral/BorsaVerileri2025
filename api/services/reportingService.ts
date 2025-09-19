import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  PortConfig,
  PortCheckResult,
  PortMonitorReport,
  PortMonitorStats,
  PortStatus,
  Alert,
  PortMonitorEvent
} from '../types/portMonitor.js';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  portConfigId?: string;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export enum LogCategory {
  PORT_CHECK = 'port_check',
  SCHEDULER = 'scheduler',
  ALERT = 'alert',
  SYSTEM = 'system',
  API = 'api'
}

export interface ReportFilter {
  portConfigIds?: string[];
  startDate?: Date;
  endDate?: Date;
  status?: PortStatus[];
  includeAlerts?: boolean;
}

export class ReportingService extends EventEmitter {
  private logs: LogEntry[] = [];
  private checkResults: Map<string, PortCheckResult[]> = new Map();
  private alerts: Map<string, Alert[]> = new Map();
  private maxLogSize: number = 10000;
  private maxResultsPerPort: number = 1000;

  constructor() {
    super();
  }

  /**
   * Log entry ekle
   */
  log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: any,
    portConfigId?: string
  ): void {
    const logEntry: LogEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      portConfigId
    };

    this.logs.push(logEntry);

    // Log boyutunu sınırla
    if (this.logs.length > this.maxLogSize) {
      this.logs.splice(0, this.logs.length - this.maxLogSize);
    }

    // Console'a da yazdır
    this.writeToConsole(logEntry);

    // Event emit et
    this.emit('logEntry', logEntry);
  }

  /**
   * Port check sonucunu kaydet
   */
  recordPortCheck(result: PortCheckResult): void {
    if (!this.checkResults.has(result.portConfigId)) {
      this.checkResults.set(result.portConfigId, []);
    }

    const results = this.checkResults.get(result.portConfigId)!;
    results.push(result);

    // Sonuç sayısını sınırla
    if (results.length > this.maxResultsPerPort) {
      results.splice(0, results.length - this.maxResultsPerPort);
    }

    // Log ekle
    this.log(
      result.status === PortStatus.ONLINE ? LogLevel.INFO : LogLevel.WARN,
      LogCategory.PORT_CHECK,
      `Port check: ${result.host}:${result.port} - ${result.status}`,
      {
        responseTime: result.responseTime,
        error: result.error
      },
      result.portConfigId
    );
  }

  /**
   * Alert'i kaydet
   */
  recordAlert(alert: Alert): void {
    if (!this.alerts.has(alert.portConfigId)) {
      this.alerts.set(alert.portConfigId, []);
    }

    const alerts = this.alerts.get(alert.portConfigId)!;
    alerts.push(alert);

    // Alert sayısını sınırla
    if (alerts.length > this.maxResultsPerPort) {
      alerts.splice(0, alerts.length - this.maxResultsPerPort);
    }

    // Log ekle
    this.log(
      alert.status === 'sent' ? LogLevel.INFO : LogLevel.ERROR,
      LogCategory.ALERT,
      `Alert ${alert.status}: ${alert.message}`,
      {
        alertId: alert.id,
        type: alert.type,
        error: alert.error
      },
      alert.portConfigId
    );
  }

  /**
   * Port için rapor oluştur
   */
  generatePortReport(
    portConfig: PortConfig,
    filter?: ReportFilter
  ): PortMonitorReport {
    const startDate = filter?.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // Son 24 saat
    const endDate = filter?.endDate || new Date();

    // Port check sonuçlarını filtrele
    const allResults = this.checkResults.get(portConfig.id) || [];
    const filteredResults = allResults.filter(result => 
      result.timestamp >= startDate && result.timestamp <= endDate
    );

    // İstatistikleri hesapla
    const totalChecks = filteredResults.length;
    const successfulChecks = filteredResults.filter(r => r.status === PortStatus.ONLINE).length;
    const failedChecks = totalChecks - successfulChecks;
    const averageResponseTime = this.calculateAverageResponseTime(filteredResults);
    const uptime = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 0;
    const downtimeEvents = filteredResults.filter(r => r.status !== PortStatus.ONLINE);

    // Alert'leri al
    const portAlerts = filter?.includeAlerts 
      ? (this.alerts.get(portConfig.id) || []).filter(alert => 
          alert.createdAt >= startDate && alert.createdAt <= endDate
        )
      : [];

    return {
      portConfigId: portConfig.id,
      portConfig,
      period: {
        start: startDate,
        end: endDate
      },
      stats: {
        totalChecks,
        successfulChecks,
        failedChecks,
        averageResponseTime,
        uptime,
        downtimeEvents
      },
      alerts: portAlerts
    };
  }

  /**
   * Çoklu port raporu oluştur
   */
  generateMultiPortReport(
    portConfigs: PortConfig[],
    filter?: ReportFilter
  ): PortMonitorReport[] {
    return portConfigs.map(config => this.generatePortReport(config, filter));
  }

  /**
   * Sistem istatistiklerini al
   */
  getSystemStats(filter?: ReportFilter): PortMonitorStats {
    const startDate = filter?.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = filter?.endDate || new Date();
    const portConfigIds = filter?.portConfigIds;

    let totalPorts = 0;
    let onlinePorts = 0;
    let offlinePorts = 0;
    let totalChecks = 0;
    let successfulChecks = 0;
    let failedChecks = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    // Tüm port sonuçlarını işle
    for (const [portConfigId, results] of this.checkResults.entries()) {
      // Port filtresi varsa kontrol et
      if (portConfigIds && !portConfigIds.includes(portConfigId)) {
        continue;
      }

      totalPorts++;

      // Tarih aralığındaki sonuçları filtrele
      const filteredResults = results.filter(result => 
        result.timestamp >= startDate && result.timestamp <= endDate
      );

      if (filteredResults.length === 0) {
        continue;
      }

      // Son durumu kontrol et
      const lastResult = filteredResults[filteredResults.length - 1];
      if (lastResult.status === PortStatus.ONLINE) {
        onlinePorts++;
      } else {
        offlinePorts++;
      }

      // İstatistikleri topla
      totalChecks += filteredResults.length;
      const portSuccessful = filteredResults.filter(r => r.status === PortStatus.ONLINE).length;
      successfulChecks += portSuccessful;
      failedChecks += filteredResults.length - portSuccessful;

      // Response time'ları topla
      filteredResults.forEach(result => {
        if (result.responseTime !== undefined) {
          totalResponseTime += result.responseTime;
          responseTimeCount++;
        }
      });
    }

    const averageResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;
    const uptime = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 0;

    return {
      totalPorts,
      onlinePorts,
      offlinePorts,
      totalChecks,
      successfulChecks,
      failedChecks,
      averageResponseTime,
      uptime
    };
  }

  /**
   * Log'ları al
   */
  getLogs(
    filter?: {
      level?: LogLevel[];
      category?: LogCategory[];
      portConfigId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.level) {
        filteredLogs = filteredLogs.filter(log => filter.level!.includes(log.level));
      }
      if (filter.category) {
        filteredLogs = filteredLogs.filter(log => filter.category!.includes(log.category));
      }
      if (filter.portConfigId) {
        filteredLogs = filteredLogs.filter(log => log.portConfigId === filter.portConfigId);
      }
      if (filter.startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endDate!);
      }
      if (filter.limit && filter.limit > 0) {
        filteredLogs = filteredLogs.slice(-filter.limit);
      }
    }

    return filteredLogs;
  }

  /**
   * Port check sonuçlarını al
   */
  getPortCheckResults(
    portConfigId: string,
    filter?: {
      startDate?: Date;
      endDate?: Date;
      status?: PortStatus[];
      limit?: number;
    }
  ): PortCheckResult[] {
    const results = this.checkResults.get(portConfigId) || [];
    let filteredResults = [...results];

    if (filter) {
      if (filter.startDate) {
        filteredResults = filteredResults.filter(result => result.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        filteredResults = filteredResults.filter(result => result.timestamp <= filter.endDate!);
      }
      if (filter.status) {
        filteredResults = filteredResults.filter(result => filter.status!.includes(result.status));
      }
      if (filter.limit && filter.limit > 0) {
        filteredResults = filteredResults.slice(-filter.limit);
      }
    }

    return filteredResults;
  }

  /**
   * Ortalama response time hesapla
   */
  private calculateAverageResponseTime(results: PortCheckResult[]): number {
    const validResults = results.filter(r => r.responseTime !== undefined);
    if (validResults.length === 0) return 0;

    const total = validResults.reduce((sum, r) => sum + (r.responseTime || 0), 0);
    return total / validResults.length;
  }

  /**
   * Console'a log yazdır
   */
  private writeToConsole(logEntry: LogEntry): void {
    const timestamp = logEntry.timestamp.toISOString();
    const level = logEntry.level.toUpperCase().padEnd(5);
    const category = logEntry.category.toUpperCase().padEnd(12);
    const portInfo = logEntry.portConfigId ? `[${logEntry.portConfigId.slice(0, 8)}]` : '';
    
    const message = `${timestamp} ${level} ${category} ${portInfo} ${logEntry.message}`;

    switch (logEntry.level) {
      case LogLevel.ERROR:
        console.error(message);
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      case LogLevel.INFO:
        console.info(message);
        break;
      case LogLevel.DEBUG:
        console.debug(message);
        break;
      default:
        console.log(message);
    }

    if (logEntry.data) {
      console.log('  Data:', JSON.stringify(logEntry.data, null, 2));
    }
  }

  /**
   * Rapor export et (JSON formatında)
   */
  exportReport(
    portConfigs: PortConfig[],
    filter?: ReportFilter
  ): string {
    const reports = this.generateMultiPortReport(portConfigs, filter);
    const systemStats = this.getSystemStats(filter);
    
    const exportData = {
      generatedAt: new Date().toISOString(),
      filter,
      systemStats,
      portReports: reports
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Verileri temizle
   */
  clearData(options?: {
    clearLogs?: boolean;
    clearResults?: boolean;
    clearAlerts?: boolean;
    olderThan?: Date;
  }): void {
    const olderThan = options?.olderThan;

    if (options?.clearLogs !== false) {
      if (olderThan) {
        this.logs = this.logs.filter(log => log.timestamp > olderThan);
      } else {
        this.logs = [];
      }
    }

    if (options?.clearResults !== false) {
      if (olderThan) {
        for (const [portId, results] of this.checkResults.entries()) {
          const filteredResults = results.filter(result => result.timestamp > olderThan);
          if (filteredResults.length > 0) {
            this.checkResults.set(portId, filteredResults);
          } else {
            this.checkResults.delete(portId);
          }
        }
      } else {
        this.checkResults.clear();
      }
    }

    if (options?.clearAlerts !== false) {
      if (olderThan) {
        for (const [portId, alerts] of this.alerts.entries()) {
          const filteredAlerts = alerts.filter(alert => alert.createdAt > olderThan);
          if (filteredAlerts.length > 0) {
            this.alerts.set(portId, filteredAlerts);
          } else {
            this.alerts.delete(portId);
          }
        }
      } else {
        this.alerts.clear();
      }
    }

    this.log(LogLevel.INFO, LogCategory.SYSTEM, 'Data cleared', options);
  }

  /**
   * Servis istatistiklerini al
   */
  getServiceStats() {
    return {
      totalLogs: this.logs.length,
      totalPorts: this.checkResults.size,
      totalChecks: Array.from(this.checkResults.values())
        .reduce((sum, results) => sum + results.length, 0),
      totalAlerts: Array.from(this.alerts.values())
        .reduce((sum, alerts) => sum + alerts.length, 0),
      memoryUsage: {
        logs: this.logs.length,
        checkResults: Array.from(this.checkResults.values())
          .reduce((sum, results) => sum + results.length, 0),
        alerts: Array.from(this.alerts.values())
          .reduce((sum, alerts) => sum + alerts.length, 0)
      }
    };
  }

  /**
   * Maksimum boyutları ayarla
   */
  setMaxSizes(logSize?: number, resultsPerPort?: number): void {
    if (logSize !== undefined) {
      this.maxLogSize = Math.max(100, logSize);
    }
    if (resultsPerPort !== undefined) {
      this.maxResultsPerPort = Math.max(10, resultsPerPort);
    }
  }
}

// Singleton instance
export const reportingService = new ReportingService();