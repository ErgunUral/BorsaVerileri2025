import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { PortMonitorService } from '../services/portMonitor.js';
import { PortSchedulerService } from '../services/portScheduler.js';
import { AlertService } from '../services/alertService.js';
import { reportingService, LogLevel, LogCategory } from '../services/reportingService.js';
import {
  PortConfig,
  PortCheckResult,
  PortStatus,
  AlertType
} from '../types/portMonitor.js';

const router = Router();
const portMonitor = new PortMonitorService();
const scheduler = new PortSchedulerService(portMonitor);
const alertService = new AlertService();

// Validation middleware
const handleValidationErrors = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  next();
};

// Port konfigürasyonu validasyonu
const portConfigValidation = [
  body('name').notEmpty().withMessage('Port name is required'),
  body('host').notEmpty().withMessage('Host is required'),
  body('port').isInt({ min: 1, max: 65535 }).withMessage('Port must be between 1-65535'),
  body('timeout').optional().isInt({ min: 1000 }).withMessage('Timeout must be at least 1000ms'),
  body('retryCount').optional().isInt({ min: 0, max: 10 }).withMessage('Retry count must be between 0-10'),
  body('retryDelay').optional().isInt({ min: 100 }).withMessage('Retry delay must be at least 100ms')
];

// Schedule validasyonu
const scheduleValidation = [
  body('type').isIn(['interval', 'cron']).withMessage('Invalid schedule type'),
  body('interval').optional().isInt({ min: 1000 }).withMessage('Interval must be at least 1000ms'),
  body('cron').optional().isString().withMessage('Cron must be a string')
];

/**
 * @route POST /api/port-monitor/configs
 * @desc Port konfigürasyonu oluştur
 */
router.post('/configs', portConfigValidation, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const portConfig: PortConfig = {
      id: uuidv4(),
      name: req.body.name,
      host: req.body.host,
      port: req.body.port,
      timeout: req.body.timeout || 5000,
      retryCount: req.body.retryCount || 3,
      retryDelay: req.body.retryDelay || 1000,
      enabled: req.body.enabled !== false,
      tags: req.body.tags || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Schedule varsa ekle
    if (req.body.schedule) {
      await scheduler.addJob(portConfig, req.body.schedule);
    }

    reportingService.log(
      LogLevel.INFO,
      LogCategory.API,
      `Port config created: ${portConfig.name}`,
      { portConfig },
      portConfig.id
    );

    res.status(201).json({
      success: true,
      message: 'Port configuration created successfully',
      data: portConfig
    });
  } catch (error) {
    reportingService.log(
      LogLevel.ERROR,
      LogCategory.API,
      'Failed to create port config',
      { error: error instanceof Error ? error.message : error }
    );

    res.status(500).json({
      success: false,
      message: 'Failed to create port configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/port-monitor/configs
 * @desc Tüm port konfigürasyonlarını listele
 */
router.get('/configs', async (req: Request, res: Response) => {
  try {
    const configs = scheduler.getJobs();
    
    res.json({
      success: true,
      message: 'Port configurations retrieved successfully',
      data: configs,
      count: configs.length
    });
  } catch (error) {
    reportingService.log(
      LogLevel.ERROR,
      LogCategory.API,
      'Failed to get port configs',
      { error: error instanceof Error ? error.message : error }
    );

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve port configurations',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/port-monitor/configs/:id
 * @desc Belirli port konfigürasyonunu getir
 */
router.get('/configs/:id', 
  param('id').isUUID().withMessage('Invalid port config ID'),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const config = scheduler.getJob(req.params.id);
      
      if (!config) {
        return res.status(404).json({
          success: false,
          message: 'Port configuration not found'
        });
      }

      res.json({
        success: true,
        message: 'Port configuration retrieved successfully',
        data: config
      });
    } catch (error) {
      reportingService.log(
        LogLevel.ERROR,
        LogCategory.API,
        'Failed to get port config',
        { error: error instanceof Error ? error.message : error, configId: req.params.id }
      );

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve port configuration',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route PUT /api/port-monitor/configs/:id
 * @desc Port konfigürasyonunu güncelle
 */
router.put('/configs/:id',
  param('id').isUUID().withMessage('Invalid port config ID'),
  portConfigValidation,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const existingConfig = scheduler.getJob(req.params.id);
      
      if (!existingConfig) {
        return res.status(404).json({
          success: false,
          message: 'Port configuration not found'
        });
      }

      const updatedConfig: PortConfig = {
        ...existingConfig.portConfig,
        name: req.body.name,
        host: req.body.host,
        port: req.body.port,
        timeout: req.body.timeout || 5000,
        retryCount: req.body.retryCount || 3,
        retryDelay: req.body.retryDelay || 1000,
        enabled: req.body.enabled !== false,
        tags: req.body.tags || [],
        updatedAt: new Date()
      };

      // Job'ı güncelle
      await scheduler.removeJob(req.params.id);
      if (req.body.schedule) {
        await scheduler.addJob(updatedConfig, req.body.schedule);
      }

      reportingService.log(
        LogLevel.INFO,
        LogCategory.API,
        `Port config updated: ${updatedConfig.name}`,
        { updatedConfig },
        updatedConfig.id
      );

      res.json({
        success: true,
        message: 'Port configuration updated successfully',
        data: updatedConfig
      });
    } catch (error) {
      reportingService.log(
        LogLevel.ERROR,
        LogCategory.API,
        'Failed to update port config',
        { error: error instanceof Error ? error.message : error, configId: req.params.id }
      );

      res.status(500).json({
        success: false,
        message: 'Failed to update port configuration',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route DELETE /api/port-monitor/configs/:id
 * @desc Port konfigürasyonunu sil
 */
router.delete('/configs/:id',
  param('id').isUUID().withMessage('Invalid port config ID'),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const config = scheduler.getJob(req.params.id);
      
      if (!config) {
        return res.status(404).json({
          success: false,
          message: 'Port configuration not found'
        });
      }

      await scheduler.removeJob(req.params.id);

      reportingService.log(
        LogLevel.INFO,
        LogCategory.API,
        `Port config deleted: ${config.portConfig.name}`,
        { configId: req.params.id },
        req.params.id
      );

      res.json({
        success: true,
        message: 'Port configuration deleted successfully'
      });
    } catch (error) {
      reportingService.log(
        LogLevel.ERROR,
        LogCategory.API,
        'Failed to delete port config',
        { error: error instanceof Error ? error.message : error, configId: req.params.id }
      );

      res.status(500).json({
        success: false,
        message: 'Failed to delete port configuration',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route POST /api/port-monitor/check/:id
 * @desc Manuel port kontrolü yap
 */
router.post('/check/:id',
  param('id').isUUID().withMessage('Invalid port config ID'),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const config = scheduler.getJob(req.params.id);
      
      if (!config) {
        return res.status(404).json({
          success: false,
          message: 'Port configuration not found'
        });
      }

      const result = await portMonitor.checkPortConfig(config.portConfig);
      reportingService.recordPortCheck(result);

      res.json({
        success: true,
        message: 'Port check completed',
        data: result
      });
    } catch (error) {
      reportingService.log(
        LogLevel.ERROR,
        LogCategory.API,
        'Failed to check port',
        { error: error instanceof Error ? error.message : error, configId: req.params.id }
      );

      res.status(500).json({
        success: false,
        message: 'Failed to check port',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route POST /api/port-monitor/check-multiple
 * @desc Çoklu port kontrolü yap
 */
router.post('/check-multiple',
  body('configIds').isArray().withMessage('Config IDs must be an array'),
  body('configIds.*').isUUID().withMessage('Each config ID must be a valid UUID'),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { configIds } = req.body;
      const configs: PortConfig[] = [];

      // Konfigürasyonları topla
      for (const configId of configIds) {
        const config = scheduler.getJob(configId);
        if (config) {
          configs.push(config.portConfig);
        }
      }

      if (configs.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No valid port configurations found'
        });
      }

      const results = await portMonitor.checkMultiplePorts(configs);
      
      // Sonuçları kaydet
      results.forEach(result => {
        reportingService.recordPortCheck(result);
      });

      res.json({
        success: true,
        message: 'Multiple port check completed',
        data: results,
        count: results.length
      });
    } catch (error) {
      reportingService.log(
        LogLevel.ERROR,
        LogCategory.API,
        'Failed to check multiple ports',
        { error: error instanceof Error ? error.message : error }
      );

      res.status(500).json({
        success: false,
        message: 'Failed to check multiple ports',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route GET /api/port-monitor/status/:id
 * @desc Port durumunu getir
 */
router.get('/status/:id',
  param('id').isUUID().withMessage('Invalid port config ID'),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const config = scheduler.getJob(req.params.id);
      
      if (!config) {
        return res.status(404).json({
          success: false,
          message: 'Port configuration not found'
        });
      }

      // Son kontrol sonuçlarını al
      const recentResults = reportingService.getPortCheckResults(req.params.id, {
        limit: 10
      });

      const lastResult = recentResults.length > 0 ? recentResults[recentResults.length - 1] : null;
      const report = reportingService.generatePortReport(config.portConfig);

      res.json({
        success: true,
        message: 'Port status retrieved successfully',
        data: {
          config: config.portConfig,
          lastResult,
          recentResults,
          report
        }
      });
    } catch (error) {
      reportingService.log(
        LogLevel.ERROR,
        LogCategory.API,
        'Failed to get port status',
        { error: error instanceof Error ? error.message : error, configId: req.params.id }
      );

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve port status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route GET /api/port-monitor/status
 * @desc Tüm portların durumunu getir
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const configs = scheduler.getJobs();
    const statusList = [];

    for (const config of configs) {
      const recentResults = reportingService.getPortCheckResults(config.portConfig.id, {
        limit: 1
      });
      const lastResult = recentResults.length > 0 ? recentResults[0] : null;
      
      statusList.push({
        config: config.portConfig,
        lastResult,
        isScheduled: config.isScheduled
      });
    }

    const systemStats = reportingService.getSystemStats();

    res.json({
      success: true,
      message: 'All port statuses retrieved successfully',
      data: {
        ports: statusList,
        systemStats
      },
      count: statusList.length
    });
  } catch (error) {
    reportingService.log(
      LogLevel.ERROR,
      LogCategory.API,
      'Failed to get all port statuses',
      { error: error instanceof Error ? error.message : error }
    );

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve port statuses',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/port-monitor/reports/:id
 * @desc Port raporu getir
 */
router.get('/reports/:id',
  param('id').isUUID().withMessage('Invalid port config ID'),
  query('startDate').optional().isISO8601().withMessage('Start date must be ISO8601 format'),
  query('endDate').optional().isISO8601().withMessage('End date must be ISO8601 format'),
  query('includeAlerts').optional().isBoolean().withMessage('Include alerts must be boolean'),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const config = scheduler.getJob(req.params.id);
      
      if (!config) {
        return res.status(404).json({
          success: false,
          message: 'Port configuration not found'
        });
      }

      const filter = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        includeAlerts: req.query.includeAlerts === 'true'
      };

      const report = reportingService.generatePortReport(config.portConfig, filter);

      res.json({
        success: true,
        message: 'Port report generated successfully',
        data: report
      });
    } catch (error) {
      reportingService.log(
        LogLevel.ERROR,
        LogCategory.API,
        'Failed to generate port report',
        { error: error instanceof Error ? error.message : error, configId: req.params.id }
      );

      res.status(500).json({
        success: false,
        message: 'Failed to generate port report',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route GET /api/port-monitor/logs
 * @desc Sistem loglarını getir
 */
router.get('/logs',
  query('level').optional().isIn(Object.values(LogLevel)).withMessage('Invalid log level'),
  query('category').optional().isIn(Object.values(LogCategory)).withMessage('Invalid log category'),
  query('portConfigId').optional().isUUID().withMessage('Invalid port config ID'),
  query('startDate').optional().isISO8601().withMessage('Start date must be ISO8601 format'),
  query('endDate').optional().isISO8601().withMessage('End date must be ISO8601 format'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1-1000'),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const filter = {
        level: req.query.level ? [req.query.level as LogLevel] : undefined,
        category: req.query.category ? [req.query.category as LogCategory] : undefined,
        portConfigId: req.query.portConfigId as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100
      };

      const logs = reportingService.getLogs(filter);

      res.json({
        success: true,
        message: 'Logs retrieved successfully',
        data: logs,
        count: logs.length
      });
    } catch (error) {
      reportingService.log(
        LogLevel.ERROR,
        LogCategory.API,
        'Failed to get logs',
        { error: error instanceof Error ? error.message : error }
      );

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve logs',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route POST /api/port-monitor/scheduler/start
 * @desc Scheduler'ı başlat
 */
router.post('/scheduler/start', async (req: Request, res: Response) => {
  try {
    await scheduler.start();
    
    reportingService.log(
      LogLevel.INFO,
      LogCategory.SCHEDULER,
      'Scheduler started via API'
    );

    res.json({
      success: true,
      message: 'Scheduler started successfully'
    });
  } catch (error) {
    reportingService.log(
      LogLevel.ERROR,
      LogCategory.API,
      'Failed to start scheduler',
      { error: error instanceof Error ? error.message : error }
    );

    res.status(500).json({
      success: false,
      message: 'Failed to start scheduler',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/port-monitor/scheduler/stop
 * @desc Scheduler'ı durdur
 */
router.post('/scheduler/stop', async (req: Request, res: Response) => {
  try {
    await scheduler.stop();
    
    reportingService.log(
      LogLevel.INFO,
      LogCategory.SCHEDULER,
      'Scheduler stopped via API'
    );

    res.json({
      success: true,
      message: 'Scheduler stopped successfully'
    });
  } catch (error) {
    reportingService.log(
      LogLevel.ERROR,
      LogCategory.API,
      'Failed to stop scheduler',
      { error: error instanceof Error ? error.message : error }
    );

    res.status(500).json({
      success: false,
      message: 'Failed to stop scheduler',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/port-monitor/scheduler/status
 * @desc Scheduler durumunu getir
 */
router.get('/scheduler/status', async (req: Request, res: Response) => {
  try {
    const isRunning = scheduler.isRunning();
    const jobs = scheduler.getJobs();
    const serviceStats = reportingService.getServiceStats();

    res.json({
      success: true,
      message: 'Scheduler status retrieved successfully',
      data: {
        isRunning,
        totalJobs: jobs.length,
        activeJobs: jobs.filter(job => job.isScheduled).length,
        serviceStats
      }
    });
  } catch (error) {
    reportingService.log(
      LogLevel.ERROR,
      LogCategory.API,
      'Failed to get scheduler status',
      { error: error instanceof Error ? error.message : error }
    );

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve scheduler status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/port-monitor/export
 * @desc Rapor export et
 */
router.post('/export',
  body('configIds').optional().isArray().withMessage('Config IDs must be an array'),
  body('configIds.*').optional().isUUID().withMessage('Each config ID must be a valid UUID'),
  body('startDate').optional().isISO8601().withMessage('Start date must be ISO8601 format'),
  body('endDate').optional().isISO8601().withMessage('End date must be ISO8601 format'),
  body('includeAlerts').optional().isBoolean().withMessage('Include alerts must be boolean'),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { configIds, startDate, endDate, includeAlerts } = req.body;
      
      let configs: PortConfig[];
      if (configIds && configIds.length > 0) {
        configs = [];
        for (const configId of configIds) {
          const config = scheduler.getJob(configId);
          if (config) {
            configs.push(config.portConfig);
          }
        }
      } else {
        configs = scheduler.getJobs().map(job => job.portConfig);
      }

      const filter = {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        includeAlerts: includeAlerts || false
      };

      const exportData = reportingService.exportReport(configs, filter);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="port-monitor-report-${new Date().toISOString().split('T')[0]}.json"`);
      
      res.send(exportData);
    } catch (error) {
      reportingService.log(
        LogLevel.ERROR,
        LogCategory.API,
        'Failed to export report',
        { error: error instanceof Error ? error.message : error }
      );

      res.status(500).json({
        success: false,
        message: 'Failed to export report',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Event listeners
portMonitor.on('portCheck', (result: PortCheckResult) => {
  reportingService.recordPortCheck(result);
});

scheduler.on('jobCompleted', (result: PortCheckResult) => {
  // Alert kontrolü yap
  if (result.status !== PortStatus.ONLINE) {
    alertService.processPortCheckResult(result);
  }
});

alertService.on('alertSent', (alert) => {
  reportingService.recordAlert(alert);
});

export default router;