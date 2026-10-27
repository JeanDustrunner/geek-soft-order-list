import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { MoneyPipe } from './money.pipe';

describe('MoneyPipe', () => {
  const pipe = TestBed.runInInjectionContext(() => new MoneyPipe());

  it('shows an amount of 1 and above with two decimals', () => {
    expect(pipe.transform(-8731.06)).toBe('-8,731.06');
  });

  it('shows a small swap instead of rounding it away to 0.00', () => {
    expect(pipe.transform(-0.00757409)).toBe('-0.0076');
  });

  it('trims trailing zeros down to two decimals', () => {
    expect(pipe.transform(0.05)).toBe('0.05');
  });

  it('shows an amount too small to display as a plain zero, never "-0.00"', () => {
    expect(pipe.transform(-1e-12)).toBe('0.00');
  });

  it('passes an unknown amount through, so the template can show a dash', () => {
    expect(pipe.transform(null)).toBeNull();
  });
});
