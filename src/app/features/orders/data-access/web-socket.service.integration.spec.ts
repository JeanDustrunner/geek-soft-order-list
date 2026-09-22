import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocketService } from './web-socket.service';
import { ORDERS_FEATURE_CONFIG } from './orders-feature.config';
import { FakeWebSocket } from '../testing/fake-web-socket';
import { Quote } from '../domain/models';

describe('WebSocketService', () => {
  let service: WebSocketService;
  let restoreWebSocket: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    restoreWebSocket = FakeWebSocket.install();

    TestBed.configureTestingModule({
      providers: [
        WebSocketService,
        {
          provide: ORDERS_FEATURE_CONFIG,
          useValue: {
            ordersUrl: 'https://example.test/orders.json',
            instrumentsUrl: 'https://example.test/instruments.json',
            contractTypesUrl: 'https://example.test/contract-types.json',
            quotesWsUrl: 'wss://example.test/quotes',
          },
        },
      ],
    });
    service = TestBed.inject(WebSocketService);
  });

  afterEach(() => {
    restoreWebSocket();
    vi.useRealTimers();
  });

  const quotesFrame = (symbol: string, bid: number) =>
    JSON.stringify({ p: '/quotes/subscribed', d: [{ s: symbol, b: bid, a: bid + 1, t: 1 }] });

  const expectReconnectExactlyAfter = (delay: number) => {
    const before = FakeWebSocket.instances.length;
    FakeWebSocket.last.drop();

    vi.advanceTimersByTime(delay - 1);
    expect(FakeWebSocket.instances.length).toBe(before);

    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances.length).toBe(before + 1);
  };

  describe('subscription reconciliation', () => {
    it('sends nothing while the connection is still opening', () => {
      service.connect();

      service.setSymbols(['BTCUSD']);

      expect(FakeWebSocket.last.frames).toEqual([]);
    });

    it('replays the whole desired set once the connection opens', () => {
      service.connect();
      service.setSymbols(['BTCUSD', 'ETHUSD']);

      FakeWebSocket.last.open();

      expect(FakeWebSocket.last.frames).toEqual([
        { p: '/subscribe/addlist', d: ['BTCUSD', 'ETHUSD'] },
      ]);
    });

    it('subscribes only the symbols that are new', () => {
      service.connect();
      FakeWebSocket.last.open();
      service.setSymbols(['BTCUSD']);
      const socket = FakeWebSocket.last;
      socket.sent.length = 0;

      service.setSymbols(['BTCUSD', 'ETHUSD']);

      expect(socket.frames).toEqual([{ p: '/subscribe/addlist', d: ['ETHUSD'] }]);
    });

    it('unsubscribes only the symbols that are gone, leaving the rest streaming', () => {
      service.connect();
      FakeWebSocket.last.open();
      service.setSymbols(['BTCUSD', 'ETHUSD']);
      const socket = FakeWebSocket.last;
      socket.sent.length = 0;

      service.setSymbols(['BTCUSD']);

      expect(socket.frames).toEqual([{ p: '/subscribe/removelist', d: ['ETHUSD'] }]);
    });

    it('stays silent when the desired set does not change', () => {
      service.connect();
      FakeWebSocket.last.open();
      service.setSymbols(['BTCUSD']);
      const socket = FakeWebSocket.last;
      socket.sent.length = 0;

      service.setSymbols(['BTCUSD']);

      expect(socket.frames).toEqual([]);
    });
  });

  describe('incoming quotes', () => {
    it('publishes quotes parsed from a subscribed-quotes frame', () => {
      const batches: Quote[][] = [];
      service.quotes$.subscribe((batch) => batches.push(batch));
      service.connect();
      FakeWebSocket.last.open();

      FakeWebSocket.last.receive(quotesFrame('BTCUSD', 85910.18));

      expect(batches).toEqual([[{ symbol: 'BTCUSD', bid: 85910.18, ask: 85911.18, time: 1 }]]);
    });

    it('publishes nothing for a frame that carries no quotes', () => {
      const batches: Quote[][] = [];
      service.quotes$.subscribe((batch) => batches.push(batch));
      service.connect();
      FakeWebSocket.last.open();

      FakeWebSocket.last.receive(JSON.stringify({ p: '/quotes/subscribed', d: [] }));

      expect(batches).toEqual([]);
    });

    it('publishes nothing for an unrelated frame', () => {
      const batches: Quote[][] = [];
      service.quotes$.subscribe((batch) => batches.push(batch));
      service.connect();
      FakeWebSocket.last.open();

      FakeWebSocket.last.receive(JSON.stringify({ p: '/subscribe/added', d: ['BTCUSD'] }));

      expect(batches).toEqual([]);
    });
  });

  describe('reconnecting', () => {
    it('waits one second before the first reconnect attempt', () => {
      service.connect();
      FakeWebSocket.last.open();

      FakeWebSocket.last.drop();
      vi.advanceTimersByTime(999);
      const beforeDelay = FakeWebSocket.instances.length;
      vi.advanceTimersByTime(1);

      expect(beforeDelay).toBe(1);
      expect(FakeWebSocket.instances.length).toBe(2);
    });

    it('doubles the delay with every failed attempt', () => {
      service.connect();

      expectReconnectExactlyAfter(1_000);
      expectReconnectExactlyAfter(2_000);
      expectReconnectExactlyAfter(4_000);
      expectReconnectExactlyAfter(8_000);
    });

    it('caps the delay at thirty seconds, so a long outage never parks the reconnect for hours', () => {
      service.connect();
      for (const delay of [1_000, 2_000, 4_000, 8_000, 16_000]) {
        FakeWebSocket.last.drop();
        vi.advanceTimersByTime(delay);
      }

      expectReconnectExactlyAfter(30_000);
    });

    it('restores the full desired set on the new connection, because the server knows nothing', () => {
      service.connect();
      FakeWebSocket.last.open();
      service.setSymbols(['BTCUSD', 'ETHUSD']);

      FakeWebSocket.last.drop();
      vi.advanceTimersByTime(1_000);
      FakeWebSocket.last.open();

      expect(FakeWebSocket.last.frames).toEqual([
        { p: '/subscribe/addlist', d: ['BTCUSD', 'ETHUSD'] },
      ]);
    });

    it('starts the backoff from one second again after a successful reconnect', () => {
      service.connect();
      FakeWebSocket.last.drop();
      vi.advanceTimersByTime(1_000);
      FakeWebSocket.last.drop();
      vi.advanceTimersByTime(2_000);
      FakeWebSocket.last.open();

      FakeWebSocket.last.drop();
      const before = FakeWebSocket.instances.length;
      vi.advanceTimersByTime(1_000);

      expect(FakeWebSocket.instances.length).toBe(before + 1);
    });
  });

  describe('disconnecting', () => {
    it('does not reconnect after an intentional disconnect, even though closing fires onclose', () => {
      service.connect();
      FakeWebSocket.last.open();

      service.disconnect();
      vi.advanceTimersByTime(60_000);

      expect(FakeWebSocket.instances.length).toBe(1);
    });

    it('cancels a reconnect that was already scheduled', () => {
      service.connect();
      FakeWebSocket.last.drop();

      service.disconnect();
      vi.advanceTimersByTime(60_000);

      expect(FakeWebSocket.instances.length).toBe(1);
    });
  });
});
