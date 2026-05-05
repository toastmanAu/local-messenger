import { describe, it, expect, afterEach } from 'vitest';
import { buildApp } from '../src/http/app.js';
import { authPlugin } from '../src/http/auth-plugin.js';
import { messagesRoutes } from '../src/http/routes-messages.js';
import { createTmpDb } from './_helpers/tmpDb.js';
import { createSession } from '../src/db/sessions.js';
import { insertTextMessage } from '../src/db/messages.js';

const VAPID = { publicKey: 'p', privateKey: 'p', subject: 'm' };

async function makeApp(db: any) {
  const app = await buildApp({ db, basePath: '', roomPassphrase: 'p', vapid: VAPID });
  await app.register(authPlugin);
  await app.register(messagesRoutes);
  return app;
}

describe('GET /api/messages', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => { cleanup?.(); cleanup = undefined; });

  it('requires session', async () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    const app = await makeApp(t.db);
    expect((await app.inject({ method: 'GET', url: '/api/messages' })).statusCode).toBe(401);
    await app.close();
  });

  it('returns messages older than `before`', async () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    createSession(t.db, { id: 's', display_name: 'P', avatar: 'fox' });
    const ids = Array.from({ length: 5 }, (_, i) =>
      insertTextMessage(t.db, { sender_name: 'P', sender_avatar: 'fox', body: String(i) }).id
    );
    const app = await makeApp(t.db);
    const res = await app.inject({
      method: 'GET', url: `/api/messages?before=${ids[3]}&limit=10`,
      headers: { cookie: 'lm_sid=s' },
    });
    expect(res.statusCode).toBe(200);
    const json = res.json() as { messages: Array<{ id: number }> };
    expect(json.messages.map(m => m.id)).toEqual([ids[0], ids[1], ids[2]]);
    await app.close();
  });
});
