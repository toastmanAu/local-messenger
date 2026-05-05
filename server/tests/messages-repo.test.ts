import { describe, it, expect, afterEach } from 'vitest';
import { createTmpDb } from './_helpers/tmpDb.js';
import {
  insertTextMessage, insertImageMessage, listLatest, listBefore,
  getImageBlob, pruneOldMessages,
} from '../src/db/messages.js';

describe('messages repository', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => { cleanup?.(); cleanup = undefined; });

  it('inserts a text message', () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    const m = insertTextMessage(t.db, { sender_name: 'Alice', sender_avatar: 'fox', body: 'hi' });
    expect(m.id).toBeGreaterThan(0);
    expect(m.kind).toBe('text');
    if (m.kind === 'text') expect(m.body).toBe('hi');
  });

  it('lists latest in chronological order (oldest first)', () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    insertTextMessage(t.db, { sender_name: 'A', sender_avatar: 'fox', body: '1' });
    insertTextMessage(t.db, { sender_name: 'A', sender_avatar: 'fox', body: '2' });
    insertTextMessage(t.db, { sender_name: 'A', sender_avatar: 'fox', body: '3' });
    const list = listLatest(t.db, 100);
    expect(list.map(m => (m.kind === 'text' ? m.body : ''))).toEqual(['1', '2', '3']);
  });

  it('inserts an image and round-trips the blobs', () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    const full = Buffer.from([1, 2, 3, 4]);
    const thumb = Buffer.from([5, 6]);
    const m = insertImageMessage(t.db, {
      sender_name: 'Alice', sender_avatar: 'fox', caption: 'lunch',
      full, thumb, width: 100, height: 80, mime: 'image/jpeg', bytes: 4,
    });
    expect(m.kind).toBe('image');
    expect(getImageBlob(t.db, m.id, 'full')).toEqual(full);
    expect(getImageBlob(t.db, m.id, 'thumb')).toEqual(thumb);
  });

  it('listBefore returns older messages strictly before id', () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    const ids: number[] = [];
    for (let i = 0; i < 5; i++) {
      ids.push(insertTextMessage(t.db, { sender_name: 'A', sender_avatar: 'fox', body: String(i) }).id);
    }
    expect(listBefore(t.db, ids[3]!, 10).map(m => m.id)).toEqual([ids[0], ids[1], ids[2]]);
  });

  it('pruneOldMessages deletes rows older than cutoff', () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    insertTextMessage(t.db, { sender_name: 'A', sender_avatar: 'fox', body: 'old' }, 1_000);
    insertTextMessage(t.db, { sender_name: 'A', sender_avatar: 'fox', body: 'new' }, 2_000);
    expect(pruneOldMessages(t.db, 1_500)).toBe(1);
    expect(listLatest(t.db, 10)).toHaveLength(1);
  });
});
