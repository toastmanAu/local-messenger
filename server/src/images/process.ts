import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';

export interface ProcessedImage {
  full: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
  mime: string;
  bytes: number;
}

const ACCEPTED_INPUT = new Set(['image/jpeg', 'image/png', 'image/webp']);
const FULL_MAX = 1920;
const THUMB_MAX = 320;

export async function processIncomingImage(buf: Buffer): Promise<ProcessedImage> {
  const sniff = await fileTypeFromBuffer(buf);
  if (!sniff || !ACCEPTED_INPUT.has(sniff.mime)) {
    throw new Error(`unsupported-image-mime: ${sniff?.mime ?? 'unknown'}`);
  }
  const base = sharp(buf, { failOn: 'error' }).rotate();
  const meta = await base.metadata();
  if (!meta.width || !meta.height) throw new Error('image-metadata-missing');

  const full = await base.clone()
    .resize({ width: FULL_MAX, height: FULL_MAX, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
  const fullMeta = await sharp(full).metadata();

  const thumb = await base.clone()
    .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 70, mozjpeg: true })
    .toBuffer();

  return {
    full, thumb,
    width: fullMeta.width ?? meta.width,
    height: fullMeta.height ?? meta.height,
    mime: 'image/jpeg',
    bytes: full.length,
  };
}
