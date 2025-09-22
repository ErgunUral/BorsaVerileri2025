import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StockAnalysis from '../StockAnalysis';
import { useTechnicalIndicators } from '../../hooks/useTechnicalIndicators';
import { usePatternRecognition } from '../../hooks/usePatternRecognition';
import { useAdvancedPatterns } from '../../hooks/useAdvancedPatterns';
import { useMarketSentiment } from '../../hooks/useMarketSentiment';
import { useRiskAnalysis } from '../../hooks/useRiskAnalysis';

// Mock hooks
jest.mock('../../hooks/useTechnicalIndicators');
jest.mock('../../hooks/usePatternRecognition');
jest.mock('../../hooks/useAdvancedPatterns');
jest.mock('../../hooks/useMarketSentiment');
jest.mock('../../hooks/useRiskAnalysis');

// Mock child components
jest.mock('../TradingSignals', () => {
  return function MockTradingSignals() {
    return <div data-testid="trading-signals">Trading Signals</div>;
  };
});

jest.mock('../FinancialCalculator', () => {
  return function MockFinancialCalculator() {
    return <div data-testid="financial-calculator">Financial Calculator</div>;
  };
});

jest.mock('../AnalysisRecommendations', () => {
  return function MockAnalysisRecommendations() {
    return <div data-testid="analysis-recommendations">Analysis Recommendations</div>;
  };
});

const mockUseTechnicalIndicators = useTechnicalIndicators as jest.MockedFunction<typeof useTechnicalIndicators>;
const mockUsePatternRecognition = usePatternRecognition as jest.MockedFunction<typeof usePatternRecognition>;
const mockUseAdvancedPatterns = useAdvancedPatterns as jest.MockedFunction<typeof useAdvancedPatterns>;
const mockUseMarketSentiment = useMarketSentiment as jest.MockedFunction<typeof useMarketSentiment>;
const mockUseRiskAnalysis = useRiskAnalysis as jest.MockedFunction<typeof useRiskAnalysis>;

const mockStockData = {
  stockCode: 'THYAO',
  price: {
    price: 150.50,
    changePercent: 2.5,
    volume: 1000000,
    lastUpdated: '2024-01-01T12:00:00Z'
  },
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
      operatingMargin: 0.12
    }
  }
};

const mockTechnicalIndicators = {
  indicators: {
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
  },
  loading: false,
  error: null,
  fetchIndicators: jest.fn()
};

const mockPatternRecognition = {
  patterns: [
    {
      type: 'head_and_shoulders',
      confidence: 0.85,
      signal: 'bearish',
      description: 'Head and shoulders pattern detected'
    }
  ],
  loading: false,
  error: null,
  analyzePatterns: jest.fn()
};

const mockAdvancedPatterns = {
  patterns: [
    {
      name: 'Triangle',
      type: 'continuation',
      confidence: 0.75,
      timeframe: '1D'
    }
  ],
  loading: false,
  error: null
};

const mockMarketSentiment = {
  sentiment: {
    score: 0.6,
    label: 'Positive',
    confidence: 0.8
  },
  loading: false,
  error: null
};

const mockRiskAnalysis = {
  riskMetrics: {
    volatility: 0.25,
    beta: 1.2,
    sharpeRatio: 1.5,
    maxDrawdown: 0.15,
    riskLevel: 'Medium'
  },
  loading: false,
  error: null
};

describe('StockAnalysis Component', () => {
  beforeEach(() => {
    mockUseTechnicalIndicators.mockReturnValue(mockTechnicalIndicators);
    mockUsePatternRecognition.mockReturnValue(mockPatternRecognition);
    mockUseAdvancedPatterns.mockReturnValue(mockAdvancedPatterns);
    mockUseMarketSentiment.mockReturnValue(mockMarketSentiment);
    mockUseRiskAnalysis.mockReturnValue(mockRiskAnalysis);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders stock analysis with basic information', () => {
    render(<StockAnalysis stockData={mockStockData} />);
    
    expect(screen.getByText('THYAO - Türk Hava Yolları')).toBeInTheDocument();
    expect(screen.getByText('₺150,50')).toBeInTheDocument();
    expect(screen.getByText('+2,50%')).toBeInTheDocument();
  });

  it('displays financial ratios correctly', () => {
    render(<StockAnalysis stockData={mockStockData} />);
    
    expect(screen.getByText('Cari Oran: 1,50')).toBeInTheDocument();
    expect(screen.getByText('Borç/Özkaynak: 1,50')).toBeInTheDocument();
    expect(screen.getByText('ROE: %10,00')).toBeInTheDocument();
  });

  it('shows technical indicators when available', () => {
    render(<StockAnalysis stockData={mockStockData} />);
    
    expect(screen.getByText('RSI: 65,50')).toBeInTheDocument();
    expect(screen.getByText('MACD: 2,50')).toBeInTheDocument();
  });

  it('displays pattern recognition results', () => {
    render(<StockAnalysis stockData={mockStockData} />);
    
    expect(screen.getByText('Head and shoulders pattern detected')).toBeInTheDocument();
    expect(screen.getByText('Güven: %85')).toBeInTheDocument();
  });

  it('shows market sentiment analysis', () => {
    render(<StockAnalysis stockData={mockStockData} />);
    
    expect(screen.getByText('Positive')).toBeInTheDocument();
    expect(screen.getByText('Güven: %80')).toBeInTheDocument();
  });

  it('displays risk analysis metrics', () => {
    render(<StockAnalysis stockData={mockStockData} />);
    
    expect(screen.getByText('Volatilite: %25,00')).toBeInTheDocument();
    expect(screen.getByText('Beta: 1,20')).toBeInTheDocument();
    expect(screen.getByText('Risk Seviyesi: Medium')).toBeInTheDocument();
  });

  it('renders child components', () => {
    render(<StockAnalysis stockData={mockStockData} />);
    
    expect(screen.getByTestId('trading-signals')).toBeInTheDocument();
    expect(screen.getByTestId('financial-calculator')).toBeInTheDocument();
    expect(screen.getByTestId('analysis-recommendations')).toBeInTheDocument();
  });

  it('handles loading states', () => {
    mockUseTechnicalIndicators.mockReturnValue({
      ...mockTechnicalIndicators,
      loading: true
    });
    
    render(<StockAnalysis stockData={mockStockData} />);
    
    expect(screen.getByText('Teknik göstergeler yükleniyor...')).toBeInTheDocument();
  });

  it('handles error states', () => {
    mockUseTechnicalIndicators.mockReturnValue({
      ...mockTechnicalIndicators,
      error: 'Failed to load indicators'
    });
    
    render(<StockAnalysis stockData={mockStockData} />);
    
    expect(screen.getByText('Teknik gösterge hatası: Failed to load indicators')).toBeInTheDocument();
  });

  it('calculates financial strength index correctly', () => {
    render(<StockAnalysis stockData={mockStockData} />);
    
    // Financial strength index should be calculated based on ratios
    expect(screen.getByText(/Finansal Güç Endeksi/)).toBeInTheDocument();
  });

  it('shows appropriate risk color coding', () => {
    render(<StockAnalysis stockData={mockStockData} />);
    
    const riskElement = screen.getByText('Medium');
    expect(riskElement).toHaveClass('text-yellow-600');
  });

  it('displays last updated timestamp', () => {
    render(<StockAnalysis stockData={mockStockData} />);
    
    expect(screen.getByText(/Son Güncelleme:/)).toBeInTheDocument();
  });

  it('handles missing price data gracefully', () => {
    const stockDataWithoutPrice = {
      ...mockStockData,
      price: undefined
    };
    
    render(<StockAnalysis stockData={stockDataWithoutPrice} />);
    
    expect(screen.getByText('THYAO - Türk Hava Yolları')).toBeInTheDocument();
    expect(screen.getByText('Fiyat bilgisi mevcut değil')).toBeInTheDocument();
  });

  it('handles missing analysis data gracefully', () => {
    const stockDataWithoutAnalysis = {
      ...mockStockData,
      analysis: undefined
    };
    
    render(<StockAnalysis stockData={stockDataWithoutAnalysis} />);
    
    expect(screen.getByText('Analiz verisi mevcut değil')).toBeInTheDocument();
  });

  it('refreshes data when refresh button is clicked', async () => {
    render(<StockAnalysis stockData={mockStockData} />);
    
    const refreshButton = screen.getByRole('button', { name: /yenile/i });
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(mockTechnicalIndicators.fetchIndicators).toHaveBeenCalled();
    });
  });
});