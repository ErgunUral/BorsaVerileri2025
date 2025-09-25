import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import {
  handleValidationErrors,
  validateStockSymbol,
  validateQueryParams,
  validateLogQuery,
  sanitizeInput,
  createEndpointLimiter,
  validateFigmaConnection,
  validateTokenSync,
  validateComponentMapping
} from '../validation';
import rateLimit from 'express-rate-limit';

// Mock express-validator
vi.mock('express-validator', () => ({
  validationResult: vi.fn(),
  body: vi.fn(() => ({
    notEmpty: vi.fn().mockReturnThis(),
    isLength: vi.fn().mockReturnThis(),
    matches: vi.fn().mockReturnThis(),
    isString: vi.fn().mockReturnThis(),
    isInt: vi.fn().mockReturnThis(),
    isIn: vi.fn().mockReturnThis(),
    optional: vi.fn().mockReturnThis(),
    isISO8601: vi.fn().mockReturnThis(),
    toDate: vi.fn().mockReturnThis(),
    withMessage: vi.fn().mockReturnThis()
  })),
  query: vi.fn(() => ({
    optional: vi.fn().mockReturnThis(),
    isInt: vi.fn().mockReturnThis(),
    isIn: vi.fn().mockReturnThis(),
    isString: vi.fn().mockReturnThis(),
    isLength: vi.fn().mockReturnThis(),
    matches: vi.fn().mockReturnThis(),
    isISO8601: vi.fn().mockReturnThis(),
    toDate: vi.fn().mockReturnThis(),
    withMessage: vi.fn().mockReturnThis()
  })),
  param: vi.fn(() => ({
    notEmpty: vi.fn().mockReturnThis(),
    isLength: vi.fn().mockReturnThis(),
    matches: vi.fn().mockReturnThis(),
    withMessage: vi.fn().mockReturnThis()
  }))
}));

// Mock express-rate-limit
vi.mock('express-rate-limit', () => ({
  default: vi.fn(() => vi.fn())
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('handleValidationErrors', () => {
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
      body: {},
      query: {},
      params: {}
    };
    
    mockRes = {
      status: mockStatus,
      json: mockJson
    };
    
    mockNext = vi.fn();
  });

  it('should call next when no validation errors', () => {
    (validationResult as Mock).mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });
    
    handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
    expect(mockStatus).not.toHaveBeenCalled();
  });

  it('should return 400 with validation errors', () => {
    const errors = [
      {
        type: 'field',
        msg: 'Invalid stock symbol',
        path: 'symbol',
        location: 'body',
        value: 'invalid'
      },
      {
        type: 'field',
        msg: 'Required field missing',
        path: 'required',
        location: 'body',
        value: undefined
      }
    ];
    
    (validationResult as Mock).mockReturnValue({
      isEmpty: () => false,
      array: () => errors
    });
    
    handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: {
        message: 'Validation failed',
        type: 'VALIDATION_ERROR',
        details: errors.map(err => ({
          field: err.path,
          message: err.msg,
          value: err.value,
          location: err.location
        }))
      }
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle errors without path property', () => {
    const errors = [
      {
        type: 'alternative',
        msg: 'Invalid format',
        location: 'body',
        value: 'invalid'
      }
    ];
    
    (validationResult as Mock).mockReturnValue({
      isEmpty: () => false,
      array: () => errors
    });
    
    handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: {
        message: 'Validation failed',
        type: 'VALIDATION_ERROR',
        details: [{
          field: 'unknown',
          message: 'Invalid format',
          value: 'invalid',
          location: 'body'
        }]
      }
    });
  });

  it('should handle empty errors array', () => {
    (validationResult as Mock).mockReturnValue({
      isEmpty: () => false,
      array: () => []
    });
    
    handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: {
        message: 'Validation failed',
        type: 'VALIDATION_ERROR',
        details: []
      }
    });
  });
});

describe('validateStockSymbol', () => {
  it('should return validation chain for stock symbol', () => {
    const validationChain = validateStockSymbol();
    expect(Array.isArray(validationChain)).toBe(true);
    expect(validationChain.length).toBeGreaterThan(0);
  });

  it('should include handleValidationErrors in chain', () => {
    const validationChain = validateStockSymbol();
    expect(validationChain).toContain(handleValidationErrors);
  });
});

describe('validateQueryParams', () => {
  it('should return validation chain for query parameters', () => {
    const validationChain = validateQueryParams();
    expect(Array.isArray(validationChain)).toBe(true);
    expect(validationChain.length).toBeGreaterThan(0);
  });

  it('should include handleValidationErrors in chain', () => {
    const validationChain = validateQueryParams();
    expect(validationChain).toContain(handleValidationErrors);
  });
});

describe('validateLogQuery', () => {
  it('should return validation chain for log query', () => {
    const validationChain = validateLogQuery();
    expect(Array.isArray(validationChain)).toBe(true);
    expect(validationChain.length).toBeGreaterThan(0);
  });

  it('should include handleValidationErrors in chain', () => {
    const validationChain = validateLogQuery();
    expect(validationChain).toContain(handleValidationErrors);
  });
});

describe('sanitizeInput', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: Mock;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {}
    };
    
    mockRes = {};
    mockNext = vi.fn();
  });

  it('should sanitize string inputs in body', () => {
    mockReq.body = {
      symbol: '  AAPL  ',
      name: '  Apple Inc.  ',
      description: 'Test<script>alert("xss")</script>'
    };
    
    sanitizeInput(mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockReq.body.symbol).toBe('AAPL');
    expect(mockReq.body.name).toBe('Apple Inc.');
    expect(mockReq.body.description).toBe('Test');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should sanitize string inputs in query', () => {
    mockReq.query = {
      search: '  test query  ',
      filter: '<script>malicious</script>',
      page: '1'
    };
    
    sanitizeInput(mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockReq.query.search).toBe('test query');
    expect(mockReq.query.filter).toBe('');
    expect(mockReq.query.page).toBe('1'); // Numbers should remain unchanged
    expect(mockNext).toHaveBeenCalled();
  });

  it('should sanitize string inputs in params', () => {
    mockReq.params = {
      id: '  123  ',
      symbol: '  MSFT  ',
      malicious: '<img src=x onerror=alert(1)>'
    };
    
    sanitizeInput(mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockReq.params.id).toBe('123');
    expect(mockReq.params.symbol).toBe('MSFT');
    expect(mockReq.params.malicious).toBe('');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle non-string values', () => {
    mockReq.body = {
      number: 123,
      boolean: true,
      object: { nested: 'value' },
      array: ['item1', 'item2'],
      null: null,
      undefined: undefined
    };
    
    sanitizeInput(mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockReq.body.number).toBe(123);
    expect(mockReq.body.boolean).toBe(true);
    expect(mockReq.body.object).toEqual({ nested: 'value' });
    expect(mockReq.body.array).toEqual(['item1', 'item2']);
    expect(mockReq.body.null).toBe(null);
    expect(mockReq.body.undefined).toBe(undefined);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle empty objects', () => {
    mockReq.body = {};
    mockReq.query = {};
    mockReq.params = {};
    
    sanitizeInput(mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle nested objects', () => {
    mockReq.body = {
      user: {
        name: '  John Doe  ',
        email: '  john@example.com  ',
        profile: {
          bio: '  Software developer  '
        }
      }
    };
    
    sanitizeInput(mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockReq.body.user.name).toBe('John Doe');
    expect(mockReq.body.user.email).toBe('john@example.com');
    expect(mockReq.body.user.profile.bio).toBe('Software developer');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle arrays with string elements', () => {
    mockReq.body = {
      tags: ['  tag1  ', '  tag2  ', '<script>alert(1)</script>'],
      numbers: [1, 2, 3]
    };
    
    sanitizeInput(mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockReq.body.tags).toEqual(['tag1', 'tag2', '']);
    expect(mockReq.body.numbers).toEqual([1, 2, 3]);
    expect(mockNext).toHaveBeenCalled();
  });
});

describe('createEndpointLimiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create rate limiter with default options', () => {
    const limiter = createEndpointLimiter();
    
    expect(rateLimit).toHaveBeenCalledWith({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
      message: {
        success: false,
        error: {
          message: 'Too many requests, please try again later',
          type: 'RATE_LIMIT_ERROR',
          retryAfter: expect.any(Number)
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: expect.any(Function)
    });
    
    expect(typeof limiter).toBe('function');
  });

  it('should create rate limiter with custom options', () => {
    const customOptions = {
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 50,
      message: 'Custom rate limit message'
    };
    
    createEndpointLimiter(customOptions);
    
    expect(rateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        windowMs: 5 * 60 * 1000,
        max: 50,
        message: 'Custom rate limit message'
      })
    );
  });

  it('should create rate limiter with custom handler', () => {
    const customHandler = vi.fn();
    const customOptions = {
      handler: customHandler
    };
    
    createEndpointLimiter(customOptions);
    
    expect(rateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        handler: customHandler
      })
    );
  });

  describe('Default rate limit handler', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: Mock;
    let mockJson: Mock;
    let mockStatus: Mock;
    let defaultHandler: Function;

    beforeEach(() => {
      vi.clearAllMocks();
      
      mockJson = vi.fn();
      mockStatus = vi.fn().mockReturnValue({ json: mockJson });
      
      mockReq = {
        ip: '127.0.0.1',
        originalUrl: '/api/test'
      };
      
      mockRes = {
        status: mockStatus,
        json: mockJson,
        get: vi.fn().mockReturnValue('900') // Mock retry-after header
      };
      
      mockNext = vi.fn();
      
      // Get the default handler from the rate limiter call
      createEndpointLimiter();
      const rateLimitCall = (rateLimit as Mock).mock.calls[0][0];
      defaultHandler = rateLimitCall.handler;
    });

    it('should handle rate limit exceeded', () => {
      defaultHandler(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockStatus).toHaveBeenCalledWith(429);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Too many requests, please try again later',
          type: 'RATE_LIMIT_ERROR',
          retryAfter: 900
        }
      });
    });

    it('should handle missing retry-after header', () => {
      (mockRes.get as Mock).mockReturnValue(undefined);
      
      defaultHandler(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            retryAfter: 900 // Default value
          })
        })
      );
    });
  });
});

describe('Figma validation functions', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: Mock;

  beforeEach(() => {
    mockReq = {
      body: {}
    };
    
    mockRes = {};
    mockNext = vi.fn();
  });

  describe('validateFigmaConnection', () => {
    it('should return validation chain for Figma connection', () => {
      const validationChain = validateFigmaConnection();
      expect(Array.isArray(validationChain)).toBe(true);
      expect(validationChain.length).toBeGreaterThan(0);
    });

    it('should include handleValidationErrors in chain', () => {
      const validationChain = validateFigmaConnection();
      expect(validationChain).toContain(handleValidationErrors);
    });
  });

  describe('validateTokenSync', () => {
    it('should return validation chain for token sync', () => {
      const validationChain = validateTokenSync();
      expect(Array.isArray(validationChain)).toBe(true);
      expect(validationChain.length).toBeGreaterThan(0);
    });

    it('should include handleValidationErrors in chain', () => {
      const validationChain = validateTokenSync();
      expect(validationChain).toContain(handleValidationErrors);
    });
  });

  describe('validateComponentMapping', () => {
    it('should return validation chain for component mapping', () => {
      const validationChain = validateComponentMapping();
      expect(Array.isArray(validationChain)).toBe(true);
      expect(validationChain.length).toBeGreaterThan(0);
    });

    it('should include handleValidationErrors in chain', () => {
      const validationChain = validateComponentMapping();
      expect(validationChain).toContain(handleValidationErrors);
    });
  });
});

describe('Integration scenarios', () => {
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
      body: {},
      query: {},
      params: {},
      ip: '127.0.0.1',
      originalUrl: '/api/test'
    };
    
    mockRes = {
      status: mockStatus,
      json: mockJson,
      get: vi.fn()
    };
    
    mockNext = vi.fn();
  });

  it('should handle validation and sanitization together', () => {
    // Mock validation success
    (validationResult as Mock).mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });
    
    mockReq.body = {
      symbol: '  AAPL  ',
      description: '<script>alert(1)</script>'
    };
    
    // First sanitize
    sanitizeInput(mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockReq.body.symbol).toBe('AAPL');
    expect(mockReq.body.description).toBe('');
    expect(mockNext).toHaveBeenCalledTimes(1);
    
    // Then validate
    handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockNext).toHaveBeenCalledTimes(2);
    expect(mockStatus).not.toHaveBeenCalled();
  });

  it('should handle validation failure after sanitization', () => {
    // Mock validation failure
    const errors = [
      {
        type: 'field',
        msg: 'Invalid symbol',
        path: 'symbol',
        location: 'body',
        value: 'INVALID'
      }
    ];
    
    (validationResult as Mock).mockReturnValue({
      isEmpty: () => false,
      array: () => errors
    });
    
    mockReq.body = {
      symbol: '  INVALID  '
    };
    
    // First sanitize
    sanitizeInput(mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockReq.body.symbol).toBe('INVALID');
    expect(mockNext).toHaveBeenCalledTimes(1);
    
    // Then validate (should fail)
    handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockNext).toHaveBeenCalledTimes(1); // Should not call next again
  });

  it('should handle rate limiting with validation', () => {
    const limiter = createEndpointLimiter({ max: 1 });
    
    // Mock rate limit exceeded
    const rateLimitCall = (rateLimit as Mock).mock.calls[0][0];
    const rateLimitHandler = rateLimitCall.handler;
    
    (mockRes.get as Mock).mockReturnValue('60');
    
    rateLimitHandler(mockReq as Request, mockRes as Response, mockNext);
    
    expect(mockStatus).toHaveBeenCalledWith(429);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: {
        message: 'Too many requests, please try again later',
        type: 'RATE_LIMIT_ERROR',
        retryAfter: 60
      }
    });
  });
});

describe('Error handling in validation middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: Mock;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {}
    };
    
    mockRes = {};
    mockNext = vi.fn();
  });

  it('should handle errors in sanitizeInput gracefully', () => {
    // Create a problematic object that might cause errors
    const problematicObject = {};
    Object.defineProperty(problematicObject, 'problematic', {
      get() {
        throw new Error('Property access error');
      },
      enumerable: true
    });
    
    mockReq.body = problematicObject;
    
    expect(() => {
      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);
    }).not.toThrow();
    
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle circular references in sanitizeInput', () => {
    const circularObj: any = { name: 'test' };
    circularObj.self = circularObj;
    
    mockReq.body = { circular: circularObj };
    
    expect(() => {
      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);
    }).not.toThrow();
    
    expect(mockNext).toHaveBeenCalled();
  });
});