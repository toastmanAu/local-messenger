import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(here, '..', 'client', 'public', 'icons', 'logo-source.png');
const OUT = resolve(here, '..', 'client', 'public', 'icons');

await mkdir(OUT, { recursive: true });

async function emit(name, size, padPct = 0) {
  const pad = Math.round(size * padPct);
  const inner = size - pad * 2;
  const base = sharp(SOURCE).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
  const buf = await base.toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 255, g: 248, b: 239, alpha: 1 } },
  }).composite([{ input: buf, top: pad, left: pad }]).png().toFile(`${OUT}/${name}`);
  console.log(`wrote ${name} (${size}px)`);
}

await emit('icon-192.png', 192, 0);
await emit('icon-512.png', 512, 0);
await emit('icon-maskable-512.png', 512, 0.10);
await emit('apple-touch-icon-180.png', 180, 0);
console.log('icon generation complete.');
