import { describe, expect, it } from 'vitest';
import { groupOrdersBySymbol } from './aggregate';
import { anOrder } from '../testing/builders';

describe('groupOrdersBySymbol', () => {
  it('produces no groups for an empty order list', () => {
    expect(groupOrdersBySymbol([])).toEqual([]);
  });

  it('groups orders that share a symbol and counts them', () => {
    const orders = [
      anOrder({ id: 1, symbol: 'BTCUSD' }),
      anOrder({ id: 2, symbol: 'BTCUSD' }),
      anOrder({ id: 3, symbol: 'ETHUSD' }),
    ];

    const groups = groupOrdersBySymbol(orders);

    expect(groups.map((group) => [group.symbol, group.count])).toEqual([
      ['BTCUSD', 2],
      ['ETHUSD', 1],
    ]);
  });

  it('orders groups alphabetically, independent of the input order', () => {
    const orders = [anOrder({ symbol: 'ETHUSD' }), anOrder({ symbol: 'BTCUSD' })];

    const groups = groupOrdersBySymbol(orders);

    expect(groups.map((group) => group.symbol)).toEqual(['BTCUSD', 'ETHUSD']);
  });

  it('sums size and swap across the orders of a group', () => {
    const orders = [
      anOrder({ symbol: 'BTCUSD', size: 0.05, swap: -1.5 }),
      anOrder({ symbol: 'BTCUSD', size: 0.01, swap: 0.25 }),
    ];

    const [group] = groupOrdersBySymbol(orders);

    expect(group.sumSize).toBeCloseTo(0.06, 10);
    expect(group.sumSwap).toBeCloseTo(-1.25, 10);
  });

  it('weighs the average open price by order size', () => {
    const orders = [
      anOrder({ symbol: 'BTCUSD', openPrice: 100, size: 10 }),
      anOrder({ symbol: 'BTCUSD', openPrice: 200, size: 1 }),
    ];

    const [group] = groupOrdersBySymbol(orders);

    expect(group.avgOpenPrice).toBeCloseTo(1200 / 11, 10);
  });

  it('keeps the orders of a group in their input order', () => {
    const orders = [anOrder({ id: 7, symbol: 'BTCUSD' }), anOrder({ id: 9, symbol: 'BTCUSD' })];

    const [group] = groupOrdersBySymbol(orders);

    expect(group.orders.map((order) => order.id)).toEqual([7, 9]);
  });

  it('yields a non-finite average when the sizes of a group cancel out to zero', () => {
    const orders = [
      anOrder({ symbol: 'BTCUSD', openPrice: 100, size: 1 }),
      anOrder({ symbol: 'BTCUSD', openPrice: 100, size: -1 }),
    ];

    const [group] = groupOrdersBySymbol(orders);

    expect(Number.isNaN(group.avgOpenPrice)).toBe(true);
  });
});
