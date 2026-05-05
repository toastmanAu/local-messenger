import { io, Socket } from 'socket.io-client';
import type { MessagePayload, PresencePayload } from './types.js';
import { BASE_PATH } from './platform.js';

export interface ServerToClient {
  'message:backlog': (p: { messages: MessagePayload[] }) => void;
  'message:new': (m: MessagePayload) => void;
  'presence': (p: PresencePayload) => void;
  'typing': (p: { name: string; avatar: string }) => void;
  'kicked': (p: { type: 'kicked'; reason: string }) => void;
}

export interface ClientToServer {
  'message:send': (msg: { kind: 'text'; body: string }, ack: (r: { ok: boolean; id?: number; error?: string }) => void) => void;
  'typing': () => void;
}

export function makeSocket(): Socket<ServerToClient, ClientToServer> {
  const path = `${BASE_PATH}/socket.io`;
  return io({
    path,
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5,
    transports: ['websocket', 'polling'],
  });
}
