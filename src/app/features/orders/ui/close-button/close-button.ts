import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-close-button',
  templateUrl: './close-button.html',
  styleUrl: './close-button.scss',
})
export class CloseButton {
  readonly label = input.required<string>();
  readonly variant = input<'single' | 'group'>('single');
  readonly closeRequested = output<void>();

  protected onClick(event: MouseEvent): void {
    event.stopPropagation();
    this.closeRequested.emit();
  }
}
