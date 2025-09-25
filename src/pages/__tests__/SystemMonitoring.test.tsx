import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SystemMonitoring from '../SystemMonitoring';
import { useSystemMonitoring } from '../../hooks/useSystemMonitoring';
import { useRealTimeMonitoring } from '../../hooks/useRealTimeMonitoring';

// Mock hooks
jest.mock('../../hooks/useSystemMonitoring');
jest.mock('../../hooks/useRealTimeMonitoring');

const mockUseSystemMonitoring = useSystemMonitoring as jest.MockedFunction<typeof useSystemMonitoring>;
const mockUseRealTimeMonitoring = useRealTimeMonitoring as jest.MockedFunction<typeof useRealTimeMonitoring>;

const mockSystemMetrics = {
  cpu: {
    usage: 45.2,
    cores: 8,
    temperature: 65
  },
  memory: {
    used: 8.5,
    total: 16,
    usage: 53.1
  },
  disk: {
    used: 250,
    total: 500,
    usage: 50
  },
  network: {
    download: 125.5,
    upload: 45.2,
    latency: 15
  },
  uptime: 86400,
  timestamp: '2024-01-01T12:00:00Z'
};

const mockApplicationMetrics = {
  activeConnections: 150,
  requestsPerSecond: 25,
  responseTime: 120,
  errorRate: 0.5,
  cacheHitRate: 85.5,
  databaseConnections: 10,
  queueSize: 5,
  timestamp: '2024-01-01T12:00:00Z'
};

const mockAlerts = [
  {
    id: '1',
    type: 'warning',
    message: 'High CPU usage detected',
    timestamp: '2024-01-01T11:55:00Z',
    severity: 'medium'
  },
  {
    id: '2',
    type: 'error',
    message: 'Database connection timeout',
    timestamp: '2024-01-01T11:50:00Z',
    severity: 'high'
  }
];

const mockLogs = [
  {
    id: '1',
    level: 'info',
    message: 'System started successfully',
    timestamp: '2024-01-01T10:00:00Z',
    source: 'system'
  },
  {
    id: '2',
    level: 'error',
    message: 'Failed to connect to external API',
    timestamp: '2024-01-01T11:30:00Z',
    source: 'api'
  }
];

describe('SystemMonitoring Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseSystemMonitoring.mockReturnValue({
      metrics: mockSystemMetrics,
      applicationMetrics: mockApplicationMetrics,
      alerts: mockAlerts,
      logs: mockLogs,
      loading: false,
      error: null,
      refreshMetrics: jest.fn(),
      clearAlerts: jest.fn(),
      exportLogs: jest.fn()
    });
    
    mockUseRealTimeMonitoring.mockReturnValue({
      isConnected: true,
      lastUpdate: '2024-01-01T12:00:00Z',
      connectionStatus: 'connected',
      reconnect: jest.fn()
    });
  });

  test('renders system monitoring title', () => {
    render(<SystemMonitoring />);
    
    expect(screen.getByText('Sistem İzleme')).toBeInTheDocument();
  });

  test('displays system metrics cards', () => {
    render(<SystemMonitoring />);
    
    expect(screen.getByText('CPU Kullanımı')).toBeInTheDocument();
    expect(screen.getByText('45.2%')).toBeInTheDocument();
    expect(screen.getByText('Bellek Kullanımı')).toBeInTheDocument();
    expect(screen.getByText('53.1%')).toBeInTheDocument();
    expect(screen.getByText('Disk Kullanımı')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  test('shows network statistics', () => {
    render(<SystemMonitoring />);
    
    expect(screen.getByText('Ağ Trafiği')).toBeInTheDocument();
    expect(screen.getByText('125.5 MB/s')).toBeInTheDocument();
    expect(screen.getByText('45.2 MB/s')).toBeInTheDocument();
    expect(screen.getByText('15 ms')).toBeInTheDocument();
  });

  test('displays application metrics', () => {
    render(<SystemMonitoring />);
    
    expect(screen.getByText('Uygulama Metrikleri')).toBeInTheDocument();
    expect(screen.getByText('Aktif Bağlantılar')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('İstek/Saniye')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  test('shows response time and error rate', () => {
    render(<SystemMonitoring />);
    
    expect(screen.getByText('Yanıt Süresi')).toBeInTheDocument();
    expect(screen.getByText('120 ms')).toBeInTheDocument();
    expect(screen.getByText('Hata Oranı')).toBeInTheDocument();
    expect(screen.getByText('0.5%')).toBeInTheDocument();
  });

  test('displays cache and database metrics', () => {
    render(<SystemMonitoring />);
    
    expect(screen.getByText('Cache Hit Rate')).toBeInTheDocument();
    expect(screen.getByText('85.5%')).toBeInTheDocument();
    expect(screen.getByText('DB Bağlantıları')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  test('shows alerts section', () => {
    render(<SystemMonitoring />);
    
    expect(screen.getByText('Sistem Uyarıları')).toBeInTheDocument();
    expect(screen.getByText('High CPU usage detected')).toBeInTheDocument();
    expect(screen.getByText('Database connection timeout')).toBeInTheDocument();
  });

  test('displays alert severity indicators', () => {
    render(<SystemMonitoring />);
    
    const warningAlert = screen.getByText('High CPU usage detected').closest('.alert');
    expect(warningAlert).toHaveClass('alert-warning');
    
    const errorAlert = screen.getByText('Database connection timeout').closest('.alert');
    expect(errorAlert).toHaveClass('alert-error');
  });

  test('shows system logs', () => {
    render(<SystemMonitoring />);
    
    expect(screen.getByText('Sistem Logları')).toBeInTheDocument();
    expect(screen.getByText('System started successfully')).toBeInTheDocument();
    expect(screen.getByText('Failed to connect to external API')).toBeInTheDocument();
  });

  test('displays log levels with correct styling', () => {
    render(<SystemMonitoring />);
    
    const infoLog = screen.getByText('System started successfully').closest('.log-entry');
    expect(infoLog).toHaveClass('log-info');
    
    const errorLog = screen.getByText('Failed to connect to external API').closest('.log-entry');
    expect(errorLog).toHaveClass('log-error');
  });

  test('shows connection status indicator', () => {
    render(<SystemMonitoring />);
    
    expect(screen.getByText('Bağlantı Durumu')).toBeInTheDocument();
    expect(screen.getByText('Bağlı')).toBeInTheDocument();
    expect(screen.getByTestId('connection-indicator')).toHaveClass('bg-green-500');
  });

  test('handles disconnected state', () => {
    mockUseRealTimeMonitoring.mockReturnValue({
      isConnected: false,
      lastUpdate: '2024-01-01T11:55:00Z',
      connectionStatus: 'disconnected',
      reconnect: jest.fn()
    });
    
    render(<SystemMonitoring />);
    
    expect(screen.getByText('Bağlantı Kesildi')).toBeInTheDocument();
    expect(screen.getByTestId('connection-indicator')).toHaveClass('bg-red-500');
  });

  test('displays uptime information', () => {
    render(<SystemMonitoring />);
    
    expect(screen.getByText('Sistem Çalışma Süresi')).toBeInTheDocument();
    expect(screen.getByText('1 gün')).toBeInTheDocument();
  });

  test('shows last update timestamp', () => {
    render(<SystemMonitoring />);
    
    expect(screen.getByText(/Son Güncelleme:/)).toBeInTheDocument();
  });

  test('handles refresh functionality', async () => {
    const mockRefresh = jest.fn();
    mockUseSystemMonitoring.mockReturnValue({
      metrics: mockSystemMetrics,
      applicationMetrics: mockApplicationMetrics,
      alerts: mockAlerts,
      logs: mockLogs,
      loading: false,
      error: null,
      refreshMetrics: mockRefresh,
      clearAlerts: jest.fn(),
      exportLogs: jest.fn()
    });
    
    render(<SystemMonitoring />);
    
    const refreshButton = screen.getByLabelText('Metrikleri Yenile');
    fireEvent.click(refreshButton);
    
    expect(mockRefresh).toHaveBeenCalled();
  });

  test('handles clear alerts functionality', async () => {
    const mockClearAlerts = jest.fn();
    mockUseSystemMonitoring.mockReturnValue({
      metrics: mockSystemMetrics,
      applicationMetrics: mockApplicationMetrics,
      alerts: mockAlerts,
      logs: mockLogs,
      loading: false,
      error: null,
      refreshMetrics: jest.fn(),
      clearAlerts: mockClearAlerts,
      exportLogs: jest.fn()
    });
    
    render(<SystemMonitoring />);
    
    const clearButton = screen.getByText('Uyarıları Temizle');
    fireEvent.click(clearButton);
    
    expect(mockClearAlerts).toHaveBeenCalled();
  });

  test('handles export logs functionality', async () => {
    const mockExportLogs = jest.fn();
    mockUseSystemMonitoring.mockReturnValue({
      metrics: mockSystemMetrics,
      applicationMetrics: mockApplicationMetrics,
      alerts: mockAlerts,
      logs: mockLogs,
      loading: false,
      error: null,
      refreshMetrics: jest.fn(),
      clearAlerts: jest.fn(),
      exportLogs: mockExportLogs
    });
    
    render(<SystemMonitoring />);
    
    const exportButton = screen.getByText('Logları Dışa Aktar');
    fireEvent.click(exportButton);
    
    expect(mockExportLogs).toHaveBeenCalled();
  });

  test('shows loading state', () => {
    mockUseSystemMonitoring.mockReturnValue({
      metrics: null,
      applicationMetrics: null,
      alerts: [],
      logs: [],
      loading: true,
      error: null,
      refreshMetrics: jest.fn(),
      clearAlerts: jest.fn(),
      exportLogs: jest.fn()
    });
    
    render(<SystemMonitoring />);
    
    expect(screen.getByText('Sistem metrikleri yükleniyor...')).toBeInTheDocument();
  });

  test('handles error state', () => {
    const errorMessage = 'Failed to fetch system metrics';
    
    mockUseSystemMonitoring.mockReturnValue({
      metrics: null,
      applicationMetrics: null,
      alerts: [],
      logs: [],
      loading: false,
      error: errorMessage,
      refreshMetrics: jest.fn(),
      clearAlerts: jest.fn(),
      exportLogs: jest.fn()
    });
    
    render(<SystemMonitoring />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('displays metric thresholds and warnings', () => {
    render(<SystemMonitoring />);
    
    // CPU usage below 80% should be normal
    const cpuMetric = screen.getByText('45.2%').closest('.metric-card');
    expect(cpuMetric).toHaveClass('metric-normal');
  });

  test('shows high usage warnings', () => {
    const highUsageMetrics = {
      ...mockSystemMetrics,
      cpu: { ...mockSystemMetrics.cpu, usage: 95.5 },
      memory: { ...mockSystemMetrics.memory, usage: 90.2 }
    };
    
    mockUseSystemMonitoring.mockReturnValue({
      metrics: highUsageMetrics,
      applicationMetrics: mockApplicationMetrics,
      alerts: mockAlerts,
      logs: mockLogs,
      loading: false,
      error: null,
      refreshMetrics: jest.fn(),
      clearAlerts: jest.fn(),
      exportLogs: jest.fn()
    });
    
    render(<SystemMonitoring />);
    
    expect(screen.getByText('95.5%')).toBeInTheDocument();
    expect(screen.getByText('90.2%')).toBeInTheDocument();
  });

  test('handles reconnection functionality', async () => {
    const mockReconnect = jest.fn();
    mockUseRealTimeMonitoring.mockReturnValue({
      isConnected: false,
      lastUpdate: '2024-01-01T11:55:00Z',
      connectionStatus: 'disconnected',
      reconnect: mockReconnect
    });
    
    render(<SystemMonitoring />);
    
    const reconnectButton = screen.getByText('Yeniden Bağlan');
    fireEvent.click(reconnectButton);
    
    expect(mockReconnect).toHaveBeenCalled();
  });

  test('filters logs by level', async () => {
    render(<SystemMonitoring />);
    
    const logLevelFilter = screen.getByDisplayValue('Tümü');
    fireEvent.change(logLevelFilter, { target: { value: 'error' } });
    
    await waitFor(() => {
      expect(screen.getByText('Failed to connect to external API')).toBeInTheDocument();
      expect(screen.queryByText('System started successfully')).not.toBeInTheDocument();
    });
  });

  test('shows real-time chart updates', () => {
    render(<SystemMonitoring />);
    
    expect(screen.getByTestId('cpu-chart')).toBeInTheDocument();
    expect(screen.getByTestId('memory-chart')).toBeInTheDocument();
    expect(screen.getByTestId('network-chart')).toBeInTheDocument();
  });

  test('displays system health score', () => {
    render(<SystemMonitoring />);
    
    expect(screen.getByText('Sistem Sağlığı')).toBeInTheDocument();
    expect(screen.getByTestId('health-score')).toBeInTheDocument();
  });
});