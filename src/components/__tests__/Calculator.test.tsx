import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Calculator from '../Calculator';

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

describe('Calculator', () => {
  beforeEach(() => {
    // Mock navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
      writable: true,
    });
    vi.clearAllMocks();
  });

  it('renders calculator with title', () => {
    render(<Calculator />);
    expect(screen.getByText('Akıllı Hesap Makinesi')).toBeInTheDocument();
  });

  it('renders input field', () => {
    render(<Calculator />);
    expect(screen.getByPlaceholderText(/Hesaplama yazın/)).toBeInTheDocument();
  });

  it('renders number buttons', () => {
    render(<Calculator />);
    for (let i = 0; i <= 9; i++) {
      expect(screen.getByRole('button', { name: i.toString() })).toBeInTheDocument();
    }
  });

  it('renders operation buttons', () => {
    render(<Calculator />);
    expect(screen.getByTitle('Toplama')).toBeInTheDocument();
    expect(screen.getByTitle('Çıkarma')).toBeInTheDocument();
    expect(screen.getByTitle('Çarpma')).toBeInTheDocument();
    expect(screen.getByTitle('Bölme')).toBeInTheDocument();
  });

  it('handles number button clicks', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    
    const input = screen.getByPlaceholderText(/Hesaplama yazın/);
    const button5 = screen.getByRole('button', { name: '5' });
    
    await user.click(button5);
    expect(input).toHaveValue('5');
  });

  it('handles operation button clicks', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    
    const input = screen.getByPlaceholderText(/Hesaplama yazın/);
    const plusButton = screen.getByTitle('Toplama');
    
    await user.click(plusButton);
    expect(input).toHaveValue('+');
  });

  it('performs basic calculation', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    
    const input = screen.getByPlaceholderText(/Hesaplama yazın/);
    const button2 = screen.getByRole('button', { name: '2' });
    const plusButton = screen.getByTitle('Toplama');
    const button3 = screen.getByRole('button', { name: '3' });
    const equalsButton = screen.getByTitle('Hesapla');
    
    await user.click(button2);
    await user.click(plusButton);
    await user.click(button3);
    await user.click(equalsButton);
    
    await waitFor(() => {
      expect(screen.getByText('2+3 = 5')).toBeInTheDocument();
    });
  });

  it('clears display when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    
    const input = screen.getByPlaceholderText(/Hesaplama yazın/);
    const button5 = screen.getByRole('button', { name: '5' });
    const clearButton = screen.getByTitle('Tümünü temizle');
    
    await user.click(button5);
    expect(input).toHaveValue('5');
    
    await user.click(clearButton);
    expect(input).toHaveValue('');
  });

  it('handles direct input in text field', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    
    const input = screen.getByPlaceholderText(/Hesaplama yazın/);
    
    await user.type(input, '10 + 5');
    expect(input).toHaveValue('10 + 5');
  });

  it('handles keyboard shortcuts - Enter to calculate', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    
    const input = screen.getByPlaceholderText(/Hesaplama yazın/);
    
    await user.type(input, '7 + 3');
    await user.keyboard('{Enter}');
    
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });

  it('handles keyboard shortcuts - Escape to clear', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    
    const input = screen.getByPlaceholderText(/Hesaplama yazın/);
    
    await user.type(input, '123');
    expect(input).toHaveValue('123');
    
    await user.keyboard('{Escape}');
    expect(input).toHaveValue('');
  });

  it('handles decimal numbers', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    
    const input = screen.getByPlaceholderText(/Hesaplama yazın/);
    const button1 = screen.getByRole('button', { name: '1' });
    const dotButton = screen.getByRole('button', { name: '.' });
    const button5 = screen.getByRole('button', { name: '5' });
    
    await user.click(button1);
    await user.click(dotButton);
    await user.click(button5);
    
    expect(input).toHaveValue('1.5');
  });

  it('shows error for invalid expressions', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    
    const input = screen.getByPlaceholderText(/Hesaplama yazın/);
    const equalsButton = screen.getByTitle('Hesapla');
    
    await user.type(input, '5 + * 3');
    await user.click(equalsButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Hata/)).toBeInTheDocument();
    });
  });

  it('toggles auto calculate feature', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    
    const autoCalcButton = screen.getByText('Otomatik Açık');
    expect(autoCalcButton).toBeInTheDocument();
    
    await user.click(autoCalcButton);
    expect(screen.getByText('Otomatik Kapalı')).toBeInTheDocument();
  });

  it('toggles history panel', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    
    const historyButton = screen.getByTitle('Geçmişi göster/gizle');
    
    await user.click(historyButton);
    expect(screen.getByText('Geçmiş')).toBeInTheDocument();
  });

  it('copies result to clipboard', async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');
    render(<Calculator />);
    
    const input = screen.getByPlaceholderText(/Hesaplama yazın/);
    const equalsButton = screen.getByTitle('Hesapla');
    
    await user.type(input, '15 + 25');
    await user.click(equalsButton);
    
    await waitFor(() => {
      expect(screen.getByText('40')).toBeInTheDocument();
    });
    
    const copyButton = screen.getByRole('button', { name: /kopyala/i });
    await user.click(copyButton);
    
    expect(writeTextSpy).toHaveBeenCalledWith('40');
  });

  it('handles division by zero', async () => {
    const user = userEvent.setup();
    render(<Calculator />);
    
    const input = screen.getByPlaceholderText(/Hesaplama yazın/);
    const equalsButton = screen.getByTitle('Hesapla');
    
    await user.type(input, '5 / 0');
    await user.click(equalsButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Hata/)).toBeInTheDocument();
    });
  });
});