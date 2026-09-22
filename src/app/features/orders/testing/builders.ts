import { ContractTypeDto, InstrumentDto, Order, OrderDto, Quote, Side } from '../domain/models';

export function anOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    symbol: 'BTCUSD',
    side: 'BUY' as Side,
    size: 1,
    openPrice: 100,
    openTime: 1750740422000,
    swap: 0,
    contractSize: 1,
    ...overrides,
  };
}

export function anOrderDto(overrides: Partial<OrderDto> = {}): OrderDto {
  return {
    id: 1,
    symbol: 'BTCUSD',
    side: 'BUY' as Side,
    size: 1,
    openPrice: 100,
    openTime: 1750740422000,
    swap: 0,
    ...overrides,
  };
}

export function aQuote(overrides: Partial<Quote> = {}): Quote {
  return { symbol: 'BTCUSD', bid: 110, ask: 111, time: 1770283819, ...overrides };
}

export function quotesFor(...quotes: readonly Quote[]): Record<string, Quote> {
  return Object.fromEntries(quotes.map((quote) => [quote.symbol, quote]));
}

export function anInstrument(overrides: Partial<InstrumentDto> = {}): InstrumentDto {
  return { symbol: 'BTCUSD', contractType: 0, ...overrides };
}

export function aContractType(overrides: Partial<ContractTypeDto> = {}): ContractTypeDto {
  return { contractType: 0, contractSize: 1, ...overrides };
}
