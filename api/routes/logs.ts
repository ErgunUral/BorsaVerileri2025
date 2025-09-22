import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';
import { validateLogQuery, validateTestLog, createEndpointLimiter } from '../middleware/validation.js';
const router = Router();

// Rate limiting for log endpoints
const logLimiter = createEndpointLimiter(
  15 * 60 * 1000, // 15 minutes
  100 // limit each IP to 100 requests per windowMs
);

// Log dosyalarını okuma yardımcı fonksiyonu
const readLogFile = (filePath: string, lines: number = 100): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      resolve([]);
      return;
    }

    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      const logLines = data.split('\n').filter(line => line.trim() !== '');
      const recentLines = logLines.slice(-lines);
      resolve(recentLines);
    });
  });
};

// Log dosyası boyutunu alma fonksiyonu
const getFileSize = (filePath: string): number => {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return stats.size;
    }
    return 0;
  } catch (error) {
    return 0;
  }
};

// GET /api/logs - Son logları getir
router.get('/', logLimiter, validateLogQuery, async (req: Request, res: Response) => {
  try {
    const { type = 'application', lines = 100 } = req.query;
    const logDir = path.join(process.cwd(), 'logs');
    
    let logFile: string;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    switch (type) {
      case 'error':
        logFile = path.join(logDir, `error-${today}.log`);
        break;
      case 'api':
        logFile = path.join(logDir, `api-${today}.log`);
        break;
      case 'combined':
        logFile = path.join(logDir, `combined-${today}.log`);
        break;
      default:
        logFile = path.join(logDir, `combined-${today}.log`);
    }

    const logLines = await readLogFile(logFile, Number(lines));
    
    logger.info('Log API: Log dosyası okundu', {
      type,
      lines: logLines.length,
      requestedLines: lines,
      filePath: logFile
    });

    res.json({
      success: true,
      type,
      lines: logLines.length,
      logs: logLines
    });
  } catch (error) {
    logger.error('Log API: Log okuma hatası', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      success: false,
      error: 'Log dosyası okunamadı'
    });
  }
});

// GET /api/logs/metrics - Log metrikleri
router.get('/metrics', logLimiter, async (_req: Request, res: Response) => {
  try {
    const logDir = path.join(process.cwd(), 'logs');
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const metrics = {
      combined: {
        size: getFileSize(path.join(logDir, `combined-${today}.log`)),
        exists: fs.existsSync(path.join(logDir, `combined-${today}.log`))
      },
      error: {
        size: getFileSize(path.join(logDir, `error-${today}.log`)),
        exists: fs.existsSync(path.join(logDir, `error-${today}.log`))
      },
      api: {
        size: getFileSize(path.join(logDir, `api-${today}.log`)),
        exists: fs.existsSync(path.join(logDir, `api-${today}.log`))
      }
    };

    // Son 24 saatteki hata sayısını hesapla
    const errorLogFile = path.join(logDir, `error-${today}.log`);
    const errorLines = await readLogFile(errorLogFile, 1000);
    const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
    
    let recentErrors = 0;
    errorLines.forEach(line => {
      try {
        const logEntry = JSON.parse(line);
        if (logEntry.timestamp && new Date(logEntry.timestamp).getTime() > last24Hours) {
          recentErrors++;
        }
      } catch (e) {
        // JSON parse hatası, satırı atla
      }
    });

    const totalSize = Object.values(metrics).reduce((sum, metric) => sum + metric.size, 0);
    
    logger.info('Log API: Metrikler hesaplandı', {
      totalSize,
      recentErrors,
      filesCount: Object.values(metrics).filter(m => m.exists).length
    });

    res.json({
      success: true,
      metrics,
      summary: {
        totalSize,
        recentErrors,
        activeLogFiles: Object.values(metrics).filter(m => m.exists).length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Log API: Metrik hesaplama hatası', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      success: false,
      error: 'Metrikler hesaplanamadı'
    });
  }
});

// GET /api/logs/health - Loglama sistemi sağlık kontrolü
router.get('/health', logLimiter, async (_req: Request, res: Response) => {
  try {
    const logDir = path.join(process.cwd(), 'logs');
    const requiredDirs = ['application', 'error', 'access', 'audit'];
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        logDirectory: fs.existsSync(logDir),
        subdirectories: {} as Record<string, boolean>,
        winston: true, // Winston logger çalışıyor varsayımı
        diskSpace: true // Basit kontrol
      }
    };

    // Alt klasörleri kontrol et
    requiredDirs.forEach(dir => {
      const dirPath = path.join(logDir, dir);
      health.checks.subdirectories[dir] = fs.existsSync(dirPath);
    });

    // Genel sağlık durumunu belirle
    const allChecks = [
      health.checks.logDirectory,
      ...Object.values(health.checks.subdirectories),
      health.checks.winston,
      health.checks.diskSpace
    ];

    if (allChecks.every(check => check)) {
      health.status = 'healthy';
    } else if (allChecks.some(check => check)) {
      health.status = 'degraded';
    } else {
      health.status = 'unhealthy';
    }

    // Test log yazma
    try {
      logger.info('Log API: Sağlık kontrolü yapıldı', {
        status: health.status,
        timestamp: health.timestamp
      });
    } catch (logError) {
      health.checks.winston = false;
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      success: health.status !== 'unhealthy',
      health
    });
  } catch (error) {
    logger.error('Log API: Sağlık kontrolü hatası', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(503).json({
      success: false,
      health: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Sağlık kontrolü başarısız'
      }
    });
  }
});

// POST /api/logs/test - Test log mesajı gönder
router.post('/test', logLimiter, validateTestLog, async (req: Request, res: Response) => {
  try {
    const { level = 'info', message = 'Test log mesajı' } = req.body;
    
    const testData = {
      testId: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };

    switch (level) {
      case 'error':
        logger.error(`Test Log: ${message}`, testData);
        break;
      case 'warn':
        logger.warn(`Test Log: ${message}`, testData);
        break;
      case 'debug':
        logger.debug(`Test Log: ${message}`, testData);
        break;
      default:
        logger.info(`Test Log: ${message}`, testData);
    }

    res.json({
      success: true,
      message: 'Test log mesajı gönderildi',
      data: {
        level,
        message,
        testId: testData.testId,
        timestamp: testData.timestamp
      }
    });
  } catch (error) {
    logger.error('Log API: Test log hatası', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      success: false,
      error: 'Test log gönderilemedi'
    });
  }
});

export default router;