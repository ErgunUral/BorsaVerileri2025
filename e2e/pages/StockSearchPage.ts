import { Page, Locator, expect } from '@playwright/test';

export class StockSearchPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly searchResults: Locator;
  readonly filterButtons: Locator;
  readonly sortDropdown: Locator;
  readonly sectorFilter: Locator;
  readonly priceRangeFilter: Locator;
  readonly marketCapFilter: Locator;
  readonly volumeFilter: Locator;
  readonly clearFiltersButton: Locator;
  readonly resultsCount: Locator;
  readonly paginationControls: Locator;
  readonly loadingIndicator: Locator;
  readonly noResultsMessage: Locator;
  readonly errorMessage: Locator;
  readonly recentSearches: Locator;
  readonly popularStocks: Locator;
  readonly advancedFiltersToggle: Locator;
  readonly advancedFiltersPanel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByTestId('search-input');
    this.searchButton = page.getByTestId('search-button');
    this.searchResults = page.getByTestId('search-results');
    this.filterButtons = page.getByTestId('filter-buttons');
    this.sortDropdown = page.getByTestId('sort-dropdown');
    this.sectorFilter = page.getByTestId('sector-filter');
    this.priceRangeFilter = page.getByTestId('price-range-filter');
    this.marketCapFilter = page.getByTestId('market-cap-filter');
    this.volumeFilter = page.getByTestId('volume-filter');
    this.clearFiltersButton = page.getByTestId('clear-filters');
    this.resultsCount = page.getByTestId('results-count');
    this.paginationControls = page.getByTestId('pagination-controls');
    this.loadingIndicator = page.getByTestId('loading-indicator');
    this.noResultsMessage = page.getByTestId('no-results-message');
    this.errorMessage = page.getByTestId('error-message');
    this.recentSearches = page.getByTestId('recent-searches');
    this.popularStocks = page.getByTestId('popular-stocks');
    this.advancedFiltersToggle = page.getByTestId('advanced-filters-toggle');
    this.advancedFiltersPanel = page.getByTestId('advanced-filters-panel');
  }

  async goto() {
    await this.page.goto('/search');
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await expect(this.searchInput).toBeVisible();
  }

  async searchStock(query: string) {
    await this.searchInput.fill(query);
    await this.searchButton.click();
    
    // Wait for search results
    await this.page.waitForTimeout(1000);
  }

  async searchStockByEnter(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    
    // Wait for search results
    await this.page.waitForTimeout(1000);
  }

  async verifySearchResults(expectedCount?: number) {
    await expect(this.searchResults).toBeVisible();
    
    const resultItems = this.searchResults.locator('[data-testid="stock-result-item"]');
    const actualCount = await resultItems.count();
    
    if (expectedCount !== undefined) {
      expect(actualCount).toBe(expectedCount);
    } else {
      expect(actualCount).toBeGreaterThan(0);
    }
    
    // Verify first result structure
    if (actualCount > 0) {
      const firstResult = resultItems.first();
      await expect(firstResult).toBeVisible();
      
      // Check for required elements in result item
      await expect(firstResult.locator('[data-testid="stock-symbol"]')).toBeVisible();
      await expect(firstResult.locator('[data-testid="stock-name"]')).toBeVisible();
      await expect(firstResult.locator('[data-testid="stock-price"]')).toBeVisible();
    }
  }

  async verifyNoResults() {
    await expect(this.noResultsMessage).toBeVisible();
    await expect(this.searchResults).not.toBeVisible();
  }

  async verifyLoadingState() {
    await expect(this.loadingIndicator).toBeVisible();
  }

  async waitForSearchComplete() {
    // Wait for loading to disappear
    await expect(this.loadingIndicator).not.toBeVisible({ timeout: 10000 });
  }

  async applySectorFilter(sector: string) {
    await this.sectorFilter.click();
    await this.page.locator(`[data-value="${sector}"]`).click();
    
    // Wait for filter to apply
    await this.page.waitForTimeout(1000);
  }

  async applyPriceRangeFilter(min: string, max: string) {
    await this.priceRangeFilter.click();
    
    // Fill min and max price inputs
    await this.page.locator('[data-testid="price-min-input"]').fill(min);
    await this.page.locator('[data-testid="price-max-input"]').fill(max);
    await this.page.locator('[data-testid="apply-price-filter"]').click();
    
    // Wait for filter to apply
    await this.page.waitForTimeout(1000);
  }

  async applyMarketCapFilter(range: 'small' | 'mid' | 'large') {
    await this.marketCapFilter.click();
    await this.page.locator(`[data-value="${range}"]`).click();
    
    // Wait for filter to apply
    await this.page.waitForTimeout(1000);
  }

  async applySorting(sortBy: 'price' | 'volume' | 'change' | 'name') {
    await this.sortDropdown.click();
    await this.page.locator(`[data-value="${sortBy}"]`).click();
    
    // Wait for sorting to apply
    await this.page.waitForTimeout(1000);
  }

  async clearAllFilters() {
    await this.clearFiltersButton.click();
    
    // Wait for filters to clear
    await this.page.waitForTimeout(1000);
  }

  async verifyFilteredResults(filterType: string, expectedValue: string) {
    const resultItems = this.searchResults.locator('[data-testid="stock-result-item"]');
    const count = await resultItems.count();
    
    // Verify at least one result matches the filter
    if (count > 0) {
      const firstResult = resultItems.first();
      
      switch (filterType) {
        case 'sector':
          const sectorElement = firstResult.locator('[data-testid="stock-sector"]');
          if (await sectorElement.count() > 0) {
            await expect(sectorElement).toContainText(expectedValue);
          }
          break;
        case 'price':
          const priceElement = firstResult.locator('[data-testid="stock-price"]');
          await expect(priceElement).toBeVisible();
          break;
      }
    }
  }

  async verifyResultsCount() {
    await expect(this.resultsCount).toBeVisible();
    
    const countText = await this.resultsCount.textContent();
    expect(countText).toMatch(/\d+/);
  }

  async navigateToPage(pageNumber: number) {
    const pageButton = this.paginationControls.locator(`button:has-text("${pageNumber}")`);
    await pageButton.click();
    
    // Wait for new page to load
    await this.page.waitForTimeout(1000);
  }

  async navigateToNextPage() {
    const nextButton = this.paginationControls.locator('button:has-text("Next")');
    await nextButton.click();
    
    // Wait for new page to load
    await this.page.waitForTimeout(1000);
  }

  async navigateToPreviousPage() {
    const prevButton = this.paginationControls.locator('button:has-text("Previous")');
    await prevButton.click();
    
    // Wait for new page to load
    await this.page.waitForTimeout(1000);
  }

  async verifyPagination() {
    await expect(this.paginationControls).toBeVisible();
    
    // Check for pagination buttons
    const pageButtons = this.paginationControls.locator('button');
    const buttonCount = await pageButtons.count();
    expect(buttonCount).toBeGreaterThan(0);
  }

  async clickStockResult(index: number = 0) {
    const resultItems = this.searchResults.locator('[data-testid="stock-result-item"]');
    const targetResult = resultItems.nth(index);
    
    await expect(targetResult).toBeVisible();
    await targetResult.click();
  }

  async verifyRecentSearches() {
    if (await this.recentSearches.count() > 0) {
      await expect(this.recentSearches).toBeVisible();
      
      const recentItems = this.recentSearches.locator('[data-testid="recent-search-item"]');
      const itemCount = await recentItems.count();
      
      if (itemCount > 0) {
        await expect(recentItems.first()).toBeVisible();
      }
    }
  }

  async verifyPopularStocks() {
    if (await this.popularStocks.count() > 0) {
      await expect(this.popularStocks).toBeVisible();
      
      const popularItems = this.popularStocks.locator('[data-testid="popular-stock-item"]');
      const itemCount = await popularItems.count();
      
      if (itemCount > 0) {
        await expect(popularItems.first()).toBeVisible();
      }
    }
  }

  async toggleAdvancedFilters() {
    await this.advancedFiltersToggle.click();
    
    // Wait for panel to toggle
    await this.page.waitForTimeout(500);
  }

  async verifyAdvancedFilters() {
    await expect(this.advancedFiltersPanel).toBeVisible();
    
    // Check for advanced filter options
    const filterOptions = this.advancedFiltersPanel.locator('[data-testid*="filter"]');
    const optionCount = await filterOptions.count();
    expect(optionCount).toBeGreaterThan(0);
  }

  async verifySearchSuggestions(query: string) {
    await this.searchInput.fill(query);
    
    // Wait for suggestions to appear
    await this.page.waitForTimeout(500);
    
    const suggestions = this.page.locator('[data-testid="search-suggestions"]');
    if (await suggestions.count() > 0) {
      await expect(suggestions).toBeVisible();
      
      const suggestionItems = suggestions.locator('[data-testid="suggestion-item"]');
      const itemCount = await suggestionItems.count();
      
      if (itemCount > 0) {
        await expect(suggestionItems.first()).toBeVisible();
      }
    }
  }

  async selectSearchSuggestion(index: number = 0) {
    const suggestions = this.page.locator('[data-testid="search-suggestions"]');
    const suggestionItems = suggestions.locator('[data-testid="suggestion-item"]');
    
    const targetSuggestion = suggestionItems.nth(index);
    await targetSuggestion.click();
    
    // Wait for search to execute
    await this.page.waitForTimeout(1000);
  }

  async verifyErrorHandling() {
    if (await this.errorMessage.count() > 0) {
      await expect(this.errorMessage).toBeVisible();
      const errorText = await this.errorMessage.textContent();
      expect(errorText).toBeTruthy();
    }
  }

  async verifyResponsiveDesign() {
    // Test mobile viewport
    await this.page.setViewportSize({ width: 375, height: 667 });
    await expect(this.searchInput).toBeVisible();
    await expect(this.searchButton).toBeVisible();
    
    // Test tablet viewport
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await expect(this.filterButtons).toBeVisible();
    
    // Test desktop viewport
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    await expect(this.searchResults).toBeVisible();
  }
}