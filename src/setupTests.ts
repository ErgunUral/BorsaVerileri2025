import '@testing-library/jest-dom';

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

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock Socket.IO
jest.mock('socket.io-client', () => {
  return {
    io: jest.fn(() => ({
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      connected: true,
    })),
  };
});

// Mock Chart.js
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  PointElement: jest.fn(),
  LineElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
}));

// Mock recharts
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => ({ type: 'div', props: { 'data-testid': 'line-chart', children } }),
  Line: () => ({ type: 'div', props: { 'data-testid': 'line' } }),
  XAxis: () => ({ type: 'div', props: { 'data-testid': 'x-axis' } }),
  YAxis: () => ({ type: 'div', props: { 'data-testid': 'y-axis' } }),
  CartesianGrid: () => ({ type: 'div', props: { 'data-testid': 'cartesian-grid' } }),
  Tooltip: () => ({ type: 'div', props: { 'data-testid': 'tooltip' } }),
  Legend: () => ({ type: 'div', props: { 'data-testid': 'legend' } }),
  ResponsiveContainer: ({ children }: any) => ({ type: 'div', props: { 'data-testid': 'responsive-container', children } }),
}));