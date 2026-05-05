import { describe, it, expect, afterEach } from 'vitest';
import { openDb } from '../src/db/index.js';
import { runMigrations } from '../src/db/migrations.js';
import { createTmpDb } from './_helpers/tmpDb.js';

describe('encrypted db', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => { cleanup?.(); cleanup = undefined; });

  it('creates the schema with all expected tables', () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    const tables = t.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all() as Array<{ name: string }>;
    const names = tables.map(r => r.name);
    expect(names).toContain('messages');
    expect(names).toContain('sessions');
    expect(names).toContain('push_subscriptions');
  });

  it('refuses to read without the correct key', () => {
    const t = createTmpDb();
    t.db.prepare("INSERT INTO sessions (id,display_name,avatar,created_at,last_seen_at) VALUES (?,?,?,?,?)")
      .run('s1', 'alice', 'fox', Date.now(), Date.now());
    t.db.close();

    const wrong = openDb({ path: t.path, key: 'b'.repeat(64) });
    expect(() => wrong.prepare('SELECT * FROM sessions').all()).toThrow();
    wrong.close();

    const right = openDb({ path: t.path, key: t.key });
    runMigrations(right);
    const rows = right.prepare('SELECT * FROM sessions').all();
    expect(rows).toHaveLength(1);
    right.close();
    cleanup = () => {};
  });

  it('migrations are idempotent', () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    expect(() => runMigrations(t.db)).not.toThrow();
    expect(() => runMigrations(t.db)).not.toThrow();
  });
});
