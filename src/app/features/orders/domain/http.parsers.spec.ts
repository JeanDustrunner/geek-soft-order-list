import { describe, expect, it } from 'vitest';
import { parseContractTypes, parseInstruments, parseOrders } from './http.parsers';
import { aContractType, anInstrument, anOrderDto } from '../testing/builders';

describe('parseOrders', () => {
  it('unwraps the order list from its { data } envelope', () => {
    const order = anOrderDto({ id: 7 });

    expect(parseOrders({ data: [order] })).toEqual({ items: [order], skipped: 0 });
  });

  it('skips records with a wrong or missing field, and counts them', () => {
    const valid = anOrderDto({ id: 1 });

    const parsed = parseOrders({
      data: [
        valid,
        { ...anOrderDto({ id: 2 }), side: 'HOLD' },
        { ...anOrderDto({ id: 3 }), size: '1' },
        { ...anOrderDto({ id: 4 }), swap: undefined },
        null,
      ],
    });

    expect(parsed).toEqual({ items: [valid], skipped: 4 });
  });

  it('rejects a response without the envelope, so it shows as an error rather than an empty table', () => {
    expect(() => parseOrders([anOrderDto()])).toThrow();
    expect(() => parseOrders({ data: {} })).toThrow();
  });
});

describe('parseInstruments', () => {
  it('keeps valid instruments and skips the rest', () => {
    const valid = anInstrument({ symbol: 'EURPLN' });

    expect(parseInstruments([valid, { symbol: 'X', contractType: 'fx' }])).toEqual({
      items: [valid],
      skipped: 1,
    });
  });

  it('rejects a response that is not a list', () => {
    expect(() => parseInstruments({ data: [] })).toThrow();
  });
});

describe('parseContractTypes', () => {
  it('keeps valid contract types and skips the rest', () => {
    const valid = aContractType({ contractType: 5, contractSize: 100_000 });

    expect(parseContractTypes([valid, { contractType: 6 }])).toEqual({
      items: [valid],
      skipped: 1,
    });
  });

  it('rejects a response that is not a list', () => {
    expect(() => parseContractTypes('boom')).toThrow();
  });
});
