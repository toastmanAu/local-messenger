import { z } from 'zod';

const ConfigSchema = z.object({
  ROOM_PASSPHRASE: z.string().min(1),
  SQLCIPHER_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, 'must be 64 hex chars'),
  VAPID_PUBLIC: z.string().min(1),
  VAPID_PRIVATE: z.string().min(1),
  VAPID_SUBJECT: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  DB_PATH: z.string().default('./data.db'),
  BASE_PATH: z.string().default(''),
  PUBLIC_BASE_PATH: z.string().default(''),
  STATIC_DIR: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): Config {
  const result = ConfigSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid config: ${result.error.message}`);
  }
  return result.data;
}
