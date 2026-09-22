import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { OrderDetailRow } from './order-detail-row';
import { OrderRow } from '../../domain/models';
import { anOrder } from '../../testing/builders';

const asLocalDisplayDate = (ms: number) => {
  const date = new Date(ms);
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
};

describe('OrderDetailRow', () => {
  let fixture: ComponentFixture<OrderDetailRow>;

  const cells = () => [...fixture.nativeElement.querySelectorAll('td')] as HTMLElement[];
  const textOf = (index: number) => cells()[index].textContent?.trim() ?? '';

  const render = async (row: OrderRow) => {
    fixture.componentRef.setInput('row', row);
    await fixture.whenStable();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [OrderDetailRow] });
    fixture = TestBed.createComponent(OrderDetailRow);
  });

  it('shows the order id and side, the fields that identify a single order (R5)', async () => {
    await render({ order: anOrder({ id: 1226230, side: 'SELL' }), profit: null });

    expect(textOf(3)).toBe('1226230');
    expect(textOf(4)).toBe('SELL');
  });

  it('shows the open time as dd.MM.yyyy HH:mm:ss (R5)', async () => {
    const openTime = Date.UTC(2025, 5, 20, 16, 30, 22);

    await render({ order: anOrder({ openTime }), profit: null });

    expect(textOf(6)).toBe(asLocalDisplayDate(openTime));
  });

  it('shows size and open price of the single order, not of the group (R5)', async () => {
    await render({ order: anOrder({ size: 0.05, openPrice: 104_837.47 }), profit: null });

    expect(textOf(5)).toBe('0.05');
    expect(textOf(7)).toBe('104,837.47');
  });

  it('shows a dash instead of a profit while the symbol has no quote', async () => {
    await render({ order: anOrder(), profit: null });

    expect(textOf(9)).toBe('—');
  });

  it('shows the profit once it is known', async () => {
    await render({ order: anOrder(), profit: -1234.5 });

    expect(textOf(9)).toBe('-1,234.50');
  });

  it('leaves the group columns empty, because they describe the whole symbol (R4)', async () => {
    await render({ order: anOrder(), profit: null });

    expect(textOf(1)).toBe('');
    expect(textOf(2)).toBe('');
  });

  it('asks to be closed when its close button is pressed (R6)', async () => {
    await render({ order: anOrder(), profit: null });
    const emissions: unknown[] = [];
    fixture.componentInstance.closeRequested.subscribe(() => emissions.push('close'));

    (fixture.nativeElement.querySelector('.close') as HTMLButtonElement).click();

    expect(emissions).toHaveLength(1);
  });
});
