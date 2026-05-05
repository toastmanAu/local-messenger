import { describe, it, expect } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  const baseEnv = {
    ROOM_PASSPHRASE: 'hunter2',
    SQLCIPHER_KEY: 'a'.repeat(64),
    VAPID_PUBLIC: 'pub',
    VAPID_PRIVATE: 'priv',
    VAPID_SUBJECT: 'mailto:x@y.z',
  };

  it('returns parsed config with defaults', () => {
    const cfg = loadConfig(baseEnv);
    expect(cfg.PORT).toBe(3000);
    expect(cfg.DB_PATH).toBe('./data.db');
    expect(cfg.BASE_PATH).toBe('');
    expect(cfg.ROOM_PASSPHRASE).toBe('hunter2');
  });

  it('throws when required vars are missing', () => {
    expect(() => loadConfig({ ROOM_PASSPHRASE: 'x' })).toThrow();
  });

  it('rejects SQLCIPHER_KEY that is not 64 hex chars', () => {
    expect(() => loadConfig({ ...baseEnv, SQLCIPHER_KEY: 'abc' })).toThrow();
  });

  it('accepts BASE_PATH override', () => {
    const cfg = loadConfig({ ...baseEnv, BASE_PATH: '/chat' });
    expect(cfg.BASE_PATH).toBe('/chat');
  });
});
