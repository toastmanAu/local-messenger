import webpush, { type PushSubscription, type SendResult } from 'web-push';
import type { DB } from '../db/index.js';
import type { AvatarSlug } from '../types.js';
import { listSubscriptionsExcept, recordFailure } from '../db/push-subs.js';

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export interface PushMessageInfo {
  sender_name: string;
  sender_avatar: AvatarSlug;
  kind: 'text' | 'image';
  body: string | null;
  messageId: number;
}

export interface PushDeps {
  sendNotification?: (sub: PushSubscription, payload: string, opts: any) => Promise<SendResult>;
  failureThreshold?: number;
}

function buildPayload(m: PushMessageInfo, publicBasePath: string): string {
  const body =
    m.kind === 'text'
      ? (m.body ?? '').slice(0, 200)
      : m.body
        ? `📷 ${m.body.slice(0, 60)}`
        : '📷 sent a photo';
  return JSON.stringify({
    title: m.sender_name,
    body,
    icon: `${publicBasePath}/avatars/${m.sender_avatar}.png`,
    badge: `${publicBasePath}/icons/badge.png`,
    tag: 'chat-msg',
    data: { messageId: m.messageId },
  });
}

let vapidConfigured = false;

export async function sendNewMessagePush(
  db: DB, vapid: VapidConfig, m: PushMessageInfo, publicBasePath: string,
  deps: PushDeps = {},
): Promise<void> {
  const sender = deps.sendNotification ?? webpush.sendNotification;
  const threshold = deps.failureThreshold ?? 3;
  if (sender === webpush.sendNotification && !vapidConfigured) {
    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
    vapidConfigured = true;
  }
  const subs = listSubscriptionsExcept(db, m.sender_name);
  const payload = buildPayload(m, publicBasePath);
  await Promise.all(subs.map(async (s) => {
    const sub: PushSubscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
    try {
      await sender(sub, payload, {});
    } catch {
      recordFailure(db, s.endpoint, threshold);
    }
  }));
}
