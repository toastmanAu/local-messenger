import type { Socket } from 'socket.io';
import type { AvatarSlug, PresencePayload } from '../types.js';

interface SessionInfo {
  name: string;
  avatar: AvatarSlug;
  sockets: Map<string, Socket>;
}

export class Presence {
  private bySession = new Map<string, SessionInfo>();

  attach(sessionId: string, socket: Socket, info: { name: string; avatar: AvatarSlug }) {
    let entry = this.bySession.get(sessionId);
    if (!entry) {
      entry = { name: info.name, avatar: info.avatar, sockets: new Map() };
      this.bySession.set(sessionId, entry);
    }
    entry.sockets.set(socket.id, socket);
  }

  detach(sessionId: string, socketId: string) {
    const entry = this.bySession.get(sessionId);
    if (!entry) return;
    entry.sockets.delete(socketId);
    if (entry.sockets.size === 0) this.bySession.delete(sessionId);
  }

  socketIdsFor(sessionId: string): string[] {
    const e = this.bySession.get(sessionId);
    return e ? [...e.sockets.keys()] : [];
  }

  kick(sessionIds: string[], payload = { type: 'kicked' as const, reason: 'signed in elsewhere' }) {
    for (const sid of sessionIds) {
      const entry = this.bySession.get(sid);
      if (!entry) continue;
      for (const sock of entry.sockets.values()) {
        sock.emit('kicked', payload);
        sock.disconnect(true);
      }
      this.bySession.delete(sid);
    }
  }

  snapshot(): PresencePayload['connected'] {
    const out: PresencePayload['connected'] = [];
    const seen = new Set<string>();
    for (const e of this.bySession.values()) {
      const key = e.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ name: e.name, avatar: e.avatar });
    }
    return out;
  }

  hasSession(sessionId: string): boolean {
    return this.bySession.has(sessionId);
  }
}
