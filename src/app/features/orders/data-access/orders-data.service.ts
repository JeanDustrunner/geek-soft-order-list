import { httpResource } from "@angular/common/http";
import { computed, inject, Injectable } from "@angular/core";
import { ContractTypeDto, InstrumentDto, Order, OrderDto } from "../domain/models";
import { createContractSizeLookup, transformToOrder } from "../domain/orders.mapper";
import { ORDERS_FEATURE_CONFIG } from "./orders-feature.config";

@Injectable()
export class OrdersDataService {
    readonly #cfg = inject(ORDERS_FEATURE_CONFIG);

    readonly ordersRes = httpResource<OrderDto[]>(() => this.#cfg.ordersUrl, {
        parse: (raw) => (raw as { data: OrderDto[] }).data,
    });
    readonly instrumentsRes = httpResource<InstrumentDto[]>(() => this.#cfg.instrumentsUrl)
    readonly contractTypesRes = httpResource<ContractTypeDto[]>(() => this.#cfg.contractTypesUrl)

    readonly isLoading = computed(
        () => this.ordersRes.isLoading() || this.instrumentsRes.isLoading() || this.contractTypesRes.isLoading()
    )

    readonly error = computed(
        () => this.ordersRes.error() ?? this.instrumentsRes.error() ?? this.contractTypesRes.error()
    )

    readonly contractSizeOf = computed(() => {
        const instruments = this.instrumentsRes;
        const contractTypes = this.contractTypesRes;
        return instruments.hasValue() && contractTypes.hasValue() ? createContractSizeLookup(instruments.value(), contractTypes.value()) : null
    });

    readonly initialOrders = computed<Order[]>(() => {
        const orders = this.ordersRes;
        const lookup = this.contractSizeOf();
        return orders.hasValue() && lookup ? orders.value().map(orderDto => transformToOrder(orderDto,lookup)) : [];
    })

    readonly fileSymbols = computed(() => {
        const orders = this.ordersRes;
        return orders.hasValue() ? [...new Set(orders.value().map(order => order.symbol))].sort() : [];
    })
}