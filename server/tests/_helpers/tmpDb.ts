import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb } from '../../src/db/index.js';
import { runMigrations } from '../../src/db/migrations.js';

export function createTmpDb() {
  const dir = mkdtempSync(join(tmpdir(), 'lm-test-'));
  const path = join(dir, 'data.db');
  const key = 'a'.repeat(64);
  const db = openDb({ path, key });
  runMigrations(db);
  return {
    db, path, key,
    cleanup: () => { db.close(); rmSync(dir, { recursive: true, force: true }); },
  };
}
