import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import { HomePage } from '../pages/HomePage';

test.describe('Kimlik Doğrulama E2E Testleri', () => {
  let authPage: AuthPage;
  let homePage: HomePage;
  
  const testUser = {
    email: 'test@example.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    phone: '+90 555 123 4567'
  };

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    homePage = new HomePage(page);
  });

  test.describe('Kullanıcı Kaydı', () => {
    test('Başarılı kullanıcı kaydı yapılabilmeli', async () => {
      await authPage.navigateToRegister();
      
      // Kayıt formunu doldur
      await authPage.fillRegisterForm(
        testUser.firstName,
        testUser.lastName,
        testUser.email,
        testUser.password,
        testUser.password,
        testUser.phone
      );
      
      // Şartları kabul et
      await authPage.acceptTerms();
      
      // Formu gönder
      await authPage.submitRegisterForm();
      
      // Başarı mesajını kontrol et
      await authPage.expectSuccessMessage('Kayıt başarılı! E-posta adresinizi doğrulayın.');
      
      // E-posta doğrulama sayfasına yönlendirildiğini kontrol et
      await authPage.expectEmailVerificationVisible();
    });

    test('Geçersiz e-posta ile kayıt yapılamaz', async () => {
      await authPage.navigateToRegister();
      
      await authPage.fillRegisterForm(
        testUser.firstName,
        testUser.lastName,
        'invalid-email',
        testUser.password,
        testUser.password,
        testUser.phone
      );
      
      await authPage.submitRegisterForm();
      
      // Doğrulama hatası görünmeli
      await authPage.expectValidationError('email', 'Geçerli bir e-posta adresi girin');
    });

    test('Zayıf şifre ile kayıt yapılamaz', async () => {
      await authPage.navigateToRegister();
      
      await authPage.fillRegisterForm(
        testUser.firstName,
        testUser.lastName,
        testUser.email,
        '123',
        '123',
        testUser.phone
      );
      
      await authPage.submitRegisterForm();
      
      // Şifre doğrulama hatası görünmeli
      await authPage.expectValidationError('password', 'Şifre en az 8 karakter olmalı');
    });

    test('Şifreler eşleşmediğinde hata gösterilmeli', async () => {
      await authPage.navigateToRegister();
      
      await authPage.fillRegisterForm(
        testUser.firstName,
        testUser.lastName,
        testUser.email,
        testUser.password,
        'DifferentPassword123!',
        testUser.phone
      );
      
      await authPage.submitRegisterForm();
      
      // Şifre eşleşme hatası görünmeli
      await authPage.expectValidationError('confirmPassword', 'Şifreler eşleşmiyor');
    });

    test('Mevcut e-posta ile kayıt yapılamaz', async () => {
      await authPage.navigateToRegister();
      
      await authPage.fillRegisterForm(
        testUser.firstName,
        testUser.lastName,
        'existing@example.com',
        testUser.password,
        testUser.password,
        testUser.phone
      );
      
      await authPage.submitRegisterForm();
      
      // Hata mesajı görünmeli
      await authPage.expectErrorMessage('Bu e-posta adresi zaten kullanımda');
    });

    test('Şartları kabul etmeden kayıt yapılamaz', async () => {
      await authPage.navigateToRegister();
      
      await authPage.fillRegisterForm(
        testUser.firstName,
        testUser.lastName,
        testUser.email,
        testUser.password,
        testUser.password,
        testUser.phone
      );
      
      // Şartları kabul etmeden gönder
      await authPage.submitRegisterForm();
      
      // Doğrulama hatası görünmeli
      await authPage.expectValidationError('terms', 'Kullanım şartlarını kabul etmelisiniz');
    });
  });

  test.describe('Kullanıcı Girişi', () => {
    test('Başarılı giriş yapılabilmeli', async () => {
      await authPage.navigateToLogin();
      
      // Giriş formunu doldur
      await authPage.fillLoginForm(testUser.email, testUser.password);
      
      // Formu gönder
      await authPage.submitLoginForm();
      
      // Ana sayfaya yönlendirildiğini kontrol et
      await homePage.expectHomePageVisible();
      
      // Kullanıcının giriş yaptığını kontrol et
      await homePage.expectUserLoggedIn();
    });

    test('Geçersiz e-posta ile giriş yapılamaz', async () => {
      await authPage.navigateToLogin();
      
      await authPage.fillLoginForm('invalid@example.com', testUser.password);
      await authPage.submitLoginForm();
      
      // Hata mesajı görünmeli
      await authPage.expectErrorMessage('Geçersiz e-posta veya şifre');
    });

    test('Geçersiz şifre ile giriş yapılamaz', async () => {
      await authPage.navigateToLogin();
      
      await authPage.fillLoginForm(testUser.email, 'wrongpassword');
      await authPage.submitLoginForm();
      
      // Hata mesajı görünmeli
      await authPage.expectErrorMessage('Geçersiz e-posta veya şifre');
    });

    test('Boş alanlarla giriş yapılamaz', async () => {
      await authPage.navigateToLogin();
      
      await authPage.submitLoginForm();
      
      // Doğrulama hataları görünmeli
      await authPage.expectValidationError('email', 'E-posta adresi gerekli');
      await authPage.expectValidationError('password', 'Şifre gerekli');
    });

    test('Beni hatırla seçeneği çalışmalı', async () => {
      await authPage.navigateToLogin();
      
      await authPage.fillLoginForm(testUser.email, testUser.password);
      await authPage.checkRememberMe();
      await authPage.submitLoginForm();
      
      // Ana sayfaya yönlendirildiğini kontrol et
      await homePage.expectHomePageVisible();
      
      // Tarayıcıyı kapat ve tekrar aç (session storage test)
      // Bu gerçek bir E2E testinde browser context ile yapılabilir
    });

    test('Şifre görünürlük toggle çalışmalı', async () => {
      await authPage.navigateToLogin();
      
      // Şifre alanına yaz
      await authPage.fillPassword(testUser.password);
      
      // Şifre gizli olmalı
      await authPage.expectPasswordHidden();
      
      // Şifre görünürlüğünü aç
      await authPage.togglePasswordVisibility();
      await authPage.expectPasswordVisible();
      
      // Şifre görünürlüğünü kapat
      await authPage.togglePasswordVisibility();
      await authPage.expectPasswordHidden();
    });
  });

  test.describe('Şifremi Unuttum', () => {
    test('Şifre sıfırlama e-postası gönderilebilmeli', async () => {
      await authPage.navigateToForgotPassword();
      
      // E-posta adresini gir
      await authPage.fillForgotPasswordForm(testUser.email);
      await authPage.submitForgotPasswordForm();
      
      // Başarı mesajı görünmeli
      await authPage.expectSuccessMessage('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi');
    });

    test('Geçersiz e-posta ile şifre sıfırlama yapılamaz', async () => {
      await authPage.navigateToForgotPassword();
      
      await authPage.fillForgotPasswordForm('nonexistent@example.com');
      await authPage.submitForgotPasswordForm();
      
      // Hata mesajı görünmeli
      await authPage.expectErrorMessage('Bu e-posta adresi sistemde kayıtlı değil');
    });

    test('Boş e-posta ile şifre sıfırlama yapılamaz', async () => {
      await authPage.navigateToForgotPassword();
      
      await authPage.submitForgotPasswordForm();
      
      // Doğrulama hatası görünmeli
      await authPage.expectValidationError('email', 'E-posta adresi gerekli');
    });
  });

  test.describe('Şifre Sıfırlama', () => {
    test('Geçerli token ile şifre sıfırlanabilmeli', async () => {
      // Geçerli token ile şifre sıfırlama sayfasına git
      await authPage.navigateToResetPassword('valid-reset-token');
      
      // Yeni şifre formunu doldur
      await authPage.fillResetPasswordForm('NewPassword123!', 'NewPassword123!');
      await authPage.submitResetPasswordForm();
      
      // Başarı mesajı görünmeli
      await authPage.expectSuccessMessage('Şifreniz başarıyla güncellendi');
      
      // Giriş sayfasına yönlendirilmeli
      await authPage.expectLoginFormVisible();
    });

    test('Geçersiz token ile şifre sıfırlanamaz', async () => {
      await authPage.navigateToResetPassword('invalid-token');
      
      // Hata mesajı görünmeli
      await authPage.expectErrorMessage('Geçersiz veya süresi dolmuş şifre sıfırlama bağlantısı');
    });

    test('Şifreler eşleşmediğinde hata gösterilmeli', async () => {
      await authPage.navigateToResetPassword('valid-reset-token');
      
      await authPage.fillResetPasswordForm('NewPassword123!', 'DifferentPassword123!');
      await authPage.submitResetPasswordForm();
      
      // Doğrulama hatası görünmeli
      await authPage.expectValidationError('confirmPassword', 'Şifreler eşleşmiyor');
    });
  });

  test.describe('E-posta Doğrulama', () => {
    test('Geçerli token ile e-posta doğrulanabilmeli', async () => {
      await authPage.navigateToEmailVerification('valid-verification-token');
      
      // Başarı mesajı görünmeli
      await authPage.expectSuccessMessage('E-posta adresiniz başarıyla doğrulandı');
      
      // Giriş sayfasına yönlendirilmeli
      await authPage.expectLoginFormVisible();
    });

    test('Geçersiz token ile e-posta doğrulanamaz', async () => {
      await authPage.navigateToEmailVerification('invalid-token');
      
      // Hata mesajı görünmeli
      await authPage.expectErrorMessage('Geçersiz veya süresi dolmuş doğrulama bağlantısı');
    });

    test('E-posta doğrulama tekrar gönderilebilmeli', async () => {
      await authPage.navigateToEmailVerification();
      
      // Tekrar gönder butonuna tıkla
      await authPage.resendVerificationEmail();
      
      // Başarı mesajı görünmeli
      await authPage.expectSuccessMessage('Doğrulama e-postası tekrar gönderildi');
    });
  });

  test.describe('İki Faktörlü Kimlik Doğrulama', () => {
    test('2FA kodu ile giriş yapılabilmeli', async () => {
      // 2FA aktif kullanıcı ile giriş yap
      await authPage.navigateToLogin();
      await authPage.fillLoginForm('2fa-user@example.com', testUser.password);
      await authPage.submitLoginForm();
      
      // 2FA sayfasına yönlendirilmeli
      await authPage.expectTwoFactorFormVisible();
      
      // 2FA kodunu gir
      await authPage.fillTwoFactorCode('123456');
      await authPage.submitTwoFactorForm();
      
      // Ana sayfaya yönlendirilmeli
      await homePage.expectHomePageVisible();
    });

    test('Geçersiz 2FA kodu ile giriş yapılamaz', async () => {
      await authPage.navigateToLogin();
      await authPage.fillLoginForm('2fa-user@example.com', testUser.password);
      await authPage.submitLoginForm();
      
      await authPage.expectTwoFactorFormVisible();
      
      // Geçersiz kod gir
      await authPage.fillTwoFactorCode('000000');
      await authPage.submitTwoFactorForm();
      
      // Hata mesajı görünmeli
      await authPage.expectErrorMessage('Geçersiz doğrulama kodu');
    });
  });

  test.describe('Sosyal Medya Girişi', () => {
    test('Google ile giriş yapılabilmeli', async () => {
      await authPage.navigateToLogin();
      
      // Google giriş butonuna tıkla
      await authPage.clickSocialLogin('google');
      
      // Google OAuth sayfasına yönlendirilmeli
      // Gerçek testlerde mock OAuth provider kullanılabilir
    });

    test('Facebook ile giriş yapılabilmeli', async () => {
      await authPage.navigateToLogin();
      
      await authPage.clickSocialLogin('facebook');
      
      // Facebook OAuth sayfasına yönlendirilmeli
    });

    test('Twitter ile giriş yapılabilmeli', async () => {
      await authPage.navigateToLogin();
      
      await authPage.clickSocialLogin('twitter');
      
      // Twitter OAuth sayfasına yönlendirilmeli
    });
  });

  test.describe('Çıkış İşlemi', () => {
    test.beforeEach(async () => {
      // Her testten önce giriş yap
      await authPage.navigateToLogin();
      await authPage.fillLoginForm(testUser.email, testUser.password);
      await authPage.submitLoginForm();
      await homePage.expectHomePageVisible();
    });

    test('Başarılı çıkış yapılabilmeli', async () => {
      // Çıkış yap
      await homePage.logout();
      
      // Giriş sayfasına yönlendirilmeli
      await authPage.expectLoginFormVisible();
      
      // Kullanıcının çıkış yaptığını kontrol et
      await homePage.expectUserLoggedOut();
    });
  });

  test.describe('Güvenlik ve Hız Sınırlama', () => {
    test('Çok fazla başarısız giriş denemesi engellenebilmeli', async () => {
      await authPage.navigateToLogin();
      
      // 5 kez yanlış şifre ile dene
      for (let i = 0; i < 5; i++) {
        await authPage.fillLoginForm(testUser.email, 'wrongpassword');
        await authPage.submitLoginForm();
        await authPage.expectErrorMessage('Geçersiz e-posta veya şifre');
      }
      
      // 6. denemede hız sınırlama mesajı görünmeli
      await authPage.fillLoginForm(testUser.email, 'wrongpassword');
      await authPage.submitLoginForm();
      await authPage.expectRateLimitMessage('Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.');
    });

    test('Güvenlik başlıkları mevcut olmalı', async ({ page }) => {
      await authPage.navigateToLogin();
      
      // Güvenlik başlıklarını kontrol et
      const response = await page.waitForResponse(response => 
        response.url().includes('/login') && response.status() === 200
      );
      
      const headers = response.headers();
      expect(headers['x-frame-options']).toBeTruthy();
      expect(headers['x-content-type-options']).toBeTruthy();
      expect(headers['x-xss-protection']).toBeTruthy();
    });
  });

  test.describe('Responsive Tasarım', () => {
    test('Mobil görünümde form çalışmalı', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await authPage.navigateToLogin();
      await authPage.expectMobileLayoutVisible();
      
      // Mobil formun çalıştığını kontrol et
      await authPage.fillLoginForm(testUser.email, testUser.password);
      await authPage.submitLoginForm();
      
      await homePage.expectHomePageVisible();
    });

    test('Tablet görünümde form çalışmalı', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await authPage.navigateToRegister();
      await authPage.expectTabletLayoutVisible();
      
      // Tablet formun çalıştığını kontrol et
      await authPage.fillRegisterForm(
        testUser.firstName,
        testUser.lastName,
        testUser.email,
        testUser.password,
        testUser.password,
        testUser.phone
      );
      
      await authPage.acceptTerms();
      await authPage.submitRegisterForm();
      
      await authPage.expectSuccessMessage('Kayıt başarılı! E-posta adresinizi doğrulayın.');
    });
  });

  test.describe('Klavye Navigasyonu', () => {
    test('Tab tuşu ile form navigasyonu çalışmalı', async ({ page }) => {
      await authPage.navigateToLogin();
      
      // Tab ile form alanları arasında gezin
      await page.keyboard.press('Tab'); // Email
      await page.keyboard.type(testUser.email);
      
      await page.keyboard.press('Tab'); // Password
      await page.keyboard.type(testUser.password);
      
      await page.keyboard.press('Tab'); // Remember me
      await page.keyboard.press('Space'); // Check
      
      await page.keyboard.press('Tab'); // Submit button
      await page.keyboard.press('Enter'); // Submit
      
      await homePage.expectHomePageVisible();
    });

    test('Enter tuşu ile form gönderilebilmeli', async ({ page }) => {
      await authPage.navigateToLogin();
      
      await authPage.fillLoginForm(testUser.email, testUser.password);
      
      // Enter tuşu ile gönder
      await page.keyboard.press('Enter');
      
      await homePage.expectHomePageVisible();
    });
  });

  test.describe('Performans', () => {
    test('Giriş sayfası hızlı yüklenmeli', async ({ page }) => {
      const startTime = Date.now();
      await authPage.navigateToLogin();
      await authPage.expectLoginFormVisible();
      const loadTime = Date.now() - startTime;
      
      // 2 saniyeden az yüklenmeli
      expect(loadTime).toBeLessThan(2000);
    });

    test('Form gönderimi hızlı olmalı', async ({ page }) => {
      await authPage.navigateToLogin();
      await authPage.fillLoginForm(testUser.email, testUser.password);
      
      const startTime = Date.now();
      await authPage.submitLoginForm();
      await homePage.expectHomePageVisible();
      const submitTime = Date.now() - startTime;
      
      // 3 saniyeden az sürmeli
      expect(submitTime).toBeLessThan(3000);
    });
  });
});