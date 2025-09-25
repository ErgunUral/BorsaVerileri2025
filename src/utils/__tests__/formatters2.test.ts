// Test dosyası - formatters utility fonksiyonları için

describe('Formatters', () => {
  describe('formatCurrency', () => {
    it('should format number as Turkish currency', () => {
      const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('tr-TR', {
          style: 'currency',
          currency: 'TRY'
        }).format(value);
      };

      expect(formatCurrency(1234.56)).toBe('₺1.234,56');
      expect(formatCurrency(0)).toBe('₺0,00');
      expect(formatCurrency(-500)).toBe('-₺500,00');
    });
  });

  describe('formatPercentage', () => {
    it('should format number as percentage', () => {
      const formatPercentage = (value: number): string => {
        return `${value.toFixed(2)}%`;
      };

      expect(formatPercentage(12.345)).toBe('12.35%');
      expect(formatPercentage(0)).toBe('0.00%');
      expect(formatPercentage(-5.67)).toBe('-5.67%');
    });
  });
});