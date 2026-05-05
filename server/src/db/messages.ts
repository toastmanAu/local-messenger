import type { DB } from './index.js';
import type { AvatarSlug, MessagePayload } from '../types.js';

export interface NewTextMessage {
  sender_name: string;
  sender_avatar: AvatarSlug;
  body: string;
}

export interface NewImageMessage {
  sender_name: string;
  sender_avatar: AvatarSlug;
  caption: string | null;
  full: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
  mime: string;
  bytes: number;
}

interface Row {
  id: number;
  created_at: number;
  sender_name: string;
  sender_avatar: AvatarSlug;
  kind: 'text' | 'image';
  body: string | null;
  image_width: number | null;
  image_height: number | null;
  image_mime: string | null;
  image_bytes: number | null;
}

function rowToPayload(row: Row, publicBasePath: string): MessagePayload {
  if (row.kind === 'text') {
    return {
      id: row.id, created_at: row.created_at,
      sender_name: row.sender_name, sender_avatar: row.sender_avatar,
      kind: 'text', body: row.body ?? '',
    };
  }
  return {
    id: row.id, created_at: row.created_at,
    sender_name: row.sender_name, sender_avatar: row.sender_avatar,
    kind: 'image', body: row.body,
    image_url: `${publicBasePath}/media/${row.id}/full`,
    thumb_url: `${publicBasePath}/media/${row.id}/thumb`,
    image_width: row.image_width!,
    image_height: row.image_height!,
    image_bytes: row.image_bytes!,
  };
}

export function insertTextMessage(db: DB, m: NewTextMessage, now = Date.now()): MessagePayload {
  const r = db.prepare(
    `INSERT INTO messages (created_at, sender_name, sender_avatar, kind, body)
     VALUES (?, ?, ?, 'text', ?)`
  ).run(now, m.sender_name, m.sender_avatar, m.body);
  return {
    id: Number(r.lastInsertRowid), created_at: now,
    sender_name: m.sender_name, sender_avatar: m.sender_avatar,
    kind: 'text', body: m.body,
  };
}

export function insertImageMessage(
  db: DB,
  m: NewImageMessage,
  publicBasePath = '',
  now = Date.now(),
): MessagePayload {
  const r = db.prepare(
    `INSERT INTO messages
       (created_at, sender_name, sender_avatar, kind, body,
        image_full_data, image_thumb_data, image_width, image_height, image_mime, image_bytes)
     VALUES (?, ?, ?, 'image', ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    now, m.sender_name, m.sender_avatar, m.caption,
    m.full, m.thumb, m.width, m.height, m.mime, m.bytes
  );
  const id = Number(r.lastInsertRowid);
  return {
    id, created_at: now,
    sender_name: m.sender_name, sender_avatar: m.sender_avatar,
    kind: 'image', body: m.caption,
    image_url: `${publicBasePath}/media/${id}/full`,
    thumb_url: `${publicBasePath}/media/${id}/thumb`,
    image_width: m.width, image_height: m.height, image_bytes: m.bytes,
  };
}

const ROW_COLUMNS = `
  id, created_at, sender_name, sender_avatar, kind, body,
  image_width, image_height, image_mime, image_bytes
`;

export function listLatest(db: DB, limit: number, publicBasePath = ''): MessagePayload[] {
  const rows = db.prepare(
    `SELECT ${ROW_COLUMNS} FROM messages ORDER BY id DESC LIMIT ?`
  ).all(limit) as Row[];
  return rows.reverse().map(r => rowToPayload(r, publicBasePath));
}

export function listBefore(db: DB, beforeId: number, limit: number, publicBasePath = ''): MessagePayload[] {
  const rows = db.prepare(
    `SELECT ${ROW_COLUMNS} FROM messages WHERE id < ? ORDER BY id DESC LIMIT ?`
  ).all(beforeId, limit) as Row[];
  return rows.reverse().map(r => rowToPayload(r, publicBasePath));
}

export function getImageBlob(db: DB, id: number, variant: 'full' | 'thumb'): Buffer | null {
  const col = variant === 'full' ? 'image_full_data' : 'image_thumb_data';
  const row = db.prepare(`SELECT ${col} as blob FROM messages WHERE id = ?`).get(id) as
    { blob: Buffer | null } | undefined;
  return row?.blob ?? null;
}

export function pruneOldMessages(db: DB, cutoff: number): number {
  const r = db.prepare('DELETE FROM messages WHERE created_at < ?').run(cutoff);
  return r.changes;
}
