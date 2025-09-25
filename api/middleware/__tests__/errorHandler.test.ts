import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  AppError,
  asyncHandler,
  ErrorTypes,
  errorHandler,
  notFoundHandler,
  createValidationError,
  createNotFoundError,
  createAuthenticationError,
  createAuthorizationError,
  createExternalApiError
} from '../errorHandler';
import logger from '../../utils/logger';

// Mock logger
vi.mock('../../utils/logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}));

describe('AppError', () => {
  it('should create AppError with default values', () => {
    const error = new AppError('Test error');
    
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(500);
    expect(error.isOperational).toBe(true);
    expect(error.name).toBe('AppError');
  });

  it('should create AppError with custom values', () => {
    const error = new AppError('Custom error', 400, false);
    
    expect(error.message).toBe('Custom error');
    expect(error.statusCode).toBe(400);
    expect(error.isOperational).toBe(false);
  });

  it('should capture stack trace', () => {
    const error = new AppError('Test error');
    expect(error.stack).toBeDefined();
  });
});

describe('asyncHandler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: Mock;

  beforeEach(() => {
    mockReq = {};
    mockRes = {};
    mockNext = vi.fn();
  });

  it('should handle successful async function', async () => {
    const asyncFn = vi.fn().mockResolvedValue(undefined);
    const wrappedFn = asyncHandler(asyncFn);
    
    wrappedFn(mockReq as Request, mockRes as Response, mockNext);
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle async function that throws error', async () => {
    const error = new Error('Async error');
    const asyncFn = vi.fn().mockRejectedValue(error);
    const wrappedFn = asyncHandler(asyncFn);
    
    wrappedFn(mockReq as Request, mockRes as Response, mockNext);
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  it('should handle sync function that throws error', () => {
    const error = new Error('Sync error');
    const asyncFn = vi.fn().mockImplementation(() => {
      throw error;
    });
    const wrappedFn = asyncHandler(asyncFn);
    
    wrappedFn(mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockNext).toHaveBeenCalledWith(error);
  });
});

describe('errorHandler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: Mock;
  let mockJson: Mock;
  let mockStatus: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    
    mockReq = {
      originalUrl: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
      get: vi.fn().mockReturnValue('test-user-agent'),
      body: { test: 'data' }
    };
    
    mockRes = {
      status: mockStatus,
      json: mockJson
    };
    
    mockNext = vi.fn();
    
    // Mock environment
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  describe('AppError handling', () => {
    it('should handle AppError correctly', () => {
      const error = new AppError('Test error', 400);
      error.code = ErrorTypes.VALIDATION_ERROR;
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Test error',
          type: ErrorTypes.VALIDATION_ERROR,
          statusCode: 400,
          timestamp: expect.any(String),
          path: '/api/test',
          method: 'GET',
          stack: expect.any(String)
        }
      });
    });

    it('should not include stack trace in production', () => {
      process.env.NODE_ENV = 'production';
      
      const error = new AppError('Test error', 400);
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      const response = mockJson.mock.calls[0][0];
      expect(response.error.stack).toBeUndefined();
    });
  });

  describe('Generic Error conversion', () => {
    it('should convert ValidationError to AppError', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Validation failed',
            type: ErrorTypes.VALIDATION_ERROR,
            statusCode: 400
          })
        })
      );
    });

    it('should convert CastError to AppError', () => {
      const error = new Error('Cast failed');
      error.name = 'CastError';
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Invalid data format',
            type: ErrorTypes.VALIDATION_ERROR
          })
        })
      );
    });

    it('should convert ECONNREFUSED to AppError', () => {
      const error = { code: 'ECONNREFUSED', message: 'Connection refused' };
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockStatus).toHaveBeenCalledWith(503);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'External service unavailable',
            type: ErrorTypes.EXTERNAL_API_ERROR
          })
        })
      );
    });

    it('should convert ETIMEDOUT to AppError', () => {
      const error = { code: 'ETIMEDOUT', message: 'Timeout' };
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockStatus).toHaveBeenCalledWith(408);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Request timeout',
            type: ErrorTypes.EXTERNAL_API_ERROR
          })
        })
      );
    });

    it('should convert rate limit error to AppError', () => {
      const error = { status: 429, message: 'Too many requests' };
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockStatus).toHaveBeenCalledWith(429);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Too many requests',
            type: ErrorTypes.RATE_LIMIT_ERROR
          })
        })
      );
    });

    it('should convert generic Error to AppError', () => {
      const error = new Error('Generic error');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Generic error',
            type: ErrorTypes.INTERNAL_SERVER_ERROR
          })
        })
      );
    });

    it('should handle non-Error objects', () => {
      const error = 'String error';
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Internal server error',
            type: ErrorTypes.INTERNAL_SERVER_ERROR
          })
        })
      );
    });
  });

  describe('Logging', () => {
    it('should log server errors (5xx)', () => {
      const error = new AppError('Server error', 500);
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(logger.error).toHaveBeenCalledWith(
        'Server error occurred',
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Server error',
            statusCode: 500
          }),
          request: expect.objectContaining({
            method: 'GET',
            url: '/api/test',
            ip: '127.0.0.1'
          })
        })
      );
    });

    it('should log client errors (4xx) as warnings', () => {
      const error = new AppError('Client error', 400);
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(logger.warn).toHaveBeenCalledWith(
        'Client error occurred',
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Client error',
            statusCode: 400
          })
        })
      );
    });

    it('should include request body for non-GET requests', () => {
      mockReq.method = 'POST';
      const error = new AppError('Test error', 400);
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(logger.warn).toHaveBeenCalledWith(
        'Client error occurred',
        expect.objectContaining({
          request: expect.objectContaining({
            body: { test: 'data' }
          })
        })
      );
    });

    it('should not include request body for GET requests', () => {
      const error = new AppError('Test error', 400);
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(logger.warn).toHaveBeenCalledWith(
        'Client error occurred',
        expect.objectContaining({
          request: expect.objectContaining({
            body: undefined
          })
        })
      );
    });
  });
});

describe('notFoundHandler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: Mock;

  beforeEach(() => {
    mockReq = {
      originalUrl: '/api/nonexistent'
    };
    mockRes = {};
    mockNext = vi.fn();
  });

  it('should create 404 error and call next', () => {
    notFoundHandler(mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Route /api/nonexistent not found',
        statusCode: 404,
        code: ErrorTypes.NOT_FOUND_ERROR
      })
    );
  });
});

describe('Error Helper Functions', () => {
  describe('createValidationError', () => {
    it('should create validation error', () => {
      const error = createValidationError('Invalid input');
      
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ErrorTypes.VALIDATION_ERROR);
    });
  });

  describe('createNotFoundError', () => {
    it('should create not found error', () => {
      const error = createNotFoundError('User');
      
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(ErrorTypes.NOT_FOUND_ERROR);
    });
  });

  describe('createAuthenticationError', () => {
    it('should create authentication error with default message', () => {
      const error = createAuthenticationError();
      
      expect(error.message).toBe('Authentication required');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe(ErrorTypes.AUTHENTICATION_ERROR);
    });

    it('should create authentication error with custom message', () => {
      const error = createAuthenticationError('Invalid token');
      
      expect(error.message).toBe('Invalid token');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe(ErrorTypes.AUTHENTICATION_ERROR);
    });
  });

  describe('createAuthorizationError', () => {
    it('should create authorization error with default message', () => {
      const error = createAuthorizationError();
      
      expect(error.message).toBe('Insufficient permissions');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe(ErrorTypes.AUTHORIZATION_ERROR);
    });

    it('should create authorization error with custom message', () => {
      const error = createAuthorizationError('Access denied');
      
      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe(ErrorTypes.AUTHORIZATION_ERROR);
    });
  });

  describe('createExternalApiError', () => {
    it('should create external API error with default status code', () => {
      const error = createExternalApiError('API unavailable');
      
      expect(error.message).toBe('API unavailable');
      expect(error.statusCode).toBe(503);
      expect(error.code).toBe(ErrorTypes.EXTERNAL_API_ERROR);
    });

    it('should create external API error with custom status code', () => {
      const error = createExternalApiError('API error', 502);
      
      expect(error.message).toBe('API error');
      expect(error.statusCode).toBe(502);
      expect(error.code).toBe(ErrorTypes.EXTERNAL_API_ERROR);
    });
  });
});

describe('Environment-specific behavior', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: Mock;
  let mockJson: Mock;
  let mockStatus: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    
    mockReq = {
      originalUrl: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
      get: vi.fn(),
      body: {}
    };
    
    mockRes = {
      status: mockStatus,
      json: mockJson
    };
    
    mockNext = vi.fn();
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  it('should show detailed error message in development', () => {
    process.env.NODE_ENV = 'development';
    const error = new Error('Detailed error message');
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
    
    const response = mockJson.mock.calls[0][0];
    expect(response.error.message).toBe('Detailed error message');
  });

  it('should show generic error message in production', () => {
    process.env.NODE_ENV = 'production';
    const error = new Error('Detailed error message');
    
    errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
    
    const response = mockJson.mock.calls[0][0];
    expect(response.error.message).toBe('Internal server error');
  });
});