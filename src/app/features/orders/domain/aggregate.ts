import { Order, Quote, SymbolGroup } from './models';
import { calcProfit } from './profit';

const sumBy = <T>(items: readonly T[], f: (item: T) => number): number =>
  items.reduce((acc, item) => acc + f(item), 0);

export function groupOrdersBySymbol(
  orders: readonly Order[],
  quotes: Readonly<Record<string, Quote>>,
): SymbolGroup[] {
  const bySymbol = new Map<string, Order[]>();
  for (const order of orders) {
    const bucket = bySymbol.get(order.symbol);
    if (bucket) bucket.push(order);
    else bySymbol.set(order.symbol, [order]);
  }

  return [...bySymbol]
    .map(([symbol, group]) => {
      const bid = quotes[symbol]?.bid;
      const rows = group.map((order) => ({ order, profit: calcProfit(order, bid) }));
      const profits = rows.map((r) => r.profit);
      const sumSize = sumBy(group, (o) => o.size);
      return {
        symbol,
        count: group.length,
        sumSize,
        avgOpenPrice: sumBy(group, (o) => o.openPrice * o.size) / sumSize,
        sumSwap: sumBy(group, (o) => o.swap),
        sumProfit: profits.every((p): p is number => p !== null) ? sumBy(profits, (p) => p) : null,
        rows,
      };
    })
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}
