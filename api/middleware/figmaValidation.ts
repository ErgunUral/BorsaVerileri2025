import { Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';

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

// Figma connection validation
export const validateFigmaConnection = [
  body('fileId')
    .notEmpty()
    .withMessage('File ID is required')
    .matches(/^[a-zA-Z0-9]{22,}$/)
    .withMessage('Invalid Figma file ID format'),
  body('apiKey')
    .notEmpty()
    .withMessage('API key is required')
    .isLength({ min: 20 })
    .withMessage('Invalid API key format'),
  body('fileName')
    .notEmpty()
    .withMessage('File name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('File name must be between 1 and 255 characters')
    .trim(),
  handleValidationErrors
];

// Component mapping validation
export const validateComponentMapping = [
  body('figmaComponentId')
    .notEmpty()
    .withMessage('Figma component ID is required')
    .trim(),
  body('figmaComponentName')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Component name must be between 1 and 255 characters')
    .trim(),
  body('localComponentPath')
    .notEmpty()
    .withMessage('Local component path is required')
    .matches(/^[a-zA-Z0-9\/\-_\.]+$/)
    .withMessage('Invalid component path format')
    .trim(),
  body('mappingConfig')
    .optional()
    .isObject()
    .withMessage('Mapping config must be an object'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'draft'])
    .withMessage('Status must be active, inactive, or draft'),
  handleValidationErrors
];

// Token sync validation
export const validateTokenSync = [
  body('connectionId')
    .notEmpty()
    .withMessage('Connection ID is required')
    .isUUID()
    .withMessage('Invalid connection ID format'),
  body('tokenTypes')
    .optional()
    .isArray()
    .withMessage('Token types must be an array')
    .custom((value) => {
      const validTypes = ['colors', 'typography', 'spacing', 'shadows'];
      const invalidTypes = value.filter((type: string) => !validTypes.includes(type));
      if (invalidTypes.length > 0) {
        throw new Error(`Invalid token types: ${invalidTypes.join(', ')}`);
      }
      return true;
    }),
  handleValidationErrors
];

// File ID parameter validation
export const validateFileId = [
  param('fileId')
    .matches(/^[a-zA-Z0-9]{22,}$/)
    .withMessage('Invalid Figma file ID format'),
  handleValidationErrors
];

// Connection ID parameter validation
export const validateConnectionId = [
  param('connectionId')
    .isUUID()
    .withMessage('Invalid connection ID format'),
  handleValidationErrors
];