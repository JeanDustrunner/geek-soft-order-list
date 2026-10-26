import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { OrderGroupRow } from './order-group-row';
import { SymbolGroup } from '../../domain/models';
import { anOrder } from '../../testing/builders';

const aGroup = (overrides: Partial<SymbolGroup> = {}): SymbolGroup => ({
  symbol: 'BTCUSD',
  count: 2,
  sumSize: 0.06,
  avgOpenPrice: 104_837.47,
  sumSwap: -1.25,
  orders: [anOrder({ id: 1 }), anOrder({ id: 2 })],
  ...overrides,
});

describe('OrderGroupRow', () => {
  let fixture: ComponentFixture<OrderGroupRow>;

  const cells = () => [...fixture.nativeElement.querySelectorAll('td')] as HTMLElement[];
  const textOf = (index: number) => cells()[index].textContent?.trim() ?? '';

  const render = async (group: SymbolGroup, expanded = false, bid?: number) => {
    fixture.componentRef.setInput('group', group);
    fixture.componentRef.setInput('expanded', expanded);
    fixture.componentRef.setInput('bid', bid);
    await fixture.whenStable();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [OrderGroupRow] });
    fixture = TestBed.createComponent(OrderGroupRow);
  });

  it('shows the symbol of the group', async () => {
    await render(aGroup({ symbol: 'ETHUSD' }));

    expect(fixture.nativeElement.querySelector('.expand').textContent).toContain('ETHUSD');
  });

  it('badges how many orders the group holds (R4)', async () => {
    await render(aGroup({ count: 3 }));

    expect(fixture.nativeElement.querySelector('.badge').textContent?.trim()).toBe('3');
  });

  it('leaves the per-order columns empty, because they describe single orders (R4)', async () => {
    await render(aGroup());

    // Order ID i Side należą wyłącznie do wiersza zlecenia.
    expect(textOf(3)).toBe('');
    expect(textOf(4)).toBe('');
    expect(textOf(6)).toBe('');
  });

  it('shows the summed size, summed swap and summed profit of the group (R4)', async () => {
    const orders = [
      anOrder({ id: 1, side: 'BUY', openPrice: 100, size: 1, contractSize: 1 }),
      anOrder({ id: 2, side: 'BUY', openPrice: 100, size: 1, contractSize: 1 }),
    ];

    await render(aGroup({ sumSize: 0.06, sumSwap: -1.25, orders }), false, 106.25);

    expect(textOf(5)).toBe('0.06');
    expect(textOf(8)).toBe('-1.25');
    expect(textOf(9)).toBe('12.50');
  });

  it('shows a dash instead of a profit while the group has no quote', async () => {
    await render(aGroup());

    expect(textOf(9)).toBe('—');
  });

  it('tells assistive technology whether the group is collapsed', async () => {
    await render(aGroup(), false);

    expect(fixture.nativeElement.querySelector('.expand').getAttribute('aria-expanded')).toBe(
      'false',
    );
  });

  it('tells assistive technology whether the group is expanded', async () => {
    await render(aGroup(), true);

    expect(fixture.nativeElement.querySelector('.expand').getAttribute('aria-expanded')).toBe(
      'true',
    );
  });

  it('asks to be toggled when the row is clicked anywhere (R5)', async () => {
    await render(aGroup());
    const toggles: unknown[] = [];
    fixture.componentInstance.toggleRequested.subscribe(() => toggles.push('toggle'));

    cells()[5].click();

    expect(toggles).toHaveLength(1);
  });

  it('asks to be closed, and not toggled, when its close button is pressed', async () => {
    await render(aGroup());
    const events: string[] = [];
    fixture.componentInstance.toggleRequested.subscribe(() => events.push('toggle'));
    fixture.componentInstance.closeRequested.subscribe(() => events.push('close'));

    (fixture.nativeElement.querySelector('.close') as HTMLButtonElement).click();

    expect(events).toEqual(['close']);
  });

  it('marks alternating groups, so a group and its orders read as one block', async () => {
    fixture.componentRef.setInput('group', aGroup());
    fixture.componentRef.setInput('alternate', true);
    await fixture.whenStable();

    expect(fixture.nativeElement.classList.contains('alt')).toBe(true);
  });
});
