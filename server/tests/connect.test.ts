import { describe, it, expect, afterEach } from 'vitest';
import { buildApp } from '../src/http/app.js';
import { authPlugin } from '../src/http/auth-plugin.js';
import { connectRoutes } from '../src/http/routes-connect.js';
import { createTmpDb } from './_helpers/tmpDb.js';
import { listSessions } from '../src/db/sessions.js';

const VAPID = { publicKey: 'p', privateKey: 'p', subject: 'm' };

async function makeApp(db: any, passphrase = 'pw') {
  const app = await buildApp({ db, basePath: '', roomPassphrase: passphrase, vapid: VAPID });
  await app.register(authPlugin);
  await app.register(connectRoutes);
  return app;
}

describe('POST /api/connect', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => { cleanup?.(); cleanup = undefined; });

  it('200 + cookie on success', async () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    const app = await makeApp(t.db, 'pw');
    const res = await app.inject({
      method: 'POST', url: '/api/connect',
      payload: { name: 'Alice', avatar: 'fox', passphrase: 'pw' },
    });
    expect(res.statusCode).toBe(200);
    expect(String(res.headers['set-cookie'])).toContain('lm_sid=');
    expect(listSessions(t.db)).toHaveLength(1);
    await app.close();
  });

  it('401 on wrong passphrase, no cookie', async () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    const app = await makeApp(t.db, 'right');
    const res = await app.inject({
      method: 'POST', url: '/api/connect',
      payload: { name: 'Alice', avatar: 'fox', passphrase: 'wrong' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.headers['set-cookie']).toBeUndefined();
    await app.close();
  });

  it('400 on unknown avatar slug', async () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    const app = await makeApp(t.db, 'pw');
    const res = await app.inject({
      method: 'POST', url: '/api/connect',
      payload: { name: 'Alice', avatar: 'unicorn', passphrase: 'pw' },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('400 on empty name', async () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    const app = await makeApp(t.db, 'pw');
    const res = await app.inject({
      method: 'POST', url: '/api/connect',
      payload: { name: '   ', avatar: 'fox', passphrase: 'pw' },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('kicks any session with the same name (case-insensitive)', async () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    const app = await makeApp(t.db, 'pw');
    const kicked: string[] = [];
    app.decorate('emitKick', (sids: string[]) => { kicked.push(...sids); });
    const first = await app.inject({
      method: 'POST', url: '/api/connect',
      payload: { name: 'Alice', avatar: 'fox', passphrase: 'pw' },
    });
    const sid1 = String(first.headers['set-cookie']).match(/lm_sid=([^;]+)/)![1]!;
    const second = await app.inject({
      method: 'POST', url: '/api/connect',
      payload: { name: 'ALICE', avatar: 'owl', passphrase: 'pw' },
    });
    expect(second.statusCode).toBe(200);
    expect(kicked).toContain(sid1);
    expect(listSessions(t.db)).toHaveLength(1);
    await app.close();
  });
});
