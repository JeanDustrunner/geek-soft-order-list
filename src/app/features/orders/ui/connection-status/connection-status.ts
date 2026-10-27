import { Component, computed, input } from '@angular/core';
import { ConnectionStatus } from '../../domain/models';

const LABELS: Record<ConnectionStatus, string> = {
  connecting: 'Connecting…',
  open: 'Live',
  reconnecting: 'Reconnecting…',
  closed: 'Offline',
};

@Component({
  selector: 'app-connection-status',
  host: { role: 'status', '[attr.data-status]': 'status()' },
  templateUrl: './connection-status.html',
  styleUrl: './connection-status.scss',
})
export class ConnectionStatusBadge {
  readonly status = input.required<ConnectionStatus>();
  protected readonly label = computed(() => LABELS[this.status()]);
}
