import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FinancialCalculator from '../FinancialCalculator';

const mockStockData = {
  stockCode: 'THYAO',
  analysis: {
    stockCode: 'THYAO',
    companyName: 'Türk Hava Yolları',
    totalAssets: 50000000,
    totalLiabilities: 30000000,
    equity: 20000000,
    currentAssets: 15000000,
    shortTermLiabilities: 10000000,
    netProfit: 2000000,
    revenue: 25000000,
    operatingProfit: 3000000,
    lastUpdated: new Date('2024-01-01T12:00:00Z')
  }
};

describe('FinancialCalculator Component', () => {
  beforeEach(() => {
    render(<FinancialCalculator stockData={mockStockData} />);
  });

  it('renders financial calculator with title', () => {
    expect(screen.getByText('Finansal Hesap Makinesi')).toBeInTheDocument();
    expect(screen.getByText('Özel finansal hesaplamalar yapın')).toBeInTheDocument();
  });

  it('displays calculator interface', () => {
    expect(screen.getByText('Hesap Makinesi')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0')).toBeInTheDocument();
  });

  it('shows number buttons', () => {
    for (let i = 0; i <= 9; i++) {
      expect(screen.getByRole('button', { name: i.toString() })).toBeInTheDocument();
    }
  });

  it('shows operation buttons', () => {
    expect(screen.getByRole('button', { name: '+' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '-' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '×' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '÷' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '=' })).toBeInTheDocument();
  });

  it('shows clear and backspace buttons', () => {
    expect(screen.getByRole('button', { name: 'C' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '⌫' })).toBeInTheDocument();
  });

  it('performs basic addition', () => {
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '=' }));
    
    expect(screen.getByDisplayValue('8')).toBeInTheDocument();
  });

  it('performs basic subtraction', () => {
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: '-' }));
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    fireEvent.click(screen.getByRole('button', { name: '=' }));
    
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
  });

  it('performs basic multiplication', () => {
    fireEvent.click(screen.getByRole('button', { name: '6' }));
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    fireEvent.click(screen.getByRole('button', { name: '7' }));
    fireEvent.click(screen.getByRole('button', { name: '=' }));
    
    expect(screen.getByDisplayValue('42')).toBeInTheDocument();
  });

  it('performs basic division', () => {
    fireEvent.click(screen.getByRole('button', { name: '8' }));
    fireEvent.click(screen.getByRole('button', { name: '÷' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '=' }));
    
    expect(screen.getByDisplayValue('4')).toBeInTheDocument();
  });

  it('handles decimal numbers', () => {
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '.' }));
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    
    expect(screen.getByDisplayValue('3.5')).toBeInTheDocument();
  });

  it('clears display when C button is clicked', () => {
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    
    expect(screen.getByDisplayValue('123')).toBeInTheDocument();
    
    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    
    expect(screen.getByDisplayValue('0')).toBeInTheDocument();
  });

  it('handles backspace correctly', () => {
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    
    expect(screen.getByDisplayValue('123')).toBeInTheDocument();
    
    fireEvent.click(screen.getByRole('button', { name: '⌫' }));
    
    expect(screen.getByDisplayValue('12')).toBeInTheDocument();
  });

  it('shows custom calculation section', () => {
    expect(screen.getByText('Özel Hesaplamalar')).toBeInTheDocument();
    expect(screen.getByText('Şirket verilerini kullanarak özel hesaplamalar yapın')).toBeInTheDocument();
  });

  it('displays financial data fields for selection', () => {
    expect(screen.getByText('Toplam Varlıklar')).toBeInTheDocument();
    expect(screen.getByText('Toplam Borçlar')).toBeInTheDocument();
    expect(screen.getByText('Özkaynak')).toBeInTheDocument();
    expect(screen.getByText('Dönen Varlıklar')).toBeInTheDocument();
  });

  it('allows field selection for custom calculations', () => {
    const totalAssetsCheckbox = screen.getByLabelText('Toplam Varlıklar');
    
    fireEvent.click(totalAssetsCheckbox);
    
    expect(totalAssetsCheckbox).toBeChecked();
  });

  it('shows field values when selected', () => {
    const totalAssetsCheckbox = screen.getByLabelText('Toplam Varlıklar');
    
    fireEvent.click(totalAssetsCheckbox);
    
    expect(screen.getByText('₺50.000.000,00')).toBeInTheDocument();
  });

  it('performs custom calculation with selected fields', () => {
    const totalAssetsCheckbox = screen.getByLabelText('Toplam Varlıklar');
    const totalLiabilitiesCheckbox = screen.getByLabelText('Toplam Borçlar');
    
    fireEvent.click(totalAssetsCheckbox);
    fireEvent.click(totalLiabilitiesCheckbox);
    
    const calculateButton = screen.getByRole('button', { name: 'Hesapla' });
    fireEvent.click(calculateButton);
    
    // Should show equity calculation (assets - liabilities)
    expect(screen.getByText('₺20.000.000,00')).toBeInTheDocument();
  });

  it('shows calculation history', () => {
    expect(screen.getByText('Hesaplama Geçmişi')).toBeInTheDocument();
  });

  it('adds calculations to history', () => {
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '=' }));
    
    expect(screen.getByText('5 + 3 = 8')).toBeInTheDocument();
  });

  it('clears calculation history', () => {
    // First add a calculation
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '=' }));
    
    expect(screen.getByText('5 + 3 = 8')).toBeInTheDocument();
    
    // Then clear history
    const clearHistoryButton = screen.getByRole('button', { name: 'Geçmişi Temizle' });
    fireEvent.click(clearHistoryButton);
    
    expect(screen.queryByText('5 + 3 = 8')).not.toBeInTheDocument();
  });

  it('handles division by zero', () => {
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByRole('button', { name: '÷' }));
    fireEvent.click(screen.getByRole('button', { name: '0' }));
    fireEvent.click(screen.getByRole('button', { name: '=' }));
    
    expect(screen.getByDisplayValue('Hata')).toBeInTheDocument();
  });

  it('handles invalid operations gracefully', () => {
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    fireEvent.click(screen.getByRole('button', { name: '=' }));
    
    expect(screen.getByDisplayValue('Hata')).toBeInTheDocument();
  });

  it('shows percentage calculations', () => {
    expect(screen.getByRole('button', { name: '%' })).toBeInTheDocument();
    
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByRole('button', { name: '0' }));
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    
    expect(screen.getByDisplayValue('0.5')).toBeInTheDocument();
  });

  it('handles complex calculations', () => {
    // Test: (10 + 5) × 2 = 30
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '0' }));
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByRole('button', { name: '=' }));
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '=' }));
    
    expect(screen.getByDisplayValue('30')).toBeInTheDocument();
  });

  it('formats large numbers correctly', () => {
    const totalAssetsCheckbox = screen.getByLabelText('Toplam Varlıklar');
    fireEvent.click(totalAssetsCheckbox);
    
    // Should format 50000000 as ₺50.000.000,00
    expect(screen.getByText('₺50.000.000,00')).toBeInTheDocument();
  });
});