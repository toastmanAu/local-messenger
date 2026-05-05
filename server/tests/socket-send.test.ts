import { describe, it, expect, afterEach, vi } from 'vitest';
import { io as ioClient } from 'socket.io-client';
import { buildApp } from '../src/http/app.js';
import { authPlugin } from '../src/http/auth-plugin.js';
import { connectRoutes } from '../src/http/routes-connect.js';
import { attachSocketServer } from '../src/socket/index.js';
import { createTmpDb } from './_helpers/tmpDb.js';
import { listLatest } from '../src/db/messages.js';

const VAPID = { publicKey: 'p', privateKey: 'p', subject: 'm' };

function extractSid(setCookie: string): string {
  const match = /lm_sid=([^;]+)/.exec(setCookie);
  return match![1]!;
}

async function login(port: number, name: string) {
  const res = await fetch(`http://127.0.0.1:${port}/api/connect`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, avatar: 'fox', passphrase: 'pw' }),
  });
  return extractSid(res.headers.get('set-cookie')!);
}

describe('socket message:send', () => {
  let cleanup: (() => Promise<void>) | undefined;
  afterEach(async () => { if (cleanup) await cleanup(); cleanup = undefined; });

  it('inserts, broadcasts, acks; calls onMessage', async () => {
    const t = createTmpDb();
    const onMessage = vi.fn();
    const app = await buildApp({ db: t.db, basePath: '', roomPassphrase: 'pw', vapid: VAPID });
    await app.register(authPlugin);
    await app.register(connectRoutes);
    await app.ready();
    const ioServer = attachSocketServer(app.server, { db: t.db, basePath: '', onMessage });
    await app.listen({ host: '127.0.0.1', port: 0 });
    const port = (app.server.address() as any).port;
    cleanup = async () => { ioServer.close(); await app.close(); t.cleanup(); };

    const c1 = await login(port, 'Alice');
    const c2 = await login(port, 'Sam');
    const a = ioClient(`http://127.0.0.1:${port}`, { reconnection: false, transports: ['websocket'], extraHeaders: { cookie: `lm_sid=${c1}` } });
    const b = ioClient(`http://127.0.0.1:${port}`, { reconnection: false, transports: ['websocket'], extraHeaders: { cookie: `lm_sid=${c2}` } });
    await Promise.all([
      new Promise<void>(r => a.once('message:backlog', () => r())),
      new Promise<void>(r => b.once('message:backlog', () => r())),
    ]);
    const got = new Promise<any>(r => b.once('message:new', r));
    const ack = await new Promise<any>(r => a.emit('message:send', { kind: 'text', body: 'hi sam' }, r));
    expect(ack.ok).toBe(true);
    const msg = await got;
    expect(msg.body).toBe('hi sam');
    expect(listLatest(t.db, 10)).toHaveLength(1);
    expect(onMessage).toHaveBeenCalledTimes(1);
    a.close(); b.close();
  });
});
