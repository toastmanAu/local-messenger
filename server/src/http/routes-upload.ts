import type { FastifyPluginAsync } from 'fastify';
import { processIncomingImage } from '../images/process.js';
import { insertImageMessage } from '../db/messages.js';
import type { MessagePayload } from '../types.js';

declare module 'fastify' {
  interface FastifyInstance {
    broadcastMessage?: (m: MessagePayload) => void;
    notifyNewMessage?: (m: { sender_name: string; sender_avatar: any; kind: 'text' | 'image'; body: string | null; messageId: number }) => void;
  }
}

export const uploadRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/api/upload',
    { config: { requireSession: true, rateLimit: { max: 30, timeWindow: '1 hour' } } },
    async (req, reply) => {
      if (!req.isMultipart()) return reply.code(415).send({ error: 'expected-multipart' });

      let imageBuf: Buffer | null = null;
      let caption: string | null = null;
      for await (const part of req.parts()) {
        if (part.type === 'file' && part.fieldname === 'image') {
          imageBuf = await part.toBuffer();
        } else if (part.type === 'field' && part.fieldname === 'caption') {
          const v = String(part.value).trim();
          caption = v.length > 0 ? v.slice(0, 4000) : null;
        }
      }
      if (!imageBuf) return reply.code(400).send({ error: 'no-image' });

      let processed;
      try {
        processed = await processIncomingImage(imageBuf);
      } catch (e: any) {
        if (String(e.message).startsWith('unsupported-image-mime')) {
          return reply.code(415).send({ error: 'unsupported-image-mime' });
        }
        return reply.code(400).send({ error: 'invalid-image' });
      }

      const session = req.session!;
      const message = insertImageMessage(app.db, {
        sender_name: session.display_name, sender_avatar: session.avatar,
        caption,
        full: processed.full, thumb: processed.thumb,
        width: processed.width, height: processed.height,
        mime: processed.mime, bytes: processed.bytes,
      }, app.publicBasePath);
      app.broadcastMessage?.(message);
      app.notifyNewMessage?.({
        sender_name: session.display_name, sender_avatar: session.avatar,
        kind: 'image', body: caption, messageId: message.id,
      });
      return { message };
    }
  );
};
