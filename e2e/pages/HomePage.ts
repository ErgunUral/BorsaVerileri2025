import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  // Header elements
  readonly logo: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly searchResults: Locator;
  readonly userMenu: Locator;
  readonly loginButton: Locator;
  readonly signupButton: Locator;
  readonly logoutButton: Locator;

  // Navigation elements
  readonly dashboardLink: Locator;
  readonly stocksLink: Locator;
  readonly portfolioLink: Locator;
  readonly watchlistLink: Locator;
  readonly newsLink: Locator;
  readonly calculatorLink: Locator;

  // Dashboard sections
  readonly marketOverview: Locator;
  readonly marketIndices: Locator;
  readonly topGainers: Locator;
  readonly topLosers: Locator;
  readonly watchlistSection: Locator;
  readonly newsSection: Locator;
  readonly alertsSection: Locator;

  // Market data elements
  readonly spIndex: Locator;
  readonly nasdaqIndex: Locator;
  readonly dowIndex: Locator;
  readonly marketSentiment: Locator;
  readonly marketVolume: Locator;
  readonly marketVolatility: Locator;

  // Real-time data elements
  readonly connectionStatus: Locator;
  readonly lastUpdateTime: Locator;
  readonly refreshButton: Locator;
  readonly connectionQuality: Locator;

  // Stock list elements
  readonly stockList: Locator;
  readonly stockItem: Locator;
  readonly stockSymbol: Locator;
  readonly stockName: Locator;
  readonly stockPrice: Locator;
  readonly stockChange: Locator;
  readonly stockChangePercent: Locator;

  // Watchlist elements
  readonly addToWatchlistButton: Locator;
  readonly removeFromWatchlistButton: Locator;
  readonly watchlistItems: Locator;
  readonly emptyWatchlistMessage: Locator;

  // News elements
  readonly newsItems: Locator;
  readonly newsTitle: Locator;
  readonly newsSource: Locator;
  readonly newsTime: Locator;
  readonly newsImpactFilter: Locator;

  // Alerts elements
  readonly alertItems: Locator;
  readonly alertMessage: Locator;
  readonly markAsReadButton: Locator;
  readonly emptyAlertsMessage: Locator;

  // Time period selector
  readonly timePeriodSelector: Locator;
  readonly oneDayButton: Locator;
  readonly oneWeekButton: Locator;
  readonly oneMonthButton: Locator;
  readonly threeMonthsButton: Locator;
  readonly oneYearButton: Locator;

  // Market hours indicator
  readonly marketHoursIndicator: Locator;
  readonly marketOpenStatus: Locator;
  readonly marketCloseTime: Locator;

  constructor(page: Page) {
    super(page);

    // Header elements
    this.logo = page.locator('[data-testid="logo"]');
    this.searchInput = page.locator('[data-testid="search-input"]');
    this.searchButton = page.locator('[data-testid="search-button"]');
    this.searchResults = page.locator('[data-testid="search-results"]');
    this.userMenu = page.locator('[data-testid="user-menu"]');
    this.loginButton = page.locator('[data-testid="login-button"]');
    this.signupButton = page.locator('[data-testid="signup-button"]');
    this.logoutButton = page.locator('[data-testid="logout-button"]');

    // Navigation elements
    this.dashboardLink = page.locator('[data-testid="nav-dashboard"]');
    this.stocksLink = page.locator('[data-testid="nav-stocks"]');
    this.portfolioLink = page.locator('[data-testid="nav-portfolio"]');
    this.watchlistLink = page.locator('[data-testid="nav-watchlist"]');
    this.newsLink = page.locator('[data-testid="nav-news"]');
    this.calculatorLink = page.locator('[data-testid="nav-calculator"]');

    // Dashboard sections
    this.marketOverview = page.locator('[data-testid="market-overview"]');
    this.marketIndices = page.locator('[data-testid="market-indices"]');
    this.topGainers = page.locator('[data-testid="top-gainers"]');
    this.topLosers = page.locator('[data-testid="top-losers"]');
    this.watchlistSection = page.locator('[data-testid="watchlist-section"]');
    this.newsSection = page.locator('[data-testid="news-section"]');
    this.alertsSection = page.locator('[data-testid="alerts-section"]');

    // Market data elements
    this.spIndex = page.locator('[data-testid="sp-index"]');
    this.nasdaqIndex = page.locator('[data-testid="nasdaq-index"]');
    this.dowIndex = page.locator('[data-testid="dow-index"]');
    this.marketSentiment = page.locator('[data-testid="market-sentiment"]');
    this.marketVolume = page.locator('[data-testid="market-volume"]');
    this.marketVolatility = page.locator('[data-testid="market-volatility"]');

    // Real-time data elements
    this.connectionStatus = page.locator('[data-testid="connection-status"]');
    this.lastUpdateTime = page.locator('[data-testid="last-update-time"]');
    this.refreshButton = page.locator('[data-testid="refresh-button"]');
    this.connectionQuality = page.locator('[data-testid="connection-quality"]');

    // Stock list elements
    this.stockList = page.locator('[data-testid="stock-list"]');
    this.stockItem = page.locator('[data-testid="stock-item"]');
    this.stockSymbol = page.locator('[data-testid="stock-symbol"]');
    this.stockName = page.locator('[data-testid="stock-name"]');
    this.stockPrice = page.locator('[data-testid="stock-price"]');
    this.stockChange = page.locator('[data-testid="stock-change"]');
    this.stockChangePercent = page.locator('[data-testid="stock-change-percent"]');

    // Watchlist elements
    this.addToWatchlistButton = page.locator('[data-testid="add-to-watchlist"]');
    this.removeFromWatchlistButton = page.locator('[data-testid="remove-from-watchlist"]');
    this.watchlistItems = page.locator('[data-testid="watchlist-items"]');
    this.emptyWatchlistMessage = page.locator('[data-testid="empty-watchlist"]');

    // News elements
    this.newsItems = page.locator('[data-testid="news-items"]');
    this.newsTitle = page.locator('[data-testid="news-title"]');
    this.newsSource = page.locator('[data-testid="news-source"]');
    this.newsTime = page.locator('[data-testid="news-time"]');
    this.newsImpactFilter = page.locator('[data-testid="news-impact-filter"]');

    // Alerts elements
    this.alertItems = page.locator('[data-testid="alert-items"]');
    this.alertMessage = page.locator('[data-testid="alert-message"]');
    this.markAsReadButton = page.locator('[data-testid="mark-as-read"]');
    this.emptyAlertsMessage = page.locator('[data-testid="empty-alerts"]');

    // Time period selector
    this.timePeriodSelector = page.locator('[data-testid="time-period-selector"]');
    this.oneDayButton = page.locator('[data-testid="period-1d"]');
    this.oneWeekButton = page.locator('[data-testid="period-1w"]');
    this.oneMonthButton = page.locator('[data-testid="period-1m"]');
    this.threeMonthsButton = page.locator('[data-testid="period-3m"]');
    this.oneYearButton = page.locator('[data-testid="period-1y"]');

    // Market hours indicator
    this.marketHoursIndicator = page.locator('[data-testid="market-hours"]');
    this.marketOpenStatus = page.locator('[data-testid="market-open-status"]');
    this.marketCloseTime = page.locator('[data-testid="market-close-time"]');
  }

  async searchStock(symbol: string) {
    await this.fillInput(this.searchInput, symbol);
    await this.clickElement(this.searchButton);
    await this.waitForElement(this.searchResults);
  }

  async selectSearchResult(symbol: string) {
    const result = this.page.locator(`[data-testid="search-result-${symbol}"]`);
    await this.clickElement(result);
  }

  async navigateToStockDetail(symbol: string) {
    await this.searchStock(symbol);
    await this.selectSearchResult(symbol);
    await this.waitForUrl(`/stocks/${symbol}`);
  }

  async addStockToWatchlist(symbol: string) {
    const stockItem = this.page.locator(`[data-testid="stock-item-${symbol}"]`);
    const addButton = stockItem.locator('[data-testid="add-to-watchlist"]');
    await this.clickElement(addButton);
  }

  async removeStockFromWatchlist(symbol: string) {
    const stockItem = this.page.locator(`[data-testid="stock-item-${symbol}"]`);
    const removeButton = stockItem.locator('[data-testid="remove-from-watchlist"]');
    await this.clickElement(removeButton);
  }

  async getStockPrice(symbol: string): Promise<string> {
    const stockItem = this.page.locator(`[data-testid="stock-item-${symbol}"]`);
    const priceElement = stockItem.locator('[data-testid="stock-price"]');
    return await this.getText(priceElement);
  }

  async getStockChange(symbol: string): Promise<string> {
    const stockItem = this.page.locator(`[data-testid="stock-item-${symbol}"]`);
    const changeElement = stockItem.locator('[data-testid="stock-change"]');
    return await this.getText(changeElement);
  }

  async getMarketIndexValue(index: string): Promise<string> {
    const indexElement = this.page.locator(`[data-testid="${index.toLowerCase()}-index"]`);
    return await this.getText(indexElement);
  }

  async refreshData() {
    await this.clickElement(this.refreshButton);
    await this.waitForElement(this.lastUpdateTime);
  }

  async selectTimePeriod(period: '1d' | '1w' | '1m' | '3m' | '1y') {
    const periodButton = this.page.locator(`[data-testid="period-${period}"]`);
    await this.clickElement(periodButton);
  }

  async filterNewsByImpact(impact: 'high' | 'medium' | 'low') {
    await this.selectOption(this.newsImpactFilter, impact);
  }

  async markAlertAsRead(alertId: string) {
    const alertItem = this.page.locator(`[data-testid="alert-${alertId}"]`);
    const markReadButton = alertItem.locator('[data-testid="mark-as-read"]');
    await this.clickElement(markReadButton);
  }

  async getConnectionStatus(): Promise<string> {
    return await this.getText(this.connectionStatus);
  }

  async getLastUpdateTime(): Promise<string> {
    return await this.getText(this.lastUpdateTime);
  }

  async getMarketSentiment(): Promise<string> {
    return await this.getText(this.marketSentiment);
  }

  async getMarketVolume(): Promise<string> {
    return await this.getText(this.marketVolume);
  }

  async getMarketVolatility(): Promise<string> {
    return await this.getText(this.marketVolatility);
  }

  async getWatchlistCount(): Promise<number> {
    const items = await this.watchlistItems.count();
    return items;
  }

  async getNewsCount(): Promise<number> {
    const items = await this.newsItems.count();
    return items;
  }

  async getAlertsCount(): Promise<number> {
    const items = await this.alertItems.count();
    return items;
  }

  async isMarketOpen(): Promise<boolean> {
    const status = await this.getText(this.marketOpenStatus);
    return status.toLowerCase().includes('open');
  }

  async getMarketCloseTime(): Promise<string> {
    return await this.getText(this.marketCloseTime);
  }

  async waitForRealTimeUpdate() {
    // Wait for WebSocket connection to be established
    await this.expectElementText(this.connectionStatus, /connected/i);
    
    // Wait for data to be updated
    await this.page.waitForFunction(() => {
      const updateTime = document.querySelector('[data-testid="last-update-time"]');
      return updateTime && updateTime.textContent !== 'Never';
    }, { timeout: 10000 });
  }

  async expectMarketDataVisible() {
    await this.expectElementVisible(this.marketOverview);
    await this.expectElementVisible(this.marketIndices);
    await this.expectElementVisible(this.spIndex);
    await this.expectElementVisible(this.nasdaqIndex);
    await this.expectElementVisible(this.dowIndex);
  }

  async expectStockListVisible() {
    await this.expectElementVisible(this.stockList);
    await this.expectElementVisible(this.topGainers);
    await this.expectElementVisible(this.topLosers);
  }

  async expectWatchlistVisible() {
    await this.expectElementVisible(this.watchlistSection);
  }

  async expectNewsVisible() {
    await this.expectElementVisible(this.newsSection);
  }

  async expectAlertsVisible() {
    await this.expectElementVisible(this.alertsSection);
  }

  async expectRealTimeDataWorking() {
    await this.expectElementVisible(this.connectionStatus);
    await this.expectElementText(this.connectionStatus, /connected/i);
    await this.expectElementVisible(this.lastUpdateTime);
  }

  async expectEmptyWatchlist() {
    await this.expectElementVisible(this.emptyWatchlistMessage);
  }

  async expectEmptyAlerts() {
    await this.expectElementVisible(this.emptyAlertsMessage);
  }

  async expectStockInWatchlist(symbol: string) {
    const stockItem = this.page.locator(`[data-testid="watchlist-item-${symbol}"]`);
    await this.expectElementVisible(stockItem);
  }

  async expectStockNotInWatchlist(symbol: string) {
    const stockItem = this.page.locator(`[data-testid="watchlist-item-${symbol}"]`);
    await this.expectElementHidden(stockItem);
  }

  async expectPositiveChange(symbol: string) {
    const stockItem = this.page.locator(`[data-testid="stock-item-${symbol}"]`);
    const changeElement = stockItem.locator('[data-testid="stock-change"]');
    await this.expectElementVisible(changeElement);
    
    const changeText = await this.getText(changeElement);
    expect(changeText).toMatch(/^\+/);
  }

  async expectNegativeChange(symbol: string) {
    const stockItem = this.page.locator(`[data-testid="stock-item-${symbol}"]`);
    const changeElement = stockItem.locator('[data-testid="stock-change"]');
    await this.expectElementVisible(changeElement);
    
    const changeText = await this.getText(changeElement);
    expect(changeText).toMatch(/^-/);
  }
}