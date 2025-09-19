import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { io } from 'socket.io-client';

// Mock socket.io-client
jest.mock('socket.io-client');
const mockIo = io as jest.MockedFunction<typeof io>;

describe('App Component', () => {
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders main components', () => {
    render(<App />);
    
    expect(screen.getByText('Borsa Analiz Sistemi')).toBeInTheDocument();
    expect(screen.getByText('Hisse Senedi Arama')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Hisse kodu girin (örn: THYAO)')).toBeInTheDocument();
  });

  it('shows connection status', () => {
    render(<App />);
    
    // Should show connected status by default (mocked as connected)
    expect(screen.getByText('Bağlı')).toBeInTheDocument();
  });

  it('handles stock search input', async () => {
    render(<App />);
    
    const searchInput = screen.getByPlaceholderText('Hisse kodu girin (örn: THYAO)');
    
    fireEvent.change(searchInput, { target: { value: 'THYAO' } });
    
    expect(searchInput).toHaveValue('THYAO');
  });

  it('handles search button click', async () => {
    render(<App />);
    
    const searchInput = screen.getByPlaceholderText('Hisse kodu girin (örn: THYAO)');
    const searchButton = screen.getByText('Analiz Et');
    
    fireEvent.change(searchInput, { target: { value: 'THYAO' } });
    fireEvent.click(searchButton);
    
    expect(mockSocket.emit).toHaveBeenCalledWith('analyze-stock', 'THYAO');
  });

  it('handles Enter key press in search input', async () => {
    render(<App />);
    
    const searchInput = screen.getByPlaceholderText('Hisse kodu girin (örn: THYAO)');
    
    fireEvent.change(searchInput, { target: { value: 'AKBNK' } });
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });
    
    expect(mockSocket.emit).toHaveBeenCalledWith('analyze-stock', 'AKBNK');
  });

  it('displays error messages', async () => {
    render(<App />);
    
    // Simulate error from socket
    const errorCallback = mockSocket.on.mock.calls.find(
      (call: any) => call[0] === 'error'
    )?.[1];
    
    if (errorCallback) {
      errorCallback('Test error message');
    }
    
    await waitFor(() => {
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });
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

  it('handles stock analysis response', async () => {
    render(<App />);
    
    const mockAnalysisData = {
      stockCode: 'THYAO',
      financialData: {
        stockCode: 'THYAO',
        companyName: 'Türk Hava Yolları',
        totalAssets: 1000000,
        totalLiabilities: 500000,
        equity: 500000,
        currentAssets: 300000,
        shortTermLiabilities: 200000,
        netProfit: 50000,
        lastUpdated: new Date()
      },
      analysis: {
        currentRatio: 1.5,
        debtToEquity: 1.0,
        roe: 0.1,
        riskLevel: 'Orta',
        recommendation: 'Al'
      }
    };
    
    // Simulate analysis response
    const analysisCallback = mockSocket.on.mock.calls.find(
      (call: unknown[]) => call[0] === 'analysis-result'
    )?.[1];
    
    if (analysisCallback) {
      analysisCallback(mockAnalysisData);
    }
    
    await waitFor(() => {
      expect(screen.getByText('THYAO - Türk Hava Yolları')).toBeInTheDocument();
      expect(screen.getByText('Cari Oran: 1.50')).toBeInTheDocument();
      expect(screen.getByText('Borç/Özkaynak: 1.00')).toBeInTheDocument();
    });
  });

  it('validates empty search input', async () => {
    render(<App />);
    
    const searchButton = screen.getByText('Analiz Et');
    
    fireEvent.click(searchButton);
    
    // Should not emit analyze-stock event with empty input
    expect(mockSocket.emit).not.toHaveBeenCalledWith('analyze-stock', '');
  });

  it('converts stock code to uppercase', async () => {
    render(<App />);
    
    const searchInput = screen.getByPlaceholderText('Hisse kodu girin (örn: THYAO)');
    const searchButton = screen.getByText('Analiz Et');
    
    fireEvent.change(searchInput, { target: { value: 'thyao' } });
    fireEvent.click(searchButton);
    
    expect(mockSocket.emit).toHaveBeenCalledWith('analyze-stock', 'THYAO');
  });

  it('cleans up socket connection on unmount', () => {
    const { unmount } = render(<App />);
    
    unmount();
    
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});