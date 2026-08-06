import { describe, it, expect } from 'bun:test';
import { formatCOP } from './currency';

const normalize = (s: string) => s.replace(/\s/g, ' ');

describe('Currency Formatting - formatCOP', () => {
  it('should format zero correctly', () => {
    expect(normalize(formatCOP(0))).toBe('$ 0');
  });

  it('should format positive integers correctly', () => {
    expect(normalize(formatCOP(19412))).toBe('$ 19.412');
    expect(normalize(formatCOP(1000))).toBe('$ 1.000');
    expect(normalize(formatCOP(1000000))).toBe('$ 1.000.000');
  });

  it('should handle rounding of decimals', () => {
    expect(normalize(formatCOP(19412.4))).toBe('$ 19.412');
    expect(normalize(formatCOP(19412.5))).toBe('$ 19.413');
    expect(normalize(formatCOP(19412.6))).toBe('$ 19.413');
  });

  it('should format negative numbers correctly', () => {
    expect(normalize(formatCOP(-19412))).toBe('-$ 19.412');
    expect(normalize(formatCOP(-1000))).toBe('-$ 1.000');
    expect(normalize(formatCOP(-50))).toBe('-$ 50');
  });
});
