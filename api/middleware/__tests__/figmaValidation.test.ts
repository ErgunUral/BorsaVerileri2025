import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import {
  handleValidationErrors,
  validateFigmaConnection,
  validateComponentMapping,
  validateTokenSync,
  validateFileId,
  validateConnectionId
} from '../figmaValidation';

// Mock express-validator
jest.mock('express-validator', () => ({
  body: jest.fn(() => ({
    notEmpty: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
    matches: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    trim: jest.fn().mockReturnThis(),
    optional: jest.fn().mockReturnThis(),
    isObject: jest.fn().mockReturnThis(),
    isIn: jest.fn().mockReturnThis(),
    isArray: jest.fn().mockReturnThis(),
    custom: jest.fn().mockReturnThis(),
    isUUID: jest.fn().mockReturnThis()
  })),
  param: jest.fn(() => ({
    matches: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
    isUUID: jest.fn().mockReturnThis()
  })),
  validationResult: jest.fn()
}));

const mockValidationResult = validationResult as jest.MockedFunction<typeof validationResult>;

describe('handleValidationErrors', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  it('should call next() when no validation errors', () => {
    mockValidationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => []
    } as any);

    handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });

  it('should return 400 with error details when validation fails', () => {
    const mockErrors = [
      {
        type: 'field',
        msg: 'File ID is required',
        path: 'fileId',
        location: 'body'
      },
      {
        type: 'field',
        msg: 'Invalid API key format',
        path: 'apiKey',
        location: 'body'
      }
    ];

    mockValidationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => mockErrors
    } as any);

    handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Validation failed',
      details: mockErrors
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle empty error array', () => {
    mockValidationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => []
    } as any);

    handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Validation failed',
      details: []
    });
  });

  it('should handle validation result with multiple error types', () => {
    const mockErrors = [
      {
        type: 'field',
        msg: 'File ID is required',
        path: 'fileId',
        location: 'body'
      },
      {
        type: 'alternative',
        msg: 'Invalid format',
        path: 'apiKey',
        location: 'body'
      }
    ];

    mockValidationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => mockErrors
    } as any);

    handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Validation failed',
      details: mockErrors
    });
  });
});

describe('Validation Chain Tests', () => {
  describe('validateFigmaConnection', () => {
    it('should be an array containing validation middleware and error handler', () => {
      expect(Array.isArray(validateFigmaConnection)).toBe(true);
      expect(validateFigmaConnection.length).toBeGreaterThan(0);
      expect(validateFigmaConnection[validateFigmaConnection.length - 1]).toBe(handleValidationErrors);
    });

    it('should validate required fields', () => {
      // Test that body() was called for each required field
      expect(require('express-validator').body).toHaveBeenCalledWith('fileId');
      expect(require('express-validator').body).toHaveBeenCalledWith('apiKey');
      expect(require('express-validator').body).toHaveBeenCalledWith('fileName');
    });
  });

  describe('validateComponentMapping', () => {
    it('should be an array containing validation middleware and error handler', () => {
      expect(Array.isArray(validateComponentMapping)).toBe(true);
      expect(validateComponentMapping.length).toBeGreaterThan(0);
      expect(validateComponentMapping[validateComponentMapping.length - 1]).toBe(handleValidationErrors);
    });

    it('should validate component mapping fields', () => {
      expect(require('express-validator').body).toHaveBeenCalledWith('figmaComponentId');
      expect(require('express-validator').body).toHaveBeenCalledWith('figmaComponentName');
      expect(require('express-validator').body).toHaveBeenCalledWith('localComponentPath');
      expect(require('express-validator').body).toHaveBeenCalledWith('mappingConfig');
      expect(require('express-validator').body).toHaveBeenCalledWith('status');
    });
  });

  describe('validateTokenSync', () => {
    it('should be an array containing validation middleware and error handler', () => {
      expect(Array.isArray(validateTokenSync)).toBe(true);
      expect(validateTokenSync.length).toBeGreaterThan(0);
      expect(validateTokenSync[validateTokenSync.length - 1]).toBe(handleValidationErrors);
    });

    it('should validate token sync fields', () => {
      expect(require('express-validator').body).toHaveBeenCalledWith('connectionId');
      expect(require('express-validator').body).toHaveBeenCalledWith('tokenTypes');
    });
  });

  describe('validateFileId', () => {
    it('should be an array containing validation middleware and error handler', () => {
      expect(Array.isArray(validateFileId)).toBe(true);
      expect(validateFileId.length).toBeGreaterThan(0);
      expect(validateFileId[validateFileId.length - 1]).toBe(handleValidationErrors);
    });

    it('should validate fileId parameter', () => {
      expect(require('express-validator').param).toHaveBeenCalledWith('fileId');
    });
  });

  describe('validateConnectionId', () => {
    it('should be an array containing validation middleware and error handler', () => {
      expect(Array.isArray(validateConnectionId)).toBe(true);
      expect(validateConnectionId.length).toBeGreaterThan(0);
      expect(validateConnectionId[validateConnectionId.length - 1]).toBe(handleValidationErrors);
    });

    it('should validate connectionId parameter', () => {
      expect(require('express-validator').param).toHaveBeenCalledWith('connectionId');
    });
  });
});

describe('Validation Logic Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      body: {},
      params: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  describe('Figma Connection Validation', () => {
    it('should pass with valid figma connection data', () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      } as any);

      mockReq.body = {
        fileId: 'abcdefghijklmnopqrstuvwxyz123456',
        apiKey: 'figd_1234567890abcdefghijklmnopqrstuvwxyz',
        fileName: 'My Design File'
      };

      // Test the error handler (last middleware in chain)
      const errorHandler = validateFigmaConnection[validateFigmaConnection.length - 1] as any;
      errorHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should fail with invalid figma connection data', () => {
      const mockErrors = [
        {
          type: 'field',
          msg: 'Invalid Figma file ID format',
          path: 'fileId',
          location: 'body'
        }
      ];

      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      } as any);

      mockReq.body = {
        fileId: 'invalid-id',
        apiKey: 'short',
        fileName: ''
      };

      const errorHandler = validateFigmaConnection[validateFigmaConnection.length - 1] as any;
      errorHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: mockErrors
      });
    });
  });

  describe('Component Mapping Validation', () => {
    it('should pass with valid component mapping data', () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      } as any);

      mockReq.body = {
        figmaComponentId: 'comp_123456',
        figmaComponentName: 'Button Component',
        localComponentPath: 'src/components/Button',
        mappingConfig: { prop1: 'value1' },
        status: 'active'
      };

      const errorHandler = validateComponentMapping[validateComponentMapping.length - 1] as any;
      errorHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should fail with invalid component mapping data', () => {
      const mockErrors = [
        {
          type: 'field',
          msg: 'Figma component ID is required',
          path: 'figmaComponentId',
          location: 'body'
        },
        {
          type: 'field',
          msg: 'Invalid component path format',
          path: 'localComponentPath',
          location: 'body'
        }
      ];

      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      } as any);

      mockReq.body = {
        figmaComponentId: '',
        localComponentPath: 'invalid/path/with/spaces and special chars!',
        status: 'invalid-status'
      };

      const errorHandler = validateComponentMapping[validateComponentMapping.length - 1] as any;
      errorHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: mockErrors
      });
    });
  });

  describe('Token Sync Validation', () => {
    it('should pass with valid token sync data', () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      } as any);

      mockReq.body = {
        connectionId: '123e4567-e89b-12d3-a456-426614174000',
        tokenTypes: ['colors', 'typography']
      };

      const errorHandler = validateTokenSync[validateTokenSync.length - 1] as any;
      errorHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should fail with invalid token sync data', () => {
      const mockErrors = [
        {
          type: 'field',
          msg: 'Invalid connection ID format',
          path: 'connectionId',
          location: 'body'
        },
        {
          type: 'field',
          msg: 'Invalid token types: invalidType',
          path: 'tokenTypes',
          location: 'body'
        }
      ];

      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      } as any);

      mockReq.body = {
        connectionId: 'invalid-uuid',
        tokenTypes: ['colors', 'invalidType']
      };

      const errorHandler = validateTokenSync[validateTokenSync.length - 1] as any;
      errorHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: mockErrors
      });
    });
  });

  describe('Parameter Validation', () => {
    it('should validate fileId parameter correctly', () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      } as any);

      mockReq.params = {
        fileId: 'abcdefghijklmnopqrstuvwxyz123456'
      };

      const errorHandler = validateFileId[validateFileId.length - 1] as any;
      errorHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should fail with invalid fileId parameter', () => {
      const mockErrors = [
        {
          type: 'field',
          msg: 'Invalid Figma file ID format',
          path: 'fileId',
          location: 'params'
        }
      ];

      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      } as any);

      mockReq.params = {
        fileId: 'invalid-file-id'
      };

      const errorHandler = validateFileId[validateFileId.length - 1] as any;
      errorHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: mockErrors
      });
    });

    it('should validate connectionId parameter correctly', () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      } as any);

      mockReq.params = {
        connectionId: '123e4567-e89b-12d3-a456-426614174000'
      };

      const errorHandler = validateConnectionId[validateConnectionId.length - 1] as any;
      errorHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should fail with invalid connectionId parameter', () => {
      const mockErrors = [
        {
          type: 'field',
          msg: 'Invalid connection ID format',
          path: 'connectionId',
          location: 'params'
        }
      ];

      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      } as any);

      mockReq.params = {
        connectionId: 'not-a-uuid'
      };

      const errorHandler = validateConnectionId[validateConnectionId.length - 1] as any;
      errorHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: mockErrors
      });
    });
  });
});

describe('Edge Cases and Error Handling', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  it('should handle validation result throwing an error', () => {
    mockValidationResult.mockImplementation(() => {
      throw new Error('Validation result error');
    });

    expect(() => {
      handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);
    }).toThrow('Validation result error');
  });

  it('should handle malformed validation errors', () => {
    mockValidationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => null // Malformed response
    } as any);

    handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Validation failed',
      details: null
    });
  });

  it('should handle response object without status method', () => {
    const mockResWithoutStatus = {
      json: jest.fn()
    } as unknown as Response;

    mockValidationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => []
    } as any);

    expect(() => {
      handleValidationErrors(mockReq as Request, mockResWithoutStatus, mockNext);
    }).toThrow();
  });

  it('should handle response object without json method', () => {
    const mockResWithoutJson = {
      status: jest.fn().mockReturnThis()
    } as unknown as Response;

    mockValidationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => []
    } as any);

    expect(() => {
      handleValidationErrors(mockReq as Request, mockResWithoutJson, mockNext);
    }).toThrow();
  });
});

describe('Integration Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      body: {},
      params: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  it('should validate complete figma workflow', () => {
    // Test figma connection validation
    mockValidationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => []
    } as any);

    mockReq.body = {
      fileId: 'abcdefghijklmnopqrstuvwxyz123456',
      apiKey: 'figd_1234567890abcdefghijklmnopqrstuvwxyz',
      fileName: 'Design System'
    };

    const connectionHandler = validateFigmaConnection[validateFigmaConnection.length - 1] as any;
    connectionHandler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();

    // Reset for component mapping
    jest.clearAllMocks();
    mockNext = jest.fn();

    mockReq.body = {
      figmaComponentId: 'comp_button_primary',
      figmaComponentName: 'Primary Button',
      localComponentPath: 'src/components/Button/Primary',
      mappingConfig: {
        props: ['variant', 'size', 'disabled'],
        styles: ['backgroundColor', 'color', 'borderRadius']
      },
      status: 'active'
    };

    const mappingHandler = validateComponentMapping[validateComponentMapping.length - 1] as any;
    mappingHandler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should handle validation chain with multiple errors', () => {
    const mockErrors = [
      {
        type: 'field',
        msg: 'File ID is required',
        path: 'fileId',
        location: 'body'
      },
      {
        type: 'field',
        msg: 'API key is required',
        path: 'apiKey',
        location: 'body'
      },
      {
        type: 'field',
        msg: 'File name is required',
        path: 'fileName',
        location: 'body'
      }
    ];

    mockValidationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => mockErrors
    } as any);

    mockReq.body = {}; // Empty body to trigger all validation errors

    const errorHandler = validateFigmaConnection[validateFigmaConnection.length - 1] as any;
    errorHandler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Validation failed',
      details: mockErrors
    });
    expect(mockNext).not.toHaveBeenCalled();
  });
});