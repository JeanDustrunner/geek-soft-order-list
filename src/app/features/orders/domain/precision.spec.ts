import { describe, expect, it } from 'vitest';
import { moneyDecimals, roundMoney } from './precision';

describe('moneyDecimals / roundMoney', () => {
  it('shows amounts of 1 and above with two decimals', () => {
    expect(moneyDecimals(-8731.06)).toBe(2);
    expect(moneyDecimals(1)).toBe(2);
  });

  it('keeps two significant digits for amounts below 1', () => {
    expect(roundMoney(-0.00757409)).toEqual({ value: -0.0076, decimals: 4 });
    expect(roundMoney(0.00239839)).toEqual({ value: 0.0024, decimals: 4 });
  });

  it('never shows fewer than two decimals', () => {
    expect(roundMoney(0.5)).toEqual({ value: 0.5, decimals: 2 });
  });

  it('stops at eight decimals, so float noise never reaches the screen', () => {
    expect(roundMoney(1e-12)).toEqual({ value: 0, decimals: 8 });
  });

  it('turns a negative amount that rounds to zero into a plain zero', () => {
    expect(Object.is(roundMoney(-1e-12).value, 0)).toBe(true);
  });

  it('rounds the value to exactly the precision it will be shown with', () => {
    expect(roundMoney(1234.567).value).toBe(1234.57);
  });
});
