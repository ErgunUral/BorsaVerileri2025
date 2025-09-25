import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class StockDetailPage extends BasePage {
  // Header elements
  readonly stockSymbol: Locator;
  readonly stockName: Locator;
  readonly stockPrice: Locator;
  readonly stockChange: Locator;
  readonly stockChangePercent: Locator;
  readonly lastUpdateTime: Locator;
  readonly marketStatus: Locator;

  // Action buttons
  readonly addToWatchlistButton: Locator;
  readonly removeFromWatchlistButton: Locator;
  readonly shareButton: Locator;
  readonly alertButton: Locator;
  readonly buyButton: Locator;
  readonly sellButton: Locator;

  // Chart section
  readonly chartContainer: Locator;
  readonly chartCanvas: Locator;
  readonly chartLoading: Locator;
  readonly chartError: Locator;
  readonly chartTooltip: Locator;

  // Time period selector
  readonly timePeriodSelector: Locator;
  readonly oneDayButton: Locator;
  readonly oneWeekButton: Locator;
  readonly oneMonthButton: Locator;
  readonly threeMonthsButton: Locator;
  readonly sixMonthsButton: Locator;
  readonly oneYearButton: Locator;
  readonly fiveYearsButton: Locator;

  // Chart type selector
  readonly chartTypeSelector: Locator;
  readonly lineChartButton: Locator;
  readonly candlestickChartButton: Locator;
  readonly areaChartButton: Locator;
  readonly barChartButton: Locator;

  // Technical indicators
  readonly technicalIndicators: Locator;
  readonly movingAverageButton: Locator;
  readonly rsiButton: Locator;
  readonly macdButton: Locator;
  readonly bollingerBandsButton: Locator;
  readonly volumeButton: Locator;

  // Stock information tabs
  readonly tabContainer: Locator;
  readonly overviewTab: Locator;
  readonly financialsTab: Locator;
  readonly newsTab: Locator;
  readonly analysisTab: Locator;
  readonly optionsTab: Locator;

  // Overview tab content
  readonly keyMetrics: Locator;
  readonly marketCap: Locator;
  readonly peRatio: Locator;
  readonly eps: Locator;
  readonly dividend: Locator;
  readonly volume: Locator;
  readonly avgVolume: Locator;
  readonly dayRange: Locator;
  readonly weekRange52: Locator;
  readonly beta: Locator;

  // Company information
  readonly companyInfo: Locator;
  readonly companyDescription: Locator;
  readonly sector: Locator;
  readonly industry: Locator;
  readonly employees: Locator;
  readonly headquarters: Locator;
  readonly website: Locator;
  readonly ceo: Locator;

  // Financials tab content
  readonly financialStatements: Locator;
  readonly incomeStatement: Locator;
  readonly balanceSheet: Locator;
  readonly cashFlow: Locator;
  readonly revenue: Locator;
  readonly netIncome: Locator;
  readonly totalAssets: Locator;
  readonly totalDebt: Locator;
  readonly freeCashFlow: Locator;

  // News tab content
  readonly newsContainer: Locator;
  readonly newsItems: Locator;
  readonly newsTitle: Locator;
  readonly newsSource: Locator;
  readonly newsTime: Locator;
  readonly newsContent: Locator;
  readonly newsImpact: Locator;
  readonly newsFilter: Locator;
  readonly loadMoreNews: Locator;

  // Analysis tab content
  readonly analystRatings: Locator;
  readonly buyRating: Locator;
  readonly holdRating: Locator;
  readonly sellRating: Locator;
  readonly priceTarget: Locator;
  readonly consensusRating: Locator;
  readonly analystReports: Locator;

  // Options tab content
  readonly optionsChain: Locator;
  readonly callOptions: Locator;
  readonly putOptions: Locator;
  readonly optionStrike: Locator;
  readonly optionExpiry: Locator;
  readonly optionVolume: Locator;
  readonly optionOpenInterest: Locator;

  // Real-time data elements
  readonly connectionStatus: Locator;
  readonly realTimePrice: Locator;
  readonly realTimeChange: Locator;
  readonly realTimeVolume: Locator;
  readonly bidPrice: Locator;
  readonly askPrice: Locator;
  readonly bidSize: Locator;
  readonly askSize: Locator;
  readonly spread: Locator;

  // Alert modal
  readonly alertModal: Locator;
  readonly alertTypeSelector: Locator;
  readonly priceAlertInput: Locator;
  readonly percentageAlertInput: Locator;
  readonly volumeAlertInput: Locator;
  readonly alertConditionSelector: Locator;
  readonly alertFrequencySelector: Locator;
  readonly createAlertButton: Locator;
  readonly cancelAlertButton: Locator;

  // Share modal
  readonly shareModal: Locator;
  readonly shareUrl: Locator;
  readonly copyUrlButton: Locator;
  readonly shareTwitter: Locator;
  readonly shareLinkedIn: Locator;
  readonly shareEmail: Locator;

  // Error states
  readonly errorMessage: Locator;
  readonly retryButton: Locator;
  readonly noDataMessage: Locator;

  // Loading states
  readonly loadingSpinner: Locator;
  readonly chartLoadingSpinner: Locator;
  readonly dataLoadingSpinner: Locator;

  constructor(page: Page) {
    super(page);

    // Header elements
    this.stockSymbol = page.locator('[data-testid="stock-symbol"]');
    this.stockName = page.locator('[data-testid="stock-name"]');
    this.stockPrice = page.locator('[data-testid="stock-price"]');
    this.stockChange = page.locator('[data-testid="stock-change"]');
    this.stockChangePercent = page.locator('[data-testid="stock-change-percent"]');
    this.lastUpdateTime = page.locator('[data-testid="last-update-time"]');
    this.marketStatus = page.locator('[data-testid="market-status"]');

    // Action buttons
    this.addToWatchlistButton = page.locator('[data-testid="add-to-watchlist"]');
    this.removeFromWatchlistButton = page.locator('[data-testid="remove-from-watchlist"]');
    this.shareButton = page.locator('[data-testid="share-button"]');
    this.alertButton = page.locator('[data-testid="alert-button"]');
    this.buyButton = page.locator('[data-testid="buy-button"]');
    this.sellButton = page.locator('[data-testid="sell-button"]');

    // Chart section
    this.chartContainer = page.locator('[data-testid="chart-container"]');
    this.chartCanvas = page.locator('[data-testid="chart-canvas"]');
    this.chartLoading = page.locator('[data-testid="chart-loading"]');
    this.chartError = page.locator('[data-testid="chart-error"]');
    this.chartTooltip = page.locator('[data-testid="chart-tooltip"]');

    // Time period selector
    this.timePeriodSelector = page.locator('[data-testid="time-period-selector"]');
    this.oneDayButton = page.locator('[data-testid="period-1d"]');
    this.oneWeekButton = page.locator('[data-testid="period-1w"]');
    this.oneMonthButton = page.locator('[data-testid="period-1m"]');
    this.threeMonthsButton = page.locator('[data-testid="period-3m"]');
    this.sixMonthsButton = page.locator('[data-testid="period-6m"]');
    this.oneYearButton = page.locator('[data-testid="period-1y"]');
    this.fiveYearsButton = page.locator('[data-testid="period-5y"]');

    // Chart type selector
    this.chartTypeSelector = page.locator('[data-testid="chart-type-selector"]');
    this.lineChartButton = page.locator('[data-testid="chart-line"]');
    this.candlestickChartButton = page.locator('[data-testid="chart-candlestick"]');
    this.areaChartButton = page.locator('[data-testid="chart-area"]');
    this.barChartButton = page.locator('[data-testid="chart-bar"]');

    // Technical indicators
    this.technicalIndicators = page.locator('[data-testid="technical-indicators"]');
    this.movingAverageButton = page.locator('[data-testid="indicator-ma"]');
    this.rsiButton = page.locator('[data-testid="indicator-rsi"]');
    this.macdButton = page.locator('[data-testid="indicator-macd"]');
    this.bollingerBandsButton = page.locator('[data-testid="indicator-bb"]');
    this.volumeButton = page.locator('[data-testid="indicator-volume"]');

    // Stock information tabs
    this.tabContainer = page.locator('[data-testid="tab-container"]');
    this.overviewTab = page.locator('[data-testid="tab-overview"]');
    this.financialsTab = page.locator('[data-testid="tab-financials"]');
    this.newsTab = page.locator('[data-testid="tab-news"]');
    this.analysisTab = page.locator('[data-testid="tab-analysis"]');
    this.optionsTab = page.locator('[data-testid="tab-options"]');

    // Overview tab content
    this.keyMetrics = page.locator('[data-testid="key-metrics"]');
    this.marketCap = page.locator('[data-testid="market-cap"]');
    this.peRatio = page.locator('[data-testid="pe-ratio"]');
    this.eps = page.locator('[data-testid="eps"]');
    this.dividend = page.locator('[data-testid="dividend"]');
    this.volume = page.locator('[data-testid="volume"]');
    this.avgVolume = page.locator('[data-testid="avg-volume"]');
    this.dayRange = page.locator('[data-testid="day-range"]');
    this.weekRange52 = page.locator('[data-testid="52week-range"]');
    this.beta = page.locator('[data-testid="beta"]');

    // Company information
    this.companyInfo = page.locator('[data-testid="company-info"]');
    this.companyDescription = page.locator('[data-testid="company-description"]');
    this.sector = page.locator('[data-testid="sector"]');
    this.industry = page.locator('[data-testid="industry"]');
    this.employees = page.locator('[data-testid="employees"]');
    this.headquarters = page.locator('[data-testid="headquarters"]');
    this.website = page.locator('[data-testid="website"]');
    this.ceo = page.locator('[data-testid="ceo"]');

    // Financials tab content
    this.financialStatements = page.locator('[data-testid="financial-statements"]');
    this.incomeStatement = page.locator('[data-testid="income-statement"]');
    this.balanceSheet = page.locator('[data-testid="balance-sheet"]');
    this.cashFlow = page.locator('[data-testid="cash-flow"]');
    this.revenue = page.locator('[data-testid="revenue"]');
    this.netIncome = page.locator('[data-testid="net-income"]');
    this.totalAssets = page.locator('[data-testid="total-assets"]');
    this.totalDebt = page.locator('[data-testid="total-debt"]');
    this.freeCashFlow = page.locator('[data-testid="free-cash-flow"]');

    // News tab content
    this.newsContainer = page.locator('[data-testid="news-container"]');
    this.newsItems = page.locator('[data-testid="news-items"]');
    this.newsTitle = page.locator('[data-testid="news-title"]');
    this.newsSource = page.locator('[data-testid="news-source"]');
    this.newsTime = page.locator('[data-testid="news-time"]');
    this.newsContent = page.locator('[data-testid="news-content"]');
    this.newsImpact = page.locator('[data-testid="news-impact"]');
    this.newsFilter = page.locator('[data-testid="news-filter"]');
    this.loadMoreNews = page.locator('[data-testid="load-more-news"]');

    // Analysis tab content
    this.analystRatings = page.locator('[data-testid="analyst-ratings"]');
    this.buyRating = page.locator('[data-testid="buy-rating"]');
    this.holdRating = page.locator('[data-testid="hold-rating"]');
    this.sellRating = page.locator('[data-testid="sell-rating"]');
    this.priceTarget = page.locator('[data-testid="price-target"]');
    this.consensusRating = page.locator('[data-testid="consensus-rating"]');
    this.analystReports = page.locator('[data-testid="analyst-reports"]');

    // Options tab content
    this.optionsChain = page.locator('[data-testid="options-chain"]');
    this.callOptions = page.locator('[data-testid="call-options"]');
    this.putOptions = page.locator('[data-testid="put-options"]');
    this.optionStrike = page.locator('[data-testid="option-strike"]');
    this.optionExpiry = page.locator('[data-testid="option-expiry"]');
    this.optionVolume = page.locator('[data-testid="option-volume"]');
    this.optionOpenInterest = page.locator('[data-testid="option-open-interest"]');

    // Real-time data elements
    this.connectionStatus = page.locator('[data-testid="connection-status"]');
    this.realTimePrice = page.locator('[data-testid="real-time-price"]');
    this.realTimeChange = page.locator('[data-testid="real-time-change"]');
    this.realTimeVolume = page.locator('[data-testid="real-time-volume"]');
    this.bidPrice = page.locator('[data-testid="bid-price"]');
    this.askPrice = page.locator('[data-testid="ask-price"]');
    this.bidSize = page.locator('[data-testid="bid-size"]');
    this.askSize = page.locator('[data-testid="ask-size"]');
    this.spread = page.locator('[data-testid="spread"]');

    // Alert modal
    this.alertModal = page.locator('[data-testid="alert-modal"]');
    this.alertTypeSelector = page.locator('[data-testid="alert-type-selector"]');
    this.priceAlertInput = page.locator('[data-testid="price-alert-input"]');
    this.percentageAlertInput = page.locator('[data-testid="percentage-alert-input"]');
    this.volumeAlertInput = page.locator('[data-testid="volume-alert-input"]');
    this.alertConditionSelector = page.locator('[data-testid="alert-condition-selector"]');
    this.alertFrequencySelector = page.locator('[data-testid="alert-frequency-selector"]');
    this.createAlertButton = page.locator('[data-testid="create-alert-button"]');
    this.cancelAlertButton = page.locator('[data-testid="cancel-alert-button"]');

    // Share modal
    this.shareModal = page.locator('[data-testid="share-modal"]');
    this.shareUrl = page.locator('[data-testid="share-url"]');
    this.copyUrlButton = page.locator('[data-testid="copy-url-button"]');
    this.shareTwitter = page.locator('[data-testid="share-twitter"]');
    this.shareLinkedIn = page.locator('[data-testid="share-linkedin"]');
    this.shareEmail = page.locator('[data-testid="share-email"]');

    // Error states
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.retryButton = page.locator('[data-testid="retry-button"]');
    this.noDataMessage = page.locator('[data-testid="no-data-message"]');

    // Loading states
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    this.chartLoadingSpinner = page.locator('[data-testid="chart-loading-spinner"]');
    this.dataLoadingSpinner = page.locator('[data-testid="data-loading-spinner"]');
  }

  async navigateToStock(symbol: string) {
    await this.navigateToUrl(`/stocks/${symbol}`);
    await this.waitForElement(this.stockSymbol);
  }

  async addToWatchlist() {
    await this.clickElement(this.addToWatchlistButton);
    await this.waitForElement(this.removeFromWatchlistButton);
  }

  async removeFromWatchlist() {
    await this.clickElement(this.removeFromWatchlistButton);
    await this.waitForElement(this.addToWatchlistButton);
  }

  async selectTimePeriod(period: '1d' | '1w' | '1m' | '3m' | '6m' | '1y' | '5y') {
    const periodButton = this.page.locator(`[data-testid="period-${period}"]`);
    await this.clickElement(periodButton);
    await this.waitForChartUpdate();
  }

  async selectChartType(type: 'line' | 'candlestick' | 'area' | 'bar') {
    const chartButton = this.page.locator(`[data-testid="chart-${type}"]`);
    await this.clickElement(chartButton);
    await this.waitForChartUpdate();
  }

  async toggleTechnicalIndicator(indicator: 'ma' | 'rsi' | 'macd' | 'bb' | 'volume') {
    const indicatorButton = this.page.locator(`[data-testid="indicator-${indicator}"]`);
    await this.clickElement(indicatorButton);
    await this.waitForChartUpdate();
  }

  async switchToTab(tab: 'overview' | 'financials' | 'news' | 'analysis' | 'options') {
    const tabButton = this.page.locator(`[data-testid="tab-${tab}"]`);
    await this.clickElement(tabButton);
    await this.waitForTabContent(tab);
  }

  async createPriceAlert(price: number, condition: 'above' | 'below') {
    await this.clickElement(this.alertButton);
    await this.waitForElement(this.alertModal);
    
    await this.selectOption(this.alertTypeSelector, 'price');
    await this.fillInput(this.priceAlertInput, price.toString());
    await this.selectOption(this.alertConditionSelector, condition);
    
    await this.clickElement(this.createAlertButton);
    await this.waitForElementHidden(this.alertModal);
  }

  async createPercentageAlert(percentage: number, condition: 'above' | 'below') {
    await this.clickElement(this.alertButton);
    await this.waitForElement(this.alertModal);
    
    await this.selectOption(this.alertTypeSelector, 'percentage');
    await this.fillInput(this.percentageAlertInput, percentage.toString());
    await this.selectOption(this.alertConditionSelector, condition);
    
    await this.clickElement(this.createAlertButton);
    await this.waitForElementHidden(this.alertModal);
  }

  async shareStock() {
    await this.clickElement(this.shareButton);
    await this.waitForElement(this.shareModal);
  }

  async copyShareUrl(): Promise<string> {
    await this.shareStock();
    await this.clickElement(this.copyUrlButton);
    return await this.getText(this.shareUrl);
  }

  async shareOnTwitter() {
    await this.shareStock();
    await this.clickElement(this.shareTwitter);
  }

  async shareOnLinkedIn() {
    await this.shareStock();
    await this.clickElement(this.shareLinkedIn);
  }

  async shareViaEmail() {
    await this.shareStock();
    await this.clickElement(this.shareEmail);
  }

  async getStockPrice(): Promise<string> {
    return await this.getText(this.stockPrice);
  }

  async getStockChange(): Promise<string> {
    return await this.getText(this.stockChange);
  }

  async getStockChangePercent(): Promise<string> {
    return await this.getText(this.stockChangePercent);
  }

  async getMarketCap(): Promise<string> {
    return await this.getText(this.marketCap);
  }

  async getPERatio(): Promise<string> {
    return await this.getText(this.peRatio);
  }

  async getEPS(): Promise<string> {
    return await this.getText(this.eps);
  }

  async getDividend(): Promise<string> {
    return await this.getText(this.dividend);
  }

  async getVolume(): Promise<string> {
    return await this.getText(this.volume);
  }

  async getBeta(): Promise<string> {
    return await this.getText(this.beta);
  }

  async getCompanyDescription(): Promise<string> {
    return await this.getText(this.companyDescription);
  }

  async getSector(): Promise<string> {
    return await this.getText(this.sector);
  }

  async getIndustry(): Promise<string> {
    return await this.getText(this.industry);
  }

  async getBidPrice(): Promise<string> {
    return await this.getText(this.bidPrice);
  }

  async getAskPrice(): Promise<string> {
    return await this.getText(this.askPrice);
  }

  async getSpread(): Promise<string> {
    return await this.getText(this.spread);
  }

  async getConnectionStatus(): Promise<string> {
    return await this.getText(this.connectionStatus);
  }

  async getLastUpdateTime(): Promise<string> {
    return await this.getText(this.lastUpdateTime);
  }

  async loadMoreNews() {
    await this.clickElement(this.loadMoreNews);
    await this.waitForElement(this.newsItems);
  }

  async filterNewsByImpact(impact: 'high' | 'medium' | 'low') {
    await this.selectOption(this.newsFilter, impact);
    await this.waitForElement(this.newsItems);
  }

  async getNewsCount(): Promise<number> {
    return await this.newsItems.count();
  }

  async getAnalystRating(): Promise<string> {
    return await this.getText(this.consensusRating);
  }

  async getPriceTarget(): Promise<string> {
    return await this.getText(this.priceTarget);
  }

  async waitForChartUpdate() {
    await this.waitForElementHidden(this.chartLoadingSpinner);
    await this.waitForElement(this.chartCanvas);
  }

  async waitForTabContent(tab: string) {
    const tabContent = this.page.locator(`[data-testid="${tab}-content"]`);
    await this.waitForElement(tabContent);
  }

  async waitForRealTimeUpdate() {
    await this.expectElementText(this.connectionStatus, /connected/i);
    
    // Wait for price to be updated
    await this.page.waitForFunction(() => {
      const priceElement = document.querySelector('[data-testid="real-time-price"]');
      return priceElement && priceElement.textContent !== '$0.00';
    }, { timeout: 10000 });
  }

  async expectStockDataVisible() {
    await this.expectElementVisible(this.stockSymbol);
    await this.expectElementVisible(this.stockName);
    await this.expectElementVisible(this.stockPrice);
    await this.expectElementVisible(this.stockChange);
    await this.expectElementVisible(this.stockChangePercent);
  }

  async expectChartVisible() {
    await this.expectElementVisible(this.chartContainer);
    await this.expectElementVisible(this.chartCanvas);
  }

  async expectKeyMetricsVisible() {
    await this.expectElementVisible(this.keyMetrics);
    await this.expectElementVisible(this.marketCap);
    await this.expectElementVisible(this.peRatio);
    await this.expectElementVisible(this.eps);
  }

  async expectCompanyInfoVisible() {
    await this.expectElementVisible(this.companyInfo);
    await this.expectElementVisible(this.companyDescription);
    await this.expectElementVisible(this.sector);
    await this.expectElementVisible(this.industry);
  }

  async expectRealTimeDataVisible() {
    await this.expectElementVisible(this.connectionStatus);
    await this.expectElementVisible(this.realTimePrice);
    await this.expectElementVisible(this.bidPrice);
    await this.expectElementVisible(this.askPrice);
  }

  async expectNewsVisible() {
    await this.expectElementVisible(this.newsContainer);
    await this.expectElementVisible(this.newsItems);
  }

  async expectFinancialsVisible() {
    await this.expectElementVisible(this.financialStatements);
    await this.expectElementVisible(this.revenue);
    await this.expectElementVisible(this.netIncome);
  }

  async expectAnalysisVisible() {
    await this.expectElementVisible(this.analystRatings);
    await this.expectElementVisible(this.priceTarget);
    await this.expectElementVisible(this.consensusRating);
  }

  async expectOptionsVisible() {
    await this.expectElementVisible(this.optionsChain);
    await this.expectElementVisible(this.callOptions);
    await this.expectElementVisible(this.putOptions);
  }

  async expectInWatchlist() {
    await this.expectElementVisible(this.removeFromWatchlistButton);
    await this.expectElementHidden(this.addToWatchlistButton);
  }

  async expectNotInWatchlist() {
    await this.expectElementVisible(this.addToWatchlistButton);
    await this.expectElementHidden(this.removeFromWatchlistButton);
  }

  async expectPositiveChange() {
    const changeText = await this.getText(this.stockChange);
    expect(changeText).toMatch(/^\+/);
    
    const changePercentText = await this.getText(this.stockChangePercent);
    expect(changePercentText).toMatch(/^\+/);
  }

  async expectNegativeChange() {
    const changeText = await this.getText(this.stockChange);
    expect(changeText).toMatch(/^-/);
    
    const changePercentText = await this.getText(this.stockChangePercent);
    expect(changePercentText).toMatch(/^-/);
  }

  async expectChartError() {
    await this.expectElementVisible(this.chartError);
    await this.expectElementVisible(this.retryButton);
  }

  async expectNoDataMessage() {
    await this.expectElementVisible(this.noDataMessage);
  }

  async expectLoadingState() {
    await this.expectElementVisible(this.loadingSpinner);
  }

  async expectChartLoadingState() {
    await this.expectElementVisible(this.chartLoadingSpinner);
  }
}