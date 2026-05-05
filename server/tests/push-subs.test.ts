import { describe, it, expect, afterEach } from 'vitest';
import { createTmpDb } from './_helpers/tmpDb.js';
import {
  upsertSubscription, listSubscriptionsExcept, recordFailure, listAllSubscriptions,
} from '../src/db/push-subs.js';

const sub = (over: Partial<{ endpoint: string; display_name: string }> = {}) => ({
  endpoint: over.endpoint ?? 'https://push.example/abc',
  p256dh: 'p256dh_value',
  auth: 'auth_value',
  display_name: over.display_name ?? 'Alice',
});

describe('push subscriptions repository', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => { cleanup?.(); cleanup = undefined; });

  it('upserts on endpoint and updates display_name on conflict', () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    upsertSubscription(t.db, sub({ display_name: 'Alice' }));
    upsertSubscription(t.db, sub({ display_name: 'Renamed' }));
    const all = listAllSubscriptions(t.db);
    expect(all).toHaveLength(1);
    expect(all[0]!.display_name).toBe('Renamed');
  });

  it('lists subscriptions excluding a name (case-insensitive)', () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    upsertSubscription(t.db, sub({ endpoint: 'https://e/a', display_name: 'Alice' }));
    upsertSubscription(t.db, sub({ endpoint: 'https://e/b', display_name: 'Sam' }));
    expect(listSubscriptionsExcept(t.db, 'alice').map(s => s.endpoint)).toEqual(['https://e/b']);
  });

  it('recordFailure increments and deletes after threshold', () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    upsertSubscription(t.db, sub({ endpoint: 'https://e/x' }));
    expect(recordFailure(t.db, 'https://e/x', 3)).toBe('kept');
    expect(recordFailure(t.db, 'https://e/x', 3)).toBe('kept');
    expect(recordFailure(t.db, 'https://e/x', 3)).toBe('deleted');
    expect(listAllSubscriptions(t.db)).toHaveLength(0);
  });
});
