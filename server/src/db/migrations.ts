import type { DB } from './index.js';

const DDL_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS messages (
     id            INTEGER PRIMARY KEY AUTOINCREMENT,
     created_at    INTEGER NOT NULL,
     sender_name   TEXT    NOT NULL,
     sender_avatar TEXT    NOT NULL,
     kind          TEXT    NOT NULL CHECK (kind IN ('text','image')),
     body          TEXT,
     image_full_data  BLOB,
     image_thumb_data BLOB,
     image_width      INTEGER,
     image_height     INTEGER,
     image_mime       TEXT,
     image_bytes      INTEGER
   )`,
  `CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)`,
  `CREATE TABLE IF NOT EXISTS sessions (
     id             TEXT    PRIMARY KEY,
     display_name   TEXT    NOT NULL,
     avatar         TEXT    NOT NULL,
     created_at     INTEGER NOT NULL,
     last_seen_at   INTEGER NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_display_name_lower
     ON sessions(LOWER(display_name))`,
  `CREATE TABLE IF NOT EXISTS push_subscriptions (
     id             INTEGER PRIMARY KEY AUTOINCREMENT,
     endpoint       TEXT    NOT NULL UNIQUE,
     p256dh         TEXT    NOT NULL,
     auth           TEXT    NOT NULL,
     display_name   TEXT    NOT NULL,
     created_at     INTEGER NOT NULL,
     last_seen_at   INTEGER NOT NULL,
     failure_count  INTEGER NOT NULL DEFAULT 0
   )`,
];

export function runMigrations(db: DB): void {
  const tx = db.transaction(() => {
    for (const sql of DDL_STATEMENTS) db.prepare(sql).run();
  });
  tx();
}
