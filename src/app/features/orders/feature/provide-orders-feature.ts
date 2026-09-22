import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { ORDERS_FEATURE_CONFIG, OrdersFeatureConfig } from '../data-access/orders-feature.config';

export function provideOrdersFeature(config: OrdersFeatureConfig): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: ORDERS_FEATURE_CONFIG, useValue: config }]);
}
