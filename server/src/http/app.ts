import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import type { DB } from '../db/index.js';

export interface BuildAppOpts {
  db: DB;
  basePath: string;
  publicBasePath: string;
  roomPassphrase: string;
  vapid: { publicKey: string; privateKey: string; subject: string };
  staticDir?: string;
}

export async function buildApp(opts: BuildAppOpts): Promise<FastifyInstance> {
  const app = Fastify({ logger: false, bodyLimit: 12 * 1024 * 1024 });

  await app.register(cookie);
  await app.register(rateLimit, { global: false });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024, files: 1 } });

  app.decorate('db', opts.db);
  app.decorate('roomPassphrase', opts.roomPassphrase);
  app.decorate('vapid', opts.vapid);
  app.decorate('basePath', opts.basePath);
  app.decorate('publicBasePath', opts.publicBasePath);

  await app.register(async (scope) => {
    scope.get('/api/health', async () => ({ ok: true }));
  }, { prefix: opts.basePath });

  if (opts.staticDir) {
    const fastifyStatic = (await import('@fastify/static')).default;
    const { readFile } = await import('node:fs/promises');
    const indexPath = `${opts.staticDir}/index.html`;
    const prefix = opts.basePath ? `${opts.basePath}/` : '/';
    await app.register(fastifyStatic, {
      root: opts.staticDir,
      prefix,
      decorateReply: false,
    });
    // SPA fallback: any unmatched GET under basePath returns index.html.
    app.setNotFoundHandler(async (req, reply) => {
      if (req.method !== 'GET') return reply.code(404).send({ error: 'not-found' });
      try {
        const html = await readFile(indexPath, 'utf8');
        return reply.type('text/html').send(html);
      } catch {
        return reply.code(404).send({ error: 'not-found' });
      }
    });
  }

  return app;
}

declare module 'fastify' {
  interface FastifyInstance {
    db: DB;
    roomPassphrase: string;
    vapid: { publicKey: string; privateKey: string; subject: string };
    basePath: string;
    publicBasePath: string;
  }
}
