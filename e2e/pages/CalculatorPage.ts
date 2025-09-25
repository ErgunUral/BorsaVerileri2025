import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class CalculatorPage extends BasePage {
  // Calculator types
  readonly calculatorTabs: Locator;
  readonly profitLossTab: Locator;
  readonly positionSizeTab: Locator;
  readonly riskRewardTab: Locator;
  readonly compoundTab: Locator;
  readonly dividendTab: Locator;
  readonly optionsTab: Locator;
  readonly marginTab: Locator;
  readonly taxTab: Locator;

  // Profit/Loss Calculator
  readonly profitLossForm: Locator;
  readonly buyPriceInput: Locator;
  readonly sellPriceInput: Locator;
  readonly sharesInput: Locator;
  readonly commissionInput: Locator;
  readonly profitLossResult: Locator;
  readonly profitLossPercentage: Locator;
  readonly totalCostResult: Locator;
  readonly totalRevenueResult: Locator;
  readonly netProfitResult: Locator;

  // Position Size Calculator
  readonly positionSizeForm: Locator;
  readonly accountBalanceInput: Locator;
  readonly riskPercentageInput: Locator;
  readonly entryPriceInput: Locator;
  readonly stopLossPriceInput: Locator;
  readonly positionSizeResult: Locator;
  readonly maxLossResult: Locator;
  readonly riskAmountResult: Locator;
  readonly sharesRecommendedResult: Locator;

  // Risk/Reward Calculator
  readonly riskRewardForm: Locator;
  readonly riskRewardEntryInput: Locator;
  readonly riskRewardStopLossInput: Locator;
  readonly riskRewardTargetInput: Locator;
  readonly riskRewardRatioResult: Locator;
  readonly riskAmountRRResult: Locator;
  readonly rewardAmountResult: Locator;
  readonly breakEvenRateResult: Locator;

  // Compound Interest Calculator
  readonly compoundForm: Locator;
  readonly initialInvestmentInput: Locator;
  readonly monthlyContributionInput: Locator;
  readonly annualReturnInput: Locator;
  readonly yearsInput: Locator;
  readonly compoundFrequencySelect: Locator;
  readonly finalAmountResult: Locator;
  readonly totalContributionsResult: Locator;
  readonly totalInterestResult: Locator;
  readonly compoundChart: Locator;

  // Dividend Calculator
  readonly dividendForm: Locator;
  readonly dividendSharesInput: Locator;
  readonly dividendPerShareInput: Locator;
  readonly dividendFrequencySelect: Locator;
  readonly dividendGrowthRateInput: Locator;
  readonly yearsHoldingInput: Locator;
  readonly annualDividendResult: Locator;
  readonly totalDividendsResult: Locator;
  readonly dividendYieldResult: Locator;
  readonly futureValueResult: Locator;

  // Options Calculator
  readonly optionsForm: Locator;
  readonly optionTypeSelect: Locator;
  readonly underlyingPriceInput: Locator;
  readonly strikePriceInput: Locator;
  readonly timeToExpirationInput: Locator;
  readonly volatilityInput: Locator;
  readonly riskFreeRateInput: Locator;
  readonly optionPriceResult: Locator;
  readonly deltaResult: Locator;
  readonly gammaResult: Locator;
  readonly thetaResult: Locator;
  readonly vegaResult: Locator;
  readonly rhoResult: Locator;

  // Margin Calculator
  readonly marginForm: Locator;
  readonly marginStockPriceInput: Locator;
  readonly marginSharesInput: Locator;
  readonly marginRequirementInput: Locator;
  readonly marginRateInput: Locator;
  readonly marginPeriodInput: Locator;
  readonly totalCostMarginResult: Locator;
  readonly marginRequiredResult: Locator;
  readonly marginInterestResult: Locator;
  readonly totalMarginCostResult: Locator;

  // Tax Calculator
  readonly taxForm: Locator;
  readonly taxIncomeInput: Locator;
  readonly taxBracketSelect: Locator;
  readonly capitalGainsInput: Locator;
  readonly holdingPeriodSelect: Locator;
  readonly taxStateSelect: Locator;
  readonly federalTaxResult: Locator;
  readonly stateTaxResult: Locator;
  readonly capitalGainsTaxResult: Locator;
  readonly totalTaxResult: Locator;
  readonly afterTaxIncomeResult: Locator;

  // Common elements
  readonly calculateButton: Locator;
  readonly clearButton: Locator;
  readonly resetButton: Locator;
  readonly saveCalculationButton: Locator;
  readonly loadCalculationButton: Locator;
  readonly exportButton: Locator;
  readonly printButton: Locator;

  // Results section
  readonly resultsSection: Locator;
  readonly resultsTitle: Locator;
  readonly resultsTable: Locator;
  readonly resultsChart: Locator;
  readonly resultsSummary: Locator;

  // History and saved calculations
  readonly calculationHistory: Locator;
  readonly savedCalculations: Locator;
  readonly historyItem: Locator;
  readonly deleteHistoryButton: Locator;
  readonly clearHistoryButton: Locator;

  // Input validation
  readonly validationError: Locator;
  readonly requiredFieldError: Locator;
  readonly numericFieldError: Locator;
  readonly rangeFieldError: Locator;

  // Loading and error states
  readonly calculatorLoading: Locator;
  readonly calculatorError: Locator;
  readonly noDataMessage: Locator;

  // Help and tooltips
  readonly helpButton: Locator;
  readonly helpModal: Locator;
  readonly tooltipTrigger: Locator;
  readonly tooltip: Locator;
  readonly formulaExplanation: Locator;

  // Advanced options
  readonly advancedOptionsToggle: Locator;
  readonly advancedOptionsPanel: Locator;
  readonly customFormulaInput: Locator;
  readonly scenarioAnalysis: Locator;
  readonly sensitivityAnalysis: Locator;

  constructor(page: Page) {
    super(page);

    // Calculator types
    this.calculatorTabs = page.locator('[data-testid="calculator-tabs"]');
    this.profitLossTab = page.locator('[data-testid="profit-loss-tab"]');
    this.positionSizeTab = page.locator('[data-testid="position-size-tab"]');
    this.riskRewardTab = page.locator('[data-testid="risk-reward-tab"]');
    this.compoundTab = page.locator('[data-testid="compound-tab"]');
    this.dividendTab = page.locator('[data-testid="dividend-tab"]');
    this.optionsTab = page.locator('[data-testid="options-tab"]');
    this.marginTab = page.locator('[data-testid="margin-tab"]');
    this.taxTab = page.locator('[data-testid="tax-tab"]');

    // Profit/Loss Calculator
    this.profitLossForm = page.locator('[data-testid="profit-loss-form"]');
    this.buyPriceInput = page.locator('[data-testid="buy-price"]');
    this.sellPriceInput = page.locator('[data-testid="sell-price"]');
    this.sharesInput = page.locator('[data-testid="shares"]');
    this.commissionInput = page.locator('[data-testid="commission"]');
    this.profitLossResult = page.locator('[data-testid="profit-loss-result"]');
    this.profitLossPercentage = page.locator('[data-testid="profit-loss-percentage"]');
    this.totalCostResult = page.locator('[data-testid="total-cost-result"]');
    this.totalRevenueResult = page.locator('[data-testid="total-revenue-result"]');
    this.netProfitResult = page.locator('[data-testid="net-profit-result"]');

    // Position Size Calculator
    this.positionSizeForm = page.locator('[data-testid="position-size-form"]');
    this.accountBalanceInput = page.locator('[data-testid="account-balance"]');
    this.riskPercentageInput = page.locator('[data-testid="risk-percentage"]');
    this.entryPriceInput = page.locator('[data-testid="entry-price"]');
    this.stopLossPriceInput = page.locator('[data-testid="stop-loss-price"]');
    this.positionSizeResult = page.locator('[data-testid="position-size-result"]');
    this.maxLossResult = page.locator('[data-testid="max-loss-result"]');
    this.riskAmountResult = page.locator('[data-testid="risk-amount-result"]');
    this.sharesRecommendedResult = page.locator('[data-testid="shares-recommended-result"]');

    // Risk/Reward Calculator
    this.riskRewardForm = page.locator('[data-testid="risk-reward-form"]');
    this.riskRewardEntryInput = page.locator('[data-testid="rr-entry-price"]');
    this.riskRewardStopLossInput = page.locator('[data-testid="rr-stop-loss"]');
    this.riskRewardTargetInput = page.locator('[data-testid="rr-target-price"]');
    this.riskRewardRatioResult = page.locator('[data-testid="risk-reward-ratio-result"]');
    this.riskAmountRRResult = page.locator('[data-testid="risk-amount-rr-result"]');
    this.rewardAmountResult = page.locator('[data-testid="reward-amount-result"]');
    this.breakEvenRateResult = page.locator('[data-testid="break-even-rate-result"]');

    // Compound Interest Calculator
    this.compoundForm = page.locator('[data-testid="compound-form"]');
    this.initialInvestmentInput = page.locator('[data-testid="initial-investment"]');
    this.monthlyContributionInput = page.locator('[data-testid="monthly-contribution"]');
    this.annualReturnInput = page.locator('[data-testid="annual-return"]');
    this.yearsInput = page.locator('[data-testid="years"]');
    this.compoundFrequencySelect = page.locator('[data-testid="compound-frequency"]');
    this.finalAmountResult = page.locator('[data-testid="final-amount-result"]');
    this.totalContributionsResult = page.locator('[data-testid="total-contributions-result"]');
    this.totalInterestResult = page.locator('[data-testid="total-interest-result"]');
    this.compoundChart = page.locator('[data-testid="compound-chart"]');

    // Dividend Calculator
    this.dividendForm = page.locator('[data-testid="dividend-form"]');
    this.dividendSharesInput = page.locator('[data-testid="dividend-shares"]');
    this.dividendPerShareInput = page.locator('[data-testid="dividend-per-share"]');
    this.dividendFrequencySelect = page.locator('[data-testid="dividend-frequency"]');
    this.dividendGrowthRateInput = page.locator('[data-testid="dividend-growth-rate"]');
    this.yearsHoldingInput = page.locator('[data-testid="years-holding"]');
    this.annualDividendResult = page.locator('[data-testid="annual-dividend-result"]');
    this.totalDividendsResult = page.locator('[data-testid="total-dividends-result"]');
    this.dividendYieldResult = page.locator('[data-testid="dividend-yield-result"]');
    this.futureValueResult = page.locator('[data-testid="future-value-result"]');

    // Options Calculator
    this.optionsForm = page.locator('[data-testid="options-form"]');
    this.optionTypeSelect = page.locator('[data-testid="option-type"]');
    this.underlyingPriceInput = page.locator('[data-testid="underlying-price"]');
    this.strikePriceInput = page.locator('[data-testid="strike-price"]');
    this.timeToExpirationInput = page.locator('[data-testid="time-to-expiration"]');
    this.volatilityInput = page.locator('[data-testid="volatility"]');
    this.riskFreeRateInput = page.locator('[data-testid="risk-free-rate"]');
    this.optionPriceResult = page.locator('[data-testid="option-price-result"]');
    this.deltaResult = page.locator('[data-testid="delta-result"]');
    this.gammaResult = page.locator('[data-testid="gamma-result"]');
    this.thetaResult = page.locator('[data-testid="theta-result"]');
    this.vegaResult = page.locator('[data-testid="vega-result"]');
    this.rhoResult = page.locator('[data-testid="rho-result"]');

    // Margin Calculator
    this.marginForm = page.locator('[data-testid="margin-form"]');
    this.marginStockPriceInput = page.locator('[data-testid="margin-stock-price"]');
    this.marginSharesInput = page.locator('[data-testid="margin-shares"]');
    this.marginRequirementInput = page.locator('[data-testid="margin-requirement"]');
    this.marginRateInput = page.locator('[data-testid="margin-rate"]');
    this.marginPeriodInput = page.locator('[data-testid="margin-period"]');
    this.totalCostMarginResult = page.locator('[data-testid="total-cost-margin-result"]');
    this.marginRequiredResult = page.locator('[data-testid="margin-required-result"]');
    this.marginInterestResult = page.locator('[data-testid="margin-interest-result"]');
    this.totalMarginCostResult = page.locator('[data-testid="total-margin-cost-result"]');

    // Tax Calculator
    this.taxForm = page.locator('[data-testid="tax-form"]');
    this.taxIncomeInput = page.locator('[data-testid="tax-income"]');
    this.taxBracketSelect = page.locator('[data-testid="tax-bracket"]');
    this.capitalGainsInput = page.locator('[data-testid="capital-gains"]');
    this.holdingPeriodSelect = page.locator('[data-testid="holding-period"]');
    this.taxStateSelect = page.locator('[data-testid="tax-state"]');
    this.federalTaxResult = page.locator('[data-testid="federal-tax-result"]');
    this.stateTaxResult = page.locator('[data-testid="state-tax-result"]');
    this.capitalGainsTaxResult = page.locator('[data-testid="capital-gains-tax-result"]');
    this.totalTaxResult = page.locator('[data-testid="total-tax-result"]');
    this.afterTaxIncomeResult = page.locator('[data-testid="after-tax-income-result"]');

    // Common elements
    this.calculateButton = page.locator('[data-testid="calculate-button"]');
    this.clearButton = page.locator('[data-testid="clear-button"]');
    this.resetButton = page.locator('[data-testid="reset-button"]');
    this.saveCalculationButton = page.locator('[data-testid="save-calculation"]');
    this.loadCalculationButton = page.locator('[data-testid="load-calculation"]');
    this.exportButton = page.locator('[data-testid="export-button"]');
    this.printButton = page.locator('[data-testid="print-button"]');

    // Results section
    this.resultsSection = page.locator('[data-testid="results-section"]');
    this.resultsTitle = page.locator('[data-testid="results-title"]');
    this.resultsTable = page.locator('[data-testid="results-table"]');
    this.resultsChart = page.locator('[data-testid="results-chart"]');
    this.resultsSummary = page.locator('[data-testid="results-summary"]');

    // History and saved calculations
    this.calculationHistory = page.locator('[data-testid="calculation-history"]');
    this.savedCalculations = page.locator('[data-testid="saved-calculations"]');
    this.historyItem = page.locator('[data-testid="history-item"]');
    this.deleteHistoryButton = page.locator('[data-testid="delete-history"]');
    this.clearHistoryButton = page.locator('[data-testid="clear-history"]');

    // Input validation
    this.validationError = page.locator('[data-testid="validation-error"]');
    this.requiredFieldError = page.locator('[data-testid="required-field-error"]');
    this.numericFieldError = page.locator('[data-testid="numeric-field-error"]');
    this.rangeFieldError = page.locator('[data-testid="range-field-error"]');

    // Loading and error states
    this.calculatorLoading = page.locator('[data-testid="calculator-loading"]');
    this.calculatorError = page.locator('[data-testid="calculator-error"]');
    this.noDataMessage = page.locator('[data-testid="no-data-message"]');

    // Help and tooltips
    this.helpButton = page.locator('[data-testid="help-button"]');
    this.helpModal = page.locator('[data-testid="help-modal"]');
    this.tooltipTrigger = page.locator('[data-testid="tooltip-trigger"]');
    this.tooltip = page.locator('[data-testid="tooltip"]');
    this.formulaExplanation = page.locator('[data-testid="formula-explanation"]');

    // Advanced options
    this.advancedOptionsToggle = page.locator('[data-testid="advanced-options-toggle"]');
    this.advancedOptionsPanel = page.locator('[data-testid="advanced-options-panel"]');
    this.customFormulaInput = page.locator('[data-testid="custom-formula"]');
    this.scenarioAnalysis = page.locator('[data-testid="scenario-analysis"]');
    this.sensitivityAnalysis = page.locator('[data-testid="sensitivity-analysis"]');
  }

  async navigateToCalculator() {
    await this.navigateToUrl('/calculator');
    await this.waitForElement(this.calculatorTabs);
  }

  async selectCalculatorType(type: 'profit-loss' | 'position-size' | 'risk-reward' | 'compound' | 'dividend' | 'options' | 'margin' | 'tax') {
    const tab = this.page.locator(`[data-testid="${type}-tab"]`);
    await this.clickElement(tab);
    await this.waitForElement(this.page.locator(`[data-testid="${type}-form"]`));
  }

  async calculateProfitLoss(buyPrice: number, sellPrice: number, shares: number, commission: number = 0) {
    await this.selectCalculatorType('profit-loss');
    await this.fillInput(this.buyPriceInput, buyPrice.toString());
    await this.fillInput(this.sellPriceInput, sellPrice.toString());
    await this.fillInput(this.sharesInput, shares.toString());
    await this.fillInput(this.commissionInput, commission.toString());
    await this.clickElement(this.calculateButton);
    await this.waitForElement(this.profitLossResult);
  }

  async calculatePositionSize(accountBalance: number, riskPercentage: number, entryPrice: number, stopLossPrice: number) {
    await this.selectCalculatorType('position-size');
    await this.fillInput(this.accountBalanceInput, accountBalance.toString());
    await this.fillInput(this.riskPercentageInput, riskPercentage.toString());
    await this.fillInput(this.entryPriceInput, entryPrice.toString());
    await this.fillInput(this.stopLossPriceInput, stopLossPrice.toString());
    await this.clickElement(this.calculateButton);
    await this.waitForElement(this.positionSizeResult);
  }

  async calculateRiskReward(entryPrice: number, stopLossPrice: number, targetPrice: number) {
    await this.selectCalculatorType('risk-reward');
    await this.fillInput(this.riskRewardEntryInput, entryPrice.toString());
    await this.fillInput(this.riskRewardStopLossInput, stopLossPrice.toString());
    await this.fillInput(this.riskRewardTargetInput, targetPrice.toString());
    await this.clickElement(this.calculateButton);
    await this.waitForElement(this.riskRewardRatioResult);
  }

  async calculateCompoundInterest(initialInvestment: number, monthlyContribution: number, annualReturn: number, years: number, frequency: string = 'monthly') {
    await this.selectCalculatorType('compound');
    await this.fillInput(this.initialInvestmentInput, initialInvestment.toString());
    await this.fillInput(this.monthlyContributionInput, monthlyContribution.toString());
    await this.fillInput(this.annualReturnInput, annualReturn.toString());
    await this.fillInput(this.yearsInput, years.toString());
    await this.selectOption(this.compoundFrequencySelect, frequency);
    await this.clickElement(this.calculateButton);
    await this.waitForElement(this.finalAmountResult);
  }

  async calculateDividend(shares: number, dividendPerShare: number, frequency: string, growthRate: number, yearsHolding: number) {
    await this.selectCalculatorType('dividend');
    await this.fillInput(this.dividendSharesInput, shares.toString());
    await this.fillInput(this.dividendPerShareInput, dividendPerShare.toString());
    await this.selectOption(this.dividendFrequencySelect, frequency);
    await this.fillInput(this.dividendGrowthRateInput, growthRate.toString());
    await this.fillInput(this.yearsHoldingInput, yearsHolding.toString());
    await this.clickElement(this.calculateButton);
    await this.waitForElement(this.annualDividendResult);
  }

  async calculateOptions(optionType: string, underlyingPrice: number, strikePrice: number, timeToExpiration: number, volatility: number, riskFreeRate: number) {
    await this.selectCalculatorType('options');
    await this.selectOption(this.optionTypeSelect, optionType);
    await this.fillInput(this.underlyingPriceInput, underlyingPrice.toString());
    await this.fillInput(this.strikePriceInput, strikePrice.toString());
    await this.fillInput(this.timeToExpirationInput, timeToExpiration.toString());
    await this.fillInput(this.volatilityInput, volatility.toString());
    await this.fillInput(this.riskFreeRateInput, riskFreeRate.toString());
    await this.clickElement(this.calculateButton);
    await this.waitForElement(this.optionPriceResult);
  }

  async calculateMargin(stockPrice: number, shares: number, marginRequirement: number, marginRate: number, period: number) {
    await this.selectCalculatorType('margin');
    await this.fillInput(this.marginStockPriceInput, stockPrice.toString());
    await this.fillInput(this.marginSharesInput, shares.toString());
    await this.fillInput(this.marginRequirementInput, marginRequirement.toString());
    await this.fillInput(this.marginRateInput, marginRate.toString());
    await this.fillInput(this.marginPeriodInput, period.toString());
    await this.clickElement(this.calculateButton);
    await this.waitForElement(this.totalCostMarginResult);
  }

  async calculateTax(income: number, taxBracket: string, capitalGains: number, holdingPeriod: string, state: string) {
    await this.selectCalculatorType('tax');
    await this.fillInput(this.taxIncomeInput, income.toString());
    await this.selectOption(this.taxBracketSelect, taxBracket);
    await this.fillInput(this.capitalGainsInput, capitalGains.toString());
    await this.selectOption(this.holdingPeriodSelect, holdingPeriod);
    await this.selectOption(this.taxStateSelect, state);
    await this.clickElement(this.calculateButton);
    await this.waitForElement(this.federalTaxResult);
  }

  async clearForm() {
    await this.clickElement(this.clearButton);
  }

  async resetCalculator() {
    await this.clickElement(this.resetButton);
  }

  async saveCalculation(name?: string) {
    await this.clickElement(this.saveCalculationButton);
    if (name) {
      const nameInput = this.page.locator('[data-testid="save-name-input"]');
      await this.fillInput(nameInput, name);
      const saveButton = this.page.locator('[data-testid="save-confirm"]');
      await this.clickElement(saveButton);
    }
  }

  async loadCalculation(name: string) {
    await this.clickElement(this.loadCalculationButton);
    const calculationItem = this.page.locator(`[data-testid="saved-calculation-${name}"]`);
    await this.clickElement(calculationItem);
  }

  async exportResults(format: 'pdf' | 'excel' | 'csv') {
    await this.clickElement(this.exportButton);
    const formatOption = this.page.locator(`[data-testid="export-${format}"]`);
    await this.clickElement(formatOption);
  }

  async printResults() {
    await this.clickElement(this.printButton);
  }

  async openHelp() {
    await this.clickElement(this.helpButton);
    await this.waitForElement(this.helpModal);
  }

  async closeHelp() {
    const closeButton = this.page.locator('[data-testid="help-close"]');
    await this.clickElement(closeButton);
  }

  async toggleAdvancedOptions() {
    await this.clickElement(this.advancedOptionsToggle);
    await this.waitForElement(this.advancedOptionsPanel);
  }

  async viewCalculationHistory() {
    const historyTab = this.page.locator('[data-testid="history-tab"]');
    await this.clickElement(historyTab);
    await this.waitForElement(this.calculationHistory);
  }

  async deleteHistoryItem(index: number) {
    const deleteButton = this.page.locator(`[data-testid="delete-history-${index}"]`);
    await this.clickElement(deleteButton);
  }

  async clearAllHistory() {
    await this.clickElement(this.clearHistoryButton);
    const confirmButton = this.page.locator('[data-testid="confirm-clear-history"]');
    await this.clickElement(confirmButton);
  }

  async getProfitLossResult(): Promise<string> {
    return await this.getText(this.profitLossResult);
  }

  async getProfitLossPercentage(): Promise<string> {
    return await this.getText(this.profitLossPercentage);
  }

  async getPositionSizeResult(): Promise<string> {
    return await this.getText(this.positionSizeResult);
  }

  async getRiskRewardRatio(): Promise<string> {
    return await this.getText(this.riskRewardRatioResult);
  }

  async getFinalAmount(): Promise<string> {
    return await this.getText(this.finalAmountResult);
  }

  async getAnnualDividend(): Promise<string> {
    return await this.getText(this.annualDividendResult);
  }

  async getOptionPrice(): Promise<string> {
    return await this.getText(this.optionPriceResult);
  }

  async getMarginRequired(): Promise<string> {
    return await this.getText(this.marginRequiredResult);
  }

  async getTotalTax(): Promise<string> {
    return await this.getText(this.totalTaxResult);
  }

  async getValidationError(): Promise<string> {
    return await this.getText(this.validationError);
  }

  async expectCalculatorVisible() {
    await this.expectElementVisible(this.calculatorTabs);
    await this.expectElementVisible(this.calculateButton);
  }

  async expectResultsVisible() {
    await this.expectElementVisible(this.resultsSection);
    await this.expectElementVisible(this.resultsTitle);
  }

  async expectValidationError(message: string) {
    await this.expectElementVisible(this.validationError);
    await this.expectElementText(this.validationError, message);
  }

  async expectProfitLossResult(expectedProfit: number) {
    const result = await this.getProfitLossResult();
    const profit = parseFloat(result.replace(/[^0-9.-]/g, ''));
    expect(Math.abs(profit - expectedProfit)).toBeLessThan(0.01);
  }

  async expectPositionSizeResult(expectedSize: number) {
    const result = await this.getPositionSizeResult();
    const size = parseFloat(result.replace(/[^0-9.-]/g, ''));
    expect(Math.abs(size - expectedSize)).toBeLessThan(0.01);
  }

  async expectRiskRewardRatio(expectedRatio: number) {
    const result = await this.getRiskRewardRatio();
    const ratio = parseFloat(result.replace(/[^0-9.-]/g, ''));
    expect(Math.abs(ratio - expectedRatio)).toBeLessThan(0.01);
  }

  async expectChartVisible() {
    await this.expectElementVisible(this.resultsChart);
  }

  async expectLoadingState() {
    await this.expectElementVisible(this.calculatorLoading);
  }

  async expectErrorState() {
    await this.expectElementVisible(this.calculatorError);
  }

  async expectHelpModalVisible() {
    await this.expectElementVisible(this.helpModal);
    await this.expectElementVisible(this.formulaExplanation);
  }

  async expectAdvancedOptionsVisible() {
    await this.expectElementVisible(this.advancedOptionsPanel);
  }

  async expectHistoryVisible() {
    await this.expectElementVisible(this.calculationHistory);
  }

  async expectSavedCalculationsVisible() {
    await this.expectElementVisible(this.savedCalculations);
  }
}