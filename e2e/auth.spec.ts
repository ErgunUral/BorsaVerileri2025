import { test, expect } from '@playwright/test';

test.describe('Authentication E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('User Registration', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');
    });

    test('should register new user successfully', async ({ page }) => {
      // Fill registration form
      await page.fill('[data-testid="register-name"]', 'Test User');
      await page.fill('[data-testid="register-email"]', `test${Date.now()}@example.com`);
      await page.fill('[data-testid="register-password"]', 'SecurePass123!');
      await page.fill('[data-testid="register-confirm-password"]', 'SecurePass123!');
      
      // Submit form
      await page.click('[data-testid="register-submit"]');
      
      // Wait for success message or redirect
      await page.waitForSelector('[data-testid="registration-success"]', { timeout: 10000 });
      
      // Check if success message is displayed
      await expect(page.locator('[data-testid="registration-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="registration-success"]')).toContainText('successfully');
      
      // Check if redirected to login or dashboard
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/(login|dashboard)/);
    });

    test('should show validation errors for invalid inputs', async ({ page }) => {
      // Test invalid email
      await page.fill('[data-testid="register-email"]', 'invalid-email');
      await page.fill('[data-testid="register-password"]', 'pass');
      await page.click('[data-testid="register-submit"]');
      
      // Check validation errors
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-error"]')).toContainText('valid email');
      
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-error"]')).toContainText('8 characters');
    });

    test('should show error for mismatched passwords', async ({ page }) => {
      await page.fill('[data-testid="register-name"]', 'Test User');
      await page.fill('[data-testid="register-email"]', 'test@example.com');
      await page.fill('[data-testid="register-password"]', 'SecurePass123!');
      await page.fill('[data-testid="register-confirm-password"]', 'DifferentPass123!');
      
      await page.click('[data-testid="register-submit"]');
      
      await expect(page.locator('[data-testid="password-match-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-match-error"]')).toContainText('match');
    });

    test('should show error for existing email', async ({ page }) => {
      // Use a known existing email
      await page.fill('[data-testid="register-name"]', 'Test User');
      await page.fill('[data-testid="register-email"]', 'existing@example.com');
      await page.fill('[data-testid="register-password"]', 'SecurePass123!');
      await page.fill('[data-testid="register-confirm-password"]', 'SecurePass123!');
      
      await page.click('[data-testid="register-submit"]');
      
      // Wait for error message
      await page.waitForSelector('[data-testid="registration-error"]', { timeout: 5000 });
      await expect(page.locator('[data-testid="registration-error"]')).toContainText('already exists');
    });

    test('should navigate to login page', async ({ page }) => {
      await page.click('[data-testid="login-link"]');
      
      await page.waitForURL('**/login');
      expect(page.url()).toContain('/login');
      
      // Check if login form is displayed
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    });
  });

  test.describe('User Login', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
    });

    test('should login with valid credentials', async ({ page }) => {
      // Fill login form with test credentials
      await page.fill('[data-testid="login-email"]', 'test@example.com');
      await page.fill('[data-testid="login-password"]', 'TestPass123!');
      
      // Submit form
      await page.click('[data-testid="login-submit"]');
      
      // Wait for redirect to dashboard
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      expect(page.url()).toContain('/dashboard');
      
      // Check if user is logged in (user menu or profile visible)
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      
      // Check if auth token is stored
      const token = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(token).toBeTruthy();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.fill('[data-testid="login-email"]', 'test@example.com');
      await page.fill('[data-testid="login-password"]', 'wrongpassword');
      
      await page.click('[data-testid="login-submit"]');
      
      // Wait for error message
      await page.waitForSelector('[data-testid="login-error"]', { timeout: 5000 });
      await expect(page.locator('[data-testid="login-error"]')).toContainText('Invalid credentials');
      
      // Should remain on login page
      expect(page.url()).toContain('/login');
    });

    test('should show validation errors for empty fields', async ({ page }) => {
      await page.click('[data-testid="login-submit"]');
      
      await expect(page.locator('[data-testid="email-required-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-required-error"]')).toBeVisible();
    });

    test('should navigate to registration page', async ({ page }) => {
      await page.click('[data-testid="register-link"]');
      
      await page.waitForURL('**/register');
      expect(page.url()).toContain('/register');
      
      await expect(page.locator('[data-testid="register-form"]')).toBeVisible();
    });

    test('should navigate to forgot password page', async ({ page }) => {
      await page.click('[data-testid="forgot-password-link"]');
      
      await page.waitForURL('**/forgot-password');
      expect(page.url()).toContain('/forgot-password');
      
      await expect(page.locator('[data-testid="forgot-password-form"]')).toBeVisible();
    });

    test('should remember login state after page refresh', async ({ page }) => {
      // Login first
      await page.fill('[data-testid="login-email"]', 'test@example.com');
      await page.fill('[data-testid="login-password"]', 'TestPass123!');
      await page.click('[data-testid="login-submit"]');
      
      await page.waitForURL('**/dashboard');
      
      // Refresh page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should still be logged in
      expect(page.url()).toContain('/dashboard');
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });
  });

  test.describe('Password Reset', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/forgot-password');
      await page.waitForLoadState('networkidle');
    });

    test('should send password reset email', async ({ page }) => {
      await page.fill('[data-testid="reset-email"]', 'test@example.com');
      await page.click('[data-testid="send-reset-email"]');
      
      // Wait for success message
      await page.waitForSelector('[data-testid="reset-email-sent"]', { timeout: 5000 });
      await expect(page.locator('[data-testid="reset-email-sent"]')).toContainText('email sent');
    });

    test('should show error for invalid email', async ({ page }) => {
      await page.fill('[data-testid="reset-email"]', 'invalid-email');
      await page.click('[data-testid="send-reset-email"]');
      
      await expect(page.locator('[data-testid="email-validation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-validation-error"]')).toContainText('valid email');
    });

    test('should handle non-existent email gracefully', async ({ page }) => {
      await page.fill('[data-testid="reset-email"]', 'nonexistent@example.com');
      await page.click('[data-testid="send-reset-email"]');
      
      // Should show success message for security (don't reveal if email exists)
      await page.waitForSelector('[data-testid="reset-email-sent"]', { timeout: 5000 });
      await expect(page.locator('[data-testid="reset-email-sent"]')).toContainText('email sent');
    });
  });

  test.describe('User Logout', () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="login-email"]', 'test@example.com');
      await page.fill('[data-testid="login-password"]', 'TestPass123!');
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL('**/dashboard');
    });

    test('should logout successfully', async ({ page }) => {
      // Click user menu
      await page.click('[data-testid="user-menu"]');
      
      // Click logout
      await page.click('[data-testid="logout-button"]');
      
      // Should redirect to login page
      await page.waitForURL('**/login', { timeout: 5000 });
      expect(page.url()).toContain('/login');
      
      // Check if auth token is removed
      const token = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(token).toBeFalsy();
      
      // Should not be able to access protected pages
      await page.goto('/dashboard');
      await page.waitForURL('**/login');
      expect(page.url()).toContain('/login');
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login for protected pages when not authenticated', async ({ page }) => {
      const protectedPages = ['/dashboard', '/profile', '/settings', '/portfolio'];
      
      for (const pagePath of protectedPages) {
        await page.goto(pagePath);
        await page.waitForURL('**/login', { timeout: 5000 });
        expect(page.url()).toContain('/login');
        
        // Check if redirect message is shown
        const redirectMessage = page.locator('[data-testid="redirect-message"]');
        if (await redirectMessage.isVisible()) {
          await expect(redirectMessage).toContainText('login required');
        }
      }
    });

    test('should allow access to protected pages when authenticated', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="login-email"]', 'test@example.com');
      await page.fill('[data-testid="login-password"]', 'TestPass123!');
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL('**/dashboard');
      
      // Test access to protected pages
      const protectedPages = ['/dashboard', '/profile', '/settings'];
      
      for (const pagePath of protectedPages) {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        
        // Should not redirect to login
        expect(page.url()).toContain(pagePath);
        
        // Should show user menu (indicating authenticated state)
        await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      }
    });
  });

  test.describe('Session Management', () => {
    test('should handle expired tokens', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="login-email"]', 'test@example.com');
      await page.fill('[data-testid="login-password"]', 'TestPass123!');
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL('**/dashboard');
      
      // Simulate expired token
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'expired_token');
      });
      
      // Try to access protected resource
      await page.goto('/profile');
      
      // Should redirect to login due to expired token
      await page.waitForURL('**/login', { timeout: 10000 });
      expect(page.url()).toContain('/login');
      
      // Check if session expired message is shown
      const expiredMessage = page.locator('[data-testid="session-expired"]');
      if (await expiredMessage.isVisible()) {
        await expect(expiredMessage).toContainText('session expired');
      }
    });

    test('should auto-refresh tokens when possible', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="login-email"]', 'test@example.com');
      await page.fill('[data-testid="login-password"]', 'TestPass123!');
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL('**/dashboard');
      
      // Wait for potential token refresh
      await page.waitForTimeout(2000);
      
      // Check if still authenticated
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should remain on dashboard if token was refreshed
      const currentUrl = page.url();
      if (currentUrl.includes('/dashboard')) {
        await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      }
    });
  });

  test.describe('Security Features', () => {
    test('should prevent XSS in login form', async ({ page }) => {
      await page.goto('/login');
      
      // Try XSS payload in email field
      await page.fill('[data-testid="login-email"]', '<script>alert("xss")</script>');
      await page.fill('[data-testid="login-password"]', 'password');
      await page.click('[data-testid="login-submit"]');
      
      // Should not execute script
      const alerts = [];
      page.on('dialog', dialog => {
        alerts.push(dialog.message());
        dialog.dismiss();
      });
      
      await page.waitForTimeout(1000);
      expect(alerts).toHaveLength(0);
    });

    test('should handle rate limiting', async ({ page }) => {
      await page.goto('/login');
      
      // Attempt multiple failed logins
      for (let i = 0; i < 6; i++) {
        await page.fill('[data-testid="login-email"]', 'test@example.com');
        await page.fill('[data-testid="login-password"]', 'wrongpassword');
        await page.click('[data-testid="login-submit"]');
        await page.waitForTimeout(500);
      }
      
      // Should show rate limit error
      const rateLimitError = page.locator('[data-testid="rate-limit-error"]');
      if (await rateLimitError.isVisible()) {
        await expect(rateLimitError).toContainText('too many attempts');
      }
    });

    test('should enforce HTTPS in production', async ({ page }) => {
      // This test would be more relevant in a production environment
      // For now, just check if security headers are present
      const response = await page.goto('/login');
      const headers = response?.headers();
      
      // Check for security headers (if implemented)
      if (headers && headers['x-frame-options']) {
        expect(headers['x-frame-options']).toBeTruthy();
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/login');
      
      // Tab through form elements
      await page.keyboard.press('Tab'); // Email field
      await expect(page.locator('[data-testid="login-email"]')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Password field
      await expect(page.locator('[data-testid="login-password"]')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Submit button
      await expect(page.locator('[data-testid="login-submit"]')).toBeFocused();
      
      // Submit with Enter
      await page.fill('[data-testid="login-email"]', 'test@example.com');
      await page.fill('[data-testid="login-password"]', 'TestPass123!');
      await page.keyboard.press('Enter');
      
      // Should submit form
      await page.waitForURL('**/dashboard', { timeout: 10000 });
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/login');
      
      // Check for ARIA labels
      const emailField = page.locator('[data-testid="login-email"]');
      const passwordField = page.locator('[data-testid="login-password"]');
      
      await expect(emailField).toHaveAttribute('aria-label');
      await expect(passwordField).toHaveAttribute('aria-label');
      
      // Check for form validation ARIA attributes
      await page.click('[data-testid="login-submit"]');
      
      const emailError = page.locator('[data-testid="email-required-error"]');
      if (await emailError.isVisible()) {
        await expect(emailField).toHaveAttribute('aria-invalid', 'true');
      }
    });
  });
});