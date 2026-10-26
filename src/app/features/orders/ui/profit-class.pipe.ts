import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'profitClass' })
export class ProfitClassPipe implements PipeTransform {
  transform(profit: number | null): string {
    if (profit === null || profit === 0) return '';
    return profit > 0 ? 'profit-positive' : 'profit-negative';
  }
}
