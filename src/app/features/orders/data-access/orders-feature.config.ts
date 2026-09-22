import { InjectionToken } from "@angular/core";

export interface OrdersFeatureConfig {
  readonly ordersUrl: string;
  readonly instrumentsUrl: string;
  readonly contractTypesUrl: string;
  readonly quotesWsUrl: string;
}
export const ORDERS_FEATURE_CONFIG = new InjectionToken<OrdersFeatureConfig>('ORDERS_FEATURE_CONFIG');