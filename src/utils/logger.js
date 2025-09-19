const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Log formatı
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, service, module, operation, data, requestId, userId, duration, metadata, stack }) => {
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      service: service || 'BorsaVerileri2025',
      module,
      operation,
      message,
      data,
      requestId,
      userId,
      duration,
      metadata
    };
    
    if (stack) {
      logEntry.stack = stack;
    }
    
    return JSON.stringify(logEntry);
  })
);

// Console formatı (development için)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, service, module, operation }) => {
    const serviceInfo = service ? `[${service}]` : '';
    const moduleInfo = module ? `[${module}]` : '';
    const operationInfo = operation ? `[${operation}]` : '';
    return `${timestamp} ${level}: ${serviceInfo}${moduleInfo}${operationInfo} ${message}`;
  })
);

// Application logs transport
const applicationTransport = new DailyRotateFile({
  filename: path.join('logs', 'application', 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '100m',
  maxFiles: '30d',
  format: logFormat
});

// Error logs transport
const errorTransport = new DailyRotateFile({
  level: 'error',
  filename: path.join('logs', 'error', 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '50m',
  maxFiles: '90d',
  format: logFormat
});

// Access logs transport
const accessTransport = new DailyRotateFile({
  filename: path.join('logs', 'access', 'access-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '200m',
  maxFiles: '7d',
  format: logFormat
});

// Audit logs transport
const auditTransport = new DailyRotateFile({
  filename: path.join('logs', 'audit', 'audit-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '50m',
  maxFiles: '365d',
  format: logFormat
});

// Console transport
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
});

// Logger oluşturma
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  defaultMeta: {
    service: 'BorsaVerileri2025',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    consoleTransport,
    applicationTransport,
    errorTransport
  ],
  exitOnError: false
});

// Access logger (HTTP istekleri için)
const accessLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: {
    service: 'BorsaVerileri2025',
    type: 'http_access'
  },
  transports: [
    accessTransport
  ]
});

// Audit logger (önemli işlemler için)
const auditLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  defaultMeta: {
    service: 'BorsaVerileri2025',
    type: 'audit'
  },
  transports: [
    auditTransport
  ]
});

// Yardımcı fonksiyonlar
const createLogEntry = (level, message, options = {}) => {
  const {
    service,
    module,
    operation,
    data,
    requestId,
    userId,
    duration,
    metadata,
    error
  } = options;

  const logData = {
    message,
    service,
    module,
    operation,
    data,
    requestId,
    userId,
    duration,
    metadata
  };

  if (error) {
    logData.error = {
      message: error.message,
      stack: error.stack,
      name: error.name
    };
  }

  return logger[level](logData);
};

// StockScraper için özel log fonksiyonları
const stockScraperLogger = {
  scrapingStarted: (symbols, source, options = {}) => {
    logger.info('Stock scraping started', {
      service: 'stockScraper',
      module: 'scraper',
      operation: 'scrapeStockData',
      data: {
        symbols,
        source,
        batchSize: options.batchSize || symbols.length,
        timeout: options.timeout || 30000
      },
      requestId: options.requestId,
      userId: options.userId
    });
  },

  scrapingIndividual: (symbol, url, attempt = 1, options = {}) => {
    logger.debug('Scraping individual stock', {
      service: 'stockScraper',
      module: 'scraper',
      operation: 'scrapeIndividualStock',
      data: {
        symbol,
        url,
        attempt,
        userAgent: options.userAgent
      },
      requestId: options.requestId
    });
  },

  scrapingSuccess: (symbol, data, duration, retryCount = 0, options = {}) => {
    logger.info('Stock data scraped successfully', {
      service: 'stockScraper',
      module: 'scraper',
      operation: 'scrapeStockData',
      data: {
        symbol,
        ...data,
        retryCount
      },
      duration,
      requestId: options.requestId
    });
  },

  scrapingError: (symbol, error, retryCount = 0, options = {}) => {
    logger.error('Stock scraping failed', {
      service: 'stockScraper',
      module: 'scraper',
      operation: 'scrapeStockData',
      data: {
        symbol,
        retryCount,
        nextRetryIn: options.nextRetryIn
      },
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      requestId: options.requestId
    });
  },

  rateLimitDetected: (source, waitTime, requestCount, options = {}) => {
    logger.warn('Rate limit detected', {
      service: 'stockScraper',
      module: 'scraper',
      operation: 'rateLimitHandling',
      data: {
        source,
        rateLimitType: 'IP_BASED',
        waitTime,
        requestCount
      },
      requestId: options.requestId
    });
  },

  performanceMetrics: (metrics, options = {}) => {
    logger.info('Scraping performance metrics', {
      service: 'stockScraper',
      module: 'scraper',
      operation: 'performanceReport',
      data: metrics,
      requestId: options.requestId
    });
  }
};

// FinancialCalculator için özel log fonksiyonları
const financialCalculatorLogger = {
  calculationStarted: (calculationType, inputParameters, options = {}) => {
    logger.info('Financial calculation started', {
      service: 'financialCalculator',
      module: 'calculator',
      operation: calculationType,
      data: {
        calculationType,
        inputParameters
      },
      requestId: options.requestId,
      userId: options.userId
    });
  },

  calculationCompleted: (calculationType, result, duration, options = {}) => {
    logger.info('Financial calculation completed', {
      service: 'financialCalculator',
      module: 'calculator',
      operation: calculationType,
      data: {
        calculationType,
        result
      },
      duration,
      requestId: options.requestId
    });
  },

  portfolioCalculation: (portfolioId, totalValue, dailyChange, dailyChangePercent, duration, options = {}) => {
    logger.info('Portfolio calculation completed', {
      service: 'financialCalculator',
      module: 'portfolio',
      operation: 'calculatePortfolioValue',
      data: {
        portfolioId,
        totalValue,
        dailyChange,
        dailyChangePercent
      },
      duration,
      requestId: options.requestId,
      userId: options.userId
    });
  },

  riskAnalysis: (portfolioId, riskMetrics, options = {}) => {
    logger.info('Risk analysis completed', {
      service: 'financialCalculator',
      module: 'risk',
      operation: 'calculatePortfolioRisk',
      data: {
        portfolioId,
        ...riskMetrics
      },
      requestId: options.requestId,
      userId: options.userId
    });
  }
};

// Performance monitoring
const performanceLogger = {
  measureExecutionTime: (operation, fn, options = {}) => {
    return async (...args) => {
      const start = process.hrtime.bigint();
      
      try {
        const result = await fn(...args);
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1000000; // milisaniye
        
        logger.info('Operation completed', {
          service: options.service || 'system',
          module: options.module || 'performance',
          operation,
          duration,
          requestId: options.requestId
        });
        
        return result;
      } catch (error) {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1000000;
        
        logger.error('Operation failed', {
          service: options.service || 'system',
          module: options.module || 'performance',
          operation,
          duration,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          },
          requestId: options.requestId
        });
        
        throw error;
      }
    };
  }
};

module.exports = {
  logger,
  accessLogger,
  auditLogger,
  createLogEntry,
  stockScraperLogger,
  financialCalculatorLogger,
  performanceLogger
};