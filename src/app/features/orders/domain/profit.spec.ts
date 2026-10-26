import { describe, expect, it } from 'vitest';
import { calcProfit, sumProfit } from './profit';
import { groupOrdersBySymbol } from './aggregate';
import { anOrder } from '../testing/builders';

describe('calcProfit', () => {
  it('returns a gain for a BUY position when the bid rises above the open price', () => {
    const order = anOrder({ side: 'BUY', openPrice: 100, size: 2, contractSize: 1 });

    expect(calcProfit(order, 110)).toBeCloseTo(20, 10);
  });

  it('returns a loss for a BUY position when the bid falls below the open price', () => {
    const order = anOrder({ side: 'BUY', openPrice: 100, size: 2, contractSize: 1 });

    expect(calcProfit(order, 90)).toBeCloseTo(-20, 10);
  });

  it('flips the sign for a SELL position, so a rising bid is a loss', () => {
    const order = anOrder({ side: 'SELL', openPrice: 100, size: 2, contractSize: 1 });

    expect(calcProfit(order, 110)).toBeCloseTo(-20, 10);
  });

  it('returns a gain for a SELL position when the bid falls below the open price', () => {
    const order = anOrder({ side: 'SELL', openPrice: 100, size: 2, contractSize: 1 });

    expect(calcProfit(order, 90)).toBeCloseTo(20, 10);
  });

  it('reports a single zero for a SELL position closing at its open price', () => {
    const order = anOrder({ side: 'SELL', openPrice: 100, size: 1, contractSize: 1 });

    expect(calcProfit(order, 100)).toBe(0);
  });

  it('scales the result by the contract size of the instrument', () => {
    const order = anOrder({ side: 'BUY', openPrice: 1.10345, size: 0.5, contractSize: 100_000 });

    expect(calcProfit(order, 1.10845)).toBeCloseTo(250, 6);
  });

  it('applies fractional order sizes', () => {
    const order = anOrder({ side: 'BUY', openPrice: 50_000, size: 0.01, contractSize: 1 });

    expect(calcProfit(order, 51_000)).toBeCloseTo(10, 10);
  });

  it('reports an unknown profit, not zero, while the symbol has no quote yet', () => {
    expect(calcProfit(anOrder(), undefined)).toBeNull();
  });

  it('reports an unknown profit, not zero, when the instrument has no contract size', () => {
    expect(calcProfit(anOrder({ contractSize: null }), 110)).toBeNull();
  });
});

describe('sumProfit', () => {
  it('keeps the group row consistent: its profit equals the formula applied to the aggregate', () => {
    const orders = [
      anOrder({ symbol: 'BTCUSD', side: 'BUY', openPrice: 100, size: 10, contractSize: 1 }),
      anOrder({ symbol: 'BTCUSD', side: 'BUY', openPrice: 200, size: 1, contractSize: 1 }),
    ];
    const [group] = groupOrdersBySymbol(orders);

    const profit = sumProfit(orders, 110);

    expect(profit).toBeCloseTo((110 - group.avgOpenPrice) * group.sumSize * 1, 8);
    expect(profit).toBeCloseTo(10, 8);
  });

  it('reports an unknown group profit when any of its orders has none', () => {
    const orders = [anOrder({ contractSize: 1 }), anOrder({ contractSize: null })];

    expect(sumProfit(orders, 110)).toBeNull();
  });

  it('reports an unknown group profit while the symbol has no quote yet', () => {
    expect(sumProfit([anOrder()], undefined)).toBeNull();
  });
});
