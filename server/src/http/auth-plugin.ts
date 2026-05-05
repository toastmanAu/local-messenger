import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { findSessionById, touchSession } from '../db/sessions.js';
import type { Session } from '../types.js';

export const SESSION_COOKIE = 'lm_sid';

declare module 'fastify' {
  interface FastifyRequest { session?: Session }
  interface FastifyContextConfig { requireSession?: boolean }
}

const plugin: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (req, reply) => {
    const sid = req.cookies[SESSION_COOKIE];
    if (sid) {
      const session = findSessionById(app.db, sid);
      if (session) {
        req.session = session;
        touchSession(app.db, session.id);
      }
    }
    if (req.routeOptions.config.requireSession && !req.session) {
      reply.code(401).send({ error: 'unauthorised' });
    }
  });
};

export const authPlugin = fp(plugin, { name: 'auth-plugin' });
