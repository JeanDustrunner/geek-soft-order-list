import { ContractTypeDto, InstrumentDto, OrderDto } from './models';
import { isFiniteNumber, isRecord } from './guards';

export interface ParsedList<T> {
  readonly items: T[];
  readonly skipped: number;
}

const isOrderDto = (x: unknown): x is OrderDto =>
  isRecord(x) &&
  isFiniteNumber(x['id']) &&
  typeof x['symbol'] === 'string' &&
  (x['side'] === 'BUY' || x['side'] === 'SELL') &&
  isFiniteNumber(x['size']) &&
  isFiniteNumber(x['openPrice']) &&
  isFiniteNumber(x['openTime']) &&
  isFiniteNumber(x['swap']);

const isInstrumentDto = (x: unknown): x is InstrumentDto =>
  isRecord(x) && typeof x['symbol'] === 'string' && isFiniteNumber(x['contractType']);

const isContractTypeDto = (x: unknown): x is ContractTypeDto =>
  isRecord(x) && isFiniteNumber(x['contractType']) && isFiniteNumber(x['contractSize']);

function parseList<T>(raw: unknown, isItem: (x: unknown) => x is T, source: string): ParsedList<T> {
  if (!Array.isArray(raw)) throw new Error(`Unexpected ${source} response: expected a list.`);
  const items = raw.filter(isItem);
  return { items, skipped: raw.length - items.length };
}

export const parseOrders = (raw: unknown): ParsedList<OrderDto> =>
  parseList(isRecord(raw) ? raw['data'] : undefined, isOrderDto, 'orders');

export const parseInstruments = (raw: unknown): ParsedList<InstrumentDto> =>
  parseList(raw, isInstrumentDto, 'instruments');

export const parseContractTypes = (raw: unknown): ParsedList<ContractTypeDto> =>
  parseList(raw, isContractTypeDto, 'contract types');
