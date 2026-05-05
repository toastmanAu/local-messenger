import type { AvatarSlug, MessagePayload } from './types.js';
import { apiUrl } from './platform.js';

async function jsonFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(apiUrl(path), {
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
    ...init,
  });
  if (!res.ok) throw new Error(`api-error: ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  connect: (body: { name: string; avatar: AvatarSlug; passphrase: string }) =>
    jsonFetch<{ ok: true; name: string; avatar: AvatarSlug }>('/api/connect', { method: 'POST', body: JSON.stringify(body) }),
  disconnect: () => jsonFetch<{ ok: true }>('/api/disconnect', { method: 'POST' }),
  session: async (): Promise<{ name: string; avatar: AvatarSlug } | null> => {
    const res = await fetch(apiUrl('/api/session'), { credentials: 'include' });
    if (res.status === 401) return null;
    if (!res.ok) throw new Error(`api-error: ${res.status}`);
    return res.json();
  },
  messagesBefore: (before?: number, limit = 50) =>
    jsonFetch<{ messages: MessagePayload[] }>(`/api/messages?${new URLSearchParams({ ...(before ? { before: String(before) } : {}), limit: String(limit) })}`),
  uploadImage: (file: File, caption: string | null, onProgress?: (loaded: number, total: number) => void) =>
    new Promise<{ message: MessagePayload }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', apiUrl('/api/upload'), true);
      xhr.withCredentials = true;
      xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded, e.total); };
      xhr.onload = () => xhr.status === 200
        ? resolve(JSON.parse(xhr.responseText))
        : reject(new Error(`upload-error: ${xhr.status}`));
      xhr.onerror = () => reject(new Error('upload-network'));
      const fd = new FormData();
      fd.append('image', file);
      if (caption) fd.append('caption', caption);
      xhr.send(fd);
    }),
  vapidPublic: () => jsonFetch<{ publicKey: string }>('/api/push/vapid-public'),
  pushSubscribe: (sub: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
    jsonFetch<{ ok: true }>('/api/push/subscribe', { method: 'POST', body: JSON.stringify(sub) }),
};
