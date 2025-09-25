import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateUser, optionalAuth, requireAdmin, generateToken } from '../auth';
import { supabase } from '../../config/supabase';

// Mock dependencies
vi.mock('jsonwebtoken');
vi.mock('../../config/supabase');

const mockedJwt = jwt as any;
const mockedSupabase = supabase as any;

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request & { user?: { id: string; email: string; role?: string; } }>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockSupabaseFrom: any;
  let mockSupabaseSelect: any;
  let mockSupabaseEq: any;
  let mockSupabaseSingle: any;

  const validToken = 'valid.jwt.token';
  const invalidToken = 'invalid.jwt.token';
  
  const validUser = {
    id: 'user123',
    email: 'test@example.com',
    role: 'user'
  };

  const adminUser = {
    id: 'admin123',
    email: 'admin@example.com',
    role: 'admin'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup environment
    process.env['JWT_SECRET'] = 'your-secret-key';
    
    mockRequest = {
      headers: {}
    };
    
    mockResponse = {
      status: vi.fn().mockReturnThis() as any,
      json: vi.fn().mockReturnThis() as any
    };
    
    mockNext = vi.fn();
    
    // Setup Supabase mocks
    mockSupabaseSingle = vi.fn();
    mockSupabaseEq = vi.fn().mockReturnValue({ single: mockSupabaseSingle });
    mockSupabaseSelect = vi.fn().mockReturnValue({ eq: mockSupabaseEq });
    mockSupabaseFrom = vi.fn().mockReturnValue({ select: mockSupabaseSelect });
    
    mockedSupabase.from = mockSupabaseFrom;
    
    // Setup JWT mock defaults
    mockedJwt.verify = vi.fn() as any;
    mockedJwt.sign = vi.fn() as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env['JWT_SECRET'];
  });

  describe('authenticateUser', () => {
    describe('Token Validation', () => {
      it('should authenticate user with valid token', async () => {
        mockRequest.headers = {
          authorization: `Bearer ${validToken}`
        };
        
        (mockedJwt.verify as any).mockReturnValue({ userId: validUser.id });
        mockSupabaseSingle.mockResolvedValue({
          data: validUser,
          error: null
        });
        
        await authenticateUser(mockRequest as Request, mockResponse as Response, mockNext);
        
        expect(mockedJwt.verify).toHaveBeenCalledWith(validToken, 'your-secret-key');
        expect(mockSupabaseFrom).toHaveBeenCalledWith('users');
        expect(mockSupabaseSelect).toHaveBeenCalledWith('id, email, role');
        expect(mockSupabaseEq).toHaveBeenCalledWith('id', validUser.id);
        expect(mockRequest.user).toEqual(validUser);
        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });

      it('should reject request without authorization header', async () => {
        mockRequest.headers = {};
        
        await authenticateUser(mockRequest as Request, mockResponse as Response, mockNext);
        
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'No token provided' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject request with invalid authorization format', async () => {
        mockRequest.headers = {
          authorization: 'InvalidFormat token'
        };
        
        await authenticateUser(mockRequest as Request, mockResponse as Response, mockNext);
        
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'No token provided' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject request with empty Bearer token', async () => {
        mockRequest.headers = {
          authorization: 'Bearer '
        };
        
        await authenticateUser(mockRequest as Request, mockResponse as Response, mockNext);
        
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Invalid token' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject invalid JWT token', async () => {
        mockRequest.headers = {
          authorization: `Bearer ${invalidToken}`
        };
        
        mockedJwt.verify.mockImplementation(() => {
          throw new Error('Invalid token');
        });
        
        await authenticateUser(mockRequest as Request, mockResponse as Response, mockNext);
        
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Invalid token' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject token for non-existent user', async () => {
        mockRequest.headers = {
          authorization: `Bearer ${validToken}`
        };
        
        (mockedJwt.verify as any).mockReturnValue({ userId: 'nonexistent' });
        mockSupabaseSingle.mockResolvedValue({
          data: null,
          error: { message: 'User not found' }
        });
        
        await authenticateUser(mockRequest as Request, mockResponse as Response, mockNext);
        
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Invalid token' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should handle database errors gracefully', async () => {
        mockRequest.headers = {
          authorization: `Bearer ${validToken}`
        };
        
        (mockedJwt.verify as any).mockReturnValue({ userId: validUser.id });
        mockSupabaseSingle.mockRejectedValue(new Error('Database error'));
        
        await authenticateUser(mockRequest as Request, mockResponse as Response, mockNext);
        
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Invalid token' });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });
  });

  describe('optionalAuth', () => {
    it('should authenticate user with valid token', async () => {
      mockRequest.headers = {
        authorization: `Bearer ${validToken}`
      };
      
      (mockedJwt.verify as any).mockReturnValue({ userId: validUser.id });
      mockSupabaseSingle.mockResolvedValue({
        data: validUser,
        error: null
      });
      
      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockRequest.user).toEqual(validUser);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should proceed without authentication when no token provided', async () => {
      mockRequest.headers = {};
      
      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should proceed without authentication when invalid token provided', async () => {
      mockRequest.headers = {
        authorization: `Bearer ${invalidToken}`
      };
      
      (mockedJwt.verify as any).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should proceed without authentication when user not found', async () => {
      mockRequest.headers = {
        authorization: `Bearer ${validToken}`
      };
      
      (mockedJwt.verify as any).mockReturnValue({ userId: 'nonexistent' });
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: { message: 'User not found' }
      });
      
      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockRequest.headers = {
        authorization: `Bearer ${validToken}`
      };
      
      (mockedJwt.verify as any).mockReturnValue({ userId: validUser.id });
      mockSupabaseSingle.mockRejectedValue(new Error('Database error'));
      
      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow admin users to proceed', () => {
      mockRequest.user = adminUser;
      
      requireAdmin(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests', () => {
      delete mockRequest.user;
      
      requireAdmin(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Authentication required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject non-admin users', () => {
      mockRequest.user = validUser; // Regular user
      
      requireAdmin(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Admin access required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject users without role', () => {
      mockRequest.user = {
        id: 'user123',
        email: 'test@example.com'
        // No role property
      };
      
      requireAdmin(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Admin access required' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('generateToken', () => {
    it('should generate JWT token with correct payload', () => {
      const userId = 'user123';
      const expectedToken = 'generated.jwt.token';
      
      (mockedJwt.sign as any).mockReturnValue(expectedToken);
      
      const result = generateToken(userId);
      
      expect(mockedJwt.sign).toHaveBeenCalledWith(
          { userId },
          'your-secret-key',
          { expiresIn: '7d' }
        );
      expect(result).toBe(expectedToken);
    });

    it('should use default JWT secret when environment variable not set', () => {
      delete process.env['JWT_SECRET'];
      const userId = 'user123';
      const expectedToken = 'generated.jwt.token';
      
      (mockedJwt.sign as any).mockReturnValue(expectedToken);
      
      const result = generateToken(userId);
      
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        { userId },
        'your-secret-key', // Default secret
        { expiresIn: '7d' }
      );
      expect(result).toBe(expectedToken);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete authentication flow', async () => {
      // Generate token
      const userId = validUser.id;
      const token = 'generated.token';
      
      (mockedJwt.sign as any).mockReturnValue(token);
      const generatedToken = generateToken(userId);
      
      // Use token for authentication
      mockRequest.headers = {
        authorization: `Bearer ${generatedToken}`
      };
      
      (mockedJwt.verify as any).mockReturnValue({ userId });
      mockSupabaseSingle.mockResolvedValue({
        data: validUser,
        error: null
      });
      
      await authenticateUser(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(generatedToken).toBe(token);
      expect(mockRequest.user).toEqual(validUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle admin authentication flow', async () => {
      // Authenticate as admin
      mockRequest.headers = {
        authorization: `Bearer ${validToken}`
      };
      
      (mockedJwt.verify as any).mockReturnValue({ userId: adminUser.id });
      mockSupabaseSingle.mockResolvedValue({
        data: adminUser,
        error: null
      });
      
      await authenticateUser(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Check admin access
      requireAdmin(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockRequest.user).toEqual(adminUser);
      expect(mockNext).toHaveBeenCalledTimes(2); // Once for auth, once for admin check
    });

    it('should handle optional authentication with admin check', async () => {
      // Optional auth with valid admin token
      mockRequest.headers = {
        authorization: `Bearer ${validToken}`
      };
      
      (mockedJwt.verify as any).mockReturnValue({ userId: adminUser.id });
      mockSupabaseSingle.mockResolvedValue({
        data: adminUser,
        error: null
      });
      
      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Check admin access
      requireAdmin(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockRequest.user).toEqual(adminUser);
      expect(mockNext).toHaveBeenCalledTimes(2);
    });
  });
});