import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import MarketOverview from '../MarketOverview';

// Mock fetch API
global.fetch = vi.fn();

// Mock Chart component
vi.mock('../Chart', () => ({
  default: ({ data, type, title }: any) => (
    <div data-testid="market-chart">
      <div data-testid="chart-title">{title}</div>
      <div data-testid="chart-type">{type}</div>
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
    </div>
  )
}));

// Mock date functions
vi.mock('../utils/dateUtils', () => ({
  formatDate: vi.fn((date) => new Date(date).toLocaleDateString('tr-TR')),
  formatTime: vi.fn((date) => new Date(date).toLocaleTimeString('tr-TR')),
  formatRelativeTime: vi.fn((date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return 'Az önce';
    if (minutes < 60) return `${minutes} dakika önce`;
    return `${Math.floor(minutes / 60)} saat önce`;
  })
}));

// Mock number formatting
vi.mock('../utils/numberUtils', () => ({
  formatNumber: vi.fn((num) => num.toLocaleString('tr-TR')),
  formatCurrency: vi.fn((num, currency = 'TRY') => 
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(num)
  ),
  formatPercentage: vi.fn((num) => `${num.toFixed(2)}%`)
}));

describe('MarketOverview Component', () => {
  const user = userEvent.setup();

  const mockMarketData = {
    indices: [
      {
        symbol: 'XU100',
        name: 'BIST 100',
        value: 8542.35,
        change: 125.67,
        changePercent: 1.49,
        lastUpdate: '2024-01-15T15:30:00Z'
      },
      {
        symbol: 'XU030',
        name: 'BIST 30',
        value: 9876.54,
        change: -45.23,
        changePercent: -0.46,
        lastUpdate: '2024-01-15T15:30:00Z'
      },
      {
        symbol: 'XBANK',
        name: 'BIST Bankacılık',
        value: 1234.56,
        change: 78.90,
        changePercent: 6.83,
        lastUpdate: '2024-01-15T15:30:00Z'
      }
    ],
    sectors: [
      {
        name: 'Teknoloji',
        change: 2.45,
        volume: 1250000000,
        marketCap: 125000000000
      },
      {
        name: 'Bankacılık',
        change: -1.23,
        volume: 2100000000,
        marketCap: 210000000000
      },
      {
        name: 'Enerji',
        change: 0.87,
        volume: 890000000,
        marketCap: 89000000000
      }
    ],
    marketStatus: {
      isOpen: true,
      nextSession: '2024-01-16T09:30:00Z',
      timezone: 'Europe/Istanbul'
    },
    topGainers: [
      {
        symbol: 'THYAO',
        name: 'Türk Hava Yolları',
        price: 245.50,
        change: 18.75,
        changePercent: 8.27
      },
      {
        symbol: 'AKBNK',
        name: 'Akbank',
        price: 67.80,
        change: 4.20,
        changePercent: 6.61
      }
    ],
    topLosers: [
      {
        symbol: 'ISCTR',
        name: 'İş Bankası (C)',
        price: 12.34,
        change: -0.89,
        changePercent: -6.73
      },
      {
        symbol: 'GARAN',
        name: 'Garanti BBVA',
        price: 89.45,
        change: -3.21,
        changePercent: -3.46
      }
    ],
    mostActive: [
      {
        symbol: 'BIST',
        name: 'BİST',
        volume: 15000000,
        value: 1250000000
      },
      {
        symbol: 'AKBNK',
        name: 'Akbank',
        volume: 12500000,
        value: 847500000
      }
    ]
  };

  const mockHistoricalData = [
    { date: '2024-01-10', value: 8200.45 },
    { date: '2024-01-11', value: 8315.67 },
    { date: '2024-01-12', value: 8289.12 },
    { date: '2024-01-13', value: 8456.78 },
    { date: '2024-01-14', value: 8416.68 },
    { date: '2024-01-15', value: 8542.35 }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockMarketData
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Temel Render', () => {
    it('market overview bileşeni render edilmeli', async () => {
      render(<MarketOverview />);

      expect(screen.getByTestId('market-overview')).toBeInTheDocument();
      expect(screen.getByText('Piyasa Genel Bakış')).toBeInTheDocument();
    });

    it('yükleme durumu gösterilmeli', () => {
      (fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<MarketOverview />);

      expect(screen.getByTestId('market-loading')).toBeInTheDocument();
      expect(screen.getByText('Piyasa verileri yükleniyor...')).toBeInTheDocument();
    });

    it('piyasa durumu gösterilmeli', async () => {
      render(<MarketOverview />);

      await waitFor(() => {
        expect(screen.getByTestId('market-status')).toBeInTheDocument();
        expect(screen.getByText('Piyasa Açık')).toBeInTheDocument();
      });
    });

    it('son güncelleme zamanı gösterilmeli', async () => {
      render(<MarketOverview />);

      await waitFor(() => {
        expect(screen.getByTestId('last-update')).toBeInTheDocument();
        expect(screen.getByText(/Son güncelleme:/)).toBeInTheDocument();
      });
    });
  });

  describe('Endeksler', () => {
    it('ana endeksler gösterilmeli', async () => {
      render(<MarketOverview />);

      await waitFor(() => {
        expect(screen.getByText('BIST 100')).toBeInTheDocument();
        expect(screen.getByText('BIST 30')).toBeInTheDocument();
        expect(screen.getByText('BIST Bankacılık')).toBeInTheDocument();
      });
    });

    it('endeks değerleri doğru gösterilmeli', async () => {
      render(<MarketOverview />);

      await waitFor(() => {
        expect(screen.getByText('8.542,35')).toBeInTheDocument();
        expect(screen.getByText('9.876,54')).toBeInTheDocument();
        expect(screen.getByText('1.234,56')).toBeInTheDocument();
      });
    });

    it('pozitif değişim yeşil renkte gösterilmeli', async () => {
      render(<MarketOverview />);

      await waitFor(() => {
        const positiveChange = screen.getByText('+125,67');
        expect(positiveChange).toHaveClass('text-green-600');
        
        const positivePercent = screen.getByText('+1,49%');
        expect(positivePercent).toHaveClass('text-green-600');
      });
    });

    it('negatif değişim kırmızı renkte gösterilmeli', async () => {
      render(<MarketOverview />);

      await waitFor(() => {
        const negativeChange = screen.getByText('-45,23');
        expect(negativeChange).toHaveClass('text-red-600');
        
        const negativePercent = screen.getByText('-0,46%');
        expect(negativePercent).toHaveClass('text-red-600');
      });
    });

    it('endeks tıklandığında detay sayfasına yönlendirmeli', async () => {
      const mockNavigate = vi.fn();
      vi.mock('react-router-dom', () => ({
        useNavigate: () => mockNavigate
      }));

      render(<MarketOverview />);

      await waitFor(() => {
        const bistIndex = screen.getByTestId('index-XU100');
        fireEvent.click(bistIndex);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/index/XU100');
    });
  });

  describe('Sektör Performansı', () => {
    it('sektör listesi gösterilmeli', async () => {
      render(<MarketOverview />);

      await waitFor(() => {
        expect(screen.getByText('Teknoloji')).toBeInTheDocument();
        expect(screen.getByText('Bankacılık')).toBeInTheDocument();
        expect(screen.getByText('Enerji')).toBeInTheDocument();
      });
    });

    it('sektör değişimleri doğru gösterilmeli', async () => {
      render(<MarketOverview />);

      await waitFor(() => {
        expect(screen.getByText('+2,45%')).toBeInTheDocument();
        expect(screen.getByText('-1,23%')).toBeInTheDocument();
        expect(screen.getByText('+0,87%')).toBeInTheDocument();
      });
    });

    it('sektör hacmi gösterilmeli', async () => {
      render(<MarketOverview />);

      await waitFor(() => {
        expect(screen.getByText('1,25 Milyar TL')).toBeInTheDocument();
        expect(screen.getByText('2,10 Milyar TL')).toBeInTheDocument();
        expect(screen.getByText('890 Milyon TL')).toBeInTheDocument();
      });
    });

    it('piyasa değeri gösterilmeli', async () => {
      render(<MarketOverview />);

      await waitFor(() => {
        expect(screen.getByText('125 Milyar TL')).toBeInTheDocument();
        expect(screen.getByText('210 Milyar TL')).toBeInTheDocument();
        expect(screen.getByText('89 Milyar TL')).toBeInTheDocument();
      });
    });

    it('sektör tıklandığında detay sayfasına yönlendirmeli', async () => {
      const mockNavigate = vi.fn();
      vi.mock('react-router-dom', () => ({
        useNavigate: () => mockNavigate
      }));

      render(<MarketOverview />);

      await waitFor(() => {
        const techSector = screen.getByTestId('sector-Teknoloji');
        fireEvent.click(techSector);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/sector/Teknoloji');
    });
  });

  describe('En Çok Kazananlar', () => {
    it('kazanan hisseler gösterilmeli', async () => {
      render(<MarketOverview />);

      await waitFor(() => {
        expect(screen.getByText('Türk Hava Yolları')).toBeInTheDocument();
        expect(screen.getByText('Akbank')).toBeInTheDocument();
      });
    });

    it('kazanan hisse fiyatları gösterilmeli', async () => {
      render(<MarketOverview />);

      await waitFor(() => {
        expect(screen.getByText('245,50 TL')).toBeInTheDocument();
        expect(screen.getByText('67,80 TL')).toBeInTheDocument();
      });
    });

    it('kazanan hisse değişimleri yeşil renkte gösterilmeli', async () => {
      render(<MarketOverview />);

      await waitFor(() => {
        const thyaoChange = screen.getByText('+18,75');
        expect(thyaoChange).toHaveClass('text-green-600');
        
        const thyaoPercent = screen.getByText('+8,27%');
        expect(thyaoPercent).toHaveClass('text-green-600');
      });
    });

    it('hisse tıklandığında detay sayfasına yönlendirmeli', async () => {
      const mockNavigate = vi.fn();
      vi.mock('react-router-dom', () => ({
        useNavigate: () => mockNavigate
      }));

      render(<MarketOverview />);

      await waitFor(() => {
        const thyaoStock = screen.getByTestId('stock-THYAO');
        fireEvent.click(thyaoStock);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/stock/THYAO');
    });
  });

  describe('En Çok Kaybedenler', () => {
    it('kaybeden hisseler gösterilmeli', async () => {
      render(<MarketOverview />);

      await waitFor(() => {
        expect(screen.getByText('İş Bankası (C)')).toBeInTheDocument();
        expect(screen.getByText('Garanti BBVA')).toBeInTheDocument();
      });
    });

    it('kaybeden hisse fiyatları gösterilmeli', async () => {
      render(<MarketOverview />);

      await waitFor(() => {
        expect(screen.getByText('12,34 TL')).toBeInTheDocument();
        expect(screen.getByText('89,45 TL')).toBeInTheDocument();
      });
    });

    it('kaybeden hisse değişimleri kırmızı renkte gösterilmeli', async () => {
      render(<MarketOverview />);

      await waitFor(() => {
        const isctrChange = screen.getByText('-0,89');
        expect(isctrChange).toHaveClass('text-red-600');
        
        const isctrPercent = screen.getByText('-6,73%');
        expect(isctrPercent).toHaveClass('text-red-600');
      });
    });
  });

  describe('En Aktif Hisseler', () => {
    it('aktif hisseler gösterilmeli', async () => {
      render(<MarketOverview />);

      await waitFor(() => {
        expect(screen.getByText('BİST')).toBeInTheDocument();
        expect(screen.getByText('Akbank')).toBeInTheDocument();
      });
    });

    it('işlem hacmi gösterilmeli', async () => {
      render(<MarketOverview />);

      await waitFor(() => {
        expect(screen.getByText('15.000.000')).toBeInTheDocument();
        expect(screen.getByText('12.500.000')).toBeInTheDocument();
      });
    });

    it('işlem değeri gösterilmeli', async () => {
      render(<MarketOverview />);

      await waitFor(() => {
        expect(screen.getByText('1,25 Milyar TL')).toBeInTheDocument();
        expect(screen.getByText('847,5 Milyon TL')).toBeInTheDocument();
      });
    });
  });

  describe('Grafik Görünümü', () => {
    it('endeks grafiği gösterilmeli', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMarketData
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockHistoricalData })
      });

      render(<MarketOverview showChart={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('market-chart')).toBeInTheDocument();
        expect(screen.getByTestId('chart-title')).toHaveTextContent('BIST 100 - Son 7 Gün');
      });
    });

    it('grafik türü değiştirilebilmeli', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMarketData
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockHistoricalData })
      });

      render(<MarketOverview showChart={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('chart-type-selector')).toBeInTheDocument();
      });

      const chartTypeSelector = screen.getByTestId('chart-type-selector');
      await user.selectOptions(chartTypeSelector, 'candlestick');

      expect(screen.getByTestId('chart-type')).toHaveTextContent('candlestick');
    });

    it('zaman periyodu değiştirilebilmeli', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMarketData
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockHistoricalData })
      });

      render(<MarketOverview showChart={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('time-period-selector')).toBeInTheDocument();
      });

      const timePeriodSelector = screen.getByTestId('time-period-selector');
      await user.selectOptions(timePeriodSelector, '1M');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('period=1M'),
        expect.any(Object)
      );
    });
  });

  describe('Filtreler ve Sıralama', () => {
    it('endeks filtresi çalışmalı', async () => {
      render(<MarketOverview />);

      await waitFor(() => {
        expect(screen.getByTestId('index-filter')).toBeInTheDocument();
      });

      const indexFilter = screen.getByTestId('index-filter');
      await user.selectOptions(indexFilter, 'XU100');

      expect(screen.getByText('BIST 100')).toBeInTheDocument();
      expect(screen.queryByText('BIST 30')).not.toBeInTheDocument();
    });

    it('sektör filtresi çalışmalı', async () => {
      render(<MarketOverview />);

      await waitFor(() => {
        expect(screen.getByTestId('sector-filter')).toBeInTheDocument();
      });

      const sectorFilter = screen.getByTestId('sector-filter');
      await user.selectOptions(sectorFilter, 'Teknoloji');

      expect(screen.getByText('Teknoloji')).toBeInTheDocument();
      expect(screen.queryByText('Bankacılık')).not.toBeInTheDocument();
    });

    it('performansa göre sıralama çalışmalı', async () => {
      render(<MarketOverview />);

      await waitFor(() => {
        expect(screen.getByTestId('sort-selector')).toBeInTheDocument();
      });

      const sortSelector = screen.getByTestId('sort-selector');
      await user.selectOptions(sortSelector, 'performance-desc');

      // En yüksek performanslı sektör ilk sırada olmalı
      const sectors = screen.getAllByTestId(/^sector-/);
      expect(sectors[0]).toHaveTextContent('Teknoloji'); // +2.45%
    });

    it('hacme göre sıralama çalışmalı', async () => {
      render(<MarketOverview />);

      await waitFor(() => {
        expect(screen.getByTestId('sort-selector')).toBeInTheDocument();
      });

      const sortSelector = screen.getByTestId('sort-selector');
      await user.selectOptions(sortSelector, 'volume-desc');

      // En yüksek hacimli sektör ilk sırada olmalı
      const sectors = screen.getAllByTestId(/^sector-/);
      expect(sectors[0]).toHaveTextContent('Bankacılık'); // 2.10 Milyar TL
    });
  });

  describe('Yenileme ve Otomatik Güncelleme', () => {
    it('yenile butonu çalışmalı', async () => {
      render(<MarketOverview />);

      await waitFor(() => {
        expect(screen.getByTestId('refresh-button')).toBeInTheDocument();
      });

      const refreshButton = screen.getByTestId('refresh-button');
      fireEvent.click(refreshButton);

      expect(fetch).toHaveBeenCalledTimes(2); // İlk yükleme + yenileme
    });

    it('otomatik güncelleme çalışmalı', async () => {
      vi.useFakeTimers();
      
      render(<MarketOverview autoRefresh={true} refreshInterval={30000} />);

      await waitFor(() => {
        expect(screen.getByText('BIST 100')).toBeInTheDocument();
      });

      // 30 saniye ileri sar
      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(2); // İlk yükleme + otomatik yenileme
      });

      vi.useRealTimers();
    });

    it('otomatik güncelleme durdurulabilmeli', async () => {
      vi.useFakeTimers();
      
      render(<MarketOverview autoRefresh={true} refreshInterval={30000} />);

      await waitFor(() => {
        expect(screen.getByTestId('auto-refresh-toggle')).toBeInTheDocument();
      });

      const autoRefreshToggle = screen.getByTestId('auto-refresh-toggle');
      fireEvent.click(autoRefreshToggle);

      // 30 saniye ileri sar
      vi.advanceTimersByTime(30000);

      expect(fetch).toHaveBeenCalledTimes(1); // Sadece ilk yükleme

      vi.useRealTimers();
    });
  });

  describe('Hata Durumları', () => {
    it('API hatası gösterilmeli', async () => {
      (fetch as any).mockRejectedValue(new Error('Network error'));

      render(<MarketOverview />);

      await waitFor(() => {
        expect(screen.getByTestId('market-error')).toBeInTheDocument();
        expect(screen.getByText('Piyasa verileri yüklenirken bir hata oluştu')).toBeInTheDocument();
      });
    });

    it('yeniden deneme butonu çalışmalı', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'))
                    .mockResolvedValue({
                      ok: true,
                      json: async () => mockMarketData
                    });

      render(<MarketOverview />);

      await waitFor(() => {
        expect(screen.getByText('Piyasa verileri yüklenirken bir hata oluştu')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Yeniden Dene');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('BIST 100')).toBeInTheDocument();
      });
    });

    it('kısmi veri hatası gösterilmeli', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          indices: mockMarketData.indices,
          sectors: [], // Boş sektör verisi
          marketStatus: mockMarketData.marketStatus
        })
      });

      render(<MarketOverview />);

      await waitFor(() => {
        expect(screen.getByText('BIST 100')).toBeInTheDocument();
        expect(screen.getByText('Sektör verileri yüklenemedi')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Tasarım', () => {
    it('mobil görünümde kartlar düzenlenmeli', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      render(<MarketOverview />);

      const container = screen.getByTestId('market-overview');
      expect(container).toHaveClass('flex-col');
    });

    it('tablet görünümde kartlar düzenlenmeli', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });

      render(<MarketOverview />);

      const container = screen.getByTestId('market-overview');
      expect(container).toHaveClass('md:grid-cols-2');
    });

    it('masaüstü görünümde kartlar düzenlenmeli', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
      });

      render(<MarketOverview />);

      const container = screen.getByTestId('market-overview');
      expect(container).toHaveClass('lg:grid-cols-3');
    });
  });

  describe('Performans', () => {
    it('bileşen hızlı render edilmeli', () => {
      const startTime = performance.now();
      render(<MarketOverview />);
      const endTime = performance.now();

      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(100); // 100ms'den az
    });

    it('büyük veri seti ile performans korunmalı', async () => {
      const largeMarketData = {
        ...mockMarketData,
        indices: Array.from({ length: 50 }, (_, i) => ({
          ...mockMarketData.indices[0],
          symbol: `INDEX${i}`,
          name: `Index ${i}`
        })),
        sectors: Array.from({ length: 30 }, (_, i) => ({
          ...mockMarketData.sectors[0],
          name: `Sector ${i}`
        }))
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => largeMarketData
      });

      const startTime = performance.now();
      render(<MarketOverview />);
      
      await waitFor(() => {
        expect(screen.getByText('Index 1')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(500); // 500ms'den az
    });

    it('gereksiz re-render olmamalı', async () => {
      const renderSpy = vi.fn();
      
      const TestComponent = (props: any) => {
        renderSpy();
        return <MarketOverview {...props} />;
      };

      const { rerender } = render(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByText('BIST 100')).toBeInTheDocument();
      });
      
      // Aynı props ile yeniden render
      rerender(<TestComponent />);
      
      expect(renderSpy).toHaveBeenCalledTimes(2); // İlk render + rerender
    });
  });

  describe('Klavye Navigasyonu', () => {
    it('Tab tuşu ile endeksler arasında gezinilebilmeli', async () => {
      render(<MarketOverview />);

      await waitFor(() => {
        expect(screen.getByText('BIST 100')).toBeInTheDocument();
      });

      const firstIndex = screen.getByTestId('index-XU100');
      const secondIndex = screen.getByTestId('index-XU030');

      firstIndex.focus();
      expect(firstIndex).toHaveFocus();

      fireEvent.keyDown(firstIndex, { key: 'Tab' });
      expect(secondIndex).toHaveFocus();
    });

    it('Enter tuşu ile endeks detayına gidilebilmeli', async () => {
      const mockNavigate = vi.fn();
      vi.mock('react-router-dom', () => ({
        useNavigate: () => mockNavigate
      }));

      render(<MarketOverview />);

      await waitFor(() => {
        expect(screen.getByText('BIST 100')).toBeInTheDocument();
      });

      const firstIndex = screen.getByTestId('index-XU100');
      firstIndex.focus();
      fireEvent.keyDown(firstIndex, { key: 'Enter' });

      expect(mockNavigate).toHaveBeenCalledWith('/index/XU100');
    });

    it('Arrow tuşları ile navigasyon çalışmalı', async () => {
      render(<MarketOverview />);

      await waitFor(() => {
        expect(screen.getByText('BIST 100')).toBeInTheDocument();
      });

      const firstIndex = screen.getByTestId('index-XU100');
      const secondIndex = screen.getByTestId('index-XU030');

      firstIndex.focus();
      fireEvent.keyDown(firstIndex, { key: 'ArrowDown' });
      expect(secondIndex).toHaveFocus();

      fireEvent.keyDown(secondIndex, { key: 'ArrowUp' });
      expect(firstIndex).toHaveFocus();
    });
  });

  describe('Temizlik', () => {
    it('component unmount olduğunda API çağrıları iptal edilmeli', () => {
      const abortSpy = vi.fn();
      const mockAbortController = {
        abort: abortSpy,
        signal: {}
      };
      
      global.AbortController = vi.fn(() => mockAbortController) as any;

      const { unmount } = render(<MarketOverview />);
      
      unmount();
      
      expect(abortSpy).toHaveBeenCalled();
    });

    it('component unmount olduğunda timer\'lar temizlenmeli', () => {
      vi.useFakeTimers();
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      const { unmount } = render(<MarketOverview autoRefresh={true} />);
      
      unmount();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      
      vi.useRealTimers();
    });

    it('component unmount olduğunda event listener\'lar temizlenmeli', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      const { unmount } = render(<MarketOverview />);
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalled();
    });
  });
});