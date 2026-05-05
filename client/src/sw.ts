/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

// Always re-fetch avatars and sounds bypassing the HTTP cache.
// Stale 404s here (e.g. cached during a broken deploy) are user-visible
// and confusing; these files are tiny so the cost is minimal.
registerRoute(
  ({ url }) => url.pathname.includes('/avatars/') || url.pathname.includes('/sounds/'),
  async ({ request }) => fetch(request, { cache: 'reload' }),
);

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;
  const payload = event.data.json() as {
    title: string; body: string; icon?: string; badge?: string; tag?: string;
    data?: { messageId: number };
  };
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const focused = wins.some((w) => 'focused' in w && (w as any).focused);
    if (focused) return;
    await self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag ?? 'chat-msg',
      data: payload.data,
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window' });
    const data = (event.notification as any).data ?? {};
    if (wins[0]) {
      (wins[0] as WindowClient).focus();
      wins[0].postMessage({ type: 'scroll-to-message', messageId: data.messageId });
    } else {
      await self.clients.openWindow(self.registration.scope);
    }
  })());
});
