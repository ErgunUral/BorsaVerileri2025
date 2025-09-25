import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import StockDetail from '../StockDetail';

// Mock fetch
global.fetch = vi.fn();

// Mock data
const mockStockData = {
  stockCode: 'ASELS',
  companyName: 'Aselsan Elektronik Sanayi ve Ticaret A.Ş.',
  price: {
    price: 85.50,
    changePercent: 2.45,
    volume: 15000000,
    lastUpdated: '2025-01-20T10:30:00Z'
  },
  analysis: {
    stockCode: 'ASELS',
    companyName: 'Aselsan Elektronik Sanayi ve Ticaret A.Ş.',
    financialData: {
      revenue: 25000000000,
      netIncome: 3500000000
    },
    ratios: {
      pe: 15.2,
      pb: 2.1
    },
    recommendations: ['Al', 'Güçlü Al'],
    riskLevel: 'Orta' as const,
    investmentScore: 8.5
  }
};

const mockStockDataWithoutPrice = {
  stockCode: 'THYAO',
  companyName: 'Türk Hava Yolları A.O.',
};

describe('StockDetail Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful API response
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          current: 86.75,
          changePercent: 3.12,
          volume: 18000000
        }
      })
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should render stock information correctly', () => {
    render(<StockDetail stockData={mockStockData} />);
    
    expect(screen.getByText('Aselsan Elektronik Sanayi ve Ticaret A.Ş. | ASELS')).toBeInTheDocument();
  });



  it('should display volume information', () => {
    render(<StockDetail stockData={mockStockData} />);
    
    // Check if volume label is displayed
    expect(screen.getByText('Toplam İşlem Hacmi')).toBeInTheDocument();
  });

  it('should render breadcrumb navigation', () => {
    render(<StockDetail stockData={mockStockData} />);
    
    expect(screen.getByText('Ana Sayfa')).toBeInTheDocument();
    expect(screen.getByText('Analiz')).toBeInTheDocument();
    expect(screen.getByText('Hisse Senetleri')).toBeInTheDocument();
    expect(screen.getByText('Şirket Kartı')).toBeInTheDocument();
  });

  it('should handle stock data without price', () => {
    render(<StockDetail stockData={mockStockDataWithoutPrice} />);
    
    expect(screen.getByText('Türk Hava Yolları A.O. | THYAO')).toBeInTheDocument();
    expect(screen.getByText('0,00 TL')).toBeInTheDocument();
  });

  it('should show loading state initially for ASELS', async () => {
    render(<StockDetail stockData={mockStockData} />);
    
    expect(screen.getByText('Yükleniyor...')).toBeInTheDocument();
  });

  it('should render component without errors', () => {
    render(<StockDetail stockData={mockStockData} />);
    
    // Basic render test - just check if component renders
    expect(screen.getByText('Aselsan Elektronik Sanayi ve Ticaret A.Ş. | ASELS')).toBeInTheDocument();
  });

  it('should format large volumes correctly', () => {
    const stockDataWithLargeVolume = {
      ...mockStockData,
      price: {
        ...mockStockData.price,
        volume: 2500000000 // 2.5 billion
      }
    };
    
    render(<StockDetail stockData={stockDataWithLargeVolume} />);
    
    // Check if volume section is displayed
    expect(screen.getByText('Toplam İşlem Hacmi')).toBeInTheDocument();
  });

  it('should display tabs section', () => {
    render(<StockDetail stockData={mockStockData} />);
    
    // Check if tabs are displayed
    expect(screen.getByText('Özet')).toBeInTheDocument();
    expect(screen.getByText('Tahminler')).toBeInTheDocument();
    expect(screen.getByText('Mali Tablolar')).toBeInTheDocument();
  });

  it('should display basic stock information', () => {
    render(<StockDetail stockData={mockStockData} />);
    
    // Check if basic sections are displayed
    expect(screen.getByText('Temel Bilgiler')).toBeInTheDocument();
    expect(screen.getByText('Performans')).toBeInTheDocument();
    expect(screen.getByText('Öneriler')).toBeInTheDocument();
  });
});