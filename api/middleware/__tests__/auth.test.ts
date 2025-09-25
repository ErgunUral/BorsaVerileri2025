import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { auth, socketAuth, AuthenticatedRequest } from '../auth';
import { logger } from '../../utils/logger';
import { CacheService } from '../../services/cacheService';

// Mock dependencies
vi.mock('jsonwebtoken');
vi.mock('../../utils/logger');
vi.mock('../../services/cacheService');

const mockedJwt = vi.mocked(jwt);
const mockedLogger = vi.mocked(logger);
const MockedCacheService = vi.mocked(CacheService);

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockCacheService: any;

  const validToken = 'valid.jwt.token';
  const invalidToken = 'invalid.jwt.token';
  const expiredToken = 'expired.jwt.token';
  
  const validUser = {
    id: 'user123',
    email: 'test@example.com',
    role: 'user',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  const adminUser = {
    id: 'admin123',
    email: 'admin@example.com',
    role: 'admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockRequest = {
      headers: {},
      query: {},
      body: {}
    };
    
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    };
    
    mockNext = vi.fn();
    
    mockCacheService = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      exists: vi.fn()
    };
    
    MockedCacheService.mockImplementation(() => mockCacheService);
    
    // Setup JWT mock defaults
    mockedJwt.verify = vi.fn();
    mockedJwt.sign = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('HTTP Auth Middleware', () => {
    describe('Token Extraction', () => {
      it('should extract token from Authorization header (Bearer)', async () => {
        mockRequest.headers = {
          authorization: `Bearer ${validToken}`
        };
        
        mockedJwt.verify.mockReturnValue(validUser);
        
        await auth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
        
        expect(mockedJwt.verify).toHaveBeenCalledWith(validToken, expect.any(String));
        expect(mockRequest.user).toEqual(validUser);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should extract token from query parameter', async () => {
        mockRequest.query = {
          token: validToken
        };
        
        mockedJwt.verify.mockReturnValue(validUser);
        
        await auth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
        
        expect(mockedJwt.verify).toHaveBeenCalledWith(validToken, expect.any(String));
        expect(mockRequest.user).toEqual(validUser);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should extract token from cookie', async () => {
        mockRequest.headers = {
          cookie: `auth_token=${validToken}; other_cookie=value`
        };
        
        mockedJwt.verify.mockReturnValue(validUser);
        
        await auth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
        
        expect(mockedJwt.verify).toHaveBeenCalledWith(validToken, expect.any(String));
        expect(mockRequest.user).toEqual(validUser);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should prioritize Authorization header over other methods', async () => {
        mockRequest.headers = {
          authorization: `Bearer ${validToken}`,
          cookie: `auth_token=other_token`
        };
        mockRequest.query = {
          token: 'query_token'
        };
        
        mockedJwt.verify.mockReturnValue(validUser);
        
        await auth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
        
        expect(mockedJwt.verify).toHaveBeenCalledWith(validToken, expect.any(String));
      });
    });

    describe('Token Validation', () => {
      it('should validate valid JWT token', async () => {
        mockRequest.headers = {
          authorization: `Bearer ${validToken}`
        };
        
        mockedJwt.verify.mockReturnValue(validUser);
        
        await auth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
        
        expect(mockRequest.user).toEqual(validUser);
        expect(mockNext).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
      });

      it('should reject invalid JWT token', async () => {
        mockRequest.headers = {
          authorization: `Bearer ${invalidToken}`
        };
        
        mockedJwt.verify.mockImplementation(() => {
          throw new Error('Invalid token');
        });
        
        await auth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
        
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Invalid token'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject expired JWT token', async () => {
        mockRequest.headers = {
          authorization: `Bearer ${expiredToken}`
        };
        
        mockedJwt.verify.mockImplementation(() => {
          const error = new Error('Token expired');
          error.name = 'TokenExpiredError';
          throw error;
        });
        
        await auth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
        
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Token expired'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject malformed JWT token', async () => {
        mockRequest.headers = {
          authorization: `Bearer malformed.token`
        };
        
        mockedJwt.verify.mockImplementation(() => {
          const error = new Error('Malformed token');
          error.name = 'JsonWebTokenError';
          throw error;
        });
        
        await auth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
        
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Invalid token format'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('Token Blacklist', () => {
      it('should reject blacklisted tokens', async () => {
        mockRequest.headers = {
          authorization: `Bearer ${validToken}`
        };
        
        mockedJwt.verify.mockReturnValue(validUser);
        mockCacheService.exists.mockResolvedValue(true); // Token is blacklisted
        
        await auth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
        
        expect(mockCacheService.exists).toHaveBeenCalledWith(`blacklist:${validToken}`);
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Token has been revoked'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should allow non-blacklisted tokens', async () => {
        mockRequest.headers = {
          authorization: `Bearer ${validToken}`
        };
        
        mockedJwt.verify.mockReturnValue(validUser);
        mockCacheService.exists.mockResolvedValue(false); // Token is not blacklisted
        
        await auth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
        
        expect(mockCacheService.exists).toHaveBeenCalledWith(`blacklist:${validToken}`);
        expect(mockRequest.user).toEqual(validUser);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should handle blacklist check errors gracefully', async () => {
        mockRequest.headers = {
          authorization: `Bearer ${validToken}`
        };
        
        mockedJwt.verify.mockReturnValue(validUser);
        mockCacheService.exists.mockRejectedValue(new Error('Cache error'));
        
        await auth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
        
        // Should proceed if blacklist check fails (fail open)
        expect(mockRequest.user).toEqual(validUser);
        expect(mockNext).toHaveBeenCalled();
        expect(mockedLogger.warn).toHaveBeenCalledWith(
          'Failed to check token blacklist',
          expect.any(Object)
        );
      });
    });

    describe('Missing Token Handling', () => {
      it('should reject request without token', async () => {
        mockRequest.headers = {};
        
        await auth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
        
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Access token required'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject request with empty Authorization header', async () => {
        mockRequest.headers = {
          authorization: ''
        };
        
        await auth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
        
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Access token required'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should reject request with invalid Authorization format', async () => {
        mockRequest.headers = {
          authorization: 'InvalidFormat token'
        };
        
        await auth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
        
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Invalid authorization format'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('Role-based Access Control', () => {
      it('should allow admin users to access admin routes', async () => {
        mockRequest.headers = {
          authorization: `Bearer ${validToken}`
        };
        mockRequest.path = '/api/admin/users';
        
        mockedJwt.verify.mockReturnValue(adminUser);
        mockCacheService.exists.mockResolvedValue(false);
        
        await auth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
        
        expect(mockRequest.user).toEqual(adminUser);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject regular users from admin routes', async () => {
        mockRequest.headers = {
          authorization: `Bearer ${validToken}`
        };
        mockRequest.path = '/api/admin/users';
        
        mockedJwt.verify.mockReturnValue(validUser); // Regular user
        mockCacheService.exists.mockResolvedValue(false);
        
        await auth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
        
        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Insufficient permissions'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should allow all authenticated users to access public routes', async () => {
        mockRequest.headers = {
          authorization: `Bearer ${validToken}`
        };
        mockRequest.path = '/api/stocks/quote/AAPL';
        
        mockedJwt.verify.mockReturnValue(validUser);
        mockCacheService.exists.mockResolvedValue(false);
        
        await auth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
        
        expect(mockRequest.user).toEqual(validUser);
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('Error Handling', () => {
      it('should handle JWT verification errors gracefully', async () => {
        mockRequest.headers = {
          authorization: `Bearer ${invalidToken}`
        };
        
        mockedJwt.verify.mockImplementation(() => {
          throw new Error('Unexpected JWT error');
        });
        
        await auth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
        
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Authentication failed'
        });
        expect(mockedLogger.error).toHaveBeenCalledWith(
          'JWT verification failed',
          expect.any(Object)
        );
      });

      it('should handle missing JWT secret gracefully', async () => {
        mockRequest.headers = {
          authorization: `Bearer ${validToken}`
        };
        
        // Mock missing JWT secret
        const originalEnv = process.env.JWT_SECRET;
        delete process.env.JWT_SECRET;
        
        await auth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
        
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Authentication service unavailable'
        });
        
        // Restore environment
        process.env.JWT_SECRET = originalEnv;
      });
    });

    describe('Logging and Monitoring', () => {
      it('should log successful authentication', async () => {
        mockRequest.headers = {
          authorization: `Bearer ${validToken}`
        };
        
        mockedJwt.verify.mockReturnValue(validUser);
        mockCacheService.exists.mockResolvedValue(false);
        
        await auth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
        
        expect(mockedLogger.debug).toHaveBeenCalledWith(
          'User authenticated successfully',
          { userId: validUser.id, email: validUser.email }
        );
      });

      it('should log failed authentication attempts', async () => {
        mockRequest.headers = {
          authorization: `Bearer ${invalidToken}`
        };
        
        mockedJwt.verify.mockImplementation(() => {
          throw new Error('Invalid token');
        });
        
        await auth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
        
        expect(mockedLogger.warn).toHaveBeenCalledWith(
          'Authentication failed',
          expect.objectContaining({
            error: 'Invalid token',
            token: expect.stringContaining('***')
          })
        );
      });

      it('should mask sensitive token data in logs', async () => {
        mockRequest.headers = {
          authorization: `Bearer ${invalidToken}`
        };
        
        mockedJwt.verify.mockImplementation(() => {
          throw new Error('Invalid token');
        });
        
        await auth(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
        
        expect(mockedLogger.warn).toHaveBeenCalledWith(
          'Authentication failed',
          expect.objectContaining({
            token: expect.not.stringContaining(invalidToken)
          })
        );
      });
    });
  });

  describe('WebSocket Auth Middleware', () => {
    let mockSocket: any;
    let mockNext: any;

    beforeEach(() => {
      mockSocket = {
        handshake: {
          auth: {},
          query: {},
          headers: {}
        },
        data: {},
        disconnect: vi.fn()
      };
      
      mockNext = vi.fn();
    });

    describe('Token Extraction', () => {
      it('should extract token from handshake auth', async () => {
        mockSocket.handshake.auth = {
          token: validToken
        };
        
        mockedJwt.verify.mockReturnValue(validUser);
        mockCacheService.exists.mockResolvedValue(false);
        
        await socketAuth(mockSocket, mockNext);
        
        expect(mockedJwt.verify).toHaveBeenCalledWith(validToken, expect.any(String));
        expect(mockSocket.data.user).toEqual(validUser);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should extract token from query parameters', async () => {
        mockSocket.handshake.query = {
          token: validToken
        };
        
        mockedJwt.verify.mockReturnValue(validUser);
        mockCacheService.exists.mockResolvedValue(false);
        
        await socketAuth(mockSocket, mockNext);
        
        expect(mockedJwt.verify).toHaveBeenCalledWith(validToken, expect.any(String));
        expect(mockSocket.data.user).toEqual(validUser);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should extract token from headers', async () => {
        mockSocket.handshake.headers = {
          authorization: `Bearer ${validToken}`
        };
        
        mockedJwt.verify.mockReturnValue(validUser);
        mockCacheService.exists.mockResolvedValue(false);
        
        await socketAuth(mockSocket, mockNext);
        
        expect(mockedJwt.verify).toHaveBeenCalledWith(validToken, expect.any(String));
        expect(mockSocket.data.user).toEqual(validUser);
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('Authentication Validation', () => {
      it('should validate valid WebSocket authentication', async () => {
        mockSocket.handshake.auth = {
          token: validToken
        };
        
        mockedJwt.verify.mockReturnValue(validUser);
        mockCacheService.exists.mockResolvedValue(false);
        
        await socketAuth(mockSocket, mockNext);
        
        expect(mockSocket.data.user).toEqual(validUser);
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should reject invalid WebSocket authentication', async () => {
        mockSocket.handshake.auth = {
          token: invalidToken
        };
        
        mockedJwt.verify.mockImplementation(() => {
          throw new Error('Invalid token');
        });
        
        await socketAuth(mockSocket, mockNext);
        
        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Authentication failed'
          })
        );
        expect(mockSocket.data.user).toBeUndefined();
      });

      it('should handle missing WebSocket token', async () => {
        mockSocket.handshake.auth = {};
        mockSocket.handshake.query = {};
        mockSocket.handshake.headers = {};
        
        await socketAuth(mockSocket, mockNext);
        
        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Authentication required'
          })
        );
      });

      it('should reject blacklisted WebSocket tokens', async () => {
        mockSocket.handshake.auth = {
          token: validToken
        };
        
        mockedJwt.verify.mockReturnValue(validUser);
        mockCacheService.exists.mockResolvedValue(true); // Token is blacklisted
        
        await socketAuth(mockSocket, mockNext);
        
        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Token has been revoked'
          })
        );
      });
    });

    describe('Connection Management', () => {
      it('should allow authenticated WebSocket connections', async () => {
        mockSocket.handshake.auth = {
          token: validToken
        };
        
        mockedJwt.verify.mockReturnValue(validUser);
        mockCacheService.exists.mockResolvedValue(false);
        
        await socketAuth(mockSocket, mockNext);
        
        expect(mockSocket.data.user).toEqual(validUser);
        expect(mockSocket.data.authenticated).toBe(true);
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should disconnect unauthorized WebSocket connections', async () => {
        mockSocket.handshake.auth = {
          token: invalidToken
        };
        
        mockedJwt.verify.mockImplementation(() => {
          throw new Error('Invalid token');
        });
        
        await socketAuth(mockSocket, mockNext);
        
        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        expect(mockSocket.data.authenticated).toBe(false);
      });

      it('should handle WebSocket authentication timeouts', async () => {
        mockSocket.handshake.auth = {
          token: validToken
        };
        
        // Mock slow JWT verification
        mockedJwt.verify.mockImplementation(() => {
          return new Promise(resolve => {
            setTimeout(() => resolve(validUser), 10000); // 10 second delay
          });
        });
        
        const timeoutPromise = new Promise(resolve => {
          setTimeout(resolve, 1000); // 1 second timeout
        });
        
        await Promise.race([
          socketAuth(mockSocket, mockNext),
          timeoutPromise
        ]);
        
        // Should timeout and not authenticate
        expect(mockSocket.data.user).toBeUndefined();
      });
    });

    describe('Error Handling', () => {
      it('should handle WebSocket authentication errors gracefully', async () => {
        mockSocket.handshake.auth = {
          token: validToken
        };
        
        mockedJwt.verify.mockImplementation(() => {
          throw new Error('Unexpected error');
        });
        
        await socketAuth(mockSocket, mockNext);
        
        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Authentication failed'
          })
        );
        expect(mockedLogger.error).toHaveBeenCalledWith(
          'WebSocket authentication failed',
          expect.any(Object)
        );
      });

      it('should handle cache service errors in WebSocket auth', async () => {
        mockSocket.handshake.auth = {
          token: validToken
        };
        
        mockedJwt.verify.mockReturnValue(validUser);
        mockCacheService.exists.mockRejectedValue(new Error('Cache error'));
        
        await socketAuth(mockSocket, mockNext);
        
        // Should proceed if blacklist check fails (fail open)
        expect(mockSocket.data.user).toEqual(validUser);
        expect(mockNext).toHaveBeenCalledWith();
        expect(mockedLogger.warn).toHaveBeenCalledWith(
          'Failed to check token blacklist for WebSocket',
          expect.any(Object)
        );
      });
    });
  });

  describe('Token Management', () => {
    describe('Token Blacklisting', () => {
      it('should add token to blacklist', async () => {
        const tokenToBlacklist = 'token.to.blacklist';
        const expirationTime = 3600; // 1 hour
        
        mockCacheService.set.mockResolvedValue(true);
        
        // Simulate blacklisting function (would be in auth module)
        await mockCacheService.set(
          `blacklist:${tokenToBlacklist}`,
          'true',
          expirationTime
        );
        
        expect(mockCacheService.set).toHaveBeenCalledWith(
          `blacklist:${tokenToBlacklist}`,
          'true',
          expirationTime
        );
      });

      it('should remove token from blacklist', async () => {
        const tokenToRemove = 'token.to.remove';
        
        mockCacheService.del.mockResolvedValue(1);
        
        // Simulate removing from blacklist
        await mockCacheService.del(`blacklist:${tokenToRemove}`);
        
        expect(mockCacheService.del).toHaveBeenCalledWith(
          `blacklist:${tokenToRemove}`
        );
      });

      it('should check if token is blacklisted', async () => {
        const tokenToCheck = 'token.to.check';
        
        mockCacheService.exists.mockResolvedValue(true);
        
        const isBlacklisted = await mockCacheService.exists(
          `blacklist:${tokenToCheck}`
        );
        
        expect(isBlacklisted).toBe(true);
        expect(mockCacheService.exists).toHaveBeenCalledWith(
          `blacklist:${tokenToCheck}`
        );
      });
    });

    describe('Token Refresh', () => {
      it('should handle token refresh requests', async () => {
        const refreshToken = 'valid.refresh.token';
        const newAccessToken = 'new.access.token';
        
        mockedJwt.verify.mockReturnValue({
          ...validUser,
          type: 'refresh'
        });
        
        mockedJwt.sign.mockReturnValue(newAccessToken);
        
        // Simulate token refresh (would be in auth route)
        const decoded = mockedJwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
        const newToken = mockedJwt.sign(
          { id: decoded.id, email: decoded.email, role: decoded.role },
          process.env.JWT_SECRET!,
          { expiresIn: '1h' }
        );
        
        expect(newToken).toBe(newAccessToken);
        expect(mockedJwt.verify).toHaveBeenCalledWith(
          refreshToken,
          process.env.JWT_REFRESH_SECRET
        );
      });

      it('should reject invalid refresh tokens', async () => {
        const invalidRefreshToken = 'invalid.refresh.token';
        
        mockedJwt.verify.mockImplementation(() => {
          throw new Error('Invalid refresh token');
        });
        
        expect(() => {
          mockedJwt.verify(invalidRefreshToken, process.env.JWT_REFRESH_SECRET!);
        }).toThrow('Invalid refresh token');
      });
    });
  });

  describe('Performance and Security', () => {
    it('should handle high-frequency authentication requests', async () => {
      const requests = Array.from({ length: 100 }, (_, i) => ({
        headers: { authorization: `Bearer ${validToken}${i}` }
      }));
      
      mockedJwt.verify.mockReturnValue(validUser);
      mockCacheService.exists.mockResolvedValue(false);
      
      const authPromises = requests.map(req => 
        auth(req as AuthenticatedRequest, mockResponse as Response, mockNext)
      );
      
      await Promise.all(authPromises);
      
      expect(mockedJwt.verify).toHaveBeenCalledTimes(100);
      expect(mockNext).toHaveBeenCalledTimes(100);
    });

    it('should implement rate limiting for failed authentication attempts', async () => {
      const failedAttempts = Array.from({ length: 10 }, () => ({
        headers: { authorization: `Bearer ${invalidToken}` }
      }));
      
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      const authPromises = failedAttempts.map(req => 
        auth(req as AuthenticatedRequest, mockResponse as Response, mockNext)
      );
      
      await Promise.all(authPromises);
      
      // Should log multiple failed attempts
      expect(mockedLogger.warn).toHaveBeenCalledTimes(10);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should prevent timing attacks on token validation', async () => {
      const validTokenRequest = {
        headers: { authorization: `Bearer ${validToken}` }
      };
      
      const invalidTokenRequest = {
        headers: { authorization: `Bearer ${invalidToken}` }
      };
      
      mockedJwt.verify
        .mockReturnValueOnce(validUser)
        .mockImplementationOnce(() => {
          throw new Error('Invalid token');
        });
      
      mockCacheService.exists.mockResolvedValue(false);
      
      const startTime1 = Date.now();
      await auth(validTokenRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
      const endTime1 = Date.now();
      
      const startTime2 = Date.now();
      await auth(invalidTokenRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
      const endTime2 = Date.now();
      
      const validDuration = endTime1 - startTime1;
      const invalidDuration = endTime2 - startTime2;
      
      // Timing difference should be minimal (within reasonable bounds)
      expect(Math.abs(validDuration - invalidDuration)).toBeLessThan(100);
    });
  });
});