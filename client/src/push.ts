import { api } from './api.js';
import { isiOS, isStandalone } from './platform.js';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const buf = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export type PushAvailability =
  | 'unsupported'
  | 'ios-needs-install'
  | 'ready'
  | 'denied'
  | 'subscribed';

export async function getPushAvailability(): Promise<PushAvailability> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';
  if (isiOS() && !isStandalone()) return 'ios-needs-install';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  if (reg && (await reg.pushManager.getSubscription())) return 'subscribed';
  return 'ready';
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label}-timeout-${ms}ms`)), ms)
    ),
  ]);
}

export async function subscribePush(): Promise<void> {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('permission-denied');
  const { publicKey } = await api.vapidPublic();
  const reg = await withTimeout(navigator.serviceWorker.ready, 8000, 'sw-ready');
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  const json = sub.toJSON();
  await api.pushSubscribe({
    endpoint: json.endpoint!,
    keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
  });
}
