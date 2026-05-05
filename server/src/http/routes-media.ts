import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getImageBlob } from '../db/messages.js';

const Params = z.object({
  id: z.coerce.number().int().positive(),
  variant: z.enum(['full', 'thumb']),
});

export const mediaRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/media/:id/:variant',
    { config: { requireSession: true } },
    async (req, reply) => {
      const parsed = Params.safeParse(req.params);
      if (!parsed.success) return reply.code(400).send({ error: 'bad-request' });
      const { id, variant } = parsed.data;
      const blob = getImageBlob(app.db, id, variant);
      if (!blob) return reply.code(404).send({ error: 'not-found' });
      const etag = `"${id}-${variant}"`;
      if (req.headers['if-none-match'] === etag) return reply.code(304).send();
      reply
        .header('Content-Type', 'image/jpeg')
        .header('Cache-Control', 'private, max-age=86400, immutable')
        .header('ETag', etag)
        .send(blob);
    }
  );
};
