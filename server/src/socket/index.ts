import { Server as IOServer, type Socket } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { findSessionById, touchSession } from '../db/sessions.js';
import { listLatest } from '../db/messages.js';
import { Presence } from './presence.js';
import { registerHandlers } from './handlers.js';
import type { DB } from '../db/index.js';
import type { AvatarSlug } from '../types.js';

export interface AttachOpts {
  db: DB;
  basePath: string;
  publicBasePath: string;
  presence?: Presence;
  onMessage?: (m: { id: number; sender_name: string; sender_avatar: AvatarSlug; kind: 'text' | 'image'; body: string | null }) => void;
}

export type AttachedIO = IOServer & { presence: Presence };

function parseCookieHeader(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

export function attachSocketServer(httpServer: HttpServer, opts: AttachOpts): AttachedIO {
  const io = new IOServer(httpServer, {
    cors: { origin: false },
    path: `${opts.basePath}/socket.io`,
  });
  const presence = opts.presence ?? new Presence();

  io.use((socket, next) => {
    const cookies = parseCookieHeader(socket.handshake.headers.cookie ?? '');
    const sid = cookies['lm_sid'];
    if (!sid) return next(new Error('unauthorised'));
    const session = findSessionById(opts.db, sid);
    if (!session) return next(new Error('unauthorised'));
    socket.data.sessionId = session.id;
    socket.data.name = session.display_name;
    socket.data.avatar = session.avatar;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const sid = socket.data.sessionId as string;
    const name = socket.data.name as string;
    const avatar = socket.data.avatar as AvatarSlug;
    presence.attach(sid, socket, { name, avatar });
    touchSession(opts.db, sid);

    socket.emit('message:backlog', { messages: listLatest(opts.db, 100, opts.publicBasePath) });
    io.emit('presence', { connected: presence.snapshot() });

    socket.on('disconnect', () => {
      presence.detach(sid, socket.id);
      io.emit('presence', { connected: presence.snapshot() });
    });

    registerHandlers(socket, io, { db: opts.db, basePath: opts.basePath, presence, onMessage: opts.onMessage });
  });

  return Object.assign(io, { presence });
}
