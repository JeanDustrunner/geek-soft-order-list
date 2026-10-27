import { Quote, QuoteDto } from './models';
import { isRecord } from './guards';

const isQuoteDto = (x: unknown): x is QuoteDto =>
  isRecord(x) &&
  typeof x['s'] === 'string' &&
  typeof x['b'] === 'number' &&
  (x['a'] === undefined || typeof x['a'] === 'number') &&
  (x['t'] === undefined || typeof x['t'] === 'number');

export function parseQuotesMessage(raw: unknown): Quote[] | null {
  if (typeof raw !== 'string') return null;
  let msg: unknown;
  try {
    msg = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(msg) || msg['p'] !== '/quotes/subscribed' || !Array.isArray(msg['d'])) return null;
  return msg['d']
    .filter(isQuoteDto)
    .map((quote) => ({ symbol: quote.s, bid: quote.b, ask: quote.a, time: quote.t }));
}
