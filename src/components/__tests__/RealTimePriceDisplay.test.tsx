import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RealTimePriceDisplay from '../RealTimePriceDisplay';
import { useRealTimeData } from '../../hooks/useRealTimeData';

// Mock the useRealTimeData hook
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
  }
};

describe('RealTimePriceDisplay Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseRealTimeData.mockReturnValue({
      data: mockStockData,
      isConnected: true,
      error: null,
      marketSummary: null,
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    });
  });

  test('renders stock price information', () => {
    render(<RealTimePriceDisplay stockCode="THYAO" />);
    
    expect(screen.getByText('THYAO')).toBeInTheDocument();
    expect(screen.getByText('147.5')).toBeInTheDocument();
    expect(screen.getByText('+3.2')).toBeInTheDocument();
    expect(screen.getByText('(+2.22%)')).toBeInTheDocument();
  });

  test('displays positive price change with green color', () => {
    render(<RealTimePriceDisplay stockCode="THYAO" />);
    
    const changeElement = screen.getByText('+3.2');
    const percentElement = screen.getByText('(+2.22%)');
    
    expect(changeElement).toHaveClass('text-green-600');
    expect(percentElement).toHaveClass('text-green-600');
  });

  test('displays negative price change with red color', () => {
    const negativeStockData = {
      AKBNK: {
        symbol: 'AKBNK',
        price: 45.8,
        change: -0.5,
        changePercent: -1.08,
        volume: 2000000,
        timestamp: '2024-01-01T12:00:00Z'
      }
    };
    
    mockUseRealTimeData.mockReturnValue({
      data: negativeStockData,
      isConnected: true,
      error: null,
      marketSummary: null,
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    });
    
    render(<RealTimePriceDisplay stockCode="AKBNK" />);
    
    const changeElement = screen.getByText('-0.5');
    const percentElement = screen.getByText('(-1.08%)');
    
    expect(changeElement).toHaveClass('text-red-600');
    expect(percentElement).toHaveClass('text-red-600');
  });

  test('displays neutral price change with gray color', () => {
    const neutralStockData = {
      GARAN: {
        symbol: 'GARAN',
        price: 25.0,
        change: 0,
        changePercent: 0,
        volume: 1000000,
        timestamp: '2024-01-01T12:00:00Z'
      }
    };
    
    mockUseRealTimeData.mockReturnValue({
      data: neutralStockData,
      isConnected: true,
      error: null,
      marketSummary: null,
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    });
    
    render(<RealTimePriceDisplay stockCode="GARAN" />);
    
    const changeElement = screen.getByText('0.0');
    const percentElement = screen.getByText('(0.00%)');
    
    expect(changeElement).toHaveClass('text-gray-600');
    expect(percentElement).toHaveClass('text-gray-600');
  });

  test('shows loading state when data is not available', () => {
    mockUseRealTimeData.mockReturnValue({
      data: {},
      isConnected: true,
      error: null,
      marketSummary: null,
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    });
    
    render(<RealTimePriceDisplay stockCode="THYAO" />);
    
    expect(screen.getByText('Yükleniyor...')).toBeInTheDocument();
  });

  test('displays error state when connection fails', () => {
    mockUseRealTimeData.mockReturnValue({
      data: {},
      isConnected: false,
      error: 'Connection failed',
      marketSummary: null,
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    });
    
    render(<RealTimePriceDisplay stockCode="THYAO" />);
    
    expect(screen.getByText('Bağlantı Hatası')).toBeInTheDocument();
  });

  test('formats volume correctly', () => {
    render(<RealTimePriceDisplay stockCode="THYAO" />);
    
    // Volume should be formatted as 1.5M for 1500000
    expect(screen.getByText('Hacim: 1.5M')).toBeInTheDocument();
  });

  test('displays timestamp correctly', () => {
    render(<RealTimePriceDisplay stockCode="THYAO" />);
    
    expect(screen.getByText(/Son Güncelleme:/)).toBeInTheDocument();
  });

  test('subscribes to stock data on mount', () => {
    const mockSubscribe = jest.fn();
    
    mockUseRealTimeData.mockReturnValue({
      data: mockStockData,
      isConnected: true,
      error: null,
      marketSummary: null,
      subscribe: mockSubscribe,
      unsubscribe: jest.fn()
    });
    
    render(<RealTimePriceDisplay stockCode="THYAO" />);
    
    expect(mockSubscribe).toHaveBeenCalledWith('THYAO');
  });

  test('unsubscribes on unmount', () => {
    const mockUnsubscribe = jest.fn();
    
    mockUseRealTimeData.mockReturnValue({
      data: mockStockData,
      isConnected: true,
      error: null,
      marketSummary: null,
      subscribe: jest.fn(),
      unsubscribe: mockUnsubscribe
    });
    
    const { unmount } = render(<RealTimePriceDisplay stockCode="THYAO" />);
    
    unmount();
    
    expect(mockUnsubscribe).toHaveBeenCalledWith('THYAO');
  });

  test('updates when stock code changes', async () => {
    const mockSubscribe = jest.fn();
    const mockUnsubscribe = jest.fn();
    
    mockUseRealTimeData.mockReturnValue({
      data: mockStockData,
      isConnected: true,
      error: null,
      marketSummary: null,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe
    });
    
    const { rerender } = render(<RealTimePriceDisplay stockCode="THYAO" />);
    
    // Change stock code
    rerender(<RealTimePriceDisplay stockCode="AKBNK" />);
    
    await waitFor(() => {
      expect(mockUnsubscribe).toHaveBeenCalledWith('THYAO');
      expect(mockSubscribe).toHaveBeenCalledWith('AKBNK');
    });
  });

  test('handles real-time price updates', async () => {
    const { rerender } = render(<RealTimePriceDisplay stockCode="THYAO" />);
    
    // Update mock data with new price
    const updatedStockData = {
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
      marketSummary: null,
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    });
    
    rerender(<RealTimePriceDisplay stockCode="THYAO" />);
    
    await waitFor(() => {
      expect(screen.getByText('150.0')).toBeInTheDocument();
      expect(screen.getByText('+5.7')).toBeInTheDocument();
      expect(screen.getByText('(+3.95%)')).toBeInTheDocument();
    });
  });
});