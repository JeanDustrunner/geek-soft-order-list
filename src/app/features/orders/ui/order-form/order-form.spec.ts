import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderForm } from './order-form';
import { NewOrderInput } from '../../domain/models';

describe('OrderForm', () => {
  let fixture: ComponentFixture<OrderForm>;
  let submitted: NewOrderInput[];

  const query = <T extends HTMLElement>(selector: string) =>
    fixture.nativeElement.querySelector(selector) as T;

  const priceText = () => query('.price').textContent?.trim() ?? '';
  const errorTexts = () =>
    [...fixture.nativeElement.querySelectorAll('.error')].map((element) =>
      (element as HTMLElement).textContent?.trim(),
    );

  const setBid = async (bid: number | undefined) => {
    fixture.componentRef.setInput('currentBid', bid);
    await fixture.whenStable();
  };

  const pickSymbol = async (symbol: string) => {
    const input = query<HTMLInputElement>('#symbol');
    input.value = symbol;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };

  const typeSize = async (size: string) => {
    const input = query<HTMLInputElement>('input[type="number"]');
    input.value = size;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  const submit = async () => {
    query<HTMLFormElement>('form').dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [OrderForm] });
    fixture = TestBed.createComponent(OrderForm);
    fixture.componentRef.setInput('symbols', ['BTCUSD', 'ETHUSD', 'EURPLN']);
    submitted = [];
    fixture.componentInstance.submitted.subscribe((order) => submitted.push(order));
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('choosing a symbol', () => {
    it('offers every symbol from the order file, including ones with no open orders (R10a)', () => {
      const options = [...fixture.nativeElement.querySelectorAll('datalist option')].map(
        (option) => (option as HTMLOptionElement).value,
      );

      expect(options).toEqual(['BTCUSD', 'ETHUSD', 'EURPLN']);
    });

    it('announces the chosen symbol, so its quotes can be subscribed on demand', async () => {
      const watched: string[] = [];
      fixture.componentInstance.symbolSelected.subscribe((symbol) => watched.push(symbol));

      await pickSymbol('ETHUSD');

      expect(watched).toEqual(['ETHUSD']);
    });

    it('announces nothing for text that is not a symbol from the list', async () => {
      const watched: string[] = [];
      fixture.componentInstance.symbolSelected.subscribe((symbol) => watched.push(symbol));

      await pickSymbol('EUR');

      expect(watched).toEqual([]);
    });
  });

  describe('the open price', () => {
    it('asks for a symbol before it can show any price', () => {
      expect(priceText()).toBe('Select symbol first');
    });

    it('waits for the first quote of the chosen symbol', async () => {
      await pickSymbol('ETHUSD');

      expect(priceText()).toBe('Loading price…');
    });

    it('shows the current bid once it arrives (R10b)', async () => {
      await pickSymbol('ETHUSD');

      await setBid(2134.69);

      expect(priceText()).toBe('2,134.69');
    });

    it('follows the market while the form is open', async () => {
      await pickSymbol('ETHUSD');
      await setBid(2134.69);

      await setBid(2200.0);

      expect(priceText()).toBe('2,200.00');
    });

    it('waits again once the parent has no bid for a newly chosen symbol', async () => {
      await pickSymbol('ETHUSD');
      await setBid(2134.69);

      await pickSymbol('BTCUSD');
      await setBid(undefined);

      expect(priceText()).toBe('Loading price…');
    });

    it('is not editable, because the open price of a market order comes from the market', async () => {
      await pickSymbol('ETHUSD');
      await setBid(2134.69);

      expect(query('.price').tagName.toLowerCase()).toBe('output');
    });
  });

  describe('refusing to submit', () => {
    it('refuses an order with no symbol', async () => {
      await typeSize('1');

      await submit();

      expect(submitted).toEqual([]);
    });

    it('refuses an order whose symbol is not on the list', async () => {
      await pickSymbol('EUR');
      await typeSize('1');

      await submit();

      expect(submitted).toEqual([]);
    });

    it('refuses an order while the price is still unknown, so nothing opens at a made-up price', async () => {
      await pickSymbol('ETHUSD');
      await typeSize('1');

      await submit();

      expect(submitted).toEqual([]);
    });

    it('refuses a size of zero (R10d)', async () => {
      await pickSymbol('ETHUSD');
      await setBid(2134.69);
      await typeSize('0');

      await submit();

      expect(submitted).toEqual([]);
    });

    it('refuses a negative size (R10d)', async () => {
      await pickSymbol('ETHUSD');
      await setBid(2134.69);
      await typeSize('-1');

      await submit();

      expect(submitted).toEqual([]);
    });

    it('refuses an empty size (R10d)', async () => {
      await pickSymbol('ETHUSD');
      await setBid(2134.69);
      await typeSize('');

      await submit();

      expect(submitted).toEqual([]);
    });

    it('explains why it refused, instead of doing nothing visible', async () => {
      await submit();

      expect(errorTexts().length).toBeGreaterThan(0);
    });
  });

  describe('submitting', () => {
    const fillValidOrder = async () => {
      await pickSymbol('ETHUSD');
      await setBid(2134.69);
      await typeSize('0.5');
    };

    it('accepts the smallest positive size', async () => {
      await pickSymbol('ETHUSD');
      await setBid(2134.69);
      await typeSize('0.01');

      await submit();

      expect(submitted[0].size).toBeCloseTo(0.01, 10);
    });

    it('accepts a very large size', async () => {
      await pickSymbol('ETHUSD');
      await setBid(2134.69);
      await typeSize('1000000');

      await submit();

      expect(submitted[0].size).toBe(1_000_000);
    });

    it('opens the order at the current bid, not at a price the user typed (R10b)', async () => {
      await fillValidOrder();

      await submit();

      expect(submitted[0].openPrice).toBeCloseTo(2134.69, 10);
    });

    it('keeps what the user typed when the price moves', async () => {
      await pickSymbol('ETHUSD');
      await setBid(2134.69);
      await typeSize('0.5');

      await setBid(2200.0);
      await submit();

      expect(submitted[0]).toMatchObject({ size: 0.5, openPrice: 2200 });
    });

    it('defaults the direction to BUY', async () => {
      await fillValidOrder();

      await submit();

      expect(submitted[0].side).toBe('BUY');
    });

    it('stamps the moment of submission as the open time, read as local time', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      const now = new Date(2026, 8, 22, 14, 30, 22, 750).getTime();
      vi.setSystemTime(now);
      await fillValidOrder();

      await submit();

      // Round-trip przez format datetime-local gubi milisekundy, ale nie przesuwa
      // godziny — gdyby wartość czytano jako UTC, różnica byłaby o offset strefy.
      expect(submitted[0].openTime).toBe(Math.floor(now / 1000) * 1000);
    });
  });

  it('asks to be dismissed when cancelled', async () => {
    const cancels: unknown[] = [];
    fixture.componentInstance.cancelled.subscribe(() => cancels.push('cancel'));

    query<HTMLButtonElement>('button[type="button"]').click();

    expect(cancels).toHaveLength(1);
  });
});
