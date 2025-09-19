import { FinancialData } from './stockScraper';

export interface FinancialRatios {
  netWorkingCapital: number;
  cashPosition: number;
  financialStructure: {
    debtToAssetRatio: number;
    equityRatio: number;
    currentRatio: number;
    longTermDebtRatio: number;
    longTermDebtToEquityRatio: number;
  };
  ebitdaProfitability: {
    ebitdaMargin: number;
    returnOnAssets: number;
    returnOnEquity: number;
  };
  bonusPotential: {
    retainedEarningsRatio: number;
    payoutRatio: number;
    bonusScore: number;
  };
}

export interface AnalysisResult {
  stockCode: string;
  companyName: string;
  financialData: FinancialData;
  ratios: FinancialRatios;
  recommendations: string[];
  riskLevel: 'Düşük' | 'Orta' | 'Yüksek';
  investmentScore: number; // 0-100 arası
}

export class FinancialCalculator {
  
  // Ana analiz fonksiyonu
  calculateAnalysis(data: FinancialData): AnalysisResult {
    const ratios = this.calculateRatios(data);
    const recommendations = this.generateRecommendations(data, ratios);
    const riskLevel = this.assessRiskLevel(ratios);
    const investmentScore = this.calculateInvestmentScore(ratios);

    return {
      stockCode: data.stockCode,
      companyName: data.companyName,
      financialData: data,
      ratios,
      recommendations,
      riskLevel,
      investmentScore
    };
  }

  // Finansal oranları hesapla
  private calculateRatios(data: FinancialData): FinancialRatios {
    return {
      netWorkingCapital: this.calculateNetWorkingCapital(data),
      cashPosition: this.calculateCashPosition(data),
      financialStructure: this.calculateFinancialStructure(data),
      ebitdaProfitability: this.calculateEbitdaProfitability(data),
      bonusPotential: this.calculateBonusPotential(data)
    };
  }

  // Net İşletme Sermayesi hesapla
  private calculateNetWorkingCapital(data: FinancialData): number {
    return data.currentAssets - data.shortTermLiabilities;
  }

  // Nakit Pozisyonu hesapla
  private calculateCashPosition(data: FinancialData): number {
    return data.cashAndEquivalents + data.financialInvestments - data.financialDebts;
  }

  // Finansal Yapı oranları hesapla
  private calculateFinancialStructure(data: FinancialData) {
    const debtToAssetRatio = data.totalAssets > 0 ? 
      (data.totalLiabilities / data.totalAssets) * 100 : 0;
    
    const equityRatio = data.totalAssets > 0 ? 
      (data.equity / data.totalAssets) * 100 : 0;
    
    const currentRatio = data.shortTermLiabilities > 0 ? 
      data.currentAssets / data.shortTermLiabilities : 0;

    // Uzun vadeli borç oranları
    const longTermDebtRatio = data.totalAssets > 0 ? 
      (data.longTermLiabilities / data.totalAssets) * 100 : 0;
    
    const longTermDebtToEquityRatio = data.equity > 0 ? 
      (data.longTermLiabilities / data.equity) * 100 : 0;

    return {
      debtToAssetRatio: Math.round(debtToAssetRatio * 100) / 100,
      equityRatio: Math.round(equityRatio * 100) / 100,
      currentRatio: Math.round(currentRatio * 100) / 100,
      longTermDebtRatio: Math.round(longTermDebtRatio * 100) / 100,
      longTermDebtToEquityRatio: Math.round(longTermDebtToEquityRatio * 100) / 100
    };
  }

  // FAVÖK Karlılığı hesapla
  private calculateEbitdaProfitability(data: FinancialData) {
    // FAVÖK marjı (varsayılan olarak net satışları toplam varlıklar olarak alıyoruz)
    const ebitdaMargin = data.totalAssets > 0 ? 
      (data.ebitda / data.totalAssets) * 100 : 0;
    
    // Aktif karlılığı
    const returnOnAssets = data.totalAssets > 0 ? 
      (data.netProfit / data.totalAssets) * 100 : 0;
    
    // Özkaynak karlılığı
    const returnOnEquity = data.equity > 0 ? 
      (data.netProfit / data.equity) * 100 : 0;

    return {
      ebitdaMargin: Math.round(ebitdaMargin * 100) / 100,
      returnOnAssets: Math.round(returnOnAssets * 100) / 100,
      returnOnEquity: Math.round(returnOnEquity * 100) / 100
    };
  }

  // Bedelsiz Hisse Potansiyeli hesapla
  private calculateBonusPotential(data: FinancialData) {
    // Dağıtılmamış karlar oranı
    const retainedEarningsRatio = data.equity > 0 ? 
      ((data.equity - data.paidCapital) / data.equity) * 100 : 0;
    
    // Kar dağıtım oranı (varsayılan hesaplama)
    const payoutRatio = data.netProfit > 0 ? 
      Math.min(50, (data.netProfit / data.paidCapital) * 100) : 0;
    
    // Bedelsiz hisse skoru (0-100)
    let bonusScore = 0;
    if (retainedEarningsRatio > 50) bonusScore += 30;
    else if (retainedEarningsRatio > 25) bonusScore += 20;
    else if (retainedEarningsRatio > 10) bonusScore += 10;
    
    if (payoutRatio > 20) bonusScore += 25;
    else if (payoutRatio > 10) bonusScore += 15;
    else if (payoutRatio > 5) bonusScore += 10;
    
    if (data.netProfit > 0) bonusScore += 20;
    if (data.equity > data.paidCapital * 2) bonusScore += 25;

    return {
      retainedEarningsRatio: Math.round(retainedEarningsRatio * 100) / 100,
      payoutRatio: Math.round(payoutRatio * 100) / 100,
      bonusScore: Math.min(100, bonusScore)
    };
  }

  // Risk seviyesi değerlendir
  private assessRiskLevel(ratios: FinancialRatios): 'Düşük' | 'Orta' | 'Yüksek' {
    let riskScore = 0;
    
    // Borç oranı riski
    if (ratios.financialStructure.debtToAssetRatio > 70) riskScore += 3;
    else if (ratios.financialStructure.debtToAssetRatio > 50) riskScore += 2;
    else if (ratios.financialStructure.debtToAssetRatio > 30) riskScore += 1;
    
    // Uzun vadeli borç riski
    if (ratios.financialStructure.longTermDebtRatio > 40) riskScore += 2;
    else if (ratios.financialStructure.longTermDebtRatio > 25) riskScore += 1;
    
    if (ratios.financialStructure.longTermDebtToEquityRatio > 100) riskScore += 2;
    else if (ratios.financialStructure.longTermDebtToEquityRatio > 50) riskScore += 1;
    
    // Likidite riski
    if (ratios.financialStructure.currentRatio < 1) riskScore += 3;
    else if (ratios.financialStructure.currentRatio < 1.5) riskScore += 2;
    else if (ratios.financialStructure.currentRatio < 2) riskScore += 1;
    
    // Karlılık riski
    if (ratios.ebitdaProfitability.returnOnEquity < 0) riskScore += 3;
    else if (ratios.ebitdaProfitability.returnOnEquity < 5) riskScore += 2;
    else if (ratios.ebitdaProfitability.returnOnEquity < 10) riskScore += 1;
    
    // Nakit pozisyonu riski
    if (ratios.cashPosition < 0) riskScore += 2;
    
    if (riskScore >= 9) return 'Yüksek';
    if (ratios.financialStructure.longTermDebtRatio > 50 || riskScore >= 5) return 'Orta';
    return 'Düşük';
  }

  // Yatırım skoru hesapla (0-100)
  private calculateInvestmentScore(ratios: FinancialRatios): number {
    let score = 50; // Başlangıç skoru
    
    // Finansal yapı skoru (25 puan)
    if (ratios.financialStructure.debtToAssetRatio < 30) score += 10;
    else if (ratios.financialStructure.debtToAssetRatio < 50) score += 5;
    else if (ratios.financialStructure.debtToAssetRatio > 70) score -= 10;
    
    // Uzun vadeli borç değerlendirmesi
    if (ratios.financialStructure.longTermDebtRatio < 20) score += 5;
    else if (ratios.financialStructure.longTermDebtRatio > 40) score -= 5;
    
    if (ratios.financialStructure.longTermDebtToEquityRatio < 30) score += 3;
    else if (ratios.financialStructure.longTermDebtToEquityRatio > 80) score -= 8;
    
    if (ratios.financialStructure.currentRatio > 2) score += 10;
    else if (ratios.financialStructure.currentRatio > 1.5) score += 5;
    else if (ratios.financialStructure.currentRatio < 1) score -= 15;
    
    if (ratios.financialStructure.equityRatio > 50) score += 5;
    
    // Karlılık skoru (30 puan)
    if (ratios.ebitdaProfitability.returnOnEquity > 20) score += 15;
    else if (ratios.ebitdaProfitability.returnOnEquity > 15) score += 10;
    else if (ratios.ebitdaProfitability.returnOnEquity > 10) score += 5;
    else if (ratios.ebitdaProfitability.returnOnEquity < 0) score -= 20;
    
    if (ratios.ebitdaProfitability.returnOnAssets > 10) score += 10;
    else if (ratios.ebitdaProfitability.returnOnAssets > 5) score += 5;
    else if (ratios.ebitdaProfitability.returnOnAssets < 0) score -= 15;
    
    if (ratios.ebitdaProfitability.ebitdaMargin > 15) score += 5;
    
    // Nakit pozisyonu skoru (20 puan)
    if (ratios.cashPosition > 0) score += 10;
    else score -= 10;
    
    if (ratios.netWorkingCapital > 0) score += 10;
    else score -= 10;
    
    // Bedelsiz hisse potansiyeli skoru (25 puan)
    if (ratios.bonusPotential.bonusScore > 70) score += 15;
    else if (ratios.bonusPotential.bonusScore > 50) score += 10;
    else if (ratios.bonusPotential.bonusScore > 30) score += 5;
    
    if (ratios.bonusPotential.retainedEarningsRatio > 50) score += 10;
    else if (ratios.bonusPotential.retainedEarningsRatio > 25) score += 5;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // Öneriler oluştur
  private generateRecommendations(data: FinancialData, ratios: FinancialRatios): string[] {
    const recommendations: string[] = [];
    
    // Finansal yapı önerileri
    if (ratios.financialStructure.debtToAssetRatio > 70) {
      recommendations.push('⚠️ Yüksek borç oranı nedeniyle finansal risk bulunmaktadır.');
    }
    
    // Uzun vadeli borç önerileri
    if (ratios.financialStructure.longTermDebtRatio > 40) {
      recommendations.push('📊 Yüksek uzun vadeli borç oranı: Finansal esneklik sınırlı olabilir.');
    } else if (ratios.financialStructure.longTermDebtRatio < 10) {
      recommendations.push('💪 Düşük uzun vadeli borç: Güçlü finansal yapı.');
    }
    
    if (ratios.financialStructure.longTermDebtToEquityRatio > 80) {
      recommendations.push('⚠️ Uzun vadeli borç/özkaynak oranı yüksek: Kaldıraç riski.');
    }
    
    if (ratios.financialStructure.currentRatio < 1) {
      recommendations.push('🔴 Likidite sorunu riski: Kısa vadeli yükümlülükler dönen varlıklardan fazla.');
    } else if (ratios.financialStructure.currentRatio > 3) {
      recommendations.push('💰 Yüksek likidite: Nakit yönetimi optimize edilebilir.');
    }
    
    // Karlılık önerileri
    if (ratios.ebitdaProfitability.returnOnEquity > 20) {
      recommendations.push('✅ Mükemmel özkaynak karlılığı.');
    } else if (ratios.ebitdaProfitability.returnOnEquity < 5) {
      recommendations.push('📉 Düşük karlılık oranları dikkat gerektiriyor.');
    }
    
    // Nakit pozisyonu önerileri
    if (ratios.cashPosition < 0) {
      recommendations.push('💸 Negatif nakit pozisyonu: Finansman ihtiyacı olabilir.');
    } else if (ratios.cashPosition > data.totalAssets * 0.2) {
      recommendations.push('💎 Güçlü nakit pozisyonu: Yatırım fırsatları değerlendirilebilir.');
    }
    
    // Bedelsiz hisse önerileri
    if (ratios.bonusPotential.bonusScore > 70) {
      recommendations.push('🎁 Yüksek bedelsiz hisse potansiyeli.');
    } else if (ratios.bonusPotential.bonusScore < 30) {
      recommendations.push('📊 Düşük bedelsiz hisse potansiyeli.');
    }
    
    // Genel değerlendirme
    if (recommendations.length === 0) {
      recommendations.push('📈 Finansal göstergeler dengeli görünüyor.');
    }
    
    return recommendations;
  }

  // Sektör karşılaştırması için benchmark değerler
  getSectorBenchmarks() {
    return {
      manufacturing: {
        debtToAssetRatio: 45,
        currentRatio: 1.8,
        returnOnEquity: 12,
        returnOnAssets: 6
      },
      banking: {
        debtToAssetRatio: 85,
        currentRatio: 1.1,
        returnOnEquity: 15,
        returnOnAssets: 1.2
      },
      technology: {
        debtToAssetRatio: 25,
        currentRatio: 2.5,
        returnOnEquity: 18,
        returnOnAssets: 8
      },
      retail: {
        debtToAssetRatio: 55,
        currentRatio: 1.5,
        returnOnEquity: 14,
        returnOnAssets: 5
      }
    };
  }
}


export default new FinancialCalculator();