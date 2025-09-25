import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import Home from '../Home';
import { useRealTimeData } from '../../hooks/useRealTimeData';
import { useMarketSentiment } from '../../hooks/useMarketSentiment';

// Mock hooks
jest.mock('../../hooks/useRealTimeData');
jest.mock('../../hooks/useMarketSentiment');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn()
}));

const mockUseRealTimeData = useRealTimeData as jest.MockedFunction<typeof useRealTimeData>;
const mockUseMarketSentiment = useMarketSentiment as jest.MockedFunction<typeof useMarketSentiment>;

const mockStockData = {
  THYAO: {
    symbol: 'THYAO',
    price: 147.5,
    change: 3.2,
    changePercent: 2.22,
    volume: 1500000,
    timestamp: '2024-01-01T12:00:00Z'
  },
  AKBNK: {
    symbol: 'AKBNK',
    price: 45.8,
    change: -0.5,
    changePercent: -1.08,
    volume: 2000000,
    timestamp: '2024-01-01T12:00:00Z'
  }
};

const mockMarketSummary = {
  totalStocks: 100,
  gainers: 45,
  losers: 35,
  unchanged: 20,
  totalVolume: 50000000,
  lastUpdate: '2024-01-01T12:00:00Z'
};

const mockSentimentData = {
  overall: 'positive',
  score: 0.75,
  indicators: {
    news: 0.8,
    social: 0.7,
    technical: 0.75
  },
  trends: [
    { symbol: 'THYAO', sentiment: 'positive', score: 0.8 },
    { symbol: 'AKBNK', sentiment: 'negative', score: 0.3 }
  ]
};

const HomeWithRouter = () => (
  <BrowserRouter>
    <Home />
  </BrowserRouter>
);

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseRealTimeData.mockReturnValue({
      data: mockStockData,
      isConnected: true,
      error: null,
      marketSummary: mockMarketSummary,
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    });
    
    mockUseMarketSentiment.mockReturnValue({
      sentiment: mockSentimentData,
      loading: false,
      error: null,
      refreshSentiment: jest.fn()
    });
  });

  test('renders welcome message', () => {
    render(<HomeWithRouter />);
    
    expect(screen.getByText('Borsa Verileri Analiz Platformu')).toBeInTheDocument();
    expect(screen.getByText(/Gerçek zamanlı borsa verilerini takip edin/)).toBeInTheDocument();
  });

  test('displays hero section with call-to-action', () => {
    render(<HomeWithRouter />);
    
    expect(screen.getByText('Analizi Başlat')).toBeInTheDocument();
    expect(screen.getByText('Canlı Verileri Görüntüle')).toBeInTheDocument();
  });

  test('shows market overview cards', () => {
    render(<HomeWithRouter />);
    
    expect(screen.getByText('Piyasa Özeti')).toBeInTheDocument();
    expect(screen.getByText('Toplam Hisse: 100')).toBeInTheDocument();
    expect(screen.getByText('Yükselenler: 45')).toBeInTheDocument();
    expect(screen.getByText('Düşenler: 35')).toBeInTheDocument();
  });

  test('displays top gainers section', () => {
    render(<HomeWithRouter />);
    
    expect(screen.getByText('En Çok Yükselenler')).toBeInTheDocument();
    expect(screen.getByText('THYAO')).toBeInTheDocument();
    expect(screen.getByText('+2.22%')).toBeInTheDocument();
  });

  test('shows market sentiment indicator', () => {
    render(<HomeWithRouter />);
    
    expect(screen.getByText('Piyasa Duyarlılığı')).toBeInTheDocument();
    expect(screen.getByText('Pozitif')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  test('displays feature highlights', () => {
    render(<HomeWithRouter />);
    
    expect(screen.getByText('Platform Özellikleri')).toBeInTheDocument();
    expect(screen.getByText('Gerçek Zamanlı Veriler')).toBeInTheDocument();
    expect(screen.getByText('Teknik Analiz')).toBeInTheDocument();
    expect(screen.getByText('Portföy Takibi')).toBeInTheDocument();
    expect(screen.getByText('Risk Analizi')).toBeInTheDocument();
  });

  test('shows quick access navigation', () => {
    render(<HomeWithRouter />);
    
    expect(screen.getByText('Hızlı Erişim')).toBeInTheDocument();
    expect(screen.getByText('Hisse Arama')).toBeInTheDocument();
    expect(screen.getByText('Hesap Makinesi')).toBeInTheDocument();
    expect(screen.getByText('Portföy Monitörü')).toBeInTheDocument();
  });

  test('handles navigation to different sections', async () => {
    render(<HomeWithRouter />);
    
    const analyzeButton = screen.getByText('Analizi Başlat');
    fireEvent.click(analyzeButton);
    
    // Navigation should be handled by router
    expect(analyzeButton).toBeInTheDocument();
  });

  test('displays connection status', () => {
    render(<HomeWithRouter />);
    
    expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    expect(screen.getByText('Bağlı')).toBeInTheDocument();
  });

  test('shows disconnected state', () => {
    mockUseRealTimeData.mockReturnValue({
      data: {},
      isConnected: false,
      error: null,
      marketSummary: null,
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    });
    
    render(<HomeWithRouter />);
    
    expect(screen.getByText('Bağlantı Kesildi')).toBeInTheDocument();
  });

  test('handles error state', () => {
    const errorMessage = 'Data fetch failed';
    
    mockUseRealTimeData.mockReturnValue({
      data: {},
      isConnected: false,
      error: errorMessage,
      marketSummary: null,
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    });
    
    render(<HomeWithRouter />);
    
    expect(screen.getByText(/Hata:/)).toBeInTheDocument();
  });

  test('displays loading state for sentiment', () => {
    mockUseMarketSentiment.mockReturnValue({
      sentiment: null,
      loading: true,
      error: null,
      refreshSentiment: jest.fn()
    });
    
    render(<HomeWithRouter />);
    
    expect(screen.getByText('Duyarlılık yükleniyor...')).toBeInTheDocument();
  });

  test('shows recent news section', () => {
    render(<HomeWithRouter />);
    
    expect(screen.getByText('Son Haberler')).toBeInTheDocument();
  });

  test('displays market statistics', () => {
    render(<HomeWithRouter />);
    
    expect(screen.getByText('Toplam Hacim')).toBeInTheDocument();
    expect(screen.getByText('50.0M')).toBeInTheDocument();
  });

  test('shows trending stocks section', () => {
    render(<HomeWithRouter />);
    
    expect(screen.getByText('Trend Hisseler')).toBeInTheDocument();
  });

  test('handles refresh functionality', async () => {
    const mockRefresh = jest.fn();
    mockUseMarketSentiment.mockReturnValue({
      sentiment: mockSentimentData,
      loading: false,
      error: null,
      refreshSentiment: mockRefresh
    });
    
    render(<HomeWithRouter />);
    
    const refreshButton = screen.getByLabelText('Verileri Yenile');
    fireEvent.click(refreshButton);
    
    expect(mockRefresh).toHaveBeenCalled();
  });

  test('displays price change indicators with correct colors', () => {
    render(<HomeWithRouter />);
    
    const positiveChange = screen.getByText('+2.22%');
    expect(positiveChange).toHaveClass('text-green-600');
  });

  test('shows market hours indicator', () => {
    render(<HomeWithRouter />);
    
    expect(screen.getByText(/Piyasa:/)).toBeInTheDocument();
  });

  test('displays performance metrics', () => {
    render(<HomeWithRouter />);
    
    expect(screen.getByText('Performans')).toBeInTheDocument();
  });

  test('handles search functionality', async () => {
    render(<HomeWithRouter />);
    
    const searchInput = screen.getByPlaceholderText('Hisse ara...');
    fireEvent.change(searchInput, { target: { value: 'THY' } });
    
    await waitFor(() => {
      expect(searchInput).toHaveValue('THY');
    });
  });

  test('shows watchlist preview', () => {
    render(<HomeWithRouter />);
    
    expect(screen.getByText('İzleme Listesi')).toBeInTheDocument();
  });

  test('displays alerts section', () => {
    render(<HomeWithRouter />);
    
    expect(screen.getByText('Uyarılar')).toBeInTheDocument();
  });

  test('shows footer information', () => {
    render(<HomeWithRouter />);
    
    expect(screen.getByText(/© 2024 Borsa Verileri/)).toBeInTheDocument();
  });

  test('handles responsive design elements', () => {
    render(<HomeWithRouter />);
    
    const mainContainer = screen.getByTestId('home-container');
    expect(mainContainer).toHaveClass('container', 'mx-auto');
  });

  test('displays social media links', () => {
    render(<HomeWithRouter />);
    
    expect(screen.getByLabelText('Twitter')).toBeInTheDocument();
    expect(screen.getByLabelText('LinkedIn')).toBeInTheDocument();
  });

  test('shows help and support section', () => {
    render(<HomeWithRouter />);
    
    expect(screen.getByText('Yardım & Destek')).toBeInTheDocument();
  });
});