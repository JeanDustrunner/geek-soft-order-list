import { Component, inject, signal } from '@angular/core';
import { toast } from 'ngx-sonner';
import { OrdersDataService } from '../data-access/orders-data.service';
import { ORDERS_FEATURE_CONFIG } from '../data-access/orders-feature.config';
import { OrdersStore } from '../data-access/orders.store';
import { QuotesSource } from '../data-access/quotes-source';
import { SimulatedQuotesService } from '../data-access/simulated-quotes.service';
import { WebSocketService } from '../data-access/web-socket.service';
import { NewOrderInput } from '../domain/models';
import { ConnectionStatusBadge } from '../ui/connection-status/connection-status';
import { OrderGroupRow } from '../ui/order-group-row/order-group-row';
import { OrderDetailRow } from '../ui/order-detail-row/order-detail-row';
import { OrderForm } from '../ui/order-form/order-form';

@Component({
  selector: 'app-orders-table',
  imports: [ConnectionStatusBadge, OrderGroupRow, OrderDetailRow, OrderForm],
  providers: [
    OrdersDataService,
    WebSocketService,
    SimulatedQuotesService,
    {
      provide: QuotesSource,
      useFactory: () =>
        inject(ORDERS_FEATURE_CONFIG).quotesSource === 'simulated'
          ? inject(SimulatedQuotesService)
          : inject(WebSocketService),
    },
    OrdersStore,
  ],
  templateUrl: './orders-table.container.html',
  styleUrl: './orders-table.container.scss',
})
export class OrdersTableContainer {
  protected readonly store = inject(OrdersStore);

  protected readonly expanded = signal<ReadonlySet<string>>(new Set());
  protected readonly formOpen = signal(false);

  protected toggle(symbol: string): void {
    this.expanded.update((set) => {
      const next = new Set(set);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  }

  protected closeGroup(symbol: string): void {
    this.#notify(this.store.closeGroup(symbol));
    this.#pruneExpanded();
  }

  protected closeOrder(id: number): void {
    this.#notify(this.store.closeOrder(id));
    this.#pruneExpanded();
  }

  #notify(ids: readonly number[]): void {
    if (ids.length) {
      toast(`Closed order${ids.length > 1 ? 's:' : ''} ${ids.join(', ')}`);
    }
  }

  protected addOrder(input: NewOrderInput): void {
    const order = this.store.addOrder(input);
    toast(`Order no. ${order.id} added`);
  }

  protected onFormClosed(): void {
    this.formOpen.set(false);
    this.store.watchSymbol(null);
  }

  #pruneExpanded(): void {
    const present = new Set(this.store.groups().map((group) => group.symbol));
    this.expanded.update((set) => new Set([...set].filter((symbol) => present.has(symbol))));
  }
}
