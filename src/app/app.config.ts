import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideOrdersFeature } from './features/orders';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    provideOrdersFeature({
      ordersUrl: 'https://geeksoft.pl/assets/2026-task/order-data.json',
      instrumentsUrl: 'https://geeksoft.pl/assets/2026-task/instruments.json',
      contractTypesUrl: 'https://geeksoft.pl/assets/2026-task/contract-types.json',
      quotesWsUrl: 'wss://webquotes.geeksoft.pl/websocket/quotes',
    }),
  ],
};
