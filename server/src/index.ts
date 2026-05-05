import { loadConfig } from './config.js';
import { openDb } from './db/index.js';
import { runMigrations } from './db/migrations.js';
import { buildApp } from './http/app.js';
import { authPlugin } from './http/auth-plugin.js';
import { connectRoutes } from './http/routes-connect.js';
import { messagesRoutes } from './http/routes-messages.js';
import { uploadRoutes } from './http/routes-upload.js';
import { mediaRoutes } from './http/routes-media.js';
import { pushRoutes } from './http/routes-push.js';
import { attachSocketServer } from './socket/index.js';
import { sendNewMessagePush } from './notify/push.js';
import { startRetentionLoop } from './retention.js';

export const VERSION = '0.1.0';

async function main() {
  const cfg = loadConfig();
  const db = openDb({ path: cfg.DB_PATH, key: cfg.SQLCIPHER_KEY });
  runMigrations(db);

  const app = await buildApp({
    db,
    basePath: cfg.BASE_PATH,
    publicBasePath: cfg.PUBLIC_BASE_PATH,
    roomPassphrase: cfg.ROOM_PASSPHRASE,
    vapid: { publicKey: cfg.VAPID_PUBLIC, privateKey: cfg.VAPID_PRIVATE, subject: cfg.VAPID_SUBJECT },
    staticDir: cfg.STATIC_DIR,
  });
  await app.register(authPlugin);
  await app.register(connectRoutes, { prefix: cfg.BASE_PATH });
  await app.register(messagesRoutes, { prefix: cfg.BASE_PATH });
  await app.register(uploadRoutes, { prefix: cfg.BASE_PATH });
  await app.register(mediaRoutes, { prefix: cfg.BASE_PATH });
  await app.register(pushRoutes, { prefix: cfg.BASE_PATH });

  const vapid = { publicKey: cfg.VAPID_PUBLIC, privateKey: cfg.VAPID_PRIVATE, subject: cfg.VAPID_SUBJECT };
  const notifyNewMessage = (info: { sender_name: string; sender_avatar: any; kind: 'text'|'image'; body: string | null; messageId: number }) =>
    sendNewMessagePush(db, vapid, info, cfg.PUBLIC_BASE_PATH);

  const ioServer = attachSocketServer(app.server, {
    db,
    basePath: cfg.BASE_PATH,
    publicBasePath: cfg.PUBLIC_BASE_PATH,
    onMessage: (m) => notifyNewMessage({
      sender_name: m.sender_name, sender_avatar: m.sender_avatar,
      kind: m.kind, body: m.body, messageId: m.id,
    }),
  });
  app.decorate('emitKick', (sids: string[]) => ioServer.presence.kick(sids));
  app.decorate('broadcastMessage', (m: any) => ioServer.emit('message:new', m));
  app.decorate('notifyNewMessage', notifyNewMessage);

  await app.ready();
  await app.listen({ host: '127.0.0.1', port: cfg.PORT });
  const retentionTimer = startRetentionLoop(db);
  console.log(`local-messenger listening on 127.0.0.1:${cfg.PORT}${cfg.BASE_PATH || ''}`);

  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, async () => {
      clearInterval(retentionTimer);
      ioServer.close(); await app.close(); db.close(); process.exit(0);
    });
  }
}

main().catch(err => { console.error(err); process.exit(1); });
