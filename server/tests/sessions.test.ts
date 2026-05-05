import { describe, it, expect, afterEach } from 'vitest';
import { createTmpDb } from './_helpers/tmpDb.js';
import {
  createSession, findSessionById, deleteSession,
  deleteSessionsByDisplayNameCI, listSessions, touchSession, pruneIdleSessions,
} from '../src/db/sessions.js';

describe('sessions repository', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => { cleanup?.(); cleanup = undefined; });

  it('creates and retrieves a session', () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    const s = createSession(t.db, { id: 's1', display_name: 'Alice', avatar: 'fox' });
    expect(s.display_name).toBe('Alice');
    expect(findSessionById(t.db, 's1')?.id).toBe('s1');
  });

  it('returns null for unknown id', () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    expect(findSessionById(t.db, 'nope')).toBeNull();
  });

  it('deletes by id', () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    createSession(t.db, { id: 's1', display_name: 'Alice', avatar: 'fox' });
    deleteSession(t.db, 's1');
    expect(findSessionById(t.db, 's1')).toBeNull();
  });

  it('deletes all sessions matching a name case-insensitively', () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    createSession(t.db, { id: 's1', display_name: 'Alice', avatar: 'fox' });
    createSession(t.db, { id: 's2', display_name: 'alice', avatar: 'owl' });
    createSession(t.db, { id: 's3', display_name: 'Sam',   avatar: 'cat' });
    const removed = deleteSessionsByDisplayNameCI(t.db, 'ALICE');
    expect(removed.sort()).toEqual(['s1', 's2']);
    expect(listSessions(t.db).map(s => s.id)).toEqual(['s3']);
  });

  it('touches last_seen_at', () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    const created = createSession(t.db, { id: 's1', display_name: 'Alice', avatar: 'fox' });
    touchSession(t.db, 's1', created.last_seen_at + 5_000);
    expect(findSessionById(t.db, 's1')!.last_seen_at).toBe(created.last_seen_at + 5_000);
  });

  it('prunes sessions older than the cutoff', () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    const s = createSession(t.db, { id: 's1', display_name: 'Alice', avatar: 'fox' });
    t.db.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?')
      .run(s.last_seen_at - 1_000_000, 's1');
    expect(pruneIdleSessions(t.db, s.last_seen_at - 500_000)).toBe(1);
    expect(findSessionById(t.db, 's1')).toBeNull();
  });
});
