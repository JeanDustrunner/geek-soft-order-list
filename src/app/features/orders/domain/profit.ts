import { sumBy } from './aggregate';
import { Order } from './models';

export function calcProfit(
  { openPrice, size, contractSize, side }: Order,
  bid: number | undefined,
): number | null {
  if (bid === undefined || contractSize === null) return null;
  const sideMultiplier = side === 'BUY' ? 1 : -1;
  const profit = (bid - openPrice) * size * contractSize * sideMultiplier;
  return profit === 0 ? 0 : profit;
}

export function sumProfit(orders: readonly Order[], bid: number | undefined): number | null {
  const profits = orders.map((order) => calcProfit(order, bid));
  return profits.every((p): p is number => p !== null) ? sumBy(profits, (p) => p) : null;
}
