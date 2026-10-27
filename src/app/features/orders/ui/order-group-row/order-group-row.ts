import { DecimalPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { SymbolGroup } from '../../domain/models';
import { sumProfit } from '../../domain/profit';
import { CloseButton } from '../close-button/close-button';
import { MoneyPipe } from '../money.pipe';
import { ProfitClassPipe } from '../profit-class.pipe';

@Component({
  selector: 'tr[app-order-group-row]',
  imports: [DecimalPipe, MoneyPipe, ProfitClassPipe, CloseButton],
  host: { class: 'group-row', '(click)': 'toggleRequested.emit()', '[class.alt]': 'alternate()' },
  templateUrl: './order-group-row.html',
  styleUrl: './order-group-row.scss',
})
export class OrderGroupRow {
  readonly group = input.required<SymbolGroup>();
  readonly bid = input<number | undefined>();
  readonly expanded = input(false);
  readonly alternate = input(false);
  readonly toggleRequested = output<void>();
  readonly closeRequested = output<void>();

  protected readonly profit = computed(() => sumProfit(this.group().orders, this.bid()));
}
