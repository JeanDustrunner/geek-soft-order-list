import { OrdersFeatureConfig } from '../app/features/orders';

export const ordersConfig: OrdersFeatureConfig = {
  ordersUrl: 'https://geeksoft.pl/assets/2026-task/order-data.json',
  instrumentsUrl: 'https://geeksoft.pl/assets/2026-task/instruments.json',
  contractTypesUrl: 'https://geeksoft.pl/assets/2026-task/contract-types.json',
  quotesWsUrl: 'wss://webquotes.geeksoft.pl/websocket/quotes',
  quotesSource: 'websocket',
};
