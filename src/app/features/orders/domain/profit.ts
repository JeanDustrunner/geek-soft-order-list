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
