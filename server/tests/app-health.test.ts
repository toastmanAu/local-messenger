import { describe, it, expect, afterEach } from 'vitest';
import { buildApp } from '../src/http/app.js';
import { createTmpDb } from './_helpers/tmpDb.js';

const VAPID = { publicKey: 'pub', privateKey: 'priv', subject: 'mailto:x@y.z' };

describe('Fastify app', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => { cleanup?.(); cleanup = undefined; });

  it('responds to GET /api/health', async () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    const app = await buildApp({ db: t.db, basePath: '', roomPassphrase: 'p', vapid: VAPID });
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    await app.close();
  });

  it('honours basePath prefix', async () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    const app = await buildApp({ db: t.db, basePath: '/chat', roomPassphrase: 'p', vapid: VAPID });
    expect((await app.inject({ method: 'GET', url: '/chat/api/health' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/health' })).statusCode).toBe(404);
    await app.close();
  });
});
