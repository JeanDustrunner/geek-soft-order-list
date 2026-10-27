import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ConnectionStatusBadge } from './connection-status';
import { ConnectionStatus } from '../../domain/models';

describe('ConnectionStatusBadge', () => {
  let fixture: ComponentFixture<ConnectionStatusBadge>;

  const host = () => fixture.nativeElement as HTMLElement;

  const render = async (status: ConnectionStatus) => {
    fixture.componentRef.setInput('status', status);
    await fixture.whenStable();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ConnectionStatusBadge] });
    fixture = TestBed.createComponent(ConnectionStatusBadge);
  });

  it.each([
    ['open', 'Live'],
    ['connecting', 'Connecting…'],
    ['reconnecting', 'Reconnecting…'],
    ['closed', 'Offline'],
  ] as const)('labels the %s state as "%s"', async (status, label) => {
    await render(status);

    expect(host().textContent?.trim()).toBe(label);
  });

  it('exposes the state for styling, so the dot colour needs no logic', async () => {
    await render('reconnecting');

    expect(host().getAttribute('data-status')).toBe('reconnecting');
  });

  it('announces changes to assistive technology', async () => {
    await render('open');

    expect(host().getAttribute('role')).toBe('status');
  });
});
