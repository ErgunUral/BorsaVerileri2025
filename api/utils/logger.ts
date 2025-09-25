import * as fs from 'fs';
import * as path from 'path';

// Log seviyeleri
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

// Log entry interface
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
  stack?: string | undefined;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

// Logger konfigürasyonu
interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  logDir: string;
  maxFileSize: number; // MB
  maxFiles: number;
  enableRemote: boolean;
  remoteEndpoint?: string;
}

class Logger {
  private config: LoggerConfig;
  private logQueue: LogEntry[] = [];
  private isProcessing = false;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: process.env['NODE_ENV'] === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
      enableConsole: process.env['NODE_ENV'] !== 'production',
      enableFile: true,
      logDir: path.join(process.cwd(), 'logs'),
      maxFileSize: 10, // 10MB
      maxFiles: 5,
      enableRemote: false,
      ...config
    };

    // Log dizinini oluştur
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    try {
      if (!fs.existsSync(this.config.logDir)) {
        fs.mkdirSync(this.config.logDir, { recursive: true });
      }
    } catch (error) {
      console.error('Log dizini oluşturulamadı:', error);
    }
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const baseMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (data) {
      return `${baseMessage} ${JSON.stringify(data, null, 2)}`;
    }
    
    return baseMessage;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.config.level;
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    if (!this.config.enableFile) return;

    try {
      const logFile = path.join(this.config.logDir, `app-${new Date().toISOString().split('T')[0]}.log`);
      const logLine = `${entry.timestamp} [${entry.level}] ${entry.message}${entry.data ? ` ${JSON.stringify(entry.data)}` : ''}${entry.stack ? `\n${entry.stack}` : ''}\n`;
      
      // Dosya boyutu kontrolü
      if (fs.existsSync(logFile)) {
        const stats = fs.statSync(logFile);
        if (stats.size > this.config.maxFileSize * 1024 * 1024) {
          await this.rotateLogFile(logFile);
        }
      }
      
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error('Log dosyasına yazma hatası:', error);
    }
  }

  private async rotateLogFile(currentFile: string): Promise<void> {
    try {
      const dir = path.dirname(currentFile);
      const baseName = path.basename(currentFile, '.log');
      
      // Mevcut dosyaları kaydır
      for (let i = this.config.maxFiles - 1; i > 0; i--) {
        const oldFile = path.join(dir, `${baseName}.${i}.log`);
        const newFile = path.join(dir, `${baseName}.${i + 1}.log`);
        
        if (fs.existsSync(oldFile)) {
          if (i === this.config.maxFiles - 1) {
            fs.unlinkSync(oldFile); // En eski dosyayı sil
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }
      
      // Mevcut dosyayı .1 olarak kaydet
      const rotatedFile = path.join(dir, `${baseName}.1.log`);
      fs.renameSync(currentFile, rotatedFile);
    } catch (error) {
      console.error('Log dosyası rotasyonu hatası:', error);
    }
  }

  private async sendToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.enableRemote || !this.config.remoteEndpoint) return;

    try {
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });
      
      if (!response.ok) {
        console.error('Remote logging hatası:', response.statusText);
      }
    } catch (error) {
      console.error('Remote logging bağlantı hatası:', error);
    }
  }

  private async processLogQueue(): Promise<void> {
    if (this.isProcessing || this.logQueue.length === 0) return;
    
    this.isProcessing = true;
    
    try {
      while (this.logQueue.length > 0) {
        const entry = this.logQueue.shift();
        if (entry) {
          await Promise.all([
            this.writeToFile(entry),
            this.sendToRemote(entry)
          ]);
        }
      }
    } catch (error) {
      console.error('Log queue işleme hatası:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private log(level: LogLevel, levelName: string, message: string, data?: any, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: levelName,
      message,
      data,
      stack: error?.stack || undefined
    };

    // Console'a yazdır (development'ta)
    if (this.config.enableConsole) {
      const formattedMessage = this.formatMessage(levelName, message, data);
      
      switch (level) {
        case LogLevel.ERROR:
          console.error(formattedMessage, error?.stack || '');
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.INFO:
          console.info(formattedMessage);
          break;
        case LogLevel.DEBUG:
          console.debug(formattedMessage);
          break;
      }
    }

    // Queue'ya ekle
    this.logQueue.push(entry);
    
    // Async olarak işle
    setImmediate(() => this.processLogQueue());
  }

  // Public methods
  error(message: string, error?: Error, data?: any): void {
    this.log(LogLevel.ERROR, 'ERROR', message, data, error);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, 'WARN', message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, 'INFO', message, data);
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, data);
  }

  // Context methods
  withContext(context: { userId?: string; sessionId?: string; requestId?: string }) {
    return {
      error: (message: string, error?: Error, data?: any) => {
        this.log(LogLevel.ERROR, 'ERROR', message, { ...data, ...context }, error);
      },
      warn: (message: string, data?: any) => {
        this.log(LogLevel.WARN, 'WARN', message, { ...data, ...context });
      },
      info: (message: string, data?: any) => {
        this.log(LogLevel.INFO, 'INFO', message, { ...data, ...context });
      },
      debug: (message: string, data?: any) => {
        this.log(LogLevel.DEBUG, 'DEBUG', message, { ...data, ...context });
      }
    };
  }

  // Performance logging
  time(label: string): void {
    console.time(label);
  }

  timeEnd(label: string, data?: any): void {
    console.timeEnd(label);
    this.debug(`Timer ${label} completed`, data);
  }

  // Metrics logging
  metric(name: string, value: number, unit?: string, tags?: Record<string, string>): void {
    this.info(`Metric: ${name}`, {
      metric: name,
      value,
      unit,
      tags,
      timestamp: Date.now()
    });
  }

  // Audit logging
  audit(action: string, userId?: string, details?: any): void {
    this.info(`Audit: ${action}`, {
      action,
      userId,
      details,
      timestamp: Date.now(),
      type: 'audit'
    });
  }

  // Security logging
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: any): void {
    this.warn(`Security: ${event}`, {
      event,
      severity,
      details,
      timestamp: Date.now(),
      type: 'security'
    });
  }

  // Cleanup method
  async cleanup(): Promise<void> {
    // Queue'daki tüm logları işle
    await this.processLogQueue();
  }
}

// Singleton instance
const logger = new Logger();

// Express middleware için request logger
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  req.requestId = requestId;
  req.logger = logger.withContext({ requestId });
  
  // Request başlangıcını logla
  logger.info('Request started', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId
  });
  
  // Response bittiğinde logla
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      requestId
    });
  });
  
  next();
};

// Error handler middleware
export const errorLogger = (error: Error, req: any, _res: any, next: any) => {
  logger.error('Request error', error, {
    method: req.method,
    url: req.url,
    requestId: req.requestId,
    body: req.body,
    params: req.params,
    query: req.query
  });
  
  next(error);
};

// Graceful shutdown handler - only in production
if (process.env['NODE_ENV'] !== 'test') {
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, cleaning up logs...');
    await logger.cleanup();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, cleaning up logs...');
    await logger.cleanup();
    process.exit(0);
  });

  // Unhandled rejection handler
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', new Error(String(reason)), {
      promise: promise.toString()
    });
  });

  // Uncaught exception handler
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', error);
    process.exit(1);
  });
}

export default logger;
export { Logger };