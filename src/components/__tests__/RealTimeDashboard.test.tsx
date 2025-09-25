import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import RealTimeDashboard from '../RealTimeDashboard';
import { io } from 'socket.io-client';

// Mock socket.io-client
vi.mock('socket.io-client');

const mockSocket = {
  on: vi.fn(),
  emit: vi.fn(),
  close: vi.fn(),
  connected: true
};

const mockIo = vi.mocked(io);

const mockBist100Data = {
  successful: [
    {
      stockCode: 'THYAO',
      price: 125.50,
      changePercent: 2.30,
      volume: 1250000,
      lastUpdated: '2024-01-15T10:30:00Z',
      cached: false
    },
    {
      stockCode: 'AKBNK',
      price: 45.20,
      changePercent: -1.80,
      volume: 2500000,
      lastUpdated: '2024-01-15T10:30:00Z',
      cached: false
    }
  ],
  failed: [],
  summary: {
    total: 2,
    successful: 2,
    failed: 0,
    responseTime: 150
  },
  timestamp: '2024-01-15T10:30:00Z'
};

const mockServiceStatus = {
  isRunning: true,
  autoUpdateEnabled: false,
  lastUpdate: '2024-01-15T10:30:00Z',
  totalRequests: 100,
  successfulRequests: 95,
  failedRequests: 5,
  averageResponseTime: 200
};

describe('RealTimeDashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIo.mockReturnValue(mockSocket as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render dashboard with initial state', () => {
    render(<RealTimeDashboard />);
    
    expect(screen.getByText('Real-Time Dashboard')).toBeInTheDocument();
    expect(screen.getByText('BIST 100')).toBeInTheDocument();
    expect(screen.getByText('Popular Stocks')).toBeInTheDocument();
  });

  it('should establish socket connection on mount', () => {
    render(<RealTimeDashboard />);
    
    expect(mockIo).toHaveBeenCalledWith('http://localhost:9876');
    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
  });

  it('should handle socket connection events', () => {
    render(<RealTimeDashboard />);
    
    // Simulate connection
    const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
    connectHandler();
    
    expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
  });

  it('should handle socket disconnection events', () => {
    render(<RealTimeDashboard />);
    
    // Simulate disconnection
    const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];
    disconnectHandler();
    
    expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
  });

  it('should fetch BIST 100 data when button is clicked', async () => {
    const user = userEvent.setup();
    render(<RealTimeDashboard />);
    
    // Simulate connection first
    const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
    connectHandler();
    
    const fetchButton = screen.getByText('Fetch BIST 100');
    await user.click(fetchButton);
    
    expect(mockSocket.emit).toHaveBeenCalledWith('get-bist100-data');
  });

  it('should display BIST 100 data when received', () => {
    render(<RealTimeDashboard />);
    
    // Simulate receiving BIST 100 data
    const dataHandler = mockSocket.on.mock.calls.find(call => call[0] === 'bist100-data')[1];
    dataHandler(mockBist100Data);
    
    expect(screen.getByText('THYAO')).toBeInTheDocument();
    expect(screen.getByText('₺125.50')).toBeInTheDocument();
    expect(screen.getByText('2.30%')).toBeInTheDocument();
    expect(screen.getByText('AKBNK')).toBeInTheDocument();
    expect(screen.getByText('₺45.20')).toBeInTheDocument();
    expect(screen.getByText('-1.80%')).toBeInTheDocument();
  });

  it('should display service status when received', () => {
    render(<RealTimeDashboard />);
    
    // Simulate receiving service status
    const statusHandler = mockSocket.on.mock.calls.find(call => call[0] === 'bulk-service-status')[1];
    statusHandler(mockServiceStatus);
    
    expect(screen.getByText('Service Running')).toBeInTheDocument();
    expect(screen.getByText('Total Requests: 100')).toBeInTheDocument();
    expect(screen.getByText('Success Rate: 95%')).toBeInTheDocument();
  });

  it('should toggle auto-update when button is clicked', async () => {
    const user = userEvent.setup();
    render(<RealTimeDashboard />);
    
    // Simulate connection first
    const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
    connectHandler();
    
    const autoUpdateButton = screen.getByText('Start Auto Update');
    await user.click(autoUpdateButton);
    
    expect(mockSocket.emit).toHaveBeenCalledWith('start-auto-updates');
    expect(screen.getByText('Stop Auto Update')).toBeInTheDocument();
  });

  it('should handle sector selection', async () => {
    const user = userEvent.setup();
    render(<RealTimeDashboard />);
    
    // Simulate connection first
    const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
    connectHandler();
    
    const sectorSelect = screen.getByRole('combobox');
    await user.selectOptions(sectorSelect, 'Bankacılık');
    
    expect(mockSocket.emit).toHaveBeenCalledWith('get-sector-data', 'Bankacılık');
  });

  it('should display loading state during data fetch', () => {
    render(<RealTimeDashboard />);
    
    // Simulate connection and loading state
    const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
    connectHandler();
    
    // Trigger loading by clicking fetch button
    fireEvent.click(screen.getByText('Fetch BIST 100'));
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should handle errors gracefully', () => {
    render(<RealTimeDashboard />);
    
    // Simulate error
    const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'bist100-error')[1];
    errorHandler({ error: 'Failed to fetch data' });
    
    expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
  });

  it('should format prices correctly', () => {
    render(<RealTimeDashboard />);
    
    // Simulate receiving data
    const dataHandler = mockSocket.on.mock.calls.find(call => call[0] === 'bist100-data')[1];
    dataHandler(mockBist100Data);
    
    expect(screen.getByText('₺125.50')).toBeInTheDocument();
    expect(screen.getByText('₺45.20')).toBeInTheDocument();
  });

  it('should format volume correctly', () => {
    render(<RealTimeDashboard />);
    
    // Simulate receiving data
    const dataHandler = mockSocket.on.mock.calls.find(call => call[0] === 'bist100-data')[1];
    dataHandler(mockBist100Data);
    
    expect(screen.getByText('1.3M')).toBeInTheDocument(); // 1250000 formatted
    expect(screen.getByText('2.5M')).toBeInTheDocument(); // 2500000 formatted
  });

  it('should apply correct styling for positive changes', () => {
    render(<RealTimeDashboard />);
    
    // Simulate receiving data
    const dataHandler = mockSocket.on.mock.calls.find(call => call[0] === 'bist100-data')[1];
    dataHandler(mockBist100Data);
    
    const positiveChange = screen.getByText('2.30%');
    expect(positiveChange).toHaveClass('text-green-600');
  });

  it('should apply correct styling for negative changes', () => {
    render(<RealTimeDashboard />);
    
    // Simulate receiving data
    const dataHandler = mockSocket.on.mock.calls.find(call => call[0] === 'bist100-data')[1];
    dataHandler(mockBist100Data);
    
    const negativeChange = screen.getByText('-1.80%');
    expect(negativeChange).toHaveClass('text-red-600');
  });

  it('should handle auto-update events', () => {
    render(<RealTimeDashboard />);
    
    // Simulate auto-update complete
    const autoUpdateHandler = mockSocket.on.mock.calls.find(call => call[0] === 'auto-update-complete')[1];
    autoUpdateHandler({ message: 'Update completed' });
    
    // Check that last update time is updated
    expect(screen.getByTestId('last-update')).toBeInTheDocument();
  });

  it('should handle popular stocks data', () => {
    render(<RealTimeDashboard />);
    
    // Simulate receiving popular stocks data
    const popularHandler = mockSocket.on.mock.calls.find(call => call[0] === 'popular-stocks-data')[1];
    popularHandler(mockBist100Data);
    
    // Should display popular stocks section
    expect(screen.getByText('Popular Stocks')).toBeInTheDocument();
  });

  it('should cleanup socket connection on unmount', () => {
    const { unmount } = render(<RealTimeDashboard />);
    
    unmount();
    
    expect(mockSocket.close).toHaveBeenCalled();
  });

  it('should handle bulk data updates', () => {
    render(<RealTimeDashboard />);
    
    // Enable auto-update first
    const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
    connectHandler();
    
    // Simulate bulk data update
    const bulkUpdateHandler = mockSocket.on.mock.calls.find(call => call[0] === 'bulk-data-update')[1];
    bulkUpdateHandler({ type: 'bist100', timestamp: new Date().toISOString() });
    
    // Should trigger data refresh when auto-update is enabled
    expect(mockSocket.emit).toHaveBeenCalledWith('get-bist100-data');
  });

  it('should display cached data indicator', () => {
    const cachedData = {
      ...mockBist100Data,
      successful: [
        {
          ...mockBist100Data.successful[0],
          cached: true
        }
      ]
    };
    
    render(<RealTimeDashboard />);
    
    // Simulate receiving cached data
    const dataHandler = mockSocket.on.mock.calls.find(call => call[0] === 'bist100-data')[1];
    dataHandler(cachedData);
    
    expect(screen.getByTestId('cached-indicator')).toBeInTheDocument();
  });
});