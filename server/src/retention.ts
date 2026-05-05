import type { DB } from './db/index.js';
import { pruneOldMessages } from './db/messages.js';
import { pruneIdleSessions } from './db/sessions.js';

export const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export interface SweepResult { messages: number; sessions: number }

export function runRetentionSweep(db: DB, now = Date.now()): SweepResult {
  const cutoff = now - RETENTION_MS;
  return {
    messages: pruneOldMessages(db, cutoff),
    sessions: pruneIdleSessions(db, cutoff),
  };
}

export function startRetentionLoop(db: DB): NodeJS.Timeout {
  const dayMs = 24 * 60 * 60 * 1000;
  return setInterval(() => {
    const r = runRetentionSweep(db);
    if (r.messages || r.sessions) {
      console.log(`retention sweep: removed ${r.messages} messages, ${r.sessions} sessions`);
    }
  }, dayMs);
}
