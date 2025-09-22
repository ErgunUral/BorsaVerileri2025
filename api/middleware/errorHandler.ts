import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

// Custom error class
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Async error wrapper
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error types
export const ErrorTypes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
};

// Error response formatter
function formatErrorResponse(error: AppError, req: Request): Record<string, unknown> {
  const isDevelopment = process.env['NODE_ENV'] === 'development';
  
  const baseResponse = {
    success: false,
    error: {
      message: error.message,
      type: error.code || ErrorTypes.INTERNAL_SERVER_ERROR,
      statusCode: error.statusCode,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method
    }
  };

  // Add stack trace in development
  if (isDevelopment && error.stack) {
    (baseResponse.error as Record<string, unknown>)['stack'] = error.stack;
  }

  return baseResponse;
}

// Main error handling middleware
export const errorHandler = (error: unknown, req: Request, res: Response, _next: NextFunction): void => {
  let appError = error;

  // Convert non-AppError instances to AppError
  if (!(error instanceof AppError)) {
    // Handle specific error types
    if (error instanceof Error && error.name === 'ValidationError') {
      appError = new AppError('Validation failed', 400);
      (appError as AppError).code = ErrorTypes.VALIDATION_ERROR;
    } else if (error instanceof Error && error.name === 'CastError') {
      appError = new AppError('Invalid data format', 400);
      (appError as AppError).code = ErrorTypes.VALIDATION_ERROR;
    } else if (error && typeof error === 'object' && 'code' in error && error.code === 'ECONNREFUSED') {
      appError = new AppError('External service unavailable', 503);
      (appError as AppError).code = ErrorTypes.EXTERNAL_API_ERROR;
    } else if (error && typeof error === 'object' && 'code' in error && error.code === 'ETIMEDOUT') {
      appError = new AppError('Request timeout', 408);
      (appError as AppError).code = ErrorTypes.EXTERNAL_API_ERROR;
    } else if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
      appError = new AppError('Too many requests', 429);
      (appError as AppError).code = ErrorTypes.RATE_LIMIT_ERROR;
    } else {
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      appError = new AppError(
        process.env['NODE_ENV'] === 'development' ? errorMessage : 'Internal server error',
        500
      );
      (appError as AppError).code = ErrorTypes.INTERNAL_SERVER_ERROR;
    }
  }

  // Log error
  const logData = {
    error: {
      message: (appError as AppError).message,
      stack: (appError as AppError).stack,
      statusCode: (appError as AppError).statusCode,
      code: (appError as AppError).code
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: req.method !== 'GET' ? req.body : undefined
    },
    timestamp: new Date().toISOString()
  };

  if ((appError as AppError).statusCode >= 500) {
    logger.error('Server error occurred', logData);
  } else {
    logger.warn('Client error occurred', logData);
  }

  // Send error response
  const errorResponse = formatErrorResponse(appError as AppError, req);
  res.status((appError as AppError).statusCode).json(errorResponse);
};

// 404 handler
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  error.code = ErrorTypes.NOT_FOUND_ERROR;
  next(error);
};

// Unhandled promise rejection handler
export const handleUnhandledRejection = (): void => {
  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    logger.error('Unhandled Promise Rejection', {
      reason: (reason as Error)?.message || String(reason),
      stack: (reason as Error)?.stack,
      promise: promise.toString()
    });
    
    // Graceful shutdown
    process.exit(1);
  });
};

// Uncaught exception handler
export const handleUncaughtException = (): void => {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', {
      message: error.message,
      stack: error.stack
    });
    
    // Graceful shutdown
    process.exit(1);
  });
};

// Helper functions for common errors
export const createValidationError = (message: string) => {
  const error = new AppError(message, 400);
  error.code = ErrorTypes.VALIDATION_ERROR;
  return error;
};

export const createNotFoundError = (resource: string) => {
  const error = new AppError(`${resource} not found`, 404);
  error.code = ErrorTypes.NOT_FOUND_ERROR;
  return error;
};

export const createAuthenticationError = (message: string = 'Authentication required') => {
  const error = new AppError(message, 401);
  error.code = ErrorTypes.AUTHENTICATION_ERROR;
  return error;
};

export const createAuthorizationError = (message: string = 'Insufficient permissions') => {
  const error = new AppError(message, 403);
  error.code = ErrorTypes.AUTHORIZATION_ERROR;
  return error;
};

export const createExternalApiError = (message: string, statusCode: number = 503) => {
  const error = new AppError(message, statusCode);
  error.code = ErrorTypes.EXTERNAL_API_ERROR;
  return error;
};