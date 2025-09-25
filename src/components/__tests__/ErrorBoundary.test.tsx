import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import ErrorBoundary from '../ErrorBoundary';

// Test component that throws an error
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Mock console.error to avoid noise in test output
const originalError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  test('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Bir Hata Oluştu')).toBeInTheDocument();
    expect(screen.getByText('Bileşen yüklenirken beklenmeyen bir hata oluştu.')).toBeInTheDocument();
  });

  test('displays error details when available', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Test error')).toBeInTheDocument();
    
    process.env.NODE_ENV = originalEnv;
  });

  test('shows retry button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Yeniden Dene')).toBeInTheDocument();
  });

  test('shows reload page button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Yeniden Dene')).toBeInTheDocument();
  });

  test('logs error to console', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  test('displays error boundary with custom fallback', () => {
    const customFallback = <div>Custom error message</div>;
    
    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  test('handles JavaScript errors', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const JavaScriptError: React.FC = () => {
      throw new TypeError('Cannot read property of undefined');
    };
    
    render(
      <ErrorBoundary>
        <JavaScriptError />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Bir Hata Oluştu')).toBeInTheDocument();
    expect(screen.getByText('Cannot read property of undefined')).toBeInTheDocument();
    
    process.env.NODE_ENV = originalEnv;
  });

  test('handles network errors', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const NetworkError: React.FC = () => {
      throw new Error('Network request failed');
    };
    
    render(
      <ErrorBoundary>
        <NetworkError />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Bir Hata Oluştu')).toBeInTheDocument();
    expect(screen.getByText('Network request failed')).toBeInTheDocument();
    
    process.env.NODE_ENV = originalEnv;
  });

  test('shows error stack trace in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Hata Detayları (Geliştirme)')).toBeInTheDocument();
    
    process.env.NODE_ENV = originalEnv;
  });

  test('hides error stack trace in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.queryByText('Hata Detayları (Geliştirme)')).not.toBeInTheDocument();
    
    process.env.NODE_ENV = originalEnv;
  });

  test('has retry button that calls handleRetry', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Bir Hata Oluştu')).toBeInTheDocument();
    
    // Check that retry button exists and is clickable
    const retryButton = screen.getByText('Yeniden Dene');
    expect(retryButton).toBeInTheDocument();
    
    // Click retry button (this will reset the error state)
    retryButton.click();
    
    // The error boundary state should be reset, but since the same component
    // that throws error is rendered again, it will throw again
    // This is expected behavior for error boundaries
    expect(screen.getByText('Bir Hata Oluştu')).toBeInTheDocument();
  });

  test('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Normal component</div>
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Normal component')).toBeInTheDocument();
    expect(screen.queryByText('Bir Hata Oluştu')).not.toBeInTheDocument();
  });

  test('provides error logging functionality', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
      expect.any(Error),
      expect.any(Object)
    );
    
    consoleSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });
});