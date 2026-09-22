import { describe, expect, it } from 'vitest';
import { parseQuotesMessage } from './quotes.parser';

const frame = (payload: unknown) => JSON.stringify(payload);

describe('parseQuotesMessage', () => {
  it('maps a subscribed-quotes frame onto domain quotes, renaming the wire fields', () => {
    const raw = frame({
      p: '/quotes/subscribed',
      d: [{ s: 'ETHUSD', b: 2134.69, a: 2138.28, t: 1770283819 }],
    });

    expect(parseQuotesMessage(raw)).toEqual([
      { symbol: 'ETHUSD', bid: 2134.69, ask: 2138.28, time: 1770283819 },
    ]);
  });

  it('maps every quote in a batch', () => {
    const raw = frame({
      p: '/quotes/subscribed',
      d: [
        { s: 'ETHUSD', b: 2134.69, a: 2138.28, t: 1 },
        { s: 'BTCUSD', b: 85910.18, a: 85920.0, t: 2 },
      ],
    });

    expect(parseQuotesMessage(raw)?.map((quote) => quote.symbol)).toEqual(['ETHUSD', 'BTCUSD']);
  });

  it('accepts a quote that omits ask and time, because profit only needs the bid', () => {
    const raw = frame({ p: '/quotes/subscribed', d: [{ s: 'ETHUSD', b: 2134.69 }] });

    expect(parseQuotesMessage(raw)).toEqual([
      { symbol: 'ETHUSD', bid: 2134.69, ask: undefined, time: undefined },
    ]);
  });

  it('ignores frames of a different type, such as subscription acknowledgements', () => {
    const raw = frame({ p: '/subscribe/addlist', d: ['ETHUSD'] });

    expect(parseQuotesMessage(raw)).toBeNull();
  });

  it('ignores a frame whose payload is not an array', () => {
    const raw = frame({ p: '/quotes/subscribed', d: 'ETHUSD' });

    expect(parseQuotesMessage(raw)).toBeNull();
  });

  it('survives malformed JSON without throwing', () => {
    expect(parseQuotesMessage('{ not json')).toBeNull();
  });

  it('ignores a payload that is not a string, such as binary data', () => {
    expect(parseQuotesMessage(new ArrayBuffer(8))).toBeNull();
  });

  it('drops a quote whose bid is not a number, so the formula never meets a string', () => {
    const raw = frame({ p: '/quotes/subscribed', d: [{ s: 'ETHUSD', b: '2134.69' }] });

    expect(parseQuotesMessage(raw)).toEqual([]);
  });

  it('drops only the malformed entries of a batch and keeps the rest', () => {
    const raw = frame({
      p: '/quotes/subscribed',
      d: [{ s: 'ETHUSD', b: 2134.69 }, { s: 'BTCUSD' }, null],
    });

    expect(parseQuotesMessage(raw)?.map((quote) => quote.symbol)).toEqual(['ETHUSD']);
  });

  it('returns an empty batch for a frame that carries no quotes', () => {
    const raw = frame({ p: '/quotes/subscribed', d: [] });

    expect(parseQuotesMessage(raw)).toEqual([]);
  });
});
