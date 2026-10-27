import { inject, Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { ConnectionStatus, Quote } from '../domain/models';
import { OrdersDataService } from './orders-data.service';
import { QuotesSource } from './quotes-source';

const TICK_MS = 500;
const UPDATE_CHANCE = 0.2;
const MAX_STEP = 0.0005;

@Injectable()
export class SimulatedQuotesService implements QuotesSource {
  readonly #data = inject(OrdersDataService);
  readonly #quotes = new Subject<Quote[]>();
  readonly quotes$ = this.#quotes.asObservable();
  readonly #status = signal<ConnectionStatus>('closed');
  readonly status = this.#status.asReadonly();
  readonly #bids = new Map<string, number>();
  #symbols: readonly string[] = [];
  #timer: ReturnType<typeof setInterval> | undefined;

  connect(): void {
    this.#status.set('open');
    this.#timer = setInterval(() => this.#tick(), TICK_MS);
  }

  disconnect(): void {
    clearInterval(this.#timer);
    this.#status.set('closed');
  }

  setSymbols(symbols: readonly string[]): void {
    this.#symbols = symbols;
  }

  #tick(): void {
    const moving = this.#symbols.filter(() => Math.random() < UPDATE_CHANCE);
    const quotes = moving.flatMap((symbol) => {
      const bid = this.#nextBid(symbol);
      return bid === undefined ? [] : [{ symbol, bid }];
    });
    if (quotes.length) this.#quotes.next(quotes);
  }

  #nextBid(symbol: string): number | undefined {
    const previous = this.#bids.get(symbol) ?? this.#seed(symbol);
    if (previous === undefined) return undefined;
    const next = previous * (1 + (Math.random() * 2 - 1) * MAX_STEP);
    this.#bids.set(symbol, next);
    return next;
  }

  #seed(symbol: string): number | undefined {
    return this.#data.initialOrders().find((order) => order.symbol === symbol)?.openPrice;
  }
}
