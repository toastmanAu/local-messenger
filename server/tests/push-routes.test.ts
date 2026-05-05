import { describe, it, expect, afterEach } from 'vitest';
import { buildApp } from '../src/http/app.js';
import { authPlugin } from '../src/http/auth-plugin.js';
import { pushRoutes } from '../src/http/routes-push.js';
import { createTmpDb } from './_helpers/tmpDb.js';
import { createSession } from '../src/db/sessions.js';
import { listAllSubscriptions } from '../src/db/push-subs.js';

const VAPID = { publicKey: 'PUB123', privateKey: 'PRIV', subject: 'mailto:x@y.z' };

describe('push routes', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => { cleanup?.(); cleanup = undefined; });

  it('GET /api/push/vapid-public returns the configured public key', async () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    const app = await buildApp({ db: t.db, basePath: '', roomPassphrase: 'p', vapid: VAPID });
    await app.register(authPlugin);
    await app.register(pushRoutes);
    expect((await app.inject({ method: 'GET', url: '/api/push/vapid-public' })).json()).toEqual({ publicKey: 'PUB123' });
    await app.close();
  });

  it('POST /api/push/subscribe requires session and stores the subscription', async () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    createSession(t.db, { id: 's', display_name: 'Alice', avatar: 'fox' });
    const app = await buildApp({ db: t.db, basePath: '', roomPassphrase: 'p', vapid: VAPID });
    await app.register(authPlugin);
    await app.register(pushRoutes);
    const res = await app.inject({
      method: 'POST', url: '/api/push/subscribe',
      headers: { cookie: 'lm_sid=s', 'content-type': 'application/json' },
      payload: { endpoint: 'https://push.example/abc', keys: { p256dh: 'P', auth: 'A' } },
    });
    expect(res.statusCode).toBe(200);
    expect(listAllSubscriptions(t.db)).toHaveLength(1);
    await app.close();
  });
});
