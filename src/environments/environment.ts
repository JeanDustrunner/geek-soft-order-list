import { OrdersFeatureConfig } from '../app/features/orders';

export const ordersConfig: OrdersFeatureConfig = {
  ordersUrl: 'mock/order-data.json',
  instrumentsUrl: 'mock/instruments.json',
  contractTypesUrl: 'mock/contract-types.json',
  quotesWsUrl: 'wss://webquotes.geeksoft.pl/websocket/quotes',
  quotesSource: 'simulated',
};
