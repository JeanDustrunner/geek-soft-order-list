export type Side = 'BUY' | 'SELL';

// DTO
export interface OrderDto {
  id: number;
  symbol: string;
  side: Side;
  size: number;
  openPrice: number;
  openTime: number;
  swap: number;
}
export interface InstrumentDto {
  symbol: string;
  contractType: number;
}
export interface ContractTypeDto {
  contractType: number;
  contractSize: number;
}
export interface QuoteDto {
  s: string;
  b: number;
  a?: number;
  t?: number;
}

// Domain
export interface Order {
  readonly id: number;
  readonly symbol: string;
  readonly side: Side;
  readonly size: number;
  readonly openPrice: number;
  readonly openTime: number;
  readonly swap: number;
  readonly contractSize: number | null;
}
export interface Quote {
  readonly symbol: string;
  readonly bid: number;
  readonly ask?: number;
  readonly time?: number;
}
export interface OrderRow {
  readonly order: Order;
  readonly profit: number | null;
}
export interface SymbolGroup {
  readonly symbol: string;
  readonly count: number;
  readonly sumSize: number;
  readonly avgOpenPrice: number;
  readonly sumSwap: number;
  readonly sumProfit: number | null;
  readonly rows: readonly OrderRow[];
}
export interface OrderFormModel {
  readonly symbol: string;
  readonly side: Side;
  readonly size: number;
  readonly openPrice: number;
  readonly openTime: string;
}

export interface NewOrderInput {
  readonly symbol: string;
  readonly side: Side;
  readonly size: number;
  readonly openPrice: number;
  readonly openTime: number;
}
