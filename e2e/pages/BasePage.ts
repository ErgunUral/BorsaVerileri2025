import { Page, Locator, expect } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  readonly header: Locator;
  readonly navigation: Locator;
  readonly footer: Locator;
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('header');
    this.navigation = page.locator('nav');
    this.footer = page.locator('footer');
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.successMessage = page.locator('[data-testid="success-message"]');
  }

  async goto(path: string = '/') {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    // Wait for the page to be fully loaded
    await this.page.waitForLoadState('networkidle');
    
    // Wait for loading spinner to disappear if present
    if (await this.loadingSpinner.isVisible()) {
      await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }
  }

  async waitForElement(locator: Locator, timeout: number = 5000) {
    await locator.waitFor({ state: 'visible', timeout });
  }

  async clickElement(locator: Locator) {
    await this.waitForElement(locator);
    await locator.click();
  }

  async fillInput(locator: Locator, value: string) {
    await this.waitForElement(locator);
    await locator.clear();
    await locator.fill(value);
  }

  async selectOption(locator: Locator, value: string) {
    await this.waitForElement(locator);
    await locator.selectOption(value);
  }

  async getText(locator: Locator): Promise<string> {
    await this.waitForElement(locator);
    return await locator.textContent() || '';
  }

  async isVisible(locator: Locator): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  async isHidden(locator: Locator): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'hidden', timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  async waitForUrl(url: string | RegExp, timeout: number = 5000) {
    await this.page.waitForURL(url, { timeout });
  }

  async waitForResponse(urlPattern: string | RegExp, timeout: number = 10000) {
    return await this.page.waitForResponse(urlPattern, { timeout });
  }

  async waitForRequest(urlPattern: string | RegExp, timeout: number = 10000) {
    return await this.page.waitForRequest(urlPattern, { timeout });
  }

  async scrollToElement(locator: Locator) {
    await locator.scrollIntoViewIfNeeded();
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}.png`,
      fullPage: true 
    });
  }

  async expectElementVisible(locator: Locator, message?: string) {
    await expect(locator, message).toBeVisible();
  }

  async expectElementHidden(locator: Locator, message?: string) {
    await expect(locator, message).toBeHidden();
  }

  async expectElementText(locator: Locator, text: string | RegExp, message?: string) {
    await expect(locator, message).toHaveText(text);
  }

  async expectElementContainsText(locator: Locator, text: string, message?: string) {
    await expect(locator, message).toContainText(text);
  }

  async expectElementValue(locator: Locator, value: string, message?: string) {
    await expect(locator, message).toHaveValue(value);
  }

  async expectElementCount(locator: Locator, count: number, message?: string) {
    await expect(locator, message).toHaveCount(count);
  }

  async expectUrl(url: string | RegExp, message?: string) {
    await expect(this.page, message).toHaveURL(url);
  }

  async expectTitle(title: string | RegExp, message?: string) {
    await expect(this.page, message).toHaveTitle(title);
  }

  async expectErrorMessage(message: string) {
    await this.expectElementVisible(this.errorMessage);
    await this.expectElementContainsText(this.errorMessage, message);
  }

  async expectSuccessMessage(message: string) {
    await this.expectElementVisible(this.successMessage);
    await this.expectElementContainsText(this.successMessage, message);
  }

  async expectNoErrorMessage() {
    await this.expectElementHidden(this.errorMessage);
  }

  async expectPageLoaded() {
    await this.page.waitForLoadState('networkidle');
    await this.expectElementHidden(this.loadingSpinner);
  }

  async pressKey(key: string) {
    await this.page.keyboard.press(key);
  }

  async pressKeys(keys: string[]) {
    for (const key of keys) {
      await this.page.keyboard.press(key);
    }
  }

  async hover(locator: Locator) {
    await this.waitForElement(locator);
    await locator.hover();
  }

  async doubleClick(locator: Locator) {
    await this.waitForElement(locator);
    await locator.dblclick();
  }

  async rightClick(locator: Locator) {
    await this.waitForElement(locator);
    await locator.click({ button: 'right' });
  }

  async dragAndDrop(source: Locator, target: Locator) {
    await this.waitForElement(source);
    await this.waitForElement(target);
    await source.dragTo(target);
  }

  async uploadFile(locator: Locator, filePath: string) {
    await this.waitForElement(locator);
    await locator.setInputFiles(filePath);
  }

  async downloadFile(locator: Locator): Promise<string> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.clickElement(locator);
    const download = await downloadPromise;
    const path = `test-results/downloads/${download.suggestedFilename()}`;
    await download.saveAs(path);
    return path;
  }

  async getLocalStorage(key: string): Promise<string | null> {
    return await this.page.evaluate((key) => localStorage.getItem(key), key);
  }

  async setLocalStorage(key: string, value: string) {
    await this.page.evaluate(
      ({ key, value }) => localStorage.setItem(key, value),
      { key, value }
    );
  }

  async clearLocalStorage() {
    await this.page.evaluate(() => localStorage.clear());
  }

  async getSessionStorage(key: string): Promise<string | null> {
    return await this.page.evaluate((key) => sessionStorage.getItem(key), key);
  }

  async setSessionStorage(key: string, value: string) {
    await this.page.evaluate(
      ({ key, value }) => sessionStorage.setItem(key, value),
      { key, value }
    );
  }

  async clearSessionStorage() {
    await this.page.evaluate(() => sessionStorage.clear());
  }

  async getCookies() {
    return await this.page.context().cookies();
  }

  async setCookie(name: string, value: string, options?: any) {
    await this.page.context().addCookies([{
      name,
      value,
      url: this.page.url(),
      ...options
    }]);
  }

  async clearCookies() {
    await this.page.context().clearCookies();
  }

  async reload() {
    await this.page.reload();
    await this.waitForPageLoad();
  }

  async goBack() {
    await this.page.goBack();
    await this.waitForPageLoad();
  }

  async goForward() {
    await this.page.goForward();
    await this.waitForPageLoad();
  }

  async getViewportSize() {
    return this.page.viewportSize();
  }

  async setViewportSize(width: number, height: number) {
    await this.page.setViewportSize({ width, height });
  }

  async emulateDevice(device: string) {
    // This would require importing devices from @playwright/test
    // await this.page.emulate(devices[device]);
  }

  async mockApiResponse(url: string | RegExp, response: any) {
    await this.page.route(url, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  async mockApiError(url: string | RegExp, status: number = 500, message: string = 'Internal Server Error') {
    await this.page.route(url, async (route) => {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ error: message })
      });
    });
  }

  async interceptRequest(url: string | RegExp, callback: (route: any) => void) {
    await this.page.route(url, callback);
  }

  async unrouteAll() {
    await this.page.unrouteAll();
  }
}