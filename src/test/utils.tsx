import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Mock data
export const mockStockData = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  price: 150.25,
  change: 2.5,
  changePercent: 1.69,
  volume: 50000000,
  marketCap: 2500000000000,
  peRatio: 25.5,
  week52High: 180.0,
  week52Low: 120.0,
  dividendYield: 0.5,
  lastUpdated: new Date().toISOString(),
};

export const mockMarketData = {
  indices: [
    {
      symbol: 'BIST100',
      name: 'BIST 100',
      value: 8500.25,
      change: 125.5,
      changePercent: 1.5,
    },
    {
      symbol: 'BIST30',
      name: 'BIST 30',
      value: 12500.75,
      change: -85.25,
      changePercent: -0.68,
    },
  ],
  topGainers: [
    {
      symbol: 'THYAO',
      name: 'Türk Hava Yolları',
      price: 125.5,
      change: 8.5,
      changePercent: 7.26,
    },
  ],
  topLosers: [
    {
      symbol: 'AKBNK',
      name: 'Akbank',
      price: 45.2,
      change: -2.8,
      changePercent: -5.83,
    },
  ],
};

export const mockChartData = [
  { time: '2024-01-01', value: 145.0 },
  { time: '2024-01-02', value: 147.5 },
  { time: '2024-01-03', value: 150.25 },
  { time: '2024-01-04', value: 148.0 },
  { time: '2024-01-05', value: 152.75 },
];

// Test wrapper component
interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

// Custom render function
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Mock API responses
export const mockApiResponse = {
  success: (data: any) => ({
    success: true,
    data,
    message: 'Success',
  }),
  error: (message = 'An error occurred') => ({
    success: false,
    data: null,
    message,
    error: message,
  }),
};

// Mock WebSocket events
export const mockWebSocketEvents = {
  priceUpdate: (symbol: string, price: number) => ({
    type: 'price_update',
    data: {
      symbol,
      price,
      timestamp: Date.now(),
    },
  }),
  marketUpdate: (data: any) => ({
    type: 'market_update',
    data,
  }),
  connectionStatus: (status: 'connected' | 'disconnected' | 'reconnecting') => ({
    type: 'connection_status',
    data: { status },
  }),
};

// Test helpers
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

export const createMockIntersectionObserver = () => {
  const mockIntersectionObserver = vi.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.IntersectionObserver = mockIntersectionObserver;
  return mockIntersectionObserver;
};

export const createMockResizeObserver = () => {
  const mockResizeObserver = vi.fn();
  mockResizeObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.ResizeObserver = mockResizeObserver;
  return mockResizeObserver;
};

// Mock timers helpers
export const advanceTimersByTime = (ms: number) => {
  vi.advanceTimersByTime(ms);
};

export const runAllTimers = () => {
  vi.runAllTimers();
};

// Mock fetch helper
export const mockFetchOnce = (response: any, ok = true) => {
  const mockResponse = {
    ok,
    json: vi.fn().mockResolvedValue(response),
    text: vi.fn().mockResolvedValue(JSON.stringify(response)),
    status: ok ? 200 : 400,
    statusText: ok ? 'OK' : 'Bad Request',
  };
  
  (global.fetch as any).mockResolvedValueOnce(mockResponse);
  return mockResponse;
};

// Error boundary for testing
export class TestErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <div data-testid="error-boundary">Something went wrong</div>;
    }

    return this.props.children;
  }
}