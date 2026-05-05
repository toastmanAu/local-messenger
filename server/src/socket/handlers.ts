import type { Server as IOServer, Socket } from 'socket.io';
import { z } from 'zod';
import type { DB } from '../db/index.js';
import type { Presence } from './presence.js';
import { insertTextMessage } from '../db/messages.js';
import type { AvatarSlug } from '../types.js';

export interface HandlerCtx {
  db: DB;
  basePath: string;
  presence: Presence;
  onMessage?: (m: { id: number; sender_name: string; sender_avatar: AvatarSlug; kind: 'text' | 'image'; body: string | null }) => void;
}

const TextSend = z.object({ kind: z.literal('text'), body: z.string().trim().min(1).max(4000) });

export function registerHandlers(socket: Socket, io: IOServer, ctx: HandlerCtx): void {
  const senderName = socket.data.name as string;
  const senderAvatar = socket.data.avatar as AvatarSlug;

  socket.on('message:send', (raw: unknown, ack?: (res: { ok: boolean; id?: number; error?: string }) => void) => {
    const parsed = TextSend.safeParse(raw);
    if (!parsed.success) { ack?.({ ok: false, error: 'bad-request' }); return; }
    const message = insertTextMessage(ctx.db, {
      sender_name: senderName, sender_avatar: senderAvatar, body: parsed.data.body,
    });
    io.emit('message:new', message);
    ack?.({ ok: true, id: message.id });
    ctx.onMessage?.({
      id: message.id, sender_name: senderName, sender_avatar: senderAvatar,
      kind: 'text', body: parsed.data.body,
    });
  });

  socket.on('typing', () => {
    socket.broadcast.emit('typing', { name: senderName, avatar: senderAvatar });
  });
}
