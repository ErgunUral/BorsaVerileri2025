import '@testing-library/jest-dom';

// Mock IntersectionObserver
(global as any).IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds = [];
  
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
  takeRecords() {
    return [];
  }
};

// Mock ResizeObserver
(global as any).ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: jest.fn(() => true),
});

// Mock window.alert
Object.defineProperty(window, 'alert', {
  writable: true,
  value: jest.fn(),
});

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('componentWillReceiveProps has been renamed')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Global test utilities
global.testUtils = {
  // Mock fetch response helper
  mockFetchResponse: (data: any, ok = true) => {
    return Promise.resolve({
      ok,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    } as Response);
  },

  // Mock fetch error helper
  mockFetchError: (error: string) => {
    return Promise.reject(new Error(error));
  },

  // Wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Create mock port config
  createMockPortConfig: (overrides = {}) => ({
    id: 'test-port-id',
    name: 'Test Port',
    host: 'localhost',
    port: 8080,
    timeout: 5000,
    retryCount: 3,
    retryDelay: 1000,
    enabled: true,
    tags: ['test'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  }),

  // Create mock port check result
  createMockPortCheckResult: (overrides = {}) => ({
    id: 'test-result-id',
    portConfigId: 'test-port-id',
    host: 'localhost',
    port: 8080,
    status: 'online' as const,
    responseTime: 150,
    timestamp: new Date().toISOString(),
    ...overrides
  }),

  // Create mock system stats
  createMockSystemStats: (overrides = {}) => ({
    totalPorts: 5,
    onlinePorts: 4,
    offlinePorts: 1,
    totalChecks: 1000,
    successfulChecks: 850,
    failedChecks: 150,
    averageResponseTime: 200,
    uptime: 85.0,
    ...overrides
  })
};

// Extend global types
declare global {
  var testUtils: {
    mockFetchResponse: (data: any, ok?: boolean) => Promise<Response>;
    mockFetchError: (error: string) => Promise<never>;
    waitFor: (ms: number) => Promise<void>;
    createMockPortConfig: (overrides?: any) => any;
    createMockPortCheckResult: (overrides?: any) => any;
    createMockSystemStats: (overrides?: any) => any;
  };
}