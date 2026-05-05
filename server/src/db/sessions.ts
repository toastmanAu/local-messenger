import type { DB } from './index.js';
import type { AvatarSlug, Session } from '../types.js';

export interface NewSessionInput {
  id: string;
  display_name: string;
  avatar: AvatarSlug;
}

export function createSession(db: DB, input: NewSessionInput, now = Date.now()): Session {
  db.prepare(
    `INSERT INTO sessions (id, display_name, avatar, created_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(input.id, input.display_name, input.avatar, now, now);
  return { ...input, created_at: now, last_seen_at: now };
}

export function findSessionById(db: DB, id: string): Session | null {
  const row = db.prepare(
    `SELECT id, display_name, avatar, created_at, last_seen_at
     FROM sessions WHERE id = ?`
  ).get(id) as Session | undefined;
  return row ?? null;
}

export function deleteSession(db: DB, id: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

export function deleteSessionsByDisplayNameCI(db: DB, name: string): string[] {
  const rows = db.prepare(
    'SELECT id FROM sessions WHERE LOWER(display_name) = LOWER(?)'
  ).all(name) as Array<{ id: string }>;
  if (rows.length === 0) return [];
  const ids = rows.map(r => r.id);
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM sessions WHERE id IN (${placeholders})`).run(...ids);
  return ids;
}

export function listSessions(db: DB): Session[] {
  return db.prepare(
    `SELECT id, display_name, avatar, created_at, last_seen_at FROM sessions ORDER BY created_at`
  ).all() as Session[];
}

export function touchSession(db: DB, id: string, now = Date.now()): void {
  db.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?').run(now, id);
}

export function pruneIdleSessions(db: DB, cutoff: number): number {
  const r = db.prepare('DELETE FROM sessions WHERE last_seen_at < ?').run(cutoff);
  return r.changes;
}
