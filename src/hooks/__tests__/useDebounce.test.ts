import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';

describe('useDebounce Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  describe('Basic Functionality', () => {
    it('should return initial value immediately', () => {
      const { result } = renderHook(() => useDebounce('initial', 500));
      
      expect(result.current).toBe('initial');
    });

    it('should debounce value changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        {
          initialProps: { value: 'initial', delay: 500 }
        }
      );
      
      expect(result.current).toBe('initial');
      
      // Change value
      rerender({ value: 'updated', delay: 500 });
      
      // Should still be initial value before delay
      expect(result.current).toBe('initial');
      
      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(500);
      });
      
      // Should now be updated value
      expect(result.current).toBe('updated');
    });

    it('should reset timer on rapid value changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        {
          initialProps: { value: 'initial', delay: 500 }
        }
      );
      
      // First change
      rerender({ value: 'first', delay: 500 });
      
      // Advance time partially
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      // Second change before first completes
      rerender({ value: 'second', delay: 500 });
      
      // Advance time partially again
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      // Should still be initial value
      expect(result.current).toBe('initial');
      
      // Complete the second timer
      act(() => {
        vi.advanceTimersByTime(200);
      });
      
      // Should now be the second value
      expect(result.current).toBe('second');
    });

    it('should handle zero delay', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        {
          initialProps: { value: 'initial', delay: 0 }
        }
      );
      
      expect(result.current).toBe('initial');
      
      // Change value with zero delay
      rerender({ value: 'updated', delay: 0 });
      
      // Should update immediately
      act(() => {
        vi.advanceTimersByTime(0);
      });
      
      expect(result.current).toBe('updated');
    });

    it('should handle negative delay as zero', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        {
          initialProps: { value: 'initial', delay: -100 }
        }
      );
      
      expect(result.current).toBe('initial');
      
      // Change value with negative delay
      rerender({ value: 'updated', delay: -100 });
      
      // Should update immediately
      act(() => {
        vi.advanceTimersByTime(0);
      });
      
      expect(result.current).toBe('updated');
    });
  });

  describe('Different Data Types', () => {
    it('should work with strings', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: 'hello' }
        }
      );
      
      rerender({ value: 'world' });
      
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      expect(result.current).toBe('world');
    });

    it('should work with numbers', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: 42 }
        }
      );
      
      rerender({ value: 100 });
      
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      expect(result.current).toBe(100);
    });

    it('should work with objects', () => {
      const initialObj = { name: 'John', age: 30 };
      const updatedObj = { name: 'Jane', age: 25 };
      
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: initialObj }
        }
      );
      
      expect(result.current).toBe(initialObj);
      
      rerender({ value: updatedObj });
      
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      expect(result.current).toBe(updatedObj);
    });

    it('should work with arrays', () => {
      const initialArray = [1, 2, 3];
      const updatedArray = [4, 5, 6];
      
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: initialArray }
        }
      );
      
      expect(result.current).toBe(initialArray);
      
      rerender({ value: updatedArray });
      
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      expect(result.current).toBe(updatedArray);
    });

    it('should work with boolean values', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: true }
        }
      );
      
      expect(result.current).toBe(true);
      
      rerender({ value: false });
      
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      expect(result.current).toBe(false);
    });

    it('should work with null and undefined', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: null }
        }
      );
      
      expect(result.current).toBe(null);
      
      rerender({ value: undefined });
      
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      expect(result.current).toBe(undefined);
    });
  });

  describe('Delay Changes', () => {
    it('should handle delay changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        {
          initialProps: { value: 'initial', delay: 500 }
        }
      );
      
      // Change value and delay
      rerender({ value: 'updated', delay: 1000 });
      
      // Advance by old delay amount
      act(() => {
        vi.advanceTimersByTime(500);
      });
      
      // Should still be initial value
      expect(result.current).toBe('initial');
      
      // Advance by remaining new delay amount
      act(() => {
        vi.advanceTimersByTime(500);
      });
      
      // Should now be updated value
      expect(result.current).toBe('updated');
    });

    it('should use new delay for subsequent changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        {
          initialProps: { value: 'initial', delay: 500 }
        }
      );
      
      // First change with original delay
      rerender({ value: 'first', delay: 500 });
      
      act(() => {
        vi.advanceTimersByTime(500);
      });
      
      expect(result.current).toBe('first');
      
      // Second change with new delay
      rerender({ value: 'second', delay: 200 });
      
      act(() => {
        vi.advanceTimersByTime(200);
      });
      
      expect(result.current).toBe('second');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large delays', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 999999),
        {
          initialProps: { value: 'initial' }
        }
      );
      
      rerender({ value: 'updated' });
      
      // Advance by a large amount but not the full delay
      act(() => {
        vi.advanceTimersByTime(500000);
      });
      
      expect(result.current).toBe('initial');
      
      // Complete the delay
      act(() => {
        vi.advanceTimersByTime(499999);
      });
      
      expect(result.current).toBe('updated');
    });

    it('should handle rapid successive changes', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: 'initial' }
        }
      );
      
      // Make many rapid changes
      const values = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
      
      values.forEach((value, index) => {
        rerender({ value });
        
        // Advance time slightly but not enough to trigger
        act(() => {
          vi.advanceTimersByTime(50);
        });
      });
      
      // Should still be initial value
      expect(result.current).toBe('initial');
      
      // Complete the final delay
      act(() => {
        vi.advanceTimersByTime(250);
      });
      
      // Should be the last value
      expect(result.current).toBe('j');
    });

    it('should handle same value updates', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: 'same' }
        }
      );
      
      // Update with same value
      rerender({ value: 'same' });
      
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      expect(result.current).toBe('same');
    });

    it('should handle component unmount during debounce', () => {
      const { result, rerender, unmount } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: 'initial' }
        }
      );
      
      rerender({ value: 'updated' });
      
      // Unmount before debounce completes
      unmount();
      
      // Advance time
      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      // Should not cause any errors
      expect(true).toBe(true); // Test passes if no errors thrown
    });
  });

  describe('Performance', () => {
    it('should not create new timers for same value', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      
      const { rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: 'same' }
        }
      );
      
      const initialSetTimeoutCalls = setTimeoutSpy.mock.calls.length;
      
      // Update with same value multiple times
      rerender({ value: 'same' });
      rerender({ value: 'same' });
      rerender({ value: 'same' });
      
      // Should not create additional timers
      expect(setTimeoutSpy.mock.calls.length).toBe(initialSetTimeoutCalls);
      
      clearTimeoutSpy.mockRestore();
      setTimeoutSpy.mockRestore();
    });

    it('should properly clean up timers', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      
      const { rerender, unmount } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: 'initial' }
        }
      );
      
      // Make several changes
      rerender({ value: 'first' });
      rerender({ value: 'second' });
      rerender({ value: 'third' });
      
      // Unmount should clear the timer
      unmount();
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
      
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Real-world Use Cases', () => {
    it('should work for search input debouncing', () => {
      const { result, rerender } = renderHook(
        ({ searchTerm }) => useDebounce(searchTerm, 300),
        {
          initialProps: { searchTerm: '' }
        }
      );
      
      // Simulate user typing
      const searchSequence = ['a', 'ap', 'app', 'appl', 'apple'];
      
      searchSequence.forEach(term => {
        rerender({ searchTerm: term });
        act(() => {
          vi.advanceTimersByTime(100); // User types fast
        });
      });
      
      // Should still be empty
      expect(result.current).toBe('');
      
      // Complete the debounce
      act(() => {
        vi.advanceTimersByTime(200);
      });
      
      // Should be the final search term
      expect(result.current).toBe('apple');
    });

    it('should work for API call debouncing', () => {
      const mockApiCall = vi.fn();
      
      const { rerender } = renderHook(
        ({ query }) => {
          const debouncedQuery = useDebounce(query, 500);
          
          // Simulate effect that makes API call
          if (debouncedQuery) {
            mockApiCall(debouncedQuery);
          }
          
          return debouncedQuery;
        },
        {
          initialProps: { query: '' }
        }
      );
      
      // Rapid query changes
      rerender({ query: 'a' });
      rerender({ query: 'ab' });
      rerender({ query: 'abc' });
      
      // API should not be called yet
      expect(mockApiCall).not.toHaveBeenCalled();
      
      // Complete debounce
      act(() => {
        vi.advanceTimersByTime(500);
      });
      
      // API should be called once with final query
      expect(mockApiCall).toHaveBeenCalledTimes(1);
      expect(mockApiCall).toHaveBeenCalledWith('abc');
    });

    it('should work for resize event debouncing', () => {
      const { result, rerender } = renderHook(
        ({ windowWidth }) => useDebounce(windowWidth, 250),
        {
          initialProps: { windowWidth: 1920 }
        }
      );
      
      // Simulate rapid resize events
      const widths = [1900, 1850, 1800, 1750, 1700, 1650, 1600];
      
      widths.forEach(width => {
        rerender({ windowWidth: width });
        act(() => {
          vi.advanceTimersByTime(50);
        });
      });
      
      // Should still be original width
      expect(result.current).toBe(1920);
      
      // Complete debounce
      act(() => {
        vi.advanceTimersByTime(200);
      });
      
      // Should be final width
      expect(result.current).toBe(1600);
    });

    it('should work for form validation debouncing', () => {
      const validateEmail = vi.fn();
      
      const { rerender } = renderHook(
        ({ email }) => {
          const debouncedEmail = useDebounce(email, 400);
          
          // Simulate validation effect
          if (debouncedEmail && debouncedEmail.includes('@')) {
            validateEmail(debouncedEmail);
          }
          
          return debouncedEmail;
        },
        {
          initialProps: { email: '' }
        }
      );
      
      // User types email
      const emailSequence = [
        'j',
        'jo',
        'joh',
        'john',
        'john@',
        'john@e',
        'john@ex',
        'john@exa',
        'john@exam',
        'john@examp',
        'john@exampl',
        'john@example',
        'john@example.',
        'john@example.c',
        'john@example.co',
        'john@example.com'
      ];
      
      emailSequence.forEach(email => {
        rerender({ email });
        act(() => {
          vi.advanceTimersByTime(50);
        });
      });
      
      // Validation should not be called yet
      expect(validateEmail).not.toHaveBeenCalled();
      
      // Complete debounce
      act(() => {
        vi.advanceTimersByTime(350);
      });
      
      // Validation should be called with final email
      expect(validateEmail).toHaveBeenCalledTimes(1);
      expect(validateEmail).toHaveBeenCalledWith('john@example.com');
    });
  });
});