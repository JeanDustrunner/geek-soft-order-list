import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { ContractTypeDto, InstrumentDto, Order, OrderDto } from '../domain/models';
import {
  parseContractTypes,
  parseInstruments,
  parseOrders,
  ParsedList,
} from '../domain/http.parsers';
import { createContractSizeLookup, transformToOrder } from '../domain/orders.mapper';
import { ORDERS_FEATURE_CONFIG } from './orders-feature.config';

@Injectable()
export class OrdersDataService {
  readonly #cfg = inject(ORDERS_FEATURE_CONFIG);

  readonly ordersRes = httpResource<OrderDto[]>(() => this.#cfg.ordersUrl, {
    parse: (raw) => keepValid(parseOrders(raw), 'orders'),
  });
  readonly instrumentsRes = httpResource<InstrumentDto[]>(() => this.#cfg.instrumentsUrl, {
    parse: (raw) => keepValid(parseInstruments(raw), 'instruments'),
  });
  readonly contractTypesRes = httpResource<ContractTypeDto[]>(() => this.#cfg.contractTypesUrl, {
    parse: (raw) => keepValid(parseContractTypes(raw), 'contract types'),
  });

  readonly isLoading = computed(
    () =>
      this.ordersRes.isLoading() ||
      this.instrumentsRes.isLoading() ||
      this.contractTypesRes.isLoading(),
  );

  readonly error = computed(
    () => this.ordersRes.error() ?? this.instrumentsRes.error() ?? this.contractTypesRes.error(),
  );

  readonly contractSizeOf = computed(() => {
    const instruments = this.instrumentsRes;
    const contractTypes = this.contractTypesRes;
    return instruments.hasValue() && contractTypes.hasValue()
      ? createContractSizeLookup(instruments.value(), contractTypes.value())
      : null;
  });

  readonly initialOrders = computed<Order[]>(() => {
    const orders = this.ordersRes;
    const lookup = this.contractSizeOf();
    return orders.hasValue() && lookup
      ? orders.value().map((orderDto) => transformToOrder(orderDto, lookup))
      : [];
  });

  readonly fileSymbols = computed(() => {
    const orders = this.ordersRes;
    return orders.hasValue()
      ? [...new Set(orders.value().map((order) => order.symbol))].sort()
      : [];
  });
}

function keepValid<T>({ items, skipped }: ParsedList<T>, source: string): T[] {
  if (skipped > 0) console.warn(`Skipped ${skipped} invalid ${source} record(s).`);
  return items;
}
