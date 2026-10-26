import { Component, computed, effect, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { OrderFormModel, Quote, Side, NewOrderInput } from '../../domain/models';
import { form, required, validate, FormField, min } from '@angular/forms/signals';

@Component({
  selector: 'app-order-form',
  imports: [FormField, DecimalPipe],
  templateUrl: './order-form.html',
  styleUrl: './order-form.scss',
})
export class OrderForm {
  readonly symbols = input.required<readonly string[]>();
  readonly quotes = input.required<Readonly<Record<string, Quote>>>();
  readonly submitted = output<NewOrderInput>();
  readonly cancelled = output<void>();
  readonly symbolSelected = output<string>();

  protected readonly model = signal<OrderFormModel>({
    symbol: '',
    side: 'BUY' as Side,
    size: 0,
    openPrice: 0,
    openTime: toDateTimeLocal(Date.now()),
  });

  protected readonly hasSymbol = computed(() => this.symbols().includes(this.model().symbol));

  protected readonly priceLoading = computed(
    () => this.hasSymbol() && this.quotes()[this.model().symbol] === undefined,
  );

  protected readonly orderForm = form(this.model, (path) => {
    required(path.symbol);
    validate(path.symbol, (ctx) => {
      const value = ctx.value();
      return value === '' || this.symbols().includes(value) ? null : { kind: 'unknownSymbol' };
    });
    validate(path.size, (ctx) => (ctx.value() > 0 ? null : { kind: 'positive' }));
    validate(path.openPrice, (ctx) => (ctx.value() > 0 ? null : { kind: 'positive' }));
    min(path.size, 0);
    min(path.openPrice, 0);
    required(path.openTime);
  });

  constructor() {
    effect(() => {
      const { symbol, openPrice } = this.model();
      const bid = this.quotes()[symbol]?.bid;
      if (bid !== undefined && bid !== openPrice) {
        this.model.update((model) => ({ ...model, openPrice: bid }));
      }
    });
  }

  protected onSymbolChange(symbol: string): void {
    this.model.update((model) => ({ ...model, symbol, openPrice: 0 }));
    if (this.symbols().includes(symbol)) this.symbolSelected.emit(symbol);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.model.update((model) => ({ ...model, openTime: toDateTimeLocal(Date.now()) }));

    if (!this.orderForm().valid()) {
      this.orderForm().markAsTouched();
      return;
    }
    const value = this.model();
    this.submitted.emit({ ...value, openTime: new Date(value.openTime).getTime() });
  }
}

function toDateTimeLocal(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}
