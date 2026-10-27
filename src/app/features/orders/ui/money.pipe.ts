import { formatNumber } from '@angular/common';
import { inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';
import { MONEY_MIN_DECIMALS, roundMoney } from '../domain/precision';

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  readonly #locale = inject(LOCALE_ID);

  transform(value: number | null): string | null {
    if (value === null) return null;
    const { value: rounded, decimals } = roundMoney(value);
    return formatNumber(rounded, this.#locale, `1.${MONEY_MIN_DECIMALS}-${decimals}`);
  }
}
