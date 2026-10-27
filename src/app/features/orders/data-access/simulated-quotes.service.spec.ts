import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SimulatedQuotesService } from './simulated-quotes.service';
import { OrdersDataService } from './orders-data.service';
import { Quote } from '../domain/models';
import { anOrder } from '../testing/builders';

describe('SimulatedQuotesService', () => {
  let service: SimulatedQuotesService;
  let batches: Quote[][];

  const randomSequence = (...values: number[]) => {
    let call = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => values[call++ % values.length]);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        SimulatedQuotesService,
        {
          provide: OrdersDataService,
          useValue: {
            initialOrders: signal([
              anOrder({ id: 1, symbol: 'BTCUSD', openPrice: 100 }),
              anOrder({ id: 2, symbol: 'ETHUSD', openPrice: 2000 }),
            ]),
          },
        },
      ],
    });
    service = TestBed.inject(SimulatedQuotesService);
    batches = [];
    service.quotes$.subscribe((quotes) => batches.push(quotes));
  });

  afterEach(() => {
    service.disconnect();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reports open as soon as it connects, and closed after it disconnects', () => {
    expect(service.status()).toBe('closed');

    service.connect();
    expect(service.status()).toBe('open');

    service.disconnect();
    expect(service.status()).toBe('closed');
  });

  it('quotes only the subscribed symbols, starting from their price in the file', () => {
    randomSequence(0);
    service.connect();
    service.setSymbols(['BTCUSD']);

    vi.advanceTimersByTime(500);

    expect(batches).toHaveLength(1);
    expect(batches[0].map((quote) => quote.symbol)).toEqual(['BTCUSD']);
    expect(batches[0][0].bid).toBeCloseTo(100 * (1 - 0.0005), 10);
  });

  it('skips a symbol it has no price for, instead of inventing one', () => {
    randomSequence(0);
    service.connect();
    service.setSymbols(['BTCUSD', 'XRPUSD']);

    vi.advanceTimersByTime(500);

    expect(batches[0].map((quote) => quote.symbol)).toEqual(['BTCUSD']);
  });

  it('walks on from the previous bid rather than restarting from the file price', () => {
    randomSequence(0, 1);
    service.connect();
    service.setSymbols(['BTCUSD']);

    vi.advanceTimersByTime(1_000);

    expect(batches[1][0].bid).toBeCloseTo(100 * 1.0005 ** 2, 10);
  });

  it('leaves a symbol alone on a tick it is not picked for, and sends nothing', () => {
    randomSequence(0.9);
    service.connect();
    service.setSymbols(['BTCUSD']);

    vi.advanceTimersByTime(500);

    expect(batches).toEqual([]);
  });

  it('moves symbols independently, so one batch carries only the ones that changed', () => {
    randomSequence(0, 0.9, 0.5);
    service.connect();
    service.setSymbols(['BTCUSD', 'ETHUSD']);

    vi.advanceTimersByTime(500);

    expect(batches[0].map((quote) => quote.symbol)).toEqual(['BTCUSD']);
  });

  it('stops quoting after it disconnects', () => {
    randomSequence(0);
    service.connect();
    service.setSymbols(['BTCUSD']);
    service.disconnect();

    vi.advanceTimersByTime(5_000);

    expect(batches).toEqual([]);
  });
});
