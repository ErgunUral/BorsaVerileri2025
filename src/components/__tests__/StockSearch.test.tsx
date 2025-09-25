import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StockSearch from '../StockSearch';

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock Socket.IO
const mockSocket = {
  on: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn()
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket)
}));

describe('StockSearch Component', () => {
  const mockOnStockSelect = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    mockSocket.on.mockClear();
    mockSocket.emit.mockClear();
    mockSocket.disconnect.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render search input', () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    const searchInput = screen.getByPlaceholderText(/hisse kodu giriniz/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('should handle search input changes', async () => {
    const user = userEvent.setup();
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    const searchInput = screen.getByRole('textbox');
    await user.type(searchInput, 'THYAO');
    
    expect(searchInput).toHaveValue('THYAO');
  });

  it('should perform search on form submit', async () => {
    const user = userEvent.setup();
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    const searchInput = screen.getByRole('textbox');
    await user.type(searchInput, 'THYAO');
    
    const submitButton = screen.getByRole('button', { type: 'submit' });
    await user.click(submitButton);
    
    // Socket.IO emit should be called
    expect(searchInput).toHaveValue('THYAO');
  });

  it('should display popular stocks section', () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    expect(screen.getByText('Popüler Hisseler')).toBeInTheDocument();
  });

  it('should show loading state', async () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    const user = userEvent.setup();
    const searchInput = screen.getByRole('textbox');
    await user.type(searchInput, 'THYAO');
    
    const submitButton = screen.getByRole('button', { type: 'submit' });
    await user.click(submitButton);
    
    // Should show loading text
    expect(screen.getByText('Hisse verisi çekiliyor...')).toBeInTheDocument();
  });

  it('should handle invalid stock code format', async () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    const user = userEvent.setup();
    const searchInput = screen.getByRole('textbox');
    await user.type(searchInput, 'AB');
    
    const submitButton = screen.getByRole('button', { type: 'submit' });
    await user.click(submitButton);
    
    // Should show error for invalid format
    await waitFor(() => {
      expect(screen.getByText(/Geçersiz hisse kodu formatı/)).toBeInTheDocument();
    });
  });

  it('should disable submit button for empty input', () => {
    render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    const searchInput = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { type: 'submit' });
    
    // Ensure input is empty and button is disabled
    expect(searchInput).toHaveValue('');
    expect(submitButton).toBeDisabled();
  });

  it('should fetch and display popular stocks', async () => {
    const mockPopularStocks = { stocks: ['THYAO', 'AKBNK', 'GARAN'] };
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPopularStocks
    });

    render(<StockSearch onStockSelect={mockOnStockSelect} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/stocks/popular');
    });

    await waitFor(() => {
      expect(screen.getByText('THYAO')).toBeInTheDocument();
      expect(screen.getByText('AKBNK')).toBeInTheDocument();
      expect(screen.getByText('GARAN')).toBeInTheDocument();
    });
  });

  it('should handle popular stocks API error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (fetch as any).mockRejectedValueOnce(new Error('API Error'));

    render(<StockSearch onStockSelect={mockOnStockSelect} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Popüler hisseler yüklenemedi:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('should load recent searches from localStorage', () => {
    const recentSearches = ['THYAO', 'AKBNK'];
    localStorageMock.getItem.mockReturnValue(JSON.stringify(recentSearches));

    render(<StockSearch onStockSelect={mockOnStockSelect} />);

    expect(localStorageMock.getItem).toHaveBeenCalledWith('recentStockSearches');
    expect(screen.getByText('Son Aramalar')).toBeInTheDocument();
  });

  it('should show suggestions when typing', async () => {
    const mockPopularStocks = { stocks: ['THYAO', 'TUPRS', 'TCELL'] };
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPopularStocks
    });

    const user = userEvent.setup();
    render(<StockSearch onStockSelect={mockOnStockSelect} />);

    // Wait for popular stocks to load
    await waitFor(() => {
      expect(screen.getByText('THYAO')).toBeInTheDocument();
    });

    const searchInput = screen.getByRole('textbox');
    await user.type(searchInput, 'TH');

    await waitFor(() => {
      expect(screen.getByText('THYAO')).toBeInTheDocument();
    });
  });

  it('should hide suggestions when clicking outside', async () => {
    const mockPopularStocks = { stocks: ['THYAO', 'TUPRS'] };
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPopularStocks
    });

    const user = userEvent.setup();
    render(<StockSearch onStockSelect={mockOnStockSelect} />);

    // Wait for popular stocks to load
    await waitFor(() => {
      expect(screen.getByText('THYAO')).toBeInTheDocument();
    });

    const searchInput = screen.getByRole('textbox');
    await user.type(searchInput, 'TH');

    // Click outside
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      const suggestions = screen.queryByRole('button', { name: /THYAO/ });
      expect(suggestions).not.toBeInTheDocument();
    });
  });

  it('should handle suggestion click', async () => {
    const mockPopularStocks = { stocks: ['THYAO', 'TUPRS'] };
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPopularStocks
    });

    const user = userEvent.setup();
    render(<StockSearch onStockSelect={mockOnStockSelect} />);

    // Wait for popular stocks to load
    await waitFor(() => {
      expect(screen.getByText('THYAO')).toBeInTheDocument();
    });

    const searchInput = screen.getByRole('textbox');
    await user.type(searchInput, 'TH');

    // Click on suggestion
    const suggestion = screen.getByRole('button', { name: /THYAO/ });
    await user.click(suggestion);

    expect(searchInput).toHaveValue('THYAO');
    expect(mockSocket.emit).toHaveBeenCalledWith('subscribe-stock', 'THYAO');
  });

  it('should handle quick search from popular stocks', async () => {
    const mockPopularStocks = { stocks: ['THYAO', 'AKBNK'] };
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPopularStocks
    });

    const user = userEvent.setup();
    render(<StockSearch onStockSelect={mockOnStockSelect} />);

    // Wait for popular stocks to load
    await waitFor(() => {
      expect(screen.getByText('THYAO')).toBeInTheDocument();
    });

    const popularStockButton = screen.getByRole('button', { name: 'THYAO' });
    await user.click(popularStockButton);

    const searchInput = screen.getByRole('textbox');
    expect(searchInput).toHaveValue('THYAO');
    expect(mockSocket.emit).toHaveBeenCalledWith('subscribe-stock', 'THYAO');
  });

  it('should handle socket stock-data event', async () => {
    const mockStockData = {
      stockCode: 'THYAO',
      price: { price: 100, changePercent: 5.2, volume: 1000000, lastUpdated: '2024-01-01' },
      timestamp: '2024-01-01T10:00:00Z'
    };

    render(<StockSearch onStockSelect={mockOnStockSelect} />);

    // Simulate socket event
    const stockDataCallback = mockSocket.on.mock.calls.find(call => call[0] === 'stock-data')[1];
    stockDataCallback(mockStockData);

    expect(mockOnStockSelect).toHaveBeenCalledWith(mockStockData);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'recentStockSearches',
      JSON.stringify(['THYAO'])
    );
  });

  it('should handle socket stock-error event', async () => {
    const mockError = { stockCode: 'INVALID', error: 'Stock not found' };

    render(<StockSearch onStockSelect={mockOnStockSelect} />);

    // Simulate socket error event
    const errorCallback = mockSocket.on.mock.calls.find(call => call[0] === 'stock-error')[1];
    errorCallback(mockError);

    await waitFor(() => {
      expect(screen.getByText('INVALID: Stock not found')).toBeInTheDocument();
    });
  });

  it('should validate stock code format', async () => {
    const user = userEvent.setup();
    render(<StockSearch onStockSelect={mockOnStockSelect} />);

    const searchInput = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { type: 'submit' });

    // Test too short code
    await user.type(searchInput, 'AB');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Geçersiz hisse kodu formatı/)).toBeInTheDocument();
    });

    // Clear and test too long code
    await user.clear(searchInput);
    await user.type(searchInput, 'TOOLONG');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Geçersiz hisse kodu formatı/)).toBeInTheDocument();
    });
  });

  it('should show error for empty search', async () => {
    const user = userEvent.setup();
    render(<StockSearch onStockSelect={mockOnStockSelect} />);

    const searchInput = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { type: 'submit' });

    await user.type(searchInput, '   '); // Only spaces
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Lütfen bir hisse kodu giriniz')).toBeInTheDocument();
    });
  });

  it('should convert input to uppercase', async () => {
    const user = userEvent.setup();
    render(<StockSearch onStockSelect={mockOnStockSelect} />);

    const searchInput = screen.getByRole('textbox');
    await user.type(searchInput, 'thyao');

    expect(searchInput).toHaveValue('THYAO');
  });

  it('should limit input to 6 characters', async () => {
    const user = userEvent.setup();
    render(<StockSearch onStockSelect={mockOnStockSelect} />);

    const searchInput = screen.getByRole('textbox');
    expect(searchInput).toHaveAttribute('maxLength', '6');
  });

  it('should disconnect socket on unmount', () => {
    const { unmount } = render(<StockSearch onStockSelect={mockOnStockSelect} />);
    
    unmount();
    
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});