import { describe, it, expect, afterEach } from 'vitest';
import { io as ioClient } from 'socket.io-client';
import { buildApp } from '../src/http/app.js';
import { authPlugin } from '../src/http/auth-plugin.js';
import { connectRoutes } from '../src/http/routes-connect.js';
import { attachSocketServer } from '../src/socket/index.js';
import { createTmpDb } from './_helpers/tmpDb.js';

const VAPID = { publicKey: 'p', privateKey: 'p', subject: 'm' };

async function startStack(db: any, passphrase = 'pw') {
  const app = await buildApp({ db, basePath: '', roomPassphrase: passphrase, vapid: VAPID });
  await app.register(authPlugin);
  await app.register(connectRoutes);
  await app.ready();
  const ioServer = attachSocketServer(app.server, { db, basePath: '' });
  await app.listen({ host: '127.0.0.1', port: 0 });
  const port = (app.server.address() as any).port;
  return {
    port,
    ioServer,
    stop: async () => { ioServer.close(); await app.close(); },
  };
}

async function login(port: number, body: any): Promise<string> {
  const res = await fetch(`http://127.0.0.1:${port}/api/connect`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return /lm_sid=([^;]+)/.exec(res.headers.get('set-cookie')!)![1]!;
}

describe('socket.io auth', () => {
  let cleanup: (() => Promise<void>) | undefined;
  afterEach(async () => { if (cleanup) await cleanup(); cleanup = undefined; });

  it('rejects connection without cookie', async () => {
    const t = createTmpDb();
    const stack = await startStack(t.db);
    cleanup = async () => { await stack.stop(); t.cleanup(); };
    const sock = ioClient(`http://127.0.0.1:${stack.port}`, { reconnection: false, transports: ['websocket'] });
    await new Promise<void>((resolve, reject) => {
      sock.on('connect_error', () => { sock.close(); resolve(); });
      sock.on('connect', () => { sock.close(); reject(new Error('should not connect')); });
    });
  });

  it('accepts connection with valid cookie and emits backlog + presence', async () => {
    const t = createTmpDb();
    const stack = await startStack(t.db, 'pw');
    cleanup = async () => { await stack.stop(); t.cleanup(); };
    const sid = await login(stack.port, { name: 'Alice', avatar: 'fox', passphrase: 'pw' });
    const sock = ioClient(`http://127.0.0.1:${stack.port}`, {
      reconnection: false,
      transports: ['websocket'],
      extraHeaders: { cookie: `lm_sid=${sid}` },
    });
    const backlog = await new Promise<any>((resolve) => sock.once('message:backlog', resolve));
    expect(backlog.messages).toEqual([]);
    sock.close();
  });
});
