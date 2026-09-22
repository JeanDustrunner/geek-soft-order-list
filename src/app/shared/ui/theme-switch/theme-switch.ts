import { Component, input, output } from "@angular/core";
import { isThemeMode, ThemeMode } from "../../util/theme-mode";

@Component({
  selector: 'app-theme-switch',
  template: `
    <label>
      Theme
      <select #select [value]="value()" (change)="onChange(select.value)">
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  `,
  styles: `
    label {
      display: inline-flex;
      gap: 0.5rem;
      align-items: center;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    select {
      padding: 0.3rem 0.5rem;
      font: inherit;
      text-transform: none;
      letter-spacing: normal;
      color: inherit;
      background: var(--row);
      border: 1px solid var(--row-hover);
      border-radius: 4px;
    }

    /* Zob. order-form.scss: rozwinięty <select> to natywny popup, który sam
       dobiera kolory na bazie color-scheme, bez dziedziczenia z reszty strony. */
    option {
      color: var(--fg);
      background: var(--bg);
    }
  `,
})
export class ThemeSwitch {
  readonly value = input.required<ThemeMode>();
  readonly valueChangeRequested = output<ThemeMode>();

  protected onChange(raw: string): void {
    if (isThemeMode(raw)) this.valueChangeRequested.emit(raw);
  }
}