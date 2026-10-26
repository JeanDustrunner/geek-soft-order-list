import { Order, SymbolGroup } from './models';

export const sumBy = <T>(items: readonly T[], f: (item: T) => number): number =>
  items.reduce((acc, item) => acc + f(item), 0);

export function groupOrdersBySymbol(orders: readonly Order[]): SymbolGroup[] {
  const bySymbol = new Map<string, Order[]>();
  for (const order of orders) {
    const bucket = bySymbol.get(order.symbol);
    if (bucket) bucket.push(order);
    else bySymbol.set(order.symbol, [order]);
  }

  return [...bySymbol]
    .map(([symbol, group]) => {
      const sumSize = sumBy(group, (o) => o.size);
      return {
        symbol,
        count: group.length,
        sumSize,
        avgOpenPrice: sumBy(group, (o) => o.openPrice * o.size) / sumSize,
        sumSwap: sumBy(group, (o) => o.swap),
        orders: group,
      };
    })
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}
