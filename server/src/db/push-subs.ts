import type { DB } from './index.js';
import type { PushSubscriptionRecord } from '../types.js';

export type StoredSub = PushSubscriptionRecord & {
  id: number; created_at: number; last_seen_at: number; failure_count: number;
};

export function upsertSubscription(db: DB, s: PushSubscriptionRecord, now = Date.now()): void {
  db.prepare(
    `INSERT INTO push_subscriptions
       (endpoint, p256dh, auth, display_name, created_at, last_seen_at, failure_count)
     VALUES (?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(endpoint) DO UPDATE SET
       p256dh = excluded.p256dh,
       auth = excluded.auth,
       display_name = excluded.display_name,
       last_seen_at = excluded.last_seen_at,
       failure_count = 0`
  ).run(s.endpoint, s.p256dh, s.auth, s.display_name, now, now);
}

export function listAllSubscriptions(db: DB): StoredSub[] {
  return db.prepare(
    `SELECT id, endpoint, p256dh, auth, display_name, created_at, last_seen_at, failure_count
     FROM push_subscriptions ORDER BY id`
  ).all() as StoredSub[];
}

export function listSubscriptionsExcept(db: DB, displayName: string): StoredSub[] {
  return db.prepare(
    `SELECT id, endpoint, p256dh, auth, display_name, created_at, last_seen_at, failure_count
     FROM push_subscriptions WHERE LOWER(display_name) <> LOWER(?)`
  ).all(displayName) as StoredSub[];
}

export type FailureOutcome = 'kept' | 'deleted';

export function recordFailure(db: DB, endpoint: string, threshold: number): FailureOutcome {
  const row = db.prepare(
    'SELECT failure_count FROM push_subscriptions WHERE endpoint = ?'
  ).get(endpoint) as { failure_count: number } | undefined;
  if (!row) return 'deleted';
  const next = row.failure_count + 1;
  if (next >= threshold) {
    db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
    return 'deleted';
  }
  db.prepare('UPDATE push_subscriptions SET failure_count = ? WHERE endpoint = ?')
    .run(next, endpoint);
  return 'kept';
}

export function deleteSubscription(db: DB, endpoint: string): void {
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
}
