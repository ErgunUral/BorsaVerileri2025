import { test, expect } from '@playwright/test';
import { CalculatorPage } from '../pages/CalculatorPage';
import { HomePage } from '../pages/HomePage';

test.describe('Hesap Makinesi E2E Testleri', () => {
  let calculatorPage: CalculatorPage;
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    calculatorPage = new CalculatorPage(page);
    homePage = new HomePage(page);
    
    // Ana sayfadan hesap makinesi sayfasına git
    await homePage.navigateToHome();
    await homePage.navigateToCalculator();
    await calculatorPage.expectCalculatorPageVisible();
  });

  test.describe('Kar/Zarar Hesaplayıcısı', () => {
    test.beforeEach(async () => {
      await calculatorPage.selectCalculatorType('profit-loss');
    });

    test('Kar hesaplaması doğru yapılmalı', async () => {
      // Long pozisyon kar hesabı
      await calculatorPage.fillProfitLossForm({
        position: 'long',
        entryPrice: 100,
        exitPrice: 110,
        quantity: 100,
        commission: 5
      });
      
      await calculatorPage.calculateProfitLoss();
      
      // Kar: (110 - 100) * 100 - 5 = 995
      await calculatorPage.expectProfitLossResult({
        profit: 995,
        profitPercentage: 9.95,
        totalCost: 10005,
        totalRevenue: 11000
      });
    });

    test('Zarar hesaplaması doğru yapılmalı', async () => {
      // Long pozisyon zarar hesabı
      await calculatorPage.fillProfitLossForm({
        position: 'long',
        entryPrice: 100,
        exitPrice: 90,
        quantity: 100,
        commission: 5
      });
      
      await calculatorPage.calculateProfitLoss();
      
      // Zarar: (90 - 100) * 100 - 5 = -1005
      await calculatorPage.expectProfitLossResult({
        profit: -1005,
        profitPercentage: -10.05,
        totalCost: 10005,
        totalRevenue: 9000
      });
    });

    test('Short pozisyon hesaplaması doğru yapılmalı', async () => {
      // Short pozisyon kar hesabı
      await calculatorPage.fillProfitLossForm({
        position: 'short',
        entryPrice: 100,
        exitPrice: 90,
        quantity: 100,
        commission: 5
      });
      
      await calculatorPage.calculateProfitLoss();
      
      // Kar: (100 - 90) * 100 - 5 = 995
      await calculatorPage.expectProfitLossResult({
        profit: 995,
        profitPercentage: 9.95,
        totalCost: 9005,
        totalRevenue: 10000
      });
    });

    test('Geçersiz değerlerle hata gösterilmeli', async () => {
      await calculatorPage.fillProfitLossForm({
        position: 'long',
        entryPrice: -100, // Negatif fiyat
        exitPrice: 110,
        quantity: 100,
        commission: 5
      });
      
      await calculatorPage.calculateProfitLoss();
      
      await calculatorPage.expectValidationError('entryPrice', 'Giriş fiyatı pozitif olmalıdır');
    });

    test('Boş alanlarla hesaplama yapılamaz', async () => {
      await calculatorPage.calculateProfitLoss();
      
      await calculatorPage.expectValidationError('entryPrice', 'Giriş fiyatı gerekli');
      await calculatorPage.expectValidationError('exitPrice', 'Çıkış fiyatı gerekli');
      await calculatorPage.expectValidationError('quantity', 'Miktar gerekli');
    });
  });

  test.describe('Pozisyon Büyüklüğü Hesaplayıcısı', () => {
    test.beforeEach(async () => {
      await calculatorPage.selectCalculatorType('position-size');
    });

    test('Pozisyon büyüklüğü doğru hesaplanmalı', async () => {
      await calculatorPage.fillPositionSizeForm({
        accountBalance: 10000,
        riskPercentage: 2,
        entryPrice: 100,
        stopLoss: 95
      });
      
      await calculatorPage.calculatePositionSize();
      
      // Risk miktarı: 10000 * 0.02 = 200
      // Risk per share: 100 - 95 = 5
      // Position size: 200 / 5 = 40 shares
      await calculatorPage.expectPositionSizeResult({
        positionSize: 40,
        riskAmount: 200,
        positionValue: 4000,
        riskPerShare: 5
      });
    });

    test('Maksimum risk yüzdesi kontrolü yapılmalı', async () => {
      await calculatorPage.fillPositionSizeForm({
        accountBalance: 10000,
        riskPercentage: 15, // %15 çok yüksek
        entryPrice: 100,
        stopLoss: 95
      });
      
      await calculatorPage.calculatePositionSize();
      
      await calculatorPage.expectValidationError('riskPercentage', 'Risk yüzdesi %10\'dan fazla olmamalıdır');
    });

    test('Stop loss giriş fiyatından yüksek olamaz (long pozisyon)', async () => {
      await calculatorPage.fillPositionSizeForm({
        accountBalance: 10000,
        riskPercentage: 2,
        entryPrice: 100,
        stopLoss: 105 // Stop loss giriş fiyatından yüksek
      });
      
      await calculatorPage.calculatePositionSize();
      
      await calculatorPage.expectValidationError('stopLoss', 'Stop loss giriş fiyatından düşük olmalıdır');
    });
  });

  test.describe('Risk/Ödül Hesaplayıcısı', () => {
    test.beforeEach(async () => {
      await calculatorPage.selectCalculatorType('risk-reward');
    });

    test('Risk/ödül oranı doğru hesaplanmalı', async () => {
      await calculatorPage.fillRiskRewardForm({
        entryPrice: 100,
        stopLoss: 95,
        takeProfit: 110
      });
      
      await calculatorPage.calculateRiskReward();
      
      // Risk: 100 - 95 = 5
      // Ödül: 110 - 100 = 10
      // Risk/Ödül oranı: 5:10 = 1:2
      await calculatorPage.expectRiskRewardResult({
        riskAmount: 5,
        rewardAmount: 10,
        riskRewardRatio: '1:2',
        breakEvenWinRate: 33.33
      });
    });

    test('Olumsuz risk/ödül oranı uyarısı gösterilmeli', async () => {
      await calculatorPage.fillRiskRewardForm({
        entryPrice: 100,
        stopLoss: 95,
        takeProfit: 103 // Düşük kar hedefi
      });
      
      await calculatorPage.calculateRiskReward();
      
      // Risk: 5, Ödül: 3, Oran: 1:0.6 (olumsuz)
      await calculatorPage.expectRiskRewardWarning('Risk/ödül oranı 1:1\'den düşük. Bu pozisyon önerilmez.');
    });
  });

  test.describe('Bileşik Faiz Hesaplayıcısı', () => {
    test.beforeEach(async () => {
      await calculatorPage.selectCalculatorType('compound-interest');
    });

    test('Bileşik faiz doğru hesaplanmalı', async () => {
      await calculatorPage.fillCompoundInterestForm({
        principal: 10000,
        annualRate: 8,
        compoundingFrequency: 'monthly',
        years: 5
      });
      
      await calculatorPage.calculateCompoundInterest();
      
      // Bileşik faiz formülü ile hesaplanan değer
      await calculatorPage.expectCompoundInterestResult({
        finalAmount: 14898.46,
        totalInterest: 4898.46,
        effectiveAnnualRate: 8.3
      });
    });

    test('Farklı bileşik faiz frekansları test edilmeli', async () => {
      const frequencies = ['daily', 'weekly', 'monthly', 'quarterly', 'annually'];
      
      for (const frequency of frequencies) {
        await calculatorPage.fillCompoundInterestForm({
          principal: 10000,
          annualRate: 8,
          compoundingFrequency: frequency,
          years: 1
        });
        
        await calculatorPage.calculateCompoundInterest();
        
        // Her frekans için farklı sonuç beklenir
        await calculatorPage.expectCompoundInterestCalculated();
      }
    });
  });

  test.describe('Temettü Hesaplayıcısı', () => {
    test.beforeEach(async () => {
      await calculatorPage.selectCalculatorType('dividend');
    });

    test('Temettü geliri doğru hesaplanmalı', async () => {
      await calculatorPage.fillDividendForm({
        shares: 100,
        dividendPerShare: 2.5,
        frequency: 'quarterly'
      });
      
      await calculatorPage.calculateDividend();
      
      // Çeyreklik temettü: 100 * 2.5 = 250
      // Yıllık temettü: 250 * 4 = 1000
      await calculatorPage.expectDividendResult({
        quarterlyDividend: 250,
        annualDividend: 1000,
        dividendYield: 0 // Hisse fiyatı verilmediği için
      });
    });

    test('Temettü verimi hesaplanmalı', async () => {
      await calculatorPage.fillDividendForm({
        shares: 100,
        dividendPerShare: 2.5,
        frequency: 'quarterly',
        sharePrice: 50
      });
      
      await calculatorPage.calculateDividend();
      
      // Yıllık temettü: 1000
      // Toplam yatırım: 100 * 50 = 5000
      // Temettü verimi: 1000 / 5000 = %20
      await calculatorPage.expectDividendResult({
        quarterlyDividend: 250,
        annualDividend: 1000,
        dividendYield: 20,
        totalInvestment: 5000
      });
    });
  });

  test.describe('Opsiyon Hesaplayıcısı', () => {
    test.beforeEach(async () => {
      await calculatorPage.selectCalculatorType('options');
    });

    test('Call opsiyonu kar/zarar hesaplanmalı', async () => {
      await calculatorPage.fillOptionsForm({
        optionType: 'call',
        strikePrice: 100,
        premium: 5,
        currentPrice: 110,
        contracts: 1
      });
      
      await calculatorPage.calculateOptions();
      
      // Call kar: (110 - 100 - 5) * 100 = 500
      await calculatorPage.expectOptionsResult({
        profitLoss: 500,
        breakEvenPrice: 105,
        maxProfit: 'Unlimited',
        maxLoss: 500
      });
    });

    test('Put opsiyonu kar/zarar hesaplanmalı', async () => {
      await calculatorPage.fillOptionsForm({
        optionType: 'put',
        strikePrice: 100,
        premium: 5,
        currentPrice: 90,
        contracts: 1
      });
      
      await calculatorPage.calculateOptions();
      
      // Put kar: (100 - 90 - 5) * 100 = 500
      await calculatorPage.expectOptionsResult({
        profitLoss: 500,
        breakEvenPrice: 95,
        maxProfit: 9500, // (100 - 5) * 100
        maxLoss: 500
      });
    });

    test('Opsiyon süresi dolumu etkisi hesaplanmalı', async () => {
      await calculatorPage.fillOptionsForm({
        optionType: 'call',
        strikePrice: 100,
        premium: 5,
        currentPrice: 102,
        contracts: 1,
        daysToExpiration: 30
      });
      
      await calculatorPage.calculateOptions();
      
      // Zaman değeri kaybı hesaplanmalı
      await calculatorPage.expectTimeDecayCalculated();
    });
  });

  test.describe('Marjin Hesaplayıcısı', () => {
    test.beforeEach(async () => {
      await calculatorPage.selectCalculatorType('margin');
    });

    test('Marjin gereksinimleri doğru hesaplanmalı', async () => {
      await calculatorPage.fillMarginForm({
        sharePrice: 100,
        shares: 100,
        marginRate: 50 // %50 marjin
      });
      
      await calculatorPage.calculateMargin();
      
      // Toplam değer: 100 * 100 = 10000
      // Marjin gereksinimi: 10000 * 0.5 = 5000
      // Borç miktarı: 10000 - 5000 = 5000
      await calculatorPage.expectMarginResult({
        totalValue: 10000,
        marginRequired: 5000,
        loanAmount: 5000,
        buyingPower: 10000
      });
    });

    test('Marjin çağrısı hesaplanmalı', async () => {
      await calculatorPage.fillMarginForm({
        sharePrice: 100,
        shares: 100,
        marginRate: 50,
        currentPrice: 80, // Fiyat düştü
        maintenanceMargin: 25
      });
      
      await calculatorPage.calculateMargin();
      
      // Mevcut değer: 80 * 100 = 8000
      // Borç: 5000
      // Equity: 8000 - 5000 = 3000
      // Maintenance requirement: 8000 * 0.25 = 2000
      // Marjin çağrısı yok (3000 > 2000)
      await calculatorPage.expectMarginCallStatus(false);
    });
  });

  test.describe('Vergi Hesaplayıcısı', () => {
    test.beforeEach(async () => {
      await calculatorPage.selectCalculatorType('tax');
    });

    test('Sermaye kazancı vergisi hesaplanmalı', async () => {
      await calculatorPage.fillTaxForm({
        purchasePrice: 10000,
        salePrice: 15000,
        holdingPeriod: 'long-term', // 1 yıldan fazla
        taxBracket: 22
      });
      
      await calculatorPage.calculateTax();
      
      // Sermaye kazancı: 15000 - 10000 = 5000
      // Uzun vadeli sermaye kazancı vergisi: %15 (genellikle)
      // Vergi: 5000 * 0.15 = 750
      await calculatorPage.expectTaxResult({
        capitalGain: 5000,
        taxOwed: 750,
        netProfit: 4250,
        effectiveTaxRate: 15
      });
    });

    test('Kısa vadeli sermaye kazancı vergisi hesaplanmalı', async () => {
      await calculatorPage.fillTaxForm({
        purchasePrice: 10000,
        salePrice: 15000,
        holdingPeriod: 'short-term', // 1 yıldan az
        taxBracket: 22
      });
      
      await calculatorPage.calculateTax();
      
      // Kısa vadeli sermaye kazancı normal gelir vergisi oranında
      // Vergi: 5000 * 0.22 = 1100
      await calculatorPage.expectTaxResult({
        capitalGain: 5000,
        taxOwed: 1100,
        netProfit: 3900,
        effectiveTaxRate: 22
      });
    });
  });

  test.describe('Genel İşlevler', () => {
    test('Hesaplama geçmişi kaydedilmeli', async () => {
      // Kar/zarar hesabı yap
      await calculatorPage.selectCalculatorType('profit-loss');
      await calculatorPage.fillProfitLossForm({
        position: 'long',
        entryPrice: 100,
        exitPrice: 110,
        quantity: 100,
        commission: 5
      });
      await calculatorPage.calculateProfitLoss();
      
      // Hesaplamayı kaydet
      await calculatorPage.saveCalculation('Test Kar Hesabı');
      
      // Geçmişi görüntüle
      await calculatorPage.viewHistory();
      await calculatorPage.expectHistoryItemVisible('Test Kar Hesabı');
    });

    test('Kaydedilen hesaplama yüklenebilmeli', async () => {
      await calculatorPage.viewHistory();
      await calculatorPage.loadCalculation('Test Kar Hesabı');
      
      // Değerlerin yüklendiğini kontrol et
      await calculatorPage.expectFormValues({
        entryPrice: 100,
        exitPrice: 110,
        quantity: 100,
        commission: 5
      });
    });

    test('Hesaplama sonuçları dışa aktarılabilmeli', async () => {
      await calculatorPage.selectCalculatorType('profit-loss');
      await calculatorPage.fillProfitLossForm({
        position: 'long',
        entryPrice: 100,
        exitPrice: 110,
        quantity: 100,
        commission: 5
      });
      await calculatorPage.calculateProfitLoss();
      
      // PDF olarak dışa aktar
      await calculatorPage.exportResults('pdf');
      await calculatorPage.expectExportSuccess();
      
      // Excel olarak dışa aktar
      await calculatorPage.exportResults('excel');
      await calculatorPage.expectExportSuccess();
    });

    test('Hesaplama sonuçları yazdırılabilmeli', async () => {
      await calculatorPage.selectCalculatorType('profit-loss');
      await calculatorPage.fillProfitLossForm({
        position: 'long',
        entryPrice: 100,
        exitPrice: 110,
        quantity: 100,
        commission: 5
      });
      await calculatorPage.calculateProfitLoss();
      
      // Yazdırma önizlemesini aç
      await calculatorPage.printResults();
      await calculatorPage.expectPrintPreviewVisible();
    });

    test('Form temizleme işlevi çalışmalı', async () => {
      await calculatorPage.selectCalculatorType('profit-loss');
      await calculatorPage.fillProfitLossForm({
        position: 'long',
        entryPrice: 100,
        exitPrice: 110,
        quantity: 100,
        commission: 5
      });
      
      // Formu temizle
      await calculatorPage.clearForm();
      
      // Tüm alanların boş olduğunu kontrol et
      await calculatorPage.expectFormCleared();
    });

    test('Form sıfırlama işlevi çalışmalı', async () => {
      await calculatorPage.selectCalculatorType('profit-loss');
      await calculatorPage.fillProfitLossForm({
        position: 'long',
        entryPrice: 100,
        exitPrice: 110,
        quantity: 100,
        commission: 5
      });
      
      // Formu sıfırla (varsayılan değerlere döndür)
      await calculatorPage.resetForm();
      
      // Varsayılan değerlerin yüklendiğini kontrol et
      await calculatorPage.expectFormReset();
    });

    test('Yardım modalı çalışmalı', async () => {
      await calculatorPage.selectCalculatorType('profit-loss');
      
      // Yardım modalını aç
      await calculatorPage.openHelpModal();
      await calculatorPage.expectHelpModalVisible();
      
      // Yardım içeriğinin görünür olduğunu kontrol et
      await calculatorPage.expectHelpContentVisible('profit-loss');
      
      // Modalı kapat
      await calculatorPage.closeHelpModal();
      await calculatorPage.expectHelpModalHidden();
    });

    test('Gelişmiş seçenekler çalışmalı', async () => {
      await calculatorPage.selectCalculatorType('profit-loss');
      
      // Gelişmiş seçenekleri aç
      await calculatorPage.toggleAdvancedOptions();
      await calculatorPage.expectAdvancedOptionsVisible();
      
      // Gelişmiş alanları doldur
      await calculatorPage.fillAdvancedOptions({
        slippage: 0.1,
        spreadCost: 0.05,
        borrowingCost: 2.5
      });
      
      // Hesaplamayı yap
      await calculatorPage.fillProfitLossForm({
        position: 'long',
        entryPrice: 100,
        exitPrice: 110,
        quantity: 100,
        commission: 5
      });
      await calculatorPage.calculateProfitLoss();
      
      // Gelişmiş maliyetlerin dahil edildiğini kontrol et
      await calculatorPage.expectAdvancedCostsIncluded();
    });
  });

  test.describe('Responsive Tasarım', () => {
    test('Mobil görünümde hesap makinesi çalışmalı', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await calculatorPage.selectCalculatorType('profit-loss');
      await calculatorPage.expectMobileLayoutVisible();
      
      // Mobil formun çalıştığını kontrol et
      await calculatorPage.fillProfitLossForm({
        position: 'long',
        entryPrice: 100,
        exitPrice: 110,
        quantity: 100,
        commission: 5
      });
      
      await calculatorPage.calculateProfitLoss();
      await calculatorPage.expectProfitLossCalculated();
    });

    test('Tablet görünümde hesap makinesi çalışmalı', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await calculatorPage.selectCalculatorType('position-size');
      await calculatorPage.expectTabletLayoutVisible();
      
      // Tablet formun çalıştığını kontrol et
      await calculatorPage.fillPositionSizeForm({
        accountBalance: 10000,
        riskPercentage: 2,
        entryPrice: 100,
        stopLoss: 95
      });
      
      await calculatorPage.calculatePositionSize();
      await calculatorPage.expectPositionSizeCalculated();
    });
  });

  test.describe('Performans', () => {
    test('Hesaplama sayfası hızlı yüklenmeli', async ({ page }) => {
      const startTime = Date.now();
      await calculatorPage.navigateToCalculator();
      await calculatorPage.expectCalculatorPageVisible();
      const loadTime = Date.now() - startTime;
      
      // 2 saniyeden az yüklenmeli
      expect(loadTime).toBeLessThan(2000);
    });

    test('Hesaplamalar hızlı yapılmalı', async ({ page }) => {
      await calculatorPage.selectCalculatorType('profit-loss');
      await calculatorPage.fillProfitLossForm({
        position: 'long',
        entryPrice: 100,
        exitPrice: 110,
        quantity: 100,
        commission: 5
      });
      
      const startTime = Date.now();
      await calculatorPage.calculateProfitLoss();
      await calculatorPage.expectProfitLossCalculated();
      const calculateTime = Date.now() - startTime;
      
      // 1 saniyeden az sürmeli
      expect(calculateTime).toBeLessThan(1000);
    });
  });

  test.describe('Klavye Navigasyonu', () => {
    test('Tab tuşu ile form navigasyonu çalışmalı', async ({ page }) => {
      await calculatorPage.selectCalculatorType('profit-loss');
      
      // Tab ile form alanları arasında gezin
      await page.keyboard.press('Tab'); // Position type
      await page.keyboard.press('ArrowDown'); // Select long
      
      await page.keyboard.press('Tab'); // Entry price
      await page.keyboard.type('100');
      
      await page.keyboard.press('Tab'); // Exit price
      await page.keyboard.type('110');
      
      await page.keyboard.press('Tab'); // Quantity
      await page.keyboard.type('100');
      
      await page.keyboard.press('Tab'); // Commission
      await page.keyboard.type('5');
      
      await page.keyboard.press('Tab'); // Calculate button
      await page.keyboard.press('Enter'); // Calculate
      
      await calculatorPage.expectProfitLossCalculated();
    });

    test('Enter tuşu ile hesaplama yapılabilmeli', async ({ page }) => {
      await calculatorPage.selectCalculatorType('profit-loss');
      await calculatorPage.fillProfitLossForm({
        position: 'long',
        entryPrice: 100,
        exitPrice: 110,
        quantity: 100,
        commission: 5
      });
      
      // Enter tuşu ile hesapla
      await page.keyboard.press('Enter');
      
      await calculatorPage.expectProfitLossCalculated();
    });
  });
});