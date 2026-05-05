import { describe, it, expect, afterEach, vi } from 'vitest';
import { createTmpDb } from './_helpers/tmpDb.js';
import { upsertSubscription, listAllSubscriptions } from '../src/db/push-subs.js';
import { sendNewMessagePush } from '../src/notify/push.js';

describe('sendNewMessagePush', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => { cleanup?.(); cleanup = undefined; });

  it('skips sender, increments failures, deletes after threshold', async () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    upsertSubscription(t.db, { endpoint: 'https://e/1', p256dh: 'p', auth: 'a', display_name: 'Alice' });
    upsertSubscription(t.db, { endpoint: 'https://e/2', p256dh: 'p', auth: 'a', display_name: 'Sam' });

    const calls: string[] = [];
    const sendNotification = vi.fn(async (sub: any) => {
      calls.push(sub.endpoint);
      throw Object.assign(new Error('boom'), { statusCode: 500 });
    });
    const vapid = { publicKey: 'pub', privateKey: 'priv', subject: 'mailto:x@y.z' };

    for (let i = 0; i < 3; i++) {
      await sendNewMessagePush(t.db, vapid,
        { sender_name: 'Alice', sender_avatar: 'fox', kind: 'text', body: 'hi', messageId: i },
        '', { sendNotification, failureThreshold: 3 });
    }

    expect(calls.every(c => c === 'https://e/2')).toBe(true);
    expect(listAllSubscriptions(t.db).some(s => s.endpoint === 'https://e/2')).toBe(false);
    expect(listAllSubscriptions(t.db).some(s => s.endpoint === 'https://e/1')).toBe(true);
  });
});
