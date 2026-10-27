import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OrdersDataService } from './orders-data.service';
import { ORDERS_FEATURE_CONFIG } from './orders-feature.config';
import { aContractType, anInstrument, anOrderDto } from '../testing/builders';

const config = {
  ordersUrl: 'https://example.test/orders.json',
  instrumentsUrl: 'https://example.test/instruments.json',
  contractTypesUrl: 'https://example.test/contract-types.json',
  quotesWsUrl: 'wss://example.test/quotes',
};

describe('OrdersDataService', () => {
  let service: OrdersDataService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        OrdersDataService,
        { provide: ORDERS_FEATURE_CONFIG, useValue: config },
      ],
    });
    service = TestBed.inject(OrdersDataService);
    httpMock = TestBed.inject(HttpTestingController);
    TestBed.tick();
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  const respond = async (options: {
    orders?: unknown;
    instruments?: unknown;
    contractTypes?: unknown;
  }) => {
    httpMock.expectOne(config.ordersUrl).flush(options.orders ?? { data: [] });
    httpMock.expectOne(config.instrumentsUrl).flush(options.instruments ?? []);
    httpMock.expectOne(config.contractTypesUrl).flush(options.contractTypes ?? []);
    await TestBed.inject(ApplicationRef).whenStable();
  };

  it('requests the three sources it needs, each from its configured address', () => {
    const urls = httpMock.match(() => true).map((request) => request.request.url);

    expect(urls).toEqual(
      expect.arrayContaining([config.ordersUrl, config.instrumentsUrl, config.contractTypesUrl]),
    );
    expect(urls).toHaveLength(3);
  });

  it('reports loading until every source has answered', async () => {
    expect(service.isLoading()).toBe(true);

    await respond({});

    expect(service.isLoading()).toBe(false);
  });

  it('holds no orders while the sources are still loading', () => {
    expect(service.initialOrders()).toEqual([]);

    httpMock.match(() => true);
  });

  it('unwraps the order list from the envelope the orders endpoint returns', async () => {
    await respond({
      orders: { data: [anOrderDto({ id: 7, symbol: 'BTCUSD' })] },
      instruments: [anInstrument({ symbol: 'BTCUSD', contractType: 0 })],
      contractTypes: [aContractType({ contractType: 0, contractSize: 1 })],
    });

    expect(service.initialOrders().map((order) => order.id)).toEqual([7]);
  });

  it('joins each order with the contract size of its instrument', async () => {
    await respond({
      orders: { data: [anOrderDto({ symbol: 'EURPLN' })] },
      instruments: [anInstrument({ symbol: 'EURPLN', contractType: 5 })],
      contractTypes: [aContractType({ contractType: 5, contractSize: 100_000 })],
    });

    expect(service.initialOrders()[0].contractSize).toBe(100_000);
  });

  it('offers each order symbol once, sorted, as the choices for the new-order form', async () => {
    await respond({
      orders: {
        data: [
          anOrderDto({ id: 1, symbol: 'ETHUSD' }),
          anOrderDto({ id: 2, symbol: 'BTCUSD' }),
          anOrderDto({ id: 3, symbol: 'ETHUSD' }),
        ],
      },
    });

    expect(service.fileSymbols()).toEqual(['BTCUSD', 'ETHUSD']);
  });

  describe('validating the responses', () => {
    it('drops an invalid record and warns how many were skipped', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      await respond({
        orders: { data: [anOrderDto({ id: 1, symbol: 'BTCUSD' }), { id: 'two' }] },
        instruments: [anInstrument({ symbol: 'BTCUSD', contractType: 0 })],
        contractTypes: [aContractType({ contractType: 0, contractSize: 1 })],
      });

      expect(service.initialOrders().map((order) => order.id)).toEqual([1]);
      expect(warn).toHaveBeenCalledWith('Skipped 1 invalid orders record(s).');
    });

    it('surfaces a response of the wrong shape as an error, not as an empty table', async () => {
      await respond({ instruments: { not: 'a list' } });

      expect(service.error()).toBeDefined();
    });
  });

  describe('when one source fails', () => {
    const respondWithFailingInstruments = async () => {
      httpMock.expectOne(config.ordersUrl).flush({ data: [anOrderDto()] });
      httpMock
        .expectOne(config.instrumentsUrl)
        .flush('boom', { status: 500, statusText: 'Server Error' });
      httpMock.expectOne(config.contractTypesUrl).flush([aContractType()]);
      await TestBed.inject(ApplicationRef).whenStable();
    };

    it('surfaces the failure instead of failing silently', async () => {
      await respondWithFailingInstruments();

      expect(service.error()).toBeDefined();
    });

    it('holds no orders, rather than throwing when the view reads them', async () => {
      await respondWithFailingInstruments();

      expect(() => service.initialOrders()).not.toThrow();
      expect(service.initialOrders()).toEqual([]);
    });

    it('stops reporting loading once every source has settled, successfully or not', async () => {
      await respondWithFailingInstruments();

      expect(service.isLoading()).toBe(false);
    });

    it('still offers the form its symbols, because that data arrived intact', async () => {
      await respondWithFailingInstruments();

      expect(service.fileSymbols()).toEqual(['BTCUSD']);
    });
  });
});
