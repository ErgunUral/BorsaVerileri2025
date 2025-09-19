import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';

// Validation error handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
    return;
  }
  next();
};

// Stock code validation
export const validateStockCode = [
  param('stockCode')
    .isLength({ min: 3, max: 6 })
    .withMessage('Stock code must be between 3-6 characters')
    .matches(/^[A-Z]+$/)
    .withMessage('Stock code must contain only uppercase letters')
    .trim(),
  handleValidationErrors
];

// Query parameters validation
export const validateStockQuery = [
  query('stockCode')
    .optional()
    .isLength({ min: 3, max: 6 })
    .withMessage('Stock code must be between 3-6 characters')
    .matches(/^[A-Z]+$/)
    .withMessage('Stock code must contain only uppercase letters')
    .trim(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1-100')
    .toInt(),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be non-negative')
    .toInt(),
  handleValidationErrors
];

// Log query validation
export const validateLogQuery = [
  query('type')
    .optional()
    .isIn(['application', 'error', 'api', 'combined'])
    .withMessage('Invalid log type'),
  query('lines')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Lines must be between 1-1000')
    .toInt(),
  handleValidationErrors
];

// Test log validation
export const validateTestLog = [
  body('level')
    .optional()
    .isIn(['error', 'warn', 'info', 'debug'])
    .withMessage('Invalid log level'),
  body('message')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('Message must be between 1-500 characters')
    .trim()
    .escape(),
  handleValidationErrors
];

// Sanitize input
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  // Remove potentially dangerous characters
  const sanitize = (obj: unknown): unknown => {
    if (typeof obj === 'string') {
      return obj.replace(/[<>"'&]/g, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      const sanitized: Record<string, unknown> = {};
      for (const key in obj as Record<string, unknown>) {
        sanitized[key] = sanitize((obj as Record<string, unknown>)[key]);
      }
      return sanitized;
    }
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query) as any;
  req.params = sanitize(req.params) as any;
  
  next();
};

// Rate limiting per endpoint
export const createEndpointLimiter = (windowMs: number, max: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.ip || 'unknown'}-${req.path}`;
    const now = Date.now();
    
    const record = requests.get(key);
    
    if (!record || now > record.resetTime) {
      requests.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (record.count >= max) {
      res.status(429).json({
        success: false,
        error: 'Too many requests for this endpoint',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
      return;
    }
    
    record.count++;
    next();
  };
};

// Security headers
export const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  if (process.env['NODE_ENV'] === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
};