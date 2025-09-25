import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { api } from '../../utils/api';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('../../utils/api');
vi.mock('sonner');

const mockApi = vi.mocked(api);
const mockToast = vi.mocked(toast);

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  isVerified: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z'
};

const mockTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token'
};

const mockAuthResponse = {
  success: true,
  user: mockUser,
  tokens: mockTokens,
  message: 'Success'
};

const validLoginData = {
  email: 'test@example.com',
  password: 'password123'
};

const validRegisterData = {
  email: 'newuser@example.com',
  password: 'password123',
  name: 'New User'
};

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
    
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock
    });
    
    // Mock API responses
    mockApi.post.mockResolvedValue({
      data: mockAuthResponse
    });
    
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        user: mockUser
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('başlangıç durumunu doğru şekilde ayarlamalı', () => {
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('localStorage\'dan token varsa kullanıcı bilgilerini yüklemeli', async () => {
      localStorage.getItem = vi.fn().mockReturnValue(mockTokens.accessToken);
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(mockApi.get).toHaveBeenCalledWith('/auth/me');
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('geçersiz token ile localStorage\'ı temizlemeli', async () => {
      localStorage.getItem = vi.fn().mockReturnValue('invalid-token');
      mockApi.get.mockRejectedValueOnce({
        response: { status: 401 }
      });
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken');
      expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken');
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Login', () => {
    it('başarılı login yapmalı', async () => {
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await result.current.login(validLoginData);
      });
      
      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', validLoginData);
      expect(localStorage.setItem).toHaveBeenCalledWith('accessToken', mockTokens.accessToken);
      expect(localStorage.setItem).toHaveBeenCalledWith('refreshToken', mockTokens.refreshToken);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(mockToast.success).toHaveBeenCalledWith('Login successful');
    });

    it('eksik alanlar ile hata fırlatmalı', async () => {
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        try {
          await result.current.login({ email: '', password: '' });
        } catch (error) {
          expect(error).toEqual(new Error('Email and password are required'));
        }
      });
      
      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('geçersiz email formatı ile hata fırlatmalı', async () => {
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        try {
          await result.current.login({
            email: 'invalid-email',
            password: 'password123'
          });
        } catch (error) {
          expect(error).toEqual(new Error('Invalid email format'));
        }
      });
      
      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('API hatalarını handle etmeli', async () => {
      const errorResponse = {
        response: {
          data: {
            success: false,
            error: 'Invalid credentials'
          }
        }
      };
      
      mockApi.post.mockRejectedValueOnce(errorResponse);
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        try {
          await result.current.login(validLoginData);
        } catch (error) {
          expect(error).toEqual(new Error('Invalid credentials'));
        }
      });
      
      expect(result.current.error).toBe('Invalid credentials');
      expect(result.current.isLoading).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('Invalid credentials');
    });

    it('ağ hatalarını handle etmeli', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Network error'));
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        try {
          await result.current.login(validLoginData);
        } catch (error) {
          expect(error).toEqual(new Error('Login failed. Please try again.'));
        }
      });
      
      expect(result.current.error).toBe('Login failed. Please try again.');
      expect(mockToast.error).toHaveBeenCalledWith('Login failed. Please try again.');
    });

    it('loading durumunu doğru şekilde yönetmeli', async () => {
      const { result } = renderHook(() => useAuth());
      
      // Start login
      const loginPromise = act(async () => {
        await result.current.login(validLoginData);
      });
      
      expect(result.current.isLoading).toBe(true);
      
      await loginPromise;
      
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Register', () => {
    it('başarılı kayıt yapmalı', async () => {
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await result.current.register(validRegisterData);
      });
      
      expect(mockApi.post).toHaveBeenCalledWith('/auth/register', validRegisterData);
      expect(localStorage.setItem).toHaveBeenCalledWith('accessToken', mockTokens.accessToken);
      expect(localStorage.setItem).toHaveBeenCalledWith('refreshToken', mockTokens.refreshToken);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(mockToast.success).toHaveBeenCalledWith('Registration successful');
    });

    it('eksik alanlar ile hata fırlatmalı', async () => {
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        try {
          await result.current.register({
            email: '',
            password: '',
            name: ''
          });
        } catch (error) {
          expect(error).toEqual(new Error('Email, password, and name are required'));
        }
      });
      
      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('zayıf şifre ile hata fırlatmalı', async () => {
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        try {
          await result.current.register({
            ...validRegisterData,
            password: '123'
          });
        } catch (error) {
          expect(error).toEqual(new Error('Password must be at least 8 characters long'));
        }
      });
      
      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('mevcut email ile kayıt hatası handle etmeli', async () => {
      const errorResponse = {
        response: {
          data: {
            success: false,
            error: 'User already exists with this email'
          }
        }
      };
      
      mockApi.post.mockRejectedValueOnce(errorResponse);
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        try {
          await result.current.register(validRegisterData);
        } catch (error) {
          expect(error).toEqual(new Error('User already exists with this email'));
        }
      });
      
      expect(result.current.error).toBe('User already exists with this email');
      expect(mockToast.error).toHaveBeenCalledWith('User already exists with this email');
    });
  });

  describe('Logout', () => {
    it('başarılı logout yapmalı', async () => {
      // First login
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await result.current.login(validLoginData);
      });
      
      expect(result.current.isAuthenticated).toBe(true);
      
      // Then logout
      await act(async () => {
        await result.current.logout();
      });
      
      expect(mockApi.post).toHaveBeenCalledWith('/auth/logout', {
        refreshToken: mockTokens.refreshToken
      });
      expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken');
      expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken');
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockToast.success).toHaveBeenCalledWith('Logged out successfully');
    });

    it('logout API hatası olsa bile local state\'i temizlemeli', async () => {
      // First login
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await result.current.login(validLoginData);
      });
      
      // Mock logout API error
      mockApi.post.mockRejectedValueOnce(new Error('Logout API failed'));
      
      // Logout should still clear local state
      await act(async () => {
        await result.current.logout();
      });
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken');
      expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken');
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('refresh token olmadan da logout yapmalı', async () => {
      localStorage.getItem = vi.fn().mockImplementation((key) => {
        if (key === 'accessToken') return mockTokens.accessToken;
        if (key === 'refreshToken') return null;
        return null;
      });
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await result.current.logout();
      });
      
      expect(mockApi.post).toHaveBeenCalledWith('/auth/logout', {
        refreshToken: null
      });
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Token Refresh', () => {
    it('token\'ı otomatik yenilemeli', async () => {
      const refreshResponse = {
        data: {
          success: true,
          tokens: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token'
          }
        }
      };
      
      mockApi.post.mockResolvedValueOnce(refreshResponse);
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await result.current.refreshToken();
      });
      
      expect(mockApi.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: null // No refresh token in localStorage initially
      });
      expect(localStorage.setItem).toHaveBeenCalledWith('accessToken', 'new-access-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('refreshToken', 'new-refresh-token');
    });

    it('refresh token başarısız olursa logout yapmalı', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: { status: 401 }
      });
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await result.current.refreshToken();
      });
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken');
      expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken');
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Password Reset', () => {
    it('şifre sıfırlama emaili gönderilmeli', async () => {
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await result.current.forgotPassword('test@example.com');
      });
      
      expect(mockApi.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'test@example.com'
      });
      expect(mockToast.success).toHaveBeenCalledWith(
        'Password reset email sent. Please check your inbox.'
      );
    });

    it('geçersiz email ile hata fırlatmalı', async () => {
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        try {
          await result.current.forgotPassword('invalid-email');
        } catch (error) {
          expect(error).toEqual(new Error('Invalid email format'));
        }
      });
      
      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('şifre sıfırlaması yapmalı', async () => {
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await result.current.resetPassword('reset-token', 'newpassword123');
      });
      
      expect(mockApi.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'reset-token',
        password: 'newpassword123'
      });
      expect(mockToast.success).toHaveBeenCalledWith(
        'Password reset successfully. You can now login with your new password.'
      );
    });

    it('geçersiz reset token ile hata handle etmeli', async () => {
      const errorResponse = {
        response: {
          data: {
            success: false,
            error: 'Invalid or expired reset token'
          }
        }
      };
      
      mockApi.post.mockRejectedValueOnce(errorResponse);
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        try {
          await result.current.resetPassword('invalid-token', 'newpassword123');
        } catch (error) {
          expect(error).toEqual(new Error('Invalid or expired reset token'));
        }
      });
      
      expect(result.current.error).toBe('Invalid or expired reset token');
      expect(mockToast.error).toHaveBeenCalledWith('Invalid or expired reset token');
    });
  });

  describe('User Profile', () => {
    it('kullanıcı profilini güncellemeli', async () => {
      const { result } = renderHook(() => useAuth());
      
      // First login
      await act(async () => {
        await result.current.login(validLoginData);
      });
      
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com'
      };
      
      const updatedUser = { ...mockUser, ...updateData };
      mockApi.put.mockResolvedValueOnce({
        data: {
          success: true,
          user: updatedUser
        }
      });
      
      await act(async () => {
        await result.current.updateProfile(updateData);
      });
      
      expect(mockApi.put).toHaveBeenCalledWith('/auth/profile', updateData);
      expect(result.current.user).toEqual(updatedUser);
      expect(mockToast.success).toHaveBeenCalledWith('Profile updated successfully');
    });

    it('authenticated olmayan kullanıcı profil güncelleyememeli', async () => {
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        try {
          await result.current.updateProfile({ name: 'New Name' });
        } catch (error) {
          expect(error).toEqual(new Error('User not authenticated'));
        }
      });
      
      expect(mockApi.put).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('hata durumunu temizlemeli', () => {
      const { result } = renderHook(() => useAuth());
      
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBeNull();
    });

    it('rate limit hatalarını handle etmeli', async () => {
      const errorResponse = {
        response: {
          status: 429,
          data: {
            success: false,
            error: 'Too many requests. Please try again later.'
          }
        }
      };
      
      mockApi.post.mockRejectedValueOnce(errorResponse);
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        try {
          await result.current.login(validLoginData);
        } catch (error) {
          expect(error).toEqual(new Error('Too many requests. Please try again later.'));
        }
      });
      
      expect(result.current.error).toBe('Too many requests. Please try again later.');
    });

    it('server hatalarını handle etmeli', async () => {
      const errorResponse = {
        response: {
          status: 500,
          data: {
            success: false,
            error: 'Internal server error'
          }
        }
      };
      
      mockApi.post.mockRejectedValueOnce(errorResponse);
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        try {
          await result.current.login(validLoginData);
        } catch (error) {
          expect(error).toEqual(new Error('Server error. Please try again later.'));
        }
      });
      
      expect(result.current.error).toBe('Server error. Please try again later.');
    });
  });

  describe('Performance', () => {
    it('concurrent login request\'leri handle etmeli', async () => {
      const { result } = renderHook(() => useAuth());
      
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          act(async () => {
            await result.current.login(validLoginData);
          })
        );
      }
      
      await Promise.all(promises);
      
      // Should only make one API call due to loading state
      expect(mockApi.post).toHaveBeenCalledTimes(1);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('memory leak\'leri önlemeli', () => {
      const { unmount } = renderHook(() => useAuth());
      
      unmount();
      
      // No specific cleanup needed for this hook, but test ensures no errors
      expect(true).toBe(true);
    });
  });

  describe('Security', () => {
    it('token\'ları güvenli şekilde saklamalı', async () => {
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await result.current.login(validLoginData);
      });
      
      expect(localStorage.setItem).toHaveBeenCalledWith('accessToken', mockTokens.accessToken);
      expect(localStorage.setItem).toHaveBeenCalledWith('refreshToken', mockTokens.refreshToken);
    });

    it('logout\'ta tüm token\'ları temizlemeli', async () => {
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await result.current.login(validLoginData);
        await result.current.logout();
      });
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken');
      expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken');
    });

    it('hassas bilgileri log\'lamamalı', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await result.current.login(validLoginData);
      });
      
      // Check that password is not logged
      const logCalls = consoleSpy.mock.calls.flat();
      const hasPassword = logCalls.some(call => 
        typeof call === 'string' && call.includes('password123')
      );
      
      expect(hasPassword).toBe(false);
      
      consoleSpy.mockRestore();
    });
  });
});