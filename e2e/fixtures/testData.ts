/**
 * Test data fixtures for E2E tests
 */

export const mockStockData = {
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 150.25,
    change: 2.15,
    changePercent: 1.45,
    volume: 45678900,
    marketCap: 2500000000000,
    sector: 'Technology',
    peRatio: 28.5,
    dividendYield: 0.5,
    fundamentals: {
      eps: 5.61,
      revenue: 394328000000,
      grossMargin: 0.382,
      operatingMargin: 0.302,
      netMargin: 0.253,
      roe: 0.175,
      roa: 0.089,
      debtToEquity: 1.73
    },
    technicalIndicators: {
      rsi: 65.2,
      macd: 1.25,
      macdSignal: 0.98,
      macdHistogram: 0.27,
      movingAverage20: 148.30,
      movingAverage50: 145.80,
      movingAverage200: 140.25,
      bollingerUpper: 155.20,
      bollingerLower: 142.80,
      support: 145.00,
      resistance: 155.00
    },
    priceHistory: [
      { date: '2024-01-01', open: 148.50, high: 151.20, low: 147.80, close: 150.25, volume: 45678900 },
      { date: '2024-01-02', open: 150.25, high: 152.10, low: 149.30, close: 151.75, volume: 42345678 },
      { date: '2024-01-03', open: 151.75, high: 153.40, low: 150.90, close: 152.80, volume: 38901234 }
    ]
  },
  GOOGL: {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    price: 2750.80,
    change: -15.30,
    changePercent: -0.55,
    volume: 1234567,
    marketCap: 1800000000000,
    sector: 'Technology',
    peRatio: 25.8,
    dividendYield: 0.0,
    fundamentals: {
      eps: 106.47,
      revenue: 307394000000,
      grossMargin: 0.566,
      operatingMargin: 0.287,
      netMargin: 0.230,
      roe: 0.142,
      roa: 0.098,
      debtToEquity: 0.12
    },
    technicalIndicators: {
      rsi: 45.8,
      macd: -2.15,
      macdSignal: -1.85,
      macdHistogram: -0.30,
      movingAverage20: 2765.40,
      movingAverage50: 2780.20,
      movingAverage200: 2650.75,
      bollingerUpper: 2850.30,
      bollingerLower: 2650.20,
      support: 2700.00,
      resistance: 2800.00
    },
    priceHistory: [
      { date: '2024-01-01', open: 2765.20, high: 2780.50, low: 2745.30, close: 2750.80, volume: 1234567 },
      { date: '2024-01-02', open: 2750.80, high: 2765.40, low: 2735.60, close: 2745.20, volume: 1456789 },
      { date: '2024-01-03', open: 2745.20, high: 2755.80, low: 2730.40, close: 2748.90, volume: 1123456 }
    ]
  },
  TSLA: {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    price: 850.45,
    change: 25.60,
    changePercent: 3.10,
    volume: 23456789,
    marketCap: 850000000000,
    sector: 'Automotive',
    peRatio: 85.2,
    dividendYield: 0.0,
    fundamentals: {
      eps: 9.98,
      revenue: 96773000000,
      grossMargin: 0.194,
      operatingMargin: 0.083,
      netMargin: 0.076,
      roe: 0.193,
      roa: 0.089,
      debtToEquity: 0.17
    },
    technicalIndicators: {
      rsi: 72.5,
      macd: 8.45,
      macdSignal: 6.20,
      macdHistogram: 2.25,
      movingAverage20: 835.60,
      movingAverage50: 820.30,
      movingAverage200: 780.45,
      bollingerUpper: 880.20,
      bollingerLower: 800.30,
      support: 820.00,
      resistance: 870.00
    },
    priceHistory: [
      { date: '2024-01-01', open: 825.30, high: 855.20, low: 820.40, close: 850.45, volume: 23456789 },
      { date: '2024-01-02', open: 850.45, high: 865.80, low: 845.20, close: 860.75, volume: 28901234 },
      { date: '2024-01-03', open: 860.75, high: 875.40, low: 855.60, close: 870.20, volume: 25678901 }
    ]
  }
};

export const mockMarketSummary = {
  indices: {
    sp500: {
      symbol: 'SPX',
      name: 'S&P 500',
      value: 4150.25,
      change: 15.30,
      changePercent: 0.37,
      volume: 2500000000
    },
    nasdaq: {
      symbol: 'IXIC',
      name: 'NASDAQ Composite',
      value: 12850.75,
      change: -25.60,
      changePercent: -0.20,
      volume: 1800000000
    },
    dow: {
      symbol: 'DJI',
      name: 'Dow Jones Industrial Average',
      value: 33750.45,
      change: 125.80,
      changePercent: 0.37,
      volume: 1200000000
    }
  },
  marketStatus: 'open',
  marketHours: {
    isOpen: true,
    nextOpen: '2024-01-02T09:30:00-05:00',
    nextClose: '2024-01-01T16:00:00-05:00'
  },
  lastUpdated: new Date().toISOString(),
  sentiment: {
    overall: 'bullish',
    score: 0.65,
    indicators: {
      fearGreedIndex: 72,
      vixLevel: 18.5,
      putCallRatio: 0.85
    }
  },
  sectors: {
    technology: { change: 1.25, changePercent: 0.85 },
    healthcare: { change: 0.75, changePercent: 0.45 },
    financials: { change: -0.35, changePercent: -0.25 },
    energy: { change: 2.15, changePercent: 1.85 },
    utilities: { change: 0.15, changePercent: 0.12 }
  },
  topGainers: [
    { symbol: 'TSLA', name: 'Tesla Inc.', change: 25.60, changePercent: 3.10 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', change: 18.45, changePercent: 2.85 },
    { symbol: 'AMD', name: 'Advanced Micro Devices', change: 3.25, changePercent: 2.45 }
  ],
  topLosers: [
    { symbol: 'META', name: 'Meta Platforms Inc.', change: -8.75, changePercent: -2.15 },
    { symbol: 'NFLX', name: 'Netflix Inc.', change: -12.30, changePercent: -1.95 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', change: -15.30, changePercent: -0.55 }
  ],
  mostActive: [
    { symbol: 'AAPL', name: 'Apple Inc.', volume: 45678900 },
    { symbol: 'TSLA', name: 'Tesla Inc.', volume: 23456789 },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF', volume: 89012345 }
  ]
};

export const mockNewsData = [
  {
    id: '1',
    title: 'Market Reaches New Highs Amid Strong Earnings',
    summary: 'Stock market continues its upward trend as major companies report better-than-expected quarterly earnings...',
    content: 'The stock market reached new all-time highs today as investors reacted positively to a series of strong earnings reports from major corporations. Technology stocks led the rally, with Apple, Microsoft, and Google all posting significant gains.',
    source: 'Financial Times',
    author: 'John Smith',
    publishedAt: new Date().toISOString(),
    url: 'https://example.com/news/1',
    category: 'markets',
    tags: ['earnings', 'technology', 'rally'],
    relatedStocks: ['AAPL', 'MSFT', 'GOOGL']
  },
  {
    id: '2',
    title: 'Tech Stocks Lead Rally as AI Optimism Grows',
    summary: 'Technology sector shows strong performance as artificial intelligence developments drive investor confidence...',
    content: 'Technology stocks surged today as investors showed renewed optimism about artificial intelligence developments. Major tech companies are investing heavily in AI capabilities, driving significant gains across the sector.',
    source: 'Reuters',
    author: 'Jane Doe',
    publishedAt: new Date(Date.now() - 3600000).toISOString(),
    url: 'https://example.com/news/2',
    category: 'technology',
    tags: ['AI', 'technology', 'innovation'],
    relatedStocks: ['NVDA', 'MSFT', 'GOOGL']
  },
  {
    id: '3',
    title: 'Federal Reserve Signals Potential Rate Changes',
    summary: 'Central bank officials hint at possible monetary policy adjustments in upcoming meetings...',
    content: 'Federal Reserve officials indicated today that they are closely monitoring economic indicators and may consider adjusting interest rates in response to changing market conditions.',
    source: 'Bloomberg',
    author: 'Mike Johnson',
    publishedAt: new Date(Date.now() - 7200000).toISOString(),
    url: 'https://example.com/news/3',
    category: 'economy',
    tags: ['fed', 'interest-rates', 'monetary-policy'],
    relatedStocks: ['SPY', 'TLT', 'XLF']
  }
];

export const mockSearchResults = {
  'AAPL': [
    mockStockData.AAPL
  ],
  'GOOGL': [
    mockStockData.GOOGL
  ],
  'TSLA': [
    mockStockData.TSLA
  ],
  'tech': [
    mockStockData.AAPL,
    mockStockData.GOOGL
  ],
  'apple': [
    mockStockData.AAPL
  ],
  'tesla': [
    mockStockData.TSLA
  ],
  'alphabet': [
    mockStockData.GOOGL
  ]
};

export const mockWatchlistData = {
  userId: 'test-user-123',
  stocks: [
    {
      symbol: 'AAPL',
      addedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      alertPrice: 155.00,
      notes: 'Strong buy signal'
    },
    {
      symbol: 'GOOGL',
      addedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      alertPrice: 2800.00,
      notes: 'Watch for earnings'
    },
    {
      symbol: 'TSLA',
      addedAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
      alertPrice: 900.00,
      notes: 'High volatility'
    }
  ]
};

export const mockUserData = {
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  preferences: {
    theme: 'light',
    currency: 'USD',
    timezone: 'America/New_York',
    notifications: {
      email: true,
      push: false,
      priceAlerts: true,
      newsAlerts: false
    },
    dashboard: {
      defaultView: 'overview',
      refreshInterval: 30000,
      showExtendedHours: true
    }
  },
  subscription: {
    plan: 'premium',
    status: 'active',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
  }
};

export const mockAlertData = [
  {
    id: 'alert-1',
    userId: 'test-user-123',
    symbol: 'AAPL',
    type: 'price',
    condition: 'above',
    targetPrice: 155.00,
    currentPrice: 150.25,
    isActive: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    triggeredAt: null
  },
  {
    id: 'alert-2',
    userId: 'test-user-123',
    symbol: 'TSLA',
    type: 'volume',
    condition: 'above',
    targetVolume: 30000000,
    currentVolume: 23456789,
    isActive: true,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    triggeredAt: null
  }
];

export const mockWebSocketMessages = {
  stockUpdate: {
    type: 'stock_update',
    data: {
      symbol: 'AAPL',
      price: 150.75,
      change: 2.65,
      changePercent: 1.79,
      volume: 45789123,
      timestamp: new Date().toISOString()
    }
  },
  marketSummaryUpdate: {
    type: 'market_summary_update',
    data: {
      indices: {
        sp500: { value: 4155.80, change: 20.85, changePercent: 0.50 }
      },
      timestamp: new Date().toISOString()
    }
  },
  heartbeat: {
    type: 'heartbeat',
    timestamp: new Date().toISOString()
  },
  error: {
    type: 'error',
    message: 'Connection lost',
    code: 'WEBSOCKET_ERROR',
    timestamp: new Date().toISOString()
  }
};

export const testScenarios = {
  happyPath: {
    description: 'Normal user flow with successful operations',
    steps: [
      'Navigate to home page',
      'Verify market data loads',
      'Search for a stock',
      'View stock details',
      'Add to watchlist',
      'Set price alert'
    ]
  },
  errorHandling: {
    description: 'Error scenarios and recovery',
    steps: [
      'Simulate network error',
      'Verify error message display',
      'Test retry functionality',
      'Verify graceful degradation'
    ]
  },
  realTimeData: {
    description: 'Real-time data flow testing',
    steps: [
      'Establish WebSocket connection',
      'Verify real-time updates',
      'Test connection recovery',
      'Verify data consistency'
    ]
  },
  performance: {
    description: 'Performance and load testing',
    steps: [
      'Measure page load times',
      'Test with large datasets',
      'Verify memory usage',
      'Test concurrent operations'
    ]
  }
};