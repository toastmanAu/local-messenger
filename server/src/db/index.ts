import Database from 'better-sqlite3-multiple-ciphers';
import type { Database as DB } from 'better-sqlite3-multiple-ciphers';

export interface OpenDbOpts {
  path: string;
  key: string;
}

export function openDb({ path, key }: OpenDbOpts): DB {
  const db = new Database(path);
  db.pragma(`key = "x'${key}'"`);
  // foreign_keys is per-connection and does not require reading the encrypted
  // header, so it's safe even if the key is wrong (errors will surface on the
  // first real query).
  db.pragma('foreign_keys = ON');
  // journal_mode = WAL is persistent across opens — set it only when we can
  // actually read the header (i.e. correct key). Wrap so a wrong key doesn't
  // throw here; the real failure surfaces on the first query.
  try {
    db.pragma('journal_mode = WAL');
  } catch {
    // ignore: caller will hit the real auth error on next query
  }
  return db;
}

export type { DB };
