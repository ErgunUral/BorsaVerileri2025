import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn utility function', () => {
  describe('Basic functionality', () => {
    it('should combine class names', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('should handle single class name', () => {
      expect(cn('single-class')).toBe('single-class');
    });

    it('should handle empty input', () => {
      expect(cn()).toBe('');
      expect(cn('')).toBe('');
    });

    it('should handle multiple class names', () => {
      expect(cn('class1', 'class2', 'class3', 'class4')).toBe('class1 class2 class3 class4');
    });
  });

  describe('Conditional classes', () => {
    it('should handle conditional classes with boolean values', () => {
      expect(cn('base', true && 'conditional')).toBe('base conditional');
      expect(cn('base', false && 'conditional')).toBe('base');
    });

    it('should handle object syntax for conditional classes', () => {
      expect(cn({
        'base': true,
        'conditional': true,
        'hidden': false
      })).toBe('base conditional');
    });

    it('should handle mixed conditional syntax', () => {
      const isActive = true;
      const isDisabled = false;
      
      expect(cn(
        'base-class',
        isActive && 'active',
        isDisabled && 'disabled',
        {
          'extra': true,
          'hidden': false
        }
      )).toBe('base-class active extra');
    });
  });

  describe('Tailwind CSS specific functionality', () => {
    it('should merge conflicting Tailwind classes', () => {
      // tailwind-merge should handle conflicting classes
      expect(cn('px-2 px-4')).toBe('px-4');
      expect(cn('text-red-500 text-blue-500')).toBe('text-blue-500');
    });

    it('should merge responsive classes correctly', () => {
      expect(cn('text-sm md:text-lg lg:text-xl')).toBe('text-sm md:text-lg lg:text-xl');
    });

    it('should handle hover and focus states', () => {
      expect(cn('bg-blue-500 hover:bg-blue-600 focus:bg-blue-700')).toBe('bg-blue-500 hover:bg-blue-600 focus:bg-blue-700');
    });

    it('should merge conflicting margin classes', () => {
      expect(cn('m-2 mx-4')).toBe('m-2 mx-4');
      expect(cn('mx-2 mx-4')).toBe('mx-4');
    });

    it('should merge conflicting padding classes', () => {
      expect(cn('p-2 px-4')).toBe('p-2 px-4');
      expect(cn('px-2 px-4')).toBe('px-4');
    });

    it('should handle background color conflicts', () => {
      expect(cn('bg-red-500 bg-blue-500')).toBe('bg-blue-500');
      expect(cn('bg-red-500 hover:bg-blue-500')).toBe('bg-red-500 hover:bg-blue-500');
    });

    it('should handle text color conflicts', () => {
      expect(cn('text-red-500 text-blue-500')).toBe('text-blue-500');
      expect(cn('text-red-500 hover:text-blue-500')).toBe('text-red-500 hover:text-blue-500');
    });

    it('should handle border conflicts', () => {
      expect(cn('border border-2')).toBe('border-2');
      expect(cn('border-red-500 border-blue-500')).toBe('border-blue-500');
    });

    it('should handle width and height conflicts', () => {
      expect(cn('w-4 w-8')).toBe('w-8');
      expect(cn('h-4 h-8')).toBe('h-8');
    });

    it('should handle display conflicts', () => {
      expect(cn('block inline')).toBe('inline');
      expect(cn('flex inline-flex')).toBe('inline-flex');
    });

    it('should handle position conflicts', () => {
      expect(cn('static relative absolute')).toBe('absolute');
      expect(cn('relative absolute fixed')).toBe('fixed');
    });
  });

  describe('Array inputs', () => {
    it('should handle array of class names', () => {
      expect(cn(['class1', 'class2', 'class3'])).toBe('class1 class2 class3');
    });

    it('should handle nested arrays', () => {
      expect(cn(['class1', ['class2', 'class3']])).toBe('class1 class2 class3');
    });

    it('should handle arrays with conditional classes', () => {
      expect(cn(['base', true && 'conditional', false && 'hidden'])).toBe('base conditional');
    });

    it('should handle mixed array and string inputs', () => {
      expect(cn('base', ['class1', 'class2'], 'final')).toBe('base class1 class2 final');
    });
  });

  describe('Null and undefined handling', () => {
    it('should handle null values', () => {
      expect(cn('base', null, 'final')).toBe('base final');
    });

    it('should handle undefined values', () => {
      expect(cn('base', undefined, 'final')).toBe('base final');
    });

    it('should handle mixed null, undefined, and valid values', () => {
      expect(cn('base', null, undefined, 'middle', null, 'final')).toBe('base middle final');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty strings', () => {
      expect(cn('', 'class1', '', 'class2')).toBe('class1 class2');
    });

    it('should handle whitespace', () => {
      expect(cn(' ', 'class1', '  ', 'class2')).toBe('class1 class2');
    });

    it('should handle classes with special characters', () => {
      expect(cn('class-with-dashes', 'class_with_underscores')).toBe('class-with-dashes class_with_underscores');
    });

    it('should handle numeric classes', () => {
      expect(cn('class1', '2xl', '3xl')).toBe('class1 2xl 3xl');
    });

    it('should handle very long class strings', () => {
      const longClass = 'very-long-class-name-that-might-be-used-in-some-edge-cases';
      expect(cn('base', longClass, 'final')).toBe(`base ${longClass} final`);
    });

    it('should handle duplicate classes', () => {
      expect(cn('duplicate', 'unique', 'duplicate')).toBe('duplicate unique');
    });
  });

  describe('Real-world usage patterns', () => {
    it('should handle button variant patterns', () => {
      const variant = 'primary';
      const size = 'lg';
      const disabled = false;
      
      expect(cn(
        'btn',
        variant === 'primary' && 'btn-primary',
        variant === 'secondary' && 'btn-secondary',
        size === 'sm' && 'btn-sm',
        size === 'lg' && 'btn-lg',
        disabled && 'btn-disabled'
      )).toBe('btn btn-primary btn-lg');
    });

    it('should handle card component patterns', () => {
      const elevated = true;
      const interactive = false;
      
      expect(cn(
        'card',
        'rounded-lg',
        'border',
        elevated && 'shadow-lg',
        interactive && 'hover:shadow-xl cursor-pointer'
      )).toBe('card rounded-lg border shadow-lg');
    });

    it('should handle form input patterns', () => {
      const hasError = true;
      const isFocused = false;
      const isDisabled = false;
      
      expect(cn(
        'input',
        'border rounded px-3 py-2',
        hasError ? 'border-red-500 text-red-900' : 'border-gray-300',
        isFocused && 'ring-2 ring-blue-500',
        isDisabled && 'bg-gray-100 cursor-not-allowed'
      )).toBe('input border rounded px-3 py-2 border-red-500 text-red-900');
    });

    it('should handle responsive grid patterns', () => {
      expect(cn(
        'grid',
        'grid-cols-1',
        'md:grid-cols-2',
        'lg:grid-cols-3',
        'xl:grid-cols-4',
        'gap-4'
      )).toBe('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4');
    });

    it('should handle dark mode patterns', () => {
      expect(cn(
        'bg-white text-gray-900',
        'dark:bg-gray-900 dark:text-white',
        'border border-gray-200',
        'dark:border-gray-700'
      )).toBe('bg-white text-gray-900 dark:bg-gray-900 dark:text-white border border-gray-200 dark:border-gray-700');
    });
  });

  describe('Performance considerations', () => {
    it('should handle many class names efficiently', () => {
      const manyClasses = Array.from({ length: 100 }, (_, i) => `class-${i}`);
      const startTime = performance.now();
      const result = cn(...manyClasses);
      const endTime = performance.now();
      
      expect(result).toContain('class-0');
      expect(result).toContain('class-99');
      expect(endTime - startTime).toBeLessThan(10); // Should be very fast
    });

    it('should handle repeated calls efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        cn('base', 'class1', 'class2', i % 2 === 0 && 'even');
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Should handle many calls quickly
    });
  });

  describe('Type safety', () => {
    it('should accept various input types', () => {
      // These should all compile and work without TypeScript errors
      expect(() => cn('string')).not.toThrow();
      expect(() => cn(['array'])).not.toThrow();
      expect(() => cn({ object: true })).not.toThrow();
      expect(() => cn(undefined)).not.toThrow();
      expect(() => cn(null)).not.toThrow();
      expect(() => cn(false && 'conditional')).not.toThrow();
    });
  });
});