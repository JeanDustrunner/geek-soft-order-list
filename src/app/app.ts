import { Component, inject } from '@angular/core';
import { NgxSonnerToaster } from 'ngx-sonner';
import { OrdersTableContainer } from './features/orders/feature/orders-table.container';
import { ThemeService } from './core/theme.service';
import { ThemeSwitch } from './shared/ui/theme-switch/theme-switch';

@Component({
  imports: [OrdersTableContainer, NgxSonnerToaster, ThemeSwitch],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly theme = inject(ThemeService);
}
