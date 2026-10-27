import { Pipe, PipeTransform } from '@angular/core';
import { roundMoney } from '../domain/precision';

@Pipe({ name: 'profitClass' })
export class ProfitClassPipe implements PipeTransform {
  transform(profit: number | null): string {
    if (profit === null) return '';
    const { value } = roundMoney(profit);
    if (value === 0) return '';
    return value > 0 ? 'profit-positive' : 'profit-negative';
  }
}
