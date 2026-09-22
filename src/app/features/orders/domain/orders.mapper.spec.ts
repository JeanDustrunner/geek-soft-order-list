import { afterEach, describe, expect, it, vi } from 'vitest';
import { createContractSizeLookup, transformToOrder } from './orders.mapper';
import { aContractType, anInstrument, anOrderDto } from '../testing/builders';

describe('createContractSizeLookup', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves a contract size by joining the instrument and its contract type', () => {
    const lookup = createContractSizeLookup(
      [anInstrument({ symbol: 'EURPLN', contractType: 5 })],
      [aContractType({ contractType: 5, contractSize: 100_000 })],
    );

    expect(lookup('EURPLN')).toBe(100_000);
  });

  it('reports no contract size for a symbol that has no instrument', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const lookup = createContractSizeLookup([], [aContractType()]);

    expect(lookup('BTCUSD')).toBeNull();
  });

  it('warns once a symbol turns out to have no instrument, so the gap is visible in development', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const lookup = createContractSizeLookup([], [aContractType()]);

    lookup('BTCUSD');

    expect(warn).toHaveBeenCalledOnce();
  });

  it('reports no contract size when the instrument points at an unknown contract type', () => {
    const lookup = createContractSizeLookup(
      [anInstrument({ symbol: 'BTCUSD', contractType: 9 })],
      [aContractType({ contractType: 0, contractSize: 1 })],
    );

    expect(lookup('BTCUSD')).toBeNull();
  });

  it('resolves each symbol independently', () => {
    const lookup = createContractSizeLookup(
      [
        anInstrument({ symbol: 'BTCUSD', contractType: 0 }),
        anInstrument({ symbol: 'EURPLN', contractType: 5 }),
      ],
      [
        aContractType({ contractType: 0, contractSize: 1 }),
        aContractType({ contractType: 5, contractSize: 100_000 }),
      ],
    );

    expect([lookup('BTCUSD'), lookup('EURPLN')]).toEqual([1, 100_000]);
  });
});

describe('transformToOrder', () => {
  it('carries the wire fields of an order into the domain model unchanged', () => {
    const dto = anOrderDto({ id: 1203384, symbol: 'BTCUSD', side: 'SELL', size: 0.05, swap: -0.5 });

    const order = transformToOrder(dto, () => 1);

    expect(order).toMatchObject({
      id: 1203384,
      symbol: 'BTCUSD',
      side: 'SELL',
      size: 0.05,
      swap: -0.5,
    });
  });

  it('keeps openTime as milliseconds since the epoch, the unit the source already uses', () => {
    const dto = anOrderDto({ openTime: 1750740422000 });

    const order = transformToOrder(dto, () => 1);

    expect(order.openTime).toBe(1750740422000);
    expect(new Date(order.openTime).getUTCFullYear()).toBe(2025);
  });

  it('attaches the contract size resolved for the order symbol', () => {
    const order = transformToOrder(anOrderDto({ symbol: 'EURPLN' }), (symbol) =>
      symbol === 'EURPLN' ? 100_000 : null,
    );

    expect(order.contractSize).toBe(100_000);
  });

  it('keeps an order whose instrument is missing, marking the contract size as unknown', () => {
    const order = transformToOrder(anOrderDto({ id: 42 }), () => null);

    expect(order.id).toBe(42);
    expect(order.contractSize).toBeNull();
  });
});
