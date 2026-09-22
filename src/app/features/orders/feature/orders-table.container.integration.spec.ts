import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'ngx-sonner';
import { OrdersTableContainer } from './orders-table.container';
import { ORDERS_FEATURE_CONFIG } from '../data-access/orders-feature.config';
import { FakeWebSocket } from '../testing/fake-web-socket';
import { aContractType, anInstrument, anOrderDto } from '../testing/builders';

vi.mock('ngx-sonner', () => ({ toast: vi.fn() }));

const config = {
  ordersUrl: 'https://example.test/orders.json',
  instrumentsUrl: 'https://example.test/instruments.json',
  contractTypesUrl: 'https://example.test/contract-types.json',
  quotesWsUrl: 'wss://example.test/quotes',
};

describe('OrdersTableContainer', () => {
  let fixture: ComponentFixture<OrdersTableContainer>;
  let httpMock: HttpTestingController;
  let restoreWebSocket: () => void;

  const query = <T extends HTMLElement>(selector: string) =>
    fixture.nativeElement.querySelector(selector) as T | null;
  const queryAll = (selector: string) =>
    [...fixture.nativeElement.querySelectorAll(selector)] as HTMLElement[];

  const groupRows = () => queryAll('tr[appOrderGroupRow]');
  const detailRows = () => queryAll('tr[appOrderDetailRow]');
  const profitOf = (row: HTMLElement) =>
    (row.querySelectorAll('td')[9]?.textContent ?? '').trim();

  const stabilize = async () => {
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const stubDialog = () => {
    const dialog = query<HTMLDialogElement>('dialog');
    if (!dialog) return;
    Object.assign(dialog, {
      showModal(this: HTMLDialogElement) {
        this.setAttribute('open', '');
      },
      close(this: HTMLDialogElement) {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      },
    });
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

  const sendQuote = async (symbol: string, bid: number) => {
    FakeWebSocket.last.receive(
      JSON.stringify({ p: '/quotes/subscribed', d: [{ s: symbol, b: bid, a: bid + 1, t: 1 }] }),
    );
    await stabilize();
  };

  beforeEach(async () => {
    restoreWebSocket = FakeWebSocket.install();
    vi.mocked(toast).mockClear();

    TestBed.configureTestingModule({
      imports: [OrdersTableContainer],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ORDERS_FEATURE_CONFIG, useValue: config },
      ],
    });
    fixture = TestBed.createComponent(OrdersTableContainer);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    TestBed.tick();
  });

  afterEach(() => {
    restoreWebSocket();
  });

  describe('initial view', () => {
    it('shows one row per symbol and no order rows (R3)', async () => {
      await load([
        anOrderDto({ id: 1, symbol: 'BTCUSD' }),
        anOrderDto({ id: 2, symbol: 'BTCUSD' }),
        anOrderDto({ id: 3, symbol: 'ETHUSD' }),
      ]);

      expect(groupRows()).toHaveLength(2);
      expect(detailRows()).toHaveLength(0);
    });

    it('badges each group with the number of orders it holds (R4)', async () => {
      await load([
        anOrderDto({ id: 1, symbol: 'BTCUSD' }),
        anOrderDto({ id: 2, symbol: 'BTCUSD' }),
      ]);

      expect(groupRows()[0].querySelector('.badge')?.textContent?.trim()).toBe('2');
    });

    it('reports a failed download instead of rendering an empty table', async () => {
      httpMock.expectOne(config.ordersUrl).flush('boom', { status: 500, statusText: 'Error' });
      httpMock.expectOne(config.instrumentsUrl).flush([]);
      httpMock.expectOne(config.contractTypesUrl).flush([]);
      await stabilize();

      expect(query('[role="alert"]')?.textContent).toContain('Failed to fetch data');
    });
  });

  describe('expanding a group', () => {
    it('reveals the orders of the clicked group (R5)', async () => {
      await load([
        anOrderDto({ id: 1, symbol: 'BTCUSD' }),
        anOrderDto({ id: 2, symbol: 'BTCUSD' }),
      ]);

      groupRows()[0].click();
      await stabilize();

      expect(detailRows()).toHaveLength(2);
    });

    it('hides them again on a second click', async () => {
      await load([anOrderDto({ symbol: 'BTCUSD' })]);
      groupRows()[0].click();
      await stabilize();

      groupRows()[0].click();
      await stabilize();

      expect(detailRows()).toHaveLength(0);
    });

    it('leaves other groups collapsed', async () => {
      await load([
        anOrderDto({ id: 1, symbol: 'BTCUSD' }),
        anOrderDto({ id: 2, symbol: 'ETHUSD' }),
      ]);

      groupRows()[0].click();
      await stabilize();

      expect(detailRows()).toHaveLength(1);
    });
  });

  describe('live profit', () => {
    it('fills in the profit of a group when its quote arrives, without any interaction', async () => {
      await load([anOrderDto({ symbol: 'BTCUSD', side: 'BUY', openPrice: 100, size: 2 })]);
      expect(profitOf(groupRows()[0])).toBe('—');

      await sendQuote('BTCUSD', 110);

      expect(profitOf(groupRows()[0])).toBe('20.00');
    });

    it('keeps the very same row elements across a price tick, so focus and scroll survive', async () => {
      await load([anOrderDto({ symbol: 'BTCUSD' })]);
      const rowBefore = groupRows()[0];

      await sendQuote('BTCUSD', 110);

      expect(groupRows()[0]).toBe(rowBefore);
    });

    it('keeps the very same order row elements across a price tick', async () => {
      await load([anOrderDto({ id: 1, symbol: 'BTCUSD' })]);
      groupRows()[0].click();
      await stabilize();
      const detailBefore = detailRows()[0];

      await sendQuote('BTCUSD', 110);

      expect(detailRows()[0]).toBe(detailBefore);
    });
  });

  describe('closing orders', () => {
    it('removes a whole group and reports every closed order id (R6, R7)', async () => {
      await load([
        anOrderDto({ id: 11, symbol: 'BTCUSD' }),
        anOrderDto({ id: 12, symbol: 'BTCUSD' }),
      ]);

      (groupRows()[0].querySelector('.close') as HTMLButtonElement).click();
      await stabilize();

      expect(groupRows()).toHaveLength(0);
      expect(vi.mocked(toast)).toHaveBeenCalledWith('Closed orders: 11, 12');
    });

    it('removes a single order and reports its id (R6, R7)', async () => {
      await load([
        anOrderDto({ id: 11, symbol: 'BTCUSD' }),
        anOrderDto({ id: 12, symbol: 'BTCUSD' }),
      ]);
      groupRows()[0].click();
      await stabilize();

      (detailRows()[0].querySelector('.close') as HTMLButtonElement).click();
      await stabilize();

      expect(detailRows()).toHaveLength(1);
      expect(vi.mocked(toast)).toHaveBeenCalledWith('Closed order 11');
    });

    it('drops a group once its last order is closed', async () => {
      await load([anOrderDto({ id: 11, symbol: 'BTCUSD' })]);
      groupRows()[0].click();
      await stabilize();

      (detailRows()[0].querySelector('.close') as HTMLButtonElement).click();
      await stabilize();

      expect(groupRows()).toHaveLength(0);
    });
  });

  describe('adding an order', () => {
    const addOrder = async (symbol: string, size: string) => {
      stubDialog();
      query<HTMLButtonElement>('.add-order')!.click();
      await stabilize();

      const symbolInput = query<HTMLInputElement>('#symbol')!;
      symbolInput.value = symbol;
      symbolInput.dispatchEvent(new Event('input'));
      symbolInput.dispatchEvent(new Event('change'));
      await stabilize();
      await sendQuote(symbol, 100);

      const sizeInput = query<HTMLInputElement>('input[type="number"]')!;
      sizeInput.value = size;
      sizeInput.dispatchEvent(new Event('input'));
      await stabilize();

      query<HTMLFormElement>('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      await stabilize();
    };

    it('adds the new order to its symbol group', async () => {
      await load([anOrderDto({ id: 1, symbol: 'BTCUSD' })]);

      await addOrder('BTCUSD', '2');

      expect(groupRows()[0].querySelector('.badge')?.textContent?.trim()).toBe('2');
    });

    it('reports the new order', async () => {
      await load([anOrderDto({ id: 10, symbol: 'BTCUSD' })]);

      await addOrder('BTCUSD', '2');

      expect(vi.mocked(toast)).toHaveBeenCalledWith('Order no. 11 added');
    });

    it('shows a group collapsed when a symbol comes back after its last order was closed', async () => {
      await load([anOrderDto({ id: 11, symbol: 'BTCUSD' })]);
      groupRows()[0].click();
      await stabilize();
      (detailRows()[0].querySelector('.close') as HTMLButtonElement).click();
      await stabilize();

      await addOrder('BTCUSD', '1');

      expect(groupRows()).toHaveLength(1);
      expect(detailRows()).toHaveLength(0);
    });
  });
});
