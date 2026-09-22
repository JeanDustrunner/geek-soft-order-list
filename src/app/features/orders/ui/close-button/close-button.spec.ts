import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { CloseButton } from './close-button';

describe('CloseButton', () => {
  let fixture: ComponentFixture<CloseButton>;

  const button = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [CloseButton] });
    fixture = TestBed.createComponent(CloseButton);
    fixture.componentRef.setInput('label', 'Close order 42');
    await fixture.whenStable();
  });

  it('announces what it closes, because the icon alone says nothing to a screen reader', () => {
    expect(button().getAttribute('aria-label')).toBe('Close order 42');
  });

  it('asks to be closed when pressed', async () => {
    const emissions: unknown[] = [];
    fixture.componentInstance.closeRequested.subscribe(() => emissions.push('closed'));

    button().click();

    expect(emissions).toHaveLength(1);
  });

  it('keeps the click to itself, so closing inside a clickable row does not also toggle it', () => {
    let bubbled = false;
    fixture.nativeElement.addEventListener('click', () => (bubbled = true));

    button().click();

    expect(bubbled).toBe(false);
  });

  it('shows a single-item icon by default', async () => {
    await fixture.whenStable();

    expect(button().querySelector('svg')).toBeNull();
    expect(button().textContent?.trim()).toBe('✕');
  });

  it('shows a bin icon for a group, so removing many orders looks different from dismissing one', async () => {
    fixture.componentRef.setInput('variant', 'group');
    await fixture.whenStable();

    expect(button().querySelector('svg')).not.toBeNull();
  });
});
