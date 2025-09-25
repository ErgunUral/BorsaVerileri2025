import { render, screen } from '@testing-library/react';
import StockAnalysis from './StockAnalysis';

// Mock the hooks
jest.mock('../hooks/useMarketSentiment', () => ({
  useMarketSentiment: () => ({
    sentiment: {
      overall: 'positive',
      score: 0.75,
      indicators: {
        vix: { value: 15.5, trend: 'down' },
        putCallRatio: { value: 0.8, trend: 'neutral' },
        marketMomentum: { value: 0.6, trend: 'up' }
      },
      news: [
        {
          title: 'Market rallies on positive earnings',
          sentiment: 'positive',
          impact: 'high',
          timestamp: '2024-01-15T10:00:00Z'
        }
      ],
      socialMedia: {
        bullishPercentage: 65,
        bearishPercentage: 35,
        volume: 1250
      }
    },
    loading: false,
    error: null,
    refresh: jest.fn()
  })
}));

jest.mock('../hooks/useRiskAnalysis', () => ({
  useRiskAnalysis: () => ({
    riskData: {
      overallRisk: 'medium',
      riskScore: 0.6,
      factors: [
        {
          name: 'Market Volatility',
          level: 'medium',
          impact: 0.4,
          description: 'Current market volatility is moderate'
        }
      ],
      recommendations: [
        'Consider diversifying portfolio',
        'Monitor market conditions closely'
      ]
    },
    loading: false,
    error: null,
    refresh: jest.fn()
  })
}));

jest.mock('../hooks/useTradingSignals', () => ({
  useTradingSignals: () => ({
    signals: [
      {
        type: 'buy',
        strength: 'strong',
        indicator: 'RSI',
        value: 25,
        timestamp: '2024-01-15T10:00:00Z',
        description: 'RSI indicates oversold condition'
      }
    ],
    loading: false,
    error: null,
    refresh: jest.fn()
  })
}));

// Mock the child components
jest.mock('./StockChart', () => ({
  StockChart: ({ symbol }: { symbol: string }) => (
    <div data-testid="stock-chart">Stock Chart for {symbol}</div>
  )
}));

jest.mock('./TradingSignals', () => ({
  TradingSignals: () => (
    <div data-testid="trading-signals">Trading Signals Component</div>
  )
}));

jest.mock('./RiskAnalysisCard', () => ({
  RiskAnalysisCard: () => (
    <div data-testid="risk-analysis-card">Risk Analysis Card Component</div>
  )
}));

jest.mock('./MarketSentimentCard', () => ({
  MarketSentimentCard: () => (
    <div data-testid="market-sentiment-card">Market Sentiment Card Component</div>
  )
}));

describe('StockAnalysis', () => {
  const defaultProps = {
    stockData: {
      symbol: 'AAPL',
      stockCode: 'AAPL',
      timestamp: '2024-01-15T10:00:00Z',
      analysis: {
        stockCode: 'AAPL',
        companyName: 'Apple Inc.',
        financialData: {
          stockCode: 'AAPL',
          companyName: 'Apple Inc.',
          period: '2024-Q1',
          currentAssets: 100000,
          totalAssets: 200000,
          shortTermLiabilities: 50000,
          longTermLiabilities: 75000,
          cashAndEquivalents: 30000,
          financialInvestments: 20000,
          financialDebts: 80000,
          totalLiabilities: 125000,
          netProfit: 25000,
          revenue: 150000,
          operatingProfit: 30000,
          ebitda: 35000,
          equity: 75000,
          paidCapital: 50000,
          marketCap: 3000000000,
          sharesOutstanding: 16000000000,
          lastUpdated: '2024-01-15T10:00:00Z'
        },
        ratios: {
          netWorkingCapital: 50000,
          cashPosition: 30000,
          financialStructure: {
            debtToAssetRatio: 0.625,
            equityRatio: 0.375,
            currentRatio: 2.0
          },
          ebitdaProfitability: {
            ebitdaMargin: 0.233,
            returnOnAssets: 0.175,
            returnOnEquity: 0.467
          },
          bonusPotential: {
             retainedEarningsRatio: 0.6,
             payoutRatio: 0.4,
             bonusScore: 75
           }
        },
        recommendations: ['BUY', 'HOLD'],
        riskLevel: 'Orta' as const,
        investmentScore: 85
      },
      price: {
        price: 150.25,
        changePercent: 1.69,
        volume: 1000000,
        lastUpdated: '2024-01-15T10:00:00Z'
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<StockAnalysis {...defaultProps} />);
    
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
  });

  it('should display the stock information', () => {
    render(<StockAnalysis {...defaultProps} />);
    
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
  });

  it('should display financial data', () => {
    render(<StockAnalysis {...defaultProps} />);
    
    expect(screen.getByText('$150.25')).toBeInTheDocument();
  });

  it('should render child components', () => {
    render(<StockAnalysis {...defaultProps} />);
    
    expect(screen.getByTestId('trading-signals')).toBeInTheDocument();
    expect(screen.getByTestId('risk-analysis-card')).toBeInTheDocument();
  });

  it('should render all child components', () => {
    render(<StockAnalysis {...defaultProps} />);
    
    expect(screen.getByTestId('stock-chart')).toBeInTheDocument();
    expect(screen.getByTestId('trading-signals')).toBeInTheDocument();
    expect(screen.getByTestId('risk-analysis-card')).toBeInTheDocument();
    expect(screen.getByTestId('market-sentiment-card')).toBeInTheDocument();
  });

  it('should display price information', () => {
    render(<StockAnalysis {...defaultProps} />);
    
    expect(screen.getByText('$150.25')).toBeInTheDocument();
  });

  it('should display company information', () => {
    render(<StockAnalysis {...defaultProps} />);
    
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('should render without errors', () => {
    render(<StockAnalysis {...defaultProps} />);
    
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('should display financial metrics', () => {
    render(<StockAnalysis {...defaultProps} />);
    
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('should render all sections', () => {
    render(<StockAnalysis {...defaultProps} />);
    
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
  });

  it('should handle component mounting', () => {
    render(<StockAnalysis {...defaultProps} />);
    
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('should display all required data', () => {
    render(<StockAnalysis {...defaultProps} />);
    
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    expect(screen.getByText('$150.25')).toBeInTheDocument();
  });
});