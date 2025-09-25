import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RealTimeStockDashboard from '../RealTimeStockDashboard';
import { useRealTimeData } from '../../hooks/useRealTimeData';

// Mock hooks
jest.mock('../../hooks/useRealTimeData');
const mockUseRealTimeData = useRealTimeData as jest.MockedFunction<typeof useRealTimeData>;

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
  },
  GARAN: {
    symbol: 'GARAN',
    price: 25.0,
    change: 1.2,
    changePercent: 5.0,
    volume: 3000000,
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

describe('RealTimeStockDashboard Page', () => {
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
  });

  test('renders dashboard title', () => {
    render(<RealTimeStockDashboard />);
    
    expect(screen.getByText('Gerçek Zamanlı Borsa Verileri')).toBeInTheDocument();
  });

  test('displays market summary cards', () => {
    render(<RealTimeStockDashboard />);
    
    expect(screen.getByText('Toplam Hisse')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Yükselenler')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('Düşenler')).toBeInTheDocument();
    expect(screen.getByText('35')).toBeInTheDocument();
  });

  test('shows stock list with data', () => {
    render(<RealTimeStockDashboard />);
    
    expect(screen.getByText('THYAO')).toBeInTheDocument();
    expect(screen.getByText('147.5')).toBeInTheDocument();
    expect(screen.getByText('AKBNK')).toBeInTheDocument();
    expect(screen.getByText('45.8')).toBeInTheDocument();
  });

  test('filters stocks by search term', async () => {
    render(<RealTimeStockDashboard />);
    
    const searchInput = screen.getByPlaceholderText('Hisse ara...');
    fireEvent.change(searchInput, { target: { value: 'THY' } });
    
    await waitFor(() => {
      expect(screen.getByText('THYAO')).toBeInTheDocument();
      expect(screen.queryByText('AKBNK')).not.toBeInTheDocument();
    });
  });

  test('sorts stocks by different criteria', async () => {
    render(<RealTimeStockDashboard />);
    
    const sortSelect = screen.getByDisplayValue('Sembol');
    fireEvent.change(sortSelect, { target: { value: 'price' } });
    
    await waitFor(() => {
      // Should sort by price (highest first in desc order)
      const stockElements = screen.getAllByTestId('stock-row');
      expect(stockElements[0]).toHaveTextContent('THYAO'); // 147.5
      expect(stockElements[1]).toHaveTextContent('AKBNK'); // 45.8
    });
  });

  test('toggles between view modes', async () => {
    render(<RealTimeStockDashboard />);
    
    // Switch to gainers view
    const gainersTab = screen.getByText('Yükselenler');
    fireEvent.click(gainersTab);
    
    await waitFor(() => {
      expect(screen.getByText('THYAO')).toBeInTheDocument(); // +2.22%
      expect(screen.getByText('GARAN')).toBeInTheDocument(); // +5.0%
      expect(screen.queryByText('AKBNK')).not.toBeInTheDocument(); // -1.08%
    });
  });

  test('manages watchlist functionality', async () => {
    render(<RealTimeStockDashboard />);
    
    // Add stock to watchlist
    const addToWatchlistButton = screen.getAllByLabelText('İzleme listesine ekle')[0];
    fireEvent.click(addToWatchlistButton);
    
    // Switch to watchlist view
    const watchlistTab = screen.getByText('İzleme Listesi');
    fireEvent.click(watchlistTab);
    
    await waitFor(() => {
      expect(screen.getByText('THYAO')).toBeInTheDocument();
    });
  });

  test('handles auto-refresh toggle', () => {
    render(<RealTimeStockDashboard />);
    
    const autoRefreshToggle = screen.getByLabelText('Otomatik Yenileme');
    expect(autoRefreshToggle).toBeChecked();
    
    fireEvent.click(autoRefreshToggle);
    expect(autoRefreshToggle).not.toBeChecked();
  });

  test('adjusts refresh interval', async () => {
    render(<RealTimeStockDashboard />);
    
    const intervalSelect = screen.getByDisplayValue('30 saniye');
    fireEvent.change(intervalSelect, { target: { value: '60' } });
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('60 saniye')).toBeInTheDocument();
    });
  });

  test('displays connection status', () => {
    render(<RealTimeStockDashboard />);
    
    expect(screen.getByText('Bağlı')).toBeInTheDocument();
    expect(screen.getByTestId('connection-indicator')).toHaveClass('bg-green-500');
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
    
    render(<RealTimeStockDashboard />);
    
    expect(screen.getByText('Bağlantı Kesildi')).toBeInTheDocument();
    expect(screen.getByTestId('connection-indicator')).toHaveClass('bg-red-500');
  });

  test('handles error state', () => {
    const errorMessage = 'WebSocket connection failed';
    
    mockUseRealTimeData.mockReturnValue({
      data: {},
      isConnected: false,
      error: errorMessage,
      marketSummary: null,
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    });
    
    render(<RealTimeStockDashboard />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('displays price change indicators correctly', () => {
    render(<RealTimeStockDashboard />);
    
    // Positive change (green)
    const positiveChange = screen.getByText('+2.22%');
    expect(positiveChange).toHaveClass('text-green-600');
    
    // Negative change (red)
    const negativeChange = screen.getByText('-1.08%');
    expect(negativeChange).toHaveClass('text-red-600');
  });

  test('formats volume correctly', () => {
    render(<RealTimeStockDashboard />);
    
    expect(screen.getByText('1.5M')).toBeInTheDocument(); // 1500000
    expect(screen.getByText('2.0M')).toBeInTheDocument(); // 2000000
    expect(screen.getByText('3.0M')).toBeInTheDocument(); // 3000000
  });

  test('shows stock selection controls', () => {
    render(<RealTimeStockDashboard />);
    
    expect(screen.getByText('Hisse Seçimi')).toBeInTheDocument();
    expect(screen.getByText('AKBNK')).toBeInTheDocument();
    expect(screen.getByText('GARAN')).toBeInTheDocument();
    expect(screen.getByText('THYAO')).toBeInTheDocument();
  });

  test('handles stock selection changes', async () => {
    render(<RealTimeStockDashboard />);
    
    const stockCheckbox = screen.getByLabelText('THYAO');
    fireEvent.click(stockCheckbox);
    
    await waitFor(() => {
      expect(stockCheckbox).not.toBeChecked();
    });
  });

  test('displays last update timestamp', () => {
    render(<RealTimeStockDashboard />);
    
    expect(screen.getByText(/Son Güncelleme:/)).toBeInTheDocument();
  });

  test('shows loading state when no data', () => {
    mockUseRealTimeData.mockReturnValue({
      data: {},
      isConnected: true,
      error: null,
      marketSummary: null,
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    });
    
    render(<RealTimeStockDashboard />);
    
    expect(screen.getByText('Veriler yükleniyor...')).toBeInTheDocument();
  });

  test('handles real-time data updates', async () => {
    const { rerender } = render(<RealTimeStockDashboard />);
    
    // Update mock data
    const updatedStockData = {
      ...mockStockData,
      THYAO: {
        ...mockStockData.THYAO,
        price: 150.0,
        change: 5.7,
        changePercent: 3.95
      }
    };
    
    mockUseRealTimeData.mockReturnValue({
      data: updatedStockData,
      isConnected: true,
      error: null,
      marketSummary: mockMarketSummary,
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    });
    
    rerender(<RealTimeStockDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('150.0')).toBeInTheDocument();
      expect(screen.getByText('+3.95%')).toBeInTheDocument();
    });
  });
});