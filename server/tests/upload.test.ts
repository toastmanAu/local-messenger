import { describe, it, expect, afterEach } from 'vitest';
import { buildApp } from '../src/http/app.js';
import { authPlugin } from '../src/http/auth-plugin.js';
import { uploadRoutes } from '../src/http/routes-upload.js';
import { mediaRoutes } from '../src/http/routes-media.js';
import { createTmpDb } from './_helpers/tmpDb.js';
import { createSession } from '../src/db/sessions.js';
import { makeJpegFixture } from './_helpers/fixtures.js';

const VAPID = { publicKey: 'p', privateKey: 'p', subject: 'm' };

async function makeApp(db: any) {
  const app = await buildApp({ db, basePath: '', roomPassphrase: 'p', vapid: VAPID });
  await app.register(authPlugin);
  await app.register(uploadRoutes);
  await app.register(mediaRoutes);
  return app;
}

function multipart(jpeg: Buffer, caption?: string) {
  const boundary = '----LMTest';
  const parts: Buffer[] = [];
  parts.push(Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="image"; filename="x.jpg"\r\n` +
    `Content-Type: image/jpeg\r\n\r\n`, 'utf8'
  ));
  parts.push(jpeg);
  if (caption) {
    parts.push(Buffer.from(
      `\r\n--${boundary}\r\n` +
      `Content-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n--${boundary}--\r\n`, 'utf8'
    ));
  } else {
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'));
  }
  return { body: Buffer.concat(parts), contentType: `multipart/form-data; boundary=${boundary}` };
}

describe('upload + media', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => { cleanup?.(); cleanup = undefined; });

  it('rejects unauthenticated upload', async () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    const app = await makeApp(t.db);
    const jpeg = await makeJpegFixture(200, 200);
    const { body, contentType } = multipart(jpeg);
    const res = await app.inject({
      method: 'POST', url: '/api/upload',
      headers: { 'content-type': contentType, 'content-length': String(body.length) },
      payload: body,
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('uploads, broadcasts via callback, serves /media', async () => {
    const t = createTmpDb(); cleanup = t.cleanup;
    createSession(t.db, { id: 's', display_name: 'Alice', avatar: 'fox' });
    const broadcasts: any[] = [];
    const app = await makeApp(t.db);
    app.decorate('broadcastMessage', (m: any) => { broadcasts.push(m); });
    const jpeg = await makeJpegFixture(800, 600);
    const { body, contentType } = multipart(jpeg, 'lunch');

    const res = await app.inject({
      method: 'POST', url: '/api/upload',
      headers: { 'content-type': contentType, cookie: 'lm_sid=s', 'content-length': String(body.length) },
      payload: body,
    });
    expect(res.statusCode).toBe(200);
    const json = res.json() as { message: any };
    expect(json.message.kind).toBe('image');
    expect(json.message.body).toBe('lunch');
    expect(broadcasts).toHaveLength(1);

    const full = await app.inject({
      method: 'GET', url: `/media/${json.message.id}/full`, headers: { cookie: 'lm_sid=s' },
    });
    expect(full.statusCode).toBe(200);
    expect(full.headers['content-type']).toBe('image/jpeg');

    const thumb = await app.inject({
      method: 'GET', url: `/media/${json.message.id}/thumb`, headers: { cookie: 'lm_sid=s' },
    });
    expect(thumb.statusCode).toBe(200);
    expect(thumb.rawPayload.length).toBeLessThan(full.rawPayload.length);
    await app.close();
  });
});
