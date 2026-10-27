import { Signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ConnectionStatus, Quote } from '../domain/models';

export abstract class QuotesSource {
  abstract readonly quotes$: Observable<Quote[]>;
  abstract readonly status: Signal<ConnectionStatus>;
  abstract connect(): void;
  abstract disconnect(): void;
  abstract setSymbols(symbols: readonly string[]): void;
}
