import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AnalysisRecommendations from '../AnalysisRecommendations';

const mockStockData = {
  stockCode: 'THYAO',
  analysis: {
    stockCode: 'THYAO',
    companyName: 'Türk Hava Yolları',
    totalAssets: 50000000,
    totalLiabilities: 30000000,
    equity: 20000000,
    currentAssets: 15000000,
    shortTermLiabilities: 10000000,
    netProfit: 2000000,
    revenue: 25000000,
    operatingProfit: 3000000,
    lastUpdated: new Date('2024-01-01T12:00:00Z'),
    financialData: {
      currentRatio: 1.5,
      debtToEquity: 1.5,
      roe: 0.1,
      roa: 0.04,
      profitMargin: 0.08,
      operatingMargin: 0.12,
      quickRatio: 1.2,
      cashRatio: 0.8,
      interestCoverage: 5.0,
      assetTurnover: 0.5,
      equityMultiplier: 2.5,
      grossMargin: 0.25,
      netMargin: 0.08,
      workingCapital: 5000000,
      bookValuePerShare: 25.0,
      priceToBook: 6.0,
      priceToEarnings: 15.0,
      earningsPerShare: 10.0,
      dividendYield: 0.03,
      payoutRatio: 0.4
    }
  },
  price: {
    price: 150.50,
    changePercent: 2.5,
    volume: 1000000,
    lastUpdated: '2024-01-01T12:00:00Z'
  }
};

const mockTechnicalIndicators = {
  rsi: 65.5,
  macd: {
    macd: 2.5,
    signal: 2.1,
    histogram: 0.4
  },
  bollingerBands: {
    upper: 160,
    middle: 150,
    lower: 140
  },
  movingAverages: {
    sma20: 148,
    sma50: 145,
    ema12: 149
  }
};

const mockPatterns = [
  {
    type: 'head_and_shoulders',
    confidence: 0.85,
    signal: 'bearish',
    description: 'Head and shoulders pattern detected'
  },
  {
    type: 'triangle',
    confidence: 0.75,
    signal: 'neutral',
    description: 'Triangle pattern forming'
  }
];

describe('AnalysisRecommendations Component', () => {
  const defaultProps = {
    stockData: mockStockData,
    technicalIndicators: mockTechnicalIndicators,
    patterns: mockPatterns
  };

  beforeEach(() => {
    render(<AnalysisRecommendations {...defaultProps} />);
  });

  it('renders analysis recommendations title', () => {
    expect(screen.getByText('Analiz Önerileri')).toBeInTheDocument();
    expect(screen.getByText('AI destekli yatırım önerileri ve risk analizi')).toBeInTheDocument();
  });

  it('displays financial analysis recommendations', () => {
    expect(screen.getByText('Finansal Analiz')).toBeInTheDocument();
    expect(screen.getByText(/Cari oran/)).toBeInTheDocument();
    expect(screen.getByText(/ROE/)).toBeInTheDocument();
  });

  it('shows technical analysis recommendations', () => {
    expect(screen.getByText('Teknik Analiz')).toBeInTheDocument();
    expect(screen.getByText(/RSI/)).toBeInTheDocument();
    expect(screen.getByText(/MACD/)).toBeInTheDocument();
  });

  it('displays pattern analysis recommendations', () => {
    expect(screen.getByText('Formasyon Analizi')).toBeInTheDocument();
    expect(screen.getByText(/Head and shoulders/)).toBeInTheDocument();
    expect(screen.getByText(/Triangle/)).toBeInTheDocument();
  });

  it('shows risk analysis section', () => {
    expect(screen.getByText('Risk Analizi')).toBeInTheDocument();
    expect(screen.getByText(/Volatilite/)).toBeInTheDocument();
  });

  it('displays investment recommendations', () => {
    expect(screen.getByText('Yatırım Önerileri')).toBeInTheDocument();
  });

  it('shows confidence scores for recommendations', () => {
    const confidenceElements = screen.getAllByText(/Güven:/i);
    expect(confidenceElements.length).toBeGreaterThan(0);
  });

  it('displays recommendation priorities', () => {
    expect(screen.getByText('Yüksek Öncelik')).toBeInTheDocument();
    expect(screen.getByText('Orta Öncelik')).toBeInTheDocument();
    expect(screen.getByText('Düşük Öncelik')).toBeInTheDocument();
  });

  it('shows buy/sell/hold recommendations', () => {
    const recommendations = screen.getAllByText(/AL|SAT|BEKLE/i);
    expect(recommendations.length).toBeGreaterThan(0);
  });

  it('displays financial strength indicators', () => {
    expect(screen.getByText(/Finansal Güç/)).toBeInTheDocument();
    expect(screen.getByText(/Likidite Durumu/)).toBeInTheDocument();
  });

  it('shows market position analysis', () => {
    expect(screen.getByText(/Piyasa Pozisyonu/)).toBeInTheDocument();
    expect(screen.getByText(/Değerleme/)).toBeInTheDocument();
  });

  it('displays time-based recommendations', () => {
    expect(screen.getByText('Kısa Vadeli')).toBeInTheDocument();
    expect(screen.getByText('Orta Vadeli')).toBeInTheDocument();
    expect(screen.getByText('Uzun Vadeli')).toBeInTheDocument();
  });

  it('shows sector comparison when available', () => {
    expect(screen.getByText(/Sektör Karşılaştırması/)).toBeInTheDocument();
  });

  it('displays warning messages for high risk', () => {
    const warningElements = screen.getAllByText(/Dikkat|Uyarı|Risk/i);
    expect(warningElements.length).toBeGreaterThan(0);
  });

  it('shows positive indicators with green styling', () => {
    const positiveElements = screen.getAllByText(/Güçlü|Pozitif|İyi/i);
    positiveElements.forEach(element => {
      expect(element).toHaveClass(/green|emerald/);
    });
  });

  it('shows negative indicators with red styling', () => {
    const negativeElements = screen.getAllByText(/Zayıf|Negatif|Kötü/i);
    negativeElements.forEach(element => {
      expect(element).toHaveClass(/red|rose/);
    });
  });

  it('displays recommendation details on click', async () => {
    const detailButtons = screen.getAllByText(/Detay|Ayrıntı/i);
    if (detailButtons.length > 0) {
      fireEvent.click(detailButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText(/Detaylı Analiz/)).toBeInTheDocument();
      });
    }
  });

  it('handles missing technical indicators gracefully', () => {
    const propsWithoutIndicators = {
      ...defaultProps,
      technicalIndicators: null
    };
    
    render(<AnalysisRecommendations {...propsWithoutIndicators} />);
    
    expect(screen.getByText('Teknik göstergeler mevcut değil')).toBeInTheDocument();
  });

  it('handles missing patterns gracefully', () => {
    const propsWithoutPatterns = {
      ...defaultProps,
      patterns: []
    };
    
    render(<AnalysisRecommendations {...propsWithoutPatterns} />);
    
    expect(screen.getByText('Formasyon bulunamadı')).toBeInTheDocument();
  });

  it('calculates overall recommendation score', () => {
    expect(screen.getByText(/Genel Puan/)).toBeInTheDocument();
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });

  it('shows recommendation reasoning', () => {
    expect(screen.getByText(/Gerekçe/)).toBeInTheDocument();
    expect(screen.getByText(/Analiz sonuçlarına göre/)).toBeInTheDocument();
  });

  it('displays target price recommendations', () => {
    expect(screen.getByText(/Hedef Fiyat/)).toBeInTheDocument();
    expect(screen.getByText(/₺/)).toBeInTheDocument();
  });

  it('shows stop loss recommendations', () => {
    expect(screen.getByText(/Stop Loss/)).toBeInTheDocument();
    expect(screen.getByText(/Zarar Durdur/)).toBeInTheDocument();
  });

  it('displays portfolio allocation suggestions', () => {
    expect(screen.getByText(/Portföy Ağırlığı/)).toBeInTheDocument();
    expect(screen.getByText(/%/)).toBeInTheDocument();
  });

  it('shows market timing recommendations', () => {
    expect(screen.getByText(/Giriş Zamanlaması/)).toBeInTheDocument();
    expect(screen.getByText(/Çıkış Zamanlaması/)).toBeInTheDocument();
  });

  it('displays dividend analysis when applicable', () => {
    expect(screen.getByText(/Temettü/)).toBeInTheDocument();
    expect(screen.getByText(/Getiri/)).toBeInTheDocument();
  });

  it('shows volatility warnings', () => {
    expect(screen.getByText(/Volatilite Uyarısı/)).toBeInTheDocument();
  });

  it('displays correlation analysis', () => {
    expect(screen.getByText(/Korelasyon/)).toBeInTheDocument();
    expect(screen.getByText(/Piyasa ile/)).toBeInTheDocument();
  });

  it('shows seasonal analysis when available', () => {
    expect(screen.getByText(/Mevsimsel/)).toBeInTheDocument();
  });

  it('displays news sentiment impact', () => {
    expect(screen.getByText(/Haber Etkisi/)).toBeInTheDocument();
    expect(screen.getByText(/Sentiment/)).toBeInTheDocument();
  });

  it('shows economic indicators impact', () => {
    expect(screen.getByText(/Ekonomik Göstergeler/)).toBeInTheDocument();
  });

  it('displays peer comparison', () => {
    expect(screen.getByText(/Rakip Analizi/)).toBeInTheDocument();
  });

  it('shows ESG score impact when available', () => {
    expect(screen.getByText(/ESG/)).toBeInTheDocument();
  });

  it('displays recommendation update timestamp', () => {
    expect(screen.getByText(/Son Güncelleme/)).toBeInTheDocument();
  });

  it('shows confidence interval for predictions', () => {
    expect(screen.getByText(/Güven Aralığı/)).toBeInTheDocument();
  });

  it('displays risk-adjusted returns', () => {
    expect(screen.getByText(/Riske Göre Düzeltilmiş/)).toBeInTheDocument();
  });

  it('shows backtesting results when available', () => {
    expect(screen.getByText(/Geçmiş Test/)).toBeInTheDocument();
  });
});