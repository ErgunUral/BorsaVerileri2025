import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { io } from 'socket.io-client';
import StockSearch from '../StockSearch';

// Mock socket.io-client
jest.mock('socket.io-client');
const mockIo = io as jest.MockedFunction<typeof io>;

const mockOnStockSelect = jest.fn();

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
    lastUpdated: new Date('2024-01-01T12:00:00Z')
  }
};

describe('StockSearch Component', () => {
  let mockSocket: any;

  beforeEach(() => {
    mockSocket = {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      connected: true
    };
    
    mockIo.mockReturnValue(mockSocket);
    mockOnStockSelect.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders stock search component', () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    expect(screen.getByText('Hisse Senedi Arama')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Hisse kodu girin (örn: THYAO)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analiz Et' })).toBeInTheDocument();
  });

  it('handles search input changes', () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    const searchInput = screen.getByPlaceholderText('Hisse kodu girin (örn: THYAO)');
    
    fireEvent.change(searchInput, { target: { value: 'THYAO' } });
    
    expect(searchInput).toHaveValue('THYAO');
  });

  it('converts input to uppercase', () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    const searchInput = screen.getByPlaceholderText('Hisse kodu girin (örn: THYAO)');
    
    fireEvent.change(searchInput, { target: { value: 'thyao' } });
    
    expect(searchInput).toHaveValue('THYAO');
  });

  it('shows loading state during search', async () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    const searchInput = screen.getByPlaceholderText('Hisse kodu girin (örn: THYAO)');
    const searchButton = screen.getByRole('button', { name: 'Analiz Et' });
    
    fireEvent.change(searchInput, { target: { value: 'THYAO' } });
    fireEvent.click(searchButton);
    
    expect(screen.getByText('Analiz ediliyor...')).toBeInTheDocument();
    expect(searchButton).toBeDisabled();
  });

  it('emits analyze-stock event on search', () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    const searchInput = screen.getByPlaceholderText('Hisse kodu girin (örn: THYAO)');
    const searchButton = screen.getByRole('button', { name: 'Analiz Et' });
    
    fireEvent.change(searchInput, { target: { value: 'THYAO' } });
    fireEvent.click(searchButton);
    
    expect(mockSocket.emit).toHaveBeenCalledWith('analyze-stock', 'THYAO');
  });

  it('handles Enter key press in search input', () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    const searchInput = screen.getByPlaceholderText('Hisse kodu girin (örn: THYAO)');
    
    fireEvent.change(searchInput, { target: { value: 'AKBNK' } });
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });
    
    expect(mockSocket.emit).toHaveBeenCalledWith('analyze-stock', 'AKBNK');
  });

  it('prevents search with empty input', () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    const searchButton = screen.getByRole('button', { name: 'Analiz Et' });
    
    fireEvent.click(searchButton);
    
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it('shows suggestions when typing', async () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    const searchInput = screen.getByPlaceholderText('Hisse kodu girin (örn: THYAO)');
    
    fireEvent.change(searchInput, { target: { value: 'TH' } });
    
    await waitFor(() => {
      expect(screen.getByText('THYAO')).toBeInTheDocument();
      expect(screen.getByText('TSKB')).toBeInTheDocument();
    });
  });

  it('selects suggestion on click', async () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    const searchInput = screen.getByPlaceholderText('Hisse kodu girin (örn: THYAO)');
    
    fireEvent.change(searchInput, { target: { value: 'TH' } });
    
    await waitFor(() => {
      expect(screen.getByText('THYAO')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('THYAO'));
    
    expect(searchInput).toHaveValue('THYAO');
  });

  it('hides suggestions when clicking outside', async () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    const searchInput = screen.getByPlaceholderText('Hisse kodu girin (örn: THYAO)');
    
    fireEvent.change(searchInput, { target: { value: 'TH' } });
    
    await waitFor(() => {
      expect(screen.getByText('THYAO')).toBeInTheDocument();
    });
    
    fireEvent.click(document.body);
    
    await waitFor(() => {
      expect(screen.queryByText('THYAO')).not.toBeInTheDocument();
    });
  });

  it('handles successful analysis response', async () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    // Simulate analysis response
    const analysisCallback = mockSocket.on.mock.calls.find(
      (call: any) => call[0] === 'analysis-result'
    )?.[1];
    
    if (analysisCallback) {
      analysisCallback(mockStockData);
    }
    
    await waitFor(() => {
      expect(mockOnStockSelect).toHaveBeenCalledWith(mockStockData);
    });
  });

  it('handles analysis error', async () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    // Simulate error response
    const errorCallback = mockSocket.on.mock.calls.find(
      (call: any) => call[0] === 'analysis-error'
    )?.[1];
    
    if (errorCallback) {
      errorCallback('Hisse bulunamadı');
    }
    
    await waitFor(() => {
      expect(screen.getByText('Hata: Hisse bulunamadı')).toBeInTheDocument();
    });
  });

  it('shows connection status', () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    expect(screen.getByText('Bağlı')).toBeInTheDocument();
  });

  it('handles disconnection', async () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    // Simulate disconnect
    const disconnectCallback = mockSocket.on.mock.calls.find(
      (call: any) => call[0] === 'disconnect'
    )?.[1];
    
    if (disconnectCallback) {
      disconnectCallback();
    }
    
    await waitFor(() => {
      expect(screen.getByText('Bağlantı Kesildi')).toBeInTheDocument();
    });
  });

  it('shows popular stocks section', () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    expect(screen.getByText('Popüler Hisseler')).toBeInTheDocument();
    expect(screen.getByText('THYAO')).toBeInTheDocument();
    expect(screen.getByText('AKBNK')).toBeInTheDocument();
    expect(screen.getByText('GARAN')).toBeInTheDocument();
  });

  it('searches popular stock on click', () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    const popularStock = screen.getAllByText('THYAO')[0]; // First occurrence in popular stocks
    fireEvent.click(popularStock);
    
    expect(mockSocket.emit).toHaveBeenCalledWith('analyze-stock', 'THYAO');
  });

  it('shows recent searches', async () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    // First search
    const searchInput = screen.getByPlaceholderText('Hisse kodu girin (örn: THYAO)');
    fireEvent.change(searchInput, { target: { value: 'THYAO' } });
    fireEvent.click(screen.getByRole('button', { name: 'Analiz Et' }));
    
    // Should show in recent searches
    await waitFor(() => {
      expect(screen.getByText('Son Aramalar')).toBeInTheDocument();
    });
  });

  it('clears recent searches', async () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    // Add a search first
    const searchInput = screen.getByPlaceholderText('Hisse kodu girin (örn: THYAO)');
    fireEvent.change(searchInput, { target: { value: 'THYAO' } });
    fireEvent.click(screen.getByRole('button', { name: 'Analiz Et' }));
    
    await waitFor(() => {
      expect(screen.getByText('Son Aramalar')).toBeInTheDocument();
    });
    
    const clearButton = screen.getByRole('button', { name: 'Temizle' });
    fireEvent.click(clearButton);
    
    expect(screen.queryByText('Son Aramalar')).not.toBeInTheDocument();
  });

  it('validates stock code format', () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    const searchInput = screen.getByPlaceholderText('Hisse kodu girin (örn: THYAO)');
    
    // Invalid characters should be filtered
    fireEvent.change(searchInput, { target: { value: 'TH123@#' } });
    
    expect(searchInput).toHaveValue('TH');
  });

  it('limits input length', () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    const searchInput = screen.getByPlaceholderText('Hisse kodu girin (örn: THYAO)');
    
    // Should limit to reasonable length (e.g., 10 characters)
    fireEvent.change(searchInput, { target: { value: 'VERYLONGSTOCKCODE' } });
    
    expect(searchInput.value.length).toBeLessThanOrEqual(10);
  });

  it('shows search statistics', () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    expect(screen.getByText(/toplam.*hisse/i)).toBeInTheDocument();
  });

  it('handles rapid successive searches', async () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    const searchInput = screen.getByPlaceholderText('Hisse kodu girin (örn: THYAO)');
    const searchButton = screen.getByRole('button', { name: 'Analiz Et' });
    
    // First search
    fireEvent.change(searchInput, { target: { value: 'THYAO' } });
    fireEvent.click(searchButton);
    
    // Second search immediately
    fireEvent.change(searchInput, { target: { value: 'AKBNK' } });
    fireEvent.click(searchButton);
    
    // Should handle gracefully without errors
    expect(mockSocket.emit).toHaveBeenCalledTimes(2);
  });

  it('cleans up socket listeners on unmount', () => {
    const { unmount } = render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    unmount();
    
    expect(mockSocket.off).toHaveBeenCalled();
  });
});