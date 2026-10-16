import { describe, expect, it } from 'vitest';
import { validateHaUrl } from '../src/services/haAuth';

describe('validateHaUrl (QA-A-001)', () => {
  it.each([
    'http://homeassistant.local:8123',
    'https://my.ui.nabu.casa',
    'homeassistant.local:8123',
    'ws://192.168.1.2:8123/api/websocket',
    ''
  ])('accepts %s', (v) => expect(validateHaUrl(v)).toBeNull());

  it.each(['not a url', 'http://', 'http://bad host', '   x y  '])('rejects %s', (v) =>
    expect(validateHaUrl(v)).not.toBeNull()
  );
});
