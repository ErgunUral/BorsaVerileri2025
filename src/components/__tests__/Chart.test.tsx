import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import Chart from '../Chart';

// Mock Recharts components
vi.mock('recharts', () => ({
  LineChart: ({ children, data, ...props }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)} {...props}>
      {children}
    </div>
  ),
  CandlestickChart: ({ children, data, ...props }: any) => (
    <div data-testid="candlestick-chart" data-chart-data={JSON.stringify(data)} {...props}>
      {children}
    </div>
  ),
  AreaChart: ({ children, data, ...props }: any) => (
    <div data-testid="area-chart" data-chart-data={JSON.stringify(data)} {...props}>
      {children}
    </div>
  ),
  BarChart: ({ children, data, ...props }: any) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)} {...props}>
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke, ...props }: any) => (
    <div data-testid="chart-line" data-key={dataKey} data-stroke={stroke} {...props} />
  ),
  Area: ({ dataKey, fill, ...props }: any) => (
    <div data-testid="chart-area" data-key={dataKey} data-fill={fill} {...props} />
  ),
  Bar: ({ dataKey, fill, ...props }: any) => (
    <div data-testid="chart-bar" data-key={dataKey} data-fill={fill} {...props} />
  ),
  XAxis: ({ dataKey, ...props }: any) => (
    <div data-testid="x-axis" data-key={dataKey} {...props} />
  ),
  YAxis: ({ domain, ...props }: any) => (
    <div data-testid="y-axis" data-domain={JSON.stringify(domain)} {...props} />
  ),
  CartesianGrid: (props: any) => (
    <div data-testid="cartesian-grid" {...props} />
  ),
  Tooltip: ({ content, ...props }: any) => (
    <div data-testid="chart-tooltip" {...props}>
      {content && <div data-testid="tooltip-content" />}
    </div>
  ),
  Legend: (props: any) => (
    <div data-testid="chart-legend" {...props} />
  ),
  ResponsiveContainer: ({ children, ...props }: any) => (
    <div data-testid="responsive-container" {...props}>
      {children}
    </div>
  )
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

describe('Chart Component', () => {
  const user = userEvent.setup();

  const mockLineData = [
    { timestamp: '2024-01-15T09:30:00Z', price: 150.25, volume: 1000000 },
    { timestamp: '2024-01-15T10:00:00Z', price: 151.50, volume: 1200000 },
    { timestamp: '2024-01-15T10:30:00Z', price: 149.75, volume: 800000 },
    { timestamp: '2024-01-15T11:00:00Z', price: 152.00, volume: 1500000 },
    { timestamp: '2024-01-15T11:30:00Z', price: 151.25, volume: 900000 }
  ];

  const mockCandlestickData = [
    {
      timestamp: '2024-01-15T09:30:00Z',
      open: 150.00,
      high: 152.00,
      low: 149.50,
      close: 151.25,
      volume: 2000000
    },
    {
      timestamp: '2024-01-15T10:30:00Z',
      open: 151.25,
      high: 153.00,
      low: 150.75,
      close: 152.50,
      volume: 1800000
    },
    {
      timestamp: '2024-01-15T11:30:00Z',
      open: 152.50,
      high: 154.00,
      low: 151.00,
      close: 153.75,
      volume: 2200000
    }
  ];

  const mockVolumeData = [
    { timestamp: '2024-01-15T09:30:00Z', volume: 2000000 },
    { timestamp: '2024-01-15T10:30:00Z', volume: 1800000 },
    { timestamp: '2024-01-15T11:30:00Z', volume: 2200000 }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Temel Render', () => {
    it('line chart render edilmeli', () => {
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );

      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('chart-line')).toBeInTheDocument();
    });

    it('candlestick chart render edilmeli', () => {
      render(
        <Chart
          data={mockCandlestickData}
          type="candlestick"
          period="1D"
          symbol="AAPL"
        />
      );

      expect(screen.getByTestId('candlestick-chart')).toBeInTheDocument();
    });

    it('area chart render edilmeli', () => {
      render(
        <Chart
          data={mockLineData}
          type="area"
          period="1D"
          symbol="AAPL"
        />
      );

      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      expect(screen.getByTestId('chart-area')).toBeInTheDocument();
    });

    it('volume chart render edilmeli', () => {
      render(
        <Chart
          data={mockVolumeData}
          type="volume"
          period="1D"
          symbol="AAPL"
        />
      );

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('chart-bar')).toBeInTheDocument();
    });

    it('chart başlığı gösterilmeli', () => {
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );

      expect(screen.getByText('AAPL - 1D')).toBeInTheDocument();
    });

    it('chart kontrolleri gösterilmeli', () => {
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );

      expect(screen.getByTestId('chart-controls')).toBeInTheDocument();
      expect(screen.getByTestId('chart-type-selector')).toBeInTheDocument();
      expect(screen.getByTestId('period-selector')).toBeInTheDocument();
    });
  });

  describe('Chart Türü Değişimi', () => {
    it('chart türü değiştirilebilmeli', async () => {
      const onTypeChange = vi.fn();
      
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
          onTypeChange={onTypeChange}
        />
      );

      const typeSelector = screen.getByTestId('chart-type-selector');
      await user.selectOptions(typeSelector, 'candlestick');

      expect(onTypeChange).toHaveBeenCalledWith('candlestick');
    });

    it('tüm chart türleri seçeneklerde bulunmalı', () => {
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );

      const typeSelector = screen.getByTestId('chart-type-selector');
      
      expect(screen.getByRole('option', { name: 'Çizgi' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Mum' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Alan' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Hacim' })).toBeInTheDocument();
    });

    it('geçersiz chart türü için varsayılan kullanılmalı', () => {
      render(
        <Chart
          data={mockLineData}
          type="invalid" as any
          period="1D"
          symbol="AAPL"
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  describe('Zaman Periyodu Değişimi', () => {
    it('zaman periyodu değiştirilebilmeli', async () => {
      const onPeriodChange = vi.fn();
      
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
          onPeriodChange={onPeriodChange}
        />
      );

      const periodButton = screen.getByText('1W');
      fireEvent.click(periodButton);

      expect(onPeriodChange).toHaveBeenCalledWith('1W');
    });

    it('aktif periyod vurgulanmalı', () => {
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );

      const activePeriod = screen.getByText('1D');
      expect(activePeriod).toHaveClass('bg-blue-500', 'text-white');
    });

    it('tüm zaman periyotları gösterilmeli', () => {
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );

      expect(screen.getByText('1D')).toBeInTheDocument();
      expect(screen.getByText('1W')).toBeInTheDocument();
      expect(screen.getByText('1M')).toBeInTheDocument();
      expect(screen.getByText('3M')).toBeInTheDocument();
      expect(screen.getByText('1Y')).toBeInTheDocument();
      expect(screen.getByText('5Y')).toBeInTheDocument();
    });
  });

  describe('Veri İşleme', () => {
    it('boş veri ile hata gösterilmemeli', () => {
      render(
        <Chart
          data={[]}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );

      expect(screen.getByText('Veri bulunamadı')).toBeInTheDocument();
    });

    it('null veri ile hata gösterilmemeli', () => {
      render(
        <Chart
          data={null as any}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );

      expect(screen.getByText('Veri bulunamadı')).toBeInTheDocument();
    });

    it('geçersiz veri formatı ile hata gösterilmeli', () => {
      const invalidData = [{ invalid: 'data' }];
      
      render(
        <Chart
          data={invalidData as any}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );

      expect(screen.getByText('Geçersiz veri formatı')).toBeInTheDocument();
    });

    it('veri doğru formatta chart\'a geçirilmeli', () => {
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );

      const chart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      
      expect(chartData).toHaveLength(mockLineData.length);
      expect(chartData[0]).toHaveProperty('timestamp');
      expect(chartData[0]).toHaveProperty('price');
    });
  });

  describe('Tooltip', () => {
    it('tooltip render edilmeli', () => {
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );

      expect(screen.getByTestId('chart-tooltip')).toBeInTheDocument();
    });

    it('custom tooltip içeriği gösterilmeli', () => {
      render(
        <Chart
          data={mockCandlestickData}
          type="candlestick"
          period="1D"
          symbol="AAPL"
        />
      );

      expect(screen.getByTestId('tooltip-content')).toBeInTheDocument();
    });
  });

  describe('Eksen Konfigürasyonu', () => {
    it('X ekseni doğru konfigüre edilmeli', () => {
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );

      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis).toHaveAttribute('data-key', 'timestamp');
    });

    it('Y ekseni doğru konfigüre edilmeli', () => {
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );

      const yAxis = screen.getByTestId('y-axis');
      expect(yAxis).toBeInTheDocument();
    });

    it('Y ekseni domain otomatik hesaplanmalı', () => {
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );

      const yAxis = screen.getByTestId('y-axis');
      const domain = JSON.parse(yAxis.getAttribute('data-domain') || '[]');
      
      expect(domain).toEqual(['dataMin', 'dataMax']);
    });
  });

  describe('Grid ve Styling', () => {
    it('cartesian grid render edilmeli', () => {
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );

      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    });

    it('legend render edilmeli', () => {
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );

      expect(screen.getByTestId('chart-legend')).toBeInTheDocument();
    });

    it('line chart doğru renkte olmalı', () => {
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );

      const line = screen.getByTestId('chart-line');
      expect(line).toHaveAttribute('data-stroke', '#3B82F6');
    });

    it('area chart doğru renkte olmalı', () => {
      render(
        <Chart
          data={mockLineData}
          type="area"
          period="1D"
          symbol="AAPL"
        />
      );

      const area = screen.getByTestId('chart-area');
      expect(area).toHaveAttribute('data-fill', '#3B82F6');
    });
  });

  describe('Responsive Davranış', () => {
    it('responsive container kullanılmalı', () => {
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('mobil görünümde kontroller düzenlenmeli', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );

      const controls = screen.getByTestId('chart-controls');
      expect(controls).toHaveClass('flex-col');
    });

    it('tablet görünümde kontroller düzenlenmeli', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });

      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );

      const controls = screen.getByTestId('chart-controls');
      expect(controls).toHaveClass('md:flex-row');
    });
  });

  describe('Zoom ve Pan', () => {
    it('zoom kontrolleri gösterilmeli', () => {
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
          enableZoom={true}
        />
      );

      expect(screen.getByTestId('zoom-controls')).toBeInTheDocument();
      expect(screen.getByText('Yakınlaştır')).toBeInTheDocument();
      expect(screen.getByText('Uzaklaştır')).toBeInTheDocument();
      expect(screen.getByText('Sıfırla')).toBeInTheDocument();
    });

    it('zoom in çalışmalı', async () => {
      const onZoom = vi.fn();
      
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
          enableZoom={true}
          onZoom={onZoom}
        />
      );

      const zoomInButton = screen.getByText('Yakınlaştır');
      fireEvent.click(zoomInButton);

      expect(onZoom).toHaveBeenCalledWith('in');
    });

    it('zoom out çalışmalı', async () => {
      const onZoom = vi.fn();
      
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
          enableZoom={true}
          onZoom={onZoom}
        />
      );

      const zoomOutButton = screen.getByText('Uzaklaştır');
      fireEvent.click(zoomOutButton);

      expect(onZoom).toHaveBeenCalledWith('out');
    });

    it('zoom reset çalışmalı', async () => {
      const onZoom = vi.fn();
      
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
          enableZoom={true}
          onZoom={onZoom}
        />
      );

      const resetButton = screen.getByText('Sıfırla');
      fireEvent.click(resetButton);

      expect(onZoom).toHaveBeenCalledWith('reset');
    });
  });

  describe('Fullscreen Modu', () => {
    it('fullscreen butonu gösterilmeli', () => {
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );

      expect(screen.getByTestId('fullscreen-button')).toBeInTheDocument();
    });

    it('fullscreen modu açılabilmeli', async () => {
      const onFullscreen = vi.fn();
      
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
          onFullscreen={onFullscreen}
        />
      );

      const fullscreenButton = screen.getByTestId('fullscreen-button');
      fireEvent.click(fullscreenButton);

      expect(onFullscreen).toHaveBeenCalledWith(true);
    });

    it('fullscreen modunda çıkış butonu gösterilmeli', () => {
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
          isFullscreen={true}
        />
      );

      expect(screen.getByText('Çıkış')).toBeInTheDocument();
    });
  });

  describe('Yükleme ve Hata Durumları', () => {
    it('yükleme durumu gösterilmeli', () => {
      render(
        <Chart
          data={[]}
          type="line"
          period="1D"
          symbol="AAPL"
          isLoading={true}
        />
      );

      expect(screen.getByTestId('chart-loading')).toBeInTheDocument();
      expect(screen.getByText('Grafik yükleniyor...')).toBeInTheDocument();
    });

    it('hata durumu gösterilmeli', () => {
      render(
        <Chart
          data={[]}
          type="line"
          period="1D"
          symbol="AAPL"
          error="Veri yüklenemedi"
        />
      );

      expect(screen.getByTestId('chart-error')).toBeInTheDocument();
      expect(screen.getByText('Veri yüklenemedi')).toBeInTheDocument();
      expect(screen.getByText('Yeniden Dene')).toBeInTheDocument();
    });

    it('hata durumunda yeniden deneme çalışmalı', async () => {
      const onRetry = vi.fn();
      
      render(
        <Chart
          data={[]}
          type="line"
          period="1D"
          symbol="AAPL"
          error="Veri yüklenemedi"
          onRetry={onRetry}
        />
      );

      const retryButton = screen.getByText('Yeniden Dene');
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalled();
    });
  });

  describe('Performans', () => {
    it('bileşen hızlı render edilmeli', () => {
      const startTime = performance.now();
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );
      const endTime = performance.now();

      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(100); // 100ms'den az
    });

    it('büyük veri setleri ile performans korunmalı', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 60000).toISOString(),
        price: 150 + Math.random() * 10,
        volume: 1000000 + Math.random() * 500000
      }));

      const startTime = performance.now();
      render(
        <Chart
          data={largeData}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );
      const endTime = performance.now();

      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(300); // 300ms'den az
    });

    it('gereksiz re-render olmamalı', () => {
      const renderSpy = vi.fn();
      
      const TestComponent = (props: any) => {
        renderSpy();
        return <Chart {...props} />;
      };

      const { rerender } = render(
        <TestComponent
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );
      
      // Aynı props ile yeniden render
      rerender(
        <TestComponent
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );
      
      expect(renderSpy).toHaveBeenCalledTimes(2); // İlk render + rerender
    });
  });

  describe('Klavye Navigasyonu', () => {
    it('Tab tuşu ile kontroller arasında gezinilebilmeli', () => {
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );

      const typeSelector = screen.getByTestId('chart-type-selector');
      const firstPeriodButton = screen.getByText('1D');

      typeSelector.focus();
      expect(typeSelector).toHaveFocus();

      fireEvent.keyDown(typeSelector, { key: 'Tab' });
      expect(firstPeriodButton).toHaveFocus();
    });

    it('Enter tuşu ile periyod değiştirilebilmeli', async () => {
      const onPeriodChange = vi.fn();
      
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
          onPeriodChange={onPeriodChange}
        />
      );

      const weekButton = screen.getByText('1W');
      weekButton.focus();
      fireEvent.keyDown(weekButton, { key: 'Enter' });

      expect(onPeriodChange).toHaveBeenCalledWith('1W');
    });

    it('Arrow tuşları ile periyod değiştirilebilmeli', async () => {
      const onPeriodChange = vi.fn();
      
      render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
          onPeriodChange={onPeriodChange}
        />
      );

      const dayButton = screen.getByText('1D');
      dayButton.focus();
      fireEvent.keyDown(dayButton, { key: 'ArrowRight' });

      expect(onPeriodChange).toHaveBeenCalledWith('1W');
    });
  });

  describe('Temizlik', () => {
    it('component unmount olduğunda ResizeObserver temizlenmeli', () => {
      const disconnectSpy = vi.fn();
      (global.ResizeObserver as any).mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: disconnectSpy
      }));

      const { unmount } = render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );
      
      unmount();
      
      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('component unmount olduğunda event listener\'lar temizlenmeli', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      const { unmount } = render(
        <Chart
          data={mockLineData}
          type="line"
          period="1D"
          symbol="AAPL"
        />
      );
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalled();
    });
  });
});