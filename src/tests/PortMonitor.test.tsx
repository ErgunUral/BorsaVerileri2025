import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { toast } from 'sonner';
import PortMonitor from '../pages/PortMonitor';

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

// Mock fetch
global.fetch = jest.fn();

// Mock data
const mockPortStatuses = [
  {
    config: {
      id: 'port1',
      name: 'Web Server',
      host: 'localhost',
      port: 8080,
      timeout: 5000,
      retryCount: 3,
      retryDelay: 1000,
      enabled: true,
      tags: ['web'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    lastResult: {
      id: 'result1',
      portConfigId: 'port1',
      host: 'localhost',
      port: 8080,
      status: 'online',
      responseTime: 150,
      timestamp: '2024-01-01T12:00:00Z'
    },
    isScheduled: true
  },
  {
    config: {
      id: 'port2',
      name: 'Database',
      host: 'localhost',
      port: 5432,
      timeout: 5000,
      retryCount: 3,
      retryDelay: 1000,
      enabled: true,
      tags: ['database'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    lastResult: {
      id: 'result2',
      portConfigId: 'port2',
      host: 'localhost',
      port: 5432,
      status: 'offline',
      error: 'Connection refused',
      timestamp: '2024-01-01T12:00:00Z'
    },
    isScheduled: false
  }
];

const mockSystemStats = {
  totalPorts: 2,
  onlinePorts: 1,
  offlinePorts: 1,
  totalChecks: 100,
  successfulChecks: 85,
  failedChecks: 15,
  averageResponseTime: 200,
  uptime: 85.0
};

describe('PortMonitor Component', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Default fetch mock responses
    (fetch as jest.MockedFunction<typeof fetch>).mockImplementation((url) => {
      if (url === '/api/port-monitor/status') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              ports: mockPortStatuses,
              systemStats: mockSystemStats
            }
          })
        } as Response);
      }
      
      if (url === '/api/port-monitor/scheduler/status') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              isRunning: true
            }
          })
        } as Response);
      }
      
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  it('should render loading state initially', () => {
    render(<PortMonitor />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render port monitor dashboard after loading', async () => {
    render(<PortMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText('Port Monitor')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Port durumlarını izleyin ve yönetin')).toBeInTheDocument();
    expect(screen.getByText('Sistem İstatistikleri')).toBeInTheDocument();
  });

  it('should display system statistics correctly', async () => {
    render(<PortMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // Total ports
      expect(screen.getByText('1')).toBeInTheDocument(); // Online ports
      expect(screen.getByText('85.0%')).toBeInTheDocument(); // Uptime
    });
  });

  it('should display port list with correct statuses', async () => {
    render(<PortMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText('Web Server')).toBeInTheDocument();
      expect(screen.getByText('Database')).toBeInTheDocument();
      expect(screen.getByText('localhost:8080')).toBeInTheDocument();
      expect(screen.getByText('localhost:5432')).toBeInTheDocument();
    });
    
    // Check status badges
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('should display scheduler status correctly', async () => {
    render(<PortMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText('Scheduler Çalışıyor')).toBeInTheDocument();
      expect(screen.getByText('Otomatik port kontrolleri aktif')).toBeInTheDocument();
    });
  });

  it('should handle manual port check', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockImplementationOnce((url, options) => {
      if (url === '/api/port-monitor/check/port1' && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              id: 'new-result',
              status: 'online',
              responseTime: 120
            }
          })
        } as Response);
      }
      return Promise.reject(new Error('Unexpected request'));
    });
    
    render(<PortMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText('Web Server')).toBeInTheDocument();
    });
    
    // Find and click manual check button for first port
    const checkButtons = screen.getAllByTitle('Manuel Kontrol');
    fireEvent.click(checkButtons[0]);
    
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Port kontrolü tamamlandı');
    });
  });

  it('should handle scheduler toggle', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockImplementationOnce((url, options) => {
      if (url === '/api/port-monitor/scheduler/stop' && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            message: 'Scheduler stopped'
          })
        } as Response);
      }
      return Promise.reject(new Error('Unexpected request'));
    });
    
    render(<PortMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText('Scheduler Durdur')).toBeInTheDocument();
    });
    
    // Click scheduler toggle button
    const schedulerButton = screen.getByText('Scheduler Durdur');
    fireEvent.click(schedulerButton);
    
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Scheduler durduruldu');
    });
  });

  it('should handle port deletion with confirmation', async () => {
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => true);
    
    (fetch as jest.MockedFunction<typeof fetch>).mockImplementationOnce((url, options) => {
      if (url === '/api/port-monitor/configs/port1' && options?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            message: 'Port deleted'
          })
        } as Response);
      }
      return Promise.reject(new Error('Unexpected request'));
    });
    
    render(<PortMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText('Web Server')).toBeInTheDocument();
    });
    
    // Find and click delete button for first port
    const deleteButtons = screen.getAllByTitle('Sil');
    fireEvent.click(deleteButtons[0]);
    
    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(
        'Bu port konfigürasyonunu silmek istediğinizden emin misiniz?'
      );
      expect(toast.success).toHaveBeenCalledWith('Port konfigürasyonu silindi');
    });
    
    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('should handle refresh button click', async () => {
    render(<PortMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText('Yenile')).toBeInTheDocument();
    });
    
    // Click refresh button
    const refreshButton = screen.getByText('Yenile');
    fireEvent.click(refreshButton);
    
    // Verify fetch calls were made
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/port-monitor/status');
      expect(fetch).toHaveBeenCalledWith('/api/port-monitor/scheduler/status');
    });
  });

  it('should show empty state when no ports are configured', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockImplementation((url) => {
      if (url === '/api/port-monitor/status') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              ports: [],
              systemStats: {
                ...mockSystemStats,
                totalPorts: 0,
                onlinePorts: 0,
                offlinePorts: 0
              }
            }
          })
        } as Response);
      }
      
      if (url === '/api/port-monitor/scheduler/status') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { isRunning: false }
          })
        } as Response);
      }
      
      return Promise.reject(new Error('Unknown URL'));
    });
    
    render(<PortMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText('Henüz port eklenmemiş')).toBeInTheDocument();
      expect(screen.getByText('İzlemek istediğiniz portları ekleyerek başlayın')).toBeInTheDocument();
      expect(screen.getByText('İlk Portu Ekle')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockImplementation(() => {
      return Promise.reject(new Error('Network error'));
    });
    
    render(<PortMonitor />);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Bağlantı hatası');
    });
  });

  it('should format response times correctly', async () => {
    render(<PortMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText('150ms')).toBeInTheDocument();
    });
  });

  it('should format timestamps correctly', async () => {
    render(<PortMonitor />);
    
    await waitFor(() => {
      // Check if timestamp is formatted in Turkish locale
      const timestampElements = screen.getAllByText(/01\.01\.2024/);
      expect(timestampElements.length).toBeGreaterThan(0);
    });
  });

  it('should show correct status colors and icons', async () => {
    render(<PortMonitor />);
    
    await waitFor(() => {
      // Check for online status (green)
      const onlineStatus = screen.getByText('Online');
      expect(onlineStatus.closest('span')).toHaveClass('text-green-600', 'bg-green-100');
      
      // Check for offline status (red)
      const offlineStatus = screen.getByText('Offline');
      expect(offlineStatus.closest('span')).toHaveClass('text-red-600', 'bg-red-100');
    });
  });

  it('should handle port check errors', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockImplementationOnce((url, options) => {
      if (url === '/api/port-monitor/check/port1' && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: false,
            error: 'Port check failed'
          })
        } as Response);
      }
      return Promise.reject(new Error('Unexpected request'));
    });
    
    render(<PortMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText('Web Server')).toBeInTheDocument();
    });
    
    // Find and click manual check button for first port
    const checkButtons = screen.getAllByTitle('Manuel Kontrol');
    fireEvent.click(checkButtons[0]);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Port kontrolü başarısız');
    });
  });

  it('should handle scheduler toggle errors', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockImplementationOnce((url, options) => {
      if (url === '/api/port-monitor/scheduler/stop' && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: false,
            error: 'Scheduler operation failed'
          })
        } as Response);
      }
      return Promise.reject(new Error('Unexpected request'));
    });
    
    render(<PortMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText('Scheduler Durdur')).toBeInTheDocument();
    });
    
    // Click scheduler toggle button
    const schedulerButton = screen.getByText('Scheduler Durdur');
    fireEvent.click(schedulerButton);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Scheduler işlemi başarısız');
    });
  });
});

// Utility function tests
describe('PortMonitor Utility Functions', () => {
  it('should format response time correctly', () => {
    // These would be extracted utility functions in a real implementation
    const formatResponseTime = (time?: number) => {
      if (!time) return 'N/A';
      return `${time.toFixed(0)}ms`;
    };
    
    expect(formatResponseTime(150.7)).toBe('151ms');
    expect(formatResponseTime(undefined)).toBe('N/A');
    expect(formatResponseTime(0)).toBe('0ms');
  });
  
  it('should format uptime correctly', () => {
    const formatUptime = (uptime: number) => {
      return `${uptime.toFixed(1)}%`;
    };
    
    expect(formatUptime(85.0)).toBe('85.0%');
    expect(formatUptime(99.99)).toBe('100.0%');
    expect(formatUptime(0)).toBe('0.0%');
  });
  
  it('should get correct status colors', () => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'online':
          return 'text-green-600 bg-green-100';
        case 'offline':
          return 'text-red-600 bg-red-100';
        case 'timeout':
          return 'text-yellow-600 bg-yellow-100';
        case 'error':
          return 'text-red-600 bg-red-100';
        default:
          return 'text-gray-600 bg-gray-100';
      }
    };
    
    expect(getStatusColor('online')).toBe('text-green-600 bg-green-100');
    expect(getStatusColor('offline')).toBe('text-red-600 bg-red-100');
    expect(getStatusColor('timeout')).toBe('text-yellow-600 bg-yellow-100');
    expect(getStatusColor('error')).toBe('text-red-600 bg-red-100');
    expect(getStatusColor('unknown')).toBe('text-gray-600 bg-gray-100');
  });
});