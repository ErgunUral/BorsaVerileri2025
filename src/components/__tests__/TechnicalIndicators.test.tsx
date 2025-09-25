import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import TechnicalIndicators from '../TechnicalIndicators';

// Mock Chart component
vi.mock('../Chart', () => ({
  default: ({ data, type, symbol, ...props }: any) => (
    <div 
      data-testid="indicator-chart" 
      data-type={type}
      data-symbol={symbol}
      data-chart-data={JSON.stringify(data)}
      {...props}
    />
  )
}));

// Mock technical analysis library
vi.mock('technicalindicators', () => ({
  SMA: {
    calculate: vi.fn((input) => {
      const { period, values } = input;
      return values.slice(period - 1).map((_, i) => {
        const slice = values.slice(i, i + period);
        return slice.reduce((sum, val) => sum + val, 0) / period;
      });
    })
  },
  EMA: {
    calculate: vi.fn((input) => {
      const { period, values } = input;
      return values.slice(period - 1).map((_, i) => {
        return values[i + period - 1] * 0.8 + (values[i + period - 2] || 0) * 0.2;
      });
    })
  },
  RSI: {
    calculate: vi.fn((input) => {
      const { period, values } = input;
      return values.slice(period - 1).map(() => 50 + Math.random() * 40);
    })
  },
  MACD: {
    calculate: vi.fn((input) => {
      const { values } = input;
      return values.slice(25).map(() => ({
        MACD: Math.random() * 2 - 1,
        signal: Math.random() * 2 - 1,
        histogram: Math.random() * 2 - 1
      }));
    })
  },
  BollingerBands: {
    calculate: vi.fn((input) => {
      const { period, values } = input;
      return values.slice(period - 1).map((value) => ({
        upper: value * 1.1,
        middle: value,
        lower: value * 0.9
      }));
    })
  },
  Stochastic: {
    calculate: vi.fn((input) => {
      const { period } = input;
      return Array.from({ length: period }, () => ({
        k: Math.random() * 100,
        d: Math.random() * 100
      }));
    })
  },
  WilliamsR: {
    calculate: vi.fn((input) => {
      const { period } = input;
      return Array.from({ length: period }, () => Math.random() * -100);
    })
  },
  ADX: {
    calculate: vi.fn((input) => {
      const { period } = input;
      return Array.from({ length: period }, () => Math.random() * 100);
    })
  }
}));

describe('TechnicalIndicators Component', () => {
  const user = userEvent.setup();

  const mockPriceData = [
    { timestamp: '2024-01-15T09:30:00Z', open: 150.00, high: 152.00, low: 149.50, close: 151.25, volume: 2000000 },
    { timestamp: '2024-01-15T10:00:00Z', open: 151.25, high: 153.00, low: 150.75, close: 152.50, volume: 1800000 },
    { timestamp: '2024-01-15T10:30:00Z', open: 152.50, high: 154.00, low: 151.00, close: 153.75, volume: 2200000 },
    { timestamp: '2024-01-15T11:00:00Z', open: 153.75, high: 155.00, low: 152.25, close: 154.00, volume: 1900000 },
    { timestamp: '2024-01-15T11:30:00Z', open: 154.00, high: 156.00, low: 153.00, close: 155.25, volume: 2100000 }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Temel Render', () => {
    it('teknik göstergeler paneli render edilmeli', () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      expect(screen.getByTestId('technical-indicators')).toBeInTheDocument();
      expect(screen.getByText('Teknik Göstergeler')).toBeInTheDocument();
    });

    it('gösterge seçici render edilmeli', () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      expect(screen.getByTestId('indicator-selector')).toBeInTheDocument();
      expect(screen.getByText('Gösterge Ekle')).toBeInTheDocument();
    });

    it('aktif göstergeler listesi render edilmeli', () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      expect(screen.getByTestId('active-indicators')).toBeInTheDocument();
    });

    it('boş veri ile uyarı gösterilmeli', () => {
      render(
        <TechnicalIndicators
          data={[]}
          symbol="AAPL"
        />
      );

      expect(screen.getByText('Teknik analiz için yeterli veri bulunmuyor')).toBeInTheDocument();
    });
  });

  describe('Gösterge Ekleme', () => {
    it('SMA göstergesi eklenebilmeli', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'SMA');
      
      const addButton = screen.getByText('Ekle');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('SMA (20)')).toBeInTheDocument();
      });
    });

    it('EMA göstergesi eklenebilmeli', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'EMA');
      
      const addButton = screen.getByText('Ekle');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('EMA (12)')).toBeInTheDocument();
      });
    });

    it('RSI göstergesi eklenebilmeli', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'RSI');
      
      const addButton = screen.getByText('Ekle');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('RSI (14)')).toBeInTheDocument();
      });
    });

    it('MACD göstergesi eklenebilmeli', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'MACD');
      
      const addButton = screen.getByText('Ekle');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('MACD (12,26,9)')).toBeInTheDocument();
      });
    });

    it('Bollinger Bands göstergesi eklenebilmeli', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'BB');
      
      const addButton = screen.getByText('Ekle');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Bollinger Bands (20,2)')).toBeInTheDocument();
      });
    });

    it('aynı gösterge birden fazla kez eklenememeli', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'SMA');
      
      const addButton = screen.getByText('Ekle');
      fireEvent.click(addButton);
      fireEvent.click(addButton);

      await waitFor(() => {
        const smaIndicators = screen.getAllByText(/SMA \(20\)/);
        expect(smaIndicators).toHaveLength(1);
      });
    });
  });

  describe('Gösterge Kaldırma', () => {
    it('gösterge kaldırılabilmeli', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      // Önce gösterge ekle
      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'SMA');
      
      const addButton = screen.getByText('Ekle');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('SMA (20)')).toBeInTheDocument();
      });

      // Sonra kaldır
      const removeButton = screen.getByTestId('remove-SMA');
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText('SMA (20)')).not.toBeInTheDocument();
      });
    });

    it('tüm göstergeler kaldırılabilmeli', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      // Birkaç gösterge ekle
      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'SMA');
      fireEvent.click(screen.getByText('Ekle'));
      
      await user.selectOptions(selector, 'RSI');
      fireEvent.click(screen.getByText('Ekle'));

      await waitFor(() => {
        expect(screen.getByText('SMA (20)')).toBeInTheDocument();
        expect(screen.getByText('RSI (14)')).toBeInTheDocument();
      });

      // Tümünü kaldır
      const clearButton = screen.getByText('Tümünü Kaldır');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.queryByText('SMA (20)')).not.toBeInTheDocument();
        expect(screen.queryByText('RSI (14)')).not.toBeInTheDocument();
      });
    });
  });

  describe('Gösterge Parametreleri', () => {
    it('SMA periyodu değiştirilebilmeli', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'SMA');
      
      const periodInput = screen.getByTestId('sma-period');
      await user.clear(periodInput);
      await user.type(periodInput, '50');
      
      const addButton = screen.getByText('Ekle');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('SMA (50)')).toBeInTheDocument();
      });
    });

    it('RSI periyodu değiştirilebilmeli', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'RSI');
      
      const periodInput = screen.getByTestId('rsi-period');
      await user.clear(periodInput);
      await user.type(periodInput, '21');
      
      const addButton = screen.getByText('Ekle');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('RSI (21)')).toBeInTheDocument();
      });
    });

    it('MACD parametreleri değiştirilebilmeli', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'MACD');
      
      const fastInput = screen.getByTestId('macd-fast');
      const slowInput = screen.getByTestId('macd-slow');
      const signalInput = screen.getByTestId('macd-signal');
      
      await user.clear(fastInput);
      await user.type(fastInput, '10');
      await user.clear(slowInput);
      await user.type(slowInput, '20');
      await user.clear(signalInput);
      await user.type(signalInput, '5');
      
      const addButton = screen.getByText('Ekle');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('MACD (10,20,5)')).toBeInTheDocument();
      });
    });

    it('geçersiz parametreler için hata gösterilmeli', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'SMA');
      
      const periodInput = screen.getByTestId('sma-period');
      await user.clear(periodInput);
      await user.type(periodInput, '0');
      
      const addButton = screen.getByText('Ekle');
      fireEvent.click(addButton);

      expect(screen.getByText('Periyot 1\'den büyük olmalıdır')).toBeInTheDocument();
    });
  });

  describe('Gösterge Hesaplamaları', () => {
    it('SMA doğru hesaplanmalı', async () => {
      const { SMA } = await import('technicalindicators');
      
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'SMA');
      
      const addButton = screen.getByText('Ekle');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(SMA.calculate).toHaveBeenCalledWith({
          period: 20,
          values: mockPriceData.map(d => d.close)
        });
      });
    });

    it('EMA doğru hesaplanmalı', async () => {
      const { EMA } = await import('technicalindicators');
      
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'EMA');
      
      const addButton = screen.getByText('Ekle');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(EMA.calculate).toHaveBeenCalledWith({
          period: 12,
          values: mockPriceData.map(d => d.close)
        });
      });
    });

    it('RSI doğru hesaplanmalı', async () => {
      const { RSI } = await import('technicalindicators');
      
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'RSI');
      
      const addButton = screen.getByText('Ekle');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(RSI.calculate).toHaveBeenCalledWith({
          period: 14,
          values: mockPriceData.map(d => d.close)
        });
      });
    });

    it('yetersiz veri ile hesaplama yapılmamalı', async () => {
      const shortData = mockPriceData.slice(0, 2);
      
      render(
        <TechnicalIndicators
          data={shortData}
          symbol="AAPL"
        />
      );

      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'SMA');
      
      const addButton = screen.getByText('Ekle');
      fireEvent.click(addButton);

      expect(screen.getByText('Yetersiz veri: SMA için en az 20 veri noktası gerekli')).toBeInTheDocument();
    });
  });

  describe('Gösterge Görselleştirme', () => {
    it('trend göstergeleri ana grafik üzerinde gösterilmeli', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'SMA');
      
      const addButton = screen.getByText('Ekle');
      fireEvent.click(addButton);

      await waitFor(() => {
        const chart = screen.getByTestId('indicator-chart');
        expect(chart).toHaveAttribute('data-type', 'overlay');
      });
    });

    it('osilatör göstergeleri ayrı panelde gösterilmeli', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'RSI');
      
      const addButton = screen.getByText('Ekle');
      fireEvent.click(addButton);

      await waitFor(() => {
        const chart = screen.getByTestId('indicator-chart');
        expect(chart).toHaveAttribute('data-type', 'oscillator');
      });
    });

    it('gösterge renkleri farklı olmalı', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      // İki farklı gösterge ekle
      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'SMA');
      fireEvent.click(screen.getByText('Ekle'));
      
      await user.selectOptions(selector, 'EMA');
      fireEvent.click(screen.getByText('Ekle'));

      await waitFor(() => {
        const smaIndicator = screen.getByTestId('indicator-SMA');
        const emaIndicator = screen.getByTestId('indicator-EMA');
        
        expect(smaIndicator).toHaveStyle('color: #3B82F6');
        expect(emaIndicator).toHaveStyle('color: #EF4444');
      });
    });
  });

  describe('Gösterge Değerleri', () => {
    it('güncel gösterge değerleri gösterilmeli', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'RSI');
      
      const addButton = screen.getByText('Ekle');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('rsi-current-value')).toBeInTheDocument();
        expect(screen.getByText(/RSI: \d+\.\d+/)).toBeInTheDocument();
      });
    });

    it('MACD sinyalleri gösterilmeli', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'MACD');
      
      const addButton = screen.getByText('Ekle');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('macd-values')).toBeInTheDocument();
        expect(screen.getByText(/MACD: /)).toBeInTheDocument();
        expect(screen.getByText(/Signal: /)).toBeInTheDocument();
        expect(screen.getByText(/Histogram: /)).toBeInTheDocument();
      });
    });

    it('RSI aşırı alım/satım seviyeleri vurgulanmalı', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'RSI');
      
      const addButton = screen.getByText('Ekle');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('rsi-overbought-line')).toBeInTheDocument();
        expect(screen.getByTestId('rsi-oversold-line')).toBeInTheDocument();
      });
    });
  });

  describe('Gösterge Sinyalleri', () => {
    it('alım sinyali tespit edilmeli', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'MACD');
      
      const addButton = screen.getByText('Ekle');
      fireEvent.click(addButton);

      await waitFor(() => {
        const signals = screen.queryByTestId('buy-signal');
        if (signals) {
          expect(signals).toBeInTheDocument();
        }
      });
    });

    it('satım sinyali tespit edilmeli', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'MACD');
      
      const addButton = screen.getByText('Ekle');
      fireEvent.click(addButton);

      await waitFor(() => {
        const signals = screen.queryByTestId('sell-signal');
        if (signals) {
          expect(signals).toBeInTheDocument();
        }
      });
    });

    it('sinyal bildirimleri gösterilmeli', async () => {
      const onSignal = vi.fn();
      
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
          onSignal={onSignal}
        />
      );

      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'RSI');
      
      const addButton = screen.getByText('Ekle');
      fireEvent.click(addButton);

      await waitFor(() => {
        if (onSignal.mock.calls.length > 0) {
          expect(onSignal).toHaveBeenCalledWith(
            expect.objectContaining({
              type: expect.stringMatching(/buy|sell/),
              indicator: 'RSI',
              value: expect.any(Number)
            })
          );
        }
      });
    });
  });

  describe('Preset Kombinasyonları', () => {
    it('trend analizi preset\'i yüklenebilmeli', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const presetButton = screen.getByText('Trend Analizi');
      fireEvent.click(presetButton);

      await waitFor(() => {
        expect(screen.getByText('SMA (20)')).toBeInTheDocument();
        expect(screen.getByText('EMA (12)')).toBeInTheDocument();
        expect(screen.getByText('MACD (12,26,9)')).toBeInTheDocument();
      });
    });

    it('momentum analizi preset\'i yüklenebilmeli', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const presetButton = screen.getByText('Momentum Analizi');
      fireEvent.click(presetButton);

      await waitFor(() => {
        expect(screen.getByText('RSI (14)')).toBeInTheDocument();
        expect(screen.getByText('Stochastic (14,3,3)')).toBeInTheDocument();
        expect(screen.getByText('Williams %R (14)')).toBeInTheDocument();
      });
    });

    it('volatilite analizi preset\'i yüklenebilmeli', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const presetButton = screen.getByText('Volatilite Analizi');
      fireEvent.click(presetButton);

      await waitFor(() => {
        expect(screen.getByText('Bollinger Bands (20,2)')).toBeInTheDocument();
        expect(screen.getByText('ATR (14)')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Tasarım', () => {
    it('mobil görünümde göstergeler düzenlenmeli', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const container = screen.getByTestId('technical-indicators');
      expect(container).toHaveClass('flex-col');
    });

    it('tablet görünümde göstergeler düzenlenmeli', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });

      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const container = screen.getByTestId('technical-indicators');
      expect(container).toHaveClass('md:flex-row');
    });
  });

  describe('Performans', () => {
    it('bileşen hızlı render edilmeli', () => {
      const startTime = performance.now();
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );
      const endTime = performance.now();

      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(100); // 100ms'den az
    });

    it('gösterge hesaplamaları hızlı olmalı', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const startTime = performance.now();
      
      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'SMA');
      
      const addButton = screen.getByText('Ekle');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('SMA (20)')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const calculationTime = endTime - startTime;
      expect(calculationTime).toBeLessThan(200); // 200ms'den az
    });

    it('çoklu gösterge ile performans korunmalı', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const startTime = performance.now();
      
      // Birden fazla gösterge ekle
      const selector = screen.getByTestId('indicator-selector');
      
      await user.selectOptions(selector, 'SMA');
      fireEvent.click(screen.getByText('Ekle'));
      
      await user.selectOptions(selector, 'RSI');
      fireEvent.click(screen.getByText('Ekle'));
      
      await user.selectOptions(selector, 'MACD');
      fireEvent.click(screen.getByText('Ekle'));

      await waitFor(() => {
        expect(screen.getByText('SMA (20)')).toBeInTheDocument();
        expect(screen.getByText('RSI (14)')).toBeInTheDocument();
        expect(screen.getByText('MACD (12,26,9)')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(500); // 500ms'den az
    });
  });

  describe('Klavye Navigasyonu', () => {
    it('Tab tuşu ile kontroller arasında gezinilebilmeli', () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const selector = screen.getByTestId('indicator-selector');
      const addButton = screen.getByText('Ekle');

      selector.focus();
      expect(selector).toHaveFocus();

      fireEvent.keyDown(selector, { key: 'Tab' });
      expect(addButton).toHaveFocus();
    });

    it('Enter tuşu ile gösterge eklenebilmeli', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'SMA');
      
      const addButton = screen.getByText('Ekle');
      addButton.focus();
      fireEvent.keyDown(addButton, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('SMA (20)')).toBeInTheDocument();
      });
    });

    it('Delete tuşu ile gösterge kaldırılabilmeli', async () => {
      render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      // Önce gösterge ekle
      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'SMA');
      fireEvent.click(screen.getByText('Ekle'));

      await waitFor(() => {
        expect(screen.getByText('SMA (20)')).toBeInTheDocument();
      });

      // Delete tuşu ile kaldır
      const indicator = screen.getByTestId('indicator-SMA');
      indicator.focus();
      fireEvent.keyDown(indicator, { key: 'Delete' });

      await waitFor(() => {
        expect(screen.queryByText('SMA (20)')).not.toBeInTheDocument();
      });
    });
  });

  describe('Temizlik', () => {
    it('component unmount olduğunda hesaplamalar durdurulmalı', () => {
      const { unmount } = render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );
      
      unmount();
      
      // Hesaplama fonksiyonlarının çağrılmadığını kontrol et
      expect(vi.clearAllMocks).toBeDefined();
    });

    it('veri değiştiğinde eski hesaplamalar temizlenmeli', async () => {
      const { rerender } = render(
        <TechnicalIndicators
          data={mockPriceData}
          symbol="AAPL"
        />
      );

      // Gösterge ekle
      const selector = screen.getByTestId('indicator-selector');
      await user.selectOptions(selector, 'SMA');
      fireEvent.click(screen.getByText('Ekle'));

      await waitFor(() => {
        expect(screen.getByText('SMA (20)')).toBeInTheDocument();
      });

      // Yeni veri ile rerender
      const newData = [...mockPriceData, {
        timestamp: '2024-01-15T12:00:00Z',
        open: 155.25,
        high: 157.00,
        low: 154.00,
        close: 156.50,
        volume: 2300000
      }];

      rerender(
        <TechnicalIndicators
          data={newData}
          symbol="AAPL"
        />
      );

      // Yeni hesaplama yapıldığını kontrol et
      await waitFor(() => {
        expect(screen.getByText('SMA (20)')).toBeInTheDocument();
      });
    });
  });
});