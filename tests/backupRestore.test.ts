import { describe, expect, it } from 'vitest';
import { planRestore } from '../src/lib/backupRestore';

describe('planRestore (REL-004)', () => {
  it('throws before producing a plan for an invalid backup', () => {
    expect(() => planRestore({ rooms: [] })).toThrow(/rooms/);
    expect(() => planRestore(null)).toThrow();
  });

  it('plans every recognised part and lists them', () => {
    const plan = planRestore({
      canvasProfiles: { main: { id: 'main', layout: [] } },
      activeProfileId: 'main',
      pinCode: '1234',
      preferences: { tempUnit: 'F', clockFormat: '12h', energyTariff: 0.3, currencySymbol: '$', themeMode: 'dark' },
      userProfile: { name: 'Sam' },
      dashboardConfig: { cameras: { defaultStreamType: 'auto' } },
      entityCustomizations: { 'light.a': { customName: 'A' } }
    });
    expect(plan.canvasProfiles).toBeDefined();
    expect(plan.activeProfileId).toBe('main');
    expect(plan.pin).toBe('1234');
    expect(plan.prefs).toMatchObject({ tempUnit: 'F', clockFormat: '12h', energyTariff: 0.3, currencySymbol: '$', themeMode: 'dark' });
    expect(plan.config).toBeDefined();
    expect(plan.parts).toEqual([
      'Canvas layouts & cards',
      'Preferences & theme',
      'User profile',
      'Mobility, cameras, vacuums & rooms'
    ]);
  });

  it('ignores the server PIN marker, a stored hash and invalid preference values', () => {
    expect(planRestore({ pinCode: '__pin_set__', preferences: {} }).pin).toBeUndefined();
    expect(planRestore({ pinCode: 'scrypt$aa$bb', preferences: {} }).pin).toBeUndefined();
    const plan = planRestore({ preferences: { tempUnit: 'K', clockFormat: '99h' } });
    expect(plan.prefs).toEqual({});
  });
});
