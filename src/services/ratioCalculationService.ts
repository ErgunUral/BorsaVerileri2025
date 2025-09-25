// Finansal Oranları Hesaplama Servisi

export interface FinancialData {
  // Bilanço Verileri
  currentAssets: number; // Dönen Varlıklar
  totalAssets: number; // Toplam Varlıklar
  currentLiabilities: number; // Kısa Vadeli Borçlar
  totalLiabilities: number; // Toplam Borçlar
  equity: number; // Özkaynak
  cash: number; // Nakit ve Nakit Benzerleri
  inventory: number; // Stoklar
  accountsReceivable: number; // Ticari Alacaklar
  
  // Gelir Tablosu Verileri
  revenue: number; // Net Satışlar
  grossProfit: number; // Brüt Kar
  netIncome: number; // Net Kar
  operatingIncome: number; // Faaliyet Karı
  interestExpense: number; // Faiz Giderleri
  
  // Piyasa Verileri
  marketCap: number; // Piyasa Değeri
  sharePrice: number; // Hisse Fiyatı
  sharesOutstanding: number; // Dolaşımdaki Hisse Sayısı
  bookValuePerShare: number; // Hisse Başına Defter Değeri
  
  // Dönem Bilgisi
  period: string; // Dönem (örn: "2023-Q4")
  year: number;
  quarter?: number;
}

export interface RatioAnalysis {
  period: string;
  liquidityRatios: LiquidityRatios;
  profitabilityRatios: ProfitabilityRatios;
  leverageRatios: LeverageRatios;
  activityRatios: ActivityRatios;
  marketRatios: MarketRatios;
}

export interface LiquidityRatios {
  currentRatio: number; // Cari Oran
  quickRatio: number; // Asit-Test Oranı
  cashRatio: number; // Nakit Oranı
}

export interface ProfitabilityRatios {
  roe: number; // Özkaynak Karlılığı
  roa: number; // Aktif Karlılığı
  netProfitMargin: number; // Net Kar Marjı
  grossProfitMargin: number; // Brüt Kar Marjı
  operatingMargin: number; // Faaliyet Kar Marjı
}

export interface LeverageRatios {
  debtToEquity: number; // Borç/Özkaynak Oranı
  debtToAssets: number; // Borç/Toplam Aktif Oranı
  equityRatio: number; // Özkaynak Oranı
  interestCoverage: number; // Faiz Karşılama Oranı
}

export interface ActivityRatios {
  assetTurnover: number; // Aktif Devir Hızı
  receivablesTurnover: number; // Alacak Devir Hızı
  inventoryTurnover: number; // Stok Devir Hızı
}

export interface MarketRatios {
  priceToEarnings: number; // F/K Oranı
  priceToBook: number; // PD/DD Oranı
  marketToBook: number; // Piyasa Değeri/Defter Değeri
  earningsPerShare: number; // Hisse Başına Kazanç
}

export class RatioCalculationService {
  /**
   * Likidite oranlarını hesaplar
   */
  static calculateLiquidityRatios(data: FinancialData): LiquidityRatios {
    const currentRatio = data.currentLiabilities > 0 
      ? data.currentAssets / data.currentLiabilities 
      : 0;
    
    const quickAssets = data.currentAssets - data.inventory;
    const quickRatio = data.currentLiabilities > 0 
      ? quickAssets / data.currentLiabilities 
      : 0;
    
    const cashRatio = data.currentLiabilities > 0 
      ? data.cash / data.currentLiabilities 
      : 0;
    
    return {
      currentRatio: Number(currentRatio.toFixed(2)),
      quickRatio: Number(quickRatio.toFixed(2)),
      cashRatio: Number(cashRatio.toFixed(2))
    };
  }

  /**
   * Karlılık oranlarını hesaplar
   */
  static calculateProfitabilityRatios(data: FinancialData): ProfitabilityRatios {
    const roe = data.equity > 0 
      ? (data.netIncome / data.equity) * 100 
      : 0;
    
    const roa = data.totalAssets > 0 
      ? (data.netIncome / data.totalAssets) * 100 
      : 0;
    
    const netProfitMargin = data.revenue > 0 
      ? (data.netIncome / data.revenue) * 100 
      : 0;
    
    const grossProfitMargin = data.revenue > 0 
      ? (data.grossProfit / data.revenue) * 100 
      : 0;
    
    const operatingMargin = data.revenue > 0 
      ? (data.operatingIncome / data.revenue) * 100 
      : 0;
    
    return {
      roe: Number(roe.toFixed(2)),
      roa: Number(roa.toFixed(2)),
      netProfitMargin: Number(netProfitMargin.toFixed(2)),
      grossProfitMargin: Number(grossProfitMargin.toFixed(2)),
      operatingMargin: Number(operatingMargin.toFixed(2))
    };
  }

  /**
   * Borç oranlarını hesaplar
   */
  static calculateLeverageRatios(data: FinancialData): LeverageRatios {
    const debtToEquity = data.equity > 0 
      ? data.totalLiabilities / data.equity 
      : 0;
    
    const debtToAssets = data.totalAssets > 0 
      ? data.totalLiabilities / data.totalAssets 
      : 0;
    
    const equityRatio = data.totalAssets > 0 
      ? data.equity / data.totalAssets 
      : 0;
    
    const interestCoverage = data.interestExpense > 0 
      ? data.operatingIncome / data.interestExpense 
      : 0;
    
    return {
      debtToEquity: Number(debtToEquity.toFixed(2)),
      debtToAssets: Number(debtToAssets.toFixed(2)),
      equityRatio: Number(equityRatio.toFixed(2)),
      interestCoverage: Number(interestCoverage.toFixed(2))
    };
  }

  /**
   * Faaliyet oranlarını hesaplar
   */
  static calculateActivityRatios(data: FinancialData): ActivityRatios {
    const assetTurnover = data.totalAssets > 0 
      ? data.revenue / data.totalAssets 
      : 0;
    
    const receivablesTurnover = data.accountsReceivable > 0 
      ? data.revenue / data.accountsReceivable 
      : 0;
    
    const inventoryTurnover = data.inventory > 0 
      ? data.revenue / data.inventory 
      : 0;
    
    return {
      assetTurnover: Number(assetTurnover.toFixed(2)),
      receivablesTurnover: Number(receivablesTurnover.toFixed(2)),
      inventoryTurnover: Number(inventoryTurnover.toFixed(2))
    };
  }

  /**
   * Piyasa oranlarını hesaplar
   */
  static calculateMarketRatios(data: FinancialData): MarketRatios {
    const earningsPerShare = data.sharesOutstanding > 0 
      ? data.netIncome / data.sharesOutstanding 
      : 0;
    
    const priceToEarnings = earningsPerShare > 0 
      ? data.sharePrice / earningsPerShare 
      : 0;
    
    const priceToBook = data.bookValuePerShare > 0 
      ? data.sharePrice / data.bookValuePerShare 
      : 0;
    
    const marketToBook = data.equity > 0 
      ? data.marketCap / data.equity 
      : 0;
    
    return {
      priceToEarnings: Number(priceToEarnings.toFixed(2)),
      priceToBook: Number(priceToBook.toFixed(2)),
      marketToBook: Number(marketToBook.toFixed(2)),
      earningsPerShare: Number(earningsPerShare.toFixed(2))
    };
  }

  /**
   * Tüm finansal oranları hesaplar
   */
  static calculateAllRatios(data: FinancialData): RatioAnalysis {
    return {
      period: data.period,
      liquidityRatios: this.calculateLiquidityRatios(data),
      profitabilityRatios: this.calculateProfitabilityRatios(data),
      leverageRatios: this.calculateLeverageRatios(data),
      activityRatios: this.calculateActivityRatios(data),
      marketRatios: this.calculateMarketRatios(data)
    };
  }

  /**
   * Çoklu dönem analizi yapar
   */
  static analyzeMultiplePeriods(dataArray: FinancialData[]): RatioAnalysis[] {
    return dataArray.map(data => this.calculateAllRatios(data));
  }

  /**
   * Trend analizi yapar
   */
  static calculateTrends(analyses: RatioAnalysis[]): Record<string, number> {
    if (analyses.length < 2) return {};
    
    const latest = analyses[analyses.length - 1];
    const previous = analyses[analyses.length - 2];
    
    const trends: Record<string, number> = {};
    
    // Likidite oranları trend
    trends.currentRatioTrend = this.calculatePercentageChange(
      previous.liquidityRatios.currentRatio, 
      latest.liquidityRatios.currentRatio
    );
    
    // Karlılık oranları trend
    trends.roeTrend = this.calculatePercentageChange(
      previous.profitabilityRatios.roe, 
      latest.profitabilityRatios.roe
    );
    
    trends.roaTrend = this.calculatePercentageChange(
      previous.profitabilityRatios.roa, 
      latest.profitabilityRatios.roa
    );
    
    // Borç oranları trend
    trends.debtToEquityTrend = this.calculatePercentageChange(
      previous.leverageRatios.debtToEquity, 
      latest.leverageRatios.debtToEquity
    );
    
    return trends;
  }

  /**
   * Yüzdelik değişim hesaplar
   */
  private static calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return 0;
    return Number((((newValue - oldValue) / oldValue) * 100).toFixed(2));
  }

  /**
   * Oran yorumları sağlar
   */
  static getRatioInterpretations(): Record<string, { good: string; bad: string; description: string }> {
    return {
      currentRatio: {
        description: "Şirketin kısa vadeli borçlarını ödeme kabiliyetini ölçer",
        good: "2.0 ve üzeri ideal, 1.5-2.0 arası kabul edilebilir",
        bad: "1.0'ın altında likidite sorunu gösterir"
      },
      quickRatio: {
        description: "Stoklar hariç kısa vadeli ödeme gücünü ölçer",
        good: "1.0 ve üzeri ideal",
        bad: "0.5'in altında acil likidite sorunu"
      },
      roe: {
        description: "Özkaynak üzerinden karlılığı ölçer",
        good: "%15 ve üzeri mükemmel",
        bad: "%5'in altında düşük karlılık"
      },
      roa: {
        description: "Toplam varlıkların ne kadar verimli kullanıldığını ölçer",
        good: "%10 ve üzeri çok iyi",
        bad: "%3'ün altında verimsizlik"
      },
      debtToEquity: {
        description: "Şirketin borçluluk seviyesini ölçer",
        good: "0.5 altında düşük risk",
        bad: "2.0 üzerinde yüksek risk"
      }
    };
  }
}

// Mock veri oluşturucu (test amaçlı)
export class MockFinancialDataGenerator {
  static generateSampleData(): FinancialData[] {
    return [
      {
        period: "2023-Q4",
        year: 2023,
        quarter: 4,
        currentAssets: 150000000,
        totalAssets: 500000000,
        currentLiabilities: 80000000,
        totalLiabilities: 200000000,
        equity: 300000000,
        cash: 50000000,
        inventory: 30000000,
        accountsReceivable: 40000000,
        revenue: 800000000,
        grossProfit: 320000000,
        netIncome: 60000000,
        operatingIncome: 100000000,
        interestExpense: 10000000,
        marketCap: 1200000000,
        sharePrice: 25.50,
        sharesOutstanding: 47058824,
        bookValuePerShare: 6.37
      },
      {
        period: "2023-Q3",
        year: 2023,
        quarter: 3,
        currentAssets: 140000000,
        totalAssets: 480000000,
        currentLiabilities: 75000000,
        totalLiabilities: 190000000,
        equity: 290000000,
        cash: 45000000,
        inventory: 28000000,
        accountsReceivable: 38000000,
        revenue: 750000000,
        grossProfit: 300000000,
        netIncome: 55000000,
        operatingIncome: 95000000,
        interestExpense: 9000000,
        marketCap: 1150000000,
        sharePrice: 24.45,
        sharesOutstanding: 47058824,
        bookValuePerShare: 6.16
      },
      {
        period: "2023-Q2",
        year: 2023,
        quarter: 2,
        currentAssets: 135000000,
        totalAssets: 470000000,
        currentLiabilities: 70000000,
        totalLiabilities: 180000000,
        equity: 290000000,
        cash: 42000000,
        inventory: 26000000,
        accountsReceivable: 35000000,
        revenue: 720000000,
        grossProfit: 288000000,
        netIncome: 50000000,
        operatingIncome: 90000000,
        interestExpense: 8000000,
        marketCap: 1100000000,
        sharePrice: 23.38,
        sharesOutstanding: 47058824,
        bookValuePerShare: 6.16
      }
    ];
  }
}