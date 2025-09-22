# Bileşen Dokümantasyonu

## Genel Bakış

Bu dokümantasyon, Borsa Analizi uygulamasının React bileşenlerini ve kullanımlarını açıklar.

## Ana Bileşenler

### App

**Konum:** `src/App.tsx`

**Açıklama:** Uygulamanın ana bileşeni. Routing ve global state yönetimini sağlar.

**Props:** Yok

**Kullanım:**
```tsx
import App from './App';

function Root() {
  return <App />;
}
```

**Özellikler:**
- React Router ile sayfa yönlendirme
- Global error boundary
- Theme provider
- Socket.io bağlantı yönetimi

### StockSearch

**Konum:** `src/components/StockSearch.tsx`

**Açıklama:** Hisse senedi arama ve seçim bileşeni.

**Props:**
```typescript
interface StockSearchProps {
  onStockSelect: (stockData: StockData) => void;
}
```

**Kullanım:**
```tsx
import StockSearch from './components/StockSearch';

function HomePage() {
  const handleStockSelect = (stockData) => {
    console.log('Seçilen hisse:', stockData);
  };

  return (
    <StockSearch onStockSelect={handleStockSelect} />
  );
}
```

**Özellikler:**
- Otomatik tamamlama
- Popüler hisseler listesi
- Son aramalar geçmişi
- Gerçek zamanlı arama
- Socket.io entegrasyonu

**State:**
- `searchTerm`: Arama terimi
- `suggestions`: Öneri listesi
- `isLoading`: Yükleme durumu
- `error`: Hata mesajı
- `recentSearches`: Son aramalar

### StockAnalysis

**Konum:** `src/components/StockAnalysis.tsx`

**Açıklama:** Hisse senedi detaylı analiz görünümü.

**Props:**
```typescript
interface StockAnalysisProps {
  stockData: StockData;
}
```

**Kullanım:**
```tsx
import StockAnalysis from './components/StockAnalysis';

function AnalysisPage({ stockData }) {
  return (
    <StockAnalysis stockData={stockData} />
  );
}
```

**Özellikler:**
- Finansal oranlar hesaplama
- Teknik göstergeler
- Grafik formasyonu tanıma
- Risk analizi
- AI tabanlı öneriler
- Gerçek zamanlı güncelleme

**Alt Bileşenler:**
- `FinancialCalculator`
- `AnalysisRecommendations`
- `TechnicalIndicators`
- `PatternRecognition`

### FinancialCalculator

**Konum:** `src/components/FinancialCalculator.tsx`

**Açıklama:** Finansal hesap makinesi bileşeni.

**Props:**
```typescript
interface FinancialCalculatorProps {
  stockData?: StockData;
}
```

**Kullanım:**
```tsx
import FinancialCalculator from './components/FinancialCalculator';

function CalculatorPage() {
  return (
    <FinancialCalculator />
  );
}
```

**Özellikler:**
- Temel matematik işlemleri
- Finansal hesaplamalar (ROI, P/E, vb.)
- Hesaplama geçmişi
- Özel fonksiyonlar
- Klavye desteği

**State:**
- `display`: Ekran değeri
- `previousValue`: Önceki değer
- `operation`: Mevcut işlem
- `history`: Hesaplama geçmişi

### AnalysisRecommendations

**Konum:** `src/components/AnalysisRecommendations.tsx`

**Açıklama:** AI tabanlı analiz önerileri bileşeni.

**Props:**
```typescript
interface AnalysisRecommendationsProps {
  stockData: StockData;
  analysisData: AnalysisData;
}
```

**Kullanım:**
```tsx
import AnalysisRecommendations from './components/AnalysisRecommendations';

function RecommendationsPage({ stockData, analysisData }) {
  return (
    <AnalysisRecommendations 
      stockData={stockData} 
      analysisData={analysisData} 
    />
  );
}
```

**Özellikler:**
- AI tabanlı öneriler
- Risk değerlendirmesi
- Hedef fiyat tahminleri
- İşlem sinyalleri
- Güven skorları

### PortMonitor

**Konum:** `src/components/PortMonitor.tsx`

**Açıklama:** Sistem port izleme bileşeni.

**Props:**
```typescript
interface PortMonitorProps {
  ports?: number[];
  autoRefresh?: boolean;
  refreshInterval?: number;
}
```

**Kullanım:**
```tsx
import PortMonitor from './components/PortMonitor';

function SystemPage() {
  return (
    <PortMonitor 
      ports={[3001, 3002]} 
      autoRefresh={true} 
      refreshInterval={5000} 
    />
  );
}
```

**Özellikler:**
- Port durumu izleme
- Sistem istatistikleri
- Otomatik yenileme
- Gerçek zamanlı güncellemeler

## Yardımcı Bileşenler

### LoadingSpinner

**Konum:** `src/components/ui/LoadingSpinner.tsx`

**Açıklama:** Yükleme animasyonu bileşeni.

**Props:**
```typescript
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
}
```

**Kullanım:**
```tsx
import LoadingSpinner from './components/ui/LoadingSpinner';

function LoadingPage() {
  return (
    <LoadingSpinner size="lg" text="Analiz ediliyor..." />
  );
}
```

### ErrorBoundary

**Konum:** `src/components/ErrorBoundary.tsx`

**Açıklama:** Hata yakalama ve görüntüleme bileşeni.

**Props:**
```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{error: Error}>;
}
```

**Kullanım:**
```tsx
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <MainContent />
    </ErrorBoundary>
  );
}
```

### Toast

**Konum:** `src/components/ui/Toast.tsx`

**Açıklama:** Bildirim mesajları bileşeni.

**Props:**
```typescript
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
}
```

**Kullanım:**
```tsx
import { toast } from './components/ui/Toast';

// Programatik kullanım
toast.success('İşlem başarılı!');
toast.error('Bir hata oluştu!');
```

## Hook'lar

### useSocket

**Konum:** `src/hooks/useSocket.ts`

**Açıklama:** Socket.io bağlantı yönetimi hook'u.

**Kullanım:**
```tsx
import { useSocket } from '../hooks/useSocket';

function MyComponent() {
  const { socket, connected, emit } = useSocket();

  const handleAnalyze = (stockCode: string) => {
    emit('analyze-stock', stockCode);
  };

  return (
    <div>
      <p>Bağlantı: {connected ? 'Bağlı' : 'Bağlantı Kesildi'}</p>
      <button onClick={() => handleAnalyze('THYAO')}>Analiz Et</button>
    </div>
  );
}
```

**Dönen Değerler:**
- `socket`: Socket.io instance
- `connected`: Bağlantı durumu
- `emit`: Event gönderme fonksiyonu
- `on`: Event dinleme fonksiyonu
- `off`: Event dinlemeyi durdurma fonksiyonu

### useStockData

**Konum:** `src/hooks/useStockData.ts`

**Açıklama:** Hisse senedi verisi yönetimi hook'u.

**Kullanım:**
```tsx
import { useStockData } from '../hooks/useStockData';

function StockComponent() {
  const { 
    stockData, 
    loading, 
    error, 
    fetchStock, 
    refreshData 
  } = useStockData();

  useEffect(() => {
    fetchStock('THYAO');
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <div>Hata: {error}</div>;

  return (
    <div>
      <h1>{stockData?.stockCode}</h1>
      <button onClick={refreshData}>Yenile</button>
    </div>
  );
}
```

### useLocalStorage

**Konum:** `src/hooks/useLocalStorage.ts`

**Açıklama:** Local storage yönetimi hook'u.

**Kullanım:**
```tsx
import { useLocalStorage } from '../hooks/useLocalStorage';

function SettingsComponent() {
  const [theme, setTheme] = useLocalStorage('theme', 'light');
  const [favorites, setFavorites] = useLocalStorage('favorites', []);

  return (
    <div>
      <select value={theme} onChange={(e) => setTheme(e.target.value)}>
        <option value="light">Açık</option>
        <option value="dark">Koyu</option>
      </select>
    </div>
  );
}
```

## Utility Fonksiyonlar

### formatters

**Konum:** `src/utils/formatters.ts`

**Fonksiyonlar:**
- `formatCurrency(value: number, currency?: string): string`
- `formatPercentage(value: number, decimals?: number): string`
- `formatNumber(value: number, decimals?: number): string`
- `formatDate(date: Date | string, format?: string): string`

**Kullanım:**
```tsx
import { formatCurrency, formatPercentage } from '../utils/formatters';

function PriceDisplay({ price, change }) {
  return (
    <div>
      <span>{formatCurrency(price)}</span>
      <span>{formatPercentage(change)}</span>
    </div>
  );
}
```

### calculations

**Konum:** `src/utils/calculations.ts`

**Fonksiyonlar:**
- `calculatePE(price: number, eps: number): number`
- `calculateROE(netIncome: number, equity: number): number`
- `calculateCurrentRatio(currentAssets: number, currentLiabilities: number): number`
- `calculateRSI(prices: number[], period?: number): number`

**Kullanım:**
```tsx
import { calculatePE, calculateROE } from '../utils/calculations';

function FinancialRatios({ stockData }) {
  const pe = calculatePE(stockData.price, stockData.eps);
  const roe = calculateROE(stockData.netIncome, stockData.equity);

  return (
    <div>
      <p>P/E: {pe.toFixed(2)}</p>
      <p>ROE: {roe.toFixed(2)}%</p>
    </div>
  );
}
```

## Stil Rehberi

### Tailwind CSS Sınıfları

Uygulama Tailwind CSS kullanır. Yaygın kullanılan sınıflar:

**Layout:**
- `container mx-auto`: Merkezi container
- `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`: Responsive grid
- `flex items-center justify-between`: Flexbox layout

**Spacing:**
- `p-4`: Padding
- `m-4`: Margin
- `space-y-4`: Dikey boşluk

**Colors:**
- `bg-blue-500`: Arka plan rengi
- `text-gray-700`: Metin rengi
- `border-gray-300`: Kenarlık rengi

**Typography:**
- `text-lg font-semibold`: Büyük, kalın metin
- `text-sm text-gray-500`: Küçük, gri metin

### Bileşen Yapısı

Tüm bileşenler şu yapıyı takip eder:

```tsx
import React from 'react';
import { SomeIcon } from 'lucide-react';

interface ComponentProps {
  // Props tanımları
}

const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // State ve effect'ler
  
  // Event handler'lar
  
  // Render
  return (
    <div className="component-container">
      {/* JSX içeriği */}
    </div>
  );
};

export default Component;
```

## Test Yapısı

Her bileşen için test dosyası `__tests__` klasöründe bulunur:

```
src/
  components/
    __tests__/
      Component.test.tsx
    Component.tsx
```

**Test Örneği:**
```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Component from '../Component';

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interaction', () => {
    const mockHandler = jest.fn();
    render(<Component onAction={mockHandler} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(mockHandler).toHaveBeenCalled();
  });
});
```

## Performans Optimizasyonu

### React.memo

Performans kritik bileşenler `React.memo` ile sarılır:

```tsx
const ExpensiveComponent = React.memo(({ data }) => {
  // Bileşen içeriği
});
```

### useMemo ve useCallback

Ağır hesaplamalar ve fonksiyonlar memoize edilir:

```tsx
const Component = ({ data }) => {
  const expensiveValue = useMemo(() => {
    return heavyCalculation(data);
  }, [data]);

  const handleClick = useCallback(() => {
    // Event handler
  }, [dependency]);

  return <div>{/* JSX */}</div>;
};
```

## Hata Yönetimi

Tüm bileşenler hata durumlarını graceful şekilde yönetir:

```tsx
const Component = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (error) {
    return (
      <div className="error-container">
        <p>Bir hata oluştu: {error}</p>
        <button onClick={() => setError(null)}>Tekrar Dene</button>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return <div>{/* Normal içerik */}</div>;
};
```

## Erişilebilirlik

Tüm bileşenler WCAG 2.1 standartlarına uygun olarak geliştirilir:

- Semantic HTML kullanımı
- ARIA etiketleri
- Klavye navigasyonu
- Renk kontrastı
- Screen reader desteği

```tsx
const AccessibleButton = ({ onClick, children, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label="Hisse senedi analiz et"
      className="focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {children}
    </button>
  );
};
```