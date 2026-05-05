import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { upsertSubscription } from '../db/push-subs.js';

const SubscribeBody = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export const pushRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/push/vapid-public', async () => ({ publicKey: app.vapid.publicKey }));

  app.post(
    '/api/push/subscribe',
    { config: { requireSession: true } },
    async (req, reply) => {
      const parsed = SubscribeBody.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: 'bad-request' });
      const session = req.session!;
      upsertSubscription(app.db, {
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        display_name: session.display_name,
      });
      return { ok: true };
    }
  );
};
