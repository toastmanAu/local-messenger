import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { listBefore, listLatest } from '../db/messages.js';

const Query = z.object({
  before: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const messagesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/messages', { config: { requireSession: true } }, async (req, reply) => {
    const parsed = Query.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: 'bad-request' });
    const { before, limit } = parsed.data;
    const messages = before
      ? listBefore(app.db, before, limit, app.publicBasePath)
      : listLatest(app.db, limit, app.publicBasePath);
    return { messages };
  });
};
