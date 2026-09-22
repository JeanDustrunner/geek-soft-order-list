import { describe, expect, it } from 'vitest';
import { ProfitClassPipe } from './profit-class.pipe';

describe('ProfitClassPipe', () => {
  const pipe = new ProfitClassPipe();

  it('marks a gain so the row can be painted green (R12)', () => {
    expect(pipe.transform(12.5)).toBe('profit-positive');
  });

  it('marks a loss so the row can be painted red (R12)', () => {
    expect(pipe.transform(-12.5)).toBe('profit-negative');
  });

  it('leaves a break-even result unpainted, because R12 colours only gains and losses', () => {
    expect(pipe.transform(0)).toBe('');
  });

  it('leaves a negative zero unpainted as well, so the sign of zero never reaches the UI', () => {
    expect(pipe.transform(-0)).toBe('');
  });

  it('leaves an unknown profit unpainted, because "—" is neither a gain nor a loss', () => {
    expect(pipe.transform(null)).toBe('');
  });
});
