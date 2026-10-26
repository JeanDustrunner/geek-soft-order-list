import { computed, effect, Service, signal } from '@angular/core';
import { ThemeMode } from '../shared/util/theme-mode';

@Service()
export class ThemeService {
  readonly #media = matchMedia('(prefers-color-scheme: dark)');
  readonly #systemDark = signal(this.#media.matches);

  readonly mode = signal<ThemeMode>(readStoredMode());
  readonly effective = computed(() => {
    const m = this.mode();
    return m === 'system' ? (this.#systemDark() ? 'dark' : 'light') : m;
  });

  constructor() {
    this.#media.addEventListener('change', (e) => this.#systemDark.set(e.matches));

    effect(() => {
      const mode = this.mode();
      const root = document.documentElement;
      try {
        if (mode === 'system') {
          delete root.dataset['theme'];
          localStorage.removeItem('theme');
        } else {
          root.dataset['theme'] = mode;
          localStorage.setItem('theme', mode);
        }
      } catch {
        console.warn('WARNING: Unable to set theme.');
      }
    });
  }
}

function readStoredMode(): ThemeMode {
  try {
    const theme = localStorage.getItem('theme');
    return theme === 'light' || theme === 'dark' ? theme : 'system';
  } catch {
    return 'system';
  }
}
