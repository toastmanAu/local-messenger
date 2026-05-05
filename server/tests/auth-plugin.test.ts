import { describe, it, expect, afterEach } from 'vitest';
import { buildApp } from '../src/http/app.js';
import { authPlugin } from '../src/http/auth-plugin.js';
import { createSession } from '../src/db/sessions.js';
import { createTmpDb } from './_helpers/tmpDb.js';

const VAPID = { publicKey: 'pub', privateKey: 'priv', subject: 'm' };

describe('auth plugin', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => { cleanup?.(); cleanup = undefined; });

  it('returns 401 when route requires session and none present', async () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    const app = await buildApp({ db: t.db, basePath: '', roomPassphrase: 'p', vapid: VAPID });
    await app.register(authPlugin);
    app.get('/api/secret', { config: { requireSession: true } }, async () => ({ ok: true }));
    expect((await app.inject({ method: 'GET', url: '/api/secret' })).statusCode).toBe(401);
    await app.close();
  });

  it('attaches session when cookie is valid', async () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    createSession(t.db, { id: 'sess1', display_name: 'Alice', avatar: 'fox' });
    const app = await buildApp({ db: t.db, basePath: '', roomPassphrase: 'p', vapid: VAPID });
    await app.register(authPlugin);
    app.get('/api/secret', { config: { requireSession: true } }, async (req) => ({ name: req.session?.display_name }));
    const res = await app.inject({ method: 'GET', url: '/api/secret', headers: { cookie: 'lm_sid=sess1' } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ name: 'Alice' });
    await app.close();
  });
});
