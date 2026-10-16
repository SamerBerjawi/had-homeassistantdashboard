import { describe, expect, it } from 'vitest';
import { validateBackupShape } from '../src/lib/backupValidation';

describe('validateBackupShape (REL-004)', () => {
  it('accepts a normal backup', () => {
    expect(validateBackupShape({ preferences: { tempUnit: 'C', energyTariff: 0.3 }, canvas: { profiles: {} } })).toBeNull();
  });
  it.each([[null], ['text'], [[1]], [{}]])('rejects non-backups %#', (v) => {
    expect(validateBackupShape(v)).not.toBeNull();
  });
  it('rejects wrong-typed sections and fields', () => {
    expect(validateBackupShape({ rooms: [] })).toMatch(/rooms/);
    expect(validateBackupShape({ preferences: { energyTariff: 'x' } })).toMatch(/energyTariff/);
    expect(validateBackupShape({ pinCode: 1234 })).toMatch(/pinCode/);
  });
});
