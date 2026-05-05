import { describe, it, expect, afterEach } from 'vitest';
import { createTmpDb } from './_helpers/tmpDb.js';
import { runRetentionSweep, RETENTION_MS } from '../src/retention.js';
import { insertTextMessage } from '../src/db/messages.js';
import { createSession } from '../src/db/sessions.js';

describe('runRetentionSweep', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => { cleanup?.(); cleanup = undefined; });

  it('deletes messages older than 30 days', () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    const now = Date.now();
    insertTextMessage(t.db, { sender_name: 'A', sender_avatar: 'fox', body: 'old' }, now - RETENTION_MS - 1);
    insertTextMessage(t.db, { sender_name: 'A', sender_avatar: 'fox', body: 'new' }, now - 1000);
    expect(runRetentionSweep(t.db, now).messages).toBe(1);
  });

  it('deletes sessions idle longer than 30 days', () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    const now = Date.now();
    createSession(t.db, { id: 's-old', display_name: 'X', avatar: 'fox' }, now - RETENTION_MS - 1);
    createSession(t.db, { id: 's-new', display_name: 'Y', avatar: 'owl' }, now - 1000);
    expect(runRetentionSweep(t.db, now).sessions).toBe(1);
  });
});
