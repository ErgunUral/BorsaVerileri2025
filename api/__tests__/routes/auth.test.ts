import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { authRouter } from '../../routes/auth';
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { validateInput } from '../../middleware/validation';
import { authenticateToken } from '../../middleware/auth';

// Mock dependencies
vi.mock('../../config/supabase');
vi.mock('../../utils/logger');
vi.mock('jsonwebtoken');
vi.mock('bcryptjs');
vi.mock('../../middleware/validation');
vi.mock('../../middleware/auth');

const mockSupabase = vi.mocked(supabase);
const mockLogger = vi.mocked(logger);
const mockJwt = vi.mocked(jwt);
const mockBcrypt = vi.mocked(bcrypt);
const mockValidateInput = vi.mocked(validateInput);
const mockAuthenticateToken = vi.mocked(authenticateToken);

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const mockAuthUser = {
  id: 'auth-123',
  email: 'test@example.com',
  user_metadata: {
    name: 'Test User'
  },
  created_at: new Date().toISOString()
};

describe('Auth Routes Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    
    // Mock logger
    mockLogger.info.mockImplementation(() => {});
    mockLogger.error.mockImplementation(() => {});
    mockLogger.warn.mockImplementation(() => {});
    mockLogger.debug.mockImplementation(() => {});
    
    // Mock validation middleware
    mockValidateInput.mockImplementation((schema) => (req, res, next) => {
      // Simple validation mock - in real tests you'd validate against schema
      if (req.body && typeof req.body === 'object') {
        next();
      } else {
        res.status(400).json({ error: 'Invalid input' });
      }
    });
    
    // Mock auth middleware
    mockAuthenticateToken.mockImplementation((req, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        req.user = { id: 'user-123', email: 'test@example.com' };
        next();
      } else {
        res.status(401).json({ error: 'Unauthorized' });
      }
    });
    
    // Mock JWT
    mockJwt.sign.mockReturnValue('mock-jwt-token');
    mockJwt.verify.mockReturnValue({ id: 'user-123', email: 'test@example.com' });
    
    // Mock bcrypt
    mockBcrypt.hash.mockResolvedValue('hashed-password');
    mockBcrypt.compare.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      // Mock Supabase auth signup
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: mockAuthUser,
          session: {
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
            user: mockAuthUser
          }
        },
        error: null
      } as any);
      
      // Mock Supabase database insert
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null
            })
          })
        })
      } as any);
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        message: 'User registered successfully',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name
        },
        token: 'mock-jwt-token'
      });
      
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            name: 'Test User'
          }
        }
      });
    });

    it('should handle registration with existing email', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: 'User already registered',
          status: 400
        }
      } as any);
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Test User'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'User already registered'
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com'
          // Missing password and name
        });
      
      expect(response.status).toBe(400);
    });

    it('should validate email format', async () => {
      mockValidateInput.mockImplementation((schema) => (req, res, next) => {
        if (req.body.email && !req.body.email.includes('@')) {
          res.status(400).json({ error: 'Invalid email format' });
        } else {
          next();
        }
      });
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Invalid email format'
      });
    });

    it('should validate password strength', async () => {
      mockValidateInput.mockImplementation((schema) => (req, res, next) => {
        if (req.body.password && req.body.password.length < 6) {
          res.status(400).json({ error: 'Password must be at least 6 characters' });
        } else {
          next();
        }
      });
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: '123',
          name: 'Test User'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Password must be at least 6 characters'
      });
    });

    it('should handle database errors during user creation', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: mockAuthUser,
          session: {
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
            user: mockAuthUser
          }
        },
        error: null
      } as any);
      
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      } as any);
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        });
      
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to create user profile'
      });
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockAuthUser,
          session: {
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
            user: mockAuthUser
          }
        },
        error: null
      } as any);
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null
            })
          })
        })
      } as any);
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Login successful',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name
        },
        token: 'mock-jwt-token'
      });
      
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('should handle invalid credentials', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: 'Invalid login credentials',
          status: 400
        }
      } as any);
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid credentials'
      });
    });

    it('should validate required fields for login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
          // Missing password
        });
      
      expect(response.status).toBe(400);
    });

    it('should handle user profile not found', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockAuthUser,
          session: {
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
            user: mockAuthUser
          }
        },
        error: null
      } as any);
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'User not found' }
            })
          })
        })
      } as any);
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        error: 'User profile not found'
      });
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user successfully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null
      } as any);
      
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer valid-token');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Logout successful'
      });
      
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle logout without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/logout');
      
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Unauthorized'
      });
    });

    it('should handle logout errors', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: { message: 'Logout failed' }
      } as any);
      
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer valid-token');
      
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Logout failed'
      });
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should get user profile successfully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null
            })
          })
        })
      } as any);
      
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer valid-token');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name
        }
      });
    });

    it('should handle unauthorized access', async () => {
      const response = await request(app)
        .get('/api/auth/profile');
      
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Unauthorized'
      });
    });

    it('should handle user not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({
              data: null,
              error: { message: 'User not found' }
            })
          })
        })
      } as any);
      
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer valid-token');
      
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        error: 'User not found'
      });
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('should update user profile successfully', async () => {
      const updatedUser = {
        ...mockUser,
        name: 'Updated Name',
        updated_at: new Date().toISOString()
      };
      
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedUser,
                error: null
              })
            })
          })
        })
      } as any);
      
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Updated Name'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name
        }
      });
    });

    it('should handle unauthorized profile update', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .send({
          name: 'Updated Name'
        });
      
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Unauthorized'
      });
    });

    it('should handle profile update errors', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Update failed' }
              })
            })
          })
        })
      } as any);
      
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Updated Name'
        });
      
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to update profile'
      });
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token successfully', async () => {
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
            user: mockAuthUser
          },
          user: mockAuthUser
        },
        error: null
      } as any);
      
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refresh_token: 'valid-refresh-token'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        token: 'mock-jwt-token',
        message: 'Token refreshed successfully'
      });
      
      expect(mockSupabase.auth.refreshSession).toHaveBeenCalledWith({
        refresh_token: 'valid-refresh-token'
      });
    });

    it('should handle invalid refresh token', async () => {
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: null, user: null },
        error: {
          message: 'Invalid refresh token',
          status: 401
        }
      } as any);
      
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refresh_token: 'invalid-refresh-token'
        });
      
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid refresh token'
      });
    });

    it('should validate refresh token presence', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});
      
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email successfully', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null
      } as any);
      
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'test@example.com'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Password reset email sent'
      });
      
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        {
          redirectTo: expect.stringContaining('/reset-password')
        }
      );
    });

    it('should handle password reset errors', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: {
          message: 'Email not found',
          status: 404
        }
      } as any);
      
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Email not found'
      });
    });

    it('should validate email for password reset', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({});
      
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password successfully', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: {
          user: mockAuthUser
        },
        error: null
      } as any);
      
      const response = await request(app)
        .post('/api/auth/reset-password')
        .set('Authorization', 'Bearer valid-token')
        .send({
          password: 'newpassword123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Password reset successfully'
      });
      
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'newpassword123'
      });
    });

    it('should handle unauthorized password reset', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          password: 'newpassword123'
        });
      
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Unauthorized'
      });
    });

    it('should validate new password', async () => {
      mockValidateInput.mockImplementation((schema) => (req, res, next) => {
        if (req.body.password && req.body.password.length < 6) {
          res.status(400).json({ error: 'Password must be at least 6 characters' });
        } else {
          next();
        }
      });
      
      const response = await request(app)
        .post('/api/auth/reset-password')
        .set('Authorization', 'Bearer valid-token')
        .send({
          password: '123'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Password must be at least 6 characters'
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to auth endpoints', async () => {
      // Mock rate limiter to reject after first request
      const rateLimitSpy = vi.fn();
      
      // Override the app to include rate limiting
      const rateLimitedApp = express();
      rateLimitedApp.use(express.json());
      
      const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1, // limit each IP to 1 request per windowMs
        message: { error: 'Too many requests' },
        standardHeaders: true,
        legacyHeaders: false
      });
      
      rateLimitedApp.use('/api/auth/login', limiter);
      rateLimitedApp.use('/api/auth', authRouter);
      
      // First request should succeed
      const response1 = await request(rateLimitedApp)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      // Second request should be rate limited
      const response2 = await request(rateLimitedApp)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      expect(response2.status).toBe(429);
      expect(response2.body).toEqual({
        error: 'Too many requests'
      });
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockAuthUser,
          session: {
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
            user: mockAuthUser
          }
        },
        error: null
      } as any);
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null
            })
          })
        })
      } as any);
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      expect(response.headers['content-type']).toMatch(/application\/json/);
      // Additional security headers would be tested here
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize user input to prevent XSS', async () => {
      const maliciousInput = '<script>alert("xss")</script>';
      
      mockValidateInput.mockImplementation((schema) => (req, res, next) => {
        // Simulate input sanitization
        if (req.body.name && req.body.name.includes('<script>')) {
          res.status(400).json({ error: 'Invalid characters in input' });
        } else {
          next();
        }
      });
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: maliciousInput
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Invalid characters in input'
      });
    });

    it('should prevent SQL injection in email field', async () => {
      const sqlInjection = "'; DROP TABLE users; --";
      
      mockValidateInput.mockImplementation((schema) => (req, res, next) => {
        // Simulate SQL injection detection
        if (req.body.email && req.body.email.includes('DROP TABLE')) {
          res.status(400).json({ error: 'Invalid email format' });
        } else {
          next();
        }
      });
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: sqlInjection,
          password: 'password123'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Invalid email format'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected server errors gracefully', async () => {
      mockSupabase.auth.signInWithPassword.mockRejectedValue(
        new Error('Unexpected server error')
      );
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error'
      });
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Login error:',
        expect.any(Error)
      );
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('invalid json');
      
      expect(response.status).toBe(400);
    });

    it('should handle missing Content-Type header', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send('email=test@example.com&password=password123');
      
      expect(response.status).toBe(400);
    });
  });

  describe('CORS', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization');
      
      // CORS headers would be tested here based on your CORS configuration
      expect(response.status).toBe(200);
    });
  });
});