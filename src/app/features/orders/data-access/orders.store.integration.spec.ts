import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, computed } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OrdersStore } from './orders.store';
import { OrdersDataService } from './orders-data.service';
import { WebSocketService } from './web-socket.service';
import { ORDERS_FEATURE_CONFIG } from './orders-feature.config';
import { FakeWebSocket } from '../testing/fake-web-socket';
import { aContractType, anInstrument, anOrderDto } from '../testing/builders';

const config = {
  ordersUrl: 'https://example.test/orders.json',
  instrumentsUrl: 'https://example.test/instruments.json',
  contractTypesUrl: 'https://example.test/contract-types.json',
  quotesWsUrl: 'wss://example.test/quotes',
};

describe('OrdersStore', () => {
  let store: OrdersStore;
  let httpMock: HttpTestingController;
  let restoreWebSocket: () => void;

  beforeEach(() => {
    restoreWebSocket = FakeWebSocket.install();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        OrdersDataService,
        WebSocketService,
        OrdersStore,
        { provide: ORDERS_FEATURE_CONFIG, useValue: config },
      ],
    });
    store = TestBed.inject(OrdersStore);
    httpMock = TestBed.inject(HttpTestingController);
    TestBed.tick();
  });

  afterEach(() => {
    restoreWebSocket();
    vi.restoreAllMocks();
  });

  const stabilize = async () => {
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
    TestBed.tick();
  };

  const load = async (orders: ReturnType<typeof anOrderDto>[]) => {
    const symbols = [...new Set(orders.map((order) => order.symbol))];
    httpMock.expectOne(config.ordersUrl).flush({ data: orders });
    httpMock
      .expectOne(config.instrumentsUrl)
      .flush(symbols.map((symbol) => anInstrument({ symbol, contractType: 0 })));
    httpMock
      .expectOne(config.contractTypesUrl)
      .flush([aContractType({ contractType: 0, contractSize: 1 })]);
    await stabilize();
    FakeWebSocket.last.open();
    await stabilize();
  };

  const quotesFrame = (quotes: { s: string; b: number }[]) =>
    JSON.stringify({ p: '/quotes/subscribed', d: quotes.map((q) => ({ ...q, a: q.b + 1, t: 1 })) });

  const clearSentFrames = () => {
    FakeWebSocket.last.sent.length = 0;
  };

  describe('loading', () => {
    it('reports loading until the sources answer', async () => {
      expect(store.isLoading()).toBe(true);

      await load([anOrderDto()]);

      expect(store.isLoading()).toBe(false);
    });

    it('groups the loaded orders by symbol', async () => {
      await load([
        anOrderDto({ id: 1, symbol: 'BTCUSD' }),
        anOrderDto({ id: 2, symbol: 'BTCUSD' }),
        anOrderDto({ id: 3, symbol: 'ETHUSD' }),
      ]);

      expect(store.groups().map((group) => [group.symbol, group.count])).toEqual([
        ['BTCUSD', 2],
        ['ETHUSD', 1],
      ]);
    });
  });

  describe('merging quotes', () => {
    it('keeps the last quote when a batch carries the same symbol twice', async () => {
      await load([anOrderDto({ symbol: 'BTCUSD' })]);

      FakeWebSocket.last.receive(
        quotesFrame([
          { s: 'BTCUSD', b: 100 },
          { s: 'BTCUSD', b: 101 },
        ]),
      );

      expect(store.bidOf('BTCUSD')()).toBe(101);
    });

    it('overwrites only the symbols a later batch mentions', async () => {
      await load([
        anOrderDto({ id: 1, symbol: 'BTCUSD' }),
        anOrderDto({ id: 2, symbol: 'ETHUSD' }),
      ]);
      FakeWebSocket.last.receive(
        quotesFrame([
          { s: 'BTCUSD', b: 100 },
          { s: 'ETHUSD', b: 200 },
        ]),
      );

      FakeWebSocket.last.receive(quotesFrame([{ s: 'BTCUSD', b: 111 }]));

      expect(store.bidOf('BTCUSD')()).toBe(111);
      expect(store.bidOf('ETHUSD')()).toBe(200);
    });

    it('exposes the bid of a symbol before its first quote, and fills it in later', async () => {
      await load([anOrderDto({ symbol: 'BTCUSD' })]);
      const bid = store.bidOf('BTCUSD');
      expect(bid()).toBeUndefined();

      FakeWebSocket.last.receive(quotesFrame([{ s: 'BTCUSD', b: 110 }]));

      expect(bid()).toBe(110);
    });

    it('gives the form the bid of the watched symbol, never of the previous one', async () => {
      await load([anOrderDto({ symbol: 'BTCUSD' })]);
      FakeWebSocket.last.receive(
        quotesFrame([
          { s: 'BTCUSD', b: 100 },
          { s: 'ETHUSD', b: 200 },
        ]),
      );

      store.watchSymbol('ETHUSD');
      expect(store.watchedBid()).toBe(200);

      store.watchSymbol('XRPUSD');
      expect(store.watchedBid()).toBeUndefined();

      store.watchSymbol(null);
      expect(store.watchedBid()).toBeUndefined();
    });
  });

  describe('update granularity', () => {
    const countRuns = (read: () => unknown) => {
      let runs = 0;
      const tracked = computed(() => {
        runs++;
        return read();
      });
      return () => {
        tracked();
        return runs;
      };
    };

    it('does not regroup the orders when a quote arrives', async () => {
      await load([
        anOrderDto({ id: 1, symbol: 'BTCUSD' }),
        anOrderDto({ id: 2, symbol: 'ETHUSD' }),
      ]);
      const before = store.groups();

      FakeWebSocket.last.receive(quotesFrame([{ s: 'BTCUSD', b: 110 }]));

      expect(store.groups()).toBe(before);
    });

    it('does not notify the bid of a symbol the quote is not about', async () => {
      await load([
        anOrderDto({ id: 1, symbol: 'BTCUSD' }),
        anOrderDto({ id: 2, symbol: 'ETHUSD' }),
      ]);
      const ethRuns = countRuns(store.bidOf('ETHUSD'));
      expect(ethRuns()).toBe(1);

      FakeWebSocket.last.receive(quotesFrame([{ s: 'BTCUSD', b: 110 }]));

      expect(ethRuns()).toBe(1);
    });

    it('notifies nothing when a quote repeats the current bid', async () => {
      await load([anOrderDto({ symbol: 'BTCUSD' })]);
      FakeWebSocket.last.receive(quotesFrame([{ s: 'BTCUSD', b: 110 }]));
      const btcRuns = countRuns(store.bidOf('BTCUSD'));
      expect(btcRuns()).toBe(1);

      FakeWebSocket.last.receive(quotesFrame([{ s: 'BTCUSD', b: 110 }]));

      expect(btcRuns()).toBe(1);
    });

    it('notifies the bid of the symbol the quote is about', async () => {
      await load([anOrderDto({ symbol: 'BTCUSD' })]);
      const btcRuns = countRuns(store.bidOf('BTCUSD'));
      expect(btcRuns()).toBe(1);

      FakeWebSocket.last.receive(quotesFrame([{ s: 'BTCUSD', b: 110 }]));

      expect(btcRuns()).toBe(2);
    });
  });

  describe('subscription sync', () => {
    it('subscribes every symbol that has orders once the socket opens', async () => {
      await load([
        anOrderDto({ id: 1, symbol: 'ETHUSD' }),
        anOrderDto({ id: 2, symbol: 'BTCUSD' }),
      ]);

      expect(FakeWebSocket.last.frames).toEqual([
        { p: '/subscribe/addlist', d: ['BTCUSD', 'ETHUSD'] },
      ]);
    });

    it('sends nothing when one of several orders of a symbol is closed', async () => {
      await load([
        anOrderDto({ id: 1, symbol: 'BTCUSD' }),
        anOrderDto({ id: 2, symbol: 'BTCUSD' }),
      ]);
      clearSentFrames();

      store.closeOrder(1);
      await stabilize();

      expect(FakeWebSocket.last.frames).toEqual([]);
    });

    it('unsubscribes a symbol once its last order is closed', async () => {
      await load([
        anOrderDto({ id: 1, symbol: 'BTCUSD' }),
        anOrderDto({ id: 2, symbol: 'ETHUSD' }),
      ]);
      clearSentFrames();

      store.closeGroup('ETHUSD');
      await stabilize();

      expect(FakeWebSocket.last.frames).toEqual([{ p: '/subscribe/removelist', d: ['ETHUSD'] }]);
    });

    it('subscribes a symbol the form is considering, even though it has no orders', async () => {
      await load([anOrderDto({ symbol: 'BTCUSD' })]);
      clearSentFrames();

      store.watchSymbol('XRPUSD');
      await stabilize();

      expect(FakeWebSocket.last.frames).toEqual([{ p: '/subscribe/addlist', d: ['XRPUSD'] }]);
    });

    it('drops the watched symbol once the form stops considering it', async () => {
      await load([anOrderDto({ symbol: 'BTCUSD' })]);
      store.watchSymbol('XRPUSD');
      await stabilize();
      clearSentFrames();

      store.watchSymbol(null);
      await stabilize();

      expect(FakeWebSocket.last.frames).toEqual([{ p: '/subscribe/removelist', d: ['XRPUSD'] }]);
    });

    it('keeps a watched symbol subscribed when it also has orders of its own', async () => {
      await load([anOrderDto({ symbol: 'BTCUSD' })]);
      store.watchSymbol('BTCUSD');
      await stabilize();
      clearSentFrames();

      store.watchSymbol(null);
      await stabilize();

      expect(FakeWebSocket.last.frames).toEqual([]);
    });
  });

  describe('closing orders', () => {
    it('reports the closed order and removes it from its group', async () => {
      await load([
        anOrderDto({ id: 11, symbol: 'BTCUSD' }),
        anOrderDto({ id: 12, symbol: 'BTCUSD' }),
      ]);

      const closed = store.closeOrder(11);

      expect(closed).toEqual([11]);
      expect(store.groups()[0].orders.map((order) => order.id)).toEqual([12]);
    });

    it('reports nothing for an order that is already gone', async () => {
      await load([anOrderDto({ id: 11 })]);
      store.closeOrder(11);

      expect(store.closeOrder(11)).toEqual([]);
    });

    it('reports every order of a closed group, so the message can list them', async () => {
      await load([
        anOrderDto({ id: 11, symbol: 'BTCUSD' }),
        anOrderDto({ id: 12, symbol: 'BTCUSD' }),
        anOrderDto({ id: 13, symbol: 'ETHUSD' }),
      ]);

      expect(store.closeGroup('BTCUSD')).toEqual([11, 12]);
    });

    it('removes the whole group from the table', async () => {
      await load([
        anOrderDto({ id: 11, symbol: 'BTCUSD' }),
        anOrderDto({ id: 12, symbol: 'ETHUSD' }),
      ]);

      store.closeGroup('BTCUSD');

      expect(store.groups().map((group) => group.symbol)).toEqual(['ETHUSD']);
    });
  });

  describe('adding orders', () => {
    it('gives a new order an id above every id that came from the file', async () => {
      await load([anOrderDto({ id: 10 }), anOrderDto({ id: 7 })]);

      const added = store.addOrder({
        symbol: 'BTCUSD',
        side: 'BUY',
        size: 1,
        openPrice: 100,
        openTime: 1_750_000_000_000,
      });

      expect(added.id).toBe(11);
    });

    it('never reuses an id, even after the order holding the highest one is closed', async () => {
      await load([anOrderDto({ id: 10 })]);
      const input = {
        symbol: 'BTCUSD',
        side: 'BUY' as const,
        size: 1,
        openPrice: 100,
        openTime: 1_750_000_000_000,
      };
      const first = store.addOrder(input);
      store.closeOrder(first.id);

      const second = store.addOrder(input);

      expect(second.id).not.toBe(first.id);
      expect(second.id).toBe(12);
    });

    it('opens a new order with no swap and the contract size of its instrument', async () => {
      await load([anOrderDto({ symbol: 'BTCUSD' })]);

      const added = store.addOrder({
        symbol: 'BTCUSD',
        side: 'SELL',
        size: 0.5,
        openPrice: 100,
        openTime: 1_750_000_000_000,
      });

      expect(added.swap).toBe(0);
      expect(added.contractSize).toBe(1);
    });

    it('shows the new order in its symbol group', async () => {
      await load([anOrderDto({ id: 1, symbol: 'BTCUSD' })]);

      store.addOrder({
        symbol: 'ETHUSD',
        side: 'BUY',
        size: 1,
        openPrice: 2000,
        openTime: 1_750_000_000_000,
      });

      expect(store.groups().map((group) => group.symbol)).toEqual(['BTCUSD', 'ETHUSD']);
    });
  });

  describe('destruction', () => {
    it('closes the connection when the store is destroyed', async () => {
      await load([anOrderDto()]);
      const socket = FakeWebSocket.last;

      TestBed.resetTestingModule();

      expect(socket.readyState).toBe(FakeWebSocket.CLOSED);
    });

    it('ignores a quote that arrives after destruction', async () => {
      await load([anOrderDto({ symbol: 'BTCUSD' })]);
      const socket = FakeWebSocket.last;
      TestBed.resetTestingModule();

      expect(() => socket.receive(quotesFrame([{ s: 'BTCUSD', b: 100 }]))).not.toThrow();
      expect(store.bidOf('BTCUSD')()).toBeUndefined();
    });
  });
});
