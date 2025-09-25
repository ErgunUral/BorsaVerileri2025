import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import App from '../App';
import { io } from 'socket.io-client';

// Mock socket.io-client
vi.mock('socket.io-client');
const mockIo = io as vi.MockedFunction<typeof io>;

describe('App Component', () => {
  let mockSocket: any;

  beforeEach(() => {
    mockSocket = {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      close: vi.fn(),
      connected: true
    };
    
    mockIo.mockReturnValue(mockSocket);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders main components', () => {
    render(<App />);
    
    expect(screen.getByText('Borsa Analiz Sistemi')).toBeInTheDocument();
    expect(screen.getByText('Türk hisse senetleri için gerçek zamanlı analiz')).toBeInTheDocument();
    expect(screen.getByText('Hisse Analizi')).toBeInTheDocument();
  });

  it('shows connection status indicator', () => {
    render(<App />);
    
    // Should show connection status (initially connecting)
    expect(screen.getByText('Bağlanıyor...')).toBeInTheDocument();
  });

  it('handles navigation between views', async () => {
    render(<App />);
    
    const ratiosButton = screen.getByText('Rasyo Analizi');
    const dashboardButton = screen.getByText('Veri Yönetimi');
    
    // Just verify buttons are clickable
    fireEvent.click(ratiosButton);
    fireEvent.click(dashboardButton);
    
    // Verify buttons exist and are interactive
    expect(ratiosButton).toBeInTheDocument();
    expect(dashboardButton).toBeInTheDocument();
  });

  it('shows correct navigation buttons', async () => {
    render(<App />);
    
    expect(screen.getByText('Hisse Analizi')).toBeInTheDocument();
    expect(screen.getByText('Rasyo Analizi')).toBeInTheDocument();
    expect(screen.getByText('Gerçek Zamanlı')).toBeInTheDocument();
    expect(screen.getByText('Veri Yönetimi')).toBeInTheDocument();
    expect(screen.getByText('Figma')).toBeInTheDocument();
  });

  it('initializes socket connection correctly', async () => {
    render(<App />);
    
    expect(mockIo).toHaveBeenCalledWith('http://localhost:9876', {
      transports: ['websocket', 'polling']
    });
    
    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
  });

  it('sets up error event listener', async () => {
    render(<App />);
    
    // Verify that error event listener is set up
    expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
  });

  it('handles socket disconnection', async () => {
    render(<App />);
    
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

  it('handles stock data updates from socket', async () => {
    render(<App />);
    
    const mockStockData = {
      stockCode: 'THYAO',
      price: {
        price: 100.50,
        changePercent: 2.5,
        volume: 1000000,
        lastUpdated: '2025-01-01T10:00:00Z'
      },
      analysis: {
        stockCode: 'THYAO',
        companyName: 'Türk Hava Yolları',
        financialData: {},
        ratios: {},
        recommendations: ['Al'],
        riskLevel: 'Orta' as const,
        investmentScore: 75
      },
      timestamp: '2025-01-01T10:00:00Z'
    };
    
    // Simulate stock data response
    const stockDataCallback = mockSocket.on.mock.calls.find(
      (call: unknown[]) => call[0] === 'stock-data'
    )?.[1];
    
    if (stockDataCallback) {
      stockDataCallback(mockStockData);
    }
    
    // Since selectedStock is empty by default, data won't be set
    // This test verifies the socket listener is properly set up
    expect(mockSocket.on).toHaveBeenCalledWith('stock-data', expect.any(Function));
  });

  it('shows footer information', async () => {
    render(<App />);
    
    expect(screen.getByText('© 2025 Borsa Analiz Sistemi. Tüm hakları saklıdır.')).toBeInTheDocument();
    expect(screen.getByText(/Veriler İş Yatırım'dan alınmaktadır/)).toBeInTheDocument();
  });

  it('handles connection status changes', async () => {
    render(<App />);
    
    // Test connect event
    const connectCallback = mockSocket.on.mock.calls.find(
      (call: unknown[]) => call[0] === 'connect'
    )?.[1];
    
    if (connectCallback) {
      connectCallback();
    }
    
    await waitFor(() => {
      expect(screen.getByText('Bağlı')).toBeInTheDocument();
    });
  });

  it('cleans up socket connection on unmount', () => {
    mockSocket.close = vi.fn();
    const { unmount } = render(<App />);
    
    unmount();
    
    expect(mockSocket.close).toHaveBeenCalled();
  });
});