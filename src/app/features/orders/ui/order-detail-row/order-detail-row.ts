import { Component, computed, input, output } from '@angular/core';
import { Order } from '../../domain/models';
import { calcProfit } from '../../domain/profit';
import { DatePipe, DecimalPipe } from '@angular/common';
import { CloseButton } from '../close-button/close-button';
import { ProfitClassPipe } from '../profit-class.pipe';

@Component({
  selector: 'tr[app-order-detail-row]',
  imports: [DatePipe, DecimalPipe, ProfitClassPipe, CloseButton],
  host: { '[class.alt]': 'alternate()' },
  templateUrl: './order-detail-row.html',
  styleUrl: './order-detail-row.scss',
})
export class OrderDetailRow {
  readonly order = input.required<Order>();
  readonly bid = input<number | undefined>();
  readonly alternate = input(false);
  readonly closeRequested = output<void>();

  protected readonly profit = computed(() => calcProfit(this.order(), this.bid()));
}
