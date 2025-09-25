import { test, expect } from '@playwright/test';

test.describe('Calculator E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculator');
    await page.waitForLoadState('networkidle');
  });

  test('should display calculator interface', async ({ page }) => {
    // Check if main calculator components are visible
    await expect(page.locator('[data-testid="calculator"]')).toBeVisible();
    await expect(page.locator('[data-testid="investment-calculator"]')).toBeVisible();
    await expect(page.locator('[data-testid="profit-loss-calculator"]')).toBeVisible();
    await expect(page.locator('[data-testid="portfolio-calculator"]')).toBeVisible();
  });

  test('should calculate investment returns', async ({ page }) => {
    // Fill investment calculator form
    await page.fill('[data-testid="initial-investment"]', '10000');
    await page.fill('[data-testid="monthly-contribution"]', '500');
    await page.fill('[data-testid="annual-return"]', '8');
    await page.fill('[data-testid="investment-years"]', '10');
    
    // Click calculate button
    await page.click('[data-testid="calculate-investment"]');
    
    // Wait for results
    await page.waitForSelector('[data-testid="investment-results"]', { timeout: 5000 });
    
    // Check if results are displayed
    await expect(page.locator('[data-testid="final-amount"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-contributions"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-interest"]')).toBeVisible();
    
    // Verify results are not empty
    const finalAmount = await page.locator('[data-testid="final-amount"]').textContent();
    expect(finalAmount).toBeTruthy();
    expect(finalAmount).not.toBe('$0.00');
    
    // Check if final amount is greater than initial investment
    const finalValue = parseFloat(finalAmount?.replace(/[$,]/g, '') || '0');
    expect(finalValue).toBeGreaterThan(10000);
  });

  test('should calculate profit and loss', async ({ page }) => {
    // Fill profit/loss calculator form
    await page.fill('[data-testid="buy-price"]', '100');
    await page.fill('[data-testid="sell-price"]', '120');
    await page.fill('[data-testid="shares-quantity"]', '50');
    await page.fill('[data-testid="commission-fee"]', '10');
    
    // Click calculate button
    await page.click('[data-testid="calculate-profit-loss"]');
    
    // Wait for results
    await page.waitForSelector('[data-testid="profit-loss-results"]', { timeout: 5000 });
    
    // Check if results are displayed
    await expect(page.locator('[data-testid="gross-profit"]')).toBeVisible();
    await expect(page.locator('[data-testid="net-profit"]')).toBeVisible();
    await expect(page.locator('[data-testid="profit-percentage"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-cost"]')).toBeVisible();
    
    // Verify profit calculation
    const grossProfit = await page.locator('[data-testid="gross-profit"]').textContent();
    expect(grossProfit).toContain('$1,000.00'); // (120-100) * 50 = 1000
    
    const netProfit = await page.locator('[data-testid="net-profit"]').textContent();
    expect(netProfit).toContain('$990.00'); // 1000 - 10 = 990
  });

  test('should handle loss calculations', async ({ page }) => {
    // Fill form with loss scenario
    await page.fill('[data-testid="buy-price"]', '150');
    await page.fill('[data-testid="sell-price"]', '120');
    await page.fill('[data-testid="shares-quantity"]', '100');
    await page.fill('[data-testid="commission-fee"]', '15');
    
    // Calculate
    await page.click('[data-testid="calculate-profit-loss"]');
    
    // Wait for results
    await page.waitForSelector('[data-testid="profit-loss-results"]');
    
    // Check if loss is displayed correctly
    const grossLoss = await page.locator('[data-testid="gross-profit"]').textContent();
    expect(grossLoss).toContain('-$3,000.00'); // (120-150) * 100 = -3000
    
    const netLoss = await page.locator('[data-testid="net-profit"]').textContent();
    expect(netLoss).toContain('-$3,015.00'); // -3000 - 15 = -3015
    
    // Check if loss percentage is negative
    const lossPercentage = await page.locator('[data-testid="profit-percentage"]').textContent();
    expect(lossPercentage).toContain('-');
  });

  test('should calculate portfolio allocation', async ({ page }) => {
    // Add multiple stocks to portfolio calculator
    await page.click('[data-testid="add-stock-to-portfolio"]');
    
    // Fill first stock
    await page.fill('[data-testid="stock-symbol-0"]', 'AAPL');
    await page.fill('[data-testid="stock-shares-0"]', '100');
    await page.fill('[data-testid="stock-price-0"]', '150');
    
    // Add second stock
    await page.click('[data-testid="add-stock-to-portfolio"]');
    await page.fill('[data-testid="stock-symbol-1"]', 'MSFT');
    await page.fill('[data-testid="stock-shares-1"]', '50');
    await page.fill('[data-testid="stock-price-1"]', '300');
    
    // Calculate portfolio
    await page.click('[data-testid="calculate-portfolio"]');
    
    // Wait for results
    await page.waitForSelector('[data-testid="portfolio-results"]');
    
    // Check if portfolio summary is displayed
    await expect(page.locator('[data-testid="total-portfolio-value"]')).toBeVisible();
    await expect(page.locator('[data-testid="portfolio-allocation"]')).toBeVisible();
    
    // Verify total value calculation
    const totalValue = await page.locator('[data-testid="total-portfolio-value"]').textContent();
    expect(totalValue).toContain('$30,000.00'); // (100*150) + (50*300) = 30000
    
    // Check individual stock allocations
    const aaplAllocation = await page.locator('[data-testid="allocation-AAPL"]').textContent();
    expect(aaplAllocation).toContain('50%'); // 15000/30000 = 50%
    
    const msftAllocation = await page.locator('[data-testid="allocation-MSFT"]').textContent();
    expect(msftAllocation).toContain('50%'); // 15000/30000 = 50%
  });

  test('should validate input fields', async ({ page }) => {
    // Test negative values
    await page.fill('[data-testid="initial-investment"]', '-1000');
    await page.click('[data-testid="calculate-investment"]');
    
    // Check if validation error is shown
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('must be positive');
    
    // Test invalid characters
    await page.fill('[data-testid="initial-investment"]', 'abc');
    await page.click('[data-testid="calculate-investment"]');
    
    // Check if validation error is shown
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('must be a number');
    
    // Test empty required fields
    await page.fill('[data-testid="initial-investment"]', '');
    await page.click('[data-testid="calculate-investment"]');
    
    // Check if required field error is shown
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('required');
  });

  test('should clear calculator results', async ({ page }) => {
    // Perform a calculation
    await page.fill('[data-testid="initial-investment"]', '5000');
    await page.fill('[data-testid="annual-return"]', '7');
    await page.fill('[data-testid="investment-years"]', '5');
    await page.click('[data-testid="calculate-investment"]');
    
    // Wait for results
    await page.waitForSelector('[data-testid="investment-results"]');
    
    // Clear results
    await page.click('[data-testid="clear-results"]');
    
    // Check if results are cleared
    await expect(page.locator('[data-testid="investment-results"]')).not.toBeVisible();
    
    // Check if form is reset
    const initialInvestment = await page.locator('[data-testid="initial-investment"]').inputValue();
    expect(initialInvestment).toBe('');
  });

  test('should display calculation breakdown', async ({ page }) => {
    // Perform investment calculation
    await page.fill('[data-testid="initial-investment"]', '10000');
    await page.fill('[data-testid="monthly-contribution"]', '200');
    await page.fill('[data-testid="annual-return"]', '6');
    await page.fill('[data-testid="investment-years"]', '5');
    await page.click('[data-testid="calculate-investment"]');
    
    // Wait for results
    await page.waitForSelector('[data-testid="investment-results"]');
    
    // Check if breakdown is available
    const showBreakdown = page.locator('[data-testid="show-breakdown"]');
    if (await showBreakdown.isVisible()) {
      await showBreakdown.click();
      
      // Check if detailed breakdown is shown
      await expect(page.locator('[data-testid="calculation-breakdown"]')).toBeVisible();
      await expect(page.locator('[data-testid="year-by-year-breakdown"]')).toBeVisible();
    }
  });

  test('should handle compound interest calculations', async ({ page }) => {
    // Test compound interest with different compounding frequencies
    await page.fill('[data-testid="initial-investment"]', '1000');
    await page.fill('[data-testid="annual-return"]', '10');
    await page.fill('[data-testid="investment-years"]', '1');
    
    // Test annual compounding
    await page.selectOption('[data-testid="compounding-frequency"]', 'annually');
    await page.click('[data-testid="calculate-investment"]');
    
    await page.waitForSelector('[data-testid="investment-results"]');
    const annualResult = await page.locator('[data-testid="final-amount"]').textContent();
    
    // Test monthly compounding
    await page.selectOption('[data-testid="compounding-frequency"]', 'monthly');
    await page.click('[data-testid="calculate-investment"]');
    
    await page.waitForTimeout(1000);
    const monthlyResult = await page.locator('[data-testid="final-amount"]').textContent();
    
    // Monthly compounding should yield slightly higher results
    const annualValue = parseFloat(annualResult?.replace(/[$,]/g, '') || '0');
    const monthlyValue = parseFloat(monthlyResult?.replace(/[$,]/g, '') || '0');
    
    expect(monthlyValue).toBeGreaterThanOrEqual(annualValue);
  });

  test('should save and load calculation presets', async ({ page }) => {
    // Fill calculator with values
    await page.fill('[data-testid="initial-investment"]', '25000');
    await page.fill('[data-testid="monthly-contribution"]', '1000');
    await page.fill('[data-testid="annual-return"]', '8');
    await page.fill('[data-testid="investment-years"]', '20');
    
    // Save preset
    const savePreset = page.locator('[data-testid="save-preset"]');
    if (await savePreset.isVisible()) {
      await savePreset.click();
      await page.fill('[data-testid="preset-name"]', 'Retirement Plan');
      await page.click('[data-testid="confirm-save-preset"]');
      
      // Clear form
      await page.click('[data-testid="clear-results"]');
      
      // Load preset
      await page.click('[data-testid="load-preset"]');
      await page.click('[data-testid="preset-retirement-plan"]');
      
      // Verify values are loaded
      const initialInvestment = await page.locator('[data-testid="initial-investment"]').inputValue();
      expect(initialInvestment).toBe('25000');
    }
  });

  test('should handle responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if calculator is still functional
    await expect(page.locator('[data-testid="calculator"]')).toBeVisible();
    
    // Test calculation on mobile
    await page.fill('[data-testid="initial-investment"]', '1000');
    await page.fill('[data-testid="annual-return"]', '5');
    await page.fill('[data-testid="investment-years"]', '3');
    await page.click('[data-testid="calculate-investment"]');
    
    // Check if results are displayed properly
    await page.waitForSelector('[data-testid="investment-results"]');
    await expect(page.locator('[data-testid="final-amount"]')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify layout adapts properly
    await expect(page.locator('[data-testid="calculator"]')).toBeVisible();
  });

  test('should export calculation results', async ({ page }) => {
    // Perform calculation
    await page.fill('[data-testid="initial-investment"]', '15000');
    await page.fill('[data-testid="annual-return"]', '7');
    await page.fill('[data-testid="investment-years"]', '10');
    await page.click('[data-testid="calculate-investment"]');
    
    // Wait for results
    await page.waitForSelector('[data-testid="investment-results"]');
    
    // Check if export options are available
    const exportButton = page.locator('[data-testid="export-results"]');
    if (await exportButton.isVisible()) {
      // Test PDF export
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="export-pdf"]')
      ]);
      
      expect(download.suggestedFilename()).toContain('.pdf');
      
      // Test CSV export
      const [csvDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="export-csv"]')
      ]);
      
      expect(csvDownload.suggestedFilename()).toContain('.csv');
    }
  });
});