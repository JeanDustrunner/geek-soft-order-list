import {
  computed,
  DestroyRef,
  effect,
  inject,
  Injectable,
  linkedSignal,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { OrdersDataService } from './orders-data.service';
import { WebSocketService } from './web-socket.service';
import { NewOrderInput, Order } from '../domain/models';
import { groupOrdersBySymbol } from '../domain/aggregate';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable()
export class OrdersStore {
  readonly #data = inject(OrdersDataService);
  readonly #ws = inject(WebSocketService);

  // State
  readonly #orders = linkedSignal(() => this.#data.initialOrders());
  readonly #bids = new Map<string, WritableSignal<number | undefined>>();
  #addedCount = 0;

  // Public Reading
  readonly isLoading = this.#data.isLoading;
  readonly error = this.#data.error;
  readonly connectionStatus = this.#ws.status;
  readonly formSymbols = this.#data.fileSymbols;
  readonly groups = computed(() => groupOrdersBySymbol(this.#orders()));

  readonly #watchedSymbol = signal<string | null>(null);
  readonly watchedBid = computed(() => {
    const symbol = this.#watchedSymbol();
    return symbol ? this.bidOf(symbol)() : undefined;
  });

  readonly #subscribedSymbols = computed(
    () => {
      const symbols = this.#orders().map((order) => order.symbol);
      const watched = this.#watchedSymbol();
      if (watched) symbols.push(watched);
      return [...new Set(symbols)].sort();
    },
    { equal: sameItems },
  );
  readonly #maxFileId = computed(() =>
    this.#data.initialOrders().reduce((max, order) => Math.max(max, order.id), 0),
  );

  constructor() {
    this.#ws.connect();
    inject(DestroyRef).onDestroy(() => this.#ws.disconnect());

    this.#ws.quotes$.pipe(takeUntilDestroyed()).subscribe((data) => {
      for (const quote of data) this.#bidSignal(quote.symbol).set(quote.bid);
    });

    effect(() => this.#ws.setSymbols(this.#subscribedSymbols()));
  }

  bidOf(symbol: string): Signal<number | undefined> {
    return this.#bidSignal(symbol).asReadonly();
  }

  #bidSignal(symbol: string): WritableSignal<number | undefined> {
    let bid = this.#bids.get(symbol);
    if (!bid) {
      bid = signal<number | undefined>(undefined);
      this.#bids.set(symbol, bid);
    }
    return bid;
  }

  watchSymbol(symbol: string | null): void {
    this.#watchedSymbol.set(symbol);
  }

  addOrder(input: NewOrderInput): Order {
    const order: Order = {
      ...input,
      id: this.#maxFileId() + ++this.#addedCount,
      swap: 0,
      contractSize: this.#data.contractSizeOf()?.(input.symbol) ?? null,
    };
    this.#orders.update((list) => [...list, order]);
    return order;
  }

  closeOrder(id: number): number[] {
    const exists = this.#orders().some((order) => order.id === id);
    this.#orders.update((list) => list.filter((order) => order.id !== id));
    return exists ? [id] : [];
  }

  closeGroup(symbol: string): number[] {
    const ids = this.#orders()
      .filter((order) => order.symbol === symbol)
      .map((order) => order.id);
    this.#orders.update((list) => list.filter((order) => order.symbol !== symbol));
    return ids;
  }
}
function sameItems(item1: readonly string[], item2: readonly string[]): boolean {
  return item1.length === item2.length && item1.every((el, i) => el === item2[i]);
}
