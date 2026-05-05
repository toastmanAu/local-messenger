import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { processIncomingImage } from '../src/images/process.js';
import { makeJpegFixture, makePngFixture } from './_helpers/fixtures.js';

describe('processIncomingImage', () => {
  it('produces full + thumb JPEGs at expected dimensions', async () => {
    const src = await makeJpegFixture(3000, 2000);
    const out = await processIncomingImage(src);
    const fullMeta = await sharp(out.full).metadata();
    const thumbMeta = await sharp(out.thumb).metadata();
    expect(fullMeta.format).toBe('jpeg');
    expect(thumbMeta.format).toBe('jpeg');
    expect(Math.max(fullMeta.width!, fullMeta.height!)).toBe(1920);
    expect(Math.max(thumbMeta.width!, thumbMeta.height!)).toBe(320);
  });

  it('strips EXIF metadata', async () => {
    const src = await makeJpegFixture(800, 600, true);
    const out = await processIncomingImage(src);
    const meta = await sharp(out.full).metadata();
    expect(meta.exif).toBeUndefined();
  });

  it('accepts PNG input and re-encodes as JPEG', async () => {
    const src = await makePngFixture();
    const out = await processIncomingImage(src);
    expect(out.mime).toBe('image/jpeg');
    expect(out.width).toBeGreaterThan(0);
  });

  it('rejects non-image buffers', async () => {
    await expect(processIncomingImage(Buffer.from('not an image'))).rejects.toThrow();
  });
});
