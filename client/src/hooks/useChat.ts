import { useEffect, useRef, useState } from 'react';
import { makeSocket } from '../socket.js';
import type { MessagePayload, PresencePayload } from '../types.js';

export interface PendingMessage {
  tempId: string;
  body: string;
  failed: boolean;
}

export interface ChatState {
  status: 'connecting' | 'online' | 'reconnecting' | 'kicked';
  messages: MessagePayload[];
  pending: PendingMessage[];
  presence: PresencePayload['connected'];
  typing: { name: string } | null;
}

export interface ChatActions {
  sendText: (body: string) => void;
  retry: (tempId: string) => void;
  emitTyping: () => void;
}

export function useChat(myName: string): { state: ChatState; actions: ChatActions } {
  const [state, setState] = useState<ChatState>({
    status: 'connecting', messages: [], pending: [], presence: [], typing: null,
  });
  const socketRef = useRef<ReturnType<typeof makeSocket> | null>(null);
  const pendingRef = useRef<Map<string, PendingMessage>>(new Map());

  useEffect(() => {
    const sock = makeSocket();
    socketRef.current = sock;

    let dingAudio: HTMLAudioElement | null = null;
    try { dingAudio = new Audio(`${import.meta.env.BASE_URL}sounds/notify.wav`); dingAudio.volume = 0.5; } catch {}

    sock.on('connect', () => setState(s => ({ ...s, status: 'online' })));
    sock.on('disconnect', () => setState(s => ({ ...s, status: 'reconnecting' })));
    sock.on('connect_error', () => setState(s => ({ ...s, status: 'reconnecting' })));
    sock.on('kicked', () => setState(s => ({ ...s, status: 'kicked' })));

    sock.on('message:backlog', ({ messages }) => {
      setState(s => ({ ...s, messages: dedupe([...messages]) }));
    });
    sock.on('message:new', (m) => {
      const isFromOther = m.sender_name !== myName;
      if (isFromOther && document.visibilityState === 'visible') {
        dingAudio?.play().catch(() => {});
      }
      setState(s => ({ ...s, messages: dedupe([...s.messages, m]) }));
    });
    sock.on('presence', (p) => setState(s => ({ ...s, presence: p.connected })));
    sock.on('typing', ({ name }) => {
      setState(s => ({ ...s, typing: { name } }));
      window.setTimeout(() => setState(s => ({ ...s, typing: null })), 3000);
    });

    return () => { sock.close(); };
  }, [myName]);

  function flushPending(tempId: string, settled: 'sent' | 'failed') {
    pendingRef.current.delete(tempId);
    setState(s => ({
      ...s,
      pending: settled === 'failed'
        ? s.pending.map(p => p.tempId === tempId ? { ...p, failed: true } : p)
        : s.pending.filter(p => p.tempId !== tempId),
    }));
  }

  function sendText(body: string) {
    const trimmed = body.trim();
    if (!trimmed) return;
    const tempId = `t_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const pending: PendingMessage = { tempId, body: trimmed, failed: false };
    pendingRef.current.set(tempId, pending);
    setState(s => ({ ...s, pending: [...s.pending, pending] }));
    socketRef.current?.emit('message:send', { kind: 'text', body: trimmed }, (ack) => {
      flushPending(tempId, ack.ok ? 'sent' : 'failed');
    });
  }

  function retry(tempId: string) {
    const p = pendingRef.current.get(tempId);
    if (!p) return;
    setState(s => ({ ...s, pending: s.pending.map(x => x.tempId === tempId ? { ...x, failed: false } : x) }));
    socketRef.current?.emit('message:send', { kind: 'text', body: p.body }, (ack) => {
      flushPending(tempId, ack.ok ? 'sent' : 'failed');
    });
  }

  function emitTyping() { socketRef.current?.emit('typing'); }

  return { state, actions: { sendText, retry, emitTyping } };
}

function dedupe(list: MessagePayload[]): MessagePayload[] {
  const seen = new Set<number>();
  const out: MessagePayload[] = [];
  for (const m of list) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
  }
  return out.sort((a, b) => a.id - b.id);
}
