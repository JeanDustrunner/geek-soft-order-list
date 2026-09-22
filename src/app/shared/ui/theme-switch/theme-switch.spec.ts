import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThemeSwitch } from './theme-switch';
import { ThemeMode } from '../../util/theme-mode';

describe('ThemeSwitch', () => {
  let fixture: ComponentFixture<ThemeSwitch>;

  const select = () => fixture.nativeElement.querySelector('select') as HTMLSelectElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [ThemeSwitch] });
    fixture = TestBed.createComponent(ThemeSwitch);
    fixture.componentRef.setInput('value', 'system' as ThemeMode);
    await fixture.whenStable();
  });

  it('offers following the system alongside the two explicit themes (R13)', () => {
    const options = [...select().options].map((option) => option.value);

    expect(options).toEqual(['system', 'light', 'dark']);
  });

  it('shows the mode it was given', async () => {
    fixture.componentRef.setInput('value', 'dark' as ThemeMode);
    await fixture.whenStable();

    expect(select().value).toBe('dark');
  });

  it('asks for the mode the user picked', () => {
    const emissions: ThemeMode[] = [];
    fixture.componentInstance.valueChangeRequested.subscribe((mode) => emissions.push(mode));

    select().value = 'light';
    select().dispatchEvent(new Event('change'));

    expect(emissions).toEqual(['light']);
  });

  it('ignores a value that is not a theme mode, so nothing unexpected reaches the service', () => {
    const emissions: ThemeMode[] = [];
    fixture.componentInstance.valueChangeRequested.subscribe((mode) => emissions.push(mode));

    select().value = '';
    select().dispatchEvent(new Event('change'));

    expect(emissions).toEqual([]);
  });
});
