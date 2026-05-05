import sharp from 'sharp';
import { writeFile, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '..', 'client', 'public', 'avatars');
await mkdir(OUT, { recursive: true });

const SLUGS = [
  ['fox', '🦊', '#d4a574'],
  ['owl', '🦉', '#b89167'],
  ['cat', '🐱', '#e8c8a0'],
  ['raccoon', '🦝', '#8a6f55'],
  ['frog', '🐸', '#a3c977'],
  ['bear', '🐻', '#b08560'],
  ['hedgehog', '🦔', '#c89968'],
  ['penguin', '🐧', '#5a4632'],
];

const exists = async (p) => { try { await access(p); return true; } catch { return false; } };

for (const [slug, emoji, bg] of SLUGS) {
  const pngPath = `${OUT}/${slug}.png`;
  if (await exists(pngPath)) {
    console.log(`skip ${slug}.png (real artwork present)`);
    continue;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
    <rect width="192" height="192" rx="24" fill="${bg}"/>
    <text x="96" y="125" font-size="100" text-anchor="middle" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${emoji}</text>
  </svg>`;
  await writeFile(`${OUT}/${slug}.svg`, svg, 'utf8');
  await sharp(Buffer.from(svg)).resize(192, 192).png().toFile(pngPath);
  console.log(`wrote ${slug}.svg + ${slug}.png (placeholder)`);
}
