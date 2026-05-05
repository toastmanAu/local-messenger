import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { AVATAR_SLUGS } from '../types.js';
import { constantTimeEqual } from '../lib/timing-safe.js';
import { createSession, deleteSession, deleteSessionsByDisplayNameCI } from '../db/sessions.js';
import { SESSION_COOKIE } from './auth-plugin.js';

const ConnectBody = z.object({
  name: z.string().trim().min(1).max(32),
  avatar: z.enum(AVATAR_SLUGS),
  passphrase: z.string().min(1).max(256),
});

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

declare module 'fastify' {
  interface FastifyInstance {
    emitKick?: (sessionIds: string[]) => void;
  }
}

export const connectRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/api/connect',
    { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } },
    async (req, reply) => {
      const parsed = ConnectBody.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: 'bad-request' });
      const { name, avatar, passphrase } = parsed.data;
      if (!constantTimeEqual(passphrase, app.roomPassphrase)) {
        return reply.code(401).send({ error: 'unauthorised' });
      }
      const kicked = deleteSessionsByDisplayNameCI(app.db, name);
      if (kicked.length && app.emitKick) app.emitKick(kicked);

      const sid = randomBytes(32).toString('hex');
      createSession(app.db, { id: sid, display_name: name, avatar });

      reply.setCookie(SESSION_COOKIE, sid, {
        httpOnly: true, secure: true, sameSite: 'lax',
        path: app.publicBasePath || '/', maxAge: SESSION_TTL_MS / 1000,
      });
      return { ok: true, name, avatar };
    }
  );

  app.post(
    '/api/disconnect',
    { config: { requireSession: true } },
    async (req, reply) => {
      if (req.session) deleteSession(app.db, req.session.id);
      reply.clearCookie(SESSION_COOKIE, { path: app.publicBasePath || '/' });
      return { ok: true };
    }
  );

  app.get(
    '/api/session',
    async (req, reply) => {
      if (!req.session) return reply.code(401).send({ error: 'unauthorised' });
      return { name: req.session.display_name, avatar: req.session.avatar };
    }
  );
};
