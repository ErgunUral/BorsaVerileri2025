import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class AuthPage extends BasePage {
  // Login form elements
  readonly loginForm: Locator;
  readonly loginEmailInput: Locator;
  readonly loginPasswordInput: Locator;
  readonly loginSubmitButton: Locator;
  readonly loginRememberCheckbox: Locator;
  readonly forgotPasswordLink: Locator;
  readonly signupLink: Locator;

  // Signup form elements
  readonly signupForm: Locator;
  readonly signupFirstNameInput: Locator;
  readonly signupLastNameInput: Locator;
  readonly signupEmailInput: Locator;
  readonly signupPasswordInput: Locator;
  readonly signupConfirmPasswordInput: Locator;
  readonly signupTermsCheckbox: Locator;
  readonly signupNewsletterCheckbox: Locator;
  readonly signupSubmitButton: Locator;
  readonly loginLink: Locator;

  // Forgot password form elements
  readonly forgotPasswordForm: Locator;
  readonly forgotPasswordEmailInput: Locator;
  readonly forgotPasswordSubmitButton: Locator;
  readonly backToLoginLink: Locator;

  // Reset password form elements
  readonly resetPasswordForm: Locator;
  readonly resetPasswordNewInput: Locator;
  readonly resetPasswordConfirmInput: Locator;
  readonly resetPasswordSubmitButton: Locator;

  // Email verification elements
  readonly verificationForm: Locator;
  readonly verificationCodeInput: Locator;
  readonly verificationSubmitButton: Locator;
  readonly resendCodeButton: Locator;
  readonly verificationMessage: Locator;

  // Two-factor authentication elements
  readonly twoFactorForm: Locator;
  readonly twoFactorCodeInput: Locator;
  readonly twoFactorSubmitButton: Locator;
  readonly twoFactorBackupCodeLink: Locator;
  readonly twoFactorRememberCheckbox: Locator;

  // Social login elements
  readonly googleLoginButton: Locator;
  readonly facebookLoginButton: Locator;
  readonly twitterLoginButton: Locator;
  readonly linkedinLoginButton: Locator;
  readonly appleLoginButton: Locator;

  // Error and success messages
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly warningMessage: Locator;
  readonly infoMessage: Locator;

  // Form validation messages
  readonly emailValidationError: Locator;
  readonly passwordValidationError: Locator;
  readonly confirmPasswordValidationError: Locator;
  readonly firstNameValidationError: Locator;
  readonly lastNameValidationError: Locator;
  readonly termsValidationError: Locator;

  // Loading states
  readonly loginLoadingSpinner: Locator;
  readonly signupLoadingSpinner: Locator;
  readonly forgotPasswordLoadingSpinner: Locator;
  readonly resetPasswordLoadingSpinner: Locator;
  readonly verificationLoadingSpinner: Locator;

  // Password strength indicator
  readonly passwordStrengthIndicator: Locator;
  readonly passwordStrengthWeak: Locator;
  readonly passwordStrengthMedium: Locator;
  readonly passwordStrengthStrong: Locator;
  readonly passwordRequirements: Locator;

  // Form toggles
  readonly showPasswordButton: Locator;
  readonly hidePasswordButton: Locator;
  readonly showConfirmPasswordButton: Locator;
  readonly hideConfirmPasswordButton: Locator;

  // Navigation elements
  readonly authHeader: Locator;
  readonly authTitle: Locator;
  readonly authSubtitle: Locator;
  readonly authLogo: Locator;

  // Footer elements
  readonly authFooter: Locator;
  readonly privacyPolicyLink: Locator;
  readonly termsOfServiceLink: Locator;
  readonly supportLink: Locator;

  // Rate limiting elements
  readonly rateLimitMessage: Locator;
  readonly rateLimitTimer: Locator;

  // Session elements
  readonly sessionExpiredMessage: Locator;
  readonly sessionRefreshButton: Locator;

  constructor(page: Page) {
    super(page);

    // Login form elements
    this.loginForm = page.locator('[data-testid="login-form"]');
    this.loginEmailInput = page.locator('[data-testid="login-email"]');
    this.loginPasswordInput = page.locator('[data-testid="login-password"]');
    this.loginSubmitButton = page.locator('[data-testid="login-submit"]');
    this.loginRememberCheckbox = page.locator('[data-testid="login-remember"]');
    this.forgotPasswordLink = page.locator('[data-testid="forgot-password-link"]');
    this.signupLink = page.locator('[data-testid="signup-link"]');

    // Signup form elements
    this.signupForm = page.locator('[data-testid="signup-form"]');
    this.signupFirstNameInput = page.locator('[data-testid="signup-firstname"]');
    this.signupLastNameInput = page.locator('[data-testid="signup-lastname"]');
    this.signupEmailInput = page.locator('[data-testid="signup-email"]');
    this.signupPasswordInput = page.locator('[data-testid="signup-password"]');
    this.signupConfirmPasswordInput = page.locator('[data-testid="signup-confirm-password"]');
    this.signupTermsCheckbox = page.locator('[data-testid="signup-terms"]');
    this.signupNewsletterCheckbox = page.locator('[data-testid="signup-newsletter"]');
    this.signupSubmitButton = page.locator('[data-testid="signup-submit"]');
    this.loginLink = page.locator('[data-testid="login-link"]');

    // Forgot password form elements
    this.forgotPasswordForm = page.locator('[data-testid="forgot-password-form"]');
    this.forgotPasswordEmailInput = page.locator('[data-testid="forgot-password-email"]');
    this.forgotPasswordSubmitButton = page.locator('[data-testid="forgot-password-submit"]');
    this.backToLoginLink = page.locator('[data-testid="back-to-login-link"]');

    // Reset password form elements
    this.resetPasswordForm = page.locator('[data-testid="reset-password-form"]');
    this.resetPasswordNewInput = page.locator('[data-testid="reset-password-new"]');
    this.resetPasswordConfirmInput = page.locator('[data-testid="reset-password-confirm"]');
    this.resetPasswordSubmitButton = page.locator('[data-testid="reset-password-submit"]');

    // Email verification elements
    this.verificationForm = page.locator('[data-testid="verification-form"]');
    this.verificationCodeInput = page.locator('[data-testid="verification-code"]');
    this.verificationSubmitButton = page.locator('[data-testid="verification-submit"]');
    this.resendCodeButton = page.locator('[data-testid="resend-code"]');
    this.verificationMessage = page.locator('[data-testid="verification-message"]');

    // Two-factor authentication elements
    this.twoFactorForm = page.locator('[data-testid="two-factor-form"]');
    this.twoFactorCodeInput = page.locator('[data-testid="two-factor-code"]');
    this.twoFactorSubmitButton = page.locator('[data-testid="two-factor-submit"]');
    this.twoFactorBackupCodeLink = page.locator('[data-testid="two-factor-backup"]');
    this.twoFactorRememberCheckbox = page.locator('[data-testid="two-factor-remember"]');

    // Social login elements
    this.googleLoginButton = page.locator('[data-testid="google-login"]');
    this.facebookLoginButton = page.locator('[data-testid="facebook-login"]');
    this.twitterLoginButton = page.locator('[data-testid="twitter-login"]');
    this.linkedinLoginButton = page.locator('[data-testid="linkedin-login"]');
    this.appleLoginButton = page.locator('[data-testid="apple-login"]');

    // Error and success messages
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.successMessage = page.locator('[data-testid="success-message"]');
    this.warningMessage = page.locator('[data-testid="warning-message"]');
    this.infoMessage = page.locator('[data-testid="info-message"]');

    // Form validation messages
    this.emailValidationError = page.locator('[data-testid="email-validation-error"]');
    this.passwordValidationError = page.locator('[data-testid="password-validation-error"]');
    this.confirmPasswordValidationError = page.locator('[data-testid="confirm-password-validation-error"]');
    this.firstNameValidationError = page.locator('[data-testid="firstname-validation-error"]');
    this.lastNameValidationError = page.locator('[data-testid="lastname-validation-error"]');
    this.termsValidationError = page.locator('[data-testid="terms-validation-error"]');

    // Loading states
    this.loginLoadingSpinner = page.locator('[data-testid="login-loading"]');
    this.signupLoadingSpinner = page.locator('[data-testid="signup-loading"]');
    this.forgotPasswordLoadingSpinner = page.locator('[data-testid="forgot-password-loading"]');
    this.resetPasswordLoadingSpinner = page.locator('[data-testid="reset-password-loading"]');
    this.verificationLoadingSpinner = page.locator('[data-testid="verification-loading"]');

    // Password strength indicator
    this.passwordStrengthIndicator = page.locator('[data-testid="password-strength"]');
    this.passwordStrengthWeak = page.locator('[data-testid="password-strength-weak"]');
    this.passwordStrengthMedium = page.locator('[data-testid="password-strength-medium"]');
    this.passwordStrengthStrong = page.locator('[data-testid="password-strength-strong"]');
    this.passwordRequirements = page.locator('[data-testid="password-requirements"]');

    // Form toggles
    this.showPasswordButton = page.locator('[data-testid="show-password"]');
    this.hidePasswordButton = page.locator('[data-testid="hide-password"]');
    this.showConfirmPasswordButton = page.locator('[data-testid="show-confirm-password"]');
    this.hideConfirmPasswordButton = page.locator('[data-testid="hide-confirm-password"]');

    // Navigation elements
    this.authHeader = page.locator('[data-testid="auth-header"]');
    this.authTitle = page.locator('[data-testid="auth-title"]');
    this.authSubtitle = page.locator('[data-testid="auth-subtitle"]');
    this.authLogo = page.locator('[data-testid="auth-logo"]');

    // Footer elements
    this.authFooter = page.locator('[data-testid="auth-footer"]');
    this.privacyPolicyLink = page.locator('[data-testid="privacy-policy-link"]');
    this.termsOfServiceLink = page.locator('[data-testid="terms-of-service-link"]');
    this.supportLink = page.locator('[data-testid="support-link"]');

    // Rate limiting elements
    this.rateLimitMessage = page.locator('[data-testid="rate-limit-message"]');
    this.rateLimitTimer = page.locator('[data-testid="rate-limit-timer"]');

    // Session elements
    this.sessionExpiredMessage = page.locator('[data-testid="session-expired"]');
    this.sessionRefreshButton = page.locator('[data-testid="session-refresh"]');
  }

  async navigateToLogin() {
    await this.navigateToUrl('/auth/login');
    await this.waitForElement(this.loginForm);
  }

  async navigateToSignup() {
    await this.navigateToUrl('/auth/signup');
    await this.waitForElement(this.signupForm);
  }

  async navigateToForgotPassword() {
    await this.navigateToUrl('/auth/forgot-password');
    await this.waitForElement(this.forgotPasswordForm);
  }

  async login(email: string, password: string, remember: boolean = false) {
    await this.fillInput(this.loginEmailInput, email);
    await this.fillInput(this.loginPasswordInput, password);
    
    if (remember) {
      await this.checkCheckbox(this.loginRememberCheckbox);
    }
    
    await this.clickElement(this.loginSubmitButton);
  }

  async signup(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    acceptTerms: boolean;
    subscribeNewsletter?: boolean;
  }) {
    await this.fillInput(this.signupFirstNameInput, userData.firstName);
    await this.fillInput(this.signupLastNameInput, userData.lastName);
    await this.fillInput(this.signupEmailInput, userData.email);
    await this.fillInput(this.signupPasswordInput, userData.password);
    await this.fillInput(this.signupConfirmPasswordInput, userData.confirmPassword);
    
    if (userData.acceptTerms) {
      await this.checkCheckbox(this.signupTermsCheckbox);
    }
    
    if (userData.subscribeNewsletter) {
      await this.checkCheckbox(this.signupNewsletterCheckbox);
    }
    
    await this.clickElement(this.signupSubmitButton);
  }

  async forgotPassword(email: string) {
    await this.fillInput(this.forgotPasswordEmailInput, email);
    await this.clickElement(this.forgotPasswordSubmitButton);
  }

  async resetPassword(newPassword: string, confirmPassword: string) {
    await this.fillInput(this.resetPasswordNewInput, newPassword);
    await this.fillInput(this.resetPasswordConfirmInput, confirmPassword);
    await this.clickElement(this.resetPasswordSubmitButton);
  }

  async verifyEmail(code: string) {
    await this.fillInput(this.verificationCodeInput, code);
    await this.clickElement(this.verificationSubmitButton);
  }

  async resendVerificationCode() {
    await this.clickElement(this.resendCodeButton);
  }

  async submitTwoFactorCode(code: string, remember: boolean = false) {
    await this.fillInput(this.twoFactorCodeInput, code);
    
    if (remember) {
      await this.checkCheckbox(this.twoFactorRememberCheckbox);
    }
    
    await this.clickElement(this.twoFactorSubmitButton);
  }

  async loginWithGoogle() {
    await this.clickElement(this.googleLoginButton);
  }

  async loginWithFacebook() {
    await this.clickElement(this.facebookLoginButton);
  }

  async loginWithTwitter() {
    await this.clickElement(this.twitterLoginButton);
  }

  async loginWithLinkedIn() {
    await this.clickElement(this.linkedinLoginButton);
  }

  async loginWithApple() {
    await this.clickElement(this.appleLoginButton);
  }

  async togglePasswordVisibility() {
    const isVisible = await this.showPasswordButton.isVisible();
    if (isVisible) {
      await this.clickElement(this.showPasswordButton);
    } else {
      await this.clickElement(this.hidePasswordButton);
    }
  }

  async toggleConfirmPasswordVisibility() {
    const isVisible = await this.showConfirmPasswordButton.isVisible();
    if (isVisible) {
      await this.clickElement(this.showConfirmPasswordButton);
    } else {
      await this.clickElement(this.hideConfirmPasswordButton);
    }
  }

  async switchToSignup() {
    await this.clickElement(this.signupLink);
    await this.waitForElement(this.signupForm);
  }

  async switchToLogin() {
    await this.clickElement(this.loginLink);
    await this.waitForElement(this.loginForm);
  }

  async switchToForgotPassword() {
    await this.clickElement(this.forgotPasswordLink);
    await this.waitForElement(this.forgotPasswordForm);
  }

  async backToLogin() {
    await this.clickElement(this.backToLoginLink);
    await this.waitForElement(this.loginForm);
  }

  async getErrorMessage(): Promise<string> {
    return await this.getText(this.errorMessage);
  }

  async getSuccessMessage(): Promise<string> {
    return await this.getText(this.successMessage);
  }

  async getWarningMessage(): Promise<string> {
    return await this.getText(this.warningMessage);
  }

  async getInfoMessage(): Promise<string> {
    return await this.getText(this.infoMessage);
  }

  async getEmailValidationError(): Promise<string> {
    return await this.getText(this.emailValidationError);
  }

  async getPasswordValidationError(): Promise<string> {
    return await this.getText(this.passwordValidationError);
  }

  async getPasswordStrength(): Promise<string> {
    if (await this.passwordStrengthWeak.isVisible()) return 'weak';
    if (await this.passwordStrengthMedium.isVisible()) return 'medium';
    if (await this.passwordStrengthStrong.isVisible()) return 'strong';
    return 'none';
  }

  async getRateLimitTimer(): Promise<string> {
    return await this.getText(this.rateLimitTimer);
  }

  async waitForLoginSuccess() {
    await this.waitForUrl('/dashboard');
  }

  async waitForSignupSuccess() {
    await this.waitForElement(this.verificationForm);
  }

  async waitForPasswordResetSuccess() {
    await this.waitForElement(this.successMessage);
  }

  async waitForVerificationSuccess() {
    await this.waitForUrl('/dashboard');
  }

  async waitForTwoFactorPrompt() {
    await this.waitForElement(this.twoFactorForm);
  }

  async waitForRateLimit() {
    await this.waitForElement(this.rateLimitMessage);
  }

  async expectLoginFormVisible() {
    await this.expectElementVisible(this.loginForm);
    await this.expectElementVisible(this.loginEmailInput);
    await this.expectElementVisible(this.loginPasswordInput);
    await this.expectElementVisible(this.loginSubmitButton);
  }

  async expectSignupFormVisible() {
    await this.expectElementVisible(this.signupForm);
    await this.expectElementVisible(this.signupFirstNameInput);
    await this.expectElementVisible(this.signupLastNameInput);
    await this.expectElementVisible(this.signupEmailInput);
    await this.expectElementVisible(this.signupPasswordInput);
    await this.expectElementVisible(this.signupConfirmPasswordInput);
    await this.expectElementVisible(this.signupSubmitButton);
  }

  async expectForgotPasswordFormVisible() {
    await this.expectElementVisible(this.forgotPasswordForm);
    await this.expectElementVisible(this.forgotPasswordEmailInput);
    await this.expectElementVisible(this.forgotPasswordSubmitButton);
  }

  async expectResetPasswordFormVisible() {
    await this.expectElementVisible(this.resetPasswordForm);
    await this.expectElementVisible(this.resetPasswordNewInput);
    await this.expectElementVisible(this.resetPasswordConfirmInput);
    await this.expectElementVisible(this.resetPasswordSubmitButton);
  }

  async expectVerificationFormVisible() {
    await this.expectElementVisible(this.verificationForm);
    await this.expectElementVisible(this.verificationCodeInput);
    await this.expectElementVisible(this.verificationSubmitButton);
    await this.expectElementVisible(this.resendCodeButton);
  }

  async expectTwoFactorFormVisible() {
    await this.expectElementVisible(this.twoFactorForm);
    await this.expectElementVisible(this.twoFactorCodeInput);
    await this.expectElementVisible(this.twoFactorSubmitButton);
  }

  async expectSocialLoginVisible() {
    await this.expectElementVisible(this.googleLoginButton);
    await this.expectElementVisible(this.facebookLoginButton);
  }

  async expectErrorMessage(message: string) {
    await this.expectElementVisible(this.errorMessage);
    await this.expectElementText(this.errorMessage, message);
  }

  async expectSuccessMessage(message: string) {
    await this.expectElementVisible(this.successMessage);
    await this.expectElementText(this.successMessage, message);
  }

  async expectEmailValidationError(message: string) {
    await this.expectElementVisible(this.emailValidationError);
    await this.expectElementText(this.emailValidationError, message);
  }

  async expectPasswordValidationError(message: string) {
    await this.expectElementVisible(this.passwordValidationError);
    await this.expectElementText(this.passwordValidationError, message);
  }

  async expectPasswordStrength(strength: 'weak' | 'medium' | 'strong') {
    const strengthElement = this.page.locator(`[data-testid="password-strength-${strength}"]`);
    await this.expectElementVisible(strengthElement);
  }

  async expectRateLimitMessage() {
    await this.expectElementVisible(this.rateLimitMessage);
    await this.expectElementVisible(this.rateLimitTimer);
  }

  async expectSessionExpired() {
    await this.expectElementVisible(this.sessionExpiredMessage);
    await this.expectElementVisible(this.sessionRefreshButton);
  }

  async expectLoadingState(form: 'login' | 'signup' | 'forgot-password' | 'reset-password' | 'verification') {
    const loadingSpinner = this.page.locator(`[data-testid="${form}-loading"]`);
    await this.expectElementVisible(loadingSpinner);
  }

  async expectFormDisabled(form: 'login' | 'signup' | 'forgot-password' | 'reset-password' | 'verification') {
    const formElement = this.page.locator(`[data-testid="${form}-form"]`);
    await this.expectElementDisabled(formElement);
  }

  async expectPasswordVisible() {
    await this.expectElementAttribute(this.loginPasswordInput, 'type', 'text');
  }

  async expectPasswordHidden() {
    await this.expectElementAttribute(this.loginPasswordInput, 'type', 'password');
  }
}